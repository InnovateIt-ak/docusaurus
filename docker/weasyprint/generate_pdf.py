#!/usr/bin/env python3
"""Generate a single PDF from a built Docusaurus site using WeasyPrint.

The script serves the static ``build/`` directory over a local HTTP server so
that absolute asset URLs (which depend on Docusaurus' ``baseUrl``) resolve
correctly, then renders every documentation page and merges them into one PDF.

Usage:
    python generate_pdf.py --build-dir build --output build/documentation.pdf \
        --base-url /docusaurus
"""

import argparse
import functools
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def log(message: str) -> None:
    print(f"[weasyprint] {message}", file=sys.stderr, flush=True)


def normalize_base_url(base_url: str) -> str:
    """Return a base prefix like '/docusaurus' (no trailing slash, '' for root)."""
    base = (base_url or "/").strip()
    if not base.startswith("/"):
        base = "/" + base
    base = base.rstrip("/")
    return base  # '' when base_url was '/'


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


def discover_doc_routes(build_dir: str, base_prefix: str, exclude: list[str]) -> list[str]:
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

    # Fallback: no docs folder -> render the homepage so we still emit a PDF.
    if not routes and os.path.exists(os.path.join(build_dir, "index.html")):
        routes.append(f"{base_prefix}/")

    if exclude:
        routes = [r for r in routes if not any(pat in r for pat in exclude)]

    routes.sort()
    return routes


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a PDF from a Docusaurus site.")
    parser.add_argument("--build-dir", default="build", help="Path to the built site.")
    parser.add_argument("--output", default="build/documentation.pdf", help="Output PDF path.")
    parser.add_argument("--base-url", default="/", help="Docusaurus baseUrl used at build time.")
    parser.add_argument("--stylesheet", default=os.path.join(os.path.dirname(__file__), "print.css"))
    parser.add_argument("--port", type=int, default=8765, help="Local HTTP port.")
    parser.add_argument(
        "--exclude",
        default="",
        help="Comma-separated route substrings to skip (e.g. interactive pages "
        "that cannot be rendered to PDF).",
    )
    args = parser.parse_args()

    exclude = [p.strip() for p in args.exclude.split(",") if p.strip()]

    build_dir = os.path.abspath(args.build_dir)
    if not os.path.isdir(build_dir):
        log(f"Build directory not found: {build_dir} (run the Docusaurus build first).")
        return 1

    # Import here so '--help' works even without the native libs installed.
    from weasyprint import CSS, HTML

    base_prefix = normalize_base_url(args.base_url)
    routes = discover_doc_routes(build_dir, base_prefix, exclude)
    if not routes:
        log("No pages found to render.")
        return 1

    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(build_dir, base_prefix))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log(f"Serving {build_dir} on http://127.0.0.1:{args.port} (base '{base_prefix or '/'}')")

    try:
        stylesheets = [CSS(filename=args.stylesheet)] if os.path.exists(args.stylesheet) else []
        documents = []
        for route in routes:
            url = f"http://127.0.0.1:{args.port}{route}"
            log(f"Rendering {route}")
            documents.append(HTML(url=url).render(stylesheets=stylesheets))

        all_pages = [page for doc in documents for page in doc.pages]
        os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
        documents[0].copy(all_pages).write_pdf(args.output)
        log(f"Wrote {args.output} ({len(all_pages)} pages from {len(routes)} documents).")
    finally:
        server.shutdown()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
