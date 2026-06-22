FROM node:latest AS dev

WORKDIR /srv/app
# graphviz: LikeC4 diagram rendering.
# chromium: headless browser used at build time by the Mermaid-to-SVG remark
# plugin (src/remark/mermaidToImage.mjs) to bake diagrams into the HTML/PDF.
RUN apt-get update \
 && apt-get install -y --no-install-recommends graphviz chromium fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

# Reuse the distro Chromium instead of letting Puppeteer download its own.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

#ENTRYPOINT ["/bin/bash", "-c","tail -f /dev/null"]
ENTRYPOINT ["npm", "run","start"]

FROM node:latest AS prod_build
RUN apt-get update && apt-get install -y git
# graphviz: LikeC4. chromium: headless browser for build-time Mermaid rendering
# (src/remark/mermaidToImage.mjs).
RUN apt-get update \
 && apt-get install -y --no-install-recommends graphviz chromium fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

# Reuse the distro Chromium instead of letting Puppeteer download its own.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /srv/app
COPY . .
RUN npm run build-likec4-react
RUN npm run clear && npm install && npm run build


FROM caddy:latest AS prod


COPY --from=prod_build /srv/app/build /usr/share/caddy
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
