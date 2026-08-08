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
import base64
import datetime
import functools
import html
import os
import re
import sys
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


# A table with at least this many columns does not fit a portrait A4 page, so
# its chapter is rendered in landscape and the table is laid out to fit. This is
# the only "wide table" heuristic — it keys off the table shape, not any markup
# the author has to add.
WIDE_TABLE_MIN_COLUMNS = 7

# A diagram/image whose aspect ratio (width / height) is at least this wide, and
# whose intrinsic width is at least this many CSS pixels, is rendered on a
# landscape page so it stays readable instead of being shrunk to the portrait
# column width (e.g. wide PlantUML sequence diagrams).
WIDE_IMAGE_MIN_RATIO = 1.4
WIDE_IMAGE_MIN_WIDTH = 700


def log(message: str) -> None:
    print(f"[weasyprint] {message}", file=sys.stderr, flush=True)


# A manual section number an author may have typed at the start of a heading,
# e.g. "1.", "2.3", "4.5.6)", "7) ". The table of contents generates its own
# automatic numbering (build_toc_items), so this leading token is stripped to
# avoid a doubled number like "1.1  1. Executive Summary".
#
# A separator (a "." or ")") is required for a single-level number ("1.", "7)")
# and multi-level numbers may omit the trailing one ("1.1"). This is what keeps
# a real title beginning with a bare number — "2024 Roadmap", "3D Rendering" —
# from being mistaken for a section number and stripped.
_MANUAL_HEADING_NUMBER = re.compile(r"^\s*\d+(?:(?:\.\d+)+[.)]?|[.)])\s+(?=\S)")


def strip_manual_heading_number(tag) -> None:
    """Remove a manual "1.2" style number from the start of a heading tag.

    Edits only the first text node so nested markup (``<code>``, ``<a>`` …) in
    the heading survives. A no-op when the heading does not begin with a manual
    number, or begins with an element rather than text.
    """
    for child in tag.contents:
        if isinstance(child, str):
            stripped = _MANUAL_HEADING_NUMBER.sub("", child, count=1)
            if stripped != child:
                child.replace_with(stripped)
        return


