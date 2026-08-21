// Remark plugin: lift a rendered diagram out of the paragraph that wraps it.
//
// `![alt](diagram.puml)` on its own line is, in markdown, a paragraph whose only
// child is an image — so it becomes `<p><img></p>`. That is fine for a picture
// and fatal for anything else: a `<p>` is closed by the parser at its first
// block-level child, so a `<div>` or a `<pre>` inside it makes the server-
// rendered tree and the client tree disagree, and React throws the subtree away.
//
// That is what stopped the diagram "Source" toggle from being able to use
// @theme/CodeBlock. Lifting the image to block level removes the constraint
// rather than working around it.
//
// Only diagrams are touched — nodes the PlantUML/Mermaid plugins converted, which
// carry `data-diagram-source`. Ordinary images keep their paragraph, and so keep
// matching the `p > img` selectors the zoom plugin is configured with.
import {visit} from 'unist-util-visit';

const SOURCE_ATTR = 'data-diagram-source';
// Marks a diagram that is block-level, and so may render block content. The
// toggle is gated on it: a diagram sharing a paragraph with text stays an image.
const BLOCK_ATTR = 'data-diagram-block';

function isDiagram(node) {
    return (
        node?.type === 'image' &&
        node.data?.hProperties?.[SOURCE_ATTR] !== undefined
    );
}

function markAsBlock(node) {
    node.data.hProperties[BLOCK_ATTR] = '';
}

// Whitespace and soft line breaks are what separates several diagrams written on
// consecutive lines — markdown makes that a single paragraph. They carry nothing
// and are dropped when the paragraph is dissolved.
function isFiller(node) {
    return (
        node.type === 'break' ||
        (node.type === 'text' && node.value.trim() === '')
    );
}

export default function remarkUnwrapDiagrams() {
    return (tree) => {
        // A fenced ```plantuml block becomes an image directly under the root —
        // already block-level, so there is nothing to lift, only to mark.
        visit(tree, 'image', (node, index, parent) => {
            if (isDiagram(node) && parent && parent.type !== 'paragraph') {
                markAsBlock(node);
            }
        });

        // Collect first, mutate after: replacing nodes while the walk is in
        // progress would have the new ones visited again.
        const dissolve = [];

        visit(tree, 'paragraph', (node, index, parent) => {
            if (!parent || index === null) return;
            const diagrams = node.children.filter(isDiagram);
            // Every child has to be a diagram or filler. A diagram sharing its
            // paragraph with a sentence cannot be lifted without reflowing the
            // text around it, so that one stays a plain image — and, having no
            // `data-diagram-block`, is offered no source toggle.
            const onlyDiagrams =
                diagrams.length > 0 &&
                node.children.every((child) => isDiagram(child) || isFiller(child));
            if (!onlyDiagrams) return;
            dissolve.push({parent, node, diagrams});
        });

        for (const {parent, node, diagrams} of dissolve) {
            const at = parent.children.indexOf(node);
            if (at === -1) continue;
            diagrams.forEach(markAsBlock);
            parent.children.splice(at, 1, ...diagrams);
        }
    };
}
