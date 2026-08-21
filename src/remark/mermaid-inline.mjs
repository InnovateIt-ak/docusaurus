// Remark plugin: Mermaid rendered at build time.
//
// Two syntaxes are supported in any .md / .mdx:
//
//   1. A ```mermaid … ``` code fence
//   2. An image link to a .mmd / .mermaid file:
//        ![alt](path/to/diagram.mmd)
//
// The diagram is rendered to SVG at build time by `@mermaid-js/mermaid-cli`,
// which drives a headless Chromium. The SVG is then inlined as a data-URL image
// — so the final HTML depends on no service, and the WeasyPrint PDF (which runs
// no JavaScript) embeds it as it is, exactly like the PlantUML plugin.
//
// Rendering happens in a child process (see mermaid-renderer.mjs): the
// Docusaurus config is loaded through jiti, which rewrites `import.meta.url` and
// stops mermaid-cli from locating its own bundle in this process. The child runs
// under a plain Node, where rendering works. One Chromium is started for the
// whole build.
//
// Choosing the browser: Puppeteer uses its own Chromium by default. To reuse a
// binary that is already present (CI, sandbox), set PUPPETEER_EXECUTABLE_PATH —
// the child process inherits it.
import {visit} from 'unist-util-visit';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {dirname, isAbsolute, resolve} from 'node:path';

// When rendering fails (no Chromium available, invalid Mermaid syntax, …) the
// whole build is not broken: the node becomes a visible code block that keeps
// the source and explains the problem. MERMAID_STRICT=1 fails the build
// instead.
const STRICT = process.env.MERMAID_STRICT === '1';

// --- Driving the renderer child process ------------------------------------
// jiti (which loads this file) may rewrite `import.meta.url`, so the child
// script is resolved from the project root instead — stable for a Docusaurus
// build.
const RENDERER_PATH = resolve(process.cwd(), 'src/remark/mermaid-renderer.mjs');

let child = null;
let nextId = 0;
const pending = new Map();

// Keeps the child's stdout pipe referenced for as long as a diagram is waiting
// on an answer (otherwise the event loop can drain before the SVG arrives →
// exit 13), and releases it once idle so it cannot hold up the end of the
// build.
function syncStdoutRef() {
    if (!child) return;
    if (pending.size > 0) child.stdout.ref();
    else child.stdout.unref();
}

function ensureChild() {
    if (child) return child;
    child = spawn(process.execPath, [RENDERER_PATH], {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: process.env,
    });
    // Do not keep the parent's event loop alive because of the child: without
    // this, `npm run build` hangs after the files have been generated. When the
    // parent exits, the child gets EOF on stdin, closes Chromium and stops (see
    // mermaid-renderer.mjs).
    //
    // CAREFUL: stdout is unreferenced ONLY while no diagram is outstanding (see
    // syncStdoutRef). Unreferencing it permanently would drain the event loop
    // while a render is in flight — no referenced handle left, the child's reply
    // never arrives, and Node exits on "unsettled top-level await" (code 13). So
    // it is referenced again as soon as a request goes out, and released only
    // once every reply is in.
    child.unref();
    child.stdout.unref();
    createInterface({input: child.stdout}).on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let message;
        try {
            message = JSON.parse(trimmed);
        } catch {
            return;
        }
        const resolver = pending.get(message.id);
        if (!resolver) return;
        pending.delete(message.id);
        syncStdoutRef(); // idle → release the event loop; otherwise hold it
        if (message.ok) resolver.resolve(message.svg);
        else resolver.reject(new Error(message.error || 'unknown mermaid render error'));
    });
    const failAll = (err) => {
        for (const {reject} of pending.values()) reject(err);
        pending.clear();
        child = null;
    };
    child.on('error', (err) => failAll(err));
    child.on('exit', (code) => {
        if (pending.size) {
            failAll(new Error(`mermaid renderer exited (code ${code}) with pending diagrams`));
        }
    });
    // Close the child cleanly at the end of the build.
    process.once('exit', () => {
        try {
            child?.stdin.end();
        } catch {
            /* already closed */
        }
    });
    return child;
}

function renderSvgViaChild(source) {
    const proc = ensureChild();
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, {resolve, reject});
        syncStdoutRef(); // render in flight: hold the event loop until the reply
        proc.stdin.write(JSON.stringify({id, source}) + '\n');
    });
}

