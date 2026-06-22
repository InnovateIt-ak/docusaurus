// Loader webpack (pré-loader) : déclare les fichiers référencés par
// `#include "..."` comme dépendances de la page courante.
//
// Le plugin remark (include.mjs) fait l'expansion du contenu, mais comme il
// lit les fichiers via `fs`, webpack ne sait pas que la page en dépend et ne
// la recompile donc pas quand un fragment change. Ce loader corrige ça : il
// appelle `this.addDependency()` pour chaque fichier inclus (récursivement),
// puis renvoie la source inchangée. Résultat : le hot reload fonctionne.
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
        // Fichier introuvable : le plugin remark lèvera une erreur explicite.
      }
    }
  };

  collect(source, path.dirname(this.resourcePath));
  return source;
};
