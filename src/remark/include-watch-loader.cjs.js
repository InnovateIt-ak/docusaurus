const fs = require('node:fs');
const path = require('node:path');

module.exports = function includeWatchLoader(source) {
    const seen = new Set();

    const collect = (content, fromDir) => {
        const re = /^[ \t]*#include\s+["']([^"']+\.mdx?)["'][ \t]*$/gm;
        for (const match of content.matchAll(re)) {
            const abs = path.resolve(fromDir, match[1]);
            if (seen.has(abs)) continue;
            seen.add(abs);
            this.addDependency(abs);
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
