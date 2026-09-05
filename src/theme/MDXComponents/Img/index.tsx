import {
  useEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react';
import Img from '@theme-original/MDXComponents/Img';
import CodeBlock from '@theme/CodeBlock';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {ChatIcon, pageTitle, useOpenWebUi} from '@site/src/openWebUi';
import styles from './styles.module.css';

// The remark plugins that render PlantUML/Mermaid at build time attach the
// diagram's own source to the <img> (see src/remark/*-inline.mjs), so the
// rendered picture can be flipped back to the code it came from.
type Props = ComponentProps<'img'> & {
  'data-diagram-source'?: string;
  'data-diagram-lang'?: string;
  // Set by src/remark/unwrap-diagrams.mjs on diagrams it lifted out of their
  // paragraph. Its presence is the guarantee that this figure may contain block
  // content — see the toggle below.
  'data-diagram-block'?: string;
};

// Mermaid/PlantUML diagrams are rendered at build time as inline SVG data URLs.
// The alt text authors write is unreliable, so a diagram is detected from its
// data:image/svg source (or a known diagram alt as a fallback).
const DIAGRAM_ALTS = new Set(['Mermaid diagram', 'PlantUML diagram']);

// How each diagram language is written in prose, for the sentence that
// introduces the source to the model.
const LANGUAGE_NAMES: Record<string, string> = {
  plantuml: 'PlantUML',
  mermaid: 'Mermaid',
};

/**
 * The sentence sent ahead of a diagram's source, naming what it is and where
 * it comes from.
 *
 * The alt text is used only when the author wrote one: the diagram plugins fill
 * an empty alt with "PlantUML diagram", which names the format and not the
 * diagram, and the language is already being said.
 */
function diagramIntro(
  alt: string | undefined,
  lang: string | undefined,
  siteTitle: string,
): string {
  const language = LANGUAGE_NAMES[lang ?? ''];
  const subject = alt && !DIAGRAM_ALTS.has(alt) ? `the "${alt}" diagram` : 'a diagram';
  return (
    `Here is the ${language ? `${language} ` : ''}source of ${subject} from the ` +
    `"${pageTitle(siteTitle)}" page of the ${siteTitle} documentation. ` +
    `Read it, then help me with my questions about it.`
  );
}

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

function CloseIcon(): ReactNode {
  return (
    <svg
      className={styles.icon}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
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
  'data-diagram-block': diagramBlock,
  ...props
}: Props): ReactNode {
  // The source lives on the <img> only to travel from the build to the browser.
  // It is read here and dropped from the props, so the same few kilobytes are
  // not also emitted as an attribute on every diagram in the page.
  const [showSource, setShowSource] = useState(false);
  // The full-size viewer a diagram opens on click. See the viewer markup at the
  // end of this component for why it is not the site's medium-zoom.
  const [viewing, setViewing] = useState(false);
  const {siteConfig} = useDocusaurusContext();
  // Escape closes the viewer, as any overlay should.
  useEffect(() => {
    if (!viewing) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewing(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [viewing]);
  const {base: chatBase, ask} = useOpenWebUi();
  // The source renders as a CodeBlock, which is `<div><pre>`. A markdown image
  // normally sits inside a `<p>`, and a `<p>` is closed by the parser at its
  // first block child — the server and client trees would disagree and React
  // would drop the subtree. So the toggle is offered only for a diagram that
  // remark lifted to block level, where block content is valid.
  const canShowSource = diagramSource !== undefined && diagramBlock !== undefined;
  // Asking about a diagram only needs its source, not room to render a code
  // block, so it is offered on every diagram that carries one — including the
  // inline ones the source toggle has to skip.
  const canAsk = diagramSource !== undefined && chatBase !== null;
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

  // A lifted diagram is block-level, so the figure may be a <div>; anything else
  // is still inside a <p> and has to stay inline-level.
  const Wrapper = canShowSource ? 'div' : 'span';

  return (
    // `md-figure` is a stable, non-hashed hook for the PDF stylesheet, which is
    // written against the built HTML and cannot know the CSS-module class name.
    <Wrapper
      className={`${styles.figure} md-figure${
        showSource && canShowSource ? ` ${styles.figureSource}` : ''
      }`}>
      {showSource && canShowSource ? (
        <span className={styles.source}>
          {/* Prism ships no plantuml or mermaid grammar, so the language is
              recorded on the block for the chip and the copy button, but there
              is nothing to highlight. */}
          <CodeBlock language={diagramLang ?? 'text'}>{diagramSource}</CodeBlock>
        </span>
      ) : diagram ? (
        // `data-diagram` is what keeps medium-zoom off this image
        // (docusaurus.config.ts): it enlarges with a transform, which stretches
        // the bitmap the browser rasterised at column width instead of drawing
        // the SVG again — the larger the diagram, the blurrier the zoom.
        <Img
          {...props}
          data-diagram={diagramLang ?? 'diagram'}
          className={styles.zoomable}
          onClick={() => setViewing(true)}
        />
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
          {canShowSource ? (
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
          {canAsk ? (
            <button
              type="button"
              className={styles.action}
              title={translate({
                id: 'theme.image.askOpenWebUi.title',
                message: 'Open this diagram in Open WebUI',
                description:
                  "Tooltip of the button that opens a single diagram's source in Open WebUI",
              })}
              onClick={() =>
                ask({
                  intro: diagramIntro(alt, diagramLang, siteConfig.title),
                  body: `\`\`\`${diagramLang ?? 'text'}\n${diagramSource}\n\`\`\``,
                })
              }>
              <ChatIcon className={styles.icon} />
              <Translate
                id="theme.image.askOpenWebUi"
                description="Label of the button that opens a single diagram's source in Open WebUI">
                Open WebUI
              </Translate>
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
      {viewing ? (
        // A viewer rather than a zoom: the image is laid out at the size it is
        // seen at, so the browser draws the SVG at that size — vector-sharp on
        // any screen, where a scaled bitmap is exactly as sharp as the column
        // it was rasterised for. Spans only, and no portal: a diagram may still
        // sit inside a <p>, where a <div> would be invalid and cost hydration.
        // Fixed positioning takes it out of the flow all the same.
        <span
          role="dialog"
          aria-modal="true"
          aria-label={translate({
            id: 'theme.image.viewer.label',
            message: 'Full-size diagram',
            description: 'Accessible name of the overlay showing a diagram full size',
          })}
          className={styles.viewer}
          onClick={() => setViewing(false)}>
          <img className={styles.viewerImage} src={src} alt={alt ?? ''} />
          <button
            type="button"
            className={styles.viewerClose}
            title={translate({
              id: 'theme.image.viewer.close',
              message: 'Close (Esc)',
              description: 'Tooltip of the button that closes the full-size diagram viewer',
            })}
            onClick={() => setViewing(false)}>
            <CloseIcon />
          </button>
        </span>
      ) : null}
    </Wrapper>
  );
}
