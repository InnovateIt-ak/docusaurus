import path from 'node:path';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {createRequire} from 'node:module';
import remarkInclude from './src/remark/include.mjs';
import remarkKrokiDecode from './src/remark/kroki-decode.mjs';
import remarkPlantUMLInline from './src/remark/plantuml-inline.mjs';
import remarkMermaidInline from './src/remark/mermaid-inline.mjs';
import remarkServiceNowAutolink from './src/remark/servicenow-autolink.mjs';
import remarkRawSource from './src/remark/raw-source.mjs';
import remarkUnwrapDiagrams from './src/remark/unwrap-diagrams.mjs';
import remarkOverviewBlocks from './src/remark/overview-blocks.mjs';
import remarkPageActions from './src/remark/page-actions.mjs';
import {lightTheme as prismLight, darkTheme as prismDark} from './src/prism/themes';
import {FOOTER_CONFIG, NAV_BAR, REDOC_SPEC, WELCOME_PAGE} from './sharedConfig';
const require = createRequire(import.meta.url);
import {pdfMenuItems} from './pdfMenu';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: process.env.G_PROJECT_NAME ?? '',
    tagline: 'European Union External Action',
    favicon: 'img/favicon.ico',
    customFields: {
        homePageUrl: WELCOME_PAGE?.redirectUrl || null,
        homePageMessage: WELCOME_PAGE?.message || null,
        organizationName: process.env.G_ORGANIZATION_NAME,
        projectName: process.env.G_PROJECT_NAME,
        baseUrl: process.env.G_BASE_URL,
        // Base URL of a self-hosted Open WebUI, e.g. https://chat.internal.
        // When set, every rendered diagram offers "Open WebUI" in its caption,
        // opening a chat on that diagram's source (src/openWebUi.tsx). Unset,
        // the action is simply not shown — there is no sensible default for a
        // self-hosted instance.
        openWebUiUrl: process.env.G_OPENWEBUI_URL ?? null,
        // How much of a diagram that button may put in the URL, in encoded
        // characters. The 8 KB default is what an unconfigured Open WebUI
        // (uvicorn, usually behind nginx) accepts, and no diagram here comes
        // close to it; raise it only for an instance whose proxy takes more and
        // a diagram large enough to need it.
        openWebUiMaxUrl: process.env.G_OPENWEBUI_MAX_URL ?? null,
        // Landing-page hero copy for the custom home page (src/pages/index.tsx).
        // Falls back to title/tagline when unset.
        home: {
            hero: {
                eyebrow: 'Documentation',
                title: 'Everything the team needs to build, integrate, and ship.',
                subtitle:
                    'Architecture references, step-by-step guides, build-time diagrams, and ' +
                    'downloadable PDFs — kept in sync and in one place.',
            },
        },
    },
    future: {
        v4: true,
        faster: false,
    },

    url: process.env.G_HOST_URL ?? '',
    baseUrl: process.env.G_BASE_URL ?? '',
    organizationName: process.env.G_ORGANIZATION_NAME,
    projectName: process.env.G_PROJECT_NAME,

    onBrokenLinks: 'ignore',
    onBrokenMarkdownLinks: 'warn',

    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: './sidebars.ts',
                    // The sidebar's top-level folders are its sections: a
                    // heading with the pages listed under it, never folded
                    // away (src/css/custom.css draws them). Folders inside a
                    // section stay collapsible.
                    sidebarItemsGenerator: async ({defaultSidebarItemsGenerator, ...args}) => {
                        const items = await defaultSidebarItemsGenerator(args);
                        return items.map((item) =>
                            item.type === 'category'
                                ? {...item, collapsible: false, collapsed: false}
                                : item,
                        );
                    },
                    showLastUpdateTime: true,
                    showLastUpdateAuthor: true,
                    editUrl:
                        `https://github.eeas.europa.eu${process.env.G_BASE_URL}/edit/main/`,
                    // Run remarkInclude BEFORE remarkPlantUMLInline so that
                    // `#include`d content is expanded first, and any PlantUML
                    // blocks it contains are then picked up downstream.
                    beforeDefaultRemarkPlugins: [
                        // Reads the vfile's text rather than the tree, so
                        // its position in this list is cosmetic: it captures
                        // the file as the author wrote it, then resolves the
                        // `#include`s and .puml/.mmd references in it itself,
                        // so what is copied or sent to a chat model is content
                        // and not a set of paths. Feeds "Copy as Markdown" and
                        // "Open in Open WebUI".
                        remarkRawSource,
                        remarkInclude,
                        // Before the diagram plugins: recovers the source from a
                        // kroki.io image URL so the diagram is rendered here
                        // instead of fetched from a third party.
                        remarkKrokiDecode,
                        remarkPlantUMLInline,
                        remarkMermaidInline,
                        // After both diagram plugins: lifts a rendered diagram
                        // out of its paragraph so the figure may hold block
                        // content (the "Source" code block).
                        remarkUnwrapDiagrams,
                        // Turn bare ServiceNow refs (INC123, CHG456, …) into links.
                        remarkServiceNowAutolink,
                    ],
                    // After Docusaurus's own plugins, so the links and images
                    // inside a block are already resolved: the section-
                    // overview blocks written as `:::steps`, `:::option`…
                    // (src/remark/overview-blocks.mjs), then the page actions
                    // bar placed under the title and its subtitle
                    // (src/remark/page-actions.mjs).
                    remarkPlugins: [remarkOverviewBlocks, remarkPageActions],
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],
    plugins: [
        // API references: one page per spec in REDOC_SPEC (sharedConfig.ts),
        // rendered by Redoc 3 (plugins/redoc, src/components/ApiDoc).
        ['./plugins/redoc', {specs: REDOC_SPEC}],
        // API data models: render every spec in openapi/ — OpenAPI (.yaml, .yml,
        // .json) or JSON-LD (.jsonld) — as a docs page under docs/api/datamodel
        // (plugins/openapi-schema-doc). Discovered, not listed: dropping a new
        // spec in openapi/ is enough to get its page.
        // Generated on the fly at build time, regenerated on spec edits in dev,
        // and not committed (see .gitignore).
        [
            './plugins/openapi-schema-doc',
            {
                discover: [{dir: 'openapi', outDir: 'docs/api/datamodel'}],
            },
        ],
        // Changelog: fetch GitHub Releases at build time and expose them as
        // global data for the /changelog page (plugins/changelog).
        './plugins/changelog',
        // Command palette (⌘K): index every doc as global data for the
        // client-side jump-to-page palette (src/components/CommandPalette).
        './plugins/command-palette',
        // Home cards: derive the landing-page cards from the real docs sidebar
        // (plugins/home-cards). `icons`: emoji override per label; `extraCards`:
        // cross-cutting cards that are not docs sections.
        [
            './plugins/home-cards',
            {
                icons: {
                    'Guide': '🧭',
                    'Architecture': '🏛️',
                    'Tutorial - Basics': '📘',
                    'Tutorial - Extras': '🧩',
                },
                extraCards: [
                    {icon: '📄', title: 'PDF downloads', desc: 'Every section — and the full documentation — exported to PDF, generated by CI.', cta: 'Full documentation', to: 'pathname:///documentation.pdf'},
                    {icon: '🧾', title: 'Changelog', desc: 'Every release and its notes, synced from GitHub Releases.', cta: 'View releases', to: '/changelog'},
                ],
            },
        ],
        [
            'docusaurus-plugin-image-zoom',
            {
                id: 'extraZoom',
            },
        ],
        [
            '@actinc/docusaurus-plugin-panzoom',
            {
                panzoom: {
                    selector: '.docusaurus-mermaid-container svg',
                    options: {
                        contain: 'inside',
                        maxScale: 5,
                        minScale: 0.5,
                        center: true,
                        fit: true,
                    },
                },
            },
        ],
        // Dev only: rebuild the page when a file included via `#include` changes.
        // Registers included files as webpack dependencies to enable hot reload.
        function remarkIncludeWatchPlugin() {
            return {
                name: 'remark-include-watch',
                configureWebpack() {
                    return {
                        module: {
                            rules: [
                                {
                                    test: /\.mdx?$/,
                                    include: [path.resolve('docs')],
                                    enforce: 'pre',
                                    use: [path.resolve('src/remark/include-watch-loader.cjs')],
                                },
                            ],
                        },
                    };
                },
            };
        },
    ],
    themeConfig: {
        image: 'img/docusaurus-social-card.jpg',
        navbar: {
            ...NAV_BAR,
            items: [
                ...(NAV_BAR?.items ?? []),
                {to: '/changelog', label: 'Changelog', position: 'left'},
                {
                    // Auto-discovered PDF menu (see pdfMenuItems above). Appended
                    // here so sharedConfig's NAV_BAR stays untouched.
                    type: 'dropdown',
                    // Drawn with a file icon in front (src/css/custom.css).
                    label: 'PDF',
                    position: 'right',
                    items: pdfMenuItems(),
                },
            ],
        } as any,
        footer: FOOTER_CONFIG as any,
        prism: {
            // The blocks' palettes (src/prism/themes.ts): GitHub's on white,
            // and a navy one for dark mode, in the page's own blues.
            theme: prismLight,
            darkTheme: prismDark,
            // Prism only highlights a small default set (js/ts/bash/json/css/markup…).
            // Load the extra grammars used in the docs so their code blocks are
            // tokenised — otherwise ```php, ```sql, … render as untyped "plain"
            // tokens and the PDF's syntax palette has nothing to colour.
            additionalLanguages: [
                'php',
                'bash',
                'json',
                'sql',
                'yaml',
                'java',
                'go',
                'rust',
                'diff',
                'docker',
                'ini',
            ],
        },
        zoom: {
            // Photographs and screenshots only. A build-time diagram is excluded
            // (`:not([data-diagram])`, set by src/theme/MDXComponents/Img):
            // medium-zoom enlarges with `transform: scale()`, and a transform
            // scales the bitmap the browser already rasterised at column width —
            // on an SVG, which could have been drawn sharp at any size, that is
            // pure blur. Diagrams get their own viewer instead, which lays the
            // image out at the size it will be seen at.
            // `.md-figure > img`, not `p > img`: every image is wrapped in the
            // caption figure (src/theme/MDXComponents/Img), so it has not been
            // a child of its paragraph for a while and the old selector matched
            // nothing but the diagrams named explicitly beside it.
            selector: [
                'article.theme-doc-markdown .md-figure > img:not([data-diagram])',
                'article.theme-doc-markdown a > img.allow-zoom',
                '.markdown .md-figure > img:not([data-diagram])',
                '.markdown a > img.allow-zoom',
            ].join(', '),
            background: {
                // White in both themes: what is zoomed here is mostly light
                // artwork, and a dark backdrop would fight it — consistent with
                // the white paper diagrams already get in dark mode.
                light: 'rgb(255, 255, 255)',
                dark: 'rgb(255, 255, 255)',
            },
            config: {
                margin: 0,
                scrollOffset: 0,
            },
        },
        ['@docusaurus/theme-classic']: {
            colorMode: {
                defaultMode: 'dark',
                disableSwitch: true,
                respectPrefersColorScheme: true,
            },
        },
        docs: {
            sidebar: {
                // The design's sidebar has no collapse control, but the user
                // wants one: the theme's "Collapse sidebar" button at the foot
                // of the sidebar, and its expand handle once collapsed.
                hideable: true,
            },
        },
    } satisfies Preset.ThemeConfig,

    markdown: {
        hooks: {
            onBrokenMarkdownImages: 'ignore',
        },
    },
    themes: [
        [
            require.resolve('@easyops-cn/docusaurus-search-local'),
            /** @type {import('@easyops-cn/docusaurus-search-local').PluginOptions} */
            {
                hashed: true,
            },
        ],
    ],

    staticDirectories: ['static'],
};

export default config;