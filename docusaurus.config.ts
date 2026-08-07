import fs from 'node:fs';
import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkInclude from './src/remark/include.mjs';
import remarkPlantUMLInline from './src/remark/plantuml-inline.mjs';
import remarkMermaidInline from './src/remark/mermaid-inline.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// Build the "📄 PDF" navbar dropdown from the filesystem so it always mirrors
// the PDFs CI produces (see .github/workflows/deploy.yml): one entry per doc
// section plus one for the whole documentation. A "section" is a top-level
// docs/ folder (skipping _* partials) that actually contains a doc page — the
// exact same rule the workflow uses to decide which /<section>.pdf to build.
function pdfMenuItems() {
  const docsDir = path.resolve('docs');
  const titleCase = (name: string) =>
    name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const hasDocPage = (dir: string): boolean =>
    fs.readdirSync(dir, {withFileTypes: true}).some((entry) => {
      if (entry.name.startsWith('_')) return false; // _* files/folders are partials
      return entry.isDirectory()
        ? hasDocPage(path.join(dir, entry.name))
        : /\.mdx?$/.test(entry.name);
    });

  const sections = fs
    .readdirSync(docsDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .filter((name) => hasDocPage(path.join(docsDir, name)))
    .sort();

  // `pathname://` serves each link as-is (baseUrl-aware, no broken-link check):
  // the PDFs don't exist at build time, CI writes them afterwards.
  return [
    ...sections.map((name) => ({
      to: `pathname:///${name}.pdf`,
      label: titleCase(name),
    })),
    {to: 'pathname:///documentation.pdf', label: 'Full documentation'},
  ];
}

const config: Config = {
  title: 'My Site',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
    // Depuis Docusaurus 3.10, `v4: true` active Docusaurus Faster (rspack)
    // par défaut, ce qui exige le paquet `@docusaurus/faster`. On garde le
    // bundler webpack classique en désactivant Faster explicitement.
    faster: false,
  },

  markdown: {
    // `.md` => CommonMark (autorise les commentaires HTML <!-- -->, comme le
    // marqueur de troncature des billets de blog) ; `.mdx` => MDX.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Set the production url of your site here
  url: 'https://github.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: process.env.BASE_URL??'/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'InnovateIt-ak', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
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
          // `#include "fichier.md"` puis rendu PlantUML (```plantuml``` et
          // `![](*.puml)`) et Mermaid (```mermaid``` et `![](*.mmd)`). Ces
          // plugins doivent passer avant les plugins par défaut pour transformer
          // les diagrammes en images avant le chargeur d'images de Docusaurus.
          beforeDefaultRemarkPlugins: [
            remarkInclude,
            remarkPlantUMLInline,
            remarkMermaidInline,
          ],
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/InnovateIt-ak/docusaurus/edit/master',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // Dev : recompile la page quand un fichier inclus via `#include` change.
    // Déclare les fichiers inclus comme dépendances webpack (hot reload).
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
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'My Site',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Tutorial',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/tldraw', label: 'TlDraw', position: 'left'},
        {to: '/likec4', label: 'Architecture', position: 'left'},
        {
          // PDF download menu — AUTO-DISCOVERED from the docs/ folder at build
          // time (see pdfMenuItems above): one entry per section plus the whole
          // documentation. The matching PDFs are produced by CI after the build.
          type: 'dropdown',
          label: '📄 PDF',
          position: 'right',
          items: pdfMenuItems(),
        },
        {
          href: 'https://github.com/InnovateIt-ak/docusaurus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/docusaurus',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/docusaurus',
            },
            {
              label: 'X',
              href: 'https://x.com/docusaurus',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/facebook/docusaurus',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
