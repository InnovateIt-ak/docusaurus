---
sidebar_position: 3
sidebar_label: System landscape
slug: /architecture/03-system-landscape
---

# The overall system landscape

The system is composed of a small number of cooperating building blocks. The
documentation content is authored in Markdown, compiled into static assets, and
served to users through a content delivery layer.

The main elements are:

- **Authoring** — Markdown and MDX sources kept under version control.
- **Build** — Docusaurus compiles the sources into static HTML, CSS and JS.
- **Delivery** — a reverse proxy (Caddy) serves the static assets.
- **Automation** — a CI/CD pipeline builds, tests and publishes every change.

External dependencies are intentionally minimal to keep the runtime simple and to
maximise availability.
