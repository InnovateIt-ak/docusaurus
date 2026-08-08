import type {ComponentProps, ReactNode} from 'react';
import Img from '@theme-original/MDXComponents/Img';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

type Props = ComponentProps<'img'>;

// Diagrams are rendered at build time as inline data-URL SVGs; a caption +
// download link there is noise, so they keep the original rendering.
const DIAGRAM_ALTS = new Set(['Mermaid diagram', 'PlantUML diagram']);

// Adds a small caption under each content image with a link to download it.
// Structured with <span>s (not <figure>/<figcaption>) because a markdown image
// renders as <p><img></p>, and a block <figure> inside a <p> is invalid and
// breaks hydration — inline-level spans styled as blocks stay valid.
export default function ImgWrapper(props: Props): ReactNode {
  const src = typeof props.src === 'string' ? props.src : undefined;
  const alt = typeof props.alt === 'string' ? props.alt : undefined;

  if (!src || src.startsWith('data:') || (alt && DIAGRAM_ALTS.has(alt))) {
    return <Img {...props} />;
  }

  return (
    <span className={styles.figure}>
      <Img {...props} />
      <span className={styles.caption}>
        {alt ? <span className={styles.alt}>{alt}</span> : <span className={styles.spacer} />}
        <a className={styles.download} href={src} download target="_blank" rel="noopener noreferrer">
          <Translate
            id="theme.image.downloadLink"
            description="Label of the download link shown under a content image">
            ⬇ Télécharger
          </Translate>
        </a>
      </span>
    </span>
  );
}
