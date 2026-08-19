import {visit} from 'unist-util-visit';
import plantumlEncoder from 'plantuml-encoder';
import {readFile} from 'node:fs/promises';
import {dirname, isAbsolute, resolve} from 'node:path';

const PLANTUML_BUILD_URL =
    process.env.PLANTUML_BUILD_URL ?? 'http://localhost:8080';

const MAX_INCLUDE_DEPTH = 10;

// A diagram is normally sent in the URL path (GET /svg/<deflate+base64>). Jetty
// caps the request line + headers at 8 KB by default and drops the connection —
// without a status code — when a large diagram blows past it, which surfaces in
// the build as an opaque `TypeError: fetch failed`. Above this length we POST
// the source in the request body instead, where no such cap applies.
const MAX_URL_LENGTH = Number(process.env.PLANTUML_MAX_URL_LENGTH ?? 6000);
const TIMEOUT_MS = Number(process.env.PLANTUML_TIMEOUT_MS ?? 60000);
const RETRIES = Number(process.env.PLANTUML_RETRIES ?? 2);
// Docusaurus already compiles several MDX files in parallel; an unbounded
// Promise.all per file on top of that can open more sockets than the PlantUML
// server will accept, which also shows up as `fetch failed`.
const CONCURRENCY = Number(process.env.PLANTUML_CONCURRENCY ?? 4);

async function resolveIncludes(source, baseDir, depth = 0) {
    if (depth > MAX_INCLUDE_DEPTH) {
        throw new Error(`PlantUML !include recursion exceeded ${MAX_INCLUDE_DEPTH} levels`);
    }
    const lines = source.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
        const m = line.match(/^\s*!include(?:url|sub)?\s+(.+?)\s*$/i);
        if (!m) {
            out.push(line);
            continue;
        }
        const target = m[1].trim().replace(/^["']|["']$/g, '');
        // Pass through PlantUML stdlib (e.g. <C4/C4_Container>) and remote URLs — handled by the server
        if ((target.startsWith('<') && target.endsWith('>')) ||
            target.startsWith('http://') ||
            target.startsWith('https://')) {
            out.push(line);
            continue;
        }
        const filePath = isAbsolute(target) ? target : resolve(baseDir, target);
        const content = await readFile(filePath, 'utf8');
        const resolved = await resolveIncludes(content, dirname(filePath), depth + 1);
        out.push(resolved);
    }
    return out.join('\n');
}

// `fetch` rejects with a bare `TypeError: fetch failed` and hides the real
// socket error in `err.cause` (often nested). Flatten the chain so the build log
// names it: ECONNRESET, ECONNREFUSED, ConnectTimeoutError, UND_ERR_*, …
function describeCause(error) {
    const parts = [];
    for (let e = error, depth = 0; e && depth < 5; e = e.cause, depth++) {
        const code = e.code ? ` (${e.code})` : '';
        parts.push(`${e.name ?? 'Error'}: ${e.message}${code}`);
    }
    return parts.join(' <- ');
}

class PlantUmlHttpError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'PlantUmlHttpError';
        this.status = status;
    }
}

async function fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, {...init, signal: controller.signal});
    } finally {
        clearTimeout(timer);
    }
}

async function requestSvg(source) {
    const encoded = plantumlEncoder.encode(source);
    const getUrl = `${PLANTUML_BUILD_URL}/svg/${encoded}`;
    if (getUrl.length <= MAX_URL_LENGTH) {
        return {response: await fetchWithTimeout(getUrl, {}), method: 'GET', urlLength: getUrl.length};
    }
    const response = await fetchWithTimeout(`${PLANTUML_BUILD_URL}/svg`, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain; charset=utf-8'},
        body: source,
    });
    return {response, method: 'POST', urlLength: getUrl.length};
}

async function fetchSvg(source, label) {
    let lastError;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
            const {response, method, urlLength} = await requestSvg(source);
            if (response.ok) {
                return await response.text();
            }
            const hint = method === 'POST' && (response.status === 404 || response.status === 405)
                ? " — this PlantUML server does not accept POST /svg; either shrink the diagram or raise" +
                  " Jetty's requestHeaderSize (see compose-plantuml.yaml) and raise PLANTUML_MAX_URL_LENGTH to match"
                : '';
            const error = new PlantUmlHttpError(
                `PlantUML server returned ${response.status} (${method}, encoded URL ${urlLength} bytes)${hint}`,
                response.status
            );
            // 4xx is a stable answer from the server: retrying cannot change it.
            if (response.status < 500) throw error;
            lastError = error;
        } catch (error) {
            if (error instanceof PlantUmlHttpError && error.status < 500) {
                throw new Error(`${label}: ${error.message}`);
            }
            lastError = error;
        }
        if (attempt < RETRIES) {
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
    throw new Error(
        `${label}: PlantUML request failed after ${RETRIES + 1} attempt(s) against ${PLANTUML_BUILD_URL} — ` +
        describeCause(lastError)
    );
}

async function toDataUrlImage(node, source, baseDir, label) {
    const resolved = await resolveIncludes(source, baseDir);
    const svg = await fetchSvg(resolved, label);
    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    node.type = 'image';
    node.url = `data:image/svg+xml;base64,${base64}`;
    node.alt = node.alt || 'PlantUML diagram';
    node.title = null;
    delete node.lang;
    delete node.meta;
    delete node.value;
    delete node.children;
}

async function runWithConcurrency(tasks, limit) {
    let next = 0;
    const workers = Array.from({length: Math.min(limit, tasks.length)}, async () => {
        while (next < tasks.length) {
            await tasks[next++]();
        }
    });
    await Promise.all(workers);
}

export default function remarkPlantUMLInline() {
    return async (tree, file) => {
        const mdxFilePath = file.path ?? file.history?.[file.history.length - 1] ?? process.cwd();
        const mdxDir = dirname(mdxFilePath);
        const tasks = [];

        // Pattern 1: fenced code block ```plantuml ... ```
        visit(tree, 'code', (node) => {
            if (node.lang !== 'plantuml') return;
            const label = `${mdxFilePath} (plantuml block, line ${node.position?.start?.line ?? '?'})`;
            tasks.push(() => toDataUrlImage(node, node.value, mdxDir, label));
        });

        // Pattern 2: image link ![alt](path/to/file.puml)
        visit(tree, 'image', (node) => {
            if (!node.url || !/\.(puml|plantuml)$/i.test(node.url)) return;
            // Skip data URLs already processed
            if (node.url.startsWith('data:')) return;
            const target = node.url;
            tasks.push(async () => {
                const filePath = isAbsolute(target) ? target : resolve(mdxDir, target);
                const source = await readFile(filePath, 'utf8');
                await toDataUrlImage(node, source, dirname(filePath), `${mdxFilePath} -> ${target}`);
            });
        });

        await runWithConcurrency(tasks, CONCURRENCY);
    };
}
