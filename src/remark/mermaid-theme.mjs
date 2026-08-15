// Thème Mermaid du site — la « surcouche » d'habillage des diagrammes.
//
// POURQUOI ICI, ET PAS DANS src/css/custom.css
// --------------------------------------------
// Les diagrammes sont rendus au build en SVG, puis inlinés en data-URL dans une
// balise <img> (voir mermaid-inline.mjs). Un <img> est un élément remplacé : le
// CSS de la page ne franchit pas sa frontière. Aucune règle de custom.css ne
// peut donc atteindre un nœud, une arête ou un libellé — elle ne peut habiller
// que le cadre extérieur de l'image (fond, bordure, marges).
//
// L'habillage du contenu se joue donc à la génération, via la configuration
// Mermaid : `themeVariables` (la palette, résolue par Mermaid dans le <style>
// qu'il embarque dans le SVG) et `themeCSS` (du CSS brut ajouté à ce même
// <style>). Le résultat est cuit dans le SVG : il vaut pour le site ET pour le
// PDF WeasyPrint, qui n'exécute aucun JavaScript.
//
// CONTRAINTES À NE PAS CASSER
// ---------------------------
// * `htmlLabels: false` — WeasyPrint ne rend pas <foreignObject> ; sans cela le
//   PDF sort avec des boîtes et des flèches vides. Les libellés doivent rester
//   des <text> SVG. C'est aussi pourquoi le CSS ci-dessous cible `text` /
//   `tspan` en plus des classes Mermaid.
// * Fond transparent — le PDF est clair, et le site pose lui-même une carte
//   blanche derrière l'image en thème sombre (custom.css).
// * Palette claire — le même SVG sert les deux thèmes du site et le PDF ; un
//   thème sombre ici rendrait le PDF illisible.
//
// La palette suit celle du site : bleu institutionnel UE #004494, accent or
// #ffcc00 (custom.css, docker/weasyprint/report.css).

// --- Palette ----------------------------------------------------------------
const BLUE = '#004494'; // bleu institutionnel UE, bordures et titres
const BLUE_SOFT = '#33578f'; // arêtes et traits : le bleu, adouci
const BLUE_TINT = '#e8f0fa'; // remplissage des nœuds
const BLUE_TINT_2 = '#d3e2f5'; // second niveau (nœuds secondaires, activations)
const SURFACE = '#f6f8fb'; // fonds neutres (sous-graphes, lignes alternées)
const BORDER_SOFT = '#a9bdd8'; // bordures discrètes
const INK = '#12263f'; // texte
const GOLD_TINT = '#fff8dd'; // fond des notes, dérivé de l'or UE #ffcc00
const GOLD_BORDER = '#e0b400'; // bordure des notes

// Pile de polices sans-serif : sur le site, Chromium résout la première
// disponible ; dans le conteneur PDF, la chaîne retombe sur `sans-serif`.
const FONT = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

// --- Habillage fin, en CSS injecté dans le <style> du SVG --------------------
// Ce que `themeVariables` ne couvre pas : angles arrondis, épaisseurs de trait,
// graisses. Deux règles à respecter ici :
//
// * Pas de `filter` ni d'ombre portée — WeasyPrint ne les rend pas, le PDF
//   divergerait du site.
// * Ne pas élargir le texte. Mermaid mesure chaque libellé pour dimensionner sa
//   boîte, puis ce CSS s'applique : une `font-size` ou une `font-weight` plus
//   grande ici déborderait d'une boîte déjà figée. La taille de police se règle
//   via `fontSize` dans themeVariables (lu à la mesure) ; les graisses ci-dessous
//   sont réservées aux libellés qui disposent d'une marge propre (titres de
//   sous-graphe, d'entité, de classe, acteurs).
const themeCSS = `
  /* Nœuds : coins arrondis et trait un peu plus affirmé que le défaut. */
  .node rect,
  .node polygon,
  .node circle,
  .node ellipse,
  .node path {
    stroke-width: 1.5px;
  }
  .node rect,
  .node .label-container {
    rx: 6px;
    ry: 6px;
  }

  /* Sous-graphes : cadre discret en pointillés, pour ne pas concurrencer
     visuellement les nœuds qu'il regroupe. */
  .cluster rect {
    rx: 10px;
    ry: 10px;
    stroke-width: 1.2px;
    stroke-dasharray: 5 3;
  }
  .cluster-label text,
  .cluster span {
    font-weight: 600;
  }

  /* Arêtes : trait légèrement épaissi, extrémités arrondies. */
  .edgePath .path,
  .flowchart-link,
  .relationshipLine {
    stroke-width: 1.6px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Libellés d'arête : posés sur une pastille claire arrondie, pour rester
     lisibles quand ils chevauchent un trait. */
  .edgeLabel rect,
  .edgeLabel .label-container {
    rx: 4px;
    ry: 4px;
  }

  /* Diagrammes de séquence : acteurs affirmés, boucles/alternatives discrètes. */
  .actor {
    stroke-width: 1.5px;
  }
  text.actor > tspan {
    font-weight: 600;
  }
  .loopLine {
    stroke-width: 1.2px;
    stroke-dasharray: 4 3;
  }

  /* Diagrammes ER et de classes : en-tête de bloc en gras. */
  .er.entityLabel,
  .entityTitleText,
  .classTitle {
    font-weight: 600;
  }
  .er.entityBox {
    rx: 6px;
    ry: 6px;
  }
`;

