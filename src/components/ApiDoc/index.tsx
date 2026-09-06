import {useMemo, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {HtmlClassNameProvider, useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import styles from './styles.module.css';

// An OpenAPI reference page: the route component plugins/redoc registers for
// each spec, rendering it with Redoc 3's `RedocStandalone`.
//
// Browser only: Redoc 3 ships as a client bundle with a router of its own
// (react-router 6, in hash mode here so deep links to an operation keep
// working and Docusaurus's router is left alone), so nothing of it is
// server-rendered — the static HTML carries the page chrome and a "Loading"
// line, the reference fills in on the client.
//
// Colour mode: Redoc 3 reads its mode from a `light` / `dark` class on <html>
// while Docusaurus keeps it in `data-theme`; the class is mirrored from
// Docusaurus's mode while a reference page is mounted. It goes through
// Docusaurus's HtmlClassNameProvider, not classList: Docusaurus rewrites the
// <html> class attribute (through Helmet) on every route change with the
// classes it knows about, so a class added by hand survived the first load
// but not coming back to the page. Redoc's own switcher is hidden
// (styles.module.css): it replaces the whole className of <html>, wiping the
// classes Docusaurus put there.

type Spec = {
  id: string;
  title: string;
  description: string;
  /** Where plugins/redoc writes the spec at build time. */
  downloadUrl: string;
  definition: Record<string, unknown>;
};

type Props = {spec: Spec};

export default function ApiDoc({spec}: Props): ReactNode {
  return (
    <Layout title={spec.title} description={spec.description}>
      <BrowserOnly
        fallback={<p className={styles.loading}>Loading the API reference…</p>}>
        {() => <Redoc spec={spec} />}
      </BrowserOnly>
    </Layout>
  );
}

function Redoc({spec}: Props): ReactNode {
  const {colorMode} = useColorMode();

  // Stable identity on purpose: Redoc rebuilds its store when it is handed a
  // new options object, and sat on "Loading ..." after every colour-mode
  // change while this was an inline literal.
  const options = useMemo(
    () => ({
      downloadUrls: [{title: 'OpenAPI (YAML)', url: spec.downloadUrl}],
      // Everything open by default: nested schema properties and the JSON
      // samples. These are the names the 3.0 bundle reads; the Redoc 2 ones
      // (schemaExpansionLevel, jsonSampleExpandLevel, expandResponses) are
      // still accepted by its config schema but not consumed.
      schemasExpansionLevel: 'all',
      jsonSamplesExpandLevel: 'all',
      // Redoc scrolls to an operation itself; tell it how tall the site's
      // fixed navbar is so the title lands under it, not behind it.
      scrollYOffset: '.navbar',
    }),
    [spec.downloadUrl],
  );

  // Required here rather than imported at the top so the bundle stays out of
  // the server-side render (see the note above).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {RedocStandalone} = require('redoc');
  return (
    <HtmlClassNameProvider className={colorMode}>
      <div className={styles.redoc}>
        <RedocStandalone
          definition={spec.definition}
          options={options}
          router="hash"
          disableTelemetry
        />
      </div>
    </HtmlClassNameProvider>
  );
}
