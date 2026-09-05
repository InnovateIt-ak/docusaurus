// Stepped diagrams: "%% steps" (Mermaid) and "' steps" (PlantUML).
//
// A diagram is baked to SVG at build time and inlined as a data-URL <img>. No
// script runs in there and no page CSS reaches in — but CSS written INTO the
// SVG does run, and that is where the motion below is written: a <style>
// inserted right after the opening <svg> tag, once the diagram is rendered.
//
// WHAT MOVES
// ----------
// Steps: the arrows of a diagram, one after the other, in the order the author
// wrote them — then the round starts again. Two ways to tell it:
//
//   highlight (the default)  each arrow takes the accent for a moment, in turn;
//                            the diagram is complete throughout.
//   reveal                   each arrow appears in turn; once all are there the
//                            diagram holds, then starts over.
//
// The order is the author's. A Mermaid sequence diagram and a Mermaid flowchart
// draw their messages and edges in source order, as siblings (of the root, of
// <g class="edgePaths">), so the k-th one is an :nth-child. PlantUML groups
// each message or link in a <g> whose id carries its creation number
// (msg3, lnk12) — the source order too, even for a link a C4 macro drew, and
// even when Graphviz lays them out in another order.
//
// THE MARKER
// ----------
// A comment the diagram parser ignores; tokens in any order:
//
//   %% steps                     highlight, in the theme's accent
//   %% steps reveal              appear one by one
//   %% steps #004494             highlight, in that colour
//   %% steps reveal #004494      (the colour is unused by reveal, and harmless)
//   %% still                     no motion at all on this diagram — not even
//                                the theme's own (the drift of dotted edges)
//
// PlantUML: the same with `'` for `%%`. A colour is a hex value or a CSS colour
// name and nothing else — the marker ends up in a stylesheet, and that is what
// keeps it a colour.
//
// A Mermaid flowchart may instead be stepped by hand, node by node, through
// classDef (see the "Motion" section of mermaid-theme.mjs). When the source
// carries such steps (`diagram-step` appears in it) the marker recolours them
// and does nothing else; the automatic, arrow-by-arrow stepping is for a
// flowchart without them.
//
// WHAT THE PDF SEES
// -----------------
// WeasyPrint runs no animation and ignores the property altogether: it paints
// every element in its non-animated style. So the PDF shows the complete
// diagram at rest — for reveal too, whose elements are visible by themselves
// and hidden only by the animation's own frames. The same holds for a reader
// whose system asks for reduced motion: every animation is switched off below,
// and what remains is the still figure.
//
// SWITCHING IT OFF
// ----------------
// Per diagram: `%% still`. Site-wide: DIAGRAM_MOTION=off in the build's
// environment stills every diagram, stepped or not. Per reader: the figure's
// Pause button (src/theme/MDXComponents/Img) rewrites the image with the same
// still style, in the browser.
import {ACCENT} from './mermaid-theme.mjs';

// One step per slot, in seconds. Also the rule a classDef author applies by
// hand on a flowchart (cycle = 1.5s × steps, delay = 1.5s × (k − 1)).
export const STEP_SLOT_S = 1.5;
// How a highlighted step lights: a short ramp up, a hold, then straight back —
// in seconds, so a step on an eighteen-second round looks exactly like one on
// a six-second round. The hold ends before the slot does, so two steps never
// light together.
const STEP_RAMP_S = 0.3;
const STEP_HOLD_END_S = 1.2;
// Reveal: an arrow fades in over this long, this far into its slot.
const REVEAL_FADE_S = 0.3;
const REVEAL_OFFSET_S = 0.3;

const STILL_STYLE = '<style>/* still */ * { animation: none !important; }</style>';
const COLOR = '(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30})';

/** True when the build is asked to still every diagram (DIAGRAM_MOTION=off). */
export function motionDisabled() {
    return /^(off|0|false|no)$/i.test(process.env.DIAGRAM_MOTION ?? '');
}

/**
 * Reads the marker written with `comment` ("%%" or "'"): `null` when the
 * source has none; `{still: true}` for the still marker; otherwise `{mode,
 * color}` with mode "highlight" or "reveal".
 */
