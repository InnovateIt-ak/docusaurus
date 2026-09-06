// Remark plugin: the section-overview blocks, written as markdown.
//
// The blocks in src/components/Overview are React components, and a page that
// used them directly had to be MDX with JSX in it. This plugin gives each of
// them a markdown form — a `:::name` container, the directive syntax
// Docusaurus already uses for admonitions — and turns it into the component
// at build time, so the page is a plain .md file and what "Copy for LLM"
// hands over is markdown that reads on its own. docs/delegations/overview.md
// is the reference page. The forms:
//
//   :::lead                       the pitch under the title
//   one paragraph
//   :::
//
//   :::actions                    calls to action; the first is the filled one
//   - [Démarrage rapide](/docs/x)
//   - [Référence API](/docs/y)
//   :::
//
//   :::figure[Product screenshot]{note="2400×1200" ratio="2 / 1"}
//   :::                           a placeholder; put an image or a diagram
//                                 fence inside instead to show one
//
//   :::cards                      one card per paragraph; the bold lead is
//   **Créer et structurer**       the title, the rest the body
//   Déclarez une délégation…
//   :::
//
//   :::steps                      the numbered steps; a diagram fence or an
//   1. **Créer la délégation**    image after the list is shown beside them
//      Un identifiant stable…
//   ```mermaid
//   …
//   ```
//   :::
//
//   :::option[Console]{badge="Sans code" highlight}
//   Pour les équipes métier…      a way in: a paragraph, a list (drawn as a
//   - Journal d'audit intégré     checklist) and a closing link, which is
//   [Ouvrir la console](/docs/x)  the card's call to action. Consecutive
//   :::                           options are laid out side by side.
//
//   :::links                      where to go next: a link per item, with
//   - [Mandats](/docs/z) — Création, prolongation, révocation
//   :::
//
// Sections come for free: an h2 followed by any of these blocks is wrapped,
// with everything up to the next h2, in the section frame that parts one
// from the next with a rule. Headings stay markdown, so they keep their ids
// and their place in the table of contents.
//
// Runs after Docusaurus's own plugins (`remarkPlugins`): by then the images
// and links inside a block have been resolved like any other, and the
// directives this plugin does not know are still reported as unused.
import {visit} from 'unist-util-visit';

const NS = 'Overview';
const HANDLED = new Set(['lead', 'actions', 'figure', 'cards', 'steps', 'option', 'links']);

// ---- mdast helpers --------------------------------------------------------

function attribute(name, value) {
    return {
        type: 'mdxJsxAttribute',
        name,
        // `true` is a bare attribute (`highlight`), anything else a string.
        value: value === true ? null : String(value),
    };
}

/** A `<Overview.Name attrs>children</Overview.Name>` node. */
function block(name, attrs = {}, children = []) {
    return {
        type: 'mdxJsxFlowElement',
        name: `${NS}.${name}`,
        attributes: Object.entries(attrs)
            .filter(([, value]) => value !== undefined && value !== false && value !== '')
            .map(([key, value]) => attribute(key, value)),
        children,
    };
}

function isBlock(node, name) {
    return (
        node?.type === 'mdxJsxFlowElement' &&
        (name ? node.name === `${NS}.${name}` : String(node.name).startsWith(`${NS}.`))
    );
}

/** The plain text of a node, for a title. */
function textOf(node) {
    if (!node) return '';
    if (node.type === 'text' || node.type === 'inlineCode') return node.value;
    return (node.children ?? []).map(textOf).join('');
}

/**
 * Inline nodes with the leading filler removed: the line break after a bold
 * title, and the " — " (or " - ", or ":") that parts a link from its
 * description.
 */
function trimLeading(nodes) {
    const out = [...nodes];
    while (out.length && (out[0].type === 'break' || (out[0].type === 'text' && !out[0].value.trim()))) {
        out.shift();
    }
    if (out.length && out[0].type === 'text') {
        out[0] = {...out[0], value: out[0].value.replace(/^[\s—–:-]+/, '')};
    }
    return out;
}

/** A paragraph that opens with a bold title: the title, and what follows it. */
function titled(paragraph) {
    if (paragraph?.type !== 'paragraph') return null;
    const [first, ...rest] = paragraph.children;
    if (first?.type !== 'strong') return null;
    return {title: textOf(first), rest: trimLeading(rest)};
}

/** A paragraph that is a single link. */
function soleLink(paragraph) {
    if (paragraph?.type !== 'paragraph') return null;
    const inline = paragraph.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
    return inline.length === 1 && inline[0].type === 'link' ? inline[0] : null;
}

/** The directive's own label (`:::name[label]`) and the children after it. */
function labelled(directive) {
    const [first, ...rest] = directive.children;
    if (first?.data?.directiveLabel) {
        return {label: textOf(first), children: rest};
    }
    return {label: undefined, children: directive.children};
}

function paragraph(children) {
    return {type: 'paragraph', children};
}

// ---- the blocks -------------------------------------------------------------

function lead(directive) {
    return block('Lead', {}, directive.children);
}

