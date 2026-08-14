import {useEffect, useState, type ReactNode} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import Icon from '@site/src/components/Icon';
import styles from './styles.module.css';

type Props = {
  editUrl?: string;
  lastUpdatedAt?: number;
  lastUpdatedBy?: string;
};

// Docusaurus stores `lastUpdatedAt` as a Unix timestamp. Historically that has
// been in seconds; guard against a future switch to milliseconds by detecting
// the magnitude (values below ~1e12 are seconds).
function toMillis(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts;
}

// Deterministic absolute date (UTC) — identical on server and client, so it is
// safe to render during SSR/hydration. The relative form is filled in after
// mount to avoid a hydration mismatch (it depends on "now").
function absoluteDate(ms: number): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(ms));
}

function relativeDate(ms: number): string {
  const seconds = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (abs >= secs) return rtf.format(Math.round(seconds / secs), unit);
  }
  return rtf.format(seconds, 'second');
}

// An enriched "provenance" block: when this page was last updated, by whom, and
// a prominent link to edit it on GitHub. The underlying data is already produced
// by Docusaurus (showLastUpdateTime / showLastUpdateAuthor / editUrl); this
// component just surfaces it more legibly than the default footer meta row,
// which is hidden via custom.css.
export default function DocProvenance({
  editUrl,
  lastUpdatedAt,
  lastUpdatedBy,
}: Props): ReactNode {
  const hasDate = typeof lastUpdatedAt === 'number' && Number.isFinite(lastUpdatedAt);
  const ms = hasDate ? toMillis(lastUpdatedAt as number) : 0;

  const [relative, setRelative] = useState<string | null>(null);
  useEffect(() => {
    if (hasDate) setRelative(relativeDate(ms));
  }, [hasDate, ms]);

  if (!hasDate && !lastUpdatedBy && !editUrl) return null;

  return (
    <div className={styles.provenance}>
      <div className={styles.meta}>
        {hasDate && (
          <span className={styles.item}>
            <Icon name="clock" className={styles.icon} />
            <Translate
              id="theme.docs.provenance.updated"
              description="Prefix before the last-updated date in the provenance block">
              Updated
            </Translate>{' '}
            <time
              dateTime={new Date(ms).toISOString()}
              title={absoluteDate(ms)}
              className={styles.strong}>
              {relative ?? absoluteDate(ms)}
            </time>
          </span>
        )}
        {lastUpdatedBy && (
          <span className={styles.item}>
            <Icon name="user" className={styles.icon} />
            <Translate
              id="theme.docs.provenance.by"
              description="Prefix before the last-update author in the provenance block">
              by
            </Translate>{' '}
            <span className={styles.strong}>{lastUpdatedBy}</span>
          </span>
        )}
      </div>
      {editUrl && (
        <a
          className={styles.edit}
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer">
          <Icon name="edit" size={15} />{' '}
          {translate({
            id: 'theme.docs.provenance.edit',
            message: 'Edit this page',
            description: 'Label of the edit-on-GitHub link in the provenance block',
          })}
        </a>
      )}
    </div>
  );
}
