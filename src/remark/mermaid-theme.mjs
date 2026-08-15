// The site's Mermaid theme — the skin applied to every diagram.
//
// WHY HERE, AND NOT IN src/css/custom.css
// ---------------------------------------
// Diagrams are rendered to SVG at build time, then inlined as a data-URL <img>
// (see mermaid-inline.mjs). An <img> is a replaced element: page CSS stops at
// its border. No rule in custom.css can reach a node, an edge or a label — it
// can only dress the frame around the image (background, border, margins).
//
// The content's look is therefore settled at generation time, through the
// Mermaid config: `themeVariables` (the palette, which Mermaid resolves into
// the <style> it embeds in the SVG) and `themeCSS` (raw CSS appended to that
// same <style>). The result is baked into the SVG, so it holds for the site AND
// for the WeasyPrint PDF, which runs no JavaScript.
//
// WHERE THIS PALETTE COMES FROM
// -----------------------------
// The "Diagram Design" system (github.com/cathrynlavery/diagram-design), whose
// style-guide.md supplies the semantic roles used below: slate ink, blue-slate
// for secondary, and ONE tangerine accent. Three of its rules are structural,
// and are honoured here:
//
//   * One accent only. Two accents erase the "this is what matters" signal, so
//     the accent is spent only where meaning is focal by construction: notes,
//     a Gantt critical path, the today line, the first slice of a pie.
//   * No rainbow palette. Anything that is neither ink nor accent is a muted
//     variant.
//   * Serif + sans + mono, three families. Serif titles, sans names things,
//     mono carries the technical (field types, edge annotations).
//
// Note: this is not the site's own palette (EU institutional blue #004494, see
// custom.css and docker/weasyprint/report.css), so diagrams carry an identity
// of their own. To realign them with the site, swap ACCENT for the EU blue —
// the rest of the system holds untouched.
//
// FONTS ARE NOT EMBEDDED
// ----------------------
// Geist / Instrument Serif cannot be embedded in the SVG: Mermaid strips
// `@font-face` rules out of themeCSS (verified — rendering yields identical
// widths with and without). The stacks below name them first, then fall back to
// a system grotesque. To have them everywhere you would need to install the
// TTFs in the build image (docker/Dockerfile, next to the DejaVu fonts already
// there) AND embed them through mermaid-cli's `myCSS` option, so that measuring
// and display use the same face.
//
// CONSTRAINTS NOT TO BREAK
// ------------------------
// * `htmlLabels: false` — WeasyPrint does not render <foreignObject>; without
//   this the PDF comes out with empty boxes and arrows. Labels must stay SVG
//   <text>. That is also why the CSS below targets raw `text` / `tspan` on top
//   of Mermaid's own classes.
// * Transparent background — the PDF is light, and the site lays the white
//   paper behind the image itself (custom.css). The paper is therefore not in
//   the SVG: nodes are white and ringed with an ink hairline, which makes them
//   read identically on the site and on the PDF's white page.
// * Light palette — the same SVG serves both site themes and the PDF; a dark
//   theme here would make the PDF unreadable.

// --- Tokens ------------------------------------------------------------------
// Named by semantic role, as in the original style guide.
// One deliberate departure from that guide, which asks for a warm paper rather
// than pure white: paper is white here. As a consequence nodes — white too,
// the "backend" role — no longer stand out by their fill but by their ink
// hairline. Every background fill in the theme therefore gives way to outlines:
// that is the reason for the `transparent` values further down.
const PAPER = '#ffffff'; // the paper (laid down by custom.css)
const WHITE = '#ffffff'; // fill of primary nodes ("backend" role)
const INK = '#2d3142'; // ink: text and primary hairlines
const MUTED = '#4f5d75'; // blue-slate: secondary text, edges
const SOFT = '#7a8399'; // sublabels, lifelines
const RULE = 'rgba(45, 49, 66, 0.12)'; // quiet hairline
const RULE_SOLID = '#bfc0c0'; // stronger hairline, baselines
const INK_05 = 'rgba(45, 49, 66, 0.05)'; // "store" role: data stores, activations
const INK_03 = 'rgba(45, 49, 66, 0.03)'; // "external" role: out of scope
const GRID = '#e2e5ea'; // axis gridlines (Gantt, XY chart)
const ACCENT = '#eb6c36'; // tangerine: the one accent
const ACCENT_TINT = 'rgba(235, 108, 54, 0.08)'; // fill behind accented elements

