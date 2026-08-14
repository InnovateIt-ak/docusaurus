import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import Link from '@docusaurus/Link';
import Icon from '@site/src/components/Icon';
import styles from './styles.module.css';

type Item = {title: string; permalink: string; description?: string};

const MAX_RESULTS = 8;

// Score a doc against the query: title prefix > title substring > description.
function score(item: Item, q: string): number {
  const title = item.title.toLowerCase();
  const desc = (item.description ?? '').toLowerCase();
  if (title.startsWith(q)) return 3;
  if (title.includes(q)) return 2;
  if (desc.includes(q)) return 1;
  return -1;
}

// A ⌘K command palette: fuzzy-jump to any doc page, with a fallback that hands
// the query to the site's full-text search page (/search). Mounted once for the
// whole app via the swizzled theme/Root.
//
// Navigation goes through Docusaurus's <Link> (not history.push) so the site
// baseUrl and client-side routing are handled exactly like every other link —
// permalinks already carry the baseUrl. Keyboard "Enter" clicks the active row.
export default function CommandPalette(): ReactNode {
  const data = usePluginData('docusaurus-plugin-command-palette') as
    | {items?: Item[]}
    | undefined;
  const items = useMemo(() => data?.items ?? [], [data]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, MAX_RESULTS);
    return items
      .map((it) => ({it, s: score(it, q)}))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((x) => x.it);
  }, [items, query]);

  // The full-text search fallback is a virtual row appended after the results;
  // its index equals results.length.
  const hasSearchRow = query.trim().length > 0;
  const rowCount = results.length + (hasSearchRow ? 1 : 0);

  useEffect(() => setActive(0), [query, open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Global open/close shortcut: ⌘K / Ctrl-K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus the input on open; restore focus to the trigger on close.
  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement;
      inputRef.current?.focus();
    } else {
      restoreRef.current?.focus?.();
    }
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (rowCount ? (a + 1) % rowCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (rowCount ? (a - 1 + rowCount) % rowCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Trigger the active row's <Link> so baseUrl + SPA routing are applied.
      rowRefs.current[active]?.click();
    }
  };

  return (
    <div
      className={styles.overlay}
      role="button"
      tabIndex={-1}
      aria-label="Close command palette"
      onClick={close}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}>
        <div className={styles.inputRow}>
          <Icon name="search" size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search pages"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <ul className={styles.results} role="listbox" aria-label="Results">
          {results.map((it, i) => (
            <li key={it.permalink} role="option" aria-selected={active === i}>
              <Link
                ref={(el: HTMLAnchorElement | null) => {
                  rowRefs.current[i] = el;
                }}
                to={it.permalink}
                className={active === i ? styles.rowActive : styles.row}
                onMouseMove={() => setActive(i)}
                onClick={close}>
                <Icon name="file-text" size={16} className={styles.rowIcon} />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{it.title}</span>
                  {it.description ? (
                    <span className={styles.rowDesc}>{it.description}</span>
                  ) : null}
                </span>
                {active === i && <kbd className={styles.kbd}>↵</kbd>}
              </Link>
            </li>
          ))}

          {hasSearchRow && (
            <li role="option" aria-selected={active === results.length}>
              <Link
                ref={(el: HTMLAnchorElement | null) => {
                  rowRefs.current[results.length] = el;
                }}
                to={`/search?q=${encodeURIComponent(query.trim())}`}
                className={active === results.length ? styles.rowActive : styles.row}
                onMouseMove={() => setActive(results.length)}
                onClick={close}>
                <Icon name="search" size={16} className={styles.rowIcon} />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>
                    Search “{query.trim()}” in all pages
                  </span>
                </span>
                {active === results.length && <kbd className={styles.kbd}>↵</kbd>}
              </Link>
            </li>
          )}

          {rowCount === 0 && (
            <li className={styles.empty}>No page matches “{query.trim()}”.</li>
          )}
        </ul>

        <div className={styles.footer}>
          <span>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd> to navigate
          </span>
          <span>
            <kbd className={styles.kbd}>↵</kbd> to open
          </span>
          <span>
            <kbd className={styles.kbd}>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
