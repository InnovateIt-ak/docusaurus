// Build-time API data model: turn an OpenAPI spec's `components.schemas` — or a
// JSON-LD document's context and nodes — into a Markdown doc page, so the data
// model is documented next to the Redoc pages and never drifts from the spec —
// the source file stays the single source of truth.
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

// Front matter and page heading, shared by both renderers.
function docHeader(specName, sidebarPosition) {
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
    return out.join('');
}

// ---------------------------------------------------------------------------
// OpenAPI
// ---------------------------------------------------------------------------

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

function renderOpenApi(spec, {title, sidebarPosition} = {}) {
    const info = spec.info ?? {};
    const schemas = spec.components?.schemas ?? {};
    const specName = title || info.title || 'OpenAPI';

    const out = [docHeader(specName, sidebarPosition)];
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

// ---------------------------------------------------------------------------
// JSON-LD
//
// A JSON-LD document holds no `components.schemas`: its data model lives in the
// `@context` — the terms it defines and the IRIs they map to — and in its node
// objects, each with an `@id`, a `@type` and its own properties. Both are
// rendered, so a vocabulary or a catalogue dropped next to the OpenAPI specs is
// documented the same way.
// ---------------------------------------------------------------------------

// Which `@context` keywords get a readable label; any other one is listed under
// its own name rather than dropped.
const CONTEXT_KEYWORD_LABELS = {
    '@vocab': 'Default vocabulary',
    '@base': 'Base IRI',
    '@language': 'Default language',
    '@version': 'JSON-LD version',
    '@protected': 'Protected terms',
    '@import': 'Imported context',
    '@propagate': 'Propagates to nested nodes',
};

// The properties a node may name itself and describe itself with, in the order
// they are tried. Plain terms first: a document that defines its own `name` is
// more likely to mean it than to carry a prefixed alias.
const LABEL_KEYS = ['name', 'title', 'label', 'rdfs:label', 'skos:prefLabel', 'dcterms:title', 'dc:title', 'schema:name'];
const DESCRIPTION_KEYS = ['description', 'comment', 'rdfs:comment', 'dcterms:description', 'dc:description', 'schema:description'];

// The first of `keys` the node actually carries, so the caller can both read the
// value and know which property it came from.
const pickKey = (object, keys) => keys.find((key) => object?.[key] != null);
const pick = (object, keys) => object?.[pickKey(object, keys)];

// A JSON-LD value carries text in several shapes: a plain string, a value object
// (`{"@value": …}`), or a list of either — one per language, usually. Take the
// first one that reads as text.
function plainText(value) {
    for (const item of [].concat(value ?? [])) {
        if (item == null) continue;
        if (typeof item === 'object') {
            if ('@value' in item) return String(item['@value']);
            continue;
        }
        return String(item);
    }
    return '';
}

// A `.jsonld` file always is one; a `.json` or `.yaml` file is one when it is
// shaped like a JSON-LD document, so a spec folder holding both formats needs no
// separate configuration.
function isJsonLd(doc, specPath) {
    if (path.extname(specPath).toLowerCase() === '.jsonld') return true;
    return Boolean(doc) && typeof doc === 'object' && !Array.isArray(doc)
        && ('@context' in doc || '@graph' in doc);
}

// `@context` is a term map, the IRI of a remote context, or an array mixing
// both. Flatten it into the terms it defines, the keywords it sets, and the
// remote contexts it pulls in.
function contextEntries(context) {
    const terms = [];
    const keywords = [];
    const remotes = [];
    for (const part of [].concat(context ?? [])) {
        if (typeof part === 'string') {
            remotes.push(part);
            continue;
        }
        if (!part || typeof part !== 'object') continue;
        for (const entry of Object.entries(part)) {
            (entry[0].startsWith('@') ? keywords : terms).push(entry);
        }
    }
    return {terms, keywords, remotes};
}

// One row of the context table. A term is either the IRI it expands to, or a
// definition object saying that plus how its values are read: `@type` coerces
// them (`@id` makes them references), `@container` says how they are indexed,
// `@language` tags them when no type is given, `@reverse` points the other way.
function termRow([term, definition]) {
    const def = definition && typeof definition === 'object' ? definition : {'@id': definition};
    const kinds = [];
    if (def['@reverse'] != null) kinds.push('reverse');
    if (def['@type'] != null) kinds.push(String(def['@type']));
    else if (def['@language'] != null) kinds.push(`language: ${def['@language']}`);

    return `| ${cell(term)} ` +
        `| ${cell(def['@id'] ?? def['@reverse'] ?? '')} ` +
        `| ${cell(kinds.join(', '))} ` +
        `| ${cell([].concat(def['@container'] ?? []).join(', '))} |\n`;
}

// Render a JSON-LD value for a table cell, and say what kind of value it is:
// a scalar, a typed or language-tagged value object, a reference to another
// node, an embedded node, or a list of any of those.
function jsonLdValue(value) {
    if (Array.isArray(value)) {
        const parts = value.map(jsonLdValue);
        return {
            text: parts.map((part) => part.text).join(', '),
            type: [...new Set(parts.map((part) => part.type).filter(Boolean))].join(' or '),
        };
    }
    if (value === null) return {text: 'null', type: 'null'};
    if (typeof value !== 'object') return {text: String(value), type: typeof value};

    if ('@value' in value) {
        const language = value['@language'] != null ? `@${value['@language']}` : '';
        return {
            text: String(value['@value']),
            type: String(value['@type'] ?? language ?? '') || typeof value['@value'],
        };
    }

    const keys = Object.keys(value).filter((key) => key !== '@context');
    if (keys.length === 1 && keys[0] === '@id') return {text: String(value['@id']), type: '@id'};
    // An embedded node: named by its `@id` when it has one, by what it holds
    // otherwise. It is summarised here rather than expanded into a section of
    // its own, so the page keeps the document's shape.
    return {
        text: value['@id'] != null ? String(value['@id']) : `{${keys.join(', ')}}`,
        type: 'object',
    };
}

// The node objects held by a graph — a top-level array or a `@graph`. Nested
// graphs are flattened in; a node's own `@context` is left out of its table,
// since the context is documented once at the top of the page.
function collectNodes(doc) {
    const nodes = [];
    const visit = (value) => {
        for (const item of [].concat(value ?? [])) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            const {'@context': _context, '@graph': graph, ...node} = item;
            if (Object.keys(node).length) nodes.push(node);
            if (graph) visit(graph);
        }
    };
    visit(doc);
    return nodes;
}

