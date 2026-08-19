import MDXComponents from '@theme-original/MDXComponents';
import MarkdownTable from '@site/src/components/MarkdownTable';
import RawSource from '@site/src/components/RawSource';

// Theme-classic maps a handful of markdown elements to components (a, img, pre,
// details, …) but leaves `table` as a bare tag, so the mapping is extended here
// rather than swizzled per-element.
//
// `RawSource` is not a markdown element: it is the JSX element that
// src/remark/raw-source.mjs adds to every doc, and MDX resolves capitalised
// names through this same map.
export default {
  ...MDXComponents,
  table: MarkdownTable,
  RawSource,
};
