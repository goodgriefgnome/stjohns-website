import { readFileSync } from 'node:fs';
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import articleDirectives from './src/lib/remark-article-directives.mjs';
import remarkLayouts from './src/lib/remark-layouts.mjs';
import themeCss from './src/lib/vite-theme-css.mjs';
import churchTokens from './src/lib/remark-church-tokens.mjs';
import rehypeActions from './src/lib/rehype-actions.mjs';
import rehypeBaseLinks from './src/lib/rehype-base-links.mjs';

// GitHub Pages serves the site from a subfolder. The deploy workflow sets these;
// local dev and builds keep serving from the root.
const site = process.env.SITE_URL;
const base = process.env.SITE_BASE ?? '/';

// Markdown {{tokens}} read this file. Passing its contents to the plugin puts them
// in the config, and watching it restarts dev, so cached pages refresh on edits.
const churchFile = new URL('./imported/church.json', import.meta.url);
const church = JSON.parse(readFileSync(churchFile, 'utf8'));
const watchChurch = {
  name: 'watch-church-data',
  hooks: { 'astro:config:setup': ({ addWatchFile }) => addWatchFile(churchFile) },
};

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [mdx(), watchChurch],
  trailingSlash: 'ignore',
  markdown: {
    processor: unified({
      remarkPlugins: [[remarkLayouts, { defaultHero: church.defaultHero }], articleDirectives, [churchTokens, { church }]],
      rehypePlugins: [rehypeActions, [rehypeBaseLinks, { base }]],
    }),
  },
  vite: { plugins: [themeCss()], server: { fs: { strict: true } } },
});
