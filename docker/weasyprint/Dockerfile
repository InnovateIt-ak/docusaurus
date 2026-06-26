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
FROM registry.access.redhat.com/hi/python:3.12-builder AS venv-builder

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
FROM registry.access.redhat.com/ubi9/ubi AS ubi-libs

RUN mkdir -p /mnt/rootfs \
 && dnf install -y --installroot=/mnt/rootfs --releasever=9 \
        --setopt=install_weak_deps=0 --setopt=tsflags=nodocs \
        pango cairo gdk-pixbuf2 harfbuzz fontconfig freetype libffi \
        dejavu-sans-fonts dejavu-sans-mono-fonts liberation-mono-fonts \
        google-noto-emoji-fonts \
 && dnf clean all --installroot=/mnt/rootfs \
 && rm -rf /mnt/rootfs/var/cache/dnf

# IBM Plex (the brand typeface referenced by report.css). It is not packaged
# in the UBI repositories, so the exact weights we use (Sans Light/Regular/
# Bold, Mono Regular/Bold, SIL OFL 1.1) are vendored under docker/weasyprint/
# fonts and staged here, keeping the build fully offline / reproducible.
COPY docker/weasyprint/fonts/ibm-plex/ /mnt/rootfs/usr/share/fonts/ibm-plex/

# Drop glibc and the dynamic linker from the staged root: the hardened runtime
# already provides a newer glibc, and overwriting it would break its Python.
# The UBI libraries (built against an older glibc) run fine on the newer one.
RUN cd /mnt/rootfs/usr/lib64 \
 && rm -f libc.so.6 libm.so.6 libmvec.so.1 libdl.so.2 libpthread.so.0 \
          librt.so.1 libresolv.so.2 libutil.so.1 libanl.so.1 \
          libBrokenLocale.so.1 libthread_db.so.1 libnss_*.so.2 \
          ld-linux-x86-64.so.2

# ------------------------------------------------------------------ runtime ----
FROM registry.access.redhat.com/hi/python:3.12 AS weasyprint

# Native libraries + fonts (copied selectively to avoid clobbering runtime
# directories such as /etc/ssl/certs), then the Python virtual environment.
COPY --from=ubi-libs /mnt/rootfs/usr/lib64/ /usr/lib64/
COPY --from=ubi-libs /mnt/rootfs/usr/share/fonts/ /usr/share/fonts/
COPY --from=ubi-libs /mnt/rootfs/usr/share/fontconfig/ /usr/share/fontconfig/
COPY --from=ubi-libs /mnt/rootfs/etc/fonts/ /etc/fonts/
COPY --from=venv-builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    XDG_CACHE_HOME=/tmp/.cache

COPY docker/weasyprint/generate_pdf.py /opt/weasyprint/generate_pdf.py
COPY docker/weasyprint/report.css /opt/weasyprint/report.css

WORKDIR /data

ENTRYPOINT ["python", "/opt/weasyprint/generate_pdf.py"]
CMD ["--build-dir", "/data/build", "--output", "/data/build/documentation.pdf", "--base-url", "/"]
