import {useEffect, useRef, useState, type ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {RAW_SOURCE_CLASS} from '@site/src/components/RawSource';
import {ChatIcon, copyToClipboard, useOpenWebUi} from '@site/src/openWebUi';
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
 * Page actions above the document title: copy the page as markdown, or open it
 * in Open WebUI with the markdown already in the prompt.
 *
 * Both read the source the build left in the page (src/remark/raw-source.mjs) —
 * the file as the author wrote it, with its `#include`s and diagram references
 * resolved into content, rather than the rendered DOM where diagrams have
 * become data URLs and tables have become <table>.
 *
 * Nothing renders until that source is known to be present, so a page the
 * remark plugin does not cover never shows buttons that would do nothing. The
 * check runs after mount, which is also what keeps the server markup and the
 * first client render equal.
 */
export default function PageActions(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const {metadata} = useDoc();
  const {base: chatBase, ask} = useOpenWebUi();
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

  const openChat = async () => {
    const markdown = readMarkdown();
    if (!markdown) {
      return;
    }
    await ask({
      intro:
        `Here is the "${metadata.title}" page of the ${siteConfig.title} documentation, ` +
        `in Markdown. Read it, then help me with my questions about it.`,
      body: markdown,
    });
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

      {chatBase ? (
        <button type="button" className={styles.button} onClick={openChat}>
          <ChatIcon className={styles.icon} />
          <Translate
            id="theme.docs.pageActions.openInChat"
            description="Label of the button that opens the page in Open WebUI">
            Open in Open WebUI
          </Translate>
        </button>
      ) : null}
    </div>
  );
}
