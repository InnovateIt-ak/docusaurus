// Remark plugin: turn a Kroki image URL back into the diagram it encodes.
//
// Markdown editors that preview diagrams often write the result as an image
// pointing at kroki.io:
//
//   <img src="https://kroki.io/mermaid/svg/eJzVlM9uwjAMxl8l..." />
//   ![diagram](https://kroki.io/plantuml/svg/eNpLy...)
//
// That leaves every reader of the built site fetching a third-party server for
// something this repository already renders itself. Behind a corporate proxy
// that fetch simply fails, and the page shows a broken image — which is how
// this was found, as an "Error 500: Internal Server Error" where a diagram
// should be.
//
// A Kroki URL is not a reference: the whole diagram is in the path, as
// base64url(deflate(source)). So the source can be recovered without asking
// anyone, and handed to the plugins that already render Mermaid and PlantUML at
// build time. The diagram then works offline, embeds in the PDF, and gets the
// same "Source" toggle as any other.
//
// Runs BEFORE remark-plantuml-inline and remark-mermaid-inline: it produces the
// fenced code blocks they consume.
import {visit} from 'unist-util-visit';
import {inflateSync} from 'node:zlib';

// Kroki names many diagram languages; these are the ones this site can render
// itself. Anything else is left alone rather than silently broken — a graphviz
// URL keeps working exactly as before.
const RENDERABLE = new Map([
    ['mermaid', 'mermaid'],
    ['plantuml', 'plantuml'],
    ['c4plantuml', 'plantuml'],
]);

// https://<host>/<diagram-type>/<output-format>/<encoded-source>
const KROKI_URL = /^https?:\/\/([^/]*kroki[^/]*)\/([a-z0-9_-]+)\/[a-z0-9]+\/([A-Za-z0-9_-]+=*)$/i;

/** The diagram language and source behind a Kroki URL, or null if it is not one. */
export function decodeKrokiUrl(url) {
    const match = typeof url === 'string' && url.match(KROKI_URL);
    if (!match) return null;
    const lang = RENDERABLE.get(match[2].toLowerCase());
    if (!lang) return null;
    try {
        // base64url — Kroki's alphabet — then raw zlib.
        const source = inflateSync(
            Buffer.from(match[3].replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
        ).toString('utf8');
        return source.trim() ? {lang, source} : null;
    } catch {
        // A truncated or hand-edited URL is not worth failing a build over: the
        // node is left as it was, and the reader sees the same image as before.
        return null;
    }
}

function toCodeBlock(node, {lang, source}) {
    for (const key of ['url', 'alt', 'title', 'children', 'name', 'attributes', 'data']) {
        delete node[key];
    }
    node.type = 'code';
    node.lang = lang;
    node.meta = null;
    node.value = source;
}

// `<img …>` inside an mdast `html` node — the shape raw HTML takes when a site
// is configured with `markdown.format: 'detect'` (CommonMark) rather than MDX.
const HTML_IMG_SRC = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/i;

/** `src` of an MDX `<img>` element, when it is a plain string attribute. */
function jsxImageSrc(node) {
    if (node.name !== 'img') return undefined;
    const src = node.attributes?.find(
        (attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'src',
    );
    return typeof src?.value === 'string' ? src.value : undefined;
}

export default function remarkKrokiDecode() {
    return (tree) => {
        // `![alt](https://kroki.io/…)`
        visit(tree, 'image', (node) => {
            const decoded = decodeKrokiUrl(node.url);
            if (decoded) toCodeBlock(node, decoded);
        });

        // `<img src="https://kroki.io/…" />` — what an editor actually writes.
        // MDX parses raw HTML into JSX elements, flow or text depending on
        // whether the tag sits on its own line. Note MDX requires the tag to be
        // self-closing: `<img …>` without the slash fails to compile at all.
        for (const type of ['mdxJsxFlowElement', 'mdxJsxTextElement']) {
            visit(tree, type, (node) => {
                const decoded = decodeKrokiUrl(jsxImageSrc(node));
                if (decoded) toCodeBlock(node, decoded);
            });
        }

        // The same tag as an untouched HTML string, for a CommonMark-formatted
        // site. Only a node that is nothing but the image is replaced — mixed
        // HTML is left alone rather than half-rewritten.
        visit(tree, 'html', (node) => {
            const value = node.value?.trim() ?? '';
            if (!/^<img\b[^>]*>$/i.test(value)) return;
            const decoded = decodeKrokiUrl(value.match(HTML_IMG_SRC)?.[1]);
            if (decoded) toCodeBlock(node, decoded);
        });
    };
}
