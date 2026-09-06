import type {ReactNode} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import RelatedDocs, {type RelatedItem} from '@site/src/components/RelatedDocs';
import DocProvenance from '@site/src/components/DocProvenance';

type Props = WrapperProps<typeof FooterType>;

// Adds the provenance block and the curated "next steps" under every doc.
// The "download this page as PDF" link that used to close the page sits on
// the title row now, with the other page actions (src/theme/DocItem/Content).
export default function FooterWrapper(props: Props): ReactNode {
    const {metadata, frontMatter} = useDoc();
    // Curated "next steps" links declared in the page's front matter (see
    // src/components/RelatedDocs). Optional — absent on most pages. It is not
    // part of Docusaurus's DocFrontMatter (a type alias, so it cannot be
    // augmented), hence the cast.
    const {related} = frontMatter as {related?: RelatedItem[]};

    return (
        <>
            <Footer {...props} />
            {/* Enriched provenance block. The stock footer's plain edit/last-updated
                row is hidden via custom.css so this replaces it (the tags row is
                kept). Data comes straight from Docusaurus's doc metadata. */}
            <DocProvenance
                editUrl={metadata.editUrl}
                lastUpdatedAt={metadata.lastUpdatedAt}
                lastUpdatedBy={metadata.lastUpdatedBy}
            />
            <RelatedDocs items={related} />
        </>
    );
}