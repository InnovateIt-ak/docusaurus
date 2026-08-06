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

function send(message) {
    process.stdout.write(JSON.stringify(message) + '\n');
}

// File d'attente série : un rendu à la fois, réponses non entrelacées.
let queue = Promise.resolve();

function enqueue(request) {
    queue = queue.then(async () => {
        try {
            const browser = await getBrowser();
            const {data} = await renderMermaid(browser, request.source, 'svg', {
                backgroundColor: 'transparent',
                // Rendre les libellés en <text> SVG plutôt qu'en <foreignObject>
                // (HTML). WeasyPrint ne sait pas rendre <foreignObject> : sans
                // cela, le diagramme sort dans le PDF avec des boîtes et des
                // flèches vides, sans aucun texte. `htmlLabels: false` force des
                // éléments <text> que WeasyPrint affiche correctement, sur le
                // site comme dans le PDF.
                mermaidConfig: {
                    htmlLabels: false,
                    flowchart: {htmlLabels: false},
                },
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
