// Sending things to a self-hosted Open WebUI, shared by the two places that do
// it: the page actions above the title (src/components/PageActions) and the
// caption under each diagram (src/theme/MDXComponents/Img).
//
// What is sent is put *inside* the link rather than linked to, which is the
// unusual choice here: the mature docs sites that offer this (Mintlify, the
// llms.txt plugins) publish each page as markdown at a URL and send only that
// URL. Open WebUI supports it — `?load-url=` fetches a URL and attaches it to
// the chat as a document — and the markdown to serve is already computed at
// build time by src/remark/raw-source.mjs. It would carry a whole page in a
// 200-character link, with none of the budgeting below.
//
// It is not used because the fetch would come from the Open WebUI *host*, not
// from the reader's browser, and this site is a private GitHub Pages: that
// request arrives at a GitHub login page and comes back with no documentation
// in it. Anything link-based fails the same way for as long as the site is
// private, which is also why there is no llms.txt — an index only helps a tool
// that can reach what it indexes.
//
// Putting the text in the link needs no path from the Open WebUI host back
// here, at the cost of a length limit; see `maxUrlLength` below.

import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// The browser would take far more, but a default Open WebUI sits behind
// uvicorn, and usually nginx, both of which stop at roughly 8 KB of request
// line — and a rejected link is worse than a shortened one.
//
// 8 KB is what an unconfigured instance accepts, so it is the default. A page
// whose diagrams and included fragments are all expanded (src/remark/raw-source)
// can easily go past it, and how much more a *particular* instance takes is a
// property of its own proxy — hence `G_OPENWEBUI_MAX_URL` to raise it.
const DEFAULT_MAX_URL_LENGTH = 8000;

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

/** The URL budget for this site, from `G_OPENWEBUI_MAX_URL` or the default. */
function maxUrlLength(configured: unknown): number {
  const value = Number(configured);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_URL_LENGTH;
}

function encodedLength(text: string): number {
  return encodeURIComponent(text).length;
}

/**
 * Longest prefix of `text` whose percent-encoded form fits in `budget`.
 *
 * Encoding expands text by a factor that depends on its content — a newline
 * costs three characters, an accented letter six — so the cut point cannot be
 * computed from the length alone. Binary search finds it in a dozen passes, and
 * the result is pulled back to the last line break so the prompt does not end
 * mid-sentence.
 */
function fitToBudget(text: string, budget: number): {text: string; truncated: boolean} {
  if (encodedLength(text) <= budget) {
    return {text, truncated: false};
  }
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (encodedLength(text.slice(0, mid)) <= budget) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  const cut = text.slice(0, low);
  const lastBreak = cut.lastIndexOf('\n');
  return {
    text: lastBreak > cut.length * 0.5 ? cut.slice(0, lastBreak) : cut,
    truncated: true,
  };
}

export async function copyToClipboard(text: string): Promise<void> {
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

/**
 * The page's own title, without the site name the browser tab appends.
 *
 * Read from the document rather than from `useDoc()`, which throws outside a
 * doc page — an image, and so this module, can render anywhere.
 */
export function pageTitle(siteTitle: string): string {
  const title = typeof document === 'undefined' ? '' : document.title;
  return title.replace(new RegExp(`\\s*\\|\\s*${siteTitle}\\s*$`), '').trim() || title;
}

type Ask = {
  /** The sentence before the material: what this is, and what to do with it. */
  intro: string;
  /** The material itself — markdown, or a fenced diagram source. */
  body: string;
};

/**
 * `base` is null when no instance is configured, which is the signal not to
 * offer the action at all; `ask` opens one with the prompt already submitted.
 */
export function useOpenWebUi(): {base: string | null; ask: (input: Ask) => Promise<void>} {
  const {siteConfig} = useDocusaurusContext();
  const base = openWebUiBase(siteConfig.customFields?.openWebUiUrl);

  // Open WebUI's documented `?q=` parameter sets the first message and submits
  // it. See docs.openwebui.com/features/chat-conversations/chat-features/url-params
  const ask = async ({intro, body}: Ask) => {
    if (!base) {
      return;
    }
    // What the URL costs before any of the material goes in: the destination,
    // the intro, the separators, and the note that may be appended.
    const note =
      '\n\n[This did not fit in the link and was cut here. ' +
      'The whole of it is on the clipboard — paste it if you need the rest.]';
    const overhead = `${base}/?q=`.length + encodedLength(`${intro}\n\n---\n\n${note}`);
    const {text, truncated} = fitToBudget(
      body,
      Math.max(0, maxUrlLength(siteConfig.customFields?.openWebUiMaxUrl) - overhead),
    );

    // Only what was cut needs recovering. Taking the clipboard when the whole
    // thing already went in the link would cost the reader whatever they had
    // there and give nothing back.
    if (truncated) {
      await copyToClipboard(body);
    }

    const prompt = `${intro}\n\n---\n\n${text}${truncated ? note : ''}`;
    window.open(`${base}/?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
  };

  return {base, ask};
}

export function ChatIcon({className}: {className?: string}): ReactNode {
  return (
    <svg
      className={className}
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
