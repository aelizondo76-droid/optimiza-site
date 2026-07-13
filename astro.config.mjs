import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

// https://astro.build
export default defineConfig({
  site: 'https://optimizahq.com',
  adapter: vercel(),
  integrations: [react(), keystatic(), sitemap()],
});
