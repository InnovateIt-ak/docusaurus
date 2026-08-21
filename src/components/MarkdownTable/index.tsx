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

// Below this many data rows a filter bar is more furniture than help: the reader
// can already see the whole table.
const MIN_ROWS_FOR_TOOLBAR = 6;

// A column earns a dropdown when its values repeat — a status or an owner, not a
// description. Too many distinct values and the dropdown is just a longer list
// than the table; too few (one) and it filters nothing. Long values are excluded
// as well: a sentence makes an unreadable option, however few of them there are.
const MAX_CHOICES_PER_COLUMN = 12;
const MAX_DISTINCT_RATIO = 0.6;
const MAX_CHOICE_LENGTH = 32;

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

type ColumnChoice = {index: number; label: string; values: string[]};

function columnChoices(headers: string[], cells: string[][]): ColumnChoice[] {
  const choices: ColumnChoice[] = [];
  for (let index = 0; index < headers.length; index += 1) {
    const values = new Set<string>();
    let tooLong = false;
    for (const row of cells) {
      const value = row[index]?.trim();
      if (value) {
        if (value.length > MAX_CHOICE_LENGTH) {
          tooLong = true;
          break;
        }
        values.add(value);
      }
    }
    const withinBudget =
      !tooLong &&
      values.size > 1 &&
      values.size <= MAX_CHOICES_PER_COLUMN &&
      values.size <= cells.length * MAX_DISTINCT_RATIO;
    if (withinBudget) {
      choices.push({
        index,
        label: headers[index] || `#${index + 1}`,
        values: [...values].sort((a, b) => a.localeCompare(b)),
      });
    }
  }
  return choices;
}

/**
 * Wraps a markdown table with a search box and per-column dropdowns.
 *
 * The unfiltered table is what renders on the server and on first paint, so the
 * hydrated markup matches — and so the PDF, which never runs this component's
 * interactions, still contains every row. The toolbar carries `pdf-hide`.
 */
export default function MarkdownTable({children, ...props}: Props): ReactNode {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<number, string>>({});

  const {head, bodies} = useMemo(() => readTable(children), [children]);

  const headers = useMemo(
    () => childrenOf(childrenOf(head)[0]).map((cell) => toText(cell).trim()),
    [head],
  );

  // One flat list of every body row, each paired with its cells as plain text —
  // once as displayed (for the dropdowns) and once folded (for the search).
  const rows = useMemo(
    () =>
      bodies.flatMap((body, bodyIndex) =>
        body.rows.map((row, rowIndex) => {
          const cells = childrenOf(row).map((cell) => toText(cell).trim());
          return {
            key: `${bodyIndex}-${rowIndex}`,
            bodyIndex,
            element: row,
            cells,
            haystack: fold(cells.join(' ')),
          };
        }),
      ),
    [bodies],
  );

  const choices = useMemo(
    () => columnChoices(headers, rows.map((row) => row.cells)),
    [headers, rows],
  );

  // Every whitespace-separated term must appear somewhere in the row (AND), so
  // narrowing a wide table is a matter of adding words: "status enum".
  const terms = useMemo(() => fold(query).split(/\s+/).filter(Boolean), [query]);

  const activeColumns = useMemo(
    () => Object.entries(selected).filter(([, value]) => value),
    [selected],
  );

  const filtering = terms.length > 0 || activeColumns.length > 0;

  const visible = useMemo(() => {
    if (!filtering) {
      return rows;
    }
    return rows.filter((row) => {
      for (const [index, value] of activeColumns) {
        if (row.cells[Number(index)] !== value) {
          return false;
        }
      }
      return terms.every((term) => row.haystack.includes(term));
    });
  }, [rows, terms, activeColumns, filtering]);

  // Nothing recognisable as a data table (no rows, or a layout table): render it
  // exactly as it came.
  if (rows.length < MIN_ROWS_FOR_TOOLBAR || headers.length === 0) {
    return <table {...props}>{children}</table>;
  }

  const reset = () => {
    setQuery('');
    setSelected({});
  };

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
        {choices.map((choice) => (
          <select
            key={choice.index}
            className={styles.select}
            value={selected[choice.index] ?? ''}
            aria-label={choice.label}
            onChange={(event) =>
              setSelected((current) => ({
                ...current,
                [choice.index]: event.target.value,
              }))
            }>
            <option value="">{choice.label}</option>
            {choice.values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ))}
        <span className={styles.count} role="status" aria-live="polite">
          {filtering ? (
            <Translate
              id="theme.table.matchCount"
              description="Number of table rows matching the filters, e.g. 3 / 12 rows"
              values={{shown: visible.length, total: rows.length}}>
              {'{shown} / {total} rows'}
            </Translate>
          ) : (
            <Translate
              id="theme.table.rowCount"
              description="Total number of rows in a table, shown when no filter is applied"
              values={{total: rows.length}}>
              {'{total} rows'}
            </Translate>
          )}
        </span>
        {filtering ? (
          <button type="button" className={styles.reset} onClick={reset}>
            <Translate
              id="theme.table.reset"
              description="Label of the button that clears the filters above a markdown table">
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
            description="Message shown when a markdown table's filters match no row">
            No rows match.
          </Translate>
        </p>
      ) : null}
    </div>
  );
}
