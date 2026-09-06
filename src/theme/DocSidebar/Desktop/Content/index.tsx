import type {ReactNode} from 'react';
import Content from '@theme-original/DocSidebar/Desktop/Content';
import type ContentType from '@theme/DocSidebar/Desktop/Content';
import type {WrapperProps} from '@docusaurus/types';
import SidebarTools from '@site/src/components/SidebarTools';

type Props = WrapperProps<typeof ContentType>;

// "Find anything" and "Ask AI" sit above the menu, in the sidebar's column
// and outside the menu's own scroll, so they stay put while the menu scrolls.
export default function ContentWrapper(props: Props): ReactNode {
  return (
    <>
      <SidebarTools />
      <Content {...props} />
    </>
  );
}
