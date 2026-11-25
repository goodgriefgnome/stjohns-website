import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import articleDirectives from './src/lib/remark-article-directives.mjs';

export default defineConfig({
  output: 'static',
  integrations: [mdx()],
  trailingSlash: 'ignore',
  markdown: { processor: unified({ remarkPlugins: [articleDirectives] }) },
  vite: {
    resolve: {
      alias: [
        { find: /^Article$/, replacement: fileURLToPath(new URL('./src/layouts/Article.astro', import.meta.url)) },
        { find: /^Page$/, replacement: fileURLToPath(new URL('./src/layouts/Page.astro', import.meta.url)) },
      ],
    },
    server: { fs: { strict: true } },
  },
});
