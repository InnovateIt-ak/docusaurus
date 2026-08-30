// Build-time API data model: turn an OpenAPI spec's `components.schemas` into a
// Markdown doc page, so the data model is documented next to the Redoc pages and
// never drifts from the spec — the YAML stays the single source of truth.
//
// Specs are named one by one via `specs`, and/or discovered from a folder via
// `discover` — dropping a new spec in that folder is then enough to get a page,
// with no config change.
//
// The page is written into docs/ (it is generated, so .gitignore'd) at two
// moments:
//   * when the plugin is created — i.e. while the config is being loaded, before
//     the docs plugin scans docs/, so the page exists on the very first build;
//   * in loadContent(), which `getPathsToWatch()` re-triggers on every spec edit,
//     so `docusaurus start` regenerates the page live.
//
// Writes are skipped when the output is already up to date, otherwise rewriting
// an identical file would retrigger the docs plugin's watcher on every rebuild.

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

// Escape a spec value for a Markdown table cell. Docusaurus 3 compiles `.md`
// through MDX, where `{`/`}` are expression delimiters and `<` opens a tag, so
// unescaped spec text would fail the build. `|` would end the cell.
function cell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br />');
}

const refName = (ref) => String(ref).split('/').pop();

// Render a property's type, following $ref and the composition keywords.
function fieldType(prop) {
  if (!prop || typeof prop !== 'object') return '';
  if (prop.$ref) return refName(prop.$ref);

  for (const [keyword, separator] of [['allOf', ' + '], ['oneOf', ' or '], ['anyOf', ' or ']]) {
    if (Array.isArray(prop[keyword])) {
      const parts = prop[keyword].map(fieldType).filter(Boolean);
      return parts.length ? parts.join(separator) : keyword;
    }
  }

  if (prop.type === 'array') return `array of ${fieldType(prop.items) || 'any'}`;

  const base = Array.isArray(prop.type)
    ? prop.type.filter((t) => t !== 'null').join(' or ')
    : prop.type;
  if (base && prop.format) return `${base} (${prop.format})`;
  return base || (prop.properties ? 'object' : '');
}

// OpenAPI 3.0 says `nullable: true`; 3.1 says `type: [..., "null"]`.
const isNullable = (prop) =>
  Boolean(prop.nullable) || (Array.isArray(prop.type) && prop.type.includes('null'));

function renderMarkdown(spec, {title, sidebarPosition} = {}) {
  const info = spec.info ?? {};
  const schemas = spec.components?.schemas ?? {};
  const specName = title || info.title || 'OpenAPI';
  // The page says what it holds; the sidebar entry stays the spec's own name,
  // since the category it sits in already reads "Data model".
  const docTitle = `${specName} data model`;

  const out = [
    '---\n',
    `title: ${JSON.stringify(docTitle)}\n`,
    `sidebar_label: ${JSON.stringify(specName)}\n`,
  ];
  if (sidebarPosition != null) out.push(`sidebar_position: ${sidebarPosition}\n`);
  out.push('---\n\n');
  out.push(`# ${cell(docTitle)}\n\n`);
  if (info.description) out.push(`${cell(info.description)}\n\n`);

  const names = Object.keys(schemas);
  if (!names.length) {
    out.push('_No `components.schemas` found in this specification._\n');
    return out.join('');
  }

  for (const name of names) {
    const schema = schemas[name] ?? {};
    const required = new Set(schema.required ?? []);
    const props = schema.properties ?? {};

    out.push(`## ${cell(name)}\n\n`);
    if (schema.description) out.push(`${cell(schema.description)}\n\n`);

    const fields = Object.keys(props);
    if (!fields.length) {
      out.push(`_No properties declared (type: ${cell(schema.type ?? 'unknown')})._\n\n`);
      continue;
    }

    out.push('| Field | Type | Required | Nullable | Enum | Source | Description |\n');
    out.push('|---|---|---|---|---|---|---|\n');
    for (const field of fields) {
      const prop = props[field] ?? {};
      const enumValues = Array.isArray(prop.enum) ? prop.enum.join(', ') : '';
      out.push(
        `| ${cell(field)} ` +
        `| ${cell(fieldType(prop))} ` +
        `| ${required.has(field) ? 'Yes' : 'No'} ` +
        `| ${isNullable(prop) ? 'Yes' : 'No'} ` +
        `| ${cell(enumValues)} ` +
        `| ${cell(prop['x-source'] ?? '')} ` +
        `| ${cell(prop.description ?? '')} |\n`,
      );
    }
    out.push('\n');
  }

  return out.join('');
}

const SPEC_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