// --- SVG normalisation -------------------------------------------------------
// Gives the root <svg> intrinsic pixel dimensions. Mermaid emits `width="100%"`
// plus a viewBox whose offsets are sometimes negative (e.g. "-50 -10 450 259")
// and a `max-width` in the style attribute: without an explicit width and
// height, a data-URL <img> has no intrinsic size, and the PDF generator's
// "wide image => landscape" heuristic (which reads width/height, falling back to
// a viewBox limited to positive offsets) has nothing to measure. So the SVG is
// brought in line with the PlantUML diagrams: width/height in px, no
// max-width.
function normalizeSvg(svg) {
    const viewBox = svg.match(
        /viewBox="\s*-?[\d.]+\s+-?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/
    );
    if (!viewBox) return svg;
    const width = Math.round(parseFloat(viewBox[1]));
    const height = Math.round(parseFloat(viewBox[2]));

    return svg.replace(/<svg\b[^>]*>/, (openTag) => {
        let tag = openTag;
        tag = tag.replace(/max-width:\s*[\d.]+px;?\s*/g, '');
        if (/\bwidth="[^"]*"/.test(tag)) {
            tag = tag.replace(/\bwidth="[^"]*"/, `width="${width}"`);
        } else {
            tag = tag.replace(/<svg\b/, `<svg width="${width}"`);
        }
        if (/\bheight="[^"]*"/.test(tag)) {
            tag = tag.replace(/\bheight="[^"]*"/, `height="${height}"`);
        } else {
            tag = tag.replace(/<svg\b/, `<svg height="${height}"`);
        }
        return tag;
    });
}

async function toDataUrlImage(node, source) {
    const svg = normalizeSvg(await renderSvgViaChild(source));
    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    node.type = 'image';
    node.url = `data:image/svg+xml;base64,${base64}`;
    node.alt = node.alt || 'Mermaid diagram';
    node.title = null;
    // Carry the source through to the browser so the rendered diagram can be
    // flipped back to its code. `data.hProperties` is merged into the element by
    // mdast-to-hast, so these arrive as props on the MDX <img> component.
    node.data = {
        ...node.data,
        hProperties: {
            ...node.data?.hProperties,
            'data-diagram-source': source,
            'data-diagram-lang': 'mermaid',
        },
    };
    delete node.lang;
    delete node.meta;
    delete node.value;
    delete node.children;
}

function degradeToPlaceholder(node, source, err) {
    delete node.url;
    delete node.alt;
    delete node.title;
    delete node.children;
    delete node.meta;
    node.type = 'code';
    node.lang = 'text';
    node.value =
        `⚠ Mermaid diagram not rendered: ${err.message}\n` +
        `Ensure a Chromium is available to Puppeteer (or set PUPPETEER_EXECUTABLE_PATH) and rebuild.\n` +
        (source ? `\n${source}` : '');
}

export default function remarkMermaidInline() {
    return async (tree, file) => {
        const mdxFilePath =
            file.path ?? file.history?.[file.history.length - 1] ?? process.cwd();
        const mdxDir = dirname(mdxFilePath);
        const tasks = [];

        const render = (node, getSource) => {
            tasks.push((async () => {
                let source;
                try {
                    source = await getSource();
                    await toDataUrlImage(node, source);
                } catch (err) {
                    if (STRICT) throw err;
                    console.warn(`[mermaid] ${mdxFilePath}: ${err.message}`);
                    degradeToPlaceholder(node, source, err);
                }
            })());
        };

        // Pattern 1: fenced code block ```mermaid ... ```
        visit(tree, 'code', (node) => {
            if (node.lang !== 'mermaid') return;
            render(node, async () => node.value);
        });

        // Pattern 2: image link ![alt](path/to/file.mmd)
        visit(tree, 'image', (node) => {
            if (!node.url || !/\.(mmd|mermaid)$/i.test(node.url)) return;
            if (node.url.startsWith('data:')) return;
            render(node, async () => {
                const filePath = isAbsolute(node.url)
                    ? node.url
                    : resolve(mdxDir, node.url);
                return await readFile(filePath, 'utf8');
            });
        });

        await Promise.all(tasks);
    };
}