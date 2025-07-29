import React, { lazy, Suspense } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from "@theme/Layout";

const Tldraw = lazy(async () => {
    try {
        const { Tldraw } = await import('tldraw');
        await import('tldraw/tldraw.css');
        return { default: Tldraw };
    } catch (error) {
        console.error('Error when loading Tldraw:', error);
        return { default: () => <div>Loading Error</div> };
    }
});

const TlDraw = () => {
    return (
        <Layout
            title="Tldraw"
            description="Tldraw"
        >
        <BrowserOnly fallback={<div>Loading Editor...</div>}>
            {() => (

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        backgroundColor: '#f9f9f9',
                    }}
                >
                    <Suspense fallback={<div>Init Tldraw...</div>}>
                        <Tldraw />
                    </Suspense>
                </div>
            )}
        </BrowserOnly>
        </Layout>
    );
};

export default TlDraw;