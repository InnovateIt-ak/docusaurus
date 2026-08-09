import {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from "@docusaurus/Link";
import styles from './index.module.css';
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function Home(): ReactNode {
    const {siteConfig} = useDocusaurusContext();
    const homePageUrl = siteConfig?.customFields?.homePageUrl as string ?? "/docs/";
    const customMessage = siteConfig?.customFields?.homePageMessage as string ?? `Welcome to ${siteConfig.title} documentation 👋`;
    return (
        <Layout title="Welcome">
            <main
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '80vh',
                    flexDirection: 'column',
                    textAlign: 'center',
                }}>
                <h1 style={{fontSize: '2rem'}}>{customMessage}</h1>
                <p style={{marginTop: '2rem'}}>
                    <div className={styles.buttons}>
                        <Link
                            className="button button--secondary button--lg"
                            to={homePageUrl}>
                            Get Started →
                        </Link>
                    </div>
                </p>
            </main>
        </Layout>
    );
}
