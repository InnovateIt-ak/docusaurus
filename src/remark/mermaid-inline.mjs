// Plugin remark : rendu Mermaid à la compilation.
//
// Deux syntaxes sont prises en charge dans n'importe quel .md / .mdx :
//
//   1. Un bloc de code ```mermaid … ```
//   2. Un lien image vers un fichier .mmd / .mermaid :
//        ![alt](chemin/vers/diagramme.mmd)
//
// Le diagramme est rendu en SVG au build via `@mermaid-js/mermaid-cli`, qui
// pilote un Chromium headless. Le SVG est ensuite inséré en image data-URL —
// donc le HTML final ne dépend plus d'aucun service, et le PDF WeasyPrint (qui
// n'exécute pas de JavaScript) l'embarque tel quel, exactement comme le plugin
// PlantUML.
//
// Le rendu s'exécute dans un process enfant (voir mermaid-renderer.mjs) : la
// config Docusaurus est chargée via jiti, qui réécrit `import.meta.url` et
// empêche mermaid-cli de localiser son bundle dans ce process. L'enfant tourne
// sous un Node natif, où le rendu fonctionne. Un seul Chromium est lancé pour
// tout le build.
//
// Choix du navigateur : Puppeteer utilise son Chromium par défaut. Pour
// réutiliser un binaire déjà présent (CI, sandbox), positionner
// PUPPETEER_EXECUTABLE_PATH — la variable est héritée par le process enfant.
import {visit} from 'unist-util-visit';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {dirname, isAbsolute, resolve} from 'node:path';

// Quand le rendu échoue (Chromium indisponible, syntaxe Mermaid invalide…), on
// ne casse pas tout le build : le nœud est remplacé par un bloc de code visible
// qui conserve la source et explique le problème. MERMAID_STRICT=1 fait au
// contraire échouer le build.
const STRICT = process.env.MERMAID_STRICT === '1';

// --- Pilotage du process enfant de rendu -----------------------------------
// jiti (qui charge ce fichier) peut réécrire `import.meta.url` ; on résout donc
// le script enfant depuis la racine du projet, stable pour un build Docusaurus.
const RENDERER_PATH = resolve(process.cwd(), 'src/remark/mermaid-renderer.mjs');

let child = null;
let nextId = 0;
const pending = new Map();

// Garde le pipe stdout de l'enfant référencé tant qu'un diagramme est en
// attente de réponse (sinon l'event loop peut se vider avant l'arrivée du SVG
// → exit 13), et le libère une fois idle pour ne pas bloquer la fin du build.
function syncStdoutRef() {
    if (!child) return;
    if (pending.size > 0) child.stdout.ref();
    else child.stdout.unref();
}

function ensureChild() {
    if (child) return child;
    child = spawn(process.execPath, [RENDERER_PATH], {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: process.env,
    });
    // Ne pas maintenir l'event loop du parent en vie à cause de l'enfant : sans
    // cela, `npm run build` reste bloqué après avoir généré les fichiers. Quand
    // le parent se termine, l'enfant reçoit EOF sur stdin, ferme Chromium et
    // s'arrête (voir mermaid-renderer.mjs).
    //
    // ATTENTION : on ne déréférence stdout QUE lorsqu'aucun diagramme n'est en
    // attente (voir syncStdoutRef). Le déréférencer en permanence viderait
    // l'event loop pendant qu'un rendu est en vol — plus aucun handle référencé,
    // la réponse de l'enfant n'arrive jamais, et Node sort en « unsettled
    // top-level await » (code 13). On le re-référence donc dès qu'une requête
    // part, et on ne le libère qu'une fois toutes les réponses reçues.
    child.unref();
    child.stdout.unref();
    createInterface({input: child.stdout}).on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let message;
        try {
            message = JSON.parse(trimmed);
        } catch {
            return;
        }
        const resolver = pending.get(message.id);
        if (!resolver) return;
        pending.delete(message.id);
        syncStdoutRef(); // idle → libère l'event loop ; sinon garde-le en vie
        if (message.ok) resolver.resolve(message.svg);
        else resolver.reject(new Error(message.error || 'unknown mermaid render error'));
    });
    const failAll = (err) => {
        for (const {reject} of pending.values()) reject(err);
        pending.clear();
        child = null;
    };
    child.on('error', (err) => failAll(err));
    child.on('exit', (code) => {
        if (pending.size) {
            failAll(new Error(`mermaid renderer exited (code ${code}) with pending diagrams`));
        }
    });
    // Ferme proprement l'enfant à la fin du build.
    process.once('exit', () => {
        try {
            child?.stdin.end();
        } catch {
            /* déjà fermé */
        }
    });
    return child;
}

