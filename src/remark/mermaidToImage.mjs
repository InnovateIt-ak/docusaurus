// Build-time Mermaid renderer for Docusaurus.
//
// Docusaurus renders Mermaid diagrams client-side (mermaid.js runs in the
// browser). The static HTML therefore only contains the raw ```mermaid source,
// which means non-JavaScript consumers — most importantly the WeasyPrint PDF
// exporter in docker/weasyprint/ — never see a diagram.
//
// This remark plugin "bakes" each ```mermaid code block into an actual SVG at
// build time and inlines the result as an <img> with a data: URI. Because the
// SVG is embedded in the generated HTML, it shows up identically on the website
// and in the PDF, with no client-side JavaScript required.
//
// Design notes:
//   * The actual rendering happens in a separate `node` child process
//     (renderMermaid.worker.mjs). Docusaurus loads this plugin through jiti,
//     which transpiles ESM to CJS; that transform breaks the browser-side
//     functions @mermaid-js/mermaid-cli evaluates via Puppeteer (they end up
//     referencing `require`). A plain `node` subprocess avoids jiti entirely.
//   * The diagram is emitted as an <img> (MDAST `image` node), not inline
//     <svg>. Raw inline SVG breaks Docusaurus' MDX (v3) parser, which treats
//     HTML as JSX (`class`, `style="..."`, `xmlns:xlink`, ... are invalid JSX).
//     An <img> data URI sidesteps all of that and renders fine in WeasyPrint.
//   * HTML labels are disabled (`htmlLabels: false`). Mermaid otherwise wraps
//     labels in <foreignObject>, which WeasyPrint cannot render, leaving blank
//     labels in the PDF. With this off, Mermaid emits plain SVG <text>.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { visit } from 'unist-util-visit';

const WORKER = fileURLToPath(new URL('./renderMermaid.worker.mjs', import.meta.url));

// Mermaid configuration tuned for static rendering + WeasyPrint compatibility.
const DEFAULT_MERMAID_CONFIG = {
  htmlLabels: false,
  flowchart: { htmlLabels: false, useMaxWidth: true },
  er: { useMaxWidth: true },
  sequence: { useMaxWidth: true },
  theme: 'default',
};

/**
 * @param {object} [options]
 * @param {object} [options.mermaidConfig] Overrides merged onto the defaults.
 * @param {string} [options.backgroundColor] SVG background (default "white").
 * @param {string} [options.alt] Alt text for the generated <img>.
 */
export default function remarkMermaidToImage(options = {}) {
  const mermaidConfig = { ...DEFAULT_MERMAID_CONFIG, ...(options.mermaidConfig || {}) };
  const backgroundColor = options.backgroundColor || 'white';
  const alt = options.alt || 'Diagram';

  return function transformer(tree, file) {
    const targets = [];
    visit(tree, 'code', (node, index, parent) => {
      if (parent && typeof index === 'number' && (node.lang || '').toLowerCase() === 'mermaid') {
        targets.push({ node, index, parent });
      }
    });
    if (targets.length === 0) return;

    // Render every diagram of this file in one plain-`node` subprocess.
    const request = JSON.stringify({
      definitions: targets.map((t) => t.node.value),
      mermaidConfig,
      backgroundColor,
    });
    const proc = spawnSync(process.execPath, [WORKER], {
      input: request,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      env: process.env,
    });

    if (proc.error || proc.status !== 0) {
      // Never fail the whole build over diagram rendering; keep the code blocks.
      console.error(
        `[mermaidToImage] render worker failed for ${file.path || ''}:`,
        proc.error || proc.stderr,
      );
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(proc.stdout);
    } catch {
      console.error(
        '[mermaidToImage] could not parse worker output:',
        (proc.stdout || '').slice(0, 300),
        (proc.stderr || '').slice(0, 300),
      );
      return;
    }

    parsed.results.forEach((result, i) => {
      const { node, index, parent } = targets[i];
      if (result && result.svg) {
        const dataUri =
          'data:image/svg+xml;base64,' + Buffer.from(result.svg, 'utf8').toString('base64');
        parent.children[index] = {
          type: 'paragraph',
          data: { hProperties: { className: ['mermaid-diagram'] } },
          children: [{ type: 'image', url: dataUri, alt, title: null }],
        };
      } else {
        // Graceful fallback: keep the original code block and warn.
        const reason = (result && result.error) || 'unknown error';
        console.warn(`[mermaidToImage] ${file.path || ''}: ${reason}`);
        if (typeof file.message === 'function') {
          file.message(`Failed to render mermaid diagram: ${reason}`, node).fatal = false;
        }
      }
    });
  };
}
