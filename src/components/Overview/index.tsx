import type {CSSProperties, ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Icon from '@site/src/components/Icon';
import styles from './styles.module.css';

// The building blocks of a section overview: the page that opens a section of
// the docs with what it lets you do, how it works, which way in to take, and
// where to go next. Registered on the MDX components map (src/theme/
// MDXComponents) as `Overview`, so a page writes `<Overview.Lead>` and so on
// with nothing to import; docs/delegations/overview.mdx is the reference page.
//
// Headings stay markdown (`## Ce que vous pouvez faire`) inside an
// <Overview.Section>: written as markdown they get their ids and their place
// in the table of contents, which a heading rendered by a component would
// not. Every container here is a <div>, never a <p>, because MDX turns a
// block of prose inside a component into a paragraph of its own.

type Children = {children?: ReactNode};

/** The one-paragraph pitch under the title, larger and lighter than prose. */
export function Lead({children}: Children): ReactNode {
  return <div className={styles.lead}>{children}</div>;
}

/** The row of calls to action under the lead. */
export function Actions({children}: Children): ReactNode {
  return <div className={styles.actions}>{children}</div>;
}

/** One call to action; the primary one is filled and carries an arrow. */
export function Cta({
  to,
  primary = false,
  children,
}: {to: string; primary?: boolean} & Children): ReactNode {
  return (
    <Link
      className={clsx(
        styles.cta,
        primary ? styles.ctaPrimary : styles.ctaSecondary,
      )}
      to={to}>
      {children}
      {primary && (
        <Icon name="arrow-right" size={16} className={styles.ctaIcon} />
      )}
    </Link>
  );
}

/**
 * A framed figure: an image (`src`), block content such as a diagram
 * (children), or — until there is one — a hatched placeholder that says what
 * belongs there (`label`, and a `note` on the size or the source).
 */
export function Figure({
  src,
  alt = '',
  ratio = '2 / 1',
  label,
  note,
  children,
}: {
  src?: string;
  alt?: string;
  /** CSS aspect-ratio of the frame, for an image or a placeholder. */
  ratio?: string;
  label?: string;
  note?: string;
} & Children): ReactNode {
  const url = useBaseUrl(src ?? '');
  const style: CSSProperties = {aspectRatio: ratio};
  if (src) {
    return (
      <div className={styles.figure} style={style}>
        <img className={styles.figureImage} src={url} alt={alt} />
      </div>
    );
  }
  if (children) {
    return <div className={clsx(styles.figure, styles.figureContent)}>{children}</div>;
  }
  return (
    <div
      className={clsx(styles.figure, styles.placeholder)}
      style={style}
      role="img"
      aria-label={label}>
      <span className={styles.placeholderLabel}>
        {label}
        {note && <span className={styles.placeholderNote}>{note}</span>}
      </span>
    </div>
  );
}

/** One titled part of the page; consecutive sections are parted by a rule. */
export function Section({children}: Children): ReactNode {
  return <section className={styles.section}>{children}</section>;
}

/** A grid of capability cards. */
export function Cards({children}: Children): ReactNode {
  return <div className={styles.cards}>{children}</div>;
}

export function Card({title, children}: {title: string} & Children): ReactNode {
  return (
    <div className={styles.card}>
      <b className={styles.cardTitle}>{title}</b>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

/** Two columns side by side — the steps and their diagram — one under the other when narrow. */
export function Split({children}: Children): ReactNode {
  return <div className={styles.split}>{children}</div>;
}

/** Numbered steps joined by a line; the numbers come from CSS counters. */
export function Steps({children}: Children): ReactNode {
  return <ol className={styles.steps}>{children}</ol>;
}

export function Step({title, children}: {title: string} & Children): ReactNode {
  return (
    <li className={styles.step}>
      <div className={styles.stepBody}>
        <b className={styles.stepTitle}>{title}</b>
        <div className={styles.stepText}>{children}</div>
      </div>
    </li>
  );
}

/** The ways in, compared side by side. */
export function Options({children}: Children): ReactNode {
  return <div className={styles.options}>{children}</div>;
}

/**
 * One way in: a title with a badge, a paragraph, a markdown list of what it
 * gives (rendered as a checklist) and a link. `highlight` tints the card, for
 * the way most readers should take.
 */
export function Option({
  title,
  badge,
  highlight = false,
  to,
  cta,
  children,
}: {
  title: string;
  badge?: string;
  highlight?: boolean;
  to?: string;
  cta?: string;
} & Children): ReactNode {
  return (
    <div className={clsx(styles.option, highlight && styles.optionHighlight)}>
      <div className={styles.optionHead}>
        <b className={styles.optionTitle}>{title}</b>
        {badge && <span className={styles.badge}>{badge}</span>}
      </div>
      <div className={styles.optionBody}>{children}</div>
      {to && cta && (
        <Link className={styles.optionLink} to={to}>
          {cta}
          <Icon name="arrow-right" size={15} />
        </Link>
      )}
    </div>
  );
}

/** Where to go next: a grid of link cards. */
export function Links({children}: Children): ReactNode {
  return <div className={styles.links}>{children}</div>;
}

export function LinkCard({
  to,
  title,
  description,
}: {
  to: string;
  title: string;
  description?: string;
}): ReactNode {
  return (
    <Link className={styles.linkCard} to={to}>
      <span className={styles.linkCardText}>
        <b className={styles.linkCardTitle}>{title}</b>
        {description && (
          <span className={styles.linkCardDesc}>{description}</span>
        )}
      </span>
      <Icon name="arrow-right" size={16} className={styles.linkCardArrow} />
    </Link>
  );
}
