import type {ReactNode} from 'react';
import TOC from '@theme-original/TOC';
import type TOCType from '@theme/TOC';
import type {WrapperProps} from '@docusaurus/types';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

type Props = WrapperProps<typeof TOCType>;

// The design titles the right-hand column "On this page", in the same small
// mono the sidebar's section headings wear; the theme's TOC has no title.
// The wrapper is what sticks (styles.module.css), so the title scrolls with
// the list rather than being left behind by it.
export default function TOCWrapper(props: Props): ReactNode {
  return (
    <div className={styles.wrap}>
      <p className={styles.title}>
        <Translate
          id="theme.TOC.title"
          description="Title above the table of contents of a doc page">
          On this page
        </Translate>
      </p>
      <TOC {...props} />
    </div>
  );
}