def _table_column_count(table) -> int:
    """Best-effort column count: the widest row of the table."""
    widest = 0
    for row in table.find_all("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        widest = max(widest, len(cells))
    return widest


def _wrap_landscape(soup, target) -> None:
    """Wrap ``target`` in a ``.landscape-block``, pulling an immediately
    preceding heading in with it.

    A wide table/diagram is isolated on its own landscape page; without this, a
    heading that introduces it (``## The overall … landscape`` right before the
    diagram) would be left orphaned at the bottom of the previous portrait page,
    separated from the content it titles. Moving that heading inside the block
    keeps heading + diagram together on the landscape page.
    """
    wrapper = soup.new_tag("div")
    wrapper["class"] = ["landscape-block"]
    lead = target.find_previous_sibling()
    if lead is None or getattr(lead, "name", None) not in ("h2", "h3", "h4"):
        lead = None
    target.wrap(wrapper)
    if lead is not None:
        wrapper.insert(0, lead.extract())


def tag_wide_tables(soup, node) -> bool:
    """Mark wide tables and wrap each one in a landscape block.

    A table with too many columns to fit a portrait page is given the
    ``wide-table`` class (compact, fixed layout) and wrapped in a
    ``landscape-block`` element. The CSS renders only that block on a landscape
    page, so the surrounding text returns to portrait once the table is done.
    Returns True if at least one wide table was found.
    """
    found = False
    for table in node.find_all("table"):
        if _table_column_count(table) >= WIDE_TABLE_MIN_COLUMNS:
            classes = table.get("class", [])
            if "wide-table" not in classes:
                classes.append("wide-table")
            table["class"] = classes
            _wrap_landscape(soup, table)
            found = True
    return found


def _image_dimensions(img):
    """Return (width, height) in px for an <img>, or None if unknown.

    Reads the width/height (or viewBox) of inline SVG data URLs — that is how the
    PlantUML plugin embeds diagrams — and falls back to width/height attributes.
    """
    src = img.get("src", "")
    if src.startswith("data:image/svg+xml;base64,"):
        try:
            svg = base64.b64decode(src.split(",", 1)[1]).decode("utf-8", "replace")
        except (ValueError, UnicodeError):
            return None
        m = re.search(r'<svg[^>]*\bwidth="([\d.]+)(?:px)?"[^>]*\bheight="([\d.]+)', svg)
        if not m:
            m = re.search(r'viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"', svg)
        if m:
            return float(m.group(1)), float(m.group(2))
        return None
    try:
        return float(img.get("width")), float(img.get("height"))
    except (TypeError, ValueError):
        return None


def tag_wide_images(soup, node) -> bool:
    """Wrap wide diagrams/images in a landscape block, mirroring wide tables.

    Generic: based on the image's intrinsic aspect ratio, so any wide diagram is
    rotated to a landscape page without per-page markup. Returns True if one was
    found.
    """
    found = False
    for img in node.find_all("img"):
        dims = _image_dimensions(img)
        if not dims:
            continue
        width, height = dims
        if height <= 0 or width < WIDE_IMAGE_MIN_WIDTH:
            continue
        if width / height < WIDE_IMAGE_MIN_RATIO:
            continue
        # Wrap the closest block container (usually the <p> the image sits in) so
        # the landscape <div> is not placed inside a <p>.
        target = img.parent if (img.parent is not None and img.parent.name == "p") else img
        _wrap_landscape(soup, target)
        found = True
    return found


def _is_blank_block(tag) -> bool:
    """True for a filler tag that carries no visible content.

    Docusaurus emits stray empty ``<p></p>`` around block content (e.g. right
    before a diagram). Such tags must not count when deciding whether a chapter
    holds nothing but a single landscape diagram.
    """
    if tag.name in ("header", "h1"):
        return False
    if tag.get_text(strip=True):
        return False
    return tag.find(["img", "svg", "table", "pre", "hr"]) is None


def is_single_landscape_chapter(node) -> bool:
    """True when a chapter's only content is one landscape block under its title.

    A chapter that is just ``# Heading`` + one wide diagram would otherwise put
    the heading alone on a portrait page and the diagram on the next (landscape)
    page — the title divorced from the figure it names. Detecting that shape lets
    the builder render the whole chapter on a single landscape page instead.
    """
    tags = [c for c in node.children if getattr(c, "name", None)]
    body = [
        t for t in tags
        if t.name not in ("header", "h1") and not _is_blank_block(t)
    ]
    stray_text = any(
        isinstance(c, str) and c.strip() for c in node.children
    )
    return (
        not stray_text
        and len(body) == 1
        and "landscape-block" in (body[0].get("class") or [])
    )


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


def discover_doc_routes(build_dir, base_prefix, exclude, include, include_exact=None) -> list[str]:
    """Return ordered HTTP paths for every documentation page.

    ``include`` keeps routes whose path *contains* any of the given substrings
    (used to select a whole section). ``include_exact`` keeps only routes that
    *equal* one of the given paths, compared without the base prefix and with a
    single trailing slash — this is what makes "one page → one PDF" reliable
    even when a page's route is a prefix of another page's route.
    """
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

    if include_exact:
        def normalize(path: str) -> str:
            path = path if path.startswith("/") else "/" + path
            return path if path.endswith("/") else path + "/"

        def rel_route(route: str) -> str:
            if base_prefix and route.startswith(base_prefix):
                route = route[len(base_prefix):] or "/"
            return route if route.endswith("/") else route + "/"

        wanted = {normalize(p) for p in include_exact}
        routes = [r for r in routes if rel_route(r) in wanted]
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
    # Only real documentation pages carry `.theme-doc-markdown`. Generated-index
    # / category landing pages (a grid of cards, no prose) do not, so returning
    # empty here keeps them out of every PDF — including the global one, whose
    # `/docs/` filter would otherwise pull them in as junk "cards" chapters.
    node = soup.select_one(".theme-doc-markdown")
    if node is None:
        return "Document", "", [], False

    # Drop the hover anchor links Docusaurus injects into headings.
    for anchor in node.select("a.hash-link"):
        anchor.decompose()

    # Wrap wide tables and wide diagrams in a landscape block so they fit the
    # page while the surrounding text stays portrait.
    tag_wide_tables(soup, node)
    tag_wide_images(soup, node)

    heading = node.find("h1")
    if heading:
        strip_manual_heading_number(heading)
        title = heading.get_text(strip=True)
    elif soup.title and soup.title.string:
        title = soup.title.string.split("|")[0].strip()
    else:
        title = "Document"

    # Strip any manual "1.2" numbering the author typed into a heading so it is
    # not duplicated by the table of contents' own automatic numbering. The tag
    # text is edited in place, so the chapter body reads cleanly too.
    headings = []
    for count, tag in enumerate(node.find_all(["h2", "h3"])):
        hid = f"c{index}-s{count}"
        tag["id"] = hid
        strip_manual_heading_number(tag)
        headings.append((int(tag.name[1]), tag.get_text(strip=True), hid))

    full_landscape = is_single_landscape_chapter(node)

    return title, node.decode_contents(), headings, full_landscape


def build_toc_items(chapters):
    """Build numbered, multi-level TOC entries: (level, number, text, anchor)."""
    items = []
    for ci, (title, _content, headings, *_rest) in enumerate(chapters):
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
    # Wide tables are wrapped in a ".landscape-block" during extraction, which
    # the CSS renders on a landscape page on its own; the rest of each chapter
    # stays portrait.
    # A chapter that is nothing but a heading and one wide diagram is rendered
    # entirely on a landscape page (`chapter--landscape`), so the title stays
    # with the figure it introduces instead of stranded on a portrait page of
    # its own. See is_single_landscape_chapter / report.css.
    def render_chapter(i, chapter):
        _title, content, _headings, *rest = chapter
        full_landscape = rest[0] if rest else False
        cls = "chapter chapter--landscape" if full_landscape else "chapter"
        return (
            f'<section class="{cls}" id="chapter-{i}">'
            f'<div class="markdown">{content}</div></section>'
        )

    chapter_blocks = "\n".join(
        render_chapter(i, chapter) for i, chapter in enumerate(chapters)
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
    parser.add_argument("--include-exact", default="", help="Comma-separated exact routes to keep (one page → one PDF).")
    parser.add_argument("--title", default="Documentation", help="Cover title.")
    parser.add_argument("--subtitle", default="", help="Cover subtitle.")
    parser.add_argument("--eyebrow", default="Documentation", help="Small label above the cover title.")
    parser.add_argument("--source", default="", help="Source URL shown on the cover.")
    parser.add_argument("--toc-title", default="Table of contents", help="Table-of-contents heading.")
    parser.add_argument("--lang", default="en", help="Document language code.")
    args = parser.parse_args()

    exclude = [p.strip() for p in args.exclude.split(",") if p.strip()]
    include = [p.strip() for p in args.include.split(",") if p.strip()]
    include_exact = [p.strip() for p in args.include_exact.split(",") if p.strip()]

    build_dir = os.path.abspath(args.build_dir)
    if not os.path.isdir(build_dir):
        log(f"Build directory not found: {build_dir} (run the Docusaurus build first).")
        return 1

    from weasyprint import CSS, HTML

    base_prefix = normalize_base_url(args.base_url)
    routes = discover_doc_routes(build_dir, base_prefix, exclude, include, include_exact)
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
            title, content, headings, full_landscape = extract_article(
                page_html, len(chapters)
            )
            if content.strip():
                chapters.append((title, content, headings, full_landscape))
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
