import {useEffect, useMemo, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import Icon from '@site/src/components/Icon';
import styles from './changelog.module.css';

// The changelog, as the design's "Changelog" screen draws it: a title band
// with the release filters, then one section per release — version, date and
// kind in a narrow left column, the notes at the right with each entry
// labelled Added / Changed / Fixed — and, beside them, a sticky list of the
// versions on the page with the one being read marked. The releases come from
// GitHub at build time (plugins/changelog); nothing here is authored by hand.

type Release = {
  tag: string;
  name: string;
  body: string;
  date: string;
  url: string;
  prerelease: boolean;
  // ServiceNow change references extracted from the release body (What's Changed).
  changes?: {number: string; url: string}[];
};

type ChangelogData = {owner: string; repo: string; releases: Release[]};

type Kind = 'Major' | 'Minor' | 'Patch' | 'Pre-release';
type Filter = 'all' | 'minor' | 'patch';

// How many releases the page opens with; "Older releases" shows the rest.
const PAGE_SIZE = 8;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GitHub releases often carry a name identical to the tag (e.g. tag "1.0.0",
// name "1.0.0"), which would render the version twice. Treat them as the same
// (ignoring a leading "v") so the redundant name can be dropped.
const sameVersion = (a: string, b: string) =>
  a.replace(/^v/i, '').trim().toLowerCase() === b.replace(/^v/i, '').trim().toLowerCase();

// Format from UTC parts so the server-rendered and client-rendered strings match
// (a locale/timezone-dependent formatter would risk a hydration mismatch).
function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** What kind of release the version number says it is. */
function kindOf(release: Release): Kind {
  if (release.prerelease) return 'Pre-release';
  const m = release.tag.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 'Minor';
  if (m[3] !== '0') return 'Patch';
  return m[2] === '0' ? 'Major' : 'Minor';
}

/** The id a release's section carries, for the "Versions" list to point at. */
const anchorOf = (tag: string) => `v-${tag.replace(/[^\w.-]+/g, '-')}`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// An entry's label, read off how it begins: a conventional-commit type
// ("feat(diagrams): …", "fix: …"), or the word itself ("Added …", "Fixes …").
// The type prefix is dropped from the text, since the label now says it.
const LABELS: {test: RegExp; label: string; strip?: boolean}[] = [
  {test: /^(feat|feature)(\([^)]*\))?!?:\s*/i, label: 'Added', strip: true},
  {test: /^fix(\([^)]*\))?!?:\s*/i, label: 'Fixed', strip: true},
  {test: /^(docs|style|refactor|perf|chore|build|ci|test|revert)(\([^)]*\))?!?:\s*/i, label: 'Changed', strip: true},
  {test: /^(add(ed|s)?|new|introduc\w*)\b/i, label: 'Added'},
  {test: /^(fix(ed|es)?|correct\w*|repair\w*|resolv\w*)\b/i, label: 'Fixed'},
  {test: /^(remov\w*|drop\w*|delet\w*)\b/i, label: 'Removed'},
  {test: /^deprecat\w*/i, label: 'Deprecated'},
  {test: /^secur\w*/i, label: 'Security'},
  {test: /^(chang\w*|updat\w*|improv\w*|mov\w*|renam\w*|bump\w*|upgrad\w*)\b/i, label: 'Changed'},
];

function classify(text: string): {label?: string; text: string} {
  for (const {test, label, strip} of LABELS) {
    if (test.test(text)) {
      return {label, text: strip ? text.replace(test, '') : text};
    }
  }
  return {text};
}

