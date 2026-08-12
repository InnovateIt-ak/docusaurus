// Build-time changelog: fetch the repository's GitHub Releases and expose them
// as Docusaurus global data, so the /changelog page stays in sync with the
// releases automatically (no manual authoring).
//
// - Uses the GitHub REST API. In CI a GITHUB_TOKEN lifts the rate limit and
//   allows private repos; locally it works unauthenticated for public repos.
// - Network/API failures are non-fatal: the build still succeeds and the page
//   renders an empty state, so a flaky API never breaks the site.
//
// The owner/repo default to this project's Docusaurus config but can be
// overridden via env (G_ORGANIZATION_NAME / G_PROJECT_NAME) or plugin options.

// ServiceNow base + change-request link, kept in sync with
// src/remark/servicenow-autolink.mjs (CHG -> change_request table). The CHG
// reference is extracted here, at build time, so the value is baked into the
// changelog global data and the client render stays hydration-safe.
const SN_BASE = (process.env.SERVICENOW_BASE_URL || 'https://services.eeas.europa.eu').replace(/\/+$/, '');
const CHG_RE = /\bCHG\d+\b/g;

// Pull every ServiceNow change reference (e.g. CHG0012345) out of a release
// body so they can be shown next to the version in the changelog title.
// Duplicates are dropped while preserving first-seen order.
function changesFromBody(body) {
  const seen = new Set();
  const changes = [];
  const text = body || '';
  CHG_RE.lastIndex = 0;
  let match;
  while ((match = CHG_RE.exec(text)) !== null) {
    const number = match[0];
    if (seen.has(number)) continue;
    seen.add(number);
    changes.push({number, url: `${SN_BASE}/change_request.do?sysparm_query=number=${number}`});
  }
  return changes;
}

/** @param {import('@docusaurus/types').LoadContext} context */
module.exports = function changelogPlugin(context, options = {}) {
  const owner =
    options.owner || process.env.G_ORGANIZATION_NAME ||
    context.siteConfig.organizationName || 'InnovateIt-ak';
  const repo =
    options.repo || process.env.G_PROJECT_NAME ||
    context.siteConfig.projectName || 'docusaurus';

  return {
    name: 'docusaurus-plugin-changelog',

    async loadContent() {
      const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;
      const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'docusaurus-changelog-plugin',
      };
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(url, {headers});
        if (!res.ok) {
          console.warn(`[changelog] GitHub API ${res.status} for ${owner}/${repo}; rendering empty changelog.`);
          return {owner, repo, releases: []};
        }
        const raw = await res.json();
        const releases = raw
          .filter((r) => !r.draft)
          .map((r) => ({
            tag: r.tag_name,
            name: r.name || r.tag_name,
            body: r.body || '',
            date: r.published_at || r.created_at,
            url: r.html_url,
            prerelease: !!r.prerelease,
            changes: changesFromBody(r.body),
          }));
        return {owner, repo, releases};
      } catch (err) {
        console.warn(`[changelog] Could not fetch releases (${err.message}); rendering empty changelog.`);
        return {owner, repo, releases: []};
      }
    },

    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
};
