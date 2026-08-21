import MDXComponents from '@theme-original/MDXComponents';
import MDXTable from './Table';

// Docusaurus maps a handful of markdown elements to theme components (code, a,
// img…) but leaves `table` to the raw HTML tag. Map it as well, to give large
// tables a filter box — see ./Table.
export default {
  ...MDXComponents,
  table: MDXTable,
};
