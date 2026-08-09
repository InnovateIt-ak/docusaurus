import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
const INCLUDE_LINE = /^\s*#include\s+["']([^"']+\.mdx?)["']\s*$/;

export default function remarkInclude() {
    const processor = this;

    function includeTargets(node, sourceLines) {
        if (node.type !== 'paragraph' || !node.position) return null;
        const {start, end} = node.position;
        const lines = sourceLines
            .slice(start.line - 1, end.line)
            .map((line) => line.trim())
            .filter(Boolean);
        if (lines.length === 0) return null;
        const targets = [];
        for (const line of lines) {
            const match = line.match(INCLUDE_LINE);
            if (!match) return null;
            targets.push(match[1]);
        }
        return targets;
    }
    function parseAndExpand(rawSource, fromDir, stack) {
        const subtree = processor.parse(rawSource);
        expand(subtree, rawSource, fromDir, stack);
        return subtree.children.filter(
            (n) => n.type !== 'yaml' && n.type !== 'toml',
        );
    }

    function expand(tree, sourceText, fromDir, stack) {
        if (!Array.isArray(tree.children)) return;
        const sourceLines = sourceText.split(/\r?\n/);
        const out = [];
        for (const child of tree.children) {
            const targets = includeTargets(child, sourceLines);
            if (!targets) {
                out.push(child);
                continue;
            }
            for (const target of targets) {
                const abs = resolve(fromDir, target);
                if (stack.includes(abs)) {
                    throw new Error(`[remark-include] Inclusion circulaire détectée : ${abs}`);
                }
                let raw;
                try {
                    raw = readFileSync(abs, 'utf8');
                } catch {
                    throw new Error(
                        `[remark-include] Fichier introuvable : "${target}" (résolu en ${abs})`,
                    );
                }
                out.push(...parseAndExpand(raw, dirname(abs), [...stack, abs]));
            }
        }
        tree.children = out;
    }

    return (tree, file) => {
        const fromDir = file.dirname ?? process.cwd();
        const self = file.path ? resolve(file.path) : '';
        expand(tree, String(file.value ?? ''), fromDir, self ? [self] : []);
    };
}
