import MDXComponents from '@theme-original/MDXComponents';
import RawSource from '@site/src/components/RawSource';

// `RawSource` is not a markdown element: it is the JSX element that
// src/remark/raw-source.mjs adds to every doc, and MDX resolves capitalised
// names through this same map.
export default {
  ...MDXComponents,
  RawSource,
};
