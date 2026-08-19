import type {ReactNode} from 'react';

/** The class the copy button looks the carrier up by. */
export const RAW_SOURCE_CLASS = 'raw-markdown-source';

type Props = {value: string};

/**
 * Carries the page's markdown source from the build into the DOM.
 *
 * Rendered from the MDX tree by src/remark/raw-source.mjs. It deliberately does
 * not go through React context or a module-level store: the button that reads
 * this sits *above* the MDX content in the tree, so it would have to render
 * before the value was published. An attribute on a hidden node is available to
 * the button whenever the reader actually clicks it, with no ordering to get
 * right and no difference between dev and a production build.
 */
export default function RawSource({value}: Props): ReactNode {
  return <div hidden className={RAW_SOURCE_CLASS} data-raw-markdown={value} />;
}
