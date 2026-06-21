# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

make dev

make prod
## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## PDF generation (WeasyPrint)

The documentation can be exported to a single PDF using [WeasyPrint](https://weasyprint.org/),
packaged as a dedicated Docker image (`docker/weasyprint/`).

### With Docker / docker-compose

```bash
make pdf
```

This builds the static site and runs the WeasyPrint service (compose profile `pdf`),
writing the result to `build/documentation.pdf`.

Equivalent compose command (the site must already be built in `build/`):

```bash
docker compose --profile pdf run --rm weasyprint
```

The converter serves the `build/` folder locally, renders every page under
`build/docs/` (stripping the navbar/sidebar/footer via `docker/weasyprint/print.css`)
and merges them into one PDF. Use `--base-url` to match the Docusaurus `baseUrl`,
and `--exclude` (comma-separated route substrings) to skip interactive pages that
cannot be rendered to PDF, e.g. the LikeC4 diagram page.

### In CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`):

- builds `build/documentation.pdf` and publishes it with the site (job `deploy-github-pages`),
  so it is downloadable from the deployed URL;
- on every push and pull request, produces the PDF as the `documentation-pdf` artifact
  (job `build-pdf`).
