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
// D'OÙ VIENT CETTE PALETTE
// ------------------------
// Du système « Diagram Design » (github.com/cathrynlavery/diagram-design), dont
// style-guide.md donne les rôles sémantiques repris ci-dessous : encre ardoise,
// gris-bleu pour le secondaire, et UN accent tangerine. Trois règles y sont
// structurantes, et sont respectées ici :
//
//   * Un seul accent. Deux accents effacent le signal « voici l'important ».
//     L'accent n'est donc dépensé que là où le sens est focal par construction :
//     les notes, les tâches critiques d'un Gantt, la ligne « aujourd'hui », la
//     première série d'un camembert.
//   * Pas de palette arc-en-ciel. Tout ce qui n'est pas encre ou accent est une
//     variante atténuée.
//   * Sérif + sans + mono, trois familles. Le sérif titre, le sans nomme, le
//     mono porte le technique (types de champs, annotations d'arêtes).
//
// À noter : cette palette n'est pas celle du site (bleu institutionnel UE
// #004494, cf. custom.css et docker/weasyprint/report.css). Les diagrammes
// portent donc une identité propre. Pour les réaligner sur le site, il suffit de
// remplacer ACCENT par le bleu UE — le reste du système tient sans y toucher.
//
// LES POLICES NE SONT PAS EMBARQUÉES
// ----------------------------------
// Geist / Instrument Serif ne peuvent pas être embarquées dans le SVG : Mermaid
// retire les règles `@font-face` du themeCSS (vérifié — le rendu produit des
// largeurs identiques avec et sans). Les piles ci-dessous les nomment d'abord,
// puis retombent sur une grotesque système. Pour les avoir vraiment partout, il
// faudrait installer les TTF dans l'image de build (docker/Dockerfile, à côté
// des polices DejaVu déjà présentes) ET les embarquer via l'option `myCSS` de
// mermaid-cli, afin que la mesure et l'affichage utilisent la même fonte.
//
// CONTRAINTES À NE PAS CASSER
// ---------------------------
// * `htmlLabels: false` — WeasyPrint ne rend pas <foreignObject> ; sans cela le
//   PDF sort avec des boîtes et des flèches vides. Les libellés doivent rester
//   des <text> SVG. C'est aussi pourquoi le CSS ci-dessous cible `text` /
//   `tspan` en plus des classes Mermaid.
// * Fond transparent — le PDF est clair, et le site pose lui-même le papier
//   blanc derrière l'image (custom.css). Le papier n'est donc pas dans le SVG :
//   les nœuds sont blancs et cernés d'un filet encre, ce qui les fait lire
//   identiquement sur le site et sur la page blanche du PDF.
// * Palette claire — le même SVG sert les deux thèmes du site et le PDF ; un
//   thème sombre ici rendrait le PDF illisible.

// --- Tokens ------------------------------------------------------------------
// Nommés par rôle sémantique, comme dans le style-guide d'origine.
// Écart assumé au guide d'origine, qui demande un papier chaud plutôt qu'un
// blanc pur : le papier est ici blanc. Conséquence, les nœuds — blancs eux
// aussi, rôle « backend » — ne se détachent plus par leur remplissage mais par
// leur filet encre. Tous les aplats de fond du thème disparaissent donc au
// profit de contours : c'est la raison des `transparent` plus bas.
const PAPER = '#ffffff'; // le papier (posé par custom.css)
const WHITE = '#ffffff'; // remplissage des nœuds principaux (rôle « backend »)
const INK = '#2d3142'; // encre : texte et filets principaux
const MUTED = '#4f5d75'; // gris-bleu : texte secondaire, arêtes
const SOFT = '#7a8399'; // sous-libellés, lignes de vie
const RULE = 'rgba(45, 49, 66, 0.12)'; // filet discret
const RULE_SOLID = '#bfc0c0'; // filet appuyé, lignes de base
const INK_05 = 'rgba(45, 49, 66, 0.05)'; // rôle « store » : réservoirs, activations
const INK_03 = 'rgba(45, 49, 66, 0.03)'; // rôle « external » : hors périmètre
const GRID = '#e2e5ea'; // quadrillage des axes (Gantt, graphique XY)
const ACCENT = '#eb6c36'; // tangerine : le seul accent
const ACCENT_TINT = 'rgba(235, 108, 54, 0.08)'; // fond des éléments accentués

