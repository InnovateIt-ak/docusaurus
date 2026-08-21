import MDXComponents from '@theme-original/MDXComponents';
import MarkdownTable from '@site/src/components/MarkdownTable';

// Docusaurus maps a handful of markdown elements to theme components (code, a,
// img…) but leaves `table` to the raw HTML tag. Map it as well, to give data
// tables a search box and per-column filters — see src/components/MarkdownTable.
export default {
  ...MDXComponents,
  table: MarkdownTable,
};
