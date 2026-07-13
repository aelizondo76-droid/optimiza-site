import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

export const categoryMeta: Record<string, { label: string; cls: string }> = {
  teardown: { label: 'Teardown', cls: 'tear' },
  investigacion: { label: 'Investigación', cls: 'res' },
  'nuestro-sitio': { label: 'Nuestro sitio', cls: 'self' },
  conversion: { label: 'Conversión', cls: 'conv' },
};

/** Lista los análisis publicados (no borradores), más recientes primero. */
export async function getAnalisis() {
  const all = await reader.collections.analisis.all();
  return all
    .filter((p) => !p.entry.draft)
    .sort((a, b) =>
      (b.entry.publishDate ?? '').localeCompare(a.entry.publishDate ?? '')
    );
}
