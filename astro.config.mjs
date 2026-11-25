import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import articleDirectives from './src/lib/remark-article-directives.mjs';
import rehypeBaseLinks from './src/lib/rehype-base-links.mjs';

// GitHub Pages serves the site from a subfolder. The deploy workflow sets these;
// local dev and builds keep serving from the root.
const site = process.env.SITE_URL;
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [mdx()],
  trailingSlash: 'ignore',
  markdown: {
    processor: unified({
      remarkPlugins: [articleDirectives],
      rehypePlugins: [[rehypeBaseLinks, { base }]],
    }),
  },
  vite: { server: { fs: { strict: true } } },
});
