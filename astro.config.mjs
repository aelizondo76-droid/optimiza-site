import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// lastmod del sitemap: se lee el `publishDate` real de cada estudio de /analisis
// (fuente única de verdad, sin duplicar fechas). Mapea URL → fecha ISO.
function buildLastmodMap() {
  const dir = fileURLToPath(new URL('./src/pages/analisis', import.meta.url));
  const map = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.astro') || file.includes('[')) continue;
    const src = readFileSync(`${dir}/${file}`, 'utf8');
    const m = src.match(/const publishDate = '([^']+)'/);
    if (m) {
      const slug = file.replace(/\.astro$/, '');
      map[`https://optimizahq.com/analisis/${slug}/`] = new Date(m[1] + 'T12:00:00Z').toISOString();
    }
  }
  return map;
}
const lastmodMap = buildLastmodMap();

// https://astro.build
export default defineConfig({
  site: 'https://optimizahq.com',
  adapter: vercel({ maxDuration: 60 }),
  // Redirect 301 del slug antiguo con ñ (no-ASCII) al slug ASCII.
  redirects: {
    '/analisis/estudio-webs-agencias-diseño-costa-rica-2026': '/analisis/estudio-webs-agencias-diseno-costa-rica-2026',
  },
  // Inyecta el CSS de cada página directo en el <head> en vez de 3 hojas
  // separadas y bloqueantes (Base/Scanner/página) — evita esos round-trips
  // antes del primer pintado, que era la causa del LCP alto.
  build: { inlineStylesheets: 'always' },
  integrations: [
    react(),
    keystatic(),
    // Excluye páginas internas/privadas del sitemap público.
    sitemap({
      filter: (page) => !page.includes('/leads'),
      serialize(item) {
        const lastmod = lastmodMap[item.url];
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
});
