import {useState, type ReactNode} from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {translate} from '@docusaurus/Translate';
import {
  useCodeBlockContext,
  CodeBlockContextProvider,
} from '@docusaurus/theme-common/internal';
import Container from '@theme/CodeBlock/Container';
import Content from '@theme/CodeBlock/Content';
import CopyButton from '@theme/CodeBlock/Buttons/CopyButton';
import WordWrapButton from '@theme/CodeBlock/Buttons/WordWrapButton';
import Button from '@theme/CodeBlock/Buttons/Button';
import type {Props} from '@theme/CodeBlock/Layout';
import styles from './styles.module.css';

// Long code blocks are collapsed to this many lines, with a button to expand.
// Keeps a page of long shell scripts / configs readable at a glance.
const COLLAPSE_THRESHOLD = 16;

// Languages for which a language badge adds nothing (plain text blocks).
const BADGELESS_LANGUAGES = new Set(['text', 'plain', 'none', '']);

// A small coloured chip per language (label + brand-ish colour), shown next to
// the filename — the "pheralb/code-blocks" look, kept understated. Unknown
// languages fall back to a neutral chip built from the language name, so no
// language ever goes unlabelled.
const LANGUAGE_CHIPS: Record<string, {label: string; bg: string; fg: string}> = {
  js: {label: 'JS', bg: '#f7df1e', fg: '#111'},
  jsx: {label: 'JS', bg: '#f7df1e', fg: '#111'},
  javascript: {label: 'JS', bg: '#f7df1e', fg: '#111'},
  ts: {label: 'TS', bg: '#3178c6', fg: '#fff'},
  tsx: {label: 'TS', bg: '#3178c6', fg: '#fff'},
  typescript: {label: 'TS', bg: '#3178c6', fg: '#fff'},
  bash: {label: '$', bg: '#4eaa25', fg: '#fff'},
  sh: {label: '$', bg: '#4eaa25', fg: '#fff'},
  shell: {label: '$', bg: '#4eaa25', fg: '#fff'},
  zsh: {label: '$', bg: '#4eaa25', fg: '#fff'},
  json: {label: '{ }', bg: '#cbcb41', fg: '#111'},
  yaml: {label: 'YML', bg: '#cb171e', fg: '#fff'},
  yml: {label: 'YML', bg: '#cb171e', fg: '#fff'},
  php: {label: 'PHP', bg: '#777bb4', fg: '#fff'},
  sql: {label: 'SQL', bg: '#e38c00', fg: '#fff'},
  css: {label: 'CSS', bg: '#563d7c', fg: '#fff'},
  html: {label: '<>', bg: '#e34c26', fg: '#fff'},
  markup: {label: '<>', bg: '#e34c26', fg: '#fff'},
  md: {label: 'MD', bg: '#519aba', fg: '#fff'},
  mdx: {label: 'MD', bg: '#519aba', fg: '#fff'},
  markdown: {label: 'MD', bg: '#519aba', fg: '#fff'},
  py: {label: 'PY', bg: '#3572a5', fg: '#fff'},
  python: {label: 'PY', bg: '#3572a5', fg: '#fff'},
  docker: {label: 'DK', bg: '#2496ed', fg: '#fff'},
  dockerfile: {label: 'DK', bg: '#2496ed', fg: '#fff'},
  make: {label: 'MK', bg: '#6d8086', fg: '#fff'},
  makefile: {label: 'MK', bg: '#6d8086', fg: '#fff'},
};

function getLanguageChip(
  language: string,
): {label: string; bg?: string; fg?: string} | null {
  if (BADGELESS_LANGUAGES.has(language)) {
    return null;
  }
  const known = LANGUAGE_CHIPS[language.toLowerCase()];
  if (known) {
    return known;
  }
  // Neutral fallback: first few letters, coloured by the theme (no inline bg).
  return {label: language.slice(0, 3).toUpperCase()};
}

// A small "line numbers" glyph (three rows, each with a leading tick) that
// inherits currentColor, matching the understated icons used elsewhere.
function LineNumbersIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M4 6h1M4 12h1M4 18h1" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </svg>
  );
}