// --- Variables de thème ------------------------------------------------------
// Mermaid dérive de `theme: 'base'` toutes les couleurs non fournies ; on fixe
// explicitement celles qui portent l'identité visuelle, et on laisse Mermaid
// calculer le reste.
const themeVariables = {
    darkMode: false,
    background: 'transparent',
    fontFamily: FONT,
    fontSize: '15px',

    // Nœuds et texte
    primaryColor: BLUE_TINT,
    primaryTextColor: INK,
    primaryBorderColor: BLUE,
    secondaryColor: SURFACE,
    secondaryTextColor: INK,
    secondaryBorderColor: BORDER_SOFT,
    tertiaryColor: GOLD_TINT,
    tertiaryTextColor: INK,
    tertiaryBorderColor: GOLD_BORDER,
    mainBkg: BLUE_TINT,
    nodeBorder: BLUE,
    textColor: INK,
    titleColor: BLUE,

    // Arêtes
    lineColor: BLUE_SOFT,
    edgeLabelBackground: '#ffffff',

    // Sous-graphes
    clusterBkg: SURFACE,
    clusterBorder: BORDER_SOFT,

    // Notes (accent or)
    noteBkgColor: GOLD_TINT,
    noteTextColor: INK,
    noteBorderColor: GOLD_BORDER,

    // Séquence
    actorBkg: BLUE_TINT,
    actorBorder: BLUE,
    actorTextColor: INK,
    actorLineColor: BORDER_SOFT,
    signalColor: BLUE_SOFT,
    signalTextColor: INK,
    labelBoxBkgColor: BLUE_TINT_2,
    labelBoxBorderColor: BLUE,
    labelTextColor: INK,
    loopTextColor: INK,
    activationBkgColor: BLUE_TINT_2,
    activationBorderColor: BLUE,
    sequenceNumberColor: '#ffffff',

    // Entité-relation : lignes alternées, en-têtes bleus
    attributeBackgroundColorOdd: '#ffffff',
    attributeBackgroundColorEven: SURFACE,

    // Gantt
    taskBkgColor: BLUE_TINT,
    taskBorderColor: BLUE,
    taskTextColor: INK,
    taskTextOutsideColor: INK,
    taskTextDarkColor: INK,
    activeTaskBkgColor: BLUE_TINT_2,
    activeTaskBorderColor: BLUE,
    doneTaskBkgColor: SURFACE,
    doneTaskBorderColor: BORDER_SOFT,
    critBkgColor: '#fde2e2',
    critBorderColor: '#b3261e',
    gridColor: '#dbe3ee',
    sectionBkgColor: SURFACE,
    sectionBkgColor2: '#eef3f9',
    altSectionBkgColor: '#ffffff',
    todayLineColor: GOLD_BORDER,

    // Séries catégorielles (camembert, parcours, quadrant…). Une série est
    // qualitative : des teintes distinctes, pas un dégradé — sur un camembert,
    // deux nuances voisines d'un même bleu ne se distinguent plus une fois les
    // parts séparées. La série ouvre donc sur le bleu UE puis parcourt la roue.
    // Toutes sont assez sombres pour porter le texte blanc des parts
    // (pieSectionTextColor), y compris la douzième.
    pie1: BLUE,
    pie2: '#0f6f8c',
    pie3: '#8a5a1f',
    pie4: '#6a4c9c',
    pie5: '#2f7a4f',
    pie6: '#a3342b',
    pie7: '#2f6cb5',
    pie8: '#8e2f6b',
    pie9: '#4a5568',
    pie10: '#166b63',
    pie11: '#7a3b12',
    pie12: '#5a6b12',
    pieStrokeColor: '#ffffff',
    pieOuterStrokeColor: BORDER_SOFT,
    pieSectionTextColor: '#ffffff',
    pieTitleTextColor: BLUE,
};

// Configuration complète passée à `renderMermaid`.
export const MERMAID_CONFIG = {
    theme: 'base',
    themeVariables,
    themeCSS,

    // Libellés en <text> SVG plutôt qu'en <foreignObject> : indispensable au PDF
    // (voir l'en-tête). Réglé à la racine ET par diagramme, les deux niveaux
    // étant lus selon le type de diagramme.
    htmlLabels: false,

    flowchart: {
        htmlLabels: false,
        // Arêtes en courbes douces plutôt qu'en segments à angles droits.
        curve: 'basis',
        // Un peu d'air : le rendu par défaut est très compact.
        nodeSpacing: 55,
        rankSpacing: 60,
        padding: 12,
        // Largeur intrinsèque en pixels plutôt qu'un SVG à 100 % : c'est ce
        // qu'attendent la normalisation du SVG (normalizeSvg) et l'heuristique
        // d'orientation du générateur PDF.
        useMaxWidth: false,
    },
    sequence: {
        useMaxWidth: false,
        diagramMarginX: 24,
        diagramMarginY: 16,
        boxMargin: 12,
        messageFontWeight: '500',
    },
    class: {useMaxWidth: false},
    er: {useMaxWidth: false, entityPadding: 14},
    gantt: {useMaxWidth: false},
    journey: {useMaxWidth: false},
    pie: {useMaxWidth: false},
    state: {useMaxWidth: false},
};

export default MERMAID_CONFIG;
