// Plugin remark : garde la source markdown de la page accessible côté client.
//
// « Copier en Markdown » a besoin du texte que l'auteur a écrit, pas du DOM
// rendu : les diagrammes y sont devenus des <img> en data-URL et les tableaux
// des <table>. Reconstituer du markdown à partir de ça donnerait une mauvaise
// copie de l'original alors que l'original est juste là, sur le vfile.
//
// `String(file)` est le contenu brut du fichier : les plugins remark modifient
// l'arbre, jamais `file.value`. Peu importe donc la position de ce plugin dans
// la chaîne — il est placé en premier pour que ce soit explicite.
//
// La source voyage dans un élément JSX <RawSource value="…" /> ajouté à
// l'arbre ; le composant correspondant (src/components/RawSource) la dépose
// dans le DOM sur un nœud caché, où le bouton la relit au clic.

// Le front matter est de la mécanique de site (sidebar_position, id, …) et non
// du contenu : le copier polluerait le presse-papier.
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export default function remarkRawSource() {
    return (tree, file) => {
        const raw = String(file).replace(FRONT_MATTER, '').trim();
        if (!raw) return;

        tree.children.push({
            type: 'mdxJsxFlowElement',
            name: 'RawSource',
            attributes: [{type: 'mdxJsxAttribute', name: 'value', value: raw}],
            children: [],
        });
    };
}