function ChevronIcon({expanded}: {expanded: boolean}): ReactNode {
  return (
    <svg
      className={clsx(styles.chevron, expanded && styles.chevronUp)}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Toggles line numbers on/off. It works by re-providing the code-block context
// with a modified `lineNumbersStart`: `<Content/>` reads that value to decide
// whether to render the numbering, so flipping it re-renders live.
function LineNumbersButton({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}): ReactNode {
  const title = translate({
    id: 'theme.CodeBlock.lineNumbersToggle',
    message: 'Toggle line numbers',
    description: 'The title of the toggle line numbers button of a code block',
  });
  return (
    <Button
      onClick={onToggle}
      className={clsx(styles.actionButton, enabled && styles.actionButtonActive)}
      aria-label={title}
      aria-pressed={enabled}
      title={title}>
      <LineNumbersIcon />
    </Button>
  );
}

// Swizzled to enrich every code block with a persistent header (filename +
// language badge + always-visible actions), a line-numbers toggle, and
// collapsing for long blocks. The syntax highlighting and word-wrap/copy
// buttons remain the stock Docusaurus components — only the composition and the
// two extra affordances are ours, so blocks authored in Markdown gain all of
// this without any change to the docs.
export default function CodeBlockLayout({className}: Props): ReactNode {
  const {metadata, wordWrap} = useCodeBlockContext();

  // The line-numbers toggle starts from whatever the block itself declared
  // (```js showLineNumbers), then the reader can flip it either way.
  const [showLineNumbers, setShowLineNumbers] = useState(
    metadata.lineNumbersStart !== undefined,
  );

  // Trailing newline shouldn't inflate the count and trigger a needless collapse.
  const lineCount = metadata.code.replace(/\n$/, '').split('\n').length;
  const collapsible = lineCount > COLLAPSE_THRESHOLD;
  const [collapsed, setCollapsed] = useState(collapsible);

  const language = metadata.language;
  const chip = typeof language === 'string' ? getLanguageChip(language) : null;
  const hasTitle = metadata.title !== undefined && metadata.title !== '';
  // Left label: the filename when given, otherwise the language name (only when
  // it carries a chip, so plain-text blocks stay clean).
  const fileLabel = hasTitle ? metadata.title : chip ? language : null;

  // Same metadata, with line numbering forced to match the toggle. `<Content/>`
  // re-renders from this nested context; `wordWrap` is passed through unchanged
  // so its ref and the WordWrapButton keep working.
  const effectiveMetadata = {
    ...metadata,
    lineNumbersStart: showLineNumbers ? metadata.lineNumbersStart ?? 1 : undefined,
  };

  const expandLabel = collapsed
    ? translate(
        {
          id: 'theme.CodeBlock.showMore',
          message: 'Show {count} more lines',
          description: 'Label of the button that expands a collapsed code block',
        },
        {count: lineCount - COLLAPSE_THRESHOLD},
      )
    : translate({
        id: 'theme.CodeBlock.showLess',
        message: 'Show less',
        description: 'Label of the button that collapses an expanded code block',
      });

  return (
    <Container as="div" className={clsx(styles.card, className, metadata.className)}>
      <div className={styles.header}>
        <span className={styles.file}>
          {chip && (
            <span
              className={styles.chip}
              style={chip.bg ? {background: chip.bg, color: chip.fg} : undefined}>
              {chip.label}
            </span>
          )}
          {fileLabel !== null && <span className={styles.name}>{fileLabel}</span>}
        </span>
        {/* Interactive buttons are not server-rendered (matching stock behaviour). */}
        <BrowserOnly>
          {() => (
            <span className={styles.actions}>
              <LineNumbersButton
                enabled={showLineNumbers}
                onToggle={() => setShowLineNumbers((value) => !value)}
              />
              <WordWrapButton className={styles.actionButton} />
              <CopyButton className={styles.actionButton} />
            </span>
          )}
        </BrowserOnly>
      </div>

      <CodeBlockContextProvider metadata={effectiveMetadata} wordWrap={wordWrap}>
        <div className={clsx(styles.content, collapsed && styles.collapsed)}>
          <Content />
          {collapsed && <div className={styles.fade} aria-hidden="true" />}
        </div>
      </CodeBlockContextProvider>

      {collapsible && (
        <button
          type="button"
          className={styles.expand}
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}>
          <ChevronIcon expanded={!collapsed} />
          {expandLabel}
        </button>
      )}
    </Container>
  );
}
