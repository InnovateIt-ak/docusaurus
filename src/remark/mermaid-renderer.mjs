// Child process: renders Mermaid diagrams to SVG, with one Chromium for the
// whole lifetime of the process.
//
// Why a separate process? Docusaurus loads its configuration — and so the remark
// plugin and everything it imports — through jiti, which rewrites
// `import.meta.url`. `@mermaid-js/mermaid-cli` uses that to locate the Mermaid
// bundle, so under jiti it loads the wrong variant and fails with "require is
// not defined". Here the script runs under a plain Node: `import.meta.url` is
// correct and rendering works.
//
// Protocol: one JSON request per line on stdin ({id, source}), one JSON reply
// per line on stdout ({id, ok, svg} or {id, ok, error}). Requests are handled
// serially so two replies can never interleave on stdout.
import readline from 'node:readline';
import puppeteer from 'puppeteer';
import {renderMermaid} from '@mermaid-js/mermaid-cli';
import {MERMAID_CONFIG} from './mermaid-theme.mjs';
import {withSteps} from './diagram-steps.mjs';

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

let browserPromise = null;
function getBrowser() {
    if (!browserPromise) {
        const options = {headless: true, args: ['--no-sandbox']};
        if (CHROMIUM_PATH) options.executablePath = CHROMIUM_PATH;
        browserPromise = puppeteer.launch(options);
    }
    return browserPromise;
}

// A broken stdout pipe (the parent build has stopped) must NOT crash this child
// through an unhandled 'error' event: EPIPE is treated as "the parent closed,
// stop cleanly" rather than surfacing a non-zero exit that would mask the real
// reason the build failed.
function onPipeError(err) {
    if (err && (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED')) {
        process.exit(0);
    }
    throw err;
}
process.stdout.on('error', onPipeError);
process.stdin.on('error', onPipeError);

function send(message) {
    if (!process.stdout.writable) return; // parent already gone: nothing to write
    try {
        process.stdout.write(JSON.stringify(message) + '\n');
    } catch (err) {
        onPipeError(err);
    }
}

// Serial queue: one render at a time, replies never interleaved.
let queue = Promise.resolve();

function enqueue(request) {
    queue = queue.then(async () => {
        try {
            const browser = await getBrowser();
            const {data} = await renderMermaid(browser, request.source, 'svg', {
                backgroundColor: 'transparent',
                // Palette, typography and diagram skin: see mermaid-theme.mjs.
                // The theme lives there because site CSS cannot reach it — the
                // SVG is inlined in an <img>, which page CSS does not cross. It
                // also carries `htmlLabels: false`, required by the WeasyPrint
                // PDF, which does not render <foreignObject>.
                mermaidConfig: MERMAID_CONFIG,
            });
            // A "%% steps" or "%% still" diagram gets its motion written into the
            // SVG here, after the render (diagram-steps.mjs); the others go
            // out as Mermaid drew them.
            const svg = withSteps(request.source, Buffer.from(data).toString('utf8'), '%%');
            send({id: request.id, ok: true, svg});
        } catch (err) {
            send({id: request.id, ok: false, error: String((err && err.message) || err)});
        }
    });
}

const rl = readline.createInterface({input: process.stdin});
rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let request;
    try {
        request = JSON.parse(trimmed);
    } catch {
        return;
    }
    enqueue(request);
});
rl.on('close', async () => {
    await queue;
    try {
        const browser = await browserPromise;
        await browser?.close();
    } catch {
        /* already closed */
    }
    process.exit(0);
});