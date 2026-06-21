# WeasyPrint converter image: turns the built Docusaurus site into a PDF.
FROM python:3.12-slim AS weasyprint

# System libraries required by WeasyPrint (Pango / cairo / harfbuzz) + fonts.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz-subset0 \
        libgdk-pixbuf-2.0-0 \
        libffi-dev \
        shared-mime-info \
        fonts-dejavu \
        fonts-liberation \
        fonts-lato \
        fonts-symbola \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/weasyprint
COPY docker/weasyprint/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY docker/weasyprint/generate_pdf.py ./generate_pdf.py
COPY docker/weasyprint/report.css ./report.css

# Mount the repository at /data and the build/ folder will be read from there.
WORKDIR /data

ENTRYPOINT ["python", "/opt/weasyprint/generate_pdf.py"]
CMD ["--build-dir", "/data/build", "--output", "/data/build/documentation.pdf", "--base-url", "/"]
