import type {ReactNode} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import CopyMarkdown from '@site/src/components/CopyMarkdown';

type Props = WrapperProps<typeof ContentType>;

// The copy action goes above the document title, where a reader looks for page
// actions — and above the MDX content, which is what carries the source it
// copies (see src/components/RawSource).
export default function ContentWrapper(props: Props): ReactNode {
  return (
    <>
      <CopyMarkdown />
      <Content {...props} />
    </>
  );
}