// Série catégorielle, réservée aux types qui distinguent vraiment plusieurs
// entités (camembert, parcours). L'accent ouvre la série — c'est la part focale.
// Le gris-bleu et l'ardoise du guide d'origine sont éclaircis d'un cran : posés
// en aplat plein sous un libellé encre, les valeurs d'origine tombaient sous le
// seuil de contraste (le guide les prévoit en remplissage à 18 % d'opacité).
const SERIES = [
    ACCENT, // focal
    '#7c8f6f', // sauge
    '#7793b3', // gris-bleu poussiéreux, éclairci
    '#b8915a', // moutarde
    '#9c6b50', // brun rouille
    '#8b8296', // ardoise, éclaircie
];

// --- Typographie -------------------------------------------------------------
// Trois familles, trois rôles. Voir « LES POLICES NE SONT PAS EMBARQUÉES ».
const SANS = 'Geist, Inter, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, "DejaVu Sans Mono", monospace';
const SERIF = '"Instrument Serif", "Iowan Old Style", Palatino, Georgia, serif';

// --- Habillage fin, en CSS injecté dans le <style> du SVG --------------------
// Ce que `themeVariables` ne couvre pas : angles arrondis, épaisseurs de trait,
// familles par rôle. Deux règles à respecter ici :
//
// * Pas de `filter` ni d'ombre portée — WeasyPrint ne les rend pas, le PDF
//   divergerait du site. Le système d'origine n'en utilise pas non plus : tout
//   passe par des filets.
// * Ne jamais élargir un texte. Mermaid mesure chaque libellé pour dimensionner
//   sa boîte, puis ce CSS s'applique : une police plus grande déborderait d'une
//   boîte déjà figée. Les changements de famille ci-dessous vont donc toujours
//   de pair avec une taille plus petite que la taille de mesure (13 px), ce qui
//   laisse de la marge même quand le mono est plus large que le sans.
const themeCSS = `
  /* Nœuds : filet de 1 px, coins à 6 px (radius-md). */
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

  /* Sous-graphes : une frontière, pas une boîte. Filet pointillé discret,
     coins à 8 px (radius-lg). */
  .cluster rect {
    rx: 8px;
    ry: 8px;
    stroke-width: 1px;
    stroke-dasharray: 4 3;
  }
  /* Titre de sous-graphe en « eyebrow » : mono, capitales, interlettrage large.
     Passer en capitales élargit d'environ 15 %, mais la chute de 13 px à 10 px
     retire plus que cela — le libellé reste dans sa boîte. */
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

  /* Arêtes : filet de 1 px, extrémités arrondies. */
  .edgePath .path,
  .flowchart-link,
  .relationshipLine {
    stroke-width: 1px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Annotations d'arête : mono, posées sur une pastille de papier. */
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

  /* Titres de diagramme (camembert, Gantt) : sérif, taille inchangée — Mermaid
     a déjà calculé les bornes du SVG avec la taille mesurée. */
  .titleText,
  .pieTitleText,
  text.title {
    font-family: ${SERIF};
    font-weight: 400;
    fill: ${INK};
  }

  /* Graduations d'axe (Gantt, graphique XY). Mermaid pose stroke="currentColor"
     en attribut de présentation sur le trait, et la règle qu'il génère vise le
     groupe parent : l'attribut l'emporte sur la valeur héritée, et le trait sort
     noir. Une règle CSS visant le trait lui-même, elle, gagne. */
  .grid .tick line,
  .axis line,
  .axis path {
    stroke: ${GRID};
    stroke-width: 1px;
  }

  /* Séquence : acteurs cernés d'encre, lignes de vie et cadres en filet. */
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
  /* Étiquette « loop » / « alt » : même eyebrow que les sous-graphes. */
  .labelText,
  .labelText tspan,
  .loopText,
  .loopText tspan {
    font-family: ${MONO};
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  /* Entité-relation et classes : le nom en gras, les types de champs en mono —
     c'est exactement la répartition « nom en sans, technique en mono ». */
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

// --- Variables de thème ------------------------------------------------------
// Mermaid dérive de `theme: 'base'` toutes les couleurs non fournies ; on fixe
// explicitement celles qui portent l'identité visuelle, et on laisse Mermaid
// calculer le reste.
const themeVariables = {
    darkMode: false,
    background: 'transparent',
    fontFamily: SANS,
    // Le guide d'origine spécifie 12 px pour les noms de nœuds. 13 px ici : une
    // figure large est réduite pour tenir dans la colonne de doc, et le texte
    // rétrécit d'autant.
    fontSize: '13px',

    // Nœuds et texte — rôle « backend » : aplat blanc, filet encre.
    primaryColor: WHITE,
    primaryTextColor: INK,
    primaryBorderColor: INK,
    mainBkg: WHITE,
    nodeBorder: INK,
    textColor: INK,
    titleColor: INK,
    // Rôle « store » : réservoirs, seconds plans.
    secondaryColor: INK_05,
    secondaryTextColor: INK,
    secondaryBorderColor: MUTED,
    // Rôle « external » : ce qui est hors du périmètre.
    tertiaryColor: INK_03,
    tertiaryTextColor: INK,
    tertiaryBorderColor: RULE_SOLID,

    // Arêtes
    lineColor: MUTED,
    edgeLabelBackground: PAPER,

    // Sous-graphes : une frontière quasi transparente, pas un bloc coloré.
    // Le sous-graphe est une frontière, pas un bloc : aucun aplat, seul le
    // filet pointillé le délimite.
    clusterBkg: 'transparent',
    clusterBorder: RULE_SOLID,

    // Notes : l'auteur écrit une note pour attirer l'œil — c'est là qu'on
    // dépense l'accent.
    noteBkgColor: ACCENT_TINT,
    noteTextColor: INK,
    noteBorderColor: ACCENT,

    // Séquence
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

    // Entité-relation : lignes alternées papier / encre très diluée.
    attributeBackgroundColorOdd: WHITE,
    attributeBackgroundColorEven: INK_03,

    // Gantt : tout en gris atténués, l'accent réservé au chemin critique et à
    // la ligne « aujourd'hui ».
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
    // Bandeaux de section alternés : un rang nu, l'autre à peine teinté.
    sectionBkgColor: 'transparent',
    sectionBkgColor2: INK_03,
    altSectionBkgColor: 'transparent',
    todayLineColor: ACCENT,

    // C4 et « architecture » embarquent leur propre palette (bleus en dur dans
    // Mermaid). Seules ces clés-là sont thémables ; le reste — remplissage des
    // systèmes C4, icônes du jeu « architecture » — se règle dans le diagramme
    // lui-même, via `UpdateElementStyle` / `UpdateRelStyle` pour C4. Voir la
    // page docs/mermaid-diagrams.mdx.
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

    // Graphique XY : Mermaid lui donne sa propre palette (un jaune très pâle
    // par défaut, illisible sur papier blanc). On la remplace par la série
    // catégorielle, l'accent ouvrant sur la première courbe.
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

    // Séries catégorielles : l'accent ouvre, les tons éditoriaux suivent. Le
    // libellé de part reste en encre, et les parts sont séparées par du papier.
    pie1: SERIES[0],
    pie2: SERIES[1],
    pie3: SERIES[2],
    pie4: SERIES[3],
    pie5: SERIES[4],
    pie6: SERIES[5],
    // Au-delà de six parts, on reboucle sur la même série : pas d'arc-en-ciel.
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
        // De l'air : le système d'origine respire beaucoup plus que le rendu
        // Mermaid par défaut.
        nodeSpacing: 60,
        rankSpacing: 72,
        padding: 16,
        // Largeur intrinsèque en pixels plutôt qu'un SVG à 100 % : c'est ce
        // qu'attendent la normalisation du SVG (normalizeSvg) et l'heuristique
        // d'orientation du générateur PDF.
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
