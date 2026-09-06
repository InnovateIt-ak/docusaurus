import type {PrismTheme} from 'prism-react-renderer';
import {themes} from 'prism-react-renderer';

// The code blocks' palettes, one per colour mode (docusaurus.config.ts,
// `prism`). Docusaurus reads `plain.backgroundColor` into the block's
// background, so the theme is also where a code block gets its ground.

/** Light: GitHub's tokens on the design's white paper (the frame is CSS). */
export const lightTheme: PrismTheme = {
  ...themes.github,
  plain: {...themes.github.plain, backgroundColor: '#ffffff', color: '#28313f'},
};

/**
 * Dark: the navy of the site's dark mode (src/css/custom.css) rather than
 * Dracula's near-black, which sat on the blue page like a hole. Ground is the
 * surface navy, text the page's, and the tokens are the same handful of
 * lightened hues the rest of the dark mode is drawn in.
 */
export const darkTheme: PrismTheme = {
  plain: {color: '#c4d0e0', backgroundColor: '#0f1d33'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: '#7c93b3', fontStyle: 'italic'}},
    {types: ['punctuation'], style: {color: '#a3b2c7'}},
    {types: ['namespace'], style: {opacity: 0.8}},
    {types: ['property', 'tag', 'symbol', 'deleted'], style: {color: '#f08c86'}},
    {types: ['boolean', 'number', 'constant'], style: {color: '#f0a35c'}},
    {types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'], style: {color: '#8fd4a8'}},
    {types: ['operator', 'entity', 'url'], style: {color: '#a3b2c7'}},
    {types: ['atrule', 'attr-value', 'keyword'], style: {color: '#a7cbf3'}},
    {types: ['function', 'class-name'], style: {color: '#d9c2f5'}},
    {types: ['regex', 'important', 'variable'], style: {color: '#f0d27c'}},
    {types: ['important', 'bold'], style: {fontWeight: 'bold'}},
    {types: ['italic'], style: {fontStyle: 'italic'}},
  ],
};
