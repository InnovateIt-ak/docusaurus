import {useEffect, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useLocation} from '@docusaurus/router';
import {useAllPluginInstancesData} from '@docusaurus/useGlobalData';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import styles from './api-v3.module.css';

// Spike: the OpenAPI references rendered by Redoc 3 (release candidate)
// instead of the Redoc 2 that Redocusaurus wraps. Redocusaurus cannot load
// v3 (it pins redoc 2.4.0 and builds on exports v3 no longer has), so v3 is
// installed under the alias `redoc3` (package.json) and rendered here on its
// own, in the browser only: the bundle is client-side and its own router
// (react-router 6, hash mode here) is not Docusaurus's.
//
// The specs are the ones Redocusaurus already bundled (sharedConfig.ts,
// REDOC_SPEC): the plugin publishes each parsed spec as global data, keyed by
// spec id, so nothing is parsed twice. `?spec=<id>` picks one; default is the
// first. Compare with the Redocusaurus page at /api/<id>.
//
// Colour mode: Redoc 3 reads its mode from a `light` / `dark` class on
// <html> (and its own switcher *replaces* the element's whole className, so
// it is hidden here); Docusaurus keeps the mode in `data-theme`. The class is
// mirrored from Docusaurus's mode while this page is mounted.

type RedocPluginData = {spec: Record<string, unknown>};

// Module-level so its identity is stable: a new object on each render made
// Redoc rebuild its store on every colour-mode change.
const REDOC_OPTIONS = {colorMode: {hide: true, ignoreDetection: true}};

function RedocV3({spec}: {spec: Record<string, unknown>}): ReactNode {
  const {colorMode} = useColorMode();
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(colorMode);
    return () => html.classList.remove('light', 'dark');
  }, [colorMode]);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {RedocStandalone} = require('redoc3');
  return (
    <div className={styles.redoc}>
      <RedocStandalone
        definition={spec}
        router="hash"
        disableTelemetry
        options={REDOC_OPTIONS}
      />
    </div>
  );
}

export default function ApiV3Page(): ReactNode {
  const specs = useAllPluginInstancesData('docusaurus-plugin-redoc') as Record<
    string,
    RedocPluginData
  >;
  const ids = Object.keys(specs);
  const wanted = new URLSearchParams(useLocation().search).get('spec');
  const id = wanted && specs[wanted] ? wanted : ids[0];
  const spec = id ? specs[id].spec : undefined;

  return (
    <Layout
      title={`${id ?? 'API'} · Redoc 3 spike`}
      description="OpenAPI reference rendered by Redoc 3 (rc)">
      <nav className={styles.picker} aria-label="Spec">
        <span>Redoc 3.0.0-rc.0 ·</span>
        {ids.map((sid) => (
          <a
            key={sid}
            href={`?spec=${sid}`}
            aria-current={sid === id ? 'page' : undefined}>
            {sid}
          </a>
        ))}
        {id && <a href={`/api/${id}`}>compare with Redoc 2 ↗</a>}
      </nav>
      <BrowserOnly fallback={<p className={styles.picker}>Loading Redoc…</p>}>
        {() =>
          spec ? (
            <RedocV3 spec={spec} />
          ) : (
            <p className={styles.picker}>No spec configured.</p>
          )
        }
      </BrowserOnly>
    </Layout>
  );
}
