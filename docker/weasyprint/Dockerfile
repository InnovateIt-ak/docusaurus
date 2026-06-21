# WeasyPrint converter image, built on Red Hat hardened images (hi/python).
#
# The hardened runtime image is minimal and ships without a package manager, so
# we use the matching "-builder" image to (1) build the Python virtual
# environment and (2) stage the native runtime libraries + fonts into a separate
# root that is then copied into the runtime image.
#
# The base images are signature-verified in CI before the build, e.g.:
#   cosign verify --insecure-ignore-tlog registry.access.redhat.com/hi/python:3.12
#   cosign verify --insecure-ignore-tlog registry.access.redhat.com/hi/python:3.12-builder

# ---------------------------------------------------------------- builder ----
FROM registry.access.redhat.com/hi/python:3.12-builder AS builder

USER root

# 1) Python virtual environment with WeasyPrint and its dependencies.
COPY docker/weasyprint/requirements.txt /tmp/requirements.txt
RUN python3 -m venv --copies /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

# 2) Stage native libraries (Pango / cairo / harfbuzz / gdk-pixbuf / fontconfig)
#    and fonts into /mnt/rootfs so they can be copied into the minimal runtime.
RUN mkdir -p /mnt/rootfs \
 && dnf install -y --installroot=/mnt/rootfs --use-host-config \
        --setopt=install_weak_deps=0 --setopt=tsflags=nodocs \
        pango cairo gdk-pixbuf2 harfbuzz fontconfig freetype libffi \
        dejavu-sans-fonts dejavu-sans-mono-fonts \
 && dnf clean all --installroot=/mnt/rootfs \
 && rm -rf /mnt/rootfs/var/cache/dnf

# ---------------------------------------------------------------- runtime ----
FROM registry.access.redhat.com/hi/python:3.12 AS weasyprint

# Native libraries + fonts, then the Python virtual environment.
COPY --from=builder /mnt/rootfs/ /
COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    XDG_CACHE_HOME=/tmp/.cache

COPY docker/weasyprint/generate_pdf.py /opt/weasyprint/generate_pdf.py
COPY docker/weasyprint/report.css /opt/weasyprint/report.css

WORKDIR /data

ENTRYPOINT ["python", "/opt/weasyprint/generate_pdf.py"]
CMD ["--build-dir", "/data/build", "--output", "/data/build/documentation.pdf", "--base-url", "/"]
