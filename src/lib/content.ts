export const categoryMeta: Record<string, { label: string; cls: string }> = {
  teardown: { label: 'Teardown', cls: 'tear' },
  investigacion: { label: 'Investigación', cls: 'res' },
  'nuestro-sitio': { label: 'Nuestro sitio', cls: 'self' },
  conversion: { label: 'Conversión', cls: 'conv' },
};

/**
 * Crea el reader de Keystatic bajo demanda (import dinámico).
 * Al no importar Keystatic en el nivel superior, su CSS de admin no se
 * empaqueta en el bundle de las páginas públicas (menos CSS render-blocking).
 */
async function getReader() {
  const { createReader } = await import('@keystatic/core/reader');
  const { default: keystaticConfig } = await import('../../keystatic.config');
  return createReader(process.cwd(), keystaticConfig);
}

/** Lista los análisis publicados (no borradores), más recientes primero. */
export async function getAnalisis() {
  const reader = await getReader();
  const all = await reader.collections.analisis.all();
  return all
    .filter((p) => !p.entry.draft)
    .sort((a, b) =>
      (b.entry.publishDate ?? '').localeCompare(a.entry.publishDate ?? '')
    );
}

/** Slugs publicados, para getStaticPaths. */
export async function getAnalisisSlugs() {
  const reader = await getReader();
  const all = await reader.collections.analisis.all();
  return all.filter((p) => !p.entry.draft).map((p) => p.slug);
}

/** Lee un análisis por slug (o null si no existe). */
export async function getAnalisisEntry(slug: string) {
  const reader = await getReader();
  return reader.collections.analisis.read(slug);
}
