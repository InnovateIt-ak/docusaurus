import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './index.module.css';

type Release = {tag: string; name: string; body: string; date: string; url: string};
type ChangelogData = {releases: Release[]};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type Card = {icon: string; title: string; desc: string; cta: string; to: string};
const CARDS: Card[] = [
  {icon: '🚀', title: 'Prise en main', desc: 'Installe, lance et comprends le projet en moins de 5 minutes.', cta: 'Tutorial Intro', to: '/docs/intro'},
  {icon: '🏛️', title: 'Architecture', desc: 'Vue arc42, décisions (MADR), authentification, système — avec diagrammes.', cta: "Voir l'architecture", to: '/docs/architecture/01-executive-summary'},
  {icon: '📘', title: 'Tutoriels', desc: 'Basics et Extras : créer des pages, gérer les versions, traduire le site.', cta: 'Parcourir les tutoriels', to: '/docs/category/tutorial---basics'},
  {icon: '📄', title: 'Téléchargements PDF', desc: 'Chaque section — et la doc complète — exportée en PDF, générée par la CI.', cta: 'Documentation complète', to: 'pathname:///documentation.pdf'},
  {icon: '🗺️', title: 'Diagrammes', desc: 'Modèles LikeC4 et tableaux TlDraw, intégrés et interactifs.', cta: 'Explorer les diagrammes', to: '/likec4'},
  {icon: '🧾', title: 'Changelog', desc: 'Toutes les versions et leurs notes, synchronisées avec les GitHub Releases.', cta: 'Voir les releases', to: '/changelog'},
];

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>EU Delegations Guide · Documentation</p>
        <h1 className={styles.h1}>
          Construire, comprendre et <span className={styles.grad}>livrer</span> la plateforme.
        </h1>
        <p className={styles.lead}>
          Documentation d'architecture (arc42 / MADR), tutoriels pas-à-pas, diagrammes rendus au
          build et versions PDF téléchargeables — le tout au même endroit.
        </p>
        <Link className={styles.search} to="/docs/intro">
          <span aria-hidden="true">🔎</span>
          <span>Parcourir la documentation…</span>
        </Link>
        <div className={styles.ctaRow}>
          <Link className={`${styles.btn} ${styles.primary}`} to="/docs/intro">Commencer →</Link>
          <Link className={`${styles.btn} ${styles.ghost}`} to="/docs/architecture/01-executive-summary">
            Explorer l'architecture
          </Link>
        </div>
      </div>
    </header>
  );
}

function Cards(): ReactNode {
  return (
    <section className={styles.container}>
      <p className={styles.eyebrow}>Explorer</p>
      <h2 className={styles.sectionTitle}>Par où commencer</h2>
      <p className={styles.sectionSub}>Choisis un point d'entrée selon ce que tu cherches.</p>
      <div className={styles.grid}>
        {CARDS.map((c) => (
          <Link key={c.title} className={styles.card} to={c.to}>
            <div className={styles.ic}>{c.icon}</div>
            <h3 className={styles.cardTitle}>{c.title}</h3>
            <p className={styles.cardDesc}>{c.desc}</p>
            <span className={styles.go}>{c.cta} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LatestRelease(): ReactNode {
  const data = usePluginData('docusaurus-plugin-changelog') as ChangelogData | undefined;
  const latest = data?.releases?.[0];
  if (!latest) return null;

  const bullets = latest.body
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*]\s+(.*)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 3) as string[];

  return (
    <section className={styles.container}>
      <p className={styles.eyebrow}>Dernière version</p>
      <h2 className={styles.sectionTitle}>Ce qui vient de sortir</h2>
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
          <span className={styles.releaseDate}>Publiée le {formatDate(latest.date)}</span>
          <Link className={`${styles.btn} ${styles.primary}`} to="/changelog">
            Lire les notes complètes →
          </Link>
          <span className={styles.releaseHint}>
            Le changelog liste automatiquement chaque GitHub Release.
          </span>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Documentation d'architecture, tutoriels, diagrammes et PDF téléchargeables.">
      <Hero />
      <main className={styles.main}>
        <Cards />
        <LatestRelease />
      </main>
    </Layout>
  );
}