// Categorical series, reserved for the types that genuinely distinguish several
// entities (pie, journey). The accent opens the series — that is the focal one.
// The guide's blue-slate and slate are lightened by a notch: laid as solid fills
// under an ink label, the original values fell below the contrast threshold
// (the guide intends them as fills at 18% opacity).
const SERIES = [
    ACCENT, // focal
    '#7c8f6f', // sage
    '#7793b3', // dusty blue, lightened
    '#b8915a', // mustard
    '#9c6b50', // rust brown
    '#8b8296', // slate, lightened
];

// --- Typography ---------------------------------------------------------------
// Three families, three roles. See "FONTS ARE NOT EMBEDDED".
const SANS = 'Geist, Inter, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, "DejaVu Sans Mono", monospace';
const SERIF = '"Instrument Serif", "Iowan Old Style", Palatino, Georgia, serif';

// --- Fine detailing, as CSS injected into the SVG's <style> --------------------
// What `themeVariables` does not cover: corner radii, stroke widths, families
// per role. Three rules apply here:
//
// * No backticks anywhere in this template literal — they would close it.
// * No `filter` and no drop shadow — WeasyPrint does not render them and the
//   PDF would diverge from the site. The original system uses none either:
//   everything is carried by hairlines.
// * Never widen text. Mermaid measures each label to size its box, and only
//   then does this CSS apply: a larger font would overflow a box already fixed.
//   So every family change below comes with a size smaller than the measuring
//   size (13px), which leaves headroom even where mono is wider than sans.
const themeCSS = `
  /* Nodes: 1px hairline, 6px corners (radius-md). */
  .node rect,
  .node polygon,
  .node circle,
  .node ellipse,
  .node path {
    stroke-width: 1px;
  }
  .node rect,
  .node .label-container {
    rx: 6px;
    ry: 6px;
  }

  /* Subgraphs: a boundary, not a box. Quiet dashed hairline, 8px corners
     (radius-lg). */
  .cluster rect {
    rx: 8px;
    ry: 8px;
    stroke-width: 1px;
    stroke-dasharray: 4 3;
  }
  /* Subgraph title as an eyebrow: mono, uppercase, wide tracking. Uppercasing
     widens by roughly 15%, but dropping from 13px to 10px takes back more than
     that — the label stays inside its box. */
  .cluster-label text,
  .cluster-label text tspan,
  .cluster span {
    font-family: ${MONO};
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    fill: ${SOFT};
  }

  /* Edges: 1px hairline, rounded ends. */
  .edgePath .path,
  .flowchart-link,
  .relationshipLine {
    stroke-width: 1px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Edge annotations: mono, sitting on a paper chip. */
  .edgeLabel rect,
  .edgeLabel .label-container {
    rx: 4px;
    ry: 4px;
  }
  .edgeLabels text,
  .edgeLabel text,
  .edgeLabel text tspan,
  .messageText {
    font-family: ${MONO};
    font-size: 10px;
    letter-spacing: 0.06em;
    fill: ${MUTED};
  }

  /* Diagram titles (pie, Gantt): serif, size unchanged — Mermaid has already
     computed the SVG bounds from the measured size. */
  .titleText,
  .pieTitleText,
  text.title {
    font-family: ${SERIF};
    font-weight: 400;
    fill: ${INK};
  }

  /* Axis ticks (Gantt, XY chart). Mermaid sets stroke="currentColor" as a
     presentation attribute on the tick line, while the rule it generates
     targets the parent group: the attribute beats the inherited value and the
     line comes out black. A CSS rule aimed at the line itself does win. */
  .grid .tick line,
  .axis line,
  .axis path {
    stroke: ${GRID};
    stroke-width: 1px;
  }

  /* Sequence: actors ringed in ink, lifelines and frames as hairlines. */
  .actor {
    stroke-width: 1px;
  }
  text.actor > tspan {
    font-weight: 600;
  }
  .actor-line {
    stroke: ${RULE_SOLID};
    stroke-width: 1px;
  }
  .loopLine {
    stroke-width: 1px;
    stroke-dasharray: 4 3;
  }
  /* The loop / alt tag: same eyebrow as subgraph titles. */
  .labelText,
  .labelText tspan,
  .loopText,
  .loopText tspan {
    font-family: ${MONO};
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  /* ER and class diagrams: the name in bold, field types in mono — exactly the
     "names in sans, technical in mono" split. */
  .er.entityLabel,
  .entityTitleText,
  .classTitle {
    font-weight: 600;
  }
  .er.entityBox {
    rx: 6px;
    ry: 6px;
  }
  .er.attributeBoxOdd,
  .er.attributeBoxEven {
    stroke: ${RULE_SOLID};
    stroke-width: 1px;
  }
`;

