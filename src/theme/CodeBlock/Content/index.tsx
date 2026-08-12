import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useCodeBlockContext} from '@docusaurus/theme-common/internal';
import {Highlight, themes} from 'prism-react-renderer';
import Line from '@theme/CodeBlock/Line';
import type {Props} from '@theme/CodeBlock/Content';
import styles from './styles.module.css';

// Ejected from @docusaurus/theme-classic to freeze the Prism theme.
//
// Stock Content calls usePrismTheme(), which returns a different theme per
// colour mode. On a full-page load the colour mode only settles AFTER
// hydration, so Content re-renders and re-runs <Highlight>, and for one frame
// the code block flashes as a single unstyled line (the "squash" glitch).
//
// Here the inline theme is a constant (github light), identical on the server
// and the client, so Content never re-renders on a colour-mode change and the
// block is stable from the first paint. The ACTUAL colours are applied by CSS
// instead — CodeBlock/Layout/styles.module.css paints the card background and a
// full dark token palette keyed on [data-theme='dark'] — so dark mode looks
// right without depending on the inline theme.
const PRISM_THEME = themes.github;

// TODO Docusaurus v4: remove useless forwardRef
const Pre = React.forwardRef<HTMLPreElement, React.ComponentProps<'pre'>>(
  (props, ref) => (
    <pre
      ref={ref}
      /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
      tabIndex={0}
      {...props}
      className={clsx(props.className, styles.codeBlock, 'thin-scrollbar')}
    />
  ),
);

function Code(props: React.ComponentProps<'code'>): ReactNode {
  const {metadata} = useCodeBlockContext();
  return (
    <code
      {...props}
      className={clsx(
        props.className,
        styles.codeBlockLines,
        metadata.lineNumbersStart !== undefined &&
          styles.codeBlockLinesWithNumbering,
      )}
      style={{
        ...props.style,
        counterReset:
          metadata.lineNumbersStart === undefined
            ? undefined
            : `line-count ${metadata.lineNumbersStart - 1}`,
      }}
    />
  );
}

export default function CodeBlockContent({
  className: classNameProp,
}: Props): ReactNode {
  const {metadata, wordWrap} = useCodeBlockContext();
  const {code, language, lineNumbersStart, lineClassNames} = metadata;
  return (
    <Highlight theme={PRISM_THEME} code={code} language={language}>
      {({className, style, tokens: lines, getLineProps, getTokenProps}) => (
        <Pre
          ref={wordWrap.codeBlockRef}
          className={clsx(classNameProp, className)}
          style={style}>
          <Code>
            {lines.map((line, i) => (
              <Line
                key={i}
                line={line}
                getLineProps={getLineProps}
                getTokenProps={getTokenProps}
                classNames={lineClassNames[i]}
                showLineNumbers={lineNumbersStart !== undefined}
              />
            ))}
          </Code>
        </Pre>
      )}
    </Highlight>
  );
}
