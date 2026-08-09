import type {ReactNode} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Translate from '@docusaurus/Translate';
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
    const {metadata} = useDoc();
    const pdfHref = `${metadata.permalink.replace(/\/$/, '')}.pdf`;

    return (
        <>
            <Footer {...props} />
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