import type {ReactNode} from 'react';
import {useOpenWebUi} from '@site/src/openWebUi';
import {openCommandPalette} from '@site/src/components/CommandPalette';
import Icon from '@site/src/components/Icon';
import styles from './styles.module.css';

// The two buttons at the top of the sidebar: "Find anything", which opens the
// command palette (the same one ⌘K and "/" open), and "Ask AI", which opens
// the Open WebUI instance the site is configured with — and which is not
// shown when there is none to open (customFields.openWebUiUrl).
export default function SidebarTools(): ReactNode {
  const {base: openWebUi} = useOpenWebUi();
  return (
    <div className={styles.tools}>
      <button type="button" className={styles.find} onClick={openCommandPalette}>
        <Icon name="search" size={15} className={styles.icon} />
        <span className={styles.findLabel}>Find anything</span>
        <kbd className={styles.kbd}>/</kbd>
      </button>
      {openWebUi && (
        <a
          className={styles.ask}
          href={`${openWebUi}/`}
          target="_blank"
          rel="noopener noreferrer">
          <Icon name="sparkles" size={14} className={styles.icon} />
          Ask AI
        </a>
      )}
    </div>
  );
}
