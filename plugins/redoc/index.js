// The OpenAPI references, rendered by Redoc 3 (`redoc` in package.json):
// one page per spec listed in `specs` ({id, spec, route}, see sharedConfig.ts
// REDOC_SPEC), at `route`. Each spec is read here at build time and handed to
// the page (src/components/ApiDoc) as data, so the browser never fetches or
// parses YAML; the page renders it with Redoc's `RedocStandalone`.
//
// This replaces Redocusaurus, which wraps Redoc 2 and cannot load 3: it pins
// redoc 2.4.0 and builds on exports 3 no longer has (AppStore, Redoc with a
// store). What is kept from it: the same `specs` option and routes, and the
// bundled spec written next to the page at build time (`<route>.yaml`) so the
// reference offers its source for download. That file is a build product,
// so the download link only resolves on the built site, not under
// `docusaurus start` — as with Redocusaurus.
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
        },

        // Re-run loadContent when a spec changes under `docusaurus start`.
        getPathsToWatch() {
            return entries.map((entry) => entry.file);
        },

        // The spec next to its page, for the download link.
        async postBuild({content, outDir}) {
            for (const entry of content) {
                const target = path.join(outDir, `${entry.route}.yaml`);
                fs.mkdirSync(path.dirname(target), {recursive: true});
                fs.copyFileSync(entry.file, target);
            }
        },
    };
};
