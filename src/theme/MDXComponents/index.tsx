import MDXComponents from '@theme-original/MDXComponents';
import RawSource from '@site/src/components/RawSource';
import PageActions from '@site/src/components/PageActions';
import * as Overview from '@site/src/components/Overview';

// `RawSource` is not a markdown element: it is the JSX element that
// src/remark/raw-source.mjs adds to every doc, and MDX resolves capitalised
// names through this same map.
//
// `Overview` is the set of blocks a section-overview page is built from
// (src/components/Overview), reachable as `<Overview.Lead>`, `<Overview.Cards>`
// and so on — MDX resolves a dotted name through this map too — so a page
// needs no import line before its content.
//
// `PageActions` is the bar of page actions that src/remark/page-actions.mjs
// puts under the title and its subtitle of every doc.
export default {
  ...MDXComponents,
  RawSource,
  PageActions,
  Overview,
};
