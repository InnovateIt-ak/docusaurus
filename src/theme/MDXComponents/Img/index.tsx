import type {ComponentProps, MouseEvent, ReactNode} from 'react';
import Img from '@theme-original/MDXComponents/Img';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

type Props = ComponentProps<'img'>;

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

// Adds a small caption under each image with a link to download it — including
// build-time diagrams, so a reader can grab the SVG. Structured with <span>s
// (not <figure>/<figcaption>) because a markdown image renders as <p><img></p>,
// and a block <figure> inside a <p> is invalid and breaks hydration —
// inline-level spans styled as blocks stay valid.
export default function ImgWrapper(props: Props): ReactNode {
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
    <span className={styles.figure}>
      <Img {...props} />
      <span className={styles.caption}>
        {label ? (
          <span className={styles.alt}>{label}</span>
        ) : (
          <span className={styles.spacer} />
        )}
        <span className={styles.actions}>
          <a
            className={styles.action}
            href={src}
            onClick={(event) => openInNewTab(event, src)}
            target="_blank"
            rel="noopener noreferrer">
            <Translate
              id="theme.image.openLink"
              description="Label of the link that opens an image or diagram in a new tab">
              ↗ Ouvrir
            </Translate>
          </a>
          <a
            className={styles.action}
            href={src}
            download={downloadName(src, alt)}
            target="_blank"
            rel="noopener noreferrer">
            <Translate
              id="theme.image.downloadLink"
              description="Label of the download link shown under an image or diagram">
              ⬇ Télécharger
            </Translate>
          </a>
        </span>
      </span>
    </span>
  );
}
