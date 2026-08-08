import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './index.module.css';

type Release = {tag: string; name: string; body: string; date: string; url: string};
type Card = {icon: string; title: string; desc: string; cta: string; to: string};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function HeroTop(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const hero = (siteConfig.customFields?.home as {hero?: Record<string, string>} | undefined)?.hero ?? {};
  const eyebrow = hero.eyebrow || 'Documentation';
  const title = hero.title || siteConfig.title;
  const subtitle = hero.subtitle || siteConfig.tagline || '';
  // Highlight the last word of the title with the accent gradient.
  const words = title.trim().split(' ');
  const head = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];

  const data = usePluginData('docusaurus-plugin-home-cards') as {cards?: Card[]} | undefined;
  const cards = data?.cards ?? [];

  return (
    <header className={styles.hero}>
      <div className={styles.container}>
        {/* Two columns on desktop: the pitch on the left, the "Explore" cards on
            the right so they fill the space beside the headline. Stacks on
            narrow screens (see index.module.css). When there are no cards the
            layout collapses to a single column. */}
        <div className={cards.length > 0 ? styles.topGrid : undefined}>
          <div className={styles.heroCol}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.h1}>
              {head} <span className={styles.grad}>{last}</span>
            </h1>
            <p className={styles.lead}>{subtitle}</p>
            <Link className={styles.search} to="/docs/intro">
              <span aria-hidden="true">🔎</span>
              <span>Browse the documentation…</span>
            </Link>
            <div className={styles.ctaRow}>
              <Link className={`${styles.btn} ${styles.primary}`} to="/docs/intro">Get started →</Link>
              <Link className={`${styles.btn} ${styles.ghost}`} to="/blog">What&apos;s new</Link>
            </div>
          </div>

          {cards.length > 0 && (
            <div className={styles.cardsCol}>
              <p className={styles.eyebrow}>Explore</p>
              <h2 className={styles.sectionTitle}>Where to start</h2>
              <p className={styles.sectionSub}>Pick an entry point based on what you need.</p>
              <div className={styles.grid}>
                {cards.slice(0, 4).map((c) => (
                  <Link key={c.title} className={styles.card} to={c.to}>
                    <div className={styles.ic}>{c.icon}</div>
                    <h3 className={styles.cardTitle}>{c.title}</h3>
                    <p className={styles.cardDesc}>{c.desc}</p>
                    <span className={styles.go}>{c.cta} →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LatestRelease(): ReactNode {
  const data = usePluginData('docusaurus-plugin-changelog') as {releases?: Release[]} | undefined;
  const latest = data?.releases?.[0];
  if (!latest) return null;

  const bullets = latest.body
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*]\s+(.*)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 3) as string[];

  return (
    <section className={styles.container}>
      <p className={styles.eyebrow}>Latest release</p>
      <h2 className={styles.sectionTitle}>What just shipped</h2>
      <div className={styles.release}>
        <div className={styles.releaseLeft}>
          <span className={styles.releaseTag}>{latest.tag}</span>
          <h3 className={styles.releaseName}>{latest.name}</h3>
          {bullets.length > 0 && (
            <ul className={styles.releaseList}>
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.releaseRight}>
          <span className={styles.releaseDate}>Released {formatDate(latest.date)}</span>
          <Link className={`${styles.btn} ${styles.primary}`} to="/changelog">
            Read the full notes →
          </Link>
          <span className={styles.releaseHint}>
            The changelog lists every GitHub Release automatically.
          </span>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HeroTop />
      <main className={styles.main}>
        <LatestRelease />
      </main>
    </Layout>
  );
}
