import type {ReactNode} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import PageActions from '@site/src/components/PageActions';

type Props = WrapperProps<typeof ContentType>;

// The page actions go above the document title, where a reader looks for them —
// and above the MDX content, which is what carries the source they read (see
// src/components/RawSource).
export default function ContentWrapper(props: Props): ReactNode {
  return (
    <>
      <PageActions />
      <Content {...props} />
    </>
  );
}
