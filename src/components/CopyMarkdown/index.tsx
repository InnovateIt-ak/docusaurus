import {useEffect, useRef, useState, type ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import {RAW_SOURCE_CLASS} from '@site/src/components/RawSource';
import styles from './styles.module.css';

// How long the button stays in its "done" state before going back.
const FEEDBACK_MS = 2000;

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
 * Copies the page's markdown source — the file as written, not the rendered
 * DOM — to the clipboard. The source is put in the page by
 * src/remark/raw-source.mjs and read back here at click time.
 *
 * The button renders nothing until the carrier is known to be present, so a
 * page built without the remark plugin (or a page type it does not cover) does
 * not get a button that would do nothing. That check has to run after mount,
 * which is also what keeps the server markup and the first client render equal.
 */
export default function CopyMarkdown(): ReactNode {
  const [available, setAvailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setAvailable(document.querySelector(`.${RAW_SOURCE_CLASS}`) !== null);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!available) {
    return null;
  }

  const copy = async () => {
    const carrier = document.querySelector<HTMLElement>(`.${RAW_SOURCE_CLASS}`);
    const markdown = carrier?.dataset.rawMarkdown;
    if (!markdown) {
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Clipboard access is denied outside a secure context (plain http, which
      // is how the site is served in the dev container). Fall back to a
      // selection-based copy rather than doing nothing.
      const area = document.createElement('textarea');
      area.value = markdown;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
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
            id="theme.docs.copyMarkdown.copied"
            description="Label of the copy-as-markdown button once the page has been copied">
            Copied
          </Translate>
        ) : (
          <Translate
            id="theme.docs.copyMarkdown.copy"
            description="Label of the button that copies the page's markdown source">
            Copy as Markdown
          </Translate>
        )}
      </button>
    </div>
  );
}
