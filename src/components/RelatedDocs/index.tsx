import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

// A single related-doc entry. Authors write these in a page's front matter as
// either a bare path string or an object with an optional label/icon:
//
//   related:
//     - to: /docs/tutorial-basics/deploy-your-site
//       label: Deploy your site
//       icon: 🚀
//     - /docs/intro          # bare path — label derived from the last segment
//
export type RelatedItem = string | {to: string; label?: string; icon?: string};

// Turn a path's last segment into a human label ("deploy-your-site" → "Deploy
// your site"), used when an entry provides a path but no explicit label.
function labelFromPath(to: string): string {
  const seg = to.replace(/\/+$/, '').split('/').pop() ?? to;
  const words = seg.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function normalize(item: RelatedItem): {to: string; label: string; icon?: string} {
  if (typeof item === 'string') return {to: item, label: labelFromPath(item)};
  return {to: item.to, label: item.label ?? labelFromPath(item.to), icon: item.icon};
}

// Renders an editorial "next steps" block at the bottom of a doc: curated,
// cross-section suggestions declared in front matter. This is distinct from the
// theme's sequential prev/next pagination — those follow sidebar order, these
// follow meaning. Renders nothing when a page declares no `related` items.
export default function RelatedDocs({items}: {items?: RelatedItem[]}): ReactNode {
  if (!Array.isArray(items) || items.length === 0) return null;
  const links = items.map(normalize).filter((l) => l.to);
  if (links.length === 0) return null;

  return (
    <nav className={styles.related} aria-label="Related pages">
      <p className={styles.heading}>
        <Translate
          id="theme.docs.relatedDocs.title"
          description="Heading of the related-pages / next-steps block at the bottom of a doc">
          Next steps
        </Translate>
      </p>
      <ul className={styles.list}>
        {links.map((l) => (
          <li key={l.to}>
            <Link className={styles.item} to={l.to}>
              {l.icon && (
                <span className={styles.icon} aria-hidden="true">
                  {l.icon}
                </span>
              )}
              <span className={styles.label}>{l.label}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
