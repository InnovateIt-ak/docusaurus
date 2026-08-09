# WeasyPrint converter image, built on Red Hat hardened images (hi/python).
#
# The hardened runtime image is minimal and ships without a package manager, so
# the build is split into stages:
#   - venv-builder (hi/python -builder): builds the Python virtual environment;
#   - ubi-libs (ubi9/ubi): stages the native runtime libraries + fonts into a
#     separate root using UBI's own GPG-verified repositories;
# both are then copied into the minimal hardened runtime image.
#
# The base images are signature-verified in CI before the build, e.g.:
#   cosign verify --insecure-ignore-tlog registry.access.redhat.com/hi/python:3.12
#   cosign verify --insecure-ignore-tlog registry.access.redhat.com/hi/python:3.12-builder

# ------------------------------------------------------------- venv-builder ----
FROM artifactory.eeas.europa.eu/eeas-docker-local/python:3.12-hi-builder AS venv-builder

USER root

# Python virtual environment with WeasyPrint and its dependencies.
COPY docker/weasyprint/requirements.txt /tmp/requirements.txt
RUN python3 -m venv --copies /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

# ----------------------------------------------------------------- ubi-libs ----
# Stage native libraries (Pango / cairo / harfbuzz / gdk-pixbuf / fontconfig)
# and fonts into /mnt/rootfs. The hardened base only ships a minimal curated
# repository which does not include Pango/cairo/etc; the standard UBI 9 image
# already has its repositories configured (with GPG verification), so we install
# from there and copy the resulting binaries into the runtime.
FROM artifactory.eeas.europa.eu/redhat-docker-remote/ubi9/ubi AS ubi-libs

RUN mkdir -p /mnt/rootfs \
 && dnf install -y --installroot=/mnt/rootfs --releasever=9 \
        --setopt=install_weak_deps=0 --setopt=tsflags=nodocs \
        pango cairo gdk-pixbuf2 harfbuzz fontconfig freetype libffi \
        dejavu-sans-fonts dejavu-sans-mono-fonts liberation-mono-fonts \
 && dnf clean all --installroot=/mnt/rootfs \
 && rm -rf /mnt/rootfs/var/cache/dnf

# IBM Plex (the brand typeface referenced by report.css). It is not packaged
# in the UBI repositories, so the exact weights we use (Sans Light/Regular/
# Bold, Mono Regular/Bold, SIL OFL 1.1) are vendored under docker/weasyprint/
# fonts and staged here, keeping the build fully offline / reproducible.
COPY docker/weasyprint/fonts/ibm-plex/ /mnt/rootfs/usr/share/fonts/ibm-plex/

# Noto Emoji (monochrome) for emoji/symbol glyphs used in the docs (✅ ⚠️ ❌),
# which none of the text fonts cover. Not in the UBI repositories either, so the
# font (subset to the symbol + emoji ranges, SIL OFL 1.1) is vendored like IBM
# Plex. Monochrome — the colour CBDT font renders badly in WeasyPrint.
COPY docker/weasyprint/fonts/noto-emoji/ /mnt/rootfs/usr/share/fonts/noto-emoji/

# Strip glibc and the dynamic linker from the staged root. The UBI glibc is
# older than the hardened runtime's and must never reach the runtime's library
# search path: the runtime Python is linked with DT_RELR relocations and needs
# the GLIBC_ABI_DT_RELR symbol version, which the UBI glibc does not provide.
# This MUST include the glibc-hwcaps/ variants (x86-64-v2 / v3), which the
# loader would otherwise prefer over the runtime glibc on capable CPUs.
RUN cd /mnt/rootfs/usr/lib64 \
 && rm -rf glibc-hwcaps \
 && rm -f libc.so.6 libm.so.6 libmvec.so.1 libdl.so.2 libpthread.so.0 \
          librt.so.1 libresolv.so.2 libutil.so.1 libanl.so.1 \
          libBrokenLocale.so.1 libthread_db.so.1 libnss_*.so.2 \
          libc_malloc_debug.so.0 libpcprofile.so libSegFault.so \
          ld-linux-x86-64.so.2

# ------------------------------------------------------------------ runtime ----
FROM artifactory.eeas.europa.eu/eeas-docker-local/python:3.12-hi AS weasyprint

# The UBI native libraries are isolated under /opt/ubi/lib64 and exposed through
# LD_LIBRARY_PATH instead of being overlaid on /usr/lib64. This keeps the
# hardened runtime's own libraries (glibc, openssl, libstdc++, glib2, ...)
# authoritative: overlaying /usr/lib64 would clobber them with the older UBI
# builds (the cause of the GLIBC_ABI_DT_RELR failure) and defeat the hardened
# image. The UBI libs were built against an older glibc and run fine on the
# newer runtime glibc (forward compatible).
COPY --from=ubi-libs /mnt/rootfs/usr/lib64/            /opt/ubi/lib64/
COPY --from=ubi-libs /mnt/rootfs/usr/share/fonts/      /usr/share/fonts/
COPY --from=ubi-libs /mnt/rootfs/usr/share/fontconfig/ /usr/share/fontconfig/
COPY --from=ubi-libs /mnt/rootfs/etc/fonts/            /etc/fonts/
COPY --from=venv-builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:${PATH}" \
    LD_LIBRARY_PATH="/opt/ubi/lib64" \
    PYTHONUNBUFFERED=1 \
    XDG_CACHE_HOME=/tmp/.cache

COPY docker/weasyprint/generate_pdf.py /opt/weasyprint/generate_pdf.py
COPY docker/weasyprint/report.css /opt/weasyprint/report.css

WORKDIR /data

ENTRYPOINT ["python", "/opt/weasyprint/generate_pdf.py"]
CMD ["--build-dir", "/data/build", "--output", "/data/build/documentation.pdf", "--base-url", "/"]