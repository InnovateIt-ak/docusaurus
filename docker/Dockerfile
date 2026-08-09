ARG DOCUSAURUS_UP_STREAM=ghcr.io/innovateit-ak/docusaurus:latest

FROM node:26 AS node_up_stream
FROM caddy:2.11.4 AS caddy_up_stream

# Third-party image that already bundles the browser (Google build, Debian/glibc).
# Used only as a COPY source, so nothing is fetched from the Google CDN.
# Mirror/scan it into Artifactory and pin the tag (never 'latest').
FROM ghcr.io/puppeteer/puppeteer:24.10.0 AS chrome_src

# --- Chromium runtime libraries, staged from a full UBI9 image ----------------
# The hardened 'hi' base only ships a minimal curated repo (public-hummingbird)
# without gtk3/pango/nss/... Same approach as the WeasyPrint image: install the
# closure into an installroot, then COPY it and expose it to the Chrome process
# only (via a wrapper), never globally.
FROM registry.access.redhat.com/ubi9/ubi AS chromium-libs
RUN mkdir -p /mnt/rootfs \
 && dnf install -y --installroot=/mnt/rootfs --releasever=9 \
      --setopt=install_weak_deps=0 --setopt=tsflags=nodocs \
      nss nspr atk at-spi2-atk at-spi2-core cups-libs mesa-libgbm libdrm gtk3 \
      alsa-lib libX11 libxcb libXcomposite libXdamage libXext libXfixes libXrandr \
      libxkbcommon pango cairo dbus-libs fontconfig \
      dejavu-sans-fonts dejavu-sans-mono-fonts liberation-mono-fonts \
 && dnf clean all --installroot=/mnt/rootfs && rm -rf /mnt/rootfs/var/cache/dnf
# Strip the UBI glibc + loader so they never shadow the hardened runtime's glibc
# (same reasoning as the DT_RELR fix in the WeasyPrint image).
RUN cd /mnt/rootfs/usr/lib64 \
 && rm -rf glibc-hwcaps \
 && rm -f libc.so.6 libm.so.6 libmvec.so.1 libdl.so.2 libpthread.so.0 \
          librt.so.1 libresolv.so.2 libutil.so.1 libanl.so.1 \
          libBrokenLocale.so.1 libthread_db.so.1 libnss_*.so.2 \
          libc_malloc_debug.so.0 libpcprofile.so libSegFault.so \
          ld-linux-x86-64.so.2

# --- Shared base: hardened Node + grafted Chromium (build-time Mermaid) --------
# LD_LIBRARY_PATH is NOT global: a wrapper applies it to the Chrome process only,
# otherwise the older UBI libs would break the hardened base's coreutils/git/node
# (e.g. coreutils -> UBI libsystemd missing sd_session_get_start_time@LIBSYSTEMD_254).
FROM node_up_stream AS node_chromium
USER root
RUN dnf install -y git && dnf clean all;
COPY --from=chromium-libs /mnt/rootfs/usr/lib64/       /opt/chromium/lib64/
COPY --from=chromium-libs /mnt/rootfs/usr/share/fonts/ /usr/share/fonts/
COPY --from=chromium-libs /mnt/rootfs/etc/fonts/       /etc/fonts/
COPY --from=chrome_src /home/pptruser/.cache/puppeteer/ /opt/puppeteer/
RUN CHROME="$(find /opt/puppeteer -type f -name chrome-headless-shell | head -1)"; \
    [ -n "$CHROME" ] || CHROME="$(find /opt/puppeteer -type f -name chrome | head -1)"; \
    printf '#!/bin/sh\nexport LD_LIBRARY_PATH=/opt/chromium/lib64\nexec "%s" "$@"\n' "$CHROME" \
      > /usr/local/bin/chrome-shell; \
    chmod +x /usr/local/bin/chrome-shell
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chrome-shell

# --- Build image (npm ci) -----------------------------------------------------
FROM node_chromium AS base_image
ENV APP_WORK_DIR=/srv/app
WORKDIR $APP_WORK_DIR

COPY src /srv/app/src
COPY docker/npm/npm-config-clear.sh /srv/app/npm-config-clear.sh
COPY docker/npm/npm-config-set.sh /srv/app/npm-config-set.sh
COPY docker/npm/npm-install-ci.sh /srv/app/npm-install-ci.sh
COPY package.json /srv/app/package.json
COPY package-lock.json /srv/app/package-lock.json
COPY sidebars.ts /srv/app/sidebars.ts
COPY tsconfig.json /srv/app/tsconfig.json
COPY static /srv/app/static
RUN --mount=type=secret,id=artifactory_token \
    export HOME=/opt/app-root/src; \
    export ARTIFACTORY_TOKEN=$(cat /run/secrets/artifactory_token); \
    chmod +x /srv/app/npm-install-ci.sh; \
    bash /srv/app/npm-install-ci.sh; \
    ls node_modules | grep likec4;

# --- CI builder (production site) ---------------------------------------------
# ci_builder is FROM docusaurus:latest, so it inherits node_modules (with
# puppeteer-core) and src/remark/mermaid-*.mjs only if that upstream image is
# rebuilt from `base_image`. The headless Chromium used to render Mermaid at
# build time is grafted here directly (libs + binary + wrapper), so the CI
# builder can render diagrams even if the upstream image lags on the browser.
FROM $DOCUSAURUS_UP_STREAM AS ci_builder
USER root
ENV APP_WORK_DIR=/srv/app
WORKDIR $APP_WORK_DIR

# Headless Chromium graft (UBI libraries + Google binary), scoped to the browser
# process via the wrapper — no global LD_LIBRARY_PATH.
COPY --from=chromium-libs /mnt/rootfs/usr/lib64/       /opt/chromium/lib64/
COPY --from=chromium-libs /mnt/rootfs/usr/share/fonts/ /usr/share/fonts/
COPY --from=chromium-libs /mnt/rootfs/etc/fonts/       /etc/fonts/
COPY --from=chrome_src /home/pptruser/.cache/puppeteer/ /opt/puppeteer/
RUN CHROME="$(find /opt/puppeteer -type f -name chrome-headless-shell | head -1)"; \
    [ -n "$CHROME" ] || CHROME="$(find /opt/puppeteer -type f -name chrome | head -1)"; \
    printf '#!/bin/sh\nexport LD_LIBRARY_PATH=/opt/chromium/lib64\nexec "%s" "$@"\n' "$CHROME" \
      > /usr/local/bin/chrome-shell; \
    chmod +x /usr/local/bin/chrome-shell
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chrome-shell

COPY docusaurus.config.ts /srv/app/docusaurus.config.ts
COPY sharedConfig.ts /srv/app/sharedConfig.ts
COPY pdfMenu.ts /srv/app/pdfMenu.ts
COPY --chmod=755 docker/builder/entrypoint.sh /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]

# --- Dev ----------------------------------------------------------------------
FROM node_chromium AS node_dev_base
ENV APP_WORK_DIR=/srv/app
COPY --chmod=755 docker/dev/entrypoint.sh /usr/local/bin/entrypoint
ENV HOME=/opt/app-root/src
WORKDIR $APP_WORK_DIR
ENTRYPOINT ["entrypoint"]

FROM node_dev_base AS node_dev
CMD ["dev"]

FROM node_dev_base AS node_dev_container
CMD ["dev-container"]