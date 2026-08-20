import {useEffect, useRef, useState, type ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import {RAW_SOURCE_CLASS} from '@site/src/components/RawSource';
import {copyToClipboard} from '@site/src/clipboard';
import styles from './styles.module.css';

// How long the copy button stays in its "done" state before going back.
const FEEDBACK_MS = 2000;

/** Reads the page's markdown out of the node the remark plugin left behind. */
function readMarkdown(): string | undefined {
  return document.querySelector<HTMLElement>(`.${RAW_SOURCE_CLASS}`)?.dataset
    .rawMarkdown;
}

function CopyIcon(): ReactNode {
  return (
    <svg
      className={styles.icon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg
      className={styles.icon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Copies the page as markdown, from above the document title.
 *
 * The source is the one the build left in the page (src/remark/raw-source.mjs):
 * the file as the author wrote it, with its `#include`s and diagram references
 * resolved into content, rather than the rendered DOM where diagrams have
 * become data URLs and tables have become <table>.
 *
 * An "Open in Open WebUI" button sat here too, sending the whole page. It was
 * dropped in favour of the per-diagram button in the caption
 * (src/theme/MDXComponents/Img): a page arrives as a wall of prose the model
 * has to find the diagram in, and one long enough to matter does not fit in the
 * URL anyway. What remains is the clipboard, which has no such limit.
 *
 * Nothing renders until that source is known to be present, so a page the
 * remark plugin does not cover never shows a button that would do nothing. The
 * check runs after mount, which is also what keeps the server markup and the
 * first client render equal.
 */
export default function PageActions(): ReactNode {
  const [available, setAvailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setAvailable(readMarkdown() !== undefined);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!available) {
    return null;
  }

  const copy = async () => {
    const markdown = readMarkdown();
    if (!markdown) {
      return;
    }
    await copyToClipboard(markdown);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
  };

  return (
    <div className={`${styles.bar} pdf-hide`}>
      <button type="button" className={styles.button} onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? (
          <Translate
            id="theme.docs.pageActions.copied"
            description="Label of the copy-as-markdown button once the page has been copied">
            Copied
          </Translate>
        ) : (
          <Translate
            id="theme.docs.pageActions.copy"
            description="Label of the button that copies the page's markdown source">
            Copy as Markdown
          </Translate>
        )}
      </button>
    </div>
  );
}
