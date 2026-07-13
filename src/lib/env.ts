/**
 * Lee variables de entorno de forma robusta en ambos mundos:
 * - Vercel (producción/serverless): las variables viven en `process.env`.
 * - `astro dev` local con archivo `.env`: Vite las expone en `import.meta.env`.
 */
export function env(key: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  if (fromProcess != null && fromProcess !== '') return fromProcess;
  try {
    const v = (import.meta as any).env?.[key];
    if (v != null && v !== '') return v as string;
  } catch {
    /* import.meta.env no disponible en algún contexto */
  }
  return undefined;
}
