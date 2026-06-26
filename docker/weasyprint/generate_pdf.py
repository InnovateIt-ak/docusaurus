#!/usr/bin/env python3
"""Generate a polished, single PDF from a built Docusaurus site using WeasyPrint.

The script serves the static ``build/`` directory over a local HTTP server (so
asset URLs resolve), extracts the article content of every documentation page
and assembles a single HTML document made of:

  * a branded cover page,
  * an automatic table of contents (with real page numbers),
  * one chapter per documentation page,

which WeasyPrint renders with running headers, page numbers and PDF bookmarks.

Usage:
    python generate_pdf.py --build-dir build --output build/documentation.pdf \
        --base-url / --title "My Site" --subtitle "Documentation"
"""

import argparse
import datetime
import functools
import html
import os
import sys
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


# A table with at least this many columns does not fit a portrait A4 page, so
# its chapter is rendered in landscape and the table is laid out to fit. This is
# the only "wide table" heuristic — it keys off the table shape, not any markup
# the author has to add.
WIDE_TABLE_MIN_COLUMNS = 7


def log(message: str) -> None:
    print(f"[weasyprint] {message}", file=sys.stderr, flush=True)


def _table_column_count(table) -> int:
    """Best-effort column count: the widest row of the table."""
    widest = 0
    for row in table.find_all("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        widest = max(widest, len(cells))
    return widest


def tag_wide_tables(node) -> bool:
    """Add the ``wide-table`` class to any table wider than the threshold.

    Returns True if at least one wide table was found, so the caller can render
    the whole chapter in landscape.
    """
    found = False
    for table in node.find_all("table"):
        if _table_column_count(table) >= WIDE_TABLE_MIN_COLUMNS:
            classes = table.get("class", [])
            if "wide-table" not in classes:
                classes.append("wide-table")
            table["class"] = classes
            found = True
    return found


def normalize_base_url(base_url: str) -> str:
    """Return a base prefix like '/docusaurus' (no trailing slash, '' for root)."""
    base = (base_url or "/").strip()
    if not base.startswith("/"):
        base = "/" + base
    return base.rstrip("/")  # '' when base_url was '/'


def make_handler(build_dir: str, base_prefix: str):
    class Handler(SimpleHTTPRequestHandler):
        def translate_path(self, path: str) -> str:
            clean = path.split("?", 1)[0].split("#", 1)[0]
            if base_prefix and clean.startswith(base_prefix):
                clean = clean[len(base_prefix):] or "/"
                if not clean.startswith("/"):
                    clean = "/" + clean
            return super().translate_path(clean)

        def log_message(self, *args):  # silence per-request logging
            pass

    return functools.partial(Handler, directory=build_dir)


def discover_doc_routes(build_dir, base_prefix, exclude, include) -> list[str]:
    """Return ordered HTTP paths for every documentation page."""
    docs_dir = os.path.join(build_dir, "docs")
    routes: list[str] = []

    if os.path.isdir(docs_dir):
        for root, _dirs, files in os.walk(docs_dir):
            if "index.html" not in files:
                continue
            rel = os.path.relpath(root, build_dir)
            rel_url = "" if rel == "." else "/" + rel.replace(os.sep, "/")
            routes.append(f"{base_prefix}{rel_url}/")

    if not routes and os.path.exists(os.path.join(build_dir, "index.html")):
        routes.append(f"{base_prefix}/")

    if include:
        routes = [r for r in routes if any(pat in r for pat in include)]
    if exclude:
        routes = [r for r in routes if not any(pat in r for pat in exclude)]

    routes.sort()
    return routes


def fetch(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode("utf-8")


def extract_stylesheets(page_html: str):
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(page_html, "html.parser")
    hrefs = []
    for link in soup.find_all("link"):
        rel = link.get("rel") or []
        if "stylesheet" in rel and link.get("href"):
            hrefs.append(link["href"])
    return hrefs


def extract_article(page_html: str, index: int):
    """Return (title, inner_html, headings) for a Docusaurus page.

    headings is a list of (level, text, id) for h2/h3, with unique ids injected
    so the table of contents can link to them.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(page_html, "html.parser")
    node = (
        soup.select_one(".theme-doc-markdown")
        or soup.select_one("article")
        or soup.select_one("main")
    )
    if node is None:
        return "Document", "", []

    # Drop the hover anchor links Docusaurus injects into headings.
    for anchor in node.select("a.hash-link"):
        anchor.decompose()

    # Flag wide tables so the CSS can lay them out to fit (and the chapter can
    # switch to landscape). Generic: based on the table's column count.
    tag_wide_tables(node)

    heading = node.find("h1")
    if heading:
        title = heading.get_text(strip=True)
    elif soup.title and soup.title.string:
        title = soup.title.string.split("|")[0].strip()
    else:
        title = "Document"

    headings = []
    for count, tag in enumerate(node.find_all(["h2", "h3"])):
        hid = f"c{index}-s{count}"
        tag["id"] = hid
        headings.append((int(tag.name[1]), tag.get_text(strip=True), hid))

    return title, node.decode_contents(), headings


def build_toc_items(chapters):
    """Build numbered, multi-level TOC entries: (level, number, text, anchor)."""
    items = []
    for ci, (title, _content, headings) in enumerate(chapters):
        top = ci + 1
        items.append((1, str(top), title, f"chapter-{ci}"))
        h2 = 0
        h3 = 0
        for level, text, hid in headings:
            if level == 2:
                h2 += 1
                h3 = 0
                items.append((2, f"{top}.{h2}", text, hid))
            else:  # h3
                h3 += 1
                items.append((3, f"{top}.{h2}.{h3}", text, hid))
    return items


def build_document(server_url, css_hrefs, chapters, meta):
    links = "\n".join(
        f'<link rel="stylesheet" href="{html.escape(h)}">' for h in css_hrefs
    )
    # Only the title is a link (small click area, so the PDF viewer's hover
    # highlight does not cover the whole row). The dotted leader is a plain
    # filler and the page number is generated via target-counter on a non-link
    # element carrying the href attribute.
    toc_items = "\n".join(
        f'<li class="toc-l{level}">'
        f'<a class="toc-link" href="#{anchor}">'
        f'<span class="toc-num">{html.escape(number)}</span>'
        f'<span class="toc-text">{html.escape(text)}</span></a>'
        f'<span class="toc-dots"></span>'
        f'<span class="toc-pg" data-href="#{anchor}"></span>'
        f'</li>'
        for level, number, text, anchor in build_toc_items(chapters)
    )
    # Chapters that contain a wide table (tagged "wide-table" during extraction)
    # are rendered in landscape so every column fits the page; the CSS keys off
    # the "landscape" class on the chapter section.
    chapter_blocks = "\n".join(
        f'<section class="chapter{" landscape" if "wide-table" in content else ""}" id="chapter-{i}">'
        f'<div class="markdown">{content}</div></section>'
        for i, (_, content, _headings) in enumerate(chapters)
    )

    eyebrow = html.escape(meta.get("eyebrow", ""))
    title = html.escape(meta["title"])
    subtitle = html.escape(meta.get("subtitle", ""))
    date = html.escape(meta.get("date", ""))
    source = html.escape(meta.get("source", ""))

    return f"""<!DOCTYPE html>
<html lang="{html.escape(meta.get('lang', 'en'))}">
<head>
<meta charset="utf-8">
{links}
<title>{title}</title>
</head>
<body>
<section id="cover">
  <div class="cover-top">
    <p class="cover-eyebrow">{eyebrow}</p>
    <h1 class="cover-title">{title}</h1>
    <p class="cover-subtitle">{subtitle}</p>
  </div>
  <div class="cover-meta">
    <span>{date}</span>
    <span>{source}</span>
  </div>
</section>
<section id="toc">
  <h1>{html.escape(meta.get('toc_title', 'Table of contents'))}</h1>
  <ul class="toc">
{toc_items}
  </ul>
</section>
{chapter_blocks}
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a polished PDF from a Docusaurus site.")
    parser.add_argument("--build-dir", default="build", help="Path to the built site.")
    parser.add_argument("--output", default="build/documentation.pdf", help="Output PDF path.")
    parser.add_argument("--base-url", default="/", help="Docusaurus baseUrl used at build time.")
    parser.add_argument("--stylesheet", default=os.path.join(os.path.dirname(__file__), "report.css"))
    parser.add_argument("--port", type=int, default=8765, help="Local HTTP port.")
    parser.add_argument("--exclude", default="", help="Comma-separated route substrings to skip.")
    parser.add_argument("--include", default="", help="Comma-separated route substrings to keep (others are skipped).")
    parser.add_argument("--title", default="Documentation", help="Cover title.")
    parser.add_argument("--subtitle", default="", help="Cover subtitle.")
    parser.add_argument("--eyebrow", default="Documentation", help="Small label above the cover title.")
    parser.add_argument("--source", default="", help="Source URL shown on the cover.")
    parser.add_argument("--toc-title", default="Table of contents", help="Table-of-contents heading.")
    parser.add_argument("--lang", default="en", help="Document language code.")
    args = parser.parse_args()

    exclude = [p.strip() for p in args.exclude.split(",") if p.strip()]
    include = [p.strip() for p in args.include.split(",") if p.strip()]

    build_dir = os.path.abspath(args.build_dir)
    if not os.path.isdir(build_dir):
        log(f"Build directory not found: {build_dir} (run the Docusaurus build first).")
        return 1

    from weasyprint import CSS, HTML

    base_prefix = normalize_base_url(args.base_url)
    routes = discover_doc_routes(build_dir, base_prefix, exclude, include)
    if not routes:
        log("No pages found to render.")
        return 1

    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(build_dir, base_prefix))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    server_url = f"http://127.0.0.1:{args.port}"
    log(f"Serving {build_dir} on {server_url} (base '{base_prefix or '/'}')")

    try:
        chapters = []
        css_hrefs = []
        for route in routes:
            page_html = fetch(f"{server_url}{route}")
            if not css_hrefs:
                css_hrefs = extract_stylesheets(page_html)
            title, content, headings = extract_article(page_html, len(chapters))
            if content.strip():
                chapters.append((title, content, headings))
                log(f"Added '{title}' ({route})")
            else:
                log(f"Skipped empty page {route}")

        if not chapters:
            log("No content extracted.")
            return 1

        meta = {
            "title": args.title,
            "subtitle": args.subtitle,
            "eyebrow": args.eyebrow,
            "source": args.source,
            "toc_title": args.toc_title,
            "lang": args.lang,
            "date": datetime.date.today().isoformat(),
        }
        document_html = build_document(server_url, css_hrefs, chapters, meta)

        stylesheets = [CSS(filename=args.stylesheet)] if os.path.exists(args.stylesheet) else []
        os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
        HTML(string=document_html, base_url=f"{server_url}/").write_pdf(
            args.output, stylesheets=stylesheets
        )
        log(f"Wrote {args.output} ({len(chapters)} chapters).")
    finally:
        server.shutdown()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
