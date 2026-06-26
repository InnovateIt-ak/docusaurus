// Plugin remark : rendu PlantUML à la compilation.
//
// Deux syntaxes sont prises en charge dans n'importe quel .md / .mdx :
//
//   1. Un bloc de code ```plantuml … ```
//   2. Un lien image vers un fichier .puml / .plantuml :
//        ![alt](chemin/vers/diagramme.puml)
//
// Le diagramme est envoyé à un serveur PlantUML (PLANTUML_BUILD_URL, par défaut
// http://localhost:8080), rendu en SVG, puis inséré en image data-URL — donc le
// HTML final ne dépend plus du serveur, et le PDF WeasyPrint l'embarque tel quel.
//
// Les directives `!include` locales sont résolues avant l'envoi ; la stdlib
// PlantUML (<C4/...>) et les URLs distantes sont laissées au serveur.
import {visit} from 'unist-util-visit';
import plantumlEncoder from 'plantuml-encoder';
import {readFile} from 'node:fs/promises';
import {dirname, isAbsolute, resolve} from 'node:path';

const PLANTUML_BUILD_URL =
    process.env.PLANTUML_BUILD_URL ?? 'http://localhost:8080';

const MAX_INCLUDE_DEPTH = 10;

async function resolveIncludes(source, baseDir, depth = 0) {
    if (depth > MAX_INCLUDE_DEPTH) {
        throw new Error(`PlantUML !include recursion exceeded ${MAX_INCLUDE_DEPTH} levels`);
    }
    const lines = source.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
        const m = line.match(/^\s*!include(?:url|sub)?\s+(.+?)\s*$/i);
        if (!m) {
            out.push(line);
            continue;
        }
        const target = m[1].trim().replace(/^["']|["']$/g, '');
        // Pass through PlantUML stdlib (e.g. <C4/C4_Container>) and remote URLs — handled by the server
        if ((target.startsWith('<') && target.endsWith('>')) ||
            target.startsWith('http://') ||
            target.startsWith('https://')) {
            out.push(line);
            continue;
        }
        const filePath = isAbsolute(target) ? target : resolve(baseDir, target);
        const content = await readFile(filePath, 'utf8');
        const resolved = await resolveIncludes(content, dirname(filePath), depth + 1);
        out.push(resolved);
    }
    return out.join('\n');
}

async function fetchSvg(source) {
    const encoded = plantumlEncoder.encode(source);
    const response = await fetch(`${PLANTUML_BUILD_URL}/svg/${encoded}`);
    if (!response.ok) {
        throw new Error(
            `PlantUML server returned ${response.status} for diagram starting with: ${source.slice(0, 80)}`
        );
    }
    return await response.text();
}

async function toDataUrlImage(node, source, baseDir) {
    const resolved = await resolveIncludes(source, baseDir);
    const svg = await fetchSvg(resolved);
    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    node.type = 'image';
    node.url = `data:image/svg+xml;base64,${base64}`;
    node.alt = node.alt || 'PlantUML diagram';
    node.title = null;
    delete node.lang;
    delete node.meta;
    delete node.value;
    delete node.children;
}

// When the PlantUML server cannot be reached (e.g. `npm run build` without the
// server running), don't fail the whole build: replace the node with a visible
// code block that keeps the diagram source and explains what happened. Set
// PLANTUML_STRICT=1 to make a render failure abort the build instead.
const STRICT = process.env.PLANTUML_STRICT === '1';

function degradeToPlaceholder(node, source, err) {
    delete node.url;
    delete node.alt;
    delete node.title;
    delete node.children;
    delete node.meta;
    node.type = 'code';
    node.lang = 'text';
    node.value =
        `⚠ PlantUML diagram not rendered: ${err.message}\n` +
        `Set PLANTUML_BUILD_URL to a reachable PlantUML server and rebuild.\n` +
        (source ? `\n${source}` : '');
}

export default function remarkPlantUMLInline() {
    return async (tree, file) => {
        const mdxFilePath = file.path ?? file.history?.[file.history.length - 1] ?? process.cwd();
        const mdxDir = dirname(mdxFilePath);
        const tasks = [];

        // Render a node, degrading to a placeholder (instead of throwing) when
        // the server is unreachable, unless PLANTUML_STRICT is set.
        const render = (node, getSource) => {
            tasks.push((async () => {
                let source;
                try {
                    const {src, dir} = await getSource();
                    source = src;
                    await toDataUrlImage(node, src, dir);
                } catch (err) {
                    if (STRICT) throw err;
                    console.warn(`[plantuml] ${mdxFilePath}: ${err.message}`);
                    degradeToPlaceholder(node, source, err);
                }
            })());
        };

        // Pattern 1: fenced code block ```plantuml ... ```
        visit(tree, 'code', (node) => {
            if (node.lang !== 'plantuml') return;
            render(node, async () => ({src: node.value, dir: mdxDir}));
        });

        // Pattern 2: image link ![alt](path/to/file.puml)
        visit(tree, 'image', (node) => {
            if (!node.url || !/\.(puml|plantuml)$/i.test(node.url)) return;
            // Skip data URLs already processed
            if (node.url.startsWith('data:')) return;
            render(node, async () => {
                const filePath = isAbsolute(node.url) ? node.url : resolve(mdxDir, node.url);
                return {src: await readFile(filePath, 'utf8'), dir: dirname(filePath)};
            });
        });

        await Promise.all(tasks);
    };
}
