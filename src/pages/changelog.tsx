import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './changelog.module.css';

type Release = {
  tag: string;
  name: string;
  body: string;
  date: string;
  url: string;
  prerelease: boolean;
};

type ChangelogData = {owner: string; repo: string; releases: Release[]};

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
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Minimal, escape-first Markdown renderer for release notes (headings, lists,
// bold, inline code, links, autolinks). Escaping before any transform keeps it
// safe against HTML injection in release bodies.
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
      const level = Math.min(6, Math.max(3, heading[1].length + 1)); // keep below the page h1/h2
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(item[1])}</li>`);
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

function ReleaseCard({release, defaultOpen}: {release: Release; defaultOpen: boolean}): ReactNode {
  return (
    <details className={styles.release} open={defaultOpen}>
      <summary className={styles.summary}>
        <span className={styles.tag}>{release.tag}</span>
        {release.name && !sameVersion(release.name, release.tag) && (
          <span className={styles.name}>{release.name}</span>
        )}
        {release.prerelease && <span className={styles.pre}>pre-release</span>}
        <span className={styles.date}>{formatDate(release.date)}</span>
      </summary>
      {release.body.trim() ? (
        <div
          className={styles.body}
          // Body is escaped before transformation in renderMarkdown.
          dangerouslySetInnerHTML={{__html: renderMarkdown(release.body)}}
        />
      ) : (
        <p className={styles.empty}>No release notes.</p>
      )}
      <Link className={styles.viewOnGh} href={release.url}>
        View on GitHub ↗
      </Link>
    </details>
  );
}

export default function Changelog(): ReactNode {
  const data = usePluginData('docusaurus-plugin-changelog') as ChangelogData | undefined;
  const releases = data?.releases ?? [];

  return (
    <Layout title="Changelog" description="Release history and notes.">
      <main className={styles.wrap}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Releases</p>
          <h1 className={styles.title}>Changelog</h1>
          <p className={styles.lead}>
            Every version and its notes, generated automatically from the project's GitHub Releases.
          </p>
        </header>

        {releases.length === 0 ? (
          <p className={styles.emptyState}>
            No releases published yet — this page fills in automatically once a GitHub Release exists.
          </p>
        ) : (
          <div className={styles.list}>
            {releases.map((r, i) => (
              <ReleaseCard key={r.tag} release={r} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
