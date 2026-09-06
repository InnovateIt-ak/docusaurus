import type {ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Heading from '@theme/Heading';
import MDXContent from '@theme/MDXContent';
import type {Props} from '@theme/DocItem/Content';
import styles from './styles.module.css';

// Ejected copy of the theme's DocItem/Content (3.10). Upstream renders the
// title in a <header> inside div.markdown; so does this one, at the design's
// size. The page actions (src/components/PageActions) are not here: the
// design puts them under the title *and* its subtitle, and the subtitle is
// content, so src/remark/page-actions.mjs places the bar in the markdown
// itself. The design's eyebrow over the title was dropped — the sidebar and
// the breadcrumbs already say the section.

/**
 * The title, when it has to be added here.
 *
 * As upstream: a title declared in front matter is rendered under the same
 * div.markdown as one written in the content, and only when the content does
 * not open with its own h1 and the front matter does not ask to hide it.
 */
function useSyntheticTitle(): string | null {
  const {metadata, frontMatter, contentTitle} = useDoc();
  const shouldRender =
    !frontMatter.hide_title && typeof contentTitle === 'undefined';
  return shouldRender ? metadata.title : null;
}

export default function DocItemContent({children}: Props): ReactNode {
  const syntheticTitle = useSyntheticTitle();
  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      {syntheticTitle && (
        <header className={styles.header}>
          <Heading as="h1" className={styles.title}>
            {syntheticTitle}
          </Heading>
        </header>
      )}
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
