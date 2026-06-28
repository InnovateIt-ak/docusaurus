#!/usr/bin/env bash
# Build one PDF per top-level docs section from a built Docusaurus site, so any
# section under docs/ can be exported to PDF — not just architecture.
#
#   generate-all.sh <base-url> [build-dir] [out-dir]
#
# Section selection:
#   - PDF_SECTIONS="a,b"          -> only those sections (comma/space separated)
#   - otherwise                   -> every docs/<section>/ that has rendered pages
#   - PDF_EXCLUDE_SECTIONS="x,y"  -> drop these from the auto-discovered list
#
# Per-section cover text is optional: drop a docs/<section>/_pdf.env file that
# sets any of TITLE / SUBTITLE / EYEBROW / SOURCE. Without it, the title is the
# humanised folder name. The converter image defaults to "docusaurus-weasyprint"
# (override with WEASYPRINT_IMAGE).
set -euo pipefail

BASE_URL="${1:-/}"
BUILD_DIR="${2:-build}"
OUT_DIR="${3:-$BUILD_DIR}"
IMAGE="${WEASYPRINT_IMAGE:-docusaurus-weasyprint}"

humanize() {
  echo "$1" | sed 's/[-_]/ /g' | awk '{for (i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1'
}

# Resolve the list of sections to render.
if [ -n "${PDF_SECTIONS:-}" ]; then
  read -r -a sections <<<"$(echo "$PDF_SECTIONS" | tr ',' ' ')"
else
  sections=()
  for dir in "$BUILD_DIR"/docs/*/; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    # Only keep sections that actually contain rendered pages.
    if find "$dir" -name index.html -print -quit | grep -q .; then
      sections+=("$name")
    fi
  done
fi

if [ "${#sections[@]}" -eq 0 ]; then
  echo "No documentation sections found under $BUILD_DIR/docs/ — nothing to render."
  exit 0
fi

exclude=" $(echo "${PDF_EXCLUDE_SECTIONS:-}" | tr ',' ' ') "
made=0
for section in "${sections[@]}"; do
  [ -n "$section" ] || continue
  case "$exclude" in *" $section "*) echo "Skipping section: $section"; continue ;; esac

  # Reset per section so one section's _pdf.env never leaks into the next.
  TITLE="$(humanize "$section")"
  SUBTITLE=""
  EYEBROW="Documentation"
  SOURCE=""
  meta="docs/${section}/_pdf.env"
  if [ -f "$meta" ]; then
    # shellcheck disable=SC1090
    set -a; . "$meta"; set +a
  fi

  echo "::group::PDF — ${section}"
  docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/data" "$IMAGE" \
    --build-dir "/data/${BUILD_DIR}" \
    --output "/data/${OUT_DIR}/${section}.pdf" \
    --base-url "$BASE_URL" \
    --title "$TITLE" \
    --subtitle "$SUBTITLE" \
    --eyebrow "$EYEBROW" \
    ${SOURCE:+--source "$SOURCE"} \
    --toc-title "Table of Contents" \
    --include "/docs/${section}/"
  echo "::endgroup::"
  made=$((made + 1))
done

echo "Generated ${made} PDF(s) into ${OUT_DIR}/"
