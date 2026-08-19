// Remark plugin: keeps the page's markdown source reachable from the client.
//
// "Copy as Markdown" needs the text the author wrote, not the rendered DOM —
// where diagrams have become data-URL <img>s and tables have become <table>s.
// Rebuilding markdown from that would produce a poor copy of the original when
// the original is right there, on the vfile.
//
// `String(file)` is the file's raw contents: remark plugins modify the tree,
// never `file.value`. Where this plugin sits in the chain therefore makes no
// difference — it is placed first so that is explicit.
//
// The source travels in a <RawSource value="…" /> JSX element appended to the
// tree; the matching component (src/components/RawSource) puts it in the DOM on
// a hidden node, where the button reads it back on click.

// Front matter is site machinery (sidebar_position, id, …) rather than content:
// copying it would only clutter the clipboard.
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export default function remarkRawSource() {
    return (tree, file) => {
        const raw = String(file).replace(FRONT_MATTER, '').trim();
        if (!raw) return;

        tree.children.push({
            type: 'mdxJsxFlowElement',
            name: 'RawSource',
            attributes: [{type: 'mdxJsxAttribute', name: 'value', value: raw}],
            children: [],
        });
    };
}
