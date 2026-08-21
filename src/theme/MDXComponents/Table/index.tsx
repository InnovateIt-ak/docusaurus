import {useEffect, useMemo, useRef, useState} from 'react';
import type {ComponentProps, ReactNode} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './styles.module.css';

type Props = ComponentProps<'table'>;

// Below this many body rows a table is scanned faster by eye than by typing, so
// the filter is not shown at all — it would just be chrome on every small table.
const MIN_ROWS = 8;

// Fold case and strip accents so "délégation" matches "delegation" and "DELE".
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Every whitespace-separated term must appear somewhere in the row (AND), which
// makes narrowing down a wide table a matter of adding words: "status enum".
function matches(rowText: string, terms: string[]): boolean {
  return terms.every((term) => rowText.includes(term));
}

/**
 * Markdown tables with a filter box.
 *
 * The generated API data-model pages (plugins/openapi-schema-doc) carry tables
 * of dozens of fields, and the site's search indexes pages, not rows — so
 * finding one field means reading the whole table. This adds a per-table filter
 * that hides non-matching rows as you type.
 *
 * Filtering is done over the rendered DOM rather than over React children: a
 * cell can hold links, code or `<br />`, and its text content is exactly what a
 * reader is looking at. The table itself is untouched markup, so it renders
 * complete without JavaScript and the filter UI only appears once mounted.
 */
export default function MDXTable(props: Props): ReactNode {
  const tableRef = useRef<HTMLTableElement>(null);
  const [query, setQuery] = useState('');
  // Row texts, collected after mount: 0 until then, which keeps the server and
  // the first client render identical (no filter UI) and hydration-safe.
  const [rowTexts, setRowTexts] = useState<string[]>([]);

  useEffect(() => {
    const rows = tableRef.current?.tBodies[0]?.rows;
    setRowTexts(rows ? Array.from(rows, (row) => fold(row.textContent ?? '')) : []);
  }, [props.children]);

  const terms = useMemo(
    () => fold(query).split(/\s+/).filter(Boolean),
    [query],
  );

  const visible = useMemo(
    () => rowTexts.map((text) => terms.length === 0 || matches(text, terms)),
    [rowTexts, terms],
  );

  // Apply to the DOM rather than re-rendering the table: the rows are MDX
  // children we do not own, and toggling `display` leaves them otherwise intact.
  useEffect(() => {
    const rows = tableRef.current?.tBodies[0]?.rows;
    if (!rows) {
      return;
    }
    for (let i = 0; i < rows.length; i += 1) {
      rows[i].style.display = visible[i] === false ? 'none' : '';
    }
  }, [visible]);

  const total = rowTexts.length;
  const shown = visible.filter(Boolean).length;
  const filtering = terms.length > 0;

  return (
    <div className={styles.wrapper}>
      {total >= MIN_ROWS && (
        <div className={`${styles.toolbar} pdf-hide`}>
          <input
            className={styles.input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setQuery('');
              }
            }}
            placeholder={translate({
              id: 'theme.table.filterPlaceholder',
              message: 'Filtrer les lignes…',
              description: 'Placeholder of the filter box shown above a large table',
            })}
            aria-label={translate({
              id: 'theme.table.filterLabel',
              message: 'Filtrer les lignes du tableau',
              description: 'Accessible label of the filter box shown above a large table',
            })}
          />
          <span className={styles.count} role="status" aria-live="polite">
            {filtering ? (
              <Translate
                id="theme.table.filterCount"
                description="Number of table rows matching the filter, e.g. 3 / 12 lignes"
                values={{shown, total}}>
                {'{shown} / {total} lignes'}
              </Translate>
            ) : (
              <Translate
                id="theme.table.rowCount"
                description="Total number of rows in a table, shown when no filter is applied"
                values={{total}}>
                {'{total} lignes'}
              </Translate>
            )}
          </span>
        </div>
      )}

      <table {...props} ref={tableRef} />

      {filtering && shown === 0 && (
        <p className={`${styles.empty} pdf-hide`}>
          <Translate
            id="theme.table.filterNoResult"
            description="Message shown when no table row matches the filter">
            Aucune ligne ne correspond.
          </Translate>
        </p>
      )}
    </div>
  );
}
