import {visit} from 'unist-util-visit';
import plantumlEncoder from 'plantuml-encoder';
import {readFile} from 'node:fs/promises';
import {dirname, isAbsolute, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import {lookup as dnsLookup} from 'node:dns';

const PLANTUML_BUILD_URL =
    process.env.PLANTUML_BUILD_URL ?? 'http://localhost:8080';

const MAX_INCLUDE_DEPTH = 10;

// A diagram is normally sent in the URL path (GET /svg/<deflate+base64>). Jetty
// caps the request line + headers at 8 KB by default and drops the connection —
// without a status code — when a large diagram blows past it. Above this length
// we POST the source in the request body instead, where no such cap applies.
const MAX_URL_LENGTH = Number(process.env.PLANTUML_MAX_URL_LENGTH ?? 6000);
const TIMEOUT_MS = Number(process.env.PLANTUML_TIMEOUT_MS ?? 120000);
// Rendering a big diagram legitimately takes a while, so TIMEOUT_MS above is
// generous. Establishing the TCP connection is not: on a Docker bridge network
// a SYN to an address nothing answers for is black-holed rather than refused,
// so without a separate, short connect deadline a wrong address costs the full
// TIMEOUT_MS per attempt and the build looks hung instead of failing.
const CONNECT_TIMEOUT_MS = Number(process.env.PLANTUML_CONNECT_TIMEOUT_MS ?? 10000);
// How long a resolved address stays cached. A backstop for address changes that
// arrive without a connection error to trigger invalidation.
const DNS_CACHE_TTL_MS = Number(process.env.PLANTUML_DNS_CACHE_TTL_MS ?? 60000);
// Diagrams render inside webpack's progress bar, which reports module counts and
// nothing else. When a request outlives this, name it on stderr so a slow or
// stuck PlantUML server is visible instead of looking like a frozen build.
const STALL_WARN_MS = Number(process.env.PLANTUML_STALL_WARN_MS ?? 30000);
// A crashed or restarting PlantUML container disappears from Docker's DNS, so
// requests fail with ENOTFOUND/ECONNREFUSED for as long as it takes Jetty to
// come back (roughly 10-20s). The retry window below spans that gap rather than
// failing the whole build on a restart.
const RETRIES = Number(process.env.PLANTUML_RETRIES ?? 5);
const RETRY_BASE_MS = Number(process.env.PLANTUML_RETRY_BASE_MS ?? 1000);
// Hard cap on sockets held open against the PlantUML server, process-wide.
// Docusaurus builds the client and server bundles concurrently and compiles
// many MDX files in parallel, so a request-per-diagram burst can fill Jetty's
// accept queue: the server stops answering SYNs and every further request dies
// with ConnectTimeoutError (UND_ERR_CONNECT_TIMEOUT) rather than a status code.
// The agent below queues requests beyond this limit instead of opening sockets.
const CONCURRENCY = Number(process.env.PLANTUML_CONCURRENCY ?? 4);

const serverUrl = new URL(PLANTUML_BUILD_URL);
const transport = serverUrl.protocol === 'https:' ? https : http;
const basePath = serverUrl.pathname.replace(/\/+$/, '');
// Keep-alive matters as much as the socket cap: without it every diagram costs
// a fresh TCP handshake, which is what saturates the server's accept queue.
const agent = new transport.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: CONCURRENCY,
    maxFreeSockets: CONCURRENCY,
});

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

class PlantUmlHttpError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'PlantUmlHttpError';
        this.status = status;
    }
}

// Network errors nest their real reason in `cause`. Flatten the chain so the
// build log names it: ECONNRESET, ECONNREFUSED, ETIMEDOUT, …
function describeCause(error) {
    const parts = [];
    for (let e = error, depth = 0; e && depth < 5; e = e.cause, depth++) {
        const code = e.code ? ` (${e.code})` : '';
        parts.push(`${e.name ?? 'Error'}: ${e.message}${code}`);
    }
    return parts.join(' <- ');
}

// node:http rather than fetch: undici's 10s connect timeout is not reachable
// through the fetch options, and only an http.Agent gives a process-wide socket
// cap that queues instead of piling up half-open connections.
// Docker's embedded DNS (127.0.0.11) answers over UDP and silently drops
// queries when the host is saturated, and Node's getaddrinfo does not retry —
// so a build that pins the CPU reports `getaddrinfo ENOTFOUND plantuml` even
// though the container never went away. Resolve the server once and reuse the
// address for the rest of the build instead of asking again per connection.
//
// The cache has to be able to be wrong: a restarted container comes back on a
// different bridge address, and a cache that never expires would send every
// remaining request of the build to an address nothing answers for. So entries
// expire, and any connection-level failure drops the entry immediately — the
// retry then re-resolves and finds the container where it now lives.
let cachedAddress = null;

