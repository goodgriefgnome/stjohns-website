import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import articleDirectives from './src/lib/remark-article-directives.mjs';

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  markdown: { processor: unified({ remarkPlugins: [remarkDirective, articleDirectives] }) },
  vite: { server: { fs: { strict: true } } },
});