// --- Theme variables -----------------------------------------------------------
// From `theme: 'base'` Mermaid derives every colour not supplied here, so we set
// the ones that carry the visual identity and let Mermaid compute the rest.
const themeVariables = {
    darkMode: false,
    background: 'transparent',
    fontFamily: SANS,
    // The original guide specifies 12px for node names. 13px here: a wide figure
    // is scaled down to fit the doc column, and the text shrinks with it.
    fontSize: '13px',

    // Nodes and text — the "backend" role: white fill, ink hairline.
    primaryColor: WHITE,
    primaryTextColor: INK,
    primaryBorderColor: INK,
    mainBkg: WHITE,
    nodeBorder: INK,
    textColor: INK,
    titleColor: INK,
    // "store" role: data stores, second plane.
    secondaryColor: INK_05,
    secondaryTextColor: INK,
    secondaryBorderColor: MUTED,
    // "external" role: whatever sits outside the scope.
    tertiaryColor: INK_03,
    tertiaryTextColor: INK,
    tertiaryBorderColor: RULE_SOLID,

    // Edges
    lineColor: MUTED,
    edgeLabelBackground: PAPER,

    // A subgraph is a boundary, not a block: no fill, only the dashed hairline
    // delimits it.
    clusterBkg: 'transparent',
    clusterBorder: RULE_SOLID,

    // Notes: an author writes a note to draw the eye — that is where the accent
    // gets spent.
    noteBkgColor: ACCENT_TINT,
    noteTextColor: INK,
    noteBorderColor: ACCENT,

    // Sequence
    actorBkg: WHITE,
    actorBorder: INK,
    actorTextColor: INK,
    actorLineColor: RULE_SOLID,
    signalColor: MUTED,
    signalTextColor: MUTED,
    labelBoxBkgColor: WHITE,
    labelBoxBorderColor: RULE_SOLID,
    labelTextColor: INK,
    loopTextColor: MUTED,
    activationBkgColor: INK_05,
    activationBorderColor: MUTED,
    sequenceNumberColor: WHITE,

    // Entity-relationship: rows alternating paper and very dilute ink.
    attributeBackgroundColorOdd: WHITE,
    attributeBackgroundColorEven: INK_03,

    // Gantt: everything in muted greys, the accent kept for the critical path
    // and the today line.
    taskBkgColor: WHITE,
    taskBorderColor: INK,
    taskTextColor: INK,
    taskTextOutsideColor: INK,
    taskTextDarkColor: INK,
    activeTaskBkgColor: INK_05,
    activeTaskBorderColor: INK,
    doneTaskBkgColor: INK_03,
    doneTaskBorderColor: RULE_SOLID,
    critBkgColor: ACCENT_TINT,
    critBorderColor: ACCENT,
    gridColor: GRID,
    // Alternating section bands: one row bare, the next barely tinted.
    sectionBkgColor: 'transparent',
    sectionBkgColor2: INK_03,
    altSectionBkgColor: 'transparent',
    todayLineColor: ACCENT,

    // C4 and "architecture" ship their own palette (blues hardcoded inside
    // Mermaid). Only these keys are themable; the rest — C4 system fills, the
    // "architecture" icon set — is settled in the diagram itself, through
    // `UpdateElementStyle` / `UpdateRelStyle` for C4. See the
    // docs/mermaid-diagrams.mdx page.
    personBkg: WHITE,
    personBorder: INK,
    boundaryColor: SOFT,
    componentLabelColor: INK,
    nodeBkg: WHITE,
    nodeBorder: INK,
    nodeTextColor: INK,
    archEdgeColor: MUTED,
    archEdgeArrowColor: MUTED,
    archEdgeWidth: '1',
    archGroupBorderColor: RULE_SOLID,
    archGroupBorderWidth: '1',

    // XY chart: Mermaid gives it a palette of its own (a very pale yellow by
    // default, unreadable on white paper). We replace it with the categorical
    // series, the accent opening the first curve.
    xyChart: {
        backgroundColor: 'transparent',
        titleColor: INK,
        dataLabelColor: INK,
        xAxisTitleColor: INK,
        xAxisLabelColor: INK,
        xAxisTickColor: GRID,
        xAxisLineColor: RULE_SOLID,
        yAxisTitleColor: INK,
        yAxisLabelColor: INK,
        yAxisTickColor: GRID,
        yAxisLineColor: RULE_SOLID,
        plotColorPalette: SERIES.join(','),
    },

    // Categorical series: the accent opens, the editorial tones follow. Slice
    // labels stay in ink, and slices are separated by paper.
    pie1: SERIES[0],
    pie2: SERIES[1],
    pie3: SERIES[2],
    pie4: SERIES[3],
    pie5: SERIES[4],
    pie6: SERIES[5],
    // Past six slices the series loops back on itself: no rainbow.
    pie7: SERIES[1],
    pie8: SERIES[2],
    pie9: SERIES[3],
    pie10: SERIES[4],
    pie11: SERIES[5],
    pie12: MUTED,
    pieStrokeColor: PAPER,
    pieOuterStrokeColor: RULE_SOLID,
    pieSectionTextColor: INK,
    pieTitleTextColor: INK,
    pieLegendTextColor: INK,
};

