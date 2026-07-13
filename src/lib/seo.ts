import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

export type PageKey = 'home' | 'servicios' | 'nosotros' | 'analisis' | 'contacto';

interface Fallback {
  title: string;
  description: string;
}

/**
 * Resuelve el SEO de una página de marketing.
 * Lee los overrides desde Keystatic (singleton "SEO de las páginas");
 * si un campo está vacío o el contenido aún no existe, usa el respaldo del código.
 */
export async function getSeo(page: PageKey, fallback: Fallback) {
  let data: Awaited<ReturnType<typeof reader.singletons.seo.read>> = null;
  try {
    data = await reader.singletons.seo.read();
  } catch {
    data = null;
  }

  const p = data?.[page];
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

  return {
    title: clean(p?.metaTitle) ?? fallback.title,
    description: clean(p?.metaDescription) ?? fallback.description,
    focusKeyword: clean(p?.focusKeyword),
    ogImage: data?.defaultOgImage ?? null,
  };
}