// Expand a {dir, outDir} rule into one entry per spec file found in `dir`.
// The output page keeps the spec's file name (api.yaml -> api.md) and its title
// comes from the spec's own info.title, so several specs never collide.
function discoverEntries(siteDir, rule) {
  const dir = path.resolve(siteDir, rule.dir);
  const outDir = rule.outDir ?? rule.dir;

  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (error) {
    console.warn(`[openapi-schema-doc] cannot read ${rule.dir}: ${error.message}`);
    return [];
  }

  return files
    .filter((file) => SPEC_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort()
    .map((file) => ({
      ...rule,
      spec: path.join(rule.dir, file),
      out: path.join(outDir, `${path.basename(file, path.extname(file))}.md`),
    }));
}

// Two entries writing the same page would overwrite each other on every pass,
// and each rewrite retriggers the docs watcher — a rebuild loop in dev. Drop the
// duplicates loudly instead. Same spec, same page is not a collision though —
// only a repeated rule — so it is deduplicated silently, and the warning keeps
// meaning what it says: two different specs are fighting over one page.
function dropDuplicateOutputs(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const key = path.normalize(entry.out);
    const previous = seen.get(key);
    if (previous) {
      if (path.normalize(previous.spec) !== path.normalize(entry.spec)) {
        console.warn(
          `[openapi-schema-doc] ${entry.spec} would overwrite ${entry.out} ` +
          `(already written from ${previous.spec}) — skipped`,
        );
      }
      continue;
    }
    seen.set(key, entry);
  }
  return [...seen.values()];
}

// Generate one entry; returns true when the file was (re)written. Failures are
// non-fatal: a malformed spec logs a warning and leaves the previous page in
// place rather than breaking the whole site build.
function generate(siteDir, entry) {
  const specPath = path.resolve(siteDir, entry.spec);
  const outPath = path.resolve(siteDir, entry.out);

  let markdown;
  try {
    markdown = renderMarkdown(YAML.parse(fs.readFileSync(specPath, 'utf8')), entry);
  } catch (error) {
    console.warn(`[openapi-schema-doc] skipped ${entry.spec}: ${error.message}`);
    return false;
  }

  let current = null;
  try {
    current = fs.readFileSync(outPath, 'utf8');
  } catch {
    // No previous output — first run, or it was cleaned.
  }
  if (current === markdown) return false;

  fs.mkdirSync(path.dirname(outPath), {recursive: true});
  fs.writeFileSync(outPath, markdown, 'utf8');
  return true;
}

/**
 * @param {import('@docusaurus/types').LoadContext} context
 * @param {{
 *   specs?: Array<{spec: string, out: string, title?: string, sidebarPosition?: number}>,
 *   discover?: Array<{dir: string, outDir?: string, sidebarPosition?: number}>,
 * }} options
 */
module.exports = function openapiSchemaDocPlugin(context, options = {}) {
  const {siteDir} = context;
  const rules = (options.discover ?? []).filter((rule) => rule?.dir);
  const listed = (options.specs ?? []).filter((entry) => entry?.spec && entry?.out);

  // Only the listed specs are fixed; the discovered ones are re-read on every
  // pass, never carried over from the previous one. Merging a previous pass'
  // entries with a fresh discovery would have every discovered spec collide
  // with itself, and a spec deleted from a watched folder would stay in the
  // list forever.
  const collectEntries = () =>
    dropDuplicateOutputs([
      ...listed,
      ...rules.flatMap((rule) => discoverEntries(siteDir, rule)),
    ]);

  // Runs while the config loads, before the docs plugin scans docs/.
  let entries = collectEntries();
  for (const entry of entries) generate(siteDir, entry);

  return {
    name: 'docusaurus-plugin-openapi-schema-doc',

    getPathsToWatch() {
      // The discovered folders are watched too, so adding or removing a spec is
      // picked up in dev — not just edits to the specs already found.
      return [
        ...entries.map((entry) => path.resolve(siteDir, entry.spec)),
        ...rules.map((rule) => path.resolve(siteDir, rule.dir)),
      ];
    },

    // Re-runs whenever a watched spec changes: rewriting the page makes the docs
    // plugin pick it up, so the dev server shows the new data model.
    async loadContent() {
      // Re-discover: a spec added to a watched folder since the last pass must
      // get its page without restarting the dev server, and one removed from it
      // must stop being regenerated.
      entries = collectEntries();
      for (const entry of entries) {
        if (generate(siteDir, entry)) {
          console.log(`[openapi-schema-doc] regenerated ${entry.out}`);
        }
      }
    },
  };
};
