import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

// https://astro.build
export default defineConfig({
  site: 'https://optimizahq.com',
  adapter: vercel({ maxDuration: 60 }),
  // Inyecta el CSS de cada página directo en el <head> en vez de 3 hojas
  // separadas y bloqueantes (Base/Scanner/página) — evita esos round-trips
  // antes del primer pintado, que era la causa del LCP alto.
  build: { inlineStylesheets: 'always' },
  integrations: [
    react(),
    keystatic(),
    // Excluye páginas internas/privadas del sitemap público.
    sitemap({ filter: (page) => !page.includes('/leads') }),
  ],
});
