import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
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
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
        [
            'redocusaurus',
            {
                specs: REDOC_SPEC as any,
                theme: {
                    // EU institutional blue, matching the site primary (custom.css).
                    primaryColor: '#004494',
                },
            },
        ],
    ],
    plugins: [
        // API data models: render every spec in openapi/ as a docs page under
        // docs/architecture/api (plugins/openapi-schema-doc). Discovered, not
        // listed: dropping a new spec in openapi/ is enough to get its page.
        // Generated on the fly at build time, regenerated on spec edits in dev,
        // and not committed (see .gitignore).
        [
            './plugins/openapi-schema-doc',
            {
                discover: [{dir: 'openapi', outDir: 'docs/architecture/api'}],
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
                    label: '📄 PDF',
                    position: 'right',
                    items: pdfMenuItems(),
                },
            ],
        } as any,
        footer: FOOTER_CONFIG as any,
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
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
            selector: [
                'article.theme-doc-markdown p > img',
                'article.theme-doc-markdown a > img.allow-zoom',
                'article.theme-doc-markdown img[alt="Mermaid diagram"]',
                '.markdown p > img',
                '.markdown a > img.allow-zoom',
                '.markdown img[alt="Mermaid diagram"]',
            ].join(', '),
            background: {
                // White in both themes: the zoom targets are mostly Mermaid
                // diagrams (dark strokes/text on a transparent background), which
                // are illegible on a dark backdrop. White keeps them readable —
                // consistent with the light card they already get in dark mode.
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