function invalidateAddress() {
    cachedAddress = null;
}

function cachingLookup(hostname, options, callback) {
    const family = options?.family ?? 0;
    const fresh = cachedAddress &&
        cachedAddress.hostname === hostname &&
        (family === 0 || cachedAddress.family === family) &&
        Date.now() - cachedAddress.at < DNS_CACHE_TTL_MS;
    if (fresh) {
        const hit = options?.all
            ? [{address: cachedAddress.address, family: cachedAddress.family}]
            : cachedAddress.address;
        process.nextTick(callback, null, hit, cachedAddress.family);
        return;
    }
    dnsLookup(hostname, options, (error, address, addressFamily) => {
        if (!error) {
            const first = options?.all ? address[0] : {address, family: addressFamily};
            if (first) {
                cachedAddress = {
                    hostname,
                    address: first.address,
                    family: first.family,
                    at: Date.now(),
                };
            }
        }
        callback(error, address, addressFamily);
    });
}

// Codes that mean the connection never got established. Every one of them is a
// reason to stop trusting the cached address: the server may simply have moved.
const CONNECTION_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
    'EPIPE',
    'ETIMEDOUT',
    'PLANTUML_CONNECT_TIMEOUT',
]);

function isConnectionError(error) {
    for (let e = error, depth = 0; e && depth < 5; e = e.cause, depth++) {
        if (CONNECTION_ERROR_CODES.has(e.code)) return true;
    }
    return false;
}

function request({method, path, body}) {
    return new Promise((resolve, reject) => {
        const headers = {Accept: 'image/svg+xml, text/plain'};
        if (body !== undefined) {
            headers['Content-Type'] = 'text/plain; charset=utf-8';
            headers['Content-Length'] = Buffer.byteLength(body);
        }
        const req = transport.request(
            {
                protocol: serverUrl.protocol,
                hostname: serverUrl.hostname,
                port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
                path: `${basePath}${path}`,
                method,
                agent,
                headers,
                lookup: cachingLookup,
            },
            (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('error', reject);
                res.on('end', () =>
                    resolve({status: res.statusCode, body: Buffer.concat(chunks).toString('utf8')})
                );
            }
        );
        // Covers connect and idle alike, and only starts once the agent has
        // actually assigned a socket — queued requests are not timed out.
        req.setTimeout(TIMEOUT_MS, () => {
            req.destroy(new Error(`no response within ${TIMEOUT_MS}ms`));
        });
        // A much tighter deadline for the handshake alone. `socket.connecting`
        // is false for a socket reused from the keep-alive pool, which needs no
        // handshake and so gets no connect deadline.
        req.on('socket', (socket) => {
            if (!socket.connecting) return;
            const timer = setTimeout(() => {
                const error = new Error(
                    `no connection to ${serverUrl.host} within ${CONNECT_TIMEOUT_MS}ms`
                );
                error.code = 'PLANTUML_CONNECT_TIMEOUT';
                req.destroy(error);
            }, CONNECT_TIMEOUT_MS);
            const clear = () => clearTimeout(timer);
            socket.once('connect', clear);
            socket.once('close', clear);
            req.once('error', clear);
        });
        req.on('error', (error) => {
            if (isConnectionError(error)) invalidateAddress();
            reject(error);
        });
        if (body !== undefined) req.write(body);
        req.end();
    });
}

async function requestSvg(source) {
    const encoded = plantumlEncoder.encode(source);
    const getPath = `/svg/${encoded}`;
    const urlLength = PLANTUML_BUILD_URL.length + getPath.length;
    if (urlLength <= MAX_URL_LENGTH) {
        return {...(await request({method: 'GET', path: getPath})), method: 'GET', urlLength};
    }
    return {...(await request({method: 'POST', path: '/svg', body: source})), method: 'POST', urlLength};
}

// Each diagram runs its own retry ladder, and the ladders run behind a socket
// cap, so a server that is simply not there costs (RETRIES + 1) attempts per
// diagram, serialised CONCURRENCY at a time: thirteen diagrams spend ten
// minutes arriving at one answer the first of them already had. The first
// ladder to exhaust itself against a connection error latches the verdict and
// every other diagram — in flight or not yet started — fails on it at once.
let unreachable = null;

function unreachableHint() {
    return (
        `\n  Nothing answered at ${serverUrl.host}. If PlantUML runs as a compose service, check it is up` +
        `\n  and on this container's network:  docker compose ps plantuml` +
        `\n                                    getent hosts ${serverUrl.hostname}` +
        `\n  Point PLANTUML_BUILD_URL elsewhere if the server lives outside the compose project.`
    );
}

