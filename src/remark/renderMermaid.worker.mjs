// Standalone Mermaid → SVG renderer, run as its OWN `node` process.
//
// Why a separate process? Docusaurus loads the remark plugin through `jiti`,
// which transpiles ESM (`await import(...)`) to CJS (`require(...)`). That
// transform also rewrites the helper functions @mermaid-js/mermaid-cli ships to
// the browser via Puppeteer's `page.$eval`, so they end up referencing `require`
// inside Chromium — where it does not exist — and rendering fails with
// "ReferenceError: require is not defined". Running mermaid-cli in a plain
// `node` process (no jiti) keeps its code untransformed, exactly like a normal
// CLI invocation.
//
// Protocol: reads a JSON request `{ definitions, mermaidConfig, backgroundColor }`
// from stdin and writes `{ results: [{ svg } | { error }] }` to stdout.

import { renderMermaid } from '@mermaid-js/mermaid-cli';
import puppeteer from 'puppeteer';

async function readStdin() {
  process.stdin.setEncoding('utf8');
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  const { definitions, mermaidConfig, backgroundColor } = JSON.parse(await readStdin());

  const browser = await puppeteer.launch({
    headless: true,
    // Chromium refuses to run as root (CI / Docker) without these flags.
    // Puppeteer honours PUPPETEER_EXECUTABLE_PATH from the environment.
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];
  try {
    for (const definition of definitions) {
      try {
        const { data } = await renderMermaid(browser, definition, 'svg', {
          mermaidConfig,
          backgroundColor,
        });
        const svg = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
        results.push({ svg });
      } catch (err) {
        results.push({ error: err && err.message ? err.message : String(err) });
      }
    }
  } finally {
    await browser.close();
  }

  process.stdout.write(JSON.stringify({ results }));
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
