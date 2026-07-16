import { defineMiddleware } from 'astro:middleware';
import { env } from './lib/env';

/**
 * En producción, el admin de Keystatic (storage local) no debe estar expuesto.
 * Se bloquea /keystatic y /api/keystatic salvo que se defina ENABLE_KEYSTATIC.
 */
export const onRequest = defineMiddleware((context, next) => {
  const p = context.url.pathname;
  const isKeystatic =
    p === '/keystatic' || p.startsWith('/keystatic/') || p.startsWith('/api/keystatic');
  if (isKeystatic && import.meta.env.PROD && !env('ENABLE_KEYSTATIC')) {
    return new Response('Not found', { status: 404 });
  }
  return next();
});
