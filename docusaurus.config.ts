import fs from 'node:fs';
import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkInclude from './src/remark/include.mjs';
import remarkPlantUMLInline from './src/remark/plantuml-inline.mjs';
import remarkMermaidInline from './src/remark/mermaid-inline.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// Build the "📄 PDF" navbar dropdown from the filesystem so it mirrors the docs
// sidebar and the PDFs CI produces (see .github/workflows/deploy.yml). Each
// top-level sidebar entry gets a menu item:
//   * a top-level doc file (e.g. intro.md) → its per-page PDF at /docs/<id>.pdf,
//   * a section folder (e.g. architecture/) → its section PDF at /<section>.pdf,
// followed by a "Full documentation" entry for the whole documentation. Entries
// are labelled and ordered like the sidebar (sidebar_position / _category_.json
// position, then label), and _* partials are skipped — the same rules the
// workflow uses to decide which PDFs to build.
function pdfMenuItems() {
  const docsDir = path.resolve('docs');
  const UNPOSITIONED = Number.MAX_SAFE_INTEGER;

  // Pull the few scalar keys we need from a doc's leading `---` frontmatter.
  const readFrontmatter = (file: string): Record<string, string> => {
    const block = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const out: Record<string, string> = {};
    for (const line of block ? block[1].split(/\r?\n/) : []) {
      const kv = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (kv) out[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
    }
    return out;
  };
  const firstHeading = (file: string): string | undefined =>
    fs.readFileSync(file, 'utf8').match(/^#\s+(.+)$/m)?.[1].trim();
  // Docusaurus strips a leading number prefix ("06-standards" → "standards")
  // from the URL and uses the number as the sidebar position. We mirror both so
  // the PDF link matches the real route and the menu keeps the sidebar order.
  const parseNumberPrefix = (name: string): {value?: number; rest: string} => {
    const m = name.match(/^(\d+)(?:\s*[-_.]\s*|\s+)(.+)$/);
    return m ? {value: Number(m[1]), rest: m[2]} : {rest: name};
  };
  const hasDocPage = (dir: string): boolean =>
    fs.readdirSync(dir, {withFileTypes: true}).some((entry) => {
      if (entry.name.startsWith('_')) return false; // _* files/folders are partials
      return entry.isDirectory()
        ? hasDocPage(path.join(dir, entry.name))
        : /\.mdx?$/.test(entry.name);
    });

  const items: {to: string; label: string; position: number}[] = [];
  for (const entry of fs.readdirSync(docsDir, {withFileTypes: true})) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(docsDir, entry.name);

    if (entry.isDirectory()) {
      if (!hasDocPage(full)) continue; // e.g. docs/plantuml (only .puml, no page)
      // Section → whole-section PDF at /<slug>.pdf, where <slug> is the folder
      // name with its number prefix stripped (matching the route CI builds).
      // Label/position come from _category_.json; otherwise fall back to the
      // slug and the number prefix (as the sidebar does).
      const {value: prefixPos, rest: slug} = parseNumberPrefix(entry.name);
      let label = slug;
      let position = prefixPos ?? UNPOSITIONED;
      const catFile = path.join(full, '_category_.json');
      if (fs.existsSync(catFile)) {
        try {
          const cat = JSON.parse(fs.readFileSync(catFile, 'utf8'));
          if (typeof cat.label === 'string') label = cat.label;
          if (typeof cat.position === 'number') position = cat.position;
        } catch {
          /* ignore a malformed _category_.json and fall back to the slug */
        }
      }
      items.push({to: `pathname:///${slug}.pdf`, label, position});
    } else if (/\.mdx?$/.test(entry.name)) {
      // Standalone top-level doc → its per-page PDF (assumes the default route
      // /docs/<id>; a custom `slug` would need mapping here). Id and order also
      // honour a number prefix ("01-intro.md" → /docs/intro.pdf, position 1).
      // Label like the sidebar: sidebar_label, else title, else first heading.
      const {value: prefixPos, rest: id} = parseNumberPrefix(entry.name.replace(/\.mdx?$/, ''));
      const fm = readFrontmatter(full);
      items.push({
        to: `pathname:///docs/${id}.pdf`,
        label: fm.sidebar_label || fm.title || firstHeading(full) || id,
        position: fm.sidebar_position ? Number(fm.sidebar_position) : prefixPos ?? UNPOSITIONED,
      });
    }
  }

  items.sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));

  // `pathname://` serves each link as-is (baseUrl-aware, no broken-link check):
  // the PDFs don't exist at build time, CI writes them afterwards.
  return [
    ...items.map(({to, label}) => ({to, label})),
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
