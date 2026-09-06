# Design sync notes — "Docusaurus Site" (claude.ai/design)

This repo is a Docusaurus site, not a component library: there is no `dist/`
and no Storybook, so the design-sync converter does not apply. The project is
fed with **screenshots of every route**, light and dark, each wrapped in a
`.dc.html` card (`<!-- @dsCard group="All pages — light|dark" name="<route>" -->`
first line, `support.js` next to it, one `<img>` of the JPEG at 75 %).

## Pipeline (no node on the host)

1. Dev server running in `docusaurus-dev` (network `docusaurus_default`).
2. Routes: `grep -o "path: '[^']*'" .docusaurus/routes.js` (drop `/__docusaurus/*`).
3. Capture with `ghcr.io/puppeteer/puppeteer:24.10.0`:
   `docker run --rm --network docusaurus_default -v <dir>:/work -w /work -e NODE_PATH=/home/pptruser/node_modules ghcr.io/puppeteer/puppeteer:24.10.0 node capture.js`
   (`<dir>` world-writable, scripts 644). Desktop 1440px at 0.75 scale, JPEG q60,
   max height 6000px; plus ⌘K palette and mobile 390px (home, /docs/intro, menu open).
   Dark mode = click `button[class*="toggleButton"]` (media emulation is ignored).
   Redoc pages (`/api/*`) need ~7 s after load before the shot.
4. Cards from `manifest.json` (`cards.py`), `support.js` copied from the project.
5. `DesignSync`: `finalize_plan` (writes/deletes `all-pages-light/**`, `all-pages-dark/**`),
   `delete_files` the old set, `write_files` the new one (≤256 per call).

## History

- 2026-09-06: first push (all-pages-*, hand-built key-screens).
- 2026-09-06 (later): user asked to wipe the project and redo it from master —
  key-screens/, home-ideas, home-v2, templates/ and uploads/ deleted on request;
  72 cards re-captured (31 routes × 2 themes, palette, mobile).
