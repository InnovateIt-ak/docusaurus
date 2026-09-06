import {useEffect, useRef, useState, type ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {RAW_SOURCE_CLASS} from '@site/src/components/RawSource';
import {copyToClipboard} from '@site/src/clipboard';
import {pageTitle, useOpenWebUi} from '@site/src/openWebUi';
import Icon from '@site/src/components/Icon';
import styles from './styles.module.css';

// How long the copy button stays in its "done" state before going back.
const FEEDBACK_MS = 2000;

// A blob URL handed to a new tab is released once that tab has had ample time
// to load it; nothing else ever reads it again.
const BLOB_URL_TTL_MS = 60_000;

/** Reads the page's markdown out of the node the remark plugin left behind. */
function readMarkdown(): string | undefined {
  return document.querySelector<HTMLElement>(`.${RAW_SOURCE_CLASS}`)?.dataset
    .rawMarkdown;
}

/** "M↓" — the markdown mark, drawn like the Lucide icons beside it. */
function MarkdownIcon(): ReactNode {
  return (
    <svg
      className={styles.icon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 15V9l2.4 3L10.8 9v6" strokeWidth="1.7" />
      <path d="M14.6 9v6m0 0 2.2-2.4M14.6 15l-2.2-2.4" strokeWidth="1.7" />
    </svg>
  );
}

/**
 * The page as a PDF.
 *
 * CI (see .github/workflows/deploy.yml) generates one PDF per page and writes
 * it next to the page's HTML as `<route>.pdf` — e.g. the page at `/docs/intro`
 * becomes `/docs/intro.pdf`. `metadata.permalink` already carries the site
 * baseUrl, so appending `.pdf` to it yields the correct, baseUrl-aware URL.
 */
function usePdfHref(): string {
  const {metadata} = useDoc();
  return `${metadata.permalink.replace(/\/$/, '')}.pdf`;
}

/**
 * The page's actions, in a bar under the title and its subtitle: ask a chat
 * model about the page, copy it for one, download it as a PDF, or view it as
 * plain markdown. src/remark/page-actions.mjs puts the bar in every doc's
 * markdown (as `<PageActions />`, resolved by src/theme/MDXComponents), which
 * is why it reads the doc it is on with `useDoc` — it is only ever on one.
 *
 * The PDF is the one CI produced next to the page (`usePdfHref`); a plain <a>,
 * not the Docusaurus <Link>, since a file made after the build must not be
 * validated by the broken-link checker, exactly like the navbar PDF menu
 * (`pathname://`).
 *
 * The three others read the same source, the one the build left in the page
 * (src/remark/raw-source.mjs): the file as the author wrote it, with its
 * `#include`s and diagram references resolved into content, rather than the
 * rendered DOM where diagrams have become data URLs and tables <table>.
 *
 * "Ask about this section" is offered only when an Open WebUI instance is
 * configured (customFields.openWebUiUrl). The page travels inside the link,
 * so a long one is cut to the URL budget and the whole of it put on the
 * clipboard — see src/openWebUi.tsx for why a link to the page would not do.
 *
 * Nothing renders until that source is known to be present, so a page the
 * remark plugin does not cover never shows a button that would do nothing. The
 * check runs after mount, which is also what keeps the server markup and the
 * first client render equal.
 */
export default function PageActions(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const pdfHref = usePdfHref();
  const {base: openWebUi, ask} = useOpenWebUi();
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

  const view = () => {
    const markdown = readMarkdown();
    if (!markdown) {
      return;
    }
    // text/plain rather than text/markdown: browsers display the first and
    // offer to download the second.
    const url = URL.createObjectURL(
      new Blob([markdown], {type: 'text/plain;charset=utf-8'}),
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_TTL_MS);
  };

  const askAbout = () => {
    const markdown = readMarkdown();
    if (!markdown) {
      return;
    }
    const title = pageTitle(siteConfig.title);
    return ask({
      intro:
        `Here is the page "${title}" of the ${siteConfig.title} documentation, ` +
        'as markdown. Read it and give a two-sentence summary; I will then ask ' +
        'questions about it.',
      body: markdown,
    });
  };

  return (
    <div className={`${styles.bar} pdf-hide`}>
      {openWebUi && (
        <button type="button" className={styles.button} onClick={askAbout}>
          <Icon name="sparkles" size={14} className={styles.icon} />
          <Translate
            id="theme.docs.pageActions.ask"
            description="Label of the button that opens a chat about the page in Open WebUI">
            Ask about this section
          </Translate>
        </button>
      )}
      <button type="button" className={styles.button} onClick={copy}>
        <Icon name={copied ? 'check' : 'copy'} size={14} className={styles.icon} />
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
            Copy for LLM
          </Translate>
        )}
      </button>
      <a className={styles.button} href={pdfHref} target="_blank" rel="noopener noreferrer">
        <Icon name="pdf" size={14} className={styles.icon} />
        <Translate
          id="theme.docs.pdfDownload.label"
          description="Label of the per-page PDF download link">
          Download as PDF
        </Translate>
      </a>
      <button type="button" className={styles.button} onClick={view}>
        <MarkdownIcon />
        <Translate
          id="theme.docs.pageActions.view"
          description="Label of the button that opens the page's markdown source in a new tab">
          View as Markdown
        </Translate>
      </button>
    </div>
  );
}
