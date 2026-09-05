// Stepped sequence diagrams: "%% steps".
//
// A flowchart tells a sequence with classDef (see the "Motion" section of
// mermaid-theme.mjs): the author puts each node and edge on a step, and the
// step's delay travels in the style. A sequence diagram offers none of that —
// no classDef, no id on a message — but it does not need it either: its
// messages are already in order, the order the author wrote them in, and
// Mermaid draws them into the SVG in that same order, as siblings of the root.
// So the k-th message is `:nth-child(k of [class^="messageLine"])`, and its
// text `:nth-child(k of .messageText)`.
//
// What CSS alone cannot know is how many messages there are, and so how long
// one round of the highlight takes. That is what this module supplies: it reads
// the source the renderer is about to draw, counts the messages, and hands back
// the CSS for this one diagram — the theme's `diagram-step` animation with the
// right cycle, and a delay per message. The renderer appends it to the theme's
// themeCSS for that render only.
//
// Opt-in, by a Mermaid comment the parser ignores:
//
//   sequenceDiagram
//       %% steps
//       autonumber
//       U->>W: Sign in
//       W-->>U: Redirect
//
// The steps light in the theme's accent unless the marker names a colour:
// `%% steps #004494`. On a flowchart — stepped by classDef, not by this module
// — the marker does one thing only: it recolours those steps.
//
// Timing is the flowchart's: one slot per step, and one slot of rest at the end
// of the round, so the last step is not chased by the first.

import {ACCENT} from './mermaid-theme.mjs';

// One step per slot, in seconds. Mirrors the rule authors apply by hand on a
// flowchart (cycle = 1.5s × steps, delay = 1.5s × (k − 1)).
export const STEP_SLOT_S = 1.5;

// How a step lights: a short ramp up, a hold, then straight back — in seconds,
// not in a share of the round. The theme's own keyframes are written in
// percent because a classDef author sets the cycle and the theme cannot know
// it; here the cycle is known, so the window is fixed in time and a step on an
// eighteen-second round looks exactly like one on a six-second round. The
// hold ends before the slot does, so two steps never light together.
const STEP_RAMP_S = 0.3;
const STEP_HOLD_END_S = 1.2;

/**
 * Keyframes for a round of `cycle` seconds, for the three ways a diagram is
 * painted — a line by its stroke, a text by its fill, an arrowhead by both.
 * 0% and 100% are implicit (each element returns to its own colour); the end
 * of the hold carries step-start, so the light leaves at once rather than
 * fading over the rest of the round. Redefining the theme's names is on
 * purpose: the last definition wins, and this one knows the cycle.
 */
export function stepKeyframes(cycle, accent) {
    const pct = (seconds) => `${((100 * seconds) / cycle).toFixed(3)}%`;
    const frames = (lit) =>
        `${pct(STEP_RAMP_S)} { ${lit} } ${pct(STEP_HOLD_END_S)} { ${lit} animation-timing-function: step-start; }`;
    return [
        `@keyframes diagram-step { ${frames(`stroke: ${accent}; stroke-width: 2px;`)} }`,
        `@keyframes diagram-step-ink { ${frames(`fill: ${accent};`)} }`,
        `@keyframes diagram-step-mark { ${frames(`fill: ${accent}; stroke: ${accent};`)} }`,
    ];
}

const SEQUENCE_DIAGRAM = /^\s*(?:%%\{[^]*?\}%%\s*)*sequenceDiagram\b/;
const FLOWCHART = /^\s*(?:%%\{[^]*?\}%%\s*)*(?:flowchart|graph)\b/;

// The marker, with an optional colour: `%% steps` or `%% steps #004494`. The
// colour is what the steps light in — the theme's accent unless one is given.
// Only a hex value or a CSS colour name is accepted: the marker ends up in a
// stylesheet, and this is what keeps it a colour and nothing else.
const STEPS_MARKER = /^\s*%%\s*steps(?:\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30}))?\s*$/m;

/**
 * Reads the marker: `null` when the source has none, otherwise `{color}` —
 * the colour the author asked for, or the theme's accent. Shared with the
 * PlantUML side, whose marker differs only by its comment sign.
 */
export function readStepsMarker(source, marker = STEPS_MARKER) {
    const match = marker.exec(String(source));
    if (!match) return null;
    return {color: match[1] ?? ACCENT};
}

