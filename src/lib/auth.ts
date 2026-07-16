import { createHash, timingSafeEqual } from 'node:crypto';

const sha = (s: string) => createHash('sha256').update(s).digest();

/**
 * Verifica Basic Auth comparando en TIEMPO CONSTANTE (hash + timingSafeEqual),
 * para no filtrar la contraseña por análisis de tiempos.
 */
export function basicAuthOk(authHeader: string | null, user: string, pass: string): boolean {
  if (!authHeader) return false;
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  return timingSafeEqual(sha(authHeader), sha(expected));
}
