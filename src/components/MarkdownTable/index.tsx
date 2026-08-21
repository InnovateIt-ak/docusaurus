import {
  Children,
  isValidElement,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './styles.module.css';

type Props = ComponentProps<'table'>;

// Below this many data rows a search box is more furniture than help: the reader
// can already see the whole table.
const MIN_ROWS_FOR_TOOLBAR = 6;

/** Flattens a cell's React subtree to the text a reader would see. */
function toText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(toText).join('');
  }
  if (isValidElement(node)) {
    return toText((node.props as {children?: ReactNode}).children);
  }
  return '';
}

// Fold case and strip accents so "délégation" matches "delegation" and "DELE".
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function childrenOf(node: ReactNode): ReactElement[] {
  if (!isValidElement(node)) {
    return [];
  }
  return Children.toArray((node.props as {children?: ReactNode}).children).filter(
    isValidElement,
  ) as ReactElement[];
}

/**
 * Markdown gives us `<table><thead><tr>…</tr></thead><tbody><tr>…</tr>…</tbody>`.
 * The rows are kept as the elements MDX built — only which of them render is
 * decided here — so links, code spans and formatting inside cells are untouched.
 */
function readTable(children: ReactNode): {
  head: ReactElement | null;
  bodies: {element: ReactElement; rows: ReactElement[]}[];
} {
  let head: ReactElement | null = null;
  const bodies: {element: ReactElement; rows: ReactElement[]}[] = [];

  for (const section of Children.toArray(children)) {
    if (!isValidElement(section)) {
      continue;
    }
    if (section.type === 'thead') {
      head = section;
    } else if (section.type === 'tbody') {
      bodies.push({element: section, rows: childrenOf(section)});
    }
  }
  return {head, bodies};
}

/**
 * Wraps a markdown table with a search box.
 *
 * The unfiltered table is what renders on the server and on first paint, so the
 * hydrated markup matches — and so the PDF, which never runs this component's
 * interactions, still contains every row. The toolbar carries `pdf-hide`.
 */
export default function MarkdownTable({children, ...props}: Props): ReactNode {
  const [query, setQuery] = useState('');

  const {head, bodies} = useMemo(() => readTable(children), [children]);

  // One flat list of every body row, paired with its cell text folded for
  // search. Cells are joined with a space so a term cannot match across the
  // boundary between two of them.
  const rows = useMemo(
    () =>
      bodies.flatMap((body, bodyIndex) =>
        body.rows.map((row) => ({
          bodyIndex,
          element: row,
          haystack: fold(childrenOf(row).map(toText).join(' ')),
        })),
      ),
    [bodies],
  );

  // Every whitespace-separated term must appear somewhere in the row (AND), so
  // narrowing a wide table is a matter of adding words: "status enum".
  const terms = useMemo(() => fold(query).split(/\s+/).filter(Boolean), [query]);

  const visible = useMemo(
    () =>
      terms.length === 0
        ? rows
        : rows.filter((row) => terms.every((term) => row.haystack.includes(term))),
    [rows, terms],
  );

  // Nothing recognisable as a data table (too few rows, or no header row):
  // render it exactly as it came.
  if (rows.length < MIN_ROWS_FOR_TOOLBAR || head === null) {
    return <table {...props}>{children}</table>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.toolbar} pdf-hide`}>
        <input
          type="search"
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setQuery('');
            }
          }}
          placeholder={translate({
            id: 'theme.table.searchPlaceholder',
            message: 'Search this table…',
            description: 'Placeholder of the search box above a markdown table',
          })}
          aria-label={translate({
            id: 'theme.table.searchLabel',
            message: 'Search this table',
            description: 'Accessible label of the search box above a markdown table',
          })}
        />
        <span className={styles.count} role="status" aria-live="polite">
          {terms.length > 0 ? (
            <Translate
              id="theme.table.matchCount"
              description="Number of table rows matching the search, e.g. 3 / 12 rows"
              values={{shown: visible.length, total: rows.length}}>
              {'{shown} / {total} rows'}
            </Translate>
          ) : (
            <Translate
              id="theme.table.rowCount"
              description="Total number of rows in a table, shown when no search is active"
              values={{total: rows.length}}>
              {'{total} rows'}
            </Translate>
          )}
        </span>
        {terms.length > 0 ? (
          <button type="button" className={styles.reset} onClick={() => setQuery('')}>
            <Translate
              id="theme.table.reset"
              description="Label of the button that clears the search above a markdown table">
              Reset
            </Translate>
          </button>
        ) : null}
      </div>

      <table {...props}>
        {head}
        {bodies.map((body, bodyIndex) => {
          const kept = visible.filter((row) => row.bodyIndex === bodyIndex);
          // Keep whatever attributes the original <tbody> carried, but not its
          // children — those are the rows we are choosing between.
          const {children: _rows, ...bodyProps} = body.element.props as {
            children?: ReactNode;
          };
          return (
            <tbody key={bodyIndex} {...bodyProps}>
              {kept.map((row) => row.element)}
            </tbody>
          );
        })}
      </table>

      {visible.length === 0 ? (
        <p className={`${styles.empty} pdf-hide`} role="status">
          <Translate
            id="theme.table.noResults"
            description="Message shown when a markdown table's search matches no row">
            No rows match.
          </Translate>
        </p>
      ) : null}
    </div>
  );
}
