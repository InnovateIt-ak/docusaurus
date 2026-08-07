// Shared configuration consumed from more than one place.
//
// PDF_DOCS is the single source of truth for the PDFs produced from the docs.
// It is read by `scripts/generate-pdfs.mjs` (which writes one build/<id>.pdf per
// entry via the WeasyPrint converter). The navbar menu is NOT generated from
// this list — menu links are chosen by hand in docusaurus.config.ts.
//
// To add a PDF: add an object here, then add its link to the navbar manually.
// To change what a PDF contains: edit its `include` / `exclude`.

export interface PdfDoc {
  /** Output filename without extension, e.g. "architecture" -> build/architecture.pdf */
  id: string;
  /** Cover title. */
  title: string;
  /** Small label above the cover title. */
  eyebrow?: string;
  /** Cover subtitle. */
  subtitle?: string;
  /** Table-of-contents heading. */
  tocTitle?: string;
  /** Source URL shown on the cover. */
  source?: string;
  /** Route substrings to KEEP (others are dropped). */
  include?: string[];
  /** Route substrings to DROP. */
  exclude?: string[];
}

export const PDF_DOCS: PdfDoc[] = [
  {
    id: 'architecture',
    title: 'My Site — Architecture',
    eyebrow: 'Software Architecture',
    subtitle: 'arc42 / MADR architecture documentation',
    tocTitle: 'Table of Contents',
    include: ['/docs/architecture/'],
  },
  {
    id: 'tutorial',
    title: 'My Site — Tutorial',
    eyebrow: 'Getting Started',
    subtitle: 'Tutorial basics & extras',
    tocTitle: 'Table of Contents',
    include: ['/docs/tutorial-basics/', '/docs/tutorial-extras/'],
  },
];
