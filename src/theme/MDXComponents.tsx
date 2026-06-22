import MDXComponents from '@theme-original/MDXComponents';
import Prerequis from '@site/docs/_shared/_prerequis.mdx';

// Composants globaux disponibles dans TOUS les fichiers .md/.mdx
// sans avoir besoin de les importer (équivalent de l'esprit `include::` d'AsciiDoc).
export default {
  // On réutilise le mapping Markdown par défaut de Docusaurus.
  ...MDXComponents,
  // On enregistre nos partiels/composants partagés ici :
  Prerequis,
};
