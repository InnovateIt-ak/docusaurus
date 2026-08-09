import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {createRequire} from 'node:module';
import remarkInclude from './src/remark/include.mjs';
import remarkPlantUMLInline from './src/remark/plantuml-inline.mjs';
import remarkMermaidInline from './src/remark/mermaid-inline.mjs';
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
                        remarkInclude,
                        remarkPlantUMLInline,
                        remarkMermaidInline,
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
                    primaryColor: '#1890ff',
                },
            },
        ],
    ],
    plugins: [
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
                light: 'rgb(255, 255, 255)',
                dark: 'rgb(50, 50, 50)',
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