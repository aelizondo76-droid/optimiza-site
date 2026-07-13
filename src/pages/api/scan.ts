import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { diagnose, normalizeUrl } from '../../lib/diagnose';
import { saveReport, rateLimit } from '../../lib/store';

export const prerender = false;

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida' }, 400);
  }

  const url = normalizeUrl(body?.url || '');
  if (!url) return json({ error: 'Ingresa una URL válida (ej: tu-sitio.com)' }, 400);

  // Rate limit: 8 escaneos por IP por hora
  const ip =
    clientAddress ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anon';
  const rl = await rateLimit(`scan:${ip}`, 8, 60 * 60);
  if (!rl.allowed)
    return json(
      { error: 'Demasiados análisis desde tu red. Intenta de nuevo en una hora.' },
      429
    );

  let d;
  try {
    d = await diagnose(url);
  } catch (e: any) {
    return json({ error: 'No pudimos analizar ese sitio. Verifica la URL.' }, 422);
  }

  const id = nanoid(10);
  await saveReport(id, d);

  // Vista previa: 2 hallazgos reales visibles, el resto bloqueado tras el email
  const negatives = d.pillars
    .flatMap((p) => p.findings.filter((f) => f.ok === false).map((f) => ({ pillar: p.label, ...f })));
  const preview = negatives.slice(0, 2);
  const lockedCount = Math.max(0, negatives.length - preview.length);

  return json({
    id,
    host: d.host,
    index: d.index,
    grade: d.grade,
    stack: d.stack,
    pillars: d.pillars.map((p) => ({ key: p.key, label: p.label, score: p.score })),
    speed: {
      mobile: d.speed.mobile?.performance ?? null,
      desktop: d.speed.desktop?.performance ?? null,
    },
    preview,
    lockedCount,
    totalFindings: negatives.length,
  });
};
