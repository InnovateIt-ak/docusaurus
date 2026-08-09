// Build-time home cards: derive the landing-page category cards from the actual
// docs sidebar (top-level entries) so the home page stays generic and in sync
// with the documentation — nothing project-specific is hardcoded.
//
// Reads the docs plugin's loaded content in `contentLoaded({allContent})`, which
// carries every doc's real permalink/title/description and the resolved sidebar,
// so links are accurate (no route guessing) and the build fails loudly only on
// genuinely broken content, not on our heuristics.

const DEFAULT_ICON = '📄';

// Keyword → icon. Matching is by WORD inside the card title, not by the exact
// label, so "Developer Guide", "API reference", "analyse", "Filters"… all pick
// up an icon. Keys are single lowercase words; add more (or override) via the
// plugin's `icons` option.
const DEFAULT_KEYWORD_ICONS = {
  guide: '🧭', guides: '🧭', handbook: '🧭',
  tutorial: '🎓', tutorials: '🎓', learn: '🎓',
  analyse: '📊', analyze: '📊', analysis: '📊', analytics: '📊', report: '📊', reports: '📊',
  architecture: '🏛️', design: '🏛️',
  api: '🔌', apis: '🔌', endpoint: '🔌', endpoints: '🔌', rest: '🔌',
  reference: '📚', references: '📚', spec: '📚', specification: '📚',
  filter: '🎛️', filters: '🎛️', filtering: '🎛️',
  changelog: '🧾', release: '🧾', releases: '🧾', changes: '🧾',
  developer: '💻', developers: '💻', dev: '💻', sdk: '💻', code: '💻',
  overview: '🗺️', diagram: '🗺️', diagrams: '🗺️', map: '🗺️',
  intro: '🚀', introduction: '🚀', start: '🚀', started: '🚀', getting: '🚀', quickstart: '🚀',
  deploy: '🚀', deployment: '🚀',
  security: '🔐', auth: '🔐', authentication: '🔐', authorization: '🔐', permissions: '🔐',
  config: '⚙️', configuration: '⚙️', settings: '⚙️', setup: '⚙️',
  standard: '📐', standards: '📐', convention: '📐', conventions: '📐',
  faq: '❓', help: '❓', support: '❓',
  data: '🗄️', database: '🗄️', model: '🗄️', models: '🗄️', schema: '🗄️',
  test: '🧪', tests: '🧪', testing: '🧪',
};

// Split a label into lowercase words: break camelCase, treat any non-alphanumeric
// (spaces, -, _, ., /) as a separator. "DeveloperGuide" / "developer-guide" /
// "Developer Guide" all → ["developer", "guide"].
function tokenize(label) {
  return String(label)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

module.exports = function homeCardsPlugin(context, options = {}) {
  // Defaults first, then the `icons` option (which wins on conflicts). Keys are
  // lowercased; a key may be a single keyword (matched per word in the title) or
  // a full label (matched exactly, for backwards compatibility).
  const iconMap = new Map(
    [...Object.entries(DEFAULT_KEYWORD_ICONS), ...Object.entries(options.icons || {})]
      .map(([k, v]) => [k.toLowerCase(), v]),
  );
  // Resolve one word to an icon, tolerating singular/plural (guide↔guides).
  const lookupWord = (w) =>
    iconMap.get(w) ||
    (w.endsWith('s') && iconMap.get(w.slice(0, -1))) ||
    iconMap.get(`${w}s`) ||
    undefined;
  const iconFor = (label) => {
    // 1) exact full-label match (e.g. an explicit "Tutorial - Basics" override).
    const exact = iconMap.get(String(label).toLowerCase());
    if (exact) return exact;
    // 2) keyword match, preferring the last matching word — the "head noun"
    //    ("Developer Guide" → guide, "API reference" → reference).
    let found;
    for (const w of tokenize(label)) {
      const ic = lookupWord(w);
      if (ic) found = ic;
    }
    return found || DEFAULT_ICON;
  };
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
