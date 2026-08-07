// Single source of truth for the PDFs produced from the docs.
//
// Each entry describes ONE PDF: which pages go into it (include/exclude route
// substrings) and its cover metadata. This same list drives BOTH:
//   * the generation — `scripts/generate-pdfs.mjs` builds one `build/<id>.pdf`
//     per entry (via the WeasyPrint image / docker/weasyprint/generate_pdf.py);
//   * the navbar — `docusaurus.config.ts` renders a "📄 PDF" dropdown with one
//     link (`pathname:///<id>.pdf`) per entry.
//
// To add a PDF: add an object here. That's it — generation and menu follow.
// To change what a PDF contains: edit its `include` / `exclude`.
//
// Fields:
//   id       (required) output filename without extension, and the menu link
//            target (`/<id>.pdf`). Keep it URL-safe (letters, digits, dashes).
//   label    (required) text shown in the navbar dropdown.
//   title    (required) cover title.
//   subtitle / eyebrow / tocTitle / source  (optional) cover + TOC metadata.
//   include  (optional) array of route substrings to KEEP (others dropped).
//   exclude  (optional) array of route substrings to DROP.
//   inMenu   (optional, default true) set false to generate the PDF but hide
//            it from the navbar.

/** @typedef {{
 *   id: string, label: string, title: string,
 *   subtitle?: string, eyebrow?: string, tocTitle?: string, source?: string,
 *   include?: string[], exclude?: string[], inMenu?: boolean,
 * }} PdfDoc */

/** @type {PdfDoc[]} */
export const PDF_DOCS = [
  {
    id: 'architecture',
    label: 'Architecture',
    title: 'My Site — Architecture',
    eyebrow: 'Software Architecture',
    subtitle: 'arc42 / MADR architecture documentation',
    tocTitle: 'Table of Contents',
    include: ['/docs/architecture/'],
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    title: 'My Site — Tutorial',
    eyebrow: 'Getting Started',
    subtitle: 'Tutorial basics & extras',
    tocTitle: 'Table of Contents',
    include: ['/docs/tutorial-basics/', '/docs/tutorial-extras/'],
  },
];

export default PDF_DOCS;