async function renderSvg(source) {
    let lastError;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
        if (unreachable) throw unreachable;
        try {
            const {status, body, method, urlLength} = await requestSvg(source);
            if (status >= 200 && status < 300) {
                return body;
            }
            const hint = method === 'POST' && (status === 404 || status === 405)
                ? " — this PlantUML server does not accept POST /svg; either shrink the diagram or raise" +
                  " Jetty's requestHeaderSize (see compose-plantuml.yaml) and raise PLANTUML_MAX_URL_LENGTH to match"
                : '';
            const error = new PlantUmlHttpError(
                `PlantUML server returned ${status} (${method}, encoded URL ${urlLength} bytes)${hint}`,
                status
            );
            // 4xx is a stable answer from the server: retrying cannot change it.
            if (status < 500) throw error;
            lastError = error;
        } catch (error) {
            if (error instanceof PlantUmlHttpError && error.status < 500) {
                throw error;
            }
            lastError = error;
        }
        if (attempt < RETRIES) {
            await new Promise((r) => setTimeout(r, Math.min(RETRY_BASE_MS * 2 ** attempt, 15000)));
        }
    }
    const failure = new Error(
        `PlantUML request failed after ${RETRIES + 1} attempt(s) against ${PLANTUML_BUILD_URL} — ` +
        describeCause(lastError) +
        (isConnectionError(lastError) ? unreachableHint() : '')
    );
    if (isConnectionError(lastError)) unreachable = failure;
    throw failure;
}

// Diagrams are fetched from inside webpack's progress bar, which reports module
// counts and nothing else — a slow server is indistinguishable from a frozen
// build. Name what is still outstanding so the wait is at least legible.
const inFlight = new Map();
let nextRequestId = 0;
let watchdog = null;

function startWatch(label) {
    const id = nextRequestId++;
    inFlight.set(id, {label, at: Date.now()});
    if (!watchdog) {
        watchdog = setInterval(() => {
            const now = Date.now();
            const stalled = [...inFlight.values()].filter((e) => now - e.at >= STALL_WARN_MS);
            if (stalled.length === 0) return;
            const worst = stalled.reduce((a, b) => (a.at < b.at ? a : b));
            console.warn(
                `[plantuml] ${stalled.length} diagram(s) still waiting on ${PLANTUML_BUILD_URL} after ` +
                `${Math.round((now - worst.at) / 1000)}s — e.g. ${worst.label}`
            );
        }, STALL_WARN_MS);
        // Never let the reporter be the reason the process stays alive.
        watchdog.unref?.();
    }
    return id;
}

function endWatch(id) {
    inFlight.delete(id);
    if (inFlight.size === 0 && watchdog) {
        clearInterval(watchdog);
        watchdog = null;
    }
}

// Docusaurus compiles the client and server bundles from the same process, so
// every diagram is otherwise rendered at least twice. Deduplicate by content:
// identical sources share one in-flight request and one result.
const svgCache = new Map();

async function fetchSvg(source, label) {
    const key = createHash('sha256').update(source).digest('hex');
    let pending = svgCache.get(key);
    if (!pending) {
        pending = renderSvg(source);
        // Don't cache failures: a transient server hiccup would poison every
        // later reference to the same diagram.
        pending.catch(() => svgCache.delete(key));
        svgCache.set(key, pending);
    }
    const watchId = startWatch(label);
    try {
        return await pending;
    } catch (error) {
        throw new Error(`${label}: ${error.message}`);
    } finally {
        endWatch(watchId);
    }
}

async function toDataUrlImage(node, source, baseDir, label) {
    const resolved = await resolveIncludes(source, baseDir);
    const svg = await fetchSvg(resolved, label);
    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    node.type = 'image';
    node.url = `data:image/svg+xml;base64,${base64}`;
    node.alt = node.alt || 'PlantUML diagram';
    node.title = null;
    // Carry the source through to the browser so the rendered diagram can be
    // flipped back to its code. `data.hProperties` is merged into the element by
    // mdast-to-hast, so these arrive as props on the MDX <img> component.
    // The pre-include source is the one the author wrote and recognises.
    node.data = {
        ...node.data,
        hProperties: {
            ...node.data?.hProperties,
            'data-diagram-source': source,
            'data-diagram-lang': 'plantuml',
        },
    };
    delete node.lang;
    delete node.meta;
    delete node.value;
    delete node.children;
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

        // Requests beyond CONCURRENCY queue inside the shared agent, so no
        // extra throttling is needed here.
        await Promise.all(tasks.map((task) => task()));
    };
}