export function readStepsMarker(source, comment = '%%') {
    const text = String(source);
    const c = comment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`^\\s*${c}\\s*still\\s*$`, 'm').test(text)) return {still: true};
    const match = new RegExp(`^\\s*${c}\\s*steps((?:\\s+(?:reveal|highlight|${COLOR}))*)\\s*$`, 'm').exec(text);
    if (!match) return null;
    const tokens = match[1].trim().split(/\s+/).filter(Boolean);
    const mode = tokens.includes('reveal') ? 'reveal' : 'highlight';
    const color = tokens.find((t) => t !== 'reveal' && t !== 'highlight') ?? ACCENT;
    return {mode, color};
}

// --- What each family of SVG offers ------------------------------------------
// For the k-th step (1-based), the selectors to paint: `stroke` for what is
// drawn by its stroke (lines, paths), `ink` for text, `mark` for arrowheads
// drawn as filled polygons (PlantUML; Mermaid's are markers, painted with the
// path), and `whole` for what reveal shows and hides.

function mermaidSequence(svg) {
    const count = (svg.match(/class="[^"]*\bmessageLine[01]\b/g) ?? []).length;
    return {
        count,
        select: (k) => ({
            stroke: [`:nth-child(${k} of [class^="messageLine"])`],
            ink: [`:nth-child(${k} of .messageText)`],
            mark: [],
            // With autonumber, the number is a text plus a marker carried by the
            // unclassed <line> drawn right after the message: both go with it.
            whole: [
                `:nth-child(${k} of [class^="messageLine"])`,
                `:nth-child(${k} of .messageText)`,
                `:nth-child(${k} of [class^="messageLine"]) + line`,
                `:nth-child(${k} of .sequenceNumber)`,
            ],
        }),
    };
}

function mermaidFlowchart(svg) {
    const paths = /<g class="edgePaths">([^]*?)<\/g>\s*<g class="edgeLabels">/.exec(svg)?.[1] ?? '';
    const count = (paths.match(/<path\b/g) ?? []).length;
    return {
        count,
        select: (k) => ({
            stroke: [`.edgePaths > :nth-child(${k})`],
            ink: [`.edgeLabels > :nth-child(${k}) text`],
            mark: [],
            whole: [`.edgePaths > :nth-child(${k})`, `.edgeLabels > :nth-child(${k})`],
        }),
    };
}

function plantuml(svg) {
    const groups = [];
    let index = 0;
    for (const match of svg.matchAll(/<g class="(?:message|link)"([^>]*)>/g)) {
        const id = /\bid="([^"]+)"/.exec(match[1])?.[1];
        if (!id) continue;
        const number = Number(/(\d+)$/.exec(id)?.[1]);
        groups.push({id, number: Number.isFinite(number) ? number : Infinity, index: index++});
    }
    // Creation order (the id's number) first; DOM order settles a tie.
    groups.sort((a, b) => a.number - b.number || a.index - b.index);
    return {
        count: groups.length,
        select: (k) => {
            const id = `#${groups[k - 1].id}`;
            return {
                stroke: [`${id} line`, `${id} path`],
                ink: [`${id} text`],
                mark: [`${id} polygon`],
                whole: [id],
            };
        },
    };
}

/** The steppable items of a rendered SVG, or null for a diagram that has none. */
export function stepTargets(svg) {
    if (/\bdata-diagram-type="/.test(svg)) return plantuml(svg);
    const role = /\baria-roledescription="([^"]+)"/.exec(svg)?.[1] ?? '';
    if (role === 'sequence') return mermaidSequence(svg);
    if (role.startsWith('flowchart')) return mermaidFlowchart(svg);
    // Activity diagrams, C4_Sequence, class diagrams…: nothing named to step.
    return null;
}

// --- The stylesheet ------------------------------------------------------------

/**
 * Keyframes for a highlighted step on a round of `cycle` seconds, for the
 * three ways a diagram is painted. 0% and 100% are implicit — each element
 * returns to its own colour — and the end of the hold carries step-start, so
 * the light leaves at once rather than fading over the rest of the round.
 */
export function stepKeyframes(cycle, color) {
    const pct = (s) => `${((100 * s) / cycle).toFixed(3)}%`;
    const frames = (lit) =>
        `${pct(STEP_RAMP_S)} { ${lit} } ${pct(STEP_HOLD_END_S)} { ${lit} animation-timing-function: step-start; }`;
    return [
        `@keyframes diagram-step { ${frames(`stroke: ${color}; stroke-width: 2px;`)} }`,
        `@keyframes diagram-step-ink { ${frames(`fill: ${color};`)} }`,
        `@keyframes diagram-step-mark { ${frames(`fill: ${color}; stroke: ${color};`)} }`,
    ];
}

