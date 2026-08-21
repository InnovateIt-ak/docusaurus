// Remark plugin: keeps the page's markdown source reachable from the client.
//
// "Copy as Markdown" and "Open in Open WebUI" need the text the author wrote,
// not the rendered DOM — where diagrams have become data-URL <img>s and tables
// have become <table>s. Rebuilding markdown from that would produce a poor copy
// of the original when the original is right there, on the vfile.
//
// `String(file)` is the file's raw contents: remark plugins modify the tree,
// never `file.value`. Where this plugin sits in the chain therefore makes no
// difference — it is placed first so that is explicit.
//
// But the file as it sits on disk is not the whole page. A page composed with
// `#include "fragment.md"`, or one that draws a diagram with
// `![alt](../plantuml/auth-flow.puml)`, carries *paths* where the reader sees
// content. Copied or sent to a chat model, a path is worthless: the model has
// no access to this filesystem, and answers about a page it has only been shown
// the table of contents of. So the source is expanded here — the same
// references the build resolves into content (src/remark/include.mjs,
// plantuml-inline.mjs, mermaid-inline.mjs) are resolved into markdown:
//
//   #include "part.md"          -> the fragment's markdown, expanded in turn
//   ![alt](diagram.puml)        -> a ```plantuml fenced block with its source
//   ![alt](diagram.mmd)         -> a ```mermaid fenced block with its source
//
// `!include` *inside* a diagram is deliberately left alone. It names a skin or
// a stdlib import — styling the reader never wrote and a model does not need —
// and it is what the page's own "Source" toggle shows (plantuml-inline.mjs
// carries the pre-include source for exactly that reason).
//
// The source travels in a <RawSource value="…" /> JSX element appended to the
// tree; the matching component (src/components/RawSource) puts it in the DOM on
// a hidden node, where the buttons read it back on click.

import {readFileSync} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';

// Front matter is site machinery (sidebar_position, id, …) rather than content:
// copying it would only clutter the clipboard.
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

// Mirrors src/remark/include.mjs, so what is copied matches what is rendered.
const INCLUDE_LINE = /^\s*#include\s+["']([^"']+\.mdx?)["']\s*$/;

// A fence opens with three or more backticks or tildes, indented at most three
// spaces, and closes on a line of the same character that is at least as long.
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

// ![alt](target "optional title"), with the angle-bracket form of the target
// allowed. Deliberately narrow: enough for a diagram reference, and anything it
// does not match is left untouched rather than mangled.
const IMAGE = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

const DIAGRAM_LANGUAGES = new Map([
    ['puml', 'plantuml'],
    ['plantuml', 'plantuml'],
    ['mmd', 'mermaid'],
    ['mermaid', 'mermaid'],
]);

// Deep enough for any real fragment tree, shallow enough that a cycle the
// include plugin has not reached yet cannot hang the build here.
const MAX_INCLUDE_DEPTH = 10;

/** The fence language for a diagram reference, or null if it is not one. */
function diagramLanguage(target) {
    const extension = target.split('.').pop()?.toLowerCase() ?? '';
    return DIAGRAM_LANGUAGES.get(extension) ?? null;
}

/**
 * Reads `target` relative to `fromDir`, or returns null when it cannot be read.
 *
 * Failing soft matters: this plugin only feeds a copy button. A missing include
 * or diagram is a real build error, but it is remark-include's and
 * remark-plantuml's to raise — with the message and the position they already
 * produce. Throwing here would only replace those with a worse one.
 */
function readRelative(target, fromDir) {
    try {
        const path = isAbsolute(target) ? target : resolve(fromDir, target);
        return {path, text: readFileSync(path, 'utf8')};
    } catch {
        return null;
    }
}

/** Wraps a diagram's source in a fenced block, keeping the alt text as a title. */
function fenceDiagram(language, alt, source) {
    const title = alt.trim() ? ` title="${alt.trim().replace(/"/g, "'")}"` : '';
    return ['', `\`\`\`${language}${title}`, ...source.trimEnd().split(/\r?\n/), '```', ''];
}

/**
 * Expands every diagram reference on one line into fenced blocks.
 *
 * A reference is nearly always alone on its line, but prose either side of one
 * is kept — pushed out to its own line, since a fenced block cannot sit inside
 * a paragraph. Returns the line unchanged (as a single-element array) when it
 * holds no diagram reference.
 */
