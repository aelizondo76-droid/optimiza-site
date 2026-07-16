import type { APIRoute } from 'astro';
import { env } from '../../lib/env';
import { basicAuthOk } from '../../lib/auth';
import { clientifyPing } from '../../lib/clientify';

export const prerender = false;

/* Diagnóstico de integraciones. Protegido con Basic Auth (LEADS_PASSWORD).
   Reporta presencia de variables (no sus valores) + estado real de PageSpeed. */

export const GET: APIRoute = async ({ request }) => {
  const USER = env('LEADS_USER') || 'optimiza';
  const PASS = env('LEADS_PASSWORD');
  const auth = request.headers.get('authorization');
  if (!PASS || !basicAuthOk(auth, USER, PASS)) {
    return new Response('Acceso restringido', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Optimiza health"' },
    });
  }

  const present = (k: string) => !!env(k);

  // Prueba real de PageSpeed con la key del runtime
  const psi: { status: number; ok: boolean; error: string; perf: number | null } = {
    status: 0, ok: false, error: '', perf: null,
  };
  try {
    const key = env('PAGESPEED_API_KEY');
    const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=performance${key ? `&key=${key}` : ''}`;
    const r = await fetch(u);
    psi.status = r.status;
    psi.ok = r.ok;
    const j: any = await r.json().catch(() => null);
    if (r.ok) psi.perf = Math.round((j?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
    else psi.error = (j?.error?.message || '').slice(0, 240);
  } catch (e) {
    psi.error = String(e).slice(0, 240);
  }

  const clientify = await clientifyPing();

  return Response.json({
    env: {
      PAGESPEED_API_KEY: present('PAGESPEED_API_KEY'),
      UPSTASH_REDIS_REST_URL: present('UPSTASH_REDIS_REST_URL'),
      UPSTASH_REDIS_REST_TOKEN: present('UPSTASH_REDIS_REST_TOKEN'),
      RESEND_API_KEY: present('RESEND_API_KEY'),
      LEADS_PASSWORD: present('LEADS_PASSWORD'),
      CLIENTIFY_API_TOKEN: present('CLIENTIFY_API_TOKEN'),
      PUBLIC_SITE_URL: env('PUBLIC_SITE_URL') || null,
    },
    pagespeed: psi,
    clientify,
  });
};