function actions(directive) {
    const items = directive.children.filter((c) => c.type === 'list').flatMap((l) => l.children);
    const ctas = items
        .map((item) => soleLink(item.children[0]) ?? item.children[0]?.children?.find((c) => c.type === 'link'))
        .filter(Boolean)
        .map((link, i) => block('Cta', {to: link.url, primary: i === 0}, link.children));
    return block('Actions', {}, ctas);
}

function figure(directive) {
    const {label, children} = labelled(directive);
    const {note, ratio, alt} = directive.attributes ?? {};
    // An image on its own becomes the figure's picture; anything else — a
    // diagram, say — is framed as it comes.
    const image = children.length === 1 && soleImage(children[0]);
    if (image) {
        return block('Figure', {src: image.url, alt: image.alt ?? alt, ratio}, []);
    }
    return block('Figure', {label, note, ratio}, children);
}

function soleImage(paragraph) {
    if (paragraph?.type === 'image') return paragraph;
    if (paragraph?.type !== 'paragraph') return null;
    const inline = paragraph.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
    // A diagram the build rendered stays a diagram (it carries its source).
    return inline.length === 1 && inline[0].type === 'image' && !inline[0].data?.hProperties?.['data-diagram-source']
        ? inline[0]
        : null;
}

function cards(directive) {
    const out = [];
    for (const child of directive.children) {
        const t = titled(child);
        if (t) {
            out.push(block('Card', {title: t.title}, t.rest.length ? [paragraph(t.rest)] : []));
        } else if (out.length) {
            // Anything else continues the card before it.
            out[out.length - 1].children.push(child);
        }
    }
    return block('Cards', {}, out);
}

function steps(directive) {
    const lists = directive.children.filter((c) => c.type === 'list');
    const beside = directive.children.filter((c) => c.type !== 'list');
    const items = lists.flatMap((l) => l.children).map((item) => {
        const [first, ...more] = item.children;
        const t = titled(first);
        const body = t ? (t.rest.length ? [paragraph(t.rest)] : []) : [];
        return block('Step', {title: t ? t.title : textOf(first)}, [...body, ...more]);
    });
    const list = block('Steps', {}, items);
    return beside.length ? block('Split', {}, [list, block('Figure', {}, beside)]) : list;
}

function option(directive) {
    const {label, children} = labelled(directive);
    const {title, badge, highlight} = directive.attributes ?? {};
    const body = [...children];
    let cta;
    let to;
    const last = soleLink(body[body.length - 1]);
    if (last) {
        body.pop();
        cta = textOf(last);
        to = last.url;
    }
    return block(
        'Option',
        {title: title ?? label, badge, highlight: highlight !== undefined, to, cta},
        body,
    );
}

function links(directive) {
    const items = directive.children.filter((c) => c.type === 'list').flatMap((l) => l.children);
    const cards = items
        .map((item) => {
            const first = item.children[0];
            const children = first?.children ?? [];
            const at = children.findIndex((c) => c.type === 'link');
            if (at === -1) return null;
            const link = children[at];
            const description = textOf({children: trimLeading(children.slice(at + 1))}).trim();
            return block('LinkCard', {to: link.url, title: textOf(link), description});
        })
        .filter(Boolean);
    return block('Links', {}, cards);
}

const BUILD = {lead, actions, figure, cards, steps, option, links};

// ---- passes ------------------------------------------------------------------

/** Consecutive options become one row of options. */
function groupOptions(parent) {
    // A row already made is done: descending into it would wrap its options
    // again, without end.
    if (!Array.isArray(parent.children) || isBlock(parent, 'Options')) return;
    const out = [];
    for (const child of parent.children) {
        const previous = out[out.length - 1];
        if (isBlock(child, 'Option')) {
            if (isBlock(previous, 'Options')) {
                previous.children.push(child);
            } else {
                out.push(block('Options', {}, [child]));
            }
        } else {
            out.push(child);
        }
    }
    parent.children = out;
    parent.children.forEach(groupOptions);
}

/**
 * An h2 followed by overview blocks is a section: it and everything up to
 * the next h2 go in the frame. What is not the page's own content — the
 * raw-source carrier src/remark/raw-source.mjs appends — is left outside.
 */
function wrapSections(root) {
    const isH2 = (n) => n.type === 'heading' && n.depth === 2;
    const isForeign = (n) => n.type === 'mdxJsxFlowElement' && !isBlock(n);
    const out = [];
    let i = 0;
    while (i < root.children.length) {
        const node = root.children[i];
        if (!isH2(node)) {
            out.push(node);
            i += 1;
            continue;
        }
        let j = i + 1;
        while (j < root.children.length && !isH2(root.children[j])) j += 1;
        const range = root.children.slice(i, j);
        const kept = [];
        const inside = [];
        for (const n of range) (isForeign(n) ? kept : inside).push(n);
        if (inside.some((n) => isBlock(n))) {
            out.push(block('Section', {}, inside), ...kept);
        } else {
            out.push(...range);
        }
        i = j;
    }
    root.children = out;
}

export default function remarkOverviewBlocks() {
    return (tree) => {
        let found = false;
        visit(tree, 'containerDirective', (node, index, parent) => {
            if (!HANDLED.has(node.name) || !parent || index === null) return;
            parent.children[index] = BUILD[node.name](node);
            found = true;
        });
        if (!found) return;
        groupOptions(tree);
        wrapSections(tree);
    };
}
