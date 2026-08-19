const fs = require('node:fs');
const path = require('node:path');

// Files a page is built from but does not itself contain: `#include`d markdown
// fragments, and the .puml/.mmd files its diagrams point at. Webpack watches
// the .mdx it can see; these it has to be told about, or editing a fragment or
// a diagram in dev leaves the page — and the markdown behind "Copy as Markdown"
// (src/remark/raw-source.mjs) — showing the previous version until a restart.
const INCLUDE = /^[ \t]*#include\s+["']([^"']+\.mdx?)["'][ \t]*$/gm;
const DIAGRAM = /!\[[^\]]*\]\(\s*<?([^)\s>]+\.(?:puml|plantuml|mmd|mermaid))>?[^)]*\)/gi;

module.exports = function includeWatchLoader(source) {
    const seen = new Set();

    const watch = (target, fromDir) => {
        const abs = path.resolve(fromDir, target);
        if (seen.has(abs)) return null;
        seen.add(abs);
        this.addDependency(abs);
        return abs;
    };

    const collect = (content, fromDir) => {
        for (const match of content.matchAll(DIAGRAM)) {
            watch(match[1], fromDir);
        }
        for (const match of content.matchAll(INCLUDE)) {
            const abs = watch(match[1], fromDir);
            if (!abs) continue;
            try {
                collect(fs.readFileSync(abs, 'utf8'), path.dirname(abs));
            } catch {
                // File not found
            }
        }
    };

    collect(source, path.dirname(this.resourcePath));
    return source;
};
