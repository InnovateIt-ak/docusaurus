// The OpenAPI references, rendered by Redoc 3 (`redoc` in package.json):
// one page per spec listed in `specs` ({id, spec, route}, see sharedConfig.ts
// REDOC_SPEC), at `route`. Each spec is read here at build time and handed to
// the page (src/components/ApiDoc) as data, so the browser never fetches or
// parses YAML; the page renders it with Redoc's `RedocStandalone`.
//
// This replaces Redocusaurus, which wraps Redoc 2 and cannot load 3: it pins
// redoc 2.4.0 and builds on exports 3 no longer has (AppStore, Redoc with a
// store). What is kept from it: the same `specs` option and routes, and the
// spec written next to its page (`<route>.yaml`) so the reference offers its
// source for download. The built site gets that file from `postBuild`; under
// `docusaurus start` nothing builds, so the same file is written under
// .docusaurus and handed to the dev server as a static directory — otherwise
// the download link falls into the SPA fallback and lands on the home page
// (that was the case with Redocusaurus too).
//
// The specs are single files (no `$ref` to another file), so a YAML parse is
// all the bundling needed; Redoc resolves the internal `$ref`s itself.

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

/** Join `baseUrl` (always ends with `/`) and a route, without doubling `/`. */
function withBaseUrl(baseUrl, route) {
    return `${baseUrl.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
}

module.exports = function redocPlugin(context, options) {
    const {specs = []} = options;
    const entries = specs.map((entry) => ({
        ...entry,
        route: entry.route.replace(/\/$/, ''),
        file: path.resolve(context.siteDir, entry.spec),
    }));

    // The dev server's copy of the specs, laid out as the built site is
    // (`<route>.yaml` under this directory = `<baseUrl><route>.yaml`).
    const devDir = path.join(context.generatedFilesDir, 'redoc-specs');

    /** Each spec at `<dir><route>.yaml`, for the download link. */
    function writeSpecs(dir) {
        for (const entry of entries) {
            const target = path.join(dir, `${entry.route}.yaml`);
            fs.mkdirSync(path.dirname(target), {recursive: true});
            fs.copyFileSync(entry.file, target);
        }
    }

    return {
        name: 'redoc',

        async loadContent() {
            return entries.map((entry) => {
                const definition = YAML.parse(fs.readFileSync(entry.file, 'utf8'));
                const info = definition && definition.info;
                return {
                    ...entry,
                    definition,
                    title: (info && info.title) || entry.id,
                    description: (info && info.description) || '',
                };
            });
        },

        async contentLoaded({content, actions}) {
            const {createData, addRoute} = actions;
            for (const entry of content) {
                const spec = await createData(
                    `${entry.id}.json`,
                    JSON.stringify({
                        id: entry.id,
                        title: entry.title,
                        description: entry.description,
                        downloadUrl: withBaseUrl(context.baseUrl, `${entry.route}.yaml`),
                        definition: entry.definition,
                    }),
                );
                addRoute({
                    path: withBaseUrl(context.baseUrl, entry.route),
                    component: '@site/src/components/ApiDoc',
                    exact: true,
                    modules: {spec},
                });
            }
            // Runs again when a spec changes (getPathsToWatch), so the dev
            // server's copy follows the source.
            writeSpecs(devDir);
        },

        // Re-run loadContent when a spec changes under `docusaurus start`.
        getPathsToWatch() {
            return entries.map((entry) => entry.file);
        },

        // `docusaurus start`: serve the specs at their download URLs. Docusaurus
        // merges a client `devServer` into its own dev-server config, and its
        // `static` entries are served before the SPA fallback. Not watched:
        // the reload already comes from getPathsToWatch.
        configureWebpack(_config, isServer) {
            if (isServer) {
                return {};
            }
            return {
                devServer: {
                    static: [{directory: devDir, publicPath: context.baseUrl, watch: false}],
                },
            };
        },

        // `docusaurus build`: the spec next to its page, for the download link.
        async postBuild({outDir}) {
            writeSpecs(outDir);
        },
    };
};
