// Process enfant : rend des diagrammes Mermaid en SVG, un Chromium pour toute
// la durée de vie du process.
//
// Pourquoi un process séparé ? Docusaurus charge sa configuration (et donc le
// plugin remark et ses imports) via jiti, qui réécrit `import.meta.url`. Or
// `@mermaid-js/mermaid-cli` s'en sert pour localiser le bundle Mermaid ; sous
// jiti il charge alors la mauvaise variante et échoue avec « require is not
// defined ». Ici, ce script tourne sous un Node natif : `import.meta.url` est
// correct et le rendu fonctionne.
//
// Protocole : une requête JSON par ligne sur stdin ({id, source}), une réponse
// JSON par ligne sur stdout ({id, ok, svg} ou {id, ok, error}). Les requêtes
// sont traitées en série pour ne jamais entrelacer deux réponses sur stdout.
import readline from 'node:readline';
import puppeteer from 'puppeteer';
import {renderMermaid} from '@mermaid-js/mermaid-cli';
import {MERMAID_CONFIG} from './mermaid-theme.mjs';

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

// Un pipe stdout cassé (le build parent s'est arrêté) ne doit PAS crasher cet
// enfant via un event 'error' non géré : on traite EPIPE comme « le parent a
// fermé, on s'arrête proprement » plutôt que de remonter un exit non nul qui
// masquerait la vraie cause de l'échec du build.
function onPipeError(err) {
    if (err && (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED')) {
        process.exit(0);
    }
    throw err;
}
process.stdout.on('error', onPipeError);
process.stdin.on('error', onPipeError);

function send(message) {
    if (!process.stdout.writable) return; // parent déjà parti : rien à écrire
    try {
        process.stdout.write(JSON.stringify(message) + '\n');
    } catch (err) {
        onPipeError(err);
    }
}

// File d'attente série : un rendu à la fois, réponses non entrelacées.
let queue = Promise.resolve();

function enqueue(request) {
    queue = queue.then(async () => {
        try {
            const browser = await getBrowser();
            const {data} = await renderMermaid(browser, request.source, 'svg', {
                backgroundColor: 'transparent',
                // Palette, typographie et habillage des diagrammes : voir
                // mermaid-theme.mjs. Le thème y est centralisé car le CSS du
                // site ne peut pas l'atteindre — le SVG est inliné dans une
                // <img>, que le CSS de la page ne traverse pas. Il embarque
                // aussi `htmlLabels: false`, indispensable au PDF WeasyPrint,
                // qui ne rend pas <foreignObject>.
                mermaidConfig: MERMAID_CONFIG,
            });
            send({id: request.id, ok: true, svg: Buffer.from(data).toString('utf8')});
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
        /* déjà fermé */
    }
    process.exit(0);
});