function nodeLabel(node, index) {
    return plainText(pick(node, LABEL_KEYS))
        || (node['@id'] != null ? String(node['@id']) : '')
        || `Node ${index + 1}`;
}

function renderJsonLd(doc, {title, sidebarPosition, fallbackTitle} = {}) {
    const root = doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
    const labelKey = pickKey(root, LABEL_KEYS);
    const descriptionKey = pickKey(root, DESCRIPTION_KEYS);
    const specName = title || plainText(root[labelKey]) || fallbackTitle || 'JSON-LD';

    const out = [docHeader(specName, sidebarPosition)];
    const description = plainText(root[descriptionKey]);
    if (description) out.push(`${cell(description)}\n\n`);

    // What the page header already says is not repeated in the document's own
    // section — but a name overridden by `title`, or a description that did not
    // render, still is: it would be nowhere else.
    const inHeader = new Set(['@context', '@graph']);
    if (!title && labelKey) inHeader.add(labelKey);
    if (description) inHeader.add(descriptionKey);
    const rootNode = Object.fromEntries(
        Object.entries(root).filter(([property]) => !inHeader.has(property)),
    );

    const {terms, keywords, remotes} = contextEntries(root['@context']);
    const nodes = [
        ...(Object.keys(rootNode).length ? [rootNode] : []),
        ...collectNodes(root['@graph'] ?? (Array.isArray(doc) ? doc : [])),
    ];

    if (!terms.length && !keywords.length && !remotes.length && !nodes.length) {
        out.push('_No `@context` and no node objects found in this JSON-LD document._\n');
        return out.join('');
    }

    if (terms.length || keywords.length || remotes.length) {
        out.push('## Context\n\n');
        for (const iri of remotes) out.push(`- Remote context: ${cell(iri)}\n`);
        for (const [keyword, value] of keywords) {
            out.push(`- ${cell(CONTEXT_KEYWORD_LABELS[keyword] ?? keyword)}: ${cell(jsonLdValue(value).text)}\n`);
        }
        if (remotes.length || keywords.length) out.push('\n');

        if (terms.length) {
            out.push('| Term | IRI | Type | Container |\n');
            out.push('|---|---|---|---|\n');
            for (const term of terms) out.push(termRow(term));
            out.push('\n');
        }
    }

    nodes.forEach((node, index) => {
        out.push(`## ${cell(nodeLabel(node, index))}\n\n`);
        const nodeDescription = plainText(pick(node, DESCRIPTION_KEYS));
        if (nodeDescription) out.push(`${cell(nodeDescription)}\n\n`);

        out.push('| Property | Value | Type |\n');
        out.push('|---|---|---|\n');
        for (const [property, value] of Object.entries(node)) {
            const {text, type} = jsonLdValue(value);
            // A keyword names its own kind of value (`@id` holds an IRI, `@type`
            // a class), so the type column would only repeat it.
            out.push(`| ${cell(property)} | ${cell(text)} | ${property.startsWith('@') ? '' : cell(type)} |\n`);
        }
        out.push('\n');
    });

    return out.join('');
}

// ---------------------------------------------------------------------------

// Which renderer a spec gets is decided by the document itself, so a folder may
// hold OpenAPI specs and JSON-LD documents side by side.
function renderMarkdown(doc, entry, specPath) {
    if (!isJsonLd(doc, specPath)) return renderOpenApi(doc, entry);
    const extension = path.extname(specPath);
    return renderJsonLd(doc, {...entry, fallbackTitle: path.basename(specPath, extension)});
}

const SPEC_EXTENSIONS = new Set(['.yaml', '.yml', '.json', '.jsonld']);

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
// api.yaml and api.jsonld in one folder do collide, and are reported as such.
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
        // JSON-LD is JSON by definition, so it is parsed as JSON — YAML would
        // wave through a syntax error that JSON.parse reports. Everything else
        // goes through YAML, which reads .json too, JSON being a subset of it.
        const parse = path.extname(specPath).toLowerCase() === '.jsonld' ? JSON.parse : YAML.parse;
        markdown = renderMarkdown(parse(fs.readFileSync(specPath, 'utf8')), entry, specPath);
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
