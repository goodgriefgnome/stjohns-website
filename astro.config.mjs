import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import articleDirectives from './src/lib/remark-article-directives.mjs';

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  markdown: { processor: unified({ remarkPlugins: [articleDirectives] }) },
  vite: { server: { fs: { strict: true } } },
});