// The full configuration handed to `renderMermaid`.
export const MERMAID_CONFIG = {
    theme: 'base',
    themeVariables,
    themeCSS,

    // Labels as SVG <text> rather than <foreignObject>: required by the PDF
    // (see the header). Set both at the root AND per diagram, since which level
    // is read depends on the diagram type.
    htmlLabels: false,

    flowchart: {
        htmlLabels: false,
        // Soft curves rather than right-angled segments.
        curve: 'basis',
        // Room to breathe: the original system is far airier than Mermaid's
        // default rendering.
        nodeSpacing: 60,
        rankSpacing: 72,
        padding: 16,
        // An intrinsic pixel width rather than a 100%-wide SVG: that is what
        // the SVG normalisation (normalizeSvg) and the PDF generator's
        // orientation heuristic both expect.
        useMaxWidth: false,
    },
    sequence: {
        useMaxWidth: false,
        diagramMarginX: 32,
        diagramMarginY: 20,
        boxMargin: 16,
        actorMargin: 64,
    },
    class: {useMaxWidth: false},
    er: {useMaxWidth: false, entityPadding: 16},
    gantt: {useMaxWidth: false},
    journey: {useMaxWidth: false},
    pie: {useMaxWidth: false},
    state: {useMaxWidth: false},
};

export default MERMAID_CONFIG;
