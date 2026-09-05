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
// Timing is the flowchart's: one slot per step, and one slot of rest at the end
// of the round, so the last step is not chased by the first.

// One step per slot, in seconds. Mirrors the rule authors apply by hand on a
// flowchart (cycle = 1.5s × steps, delay = 1.5s × (k − 1)).
export const STEP_SLOT_S = 1.5;

const SEQUENCE_DIAGRAM = /^\s*(?:%%\{[^]*?\}%%\s*)*sequenceDiagram\b/;
const STEPS_MARKER = /^\s*%%\s*steps\s*$/m;

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
 * The keyframes themselves (`diagram-step` for strokes, `diagram-step-ink` for
 * text) come from the theme; this only sets them going with the cycle this
 * diagram needs, and staggers the messages along it. The `of` form of
 * :nth-child counts only the elements matching the selector, so notes,
 * lifelines and activation boxes drawn between two messages do not shift the
 * numbering. Attribute selectors rather than `.messageLine0, .messageLine1`:
 * a comma inside :nth-child() is not something every CSS pipeline splits
 * correctly, and Mermaid runs themeCSS through one before it reaches the SVG.
 */
export function sequenceStepsCss(source) {
    const text = String(source);
    if (!SEQUENCE_DIAGRAM.test(text) || !STEPS_MARKER.test(text)) return '';
    const steps = countSequenceMessages(text);
    if (steps === 0) return '';

    const cycle = STEP_SLOT_S * (steps + 1);
    const rules = [
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
