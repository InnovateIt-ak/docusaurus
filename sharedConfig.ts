// Shared configuration consumed from more than one place.
//
// PDFs are AUTO-DISCOVERED from the docs — one PDF per top-level section under
// docs/ (folders, excluding `_*` partials), plus one global PDF that includes
// everything. `scripts/generate-pdfs.mjs` does the discovery and generation;
// there is no per-document list to maintain.
//
// PDF_OPTIONS below are optional knobs only (all have sensible defaults). The
// navbar menu is chosen by hand in docusaurus.config.ts — section PDFs are
// served at `/<section>.pdf` and the global one at `/<globalId>.pdf`.

export interface PdfOptions {
  /** Prefixed to every cover title, e.g. "My Site" -> "My Site — Architecture". */
  titlePrefix?: string;
  /** Small label above each cover title. */
  eyebrow?: string;
  /** Table-of-contents heading. */
  tocTitle?: string;
  /** Filename (without extension) of the all-in-one PDF -> build/<globalId>.pdf */
  globalId?: string;
  /** Cover title of the all-in-one PDF (before the prefix). */
  globalTitle?: string;
  /** Section folder names under docs/ to skip (besides `_*`, which are always skipped). */
  excludeSections?: string[];
}

export const PDF_OPTIONS: PdfOptions = {
  titlePrefix: 'My Site',
  eyebrow: 'Documentation',
  tocTitle: 'Table of Contents',
  globalId: 'documentation',
  globalTitle: 'Full documentation',
  excludeSections: [],
};
