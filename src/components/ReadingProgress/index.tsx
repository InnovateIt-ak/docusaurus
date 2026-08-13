import {useEffect, useRef, useState, type ReactNode} from 'react';
import styles from './styles.module.css';

// A thin reading-progress bar pinned to the top of the viewport. It reflects how
// far the reader has scrolled through the doc's <article> (not the whole
// document), so it fills up exactly as the article content is consumed and
// ignores the footer/edit-metadata below it.
//
// Rendered only on doc pages: it is injected by the swizzled
// src/theme/DocItem/Layout wrapper, which only mounts for docs.
export default function ReadingProgress(): ReactNode {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // The doc body is a single <article> inside the main column.
    const article = document.querySelector('article');

    const compute = (): number => {
      const el = article ?? document.documentElement;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      // Article fits on screen — nothing to scroll, treat as fully read.
      if (scrollable <= 0) return 1;
      // -rect.top is how far the article's top has passed above the viewport.
      return Math.min(1, Math.max(0, -rect.top / scrollable));
    };

    const onScroll = () => {
      if (frame.current != null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        setProgress(compute());
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame.current != null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}>
      <div
        className={styles.bar}
        style={{transform: `scaleX(${progress})`}}
      />
    </div>
  );
}
