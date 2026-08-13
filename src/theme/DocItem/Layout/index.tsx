import type {ReactNode} from 'react';
import Layout from '@theme-original/DocItem/Layout';
import type LayoutType from '@theme/DocItem/Layout';
import type {WrapperProps} from '@docusaurus/types';
import ReadingProgress from '@site/src/components/ReadingProgress';

type Props = WrapperProps<typeof LayoutType>;

// Wraps the stock doc layout to add a reading-progress bar at the top of every
// doc page. The bar itself is fixed-positioned, so its placement in the tree
// doesn't matter — mounting it here scopes it to docs only.
export default function LayoutWrapper(props: Props): ReactNode {
  return (
    <>
      <ReadingProgress />
      <Layout {...props} />
    </>
  );
}
