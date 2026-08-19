import {useEffect, useRef, useState, type ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {RAW_SOURCE_CLASS} from '@site/src/components/RawSource';
import styles from './styles.module.css';

// How long the copy button stays in its "done" state before going back.
const FEEDBACK_MS = 2000;

// The page is put *inside* the link rather than linked to. Open WebUI can fetch
// a URL itself (`load-url=`), and being self-hosted it can reach this site — but
// what it would fetch is the rendered page: navigation, sidebar, footer, and
// diagrams as data-URL images. The markdown source makes a far better prompt,
// and sending it needs no network path from the Open WebUI host back to this
// one.
//
// That costs a length limit. The browser would take far more, but a default
// Open WebUI sits behind uvicorn, and usually nginx, both of which stop at
// roughly 8 KB of request line — and a rejected link is worse than a shortened
// one. A page that does not fit is cut, and the full text goes to the clipboard
// so the reader can paste the rest.
const MAX_URL_LENGTH = 8000;

/**
 * Base URL of the Open WebUI instance, or null when there is none.
 *
 * A self-hosted instance has no fixed address, so it comes from
 * `G_OPENWEBUI_URL` (customFields.openWebUiUrl). Unset, the action is simply
 * not offered — there is no sensible default to guess.
 */
function openWebUiBase(configured: unknown): string | null {
  if (typeof configured !== 'string' || !configured.trim()) {
    return null;
  }
  return configured.trim().replace(/\/+$/, '');
}

function encodedLength(text: string): number {
  return encodeURIComponent(text).length;
}

/**
 * Longest prefix of `markdown` whose percent-encoded form fits in `budget`.
 *
 * Encoding expands text by a factor that depends on its content — a newline
 * costs three characters, an accented letter six — so the cut point cannot be
 * computed from the length alone. Binary search finds it in a dozen passes, and
 * the result is pulled back to the last line break so the prompt does not end
 * mid-sentence.
 */
function fitToBudget(markdown: string, budget: number): {text: string; truncated: boolean} {
  if (encodedLength(markdown) <= budget) {
    return {text: markdown, truncated: false};
  }
  let low = 0;
  let high = markdown.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (encodedLength(markdown.slice(0, mid)) <= budget) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  const cut = markdown.slice(0, low);
  const lastBreak = cut.lastIndexOf('\n');
  return {
    text: lastBreak > cut.length * 0.5 ? cut.slice(0, lastBreak) : cut,
    truncated: true,
  };
}

/** Reads the page's markdown out of the node the remark plugin left behind. */
function readMarkdown(): string | undefined {
  return document.querySelector<HTMLElement>(`.${RAW_SOURCE_CLASS}`)?.dataset
    .rawMarkdown;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard access is denied outside a secure context (plain http, which is
    // how the site is served in the dev container). Fall back to a
    // selection-based copy rather than doing nothing.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
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

function ChatIcon(): ReactNode {
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
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />
    </svg>
  );
}

/**
 * Page actions above the document title: copy the page as markdown, or open it
 * in Open WebUI with the markdown already in the prompt.
 *
 * Both read the source the build left in the page (src/remark/raw-source.mjs) —
 * the file as the author wrote it, not the rendered DOM, where diagrams have
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
  const chatBase = openWebUiBase(siteConfig.customFields?.openWebUiUrl);
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

  // Open WebUI's documented `?q=` parameter sets the first message and submits
  // it. See docs.openwebui.com/features/chat-conversations/chat-features/url-params
  const openChat = async () => {
    const markdown = readMarkdown();
    if (!markdown || !chatBase) {
      return;
    }

    const intro =
      `Here is the "${metadata.title}" page of the ${siteConfig.title} documentation, ` +
      `in Markdown. Read it, then help me with my questions about it.`;
    // What the URL costs before any of the page goes in: the destination, the
    // intro, the separators, and the note that may be appended.
    const note =
      '\n\n[The page did not fit in this link and was cut here. ' +
      'The whole page is on the clipboard — paste it if you need the rest.]';
    const overhead =
      `${chatBase}/?q=`.length + encodedLength(`${intro}\n\n---\n\n${note}`);
    const {text, truncated} = fitToBudget(
      markdown,
      Math.max(0, MAX_URL_LENGTH - overhead),
    );

    // Always put the whole page on the clipboard, so a truncated prompt can be
    // completed by pasting and nothing is silently lost.
    await copyToClipboard(markdown);

    const prompt = `${intro}\n\n---\n\n${text}${truncated ? note : ''}`;
    window.open(
      `${chatBase}/?q=${encodeURIComponent(prompt)}`,
      '_blank',
      'noopener,noreferrer',
    );
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
          <ChatIcon />
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
