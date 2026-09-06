import type {ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames, useThemeConfig} from '@docusaurus/theme-common';
import {
  findFirstSidebarItemLink,
  useDocsSidebar,
  useSidebarBreadcrumbs,
} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';
import DocBreadcrumbsStructuredData from '@theme/DocBreadcrumbs/StructuredData';
import styles from './styles.module.css';

// Ejected copy of the theme's DocBreadcrumbs (3.10), drawn as the design
// draws them: plain text parted by slashes, opening with the section of the
// site the sidebar belongs to ("Guide") rather than with a home icon, and
// ending on the page itself, which is the only crumb in the page's ink.

type Crumb = {label: string; href?: string};

/**
 * The navbar entry that leads to this sidebar, as the first crumb.
 *
 * A sidebar has a name, and a `docSidebar` navbar item names the sidebar it
 * opens; matching the two gives the label a reader saw in the navbar. Its
 * link is the sidebar's first page, which is where the navbar item goes too.
 */
function useSidebarCrumb(): Crumb | null {
  const sidebar = useDocsSidebar();
  const {navbar} = useThemeConfig();
  if (!sidebar) {
    return null;
  }
  const items = navbar.items as {type?: string; sidebarId?: string; label?: string}[];
  const entry = items.find(
    (item) => item.type === 'docSidebar' && item.sidebarId === sidebar.name,
  );
  if (!entry?.label) {
    return null;
  }
  const href = findFirstSidebarItemLink({
    type: 'category',
    label: entry.label,
    items: sidebar.items,
    collapsed: false,
    collapsible: true,
  });
  return {label: entry.label, href};
}

function Separator(): ReactNode {
  return (
    <span aria-hidden="true" className={styles.separator}>
      /
    </span>
  );
}

export default function DocBreadcrumbs(): ReactNode {
  const breadcrumbs = useSidebarBreadcrumbs();
  const root = useSidebarCrumb();
  if (!breadcrumbs) {
    return null;
  }
  const crumbs: Crumb[] = [
    ...(root ? [root] : []),
    ...breadcrumbs.map((item) => ({
      label: item.label,
      href: item.type === 'category' && item.linkUnlisted ? undefined : item.href,
    })),
  ];
  return (
    <>
      <DocBreadcrumbsStructuredData breadcrumbs={breadcrumbs} />
      <nav
        className={clsx(ThemeClassNames.docs.docBreadcrumbs, styles.nav)}
        aria-label={translate({
          id: 'theme.docs.breadcrumbs.navAriaLabel',
          message: 'Breadcrumbs',
          description: 'The ARIA label for the breadcrumbs',
        })}>
        <ol className={styles.list}>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={i} className={styles.item}>
                {i > 0 && <Separator />}
                {isLast ? (
                  <span className={styles.current} aria-current="page">
                    {crumb.label}
                  </span>
                ) : crumb.href ? (
                  <Link className={styles.link} to={crumb.href}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={styles.link}>{crumb.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
