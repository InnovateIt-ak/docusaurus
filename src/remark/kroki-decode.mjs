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

// Is this a Kroki URL at all? Anything matching is reported on when it cannot be
// converted — staying silent about those is what makes "it still goes to
// kroki.io" impossible to diagnose.
const KROKI_HOST = /^https?:\/\/[^/]*\bkroki\b[^/]*\//i;

// https://<host>/<diagram-type>/<output-format>/<encoded-source>, tolerating the
// trailing slash and the query string that editors and copy-paste add.
const KROKI_URL =
    /^https?:\/\/[^/]*\bkroki\b[^/]*\/([a-z0-9_-]+)\/[a-z0-9]+\/([A-Za-z0-9_-]+=*)\/?(?:[?#].*)?$/i;

/**
 * What to do with a URL: null when it is none of our business, `{lang, source}`
 * when it can be rendered here, `{skipped}` when it is a Kroki URL this plugin
 * had to leave alone — and why.
 */
function inspect(url) {
    if (typeof url !== 'string' || !KROKI_HOST.test(url)) {
        return null;
    }
    const match = url.match(KROKI_URL);
    if (!match) {
        return {skipped: 'the URL is not in Kroki\'s /<type>/<format>/<data> shape'};
    }
    const type = match[1].toLowerCase();
    const lang = RENDERABLE.get(type);
    if (!lang) {
        return {
            skipped:
                `"${type}" is not a diagram type this site renders ` +
                `(${[...RENDERABLE.keys()].join(', ')})`,
        };
    }
    let source;
    try {
        // base64url — Kroki's alphabet — then raw zlib.
        source = inflateSync(
            Buffer.from(match[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
        ).toString('utf8');
    } catch {
        return {skipped: 'the encoded payload could not be inflated'};
    }
    if (!source.trim()) {
        return {skipped: 'the encoded payload is empty'};
    }
    return {lang, source};
}

/** The diagram language and source behind a Kroki URL, or null if there is none. */
export function decodeKrokiUrl(url) {
    const result = inspect(url);
    return result && !result.skipped ? result : null;
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
    return (tree, file) => {
        const where = file?.path ?? '(unknown file)';
        let converted = 0;
        const skipped = [];

        const handle = (node, url) => {
            const result = inspect(url);
            if (!result) return;
            if (result.skipped) {
                skipped.push({url, reason: result.skipped});
                return;
            }
            toCodeBlock(node, result);
            converted += 1;
        };

        // `![alt](https://kroki.io/…)`
        visit(tree, 'image', (node) => handle(node, node.url));

        // `<img src="https://kroki.io/…" />` — what an editor actually writes.
        // MDX parses raw HTML into JSX elements, flow or text depending on
        // whether the tag sits on its own line. Note MDX requires the tag to be
        // self-closing: `<img …>` without the slash fails to compile at all.
        for (const type of ['mdxJsxFlowElement', 'mdxJsxTextElement']) {
            visit(tree, type, (node) => handle(node, jsxImageSrc(node)));
        }

        // The same tag as an untouched HTML string, for a CommonMark-formatted
        // site. Only a node that is nothing but the image is replaced — mixed
        // HTML is left alone rather than half-rewritten.
        visit(tree, 'html', (node) => {
            const value = node.value?.trim() ?? '';
            if (!/^<img\b[^>]*>$/i.test(value)) return;
            handle(node, value.match(HTML_IMG_SRC)?.[1]);
        });

        // Say what happened. A build that still reaches kroki.io is otherwise
        // indistinguishable from one where this plugin never ran at all, which
        // is exactly the question a reader of the build log needs answered.
        if (converted > 0) {
            console.log(
                `[kroki] ${where}: ${converted} diagram(s) decoded and rendered locally`,
            );
        }
        for (const {url, reason} of skipped) {
            console.warn(
                `[kroki] ${where}: left ${url.slice(0, 60)}… pointing at kroki — ${reason}`,
            );
        }
    };
}