function renderSvgViaChild(source) {
    const proc = ensureChild();
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pending.set(id, {resolve, reject});
        syncStdoutRef(); // rendu en vol : garde l'event loop en vie jusqu'à la réponse
        proc.stdin.write(JSON.stringify({id, source}) + '\n');
    });
}

// --- Normalisation du SVG ----------------------------------------------------
// Donne des dimensions intrinsèques en pixels à la racine <svg>. Mermaid émet
// `width="100%"` + un viewBox à offsets parfois négatifs (ex. "-50 -10 450 259")
// et une `max-width` en style : sans largeur/hauteur explicites, un <img>
// data-URL n'a pas de taille intrinsèque, et l'heuristique « image large =>
// paysage » du générateur PDF (qui lit width/height, avec un repli viewBox
// limité aux offsets positifs) ne peut pas le mesurer. On aligne donc le SVG
// sur le comportement des diagrammes PlantUML : width/height en px, sans
// max-width.
function normalizeSvg(svg) {
    const viewBox = svg.match(
        /viewBox="\s*-?[\d.]+\s+-?[\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/
    );
    if (!viewBox) return svg;
    const width = Math.round(parseFloat(viewBox[1]));
    const height = Math.round(parseFloat(viewBox[2]));

    return svg.replace(/<svg\b[^>]*>/, (openTag) => {
        let tag = openTag;
        tag = tag.replace(/max-width:\s*[\d.]+px;?\s*/g, '');
        if (/\bwidth="[^"]*"/.test(tag)) {
            tag = tag.replace(/\bwidth="[^"]*"/, `width="${width}"`);
        } else {
            tag = tag.replace(/<svg\b/, `<svg width="${width}"`);
        }
        if (/\bheight="[^"]*"/.test(tag)) {
            tag = tag.replace(/\bheight="[^"]*"/, `height="${height}"`);
        } else {
            tag = tag.replace(/<svg\b/, `<svg height="${height}"`);
        }
        return tag;
    });
}

async function toDataUrlImage(node, source) {
    const svg = normalizeSvg(await renderSvgViaChild(source));
    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    node.type = 'image';
    node.url = `data:image/svg+xml;base64,${base64}`;
    node.alt = node.alt || 'Mermaid diagram';
    node.title = null;
    delete node.lang;
    delete node.meta;
    delete node.value;
    delete node.children;
}

function degradeToPlaceholder(node, source, err) {
    delete node.url;
    delete node.alt;
    delete node.title;
    delete node.children;
    delete node.meta;
    node.type = 'code';
    node.lang = 'text';
    node.value =
        `⚠ Mermaid diagram not rendered: ${err.message}\n` +
        `Ensure a Chromium is available to Puppeteer (or set PUPPETEER_EXECUTABLE_PATH) and rebuild.\n` +
        (source ? `\n${source}` : '');
}

export default function remarkMermaidInline() {
    return async (tree, file) => {
        const mdxFilePath =
            file.path ?? file.history?.[file.history.length - 1] ?? process.cwd();
        const mdxDir = dirname(mdxFilePath);
        const tasks = [];

        const render = (node, getSource) => {
            tasks.push((async () => {
                let source;
                try {
                    source = await getSource();
                    await toDataUrlImage(node, source);
                } catch (err) {
                    if (STRICT) throw err;
                    console.warn(`[mermaid] ${mdxFilePath}: ${err.message}`);
                    degradeToPlaceholder(node, source, err);
                }
            })());
        };

        // Pattern 1 : bloc de code ```mermaid ... ```
        visit(tree, 'code', (node) => {
            if (node.lang !== 'mermaid') return;
            render(node, async () => node.value);
        });

        // Pattern 2 : lien image ![alt](chemin/vers/fichier.mmd)
        visit(tree, 'image', (node) => {
            if (!node.url || !/\.(mmd|mermaid)$/i.test(node.url)) return;
            if (node.url.startsWith('data:')) return;
            render(node, async () => {
                const filePath = isAbsolute(node.url)
                    ? node.url
                    : resolve(mdxDir, node.url);
                return await readFile(filePath, 'utf8');
            });
        });

        await Promise.all(tasks);
    };
}