// A message line: a source, an arrow, a target, a colon. The arrows are
// Mermaid's — solid or dotted, with an open head, a filled head, a cross or a
// round end, one-way or both ways (<<->>) — with an optional +/- activation
// shorthand before the target. Keywords that open a block or declare something
// are ruled out first so that `Note over A,B: text` or `loop Every minute` are
// never counted as messages.
const NOT_A_MESSAGE =
    /^\s*(?:%%|note\b|loop\b|alt\b|else\b|opt\b|par\b|and\b|critical\b|option\b|break\b|rect\b|end\b|activate\b|deactivate\b|participant\b|actor\b|autonumber\b|title\b|box\b|links?\b|properties\b|details\b|create\b|destroy\b|accTitle\b|accDescr\b)/i;
const MESSAGE = /^\s*[^\s:]+(?:\s+[^\s:<>-]+)*\s*(?:<<)?--?(?:>>|>|x|\))\s*[+-]?\s*[^\s:]+\s*:/;

/** How many messages a sequence diagram draws, in source order. */
export function countSequenceMessages(source) {
    let count = 0;
    for (const line of String(source).split(/\r?\n/)) {
        if (NOT_A_MESSAGE.test(line)) continue;
        if (MESSAGE.test(line)) count += 1;
    }
    return count;
}

/**
 * The per-diagram CSS for a "%% steps" sequence diagram, or '' when the
 * diagram is not one (not a sequence diagram, no marker, or nothing to step).
 *
 * The keyframes (`diagram-step` for strokes, `diagram-step-ink` for text) are
 * the theme's names, redefined here with this diagram's cycle (stepKeyframes),
 * then set going and staggered along the messages. The `of` form of
 * :nth-child counts only the elements matching the selector, so notes,
 * lifelines and activation boxes drawn between two messages do not shift the
 * numbering. Attribute selectors rather than `.messageLine0, .messageLine1`:
 * a comma inside :nth-child() is not something every CSS pipeline splits
 * correctly, and Mermaid runs themeCSS through one before it reaches the SVG.
 */
export function sequenceStepsCss(source) {
    const text = String(source);
    const marker = readStepsMarker(text);
    if (!SEQUENCE_DIAGRAM.test(text) || !marker) return '';
    const steps = countSequenceMessages(text);
    if (steps === 0) return '';

    const cycle = STEP_SLOT_S * (steps + 1);
    const rules = [
        ...stepKeyframes(cycle, marker.color),
        `[class^="messageLine"] { animation: diagram-step ${cycle}s linear infinite; }`,
        `.messageText { animation: diagram-step-ink ${cycle}s linear infinite; }`,
    ];
    for (let k = 1; k <= steps; k += 1) {
        const delay = STEP_SLOT_S * (k - 1);
        rules.push(
            `:nth-child(${k} of [class^="messageLine"]) { animation-delay: ${delay}s; }`,
            `:nth-child(${k} of .messageText) { animation-delay: ${delay}s; }`,
        );
    }
    return `\n  /* %% steps: ${steps} messages, ${cycle}s round */\n  ${rules.join('\n  ')}\n`;
}

/**
 * The per-diagram CSS for a flowchart carrying `%% steps <colour>`: the
 * theme's percent-based step keyframes, redefined in that colour. A flowchart
 * is stepped by its author's classDef (see mermaid-theme.mjs), so the marker
 * changes nothing else there; without a colour it is a no-op.
 */
export function flowchartStepsCss(source) {
    const text = String(source);
    const marker = readStepsMarker(text);
    if (!FLOWCHART.test(text) || !marker || marker.color === ACCENT) return '';
    const lit = (props) => `4% { ${props} } 14% { ${props} animation-timing-function: step-start; }`;
    return (
        `\n  /* %% steps ${marker.color}: the classDef steps of this flowchart light in this colour */\n` +
        `  @keyframes diagram-step { ${lit(`stroke: ${marker.color}; stroke-width: 2px;`)} }\n` +
        `  @keyframes diagram-step-ink { ${lit(`fill: ${marker.color};`)} }\n`
    );
}

/** What the renderer appends to the theme's CSS for one diagram, '' for most. */
export function stepsCss(source) {
    return sequenceStepsCss(source) || flowchartStepsCss(source);
}
