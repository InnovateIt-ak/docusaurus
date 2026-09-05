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
// MOTION
// ------
// The same reasoning makes animation possible: CSS animations written into the
// SVG's own <style> run inside an <img>, where no script and no page CSS can.
// See the "Motion" section of themeCSS for what moves, and why only dash
// offsets are ever animated (the PDF paints frame zero).
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
// Quiet is not the same as faint. These greys were picked for a design mock
// viewed at full size; in a doc column a wide figure is scaled down to fit, and
// everything below body weight goes with it. At the values they had, the
// hairlines that carry the structure — lifelines, table rules, axis lines,
// subgraph boundaries — sat at about 1.9:1 against the paper, and the small
// labels on them at 3.6:1: quiet on a mock, unreadable in a figure. Each value
// below is the quietest tone that still clears ~3:1 as a hairline (WCAG's
// non-text minimum) and ~4.5:1 where it carries text.
const SOFT = '#6b7488'; // sublabels, lifelines — 4.9:1, still reads as secondary
const RULE = 'rgba(45, 49, 66, 0.22)'; // quiet hairline
const RULE_SOLID = '#9aa3b2'; // stronger hairline, baselines — 3.0:1
const INK_05 = 'rgba(45, 49, 66, 0.07)'; // "store" role: data stores, activations
const INK_03 = 'rgba(45, 49, 66, 0.045)'; // "external" role: out of scope
const GRID = '#ccd2dc'; // axis gridlines (Gantt, XY chart)
export const ACCENT = '#eb6c36'; // tangerine: the one accent (also the default colour of the steps, diagram-steps.mjs)
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
    fill: ${MUTED};
  }

  /* Edges: 1px hairline, rounded ends. */
  .edgePath .path,
  .flowchart-link,
  .relationshipLine {
    stroke-width: 1px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Edge annotations: mono, sitting on a paper chip. Mermaid ships that chip at
     half opacity, so the edge it straddles runs straight through the letters —
     the single worst thing to read in a flowchart. Here it is opaque paper, and
     the annotation sits on it rather than in the line. */
  .edgeLabel rect,
  .edgeLabel .label-container {
    rx: 4px;
    ry: 4px;
    fill: ${PAPER};
    opacity: 1;
  }
  /* The smallest text in a figure — 10px mono, and smaller still once a wide
     diagram is scaled into the column — so it takes the full ink rather than
     the secondary tone; at that size contrast is what is left to read by. The
     tracking is trimmed with it, which keeps the label no wider than the box
     Mermaid measured for it. */
  .edgeLabels text,
  .edgeLabel text,
  .edgeLabel text tspan,
  .messageText {
    font-family: ${MONO};
    font-size: 10px;
    letter-spacing: 0.04em;
    fill: ${INK};
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

  /* --- Motion --------------------------------------------------------------
     The SVG sits in an <img>, which runs no script and takes no CSS from the
     page — but it does run the CSS baked into its own <style>, and that is
     where these rules end up. So a diagram can move, provided the motion is
     described here and needs nothing from outside.

     Two sources of motion, one rule for both:

       * an author asks for it on one edge: "A e1@--> B" followed by
         "e1@{ animate: true }" (or "animation: slow"). Mermaid adds the class
         edge-animation-fast/-slow and its own keyframes; nothing to do here
         but respect the reader's motion preference below.
       * a dotted flowchart link flows on its own. Dotted is how these diagrams
         draw the asynchronous and the eventual — a message on a queue, a
         sync that runs later — and a slow drift of the dots along the line
         says "this moves" without a second colour or a label.

     What is animated is only the dash offset: the dashes slide, nothing fades
     or appears. That is what keeps the PDF right — WeasyPrint plays no
     animation and paints frame zero, which here is a plain dotted line, the
     same the page shows between two frames. Never animate opacity or a
     transform from a hidden state: the PDF would keep the blank.

     The dash pattern is marked important, as Mermaid's own edge-animation
     classes mark theirs: whatever dash an edge carries as an attribute or an
     inline style, the flowing one wins. 8px per 0.6s is a slow drift
     (~13px/s), close to Mermaid's "animation: slow", so an author's explicit
     choice and the theme's default read as one family. An edge the author did
     animate is left out of the default: the two-class selector would otherwise
     outrank Mermaid's single class and replace the speed they asked for. */
  @keyframes diagram-flow {
    to {
      stroke-dashoffset: -8;
    }
  }
  .flowchart-link.edge-pattern-dotted:not(.edge-animation-slow):not(.edge-animation-fast) {
    stroke-dasharray: 4 4 !important;
    stroke-dashoffset: 0;
    animation: diagram-flow 0.6s linear infinite;
  }

  /* Steps: 1, then 2, then 3. A sequence is told by a highlight that travels
     from one element to the next — the accent, and a heavier stroke, held for
     a moment on each in turn, then the whole thing again. Nothing is hidden
     and revealed: that would leave the PDF's frame zero with a blank where
     steps 2 and 3 belong. The frame zero here is every element at rest.

     The keyframes below name only the highlighted state (4% to 14% of the
     cycle). The 0% and 100% frames are left implicit on purpose: CSS then
     takes them from the element's own computed values, so one set of
     keyframes serves an edge (stroke in MUTED) and a node (stroke in INK)
     alike, each returning to its own colour. The 14% frame carries
     step-start: without it the way back to the implicit 100% is a fade over
     the rest of the round, and on a long round every step is still tinted
     when the next lights — the diagram turns orange. With it the light
     leaves as the next one arrives, and the ramp in (0% to 4%) is the only
     transition.

     Authors reach this through Mermaid's classDef, which lands on an edge's
     path and a node's shape as an inline style; there is no class an author
     can put on an edge, so the timing has to travel with the style:

       classDef step1 animation: diagram-step 4.5s linear infinite 0s
       classDef step2 animation: diagram-step 4.5s linear infinite 1.5s
       classDef step3 animation: diagram-step 4.5s linear infinite 3s
       class e1,U step1
       class e2 step2
       class e3,D step3

     Cycle = 1.5s x number of steps (add a slot for a pause), delay of step k
     = 1.5s x (k - 1). This is the by-hand way, for lighting nodes as well as
     edges. The other way needs no classDef: a "%% steps" comment makes
     diagram-steps.mjs step the arrows in source order, after the render, for
     a flowchart or a sequence diagram alike — and "%% steps reveal" makes
     them appear one by one instead. The window is a fraction of the cycle, so a long chain
     overlaps its steps into a wave, and a short one leaves a gap between
     them — both read as an order. A dotted edge given a step loses the drift
     above (the inline animation replaces it) but keeps its dashes. */
  @keyframes diagram-step {
    4% {
      stroke: ${ACCENT};
      stroke-width: 2px;
    }
    14% {
      stroke: ${ACCENT};
      stroke-width: 2px;
      animation-timing-function: step-start;
    }
  }
  /* The same beat for text, which is drawn by its fill: an edge label or a
     message lights with its arrow (see diagram-steps.mjs). */
  @keyframes diagram-step-ink {
    4% {
      fill: ${ACCENT};
    }
    14% {
      fill: ${ACCENT};
      animation-timing-function: step-start;
    }
  }

  /* A reader who asked their system for less motion gets still diagrams: the
     theme's flow, the author's edge animations and the steps alike. Media
     queries are evaluated inside an <img> too — user preferences are not page
     context.

     Two locks, because one is not enough. The blanket rule stops every
     animation set by a class (Mermaid's edge-animation-*, the drift above) and
     an edge's inline step, which Mermaid writes without !important. A node's
     step it cannot stop: Mermaid writes that inline style WITH !important, and
     an important inline declaration beats an important stylesheet one. So the
     keyframes are redefined empty here as well — the animation still runs, on
     a track with nothing on it — and that no inline style can undo. The dash
     patterns are kept, so the figure is the one the PDF has. */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
    }
    @keyframes diagram-flow {
    }
    @keyframes diagram-step {
    }
    @keyframes diagram-step-ink {
    }
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

    // Git graph: left to itself, Mermaid derives branch colours from the theme
    // and lands on near-white greys — branch lines, commit dots and the labels
    // on them all but disappeared on the paper. The branches are named here
    // instead, in the ink family with the accent third, each dark enough to
    // carry a white label; commit and tag labels stay ink on paper.
    git0: INK,
    git1: MUTED,
    git2: ACCENT,
    git3: '#5f7a5a', // sage, darkened for a white label
    git4: '#4d6b8a', // dusty blue, darkened
    git5: '#8a6a35', // mustard, darkened
    git6: '#7a4f3a', // rust brown
    git7: '#6b6377', // slate
    gitBranchLabel0: WHITE,
    gitBranchLabel1: WHITE,
    gitBranchLabel2: WHITE,
    gitBranchLabel3: WHITE,
    gitBranchLabel4: WHITE,
    gitBranchLabel5: WHITE,
    gitBranchLabel6: WHITE,
    gitBranchLabel7: WHITE,
    commitLabelColor: INK,
    commitLabelBackground: PAPER,
    commitLabelFontSize: '11px',
    tagLabelColor: INK,
    tagLabelBackground: PAPER,
    tagLabelBorder: MUTED,
    tagLabelFontSize: '11px',

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
