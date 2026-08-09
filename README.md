[![🏗️ Build latest](https://github.eeas.europa.eu/is-development/docusaurus/actions/workflows/build-base.yaml/badge.svg?branch=main)](https://github.eeas.europa.eu/is-development/docusaurus/actions/workflows/build-base.yaml)
[![🏗️ Publish GitHub Page](https://github.eeas.europa.eu/is-development/docusaurus/actions/workflows/build-page.yaml/badge.svg)](https://github.eeas.europa.eu/is-development/docusaurus/actions/workflows/build-page.yaml)
---


### 1. Copy ./secrets/_artifactory_token.txt to ./secrets/artifactory_token.txt


---

### 2. Basic image build

Build and check the base image
````
docker compose -f compose.base.yaml build --no-cache && docker compose -f compose.base.yaml up -d
````

Build and check the builder image
````
docker compose -f compose.ci.yaml build --no-cache && docker compose -f compose.ci.yaml up -d
````

Build and dev only
````
docker compose -f compose.dev.yaml build --no-cache && docker compose -f compose.dev.yaml up -d
````
---


Generate PDF
```

docker run --rm \
  -v "$(pwd)/build:/docs-to-pdf/build:ro" \
  -v "$(pwd)/output:/docs-to-pdf/output" \
  artifactory.eeas.europa.eu/ghcr.io-docker-remote/jean-humann/docs-to-pdf:latest-node24-alpine \
  docs-to-pdf docusaurus --version=3 \
    --docsDir="/docs-to-pdf/build" \
    --initialDocURLs="http://localhost:3000/docs/intro" \
    --outputPDFFilename="output/eeas-documentation.pdf" \
    --paperFormat="A4" \
    --pdfMargin="20,15,30,15" \
    --excludePaths="/docs/test,/docs/test-mermaid" \
    --puppeteerArgs="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage" \
    --headerTemplate='<span></span>' \
    --footerTemplate='<div style="font-size:9px; width:100%; text-align:center; color:#666;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' \
    --cssStyle="$(cat pdf-css/print.css)" \
    --coverTitle="PROJECT DOC V1"
    --disableCover
```