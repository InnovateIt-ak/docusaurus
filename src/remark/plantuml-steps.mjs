// Stepped PlantUML diagrams: "' steps".
//
// The PlantUML counterpart of Mermaid's stepped diagrams (mermaid-steps.mjs):
// a highlight that travels from the first message or link to the next, in the
// order the author wrote them, then starts the round again. Nothing is hidden
// and revealed — the PDF, which plays no animation, would keep the blank — so
// at rest the figure is the complete diagram.
//
// Opt-in, by a PlantUML comment the parser ignores:
//
//   @startuml
//   ' steps
//   User -> Auth: Login
//   Auth --> User: session cookie
//   @enduml
//
// WHAT THE SVG OFFERS
// -------------------
// PlantUML groups what it draws, and names the groups:
//
//   * a sequence diagram: <g class="message" id="msgN"> around each message —
//     its line (or path, for a self-message), its arrowhead polygon and its
//     text;
//   * a description diagram (component, deployment, C4, use case…): <g
//     class="link" id="lnkN"> around each link, same content, and <g
//     class="entity"> around each node.
//
// The number in the id is the order the author wrote them in: PlantUML numbers
// messages and links as it reads them. That is what orders the steps. A
// sequence diagram draws its messages in that order anyway; a Graphviz-laid-out
// diagram does not (the DOM follows the layout), and the id is what puts the
// links back in the order the author meant. Not data-source-line, which the
// groups also carry: for a link drawn by a macro (C4's Rel(), say) it points
// into the included library, the same line for every link.
//
// Not everything is grouped. Activity diagrams carry neither ids nor classes,
// and the C4 sequence library (C4_Sequence) draws messages that PlantUML does
// not group either; those diagrams stay still, marker or not.
//
// The animation is written into a <style> inserted right after the opening
// <svg> tag — inside the SVG, which is the only place CSS reaches once the
// diagram is an <img>. Animations beat PlantUML's inline styles (an animation
// outranks a normal declaration, inline included); nothing here is !important
// and nothing in PlantUML's output is either.
import {ACCENT} from './mermaid-theme.mjs';
import {STEP_SLOT_S, stepKeyframes} from './mermaid-steps.mjs';

// One step per slot: STEP_SLOT_S, the Mermaid diagrams' beat, so a page mixing
// the two reads as one system. The keyframes are theirs too.

const STEPS_MARKER = /^\s*'\s*steps\s*$/m;
const GROUP = /<g class="(message|link)"([^>]*)>/g;

/** The stepped groups of an SVG, in the order the author wrote them. */
export function collectStepGroups(svg) {
    const groups = [];
    let match;
    let index = 0;
    while ((match = GROUP.exec(svg)) !== null) {
        const attrs = match[2];
        const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
        if (!id) continue;
        const number = Number(/(\d+)$/.exec(id)?.[1]);
        groups.push({id, number: Number.isFinite(number) ? number : Infinity, index: index++});
    }
    // Creation order (the id's number) first; DOM order settles a tie.
    groups.sort((a, b) => a.number - b.number || a.index - b.index);
    return groups;
}

/** The <style> that steps the given groups, or '' when there is nothing to step. */
export function stepsStyle(groups) {
    if (groups.length === 0) return '';
    const cycle = STEP_SLOT_S * (groups.length + 1);
    // Three keyframes for the three ways PlantUML paints: a line by its stroke,
    // a text by its fill, an arrowhead by both (see stepKeyframes).
    const rules = [
        ...stepKeyframes(cycle, ACCENT),
        `.message line, .message path, .link line, .link path { animation: diagram-step ${cycle}s linear infinite; }`,
        `.message text, .link text { animation: diagram-step-ink ${cycle}s linear infinite; }`,
        `.message polygon, .link polygon { animation: diagram-step-mark ${cycle}s linear infinite; }`,
    ];
    groups.forEach((group, k) => {
        rules.push(`#${group.id} * { animation-delay: ${STEP_SLOT_S * k}s; }`);
    });
    // A reader who asked their system for less motion gets the still figure —
    // the one the PDF has. Media queries are evaluated inside an <img> too.
    rules.push('@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }');
    return `<style>/* ' steps: ${groups.length} steps, ${cycle}s round */\n${rules.join('\n')}\n</style>`;
}

/**
 * The SVG with its steps animated, when the source asks for it ("' steps")
 * and the diagram has messages or links to step; the SVG untouched otherwise.
 */
export function withSteps(source, svg) {
    if (!STEPS_MARKER.test(String(source))) return svg;
    const style = stepsStyle(collectStepGroups(svg));
    if (!style) return svg;
    // Right after the opening <svg …> tag, before <defs> and the drawing.
    return svg.replace(/<svg\b[^>]*>/, (openTag) => `${openTag}${style}`);
}