// Minimal, escape-first Markdown renderer for release notes (headings, lists,
// bold, inline code, links, autolinks). Escaping before any transform keeps it
// safe against HTML injection in release bodies. List items get the label
// column of the design.
function renderMarkdown(md: string): string {
  const inline = (text: string) =>
    escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s)<]+)(?=[\s).,]|$)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const item = line.match(/^\s*[-*]\s+(.*)$/);
    if (heading) {
      closeList();
      out.push(`<p class="${styles.bodyHeading}">${inline(heading[2])}</p>`);
    } else if (item) {
      if (!inList) {
        out.push(`<ul class="${styles.entries}">`);
        inList = true;
      }
      const {label, text} = classify(item[1]);
      const tag = label
        ? `<span class="${clsx(styles.label, styles[`label${label}`])}">${label}</span>`
        : `<span class="${styles.label}" aria-hidden="true"></span>`;
      out.push(`<li class="${styles.entry}">${tag}<span class="${styles.entryText}">${inline(text)}</span></li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

/** The GitHub host the releases live on, for links the API does not give. */
function repoUrl(data: ChangelogData | undefined): string | null {
  const sample = data?.releases[0]?.url;
  if (!sample || !data) return null;
  try {
    return `${new URL(sample).origin}/${data.owner}/${data.repo}`;
  } catch {
    return null;
  }
}

function ReleaseSection({
  release,
  previous,
  repo,
}: {
  release: Release;
  previous?: Release;
  repo: string | null;
}): ReactNode {
  const kind = kindOf(release);
  const title = release.name && !sameVersion(release.name, release.tag) ? release.name : null;
  const diff = repo && previous ? `${repo}/compare/${previous.tag}...${release.tag}` : null;
  return (
    <section id={anchorOf(release.tag)} className={styles.release} data-release={release.tag}>
      <div className={styles.meta}>
        <div className={styles.tag}>{release.tag}</div>
        <div className={styles.date}>{formatDate(release.date)}</div>
        <div className={styles.kindRow}>
          <span className={clsx(styles.kind, kind === 'Patch' && styles.kindPatch, kind === 'Pre-release' && styles.kindPre)}>
            {kind}
          </span>
        </div>
        {release.changes && release.changes.length > 0 && (
          <div className={styles.changes}>
            {release.changes.map((c) => (
              <a key={c.number} className={styles.change} href={c.url} target="_blank" rel="noopener noreferrer">
                {c.number}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className={styles.notes}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {release.body.trim() ? (
          <div
            className={styles.body}
            // Body is escaped before transformation in renderMarkdown.
            dangerouslySetInnerHTML={{__html: renderMarkdown(release.body)}}
          />
        ) : (
          <p className={styles.empty}>No release notes.</p>
        )}
        <div className={styles.links}>
          {diff && (
            <Link className={styles.link} href={diff}>
              Read the diff <Icon name="arrow-right" size={14} />
            </Link>
          )}
          <Link className={styles.link} href={release.url}>
            <Icon name="external-link" size={14} /> Release on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

const FILTERS: {id: Filter; label: string}[] = [
  {id: 'all', label: 'All releases'},
  {id: 'minor', label: 'Minor only'},
  {id: 'patch', label: 'Patches'},
];

export default function Changelog(): ReactNode {
  const data = usePluginData('docusaurus-plugin-changelog') as ChangelogData | undefined;
  const releases = useMemo(() => data?.releases ?? [], [data]);
  const repo = repoUrl(data);

  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      releases.filter((r) => {
        if (filter === 'all') return true;
        const kind = kindOf(r);
        return filter === 'patch' ? kind === 'Patch' : kind !== 'Patch';
      }),
    [releases, filter],
  );
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  // The version being read, for the list at the side: the release whose
  // section crosses the upper part of the viewport.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-release]'));
    if (sections.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.getAttribute('data-release'));
        }
      },
      {rootMargin: '-15% 0px -70% 0px'},
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [visible.length, filter]);

  return (
    <Layout title="Changelog" description="Release history and notes.">
      <main className={styles.page}>
        <header className={styles.head}>
          <div className={styles.headInner}>
            <div className={styles.accent} />
            <p className={styles.eyebrow}>Release notes</p>
            <h1 className={styles.h1}>Changelog</h1>
            <p className={styles.lead}>
              Every release of the project, newest first, from its GitHub Releases. Minor versions
              add capability, patches correct or clarify.
            </p>
            {releases.length > 0 && (
              <div className={styles.filters} role="group" aria-label="Filter releases">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={clsx(styles.chip, filter === f.id && styles.chipActive)}
                    aria-pressed={filter === f.id}
                    onClick={() => {
                      setFilter(f.id);
                      setShowAll(false);
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.list}>
            {releases.length === 0 ? (
              <p className={styles.emptyState}>
                No releases published yet — this page fills in automatically once a GitHub Release
                exists.
              </p>
            ) : filtered.length === 0 ? (
              <p className={styles.emptyState}>No release of that kind yet.</p>
            ) : (
              visible.map((r, i) => (
                <ReleaseSection key={r.tag} release={r} previous={releases[releases.indexOf(r) + 1]} repo={repo} />
              ))
            )}
            {!showAll && filtered.length > PAGE_SIZE && (
              <button type="button" className={styles.older} onClick={() => setShowAll(true)}>
                Older releases <Icon name="arrow-right" size={15} className={styles.olderIcon} />
              </button>
            )}
          </div>

          {releases.length > 0 && (
            <aside className={styles.aside}>
              <div>
                <p className={styles.asideTitle}>Versions</p>
                <ul className={styles.versions}>
                  {visible.map((r) => (
                    <li key={r.tag}>
                      <a
                        href={`#${anchorOf(r.tag)}`}
                        className={clsx(styles.version, active === r.tag && styles.versionActive)}>
                        {r.tag}
                        <span className={styles.versionKind}>{kindOf(r)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.subscribe}>
                <h3 className={styles.subscribeTitle}>Subscribe</h3>
                <p className={styles.subscribeText}>
                  Watch the repository to be told of every release, or follow the releases page.
                </p>
                <Link className={styles.subscribeButton} href={repo ? `${repo}/releases` : releases[0].url}>
                  Releases on GitHub
                </Link>
              </div>
            </aside>
          )}
        </div>
      </main>
    </Layout>
  );
}
