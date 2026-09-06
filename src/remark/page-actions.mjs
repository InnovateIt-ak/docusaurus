// Remark plugin: the page actions, under the title and its subtitle.
//
// The design (key-screens/DocPage.dc.html) puts the row of page actions —
// "Ask about this section", "Copy for LLM", "Download as PDF", "View as
// Markdown" — under the title *and* the paragraph that introduces the page,
// as a bar ruled above and below. The title may be rendered outside the
// markdown (src/theme/DocItem/Content, from the front matter) but the subtitle
// is always content, so the only place that can put the bar after it is the
// markdown tree itself. This plugin inserts a `<PageActions />` element there;
// src/theme/MDXComponents resolves the name to src/components/PageActions.
//
// Where "there" is: after the opening h1 if the page writes one (by now
// wrapped in the <header> Docusaurus gives a content title), then after
// the first paragraph (or the `:::lead` block of a section overview, and the
// `:::actions` that may follow it — the calls to action belong with the
// pitch). A page that opens with anything else — a heading, a code block, an
// admonition — gets the bar right at the top, under the title.
//
// Runs in `remarkPlugins`, after src/remark/overview-blocks.mjs, so that the
// lead is already an `Overview.Lead` node rather than a `:::lead` directive.
const NAME = 'PageActions';

function isJsx(node, name) {
    return node?.type === 'mdxJsxFlowElement' && node.name === name;
}

/** A paragraph with words in it — not one that only holds an image. */
function isTextParagraph(node) {
    return (
        node?.type === 'paragraph' &&
        (node.children ?? []).some((child) => child.type !== 'image' && child.type !== 'imageReference')
    );
}

/** Nodes that are not content: front matter, imports and exports. */
function isMeta(node) {
    return node.type === 'yaml' || node.type === 'toml' || node.type === 'mdxjsEsm';
}

/** The title: an h1, or the `<header>` Docusaurus wraps the content title in. */
function isTitle(node) {
    return (
        (node?.type === 'heading' && node.depth === 1) ||
        (isJsx(node, 'header') && node.children?.some((child) => child.type === 'heading' && child.depth === 1))
    );
}

/** The index at which the bar goes: after the title and the subtitle. */
function insertionIndex(children) {
    let i = 0;
    const skipMeta = () => {
        while (i < children.length && isMeta(children[i])) i++;
    };
    skipMeta();
    if (isTitle(children[i])) i++;
    skipMeta();
    if (isTextParagraph(children[i]) || isJsx(children[i], 'Overview.Lead')) {
        i++;
        skipMeta();
        if (isJsx(children[i], 'Overview.Actions')) i++;
    }
    return i;
}

export default function remarkPageActions() {
    return (tree) => {
        if (!Array.isArray(tree.children)) return;
        if (tree.children.some((node) => isJsx(node, NAME))) return;
        tree.children.splice(insertionIndex(tree.children), 0, {
            type: 'mdxJsxFlowElement',
            name: NAME,
            attributes: [],
            children: [],
        });
    };
}
