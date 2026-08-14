import type {ReactNode} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Translate from '@docusaurus/Translate';
import RelatedDocs, {type RelatedItem} from '@site/src/components/RelatedDocs';
import DocProvenance from '@site/src/components/DocProvenance';
import styles from './styles.module.css';

type Props = WrapperProps<typeof FooterType>;

// Adds a "download this page as PDF" link at the very bottom of every doc page.
//
// CI (see .github/workflows/deploy.yml) generates one PDF per page and writes it
// next to the page's HTML as `<route>.pdf` — e.g. the page at `/docs/intro`
// becomes `/docs/intro.pdf`. `metadata.permalink` already carries the site
// baseUrl, so appending `.pdf` to it yields the correct, baseUrl-aware URL.
//
// A plain <a> (not the Docusaurus <Link>) is used on purpose: the PDF is
// produced by CI *after* the build, so it must not be validated by the
// broken-link checker, exactly like the navbar PDF menu (`pathname://`).
export default function FooterWrapper(props: Props): ReactNode {
    const {metadata, frontMatter} = useDoc();
    const pdfHref = `${metadata.permalink.replace(/\/$/, '')}.pdf`;
    // Curated "next steps" links declared in the page's front matter (see
    // src/components/RelatedDocs). Optional — absent on most pages.
    const related = frontMatter.related as RelatedItem[] | undefined;

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
            <div className={styles.pdfDownload}>
                <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                    <Translate
                        id="theme.docs.pdfDownload.label"
                        description="Label of the per-page PDF download link at the bottom of a doc page">
                        📄 Download this page as PDF
                    </Translate>
                </a>
            </div>
        </>
    );
}