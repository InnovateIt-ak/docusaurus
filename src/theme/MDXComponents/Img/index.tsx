import {useState, type ComponentProps, type MouseEvent, type ReactNode} from 'react';
import Img from '@theme-original/MDXComponents/Img';
import CodeBlock from '@theme/CodeBlock';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

// The remark plugins that render PlantUML/Mermaid at build time attach the
// diagram's own source to the <img> (see src/remark/*-inline.mjs), so the
// rendered picture can be flipped back to the code it came from.
type Props = ComponentProps<'img'> & {
  'data-diagram-source'?: string;
  'data-diagram-lang'?: string;
};

// Mermaid/PlantUML diagrams are rendered at build time as inline SVG data URLs.
// The alt text authors write is unreliable, so a diagram is detected from its
// data:image/svg source (or a known diagram alt as a fallback).
const DIAGRAM_ALTS = new Set(['Mermaid diagram', 'PlantUML diagram']);

function isDiagram(src: string, alt: string | undefined): boolean {
  return src.startsWith('data:image/svg') || (alt != null && DIAGRAM_ALTS.has(alt));
}

// A data URL has no filename, so the browser would save it as "download".
// Give the downloaded file a sensible name and extension instead.
function downloadName(src: string, alt: string | undefined): string | true {
  if (isDiagram(src, alt)) {
    return 'diagram.svg';
  }
  if (src.startsWith('data:')) {
    const mime = /^data:([^;,]+)/.exec(src)?.[1];
    const ext = mime?.split('/')[1]?.split('+')[0];
    return ext ? `image.${ext}` : true;
  }
  // A real URL already carries a filename; let the browser use it.
  return true;
}

// Browsers block top-level navigation to a `data:` URL (an anti-phishing
// mitigation), so left-clicking "open" on an inline-SVG diagram does nothing —
// only the browser's own "open in new tab" works. Re-materialise the data URL
// as a Blob and open that instead, which is not blocked. Real URLs are left to
// the anchor's default behaviour.
function openInNewTab(
  event: MouseEvent<HTMLAnchorElement>,
  src: string,
): void {
  if (!src.startsWith('data:')) {
    return;
  }
  event.preventDefault();
  const comma = src.indexOf(',');
  const meta = src.slice(5, comma); // between "data:" and ","
  const mime = meta.split(';')[0] || 'application/octet-stream';
  const isBase64 = /;base64/i.test(meta);
  const raw = src.slice(comma + 1);
  const text = isBase64 ? atob(raw) : decodeURIComponent(raw);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i);
  }
  const url = URL.createObjectURL(new Blob([bytes], {type: mime}));
  window.open(url, '_blank', 'noopener,noreferrer');
  // Give the new tab time to load before releasing the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Thin, monochrome line icons that inherit the link colour (currentColor) and
// stay understated next to the label. 14px, 1.5 stroke.
function OpenIcon(): ReactNode {
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
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8" />
      <path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </svg>
  );
}

function DownloadIcon(): ReactNode {
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
      <path d="M12 4v10" />
      <path d="M8 11l4 3 4-3" />
      <path d="M5 19h14" />
    </svg>
  );
}

function CodeIcon(): ReactNode {
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
      <path d="M9 7l-5 5 5 5" />
      <path d="M15 7l5 5-5 5" />
    </svg>
  );
}

function ImageIcon(): ReactNode {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5-6 6" />
    </svg>
  );
}

// Adds a small caption under each image with a link to download it — including
// build-time diagrams, so a reader can grab the SVG. Structured with <span>s
// (not <figure>/<figcaption>) because a markdown image renders as <p><img></p>,
// and a block <figure> inside a <p> is invalid and breaks hydration —
// inline-level spans styled as blocks stay valid.
export default function ImgWrapper({
  'data-diagram-source': diagramSource,
  'data-diagram-lang': diagramLang,
  ...props
}: Props): ReactNode {
  // The source lives on the <img> only to travel from the build to the browser.
  // It is read here and dropped from the props, so the same few kilobytes are
  // not also emitted as an attribute on every diagram in the page.
  const [showSource, setShowSource] = useState(false);
  const src = typeof props.src === 'string' ? props.src : undefined;
  const alt = typeof props.alt === 'string' ? props.alt : undefined;

  if (!src) {
    return <Img {...props} />;
  }

  // A diagram's alt ("Mermaid diagram", or whatever the author typed) is an
  // implementation detail, so it is not shown as a caption label — only the
  // download link is. Real content images keep their alt as the caption text.
  const diagram = isDiagram(src, alt);
  const label = !diagram && alt ? alt : undefined;

  return (
    // `md-figure` is a stable, non-hashed hook for the PDF stylesheet, which is
    // written against the built HTML and cannot know the CSS-module class name.
    <span
      className={`${styles.figure} md-figure${
        showSource && diagramSource ? ` ${styles.figureSource}` : ''
      }`}>
      {showSource && diagramSource ? (
        <span className={styles.source}>
          {/* Prism ships no plantuml or mermaid grammar, so the language is
              recorded on the block for styling/copy but not highlighted. */}
          <CodeBlock language={diagramLang ?? 'text'}>{diagramSource}</CodeBlock>
        </span>
      ) : (
        <Img {...props} />
      )}
      <span className={styles.caption}>
        {label ? (
          <span className={styles.alt}>{label}</span>
        ) : (
          <span className={styles.spacer} />
        )}
        <span className={`${styles.actions} pdf-hide`}>
          {diagramSource ? (
            <button
              type="button"
              className={styles.action}
              aria-pressed={showSource}
              onClick={() => setShowSource((shown) => !shown)}>
              {showSource ? <ImageIcon /> : <CodeIcon />}
              {showSource ? (
                <Translate
                  id="theme.image.showDiagram"
                  description="Label of the button that switches a diagram's source back to the rendered image">
                  Diagram
                </Translate>
              ) : (
                <Translate
                  id="theme.image.showSource"
                  description="Label of the button that switches a rendered diagram to its source code">
                  Source
                </Translate>
              )}
            </button>
          ) : null}
          <a
            className={styles.action}
            href={src}
            onClick={(event) => openInNewTab(event, src)}
            target="_blank"
            rel="noopener noreferrer">
            <OpenIcon />
            <Translate
              id="theme.image.openLink"
              description="Label of the link that opens an image or diagram in a new tab">
              Open
            </Translate>
          </a>
          <a
            className={styles.action}
            href={src}
            download={downloadName(src, alt)}
            target="_blank"
            rel="noopener noreferrer">
            <DownloadIcon />
            <Translate
              id="theme.image.downloadLink"
              description="Label of the download link shown under an image or diagram">
              Download
            </Translate>
          </a>
        </span>
      </span>
    </span>
  );
}
