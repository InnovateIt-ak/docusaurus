import fs from 'node:fs';
import path from 'node:path';

type PdfMenuItem = {to: string; label: string};

// Pretty-print a menu label: turn separators into spaces and Title Case each
// word (first letter upper, the rest lower). Keeps the "📄 PDF" list tidy no
// matter how the label was derived — a lowercase slug ("analyse",
// "developer-guide") or a SHOUTING one ("API", "STANDARDS") both render as
// "Analyse", "Developer Guide", "Api", "Standards".
function humanizeLabel(label: string): string {
    return String(label)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(' ');
}

// Build the "📄 PDF" navbar dropdown from the filesystem so it mirrors the docs
// sidebar and the PDFs CI produces. Each top-level sidebar entry gets an item:
//   * a top-level doc file (e.g. intro.md) → its per-page PDF at /docs/<id>.pdf,
//   * a section folder (e.g. architecture/) → its section PDF at /<section>.pdf,
// followed by a "Full documentation" entry. Entries are labelled and ordered
// like the sidebar, and _* partials are skipped.
//
// Node/build-time only (uses fs) — do NOT import from client-side code.
export function pdfMenuItems(): PdfMenuItem[] {
    const docsDir = path.resolve('docs');
    const UNPOSITIONED = Number.MAX_SAFE_INTEGER;

    // Pull the few scalar keys we need from a doc's leading `---` frontmatter.
    const readFrontmatter = (file: string): Record<string, string> => {
        const block = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const out: Record<string, string> = {};
        for (const line of block ? block[1].split(/\r?\n/) : []) {
            const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
            if (kv) out[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
        }
        return out;
    };
    const firstHeading = (file: string): string | undefined =>
        fs.readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)?.[1].trim();

    // Docusaurus strips a leading number prefix ("06-standards" → "standards")
    // from the URL and uses the number as the sidebar position. We mirror both
    // so the PDF link matches the real route and the menu keeps the order.
    const parseNumberPrefix = (name: string): {value?: number; rest: string} => {
        const m = name.match(/^(\d+)(?:\s*[-_.]\s*|\s+)(.+)$/);
        return m ? {value: Number(m[1]), rest: m[2]} : {rest: name};
    };

    const hasDocPage = (dir: string): boolean =>
        fs.readdirSync(dir, {withFileTypes: true}).some((entry) => {
            if (entry.name.startsWith('_')) return false; // _* files/folders are partials
            return entry.isDirectory()
                ? hasDocPage(path.join(dir, entry.name))
                : /\.mdx?$/.test(entry.name);
        });

    const items: {to: string; label: string; position: number}[] = [];
    for (const entry of fs.readdirSync(docsDir, {withFileTypes: true})) {
        if (entry.name.startsWith('_')) continue;
        const full = path.join(docsDir, entry.name);

        if (entry.isDirectory()) {
            if (!hasDocPage(full)) continue; // e.g. docs/plantuml (only .puml, no page)
            // Section → /<slug>.pdf, slug = folder name with number prefix stripped.
            // Label/position from _category_.json, else slug + number prefix.
            const {value: prefixPos, rest: slug} = parseNumberPrefix(entry.name);
            let label = slug;
            let position = prefixPos ?? UNPOSITIONED;
            const catFile = path.join(full, '_category_.json');
            if (fs.existsSync(catFile)) {
                try {
                    const cat = JSON.parse(fs.readFileSync(catFile, 'utf8'));
                    if (typeof cat.label === 'string') label = cat.label;
                    if (typeof cat.position === 'number') position = cat.position;
                } catch {
                    /* Invalid _category_.json: keep the slug as the label. */
                }
            }
            items.push({to: `pathname:///${slug}.pdf`, label, position});
        } else if (/\.mdx?$/.test(entry.name)) {
            // Standalone top-level doc → its per-page PDF. Id and order honour a
            // number prefix ("01-intro.md" → /docs/intro.pdf, position 1). Label
            // like the sidebar: sidebar_label, else title, else first heading.
            const {value: prefixPos, rest: id} = parseNumberPrefix(entry.name.replace(/\.mdx?$/, ''));
            const fm = readFrontmatter(full);
            items.push({
                to: `pathname:///docs/${id}.pdf`,
                label: fm.sidebar_label || fm.title || firstHeading(full) || id,
                position: fm.sidebar_position ? Number(fm.sidebar_position) : prefixPos ?? UNPOSITIONED,
            });
        }
    }

    items.sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));

    // `pathname://` serves each link as-is (baseUrl-aware, no broken-link check):
    // the PDFs don't exist at build time, CI writes them afterwards.
    return [
        ...items.map(({to, label}) => ({to, label})),
        {to: 'pathname:///documentation.pdf', label: 'Full documentation'},
    ].map(({to, label}) => ({to, label: humanizeLabel(label)}));
}