function expandDiagramLine(line, fromDir) {
    const out = [];
    let consumed = 0;
    IMAGE.lastIndex = 0;
    for (let match = IMAGE.exec(line); match; match = IMAGE.exec(line)) {
        const [whole, alt, target] = match;
        const language = diagramLanguage(target);
        if (!language) continue;
        const file = readRelative(target, fromDir);
        if (!file) continue;

        const before = line.slice(consumed, match.index);
        if (before.trim()) out.push(before.trimEnd());
        out.push(...fenceDiagram(language, alt, file.text));
        consumed = match.index + whole.length;
    }
    if (out.length === 0) return [line];

    const after = line.slice(consumed);
    if (after.trim()) out.push(after.trimStart());
    return out;
}

/**
 * The markdown of `text` with its `#include`s and diagram references resolved.
 *
 * Works on the text rather than the tree because the text is what the button
 * hands over: stringifying an expanded mdast back to markdown would return the
 * author's page in a normalised shape they did not write.
 *
 * Code blocks are left alone — fenced and indented alike. A page that documents
 * the `#include` mechanism shows the syntax in a fence (docs/architecture does
 * exactly this), and expanding *that* would replace the example with the thing
 * it is an example of.
 */
function expandSource(text, fromDir, stack) {
    const lines = text.split(/\r?\n/);
    const out = [];
    let fence = null;

    for (let i = 0; i < lines.length; ) {
        const line = lines[i];

        if (fence) {
            out.push(line);
            const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
            if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
                fence = null;
            }
            i += 1;
            continue;
        }

        const open = line.match(FENCE_OPEN);
        if (open) {
            fence = {char: open[1][0], length: open[1].length};
            out.push(line);
            i += 1;
            continue;
        }

        if (!line.trim()) {
            out.push(line);
            i += 1;
            continue;
        }

        // Consecutive non-blank lines form one block, which is how
        // remark-include sees them: it expands a paragraph only when *every*
        // line in it is an include, so a stray `#include` in the middle of a
        // sentence stays literal there and stays literal here.
        const block = [];
        while (i < lines.length && lines[i].trim() && !FENCE_OPEN.test(lines[i])) {
            block.push(lines[i]);
            i += 1;
        }

        // Four spaces of indent opens a code block, not a paragraph.
        if (/^ {4,}/.test(block[0])) {
            out.push(...block);
            continue;
        }

        const targets = block.map((entry) => entry.match(INCLUDE_LINE)?.[1] ?? null);
        if (targets.every(Boolean)) {
            out.push(...expandIncludes(targets, block, fromDir, stack));
            continue;
        }

        for (const entry of block) {
            out.push(...expandDiagramLine(entry, fromDir));
        }
    }

    return out;
}

/** Replaces a block of include lines with the markdown of the files they name. */
function expandIncludes(targets, block, fromDir, stack) {
    const out = [];
    for (const [index, target] of targets.entries()) {
        const file = readRelative(target, fromDir);
        if (!file || stack.includes(file.path) || stack.length >= MAX_INCLUDE_DEPTH) {
            out.push(block[index]);
            continue;
        }
        const inner = file.text.replace(FRONT_MATTER, '').trim();
        out.push('', ...expandSource(inner, dirname(file.path), [...stack, file.path]), '');
    }
    return out;
}

export default function remarkRawSource() {
    return (tree, file) => {
        const source = String(file).replace(FRONT_MATTER, '').trim();
        if (!source) return;

        const fromDir = file.dirname ?? process.cwd();
        const self = file.path ? resolve(file.path) : '';
        const raw = expandSource(source, fromDir, self ? [self] : [])
            .join('\n')
            // Expansion pads what it inserts with blank lines so a fence or a
            // fragment never lands against the line above it; where that meets
            // blank lines the author already wrote, the runs collapse back.
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        if (!raw) return;

        tree.children.push({
            type: 'mdxJsxFlowElement',
            name: 'RawSource',
            attributes: [{type: 'mdxJsxAttribute', name: 'value', value: raw}],
            children: [],
        });
    };
}
