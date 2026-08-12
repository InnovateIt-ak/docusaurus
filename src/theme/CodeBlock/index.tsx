import React, {isValidElement, type ReactNode} from 'react';
import ElementContent from '@theme/CodeBlock/Content/Element';
import StringContent from '@theme/CodeBlock/Content/String';
import type {Props} from '@theme/CodeBlock';

// Best attempt to make the children a plain string so it is copyable; if there
// are React elements we return them as-is (rare <pre><MyComp/></pre> case).
function maybeStringifyChildren(children: ReactNode): ReactNode {
  if (React.Children.toArray(children).some((el) => isValidElement(el))) {
    return children;
  }
  return Array.isArray(children) ? children.join('') : (children as ReactNode);
}

// Swizzled to drop the `key={String(isBrowser)}` remount that stock Docusaurus
// uses to re-apply the correct Prism theme after hydration. That remount tears
// down and rebuilds every code block on a full-page load, which makes the block
// visibly collapse/flash for a frame. Our swizzled CodeBlock controls the
// appearance from CSS instead — the card background and the full dark token
// palette are keyed on [data-theme] (see CodeBlock/Layout/styles.module.css) —
// so the block renders correctly from the first paint without the remount.
// Toggling the theme at runtime still updates the tokens, because usePrismTheme
// re-renders Content on a colour-mode change (a plain re-render, not a remount).
export default function CodeBlock({
  children: rawChildren,
  ...props
}: Props): ReactNode {
  const children = maybeStringifyChildren(rawChildren);
  const CodeBlockComp =
    typeof children === 'string' ? StringContent : ElementContent;
  return <CodeBlockComp {...props}>{children as string}</CodeBlockComp>;
}