// Under reduced motion everything stops. The blanket rule handles what a
// class or a plain inline style set; the empty keyframes handle what Mermaid
// writes inline WITH !important (a classDef step on a node), which an
// important stylesheet rule cannot beat — an animation on a track with nothing
// on it moves nothing.
const REDUCED_MOTION =
    '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } ' +
    '@keyframes diagram-flow {} @keyframes diagram-step {} @keyframes diagram-step-ink {} }';

function highlightRules(targets, color) {
    const cycle = STEP_SLOT_S * (targets.count + 1);
    const rules = [...stepKeyframes(cycle, color)];
    const on = (selectors, name) =>
        selectors.length ? `${selectors.join(', ')} { animation: ${name} ${cycle}s linear infinite !important; }` : '';
    for (let k = 1; k <= targets.count; k += 1) {
        const t = targets.select(k);
        const delay = `${[...t.stroke, ...t.ink, ...t.mark].join(', ')} { animation-delay: ${STEP_SLOT_S * (k - 1)}s !important; }`;
        rules.push(on(t.stroke, 'diagram-step'), on(t.ink, 'diagram-step-ink'), on(t.mark, 'diagram-step-mark'), delay);
    }
    return {cycle, rules: rules.filter(Boolean)};
}

function revealRules(targets) {
    // Two slots of rest with everything shown, before the round starts again.
    const cycle = STEP_SLOT_S * (targets.count + 2);
    const pct = (s) => `${((100 * s) / cycle).toFixed(3)}%`;
    const rules = [];
    for (let k = 1; k <= targets.count; k += 1) {
        const at = STEP_SLOT_S * (k - 1) + REVEAL_OFFSET_S;
        // Hidden from the top of the round until its moment, then in. 100% is
        // implicit: the element's own opacity, i.e. shown — which is also what
        // the PDF and a reduced-motion reader get.
        rules.push(
            `@keyframes diagram-reveal-${k} { 0%, ${pct(at)} { opacity: 0; } ${pct(at + REVEAL_FADE_S)} { opacity: 1; } }`,
            `${targets.select(k).whole.join(', ')} { animation: diagram-reveal-${k} ${cycle}s linear infinite !important; }`,
        );
    }
    return {cycle, rules};
}

/**
 * The SVG with its marker honoured: stepped (highlight or reveal), stilled, or
 * — no marker, or nothing in it to step — untouched. `comment` is the
 * diagram language's comment sign, "%%" for Mermaid and "'" for PlantUML.
 */
export function withSteps(source, svg, comment = '%%') {
    const marker = readStepsMarker(source, comment);
    if (motionDisabled() || marker?.still) return insertStyle(svg, STILL_STYLE);
    if (!marker) return svg;

    // A flowchart stepped by hand keeps its classDef steps; the marker only
    // recolours them (see mermaid-theme.mjs for why 4% and 14%).
    if (comment === '%%' && /diagram-step/.test(String(source))) {
        if (marker.color === ACCENT) return svg;
        const lit = (props) => `4% { ${props} } 14% { ${props} animation-timing-function: step-start; }`;
        return insertStyle(
            svg,
            `<style>/* steps ${marker.color}: the classDef steps light in this colour */\n` +
                `@keyframes diagram-step { ${lit(`stroke: ${marker.color}; stroke-width: 2px;`)} }\n` +
                `@keyframes diagram-step-ink { ${lit(`fill: ${marker.color};`)} }\n${REDUCED_MOTION}</style>`,
        );
    }

    const targets = stepTargets(svg);
    if (!targets || targets.count === 0) return svg;
    const {cycle, rules} = marker.mode === 'reveal' ? revealRules(targets) : highlightRules(targets, marker.color);
    return insertStyle(
        svg,
        `<style>/* steps ${marker.mode}: ${targets.count} steps, ${cycle}s round */\n${rules.join('\n')}\n${REDUCED_MOTION}</style>`,
    );
}

// Right after the opening <svg …> tag, before <defs> and the drawing; a later
// <style> wins ties with the one the renderer wrote, which is the point.
function insertStyle(svg, style) {
    return svg.replace(/<svg\b[^>]*>/, (openTag) => `${openTag}${style}`);
}
