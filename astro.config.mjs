// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    integrations: [mdx(), sitemap()],
    site: 'https://wliverno.github.io/',
    base: '/',
    outDir: './dist',
  });
