// Build-time home cards: derive the landing-page category cards from the actual
// docs sidebar (top-level entries) so the home page stays generic and in sync
// with the documentation — nothing project-specific is hardcoded.
//
// Reads the docs plugin's loaded content in `contentLoaded({allContent})`, which
// carries every doc's real permalink/title/description and the resolved sidebar,
// so links are accurate (no route guessing) and the build fails loudly only on
// genuinely broken content, not on our heuristics.

const DEFAULT_ICON = '📄';

module.exports = function homeCardsPlugin(context, options = {}) {
  // Case-insensitive icon override: keys match section/doc labels regardless of
  // capitalisation (a folder-derived label like "architecture" still matches).
  const iconMap = new Map(
    Object.entries(options.icons || {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const iconFor = (label) => iconMap.get(String(label).toLowerCase()) || DEFAULT_ICON;
  const extraCards = options.extraCards || [];

  return {
    name: 'docusaurus-plugin-home-cards',

    // `allContentLoaded` (not `contentLoaded`) is the lifecycle that receives
    // every plugin's loaded content, including the docs plugin's sidebar/docs.
    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent['docusaurus-plugin-content-docs'];
      const version =
        docsContent && Object.values(docsContent)[0] &&
        Object.values(docsContent)[0].loadedVersions &&
        Object.values(docsContent)[0].loadedVersions[0];

      const cards = [];

      if (version) {
        const byId = new Map(version.docs.map((d) => [d.id, d]));
        // The sidebar file is `tutorialSidebar` here, but take whichever exists.
        const sidebar = Object.values(version.sidebars || {})[0] || [];

        for (const item of sidebar) {
          if (item.type === 'category') {
            const first = findFirstDoc(item, byId);
            const href =
              (item.link && item.link.type === 'generated-index' && item.link.permalink) ||
              (first && first.permalink);
            if (!href) continue;
            cards.push({
              icon: iconFor(item.label),
              title: item.label,
              desc:
                (item.link && item.link.description) ||
                (first && first.frontMatter && first.frontMatter.description) ||
                `Browse the ${item.label} section.`,
              cta: 'Open',
              to: href,
            });
          } else if (item.type === 'doc') {
            const doc = byId.get(item.id);
            if (!doc) continue;
            const title = item.label || doc.title || doc.id;
            cards.push({
              icon: iconFor(title),
              title,
              desc:
                (doc.frontMatter && doc.frontMatter.description) ||
                `Read ${title}.`,
              cta: 'Read',
              to: doc.permalink,
            });
          }
        }
      }

      // Cross-cutting cards that are not docs sections (PDF export, changelog…).
      // Kept as options so a replicated site tweaks them in one place.
      cards.push(...extraCards);

      actions.setGlobalData({cards});
    },
  };
};

// Depth-first: the first actual doc reachable inside a category (for a link
// target when the category has no generated-index page of its own).
function findFirstDoc(category, byId) {
  for (const child of category.items || []) {
    if (child.type === 'doc' && byId.has(child.id)) return byId.get(child.id);
    if (child.type === 'category') {
      const found = findFirstDoc(child, byId);
      if (found) return found;
    }
  }
  return null;
}
