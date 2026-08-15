// Build-time index for the ⌘K command palette. Emits a flat list of every doc
// (title, permalink, description) as global data, consumed client-side by
// src/components/CommandPalette. Mirrors the approach of plugins/home-cards:
// read the docs plugin's loaded content so links are real (no route guessing).
module.exports = function commandPalettePlugin() {
  return {
    name: 'docusaurus-plugin-command-palette',

    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent['docusaurus-plugin-content-docs'];
      const instance = docsContent && Object.values(docsContent)[0];
      const version =
        instance && instance.loadedVersions && instance.loadedVersions[0];

      const items = [];
      if (version) {
        for (const doc of version.docs) {
          if (!doc.permalink) continue;
          items.push({
            title: doc.title || doc.id,
            permalink: doc.permalink,
            description:
              (doc.frontMatter && doc.frontMatter.description) ||
              doc.description ||
              '',
          });
        }
      }

      actions.setGlobalData({items});
    },
  };
};
