// Generate one PDF per entry in pdf.config.mjs.
//
// Usage:
//   node scripts/generate-pdfs.mjs
//
// Runs the WeasyPrint converter over the already-built `build/` directory once
// per document defined in pdf.config.mjs, writing `build/<id>.pdf` for each.
//
// Runner:
//   * default — the Docker image `docker/weasyprint/Dockerfile` (matches CI;
//     no local WeasyPrint/native deps needed). Built once, then run per doc.
//   * PDF_LOCAL=1 — call `python3 docker/weasyprint/generate_pdf.py` directly
//     (for local dev where WeasyPrint is installed and Docker may be absent).
//
// Environment:
//   BASE_URL   the Docusaurus baseUrl the site was built with (default "/").
//              Must match the `npm run build` BASE_URL so asset paths resolve.

import {execFileSync} from 'node:child_process';
import {PDF_DOCS} from '../pdf.config.mjs';

const BASE_URL = process.env.BASE_URL ?? '/';
const LOCAL = process.env.PDF_LOCAL === '1';
const IMAGE = 'docusaurus-weasyprint';

function run(cmd, args) {
  execFileSync(cmd, args, {stdio: 'inherit'});
}

// Converter arguments shared by both runners. `outPath` and `buildDir` differ
// because the Docker runner sees the project mounted under /data.
function converterArgs(doc, buildDir, outPath) {
  const args = [
    '--build-dir', buildDir,
    '--output', outPath,
    '--base-url', BASE_URL,
    '--title', doc.title,
  ];
  if (doc.eyebrow) args.push('--eyebrow', doc.eyebrow);
  if (doc.subtitle) args.push('--subtitle', doc.subtitle);
  if (doc.tocTitle) args.push('--toc-title', doc.tocTitle);
  if (doc.source) args.push('--source', doc.source);
  if (doc.include?.length) args.push('--include', doc.include.join(','));
  if (doc.exclude?.length) args.push('--exclude', doc.exclude.join(','));
  return args;
}

if (!PDF_DOCS.length) {
  console.error('[pdfs] pdf.config.mjs has no entries — nothing to generate.');
  process.exit(1);
}

console.error(`[pdfs] ${PDF_DOCS.length} document(s), baseUrl "${BASE_URL}", ` +
  `runner: ${LOCAL ? 'local python' : 'docker'}`);

if (!LOCAL) {
  console.error('[pdfs] Building WeasyPrint image…');
  run('docker', ['build', '-f', 'docker/weasyprint/Dockerfile', '-t', IMAGE, '.']);
}

for (const doc of PDF_DOCS) {
  console.error(`[pdfs] → ${doc.id}.pdf  (${doc.label})`);
  if (LOCAL) {
    run('python3', [
      'docker/weasyprint/generate_pdf.py',
      ...converterArgs(doc, 'build', `build/${doc.id}.pdf`),
    ]);
  } else {
    const uid = process.getuid?.() ?? 0;
    const gid = process.getgid?.() ?? 0;
    run('docker', [
      'run', '--rm', '--user', `${uid}:${gid}`, '-v', `${process.cwd()}:/data`, IMAGE,
      ...converterArgs(doc, '/data/build', `/data/build/${doc.id}.pdf`),
    ]);
  }
}

console.error(`[pdfs] Done — wrote ${PDF_DOCS.map((d) => `${d.id}.pdf`).join(', ')}`);
