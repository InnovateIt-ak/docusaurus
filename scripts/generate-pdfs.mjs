// Auto-discover doc sections and produce one PDF per section, plus a global
// PDF that includes everything.
//
// Usage:
//   node scripts/generate-pdfs.mjs           generate every PDF
//   node scripts/generate-pdfs.mjs --list    print the discovered plan as JSON
//
// Discovery: a "section" is a top-level directory under docs/ (folders starting
// with "_" are Docusaurus partials and skipped, plus anything in
// PDF_OPTIONS.excludeSections). Only sections that actually produced routes in
// <SITE_DIR>/docs/<section>/ are kept, so empty folders never fail the build.
// Each section -> build/<section>.pdf (--include /docs/<section>/). The global
// PDF -> build/<globalId>.pdf (--include /docs/, i.e. all docs).
//
// Optional knobs come from sharedConfig.ts (PDF_OPTIONS); all have defaults.
//
// Runner:
//   * default — the Docker image docker/weasyprint/Dockerfile (matches CI).
//   * PDF_LOCAL=1 — call `python3 docker/weasyprint/generate_pdf.py` directly.
//
// Environment:
//   BASE_URL   the baseUrl the site was built with (default "/").
//   SITE_DIR   the built-site directory (default "build"); its docs/ subtree is
//              scanned for sections and served to the converter.

import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, join} from 'node:path';
import {readdirSync, existsSync, readFileSync} from 'node:fs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// Optional knobs from sharedConfig.ts (TypeScript) via jiti — defaults if absent.
let OPTS = {};
try {
  const jiti = require('jiti')(fileURLToPath(import.meta.url), {interopDefault: true});
  OPTS = jiti(resolve(ROOT, 'sharedConfig.ts')).PDF_OPTIONS ?? {};
} catch { /* no sharedConfig / PDF_OPTIONS -> defaults */ }

const TITLE_PREFIX = OPTS.titlePrefix ?? '';
const EYEBROW = OPTS.eyebrow ?? 'Documentation';
const TOC_TITLE = OPTS.tocTitle ?? 'Table of Contents';
const GLOBAL_ID = OPTS.globalId ?? 'documentation';
const GLOBAL_TITLE = OPTS.globalTitle ?? 'Full documentation';
const EXCLUDE = new Set(OPTS.excludeSections ?? []);

const BASE_URL = process.env.BASE_URL ?? '/';
const SITE_DIR = process.env.SITE_DIR ?? 'build';
const LOCAL = process.env.PDF_LOCAL === '1';
const IMAGE = 'docusaurus-weasyprint';
const DOCS_SRC = resolve(ROOT, 'docs');
const DOCS_BUILT = resolve(ROOT, SITE_DIR, 'docs');

function withPrefix(title) {
  return TITLE_PREFIX ? `${TITLE_PREFIX} — ${title}` : title;
}

// Humanise a folder name: drop a leading order prefix ("01-"), spaces + caps.
function humanize(name) {
  return name
    .replace(/^\d+[-_.]/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// Prefer the section's _category_.json label; fall back to the humanised name.
function sectionLabel(section) {
  const cat = join(DOCS_SRC, section, '_category_.json');
  if (existsSync(cat)) {
    try {
      const j = JSON.parse(readFileSync(cat, 'utf8'));
      if (j?.label) return j.label;
    } catch { /* malformed -> fall through */ }
  }
  return humanize(section);
}

// Discover section folders that produced built routes.
function discoverSections() {
  if (!existsSync(DOCS_SRC)) return [];
  return readdirSync(DOCS_SRC, {withFileTypes: true})
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !EXCLUDE.has(d.name))
    .map((d) => d.name)
    .filter((name) => existsSync(join(DOCS_BUILT, name)))
    .sort();
}

// The full plan: one entry per section, then the global all-in-one PDF.
function buildPlan() {
  const plan = discoverSections().map((section) => ({
    id: section,
    title: withPrefix(sectionLabel(section)),
    include: `/docs/${section}/`,
  }));
  plan.push({id: GLOBAL_ID, title: withPrefix(GLOBAL_TITLE), include: '/docs/'});
  return plan;
}

function run(cmd, args) {
  execFileSync(cmd, args, {stdio: 'inherit'});
}

function converterArgs(buildDir, outPath, spec) {
  const args = [
    '--build-dir', buildDir,
    '--output', outPath,
    '--base-url', BASE_URL,
    '--title', spec.title,
  ];
  if (EYEBROW) args.push('--eyebrow', EYEBROW);
  if (TOC_TITLE) args.push('--toc-title', TOC_TITLE);
  if (spec.include) args.push('--include', spec.include);
  return args;
}

function generate(spec) {
  console.error(`[pdfs] → ${spec.id}.pdf  (${spec.title})`);
  try {
    if (LOCAL) {
      run('python3', [
        'docker/weasyprint/generate_pdf.py',
        ...converterArgs(SITE_DIR, `${SITE_DIR}/${spec.id}.pdf`, spec),
      ]);
    } else {
      const uid = process.getuid?.() ?? 0;
      const gid = process.getgid?.() ?? 0;
      run('docker', [
        'run', '--rm', '--user', `${uid}:${gid}`, '-v', `${process.cwd()}:/data`, IMAGE,
        ...converterArgs(`/data/${SITE_DIR}`, `/data/${SITE_DIR}/${spec.id}.pdf`, spec),
      ]);
    }
  } catch (err) {
    // A section with no eligible content makes the converter exit non-zero;
    // warn and keep going instead of failing the whole run.
    console.error(`[pdfs] ! skipped ${spec.id}.pdf (${err.message})`);
  }
}

const plan = buildPlan();

if (process.argv.includes('--list')) {
  process.stdout.write(JSON.stringify(plan));
  process.exit(0);
}

if (!plan.length) {
  console.error('[pdfs] No sections discovered — nothing to generate.');
  process.exit(1);
}

console.error(`[pdfs] ${plan.length} PDF(s), baseUrl "${BASE_URL}", site "${SITE_DIR}", ` +
  `runner: ${LOCAL ? 'local python' : 'docker'}`);
console.error(`[pdfs] plan: ${plan.map((p) => `${p.id}.pdf`).join(', ')}`);

if (!LOCAL) {
  console.error('[pdfs] Building WeasyPrint image…');
  run('docker', ['build', '-f', 'docker/weasyprint/Dockerfile', '-t', IMAGE, '.']);
}

for (const spec of plan) generate(spec);

console.error('[pdfs] Done.');
