import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { getReport, upsertLead, rateLimit, type Lead } from '../../lib/store';
import { sendReportEmail } from '../../lib/email';
import { checkEmail, scoreTemperature } from '../../lib/validate';

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

  const { reportId, email, name, goal, ads } = body || {};
  if (!reportId) return json({ error: 'Falta el diagnóstico' }, 400);

  const chk = checkEmail(email || '');
  if (!chk.valid) return json({ error: chk.reason || 'Correo inválido' }, 400);

  const ip =
    clientAddress ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anon';
  const rl = await rateLimit(`lead:${ip}`, 20, 60 * 60);
  if (!rl.allowed) return json({ error: 'Demasiadas solicitudes. Intenta luego.' }, 429);

  const report = await getReport(reportId);
  if (!report) return json({ error: 'El diagnóstico expiró. Vuelve a escanear.' }, 404);

  const qualifiers = {
    name: (name || '').toString().slice(0, 80),
    goal: (goal || '').toString().slice(0, 80),
    ads: (ads || '').toString().slice(0, 20),
  };
  const temperature = scoreTemperature(report.index, qualifiers, !chk.free);

  const lead: Lead = {
    id: nanoid(10),
    email: email.trim().toLowerCase(),
    domain: chk.domain,
    url: report.finalUrl || report.url,
    index: report.index,
    grade: report.grade,
    temperature,
    qualifiers,
    ip,
    createdAt: new Date().toISOString(),
    scans: 1,
  };
  const saved = await upsertLead(lead);

  // Envía el email solo la primera vez (no en la actualización de calificadores)
  const isFirst = !goal && !ads; // primera llamada = solo email
  if (isFirst) {
    await sendReportEmail({
      to: lead.email,
      host: report.host,
      index: report.index,
      grade: report.grade,
      reportId,
    });
  }

  return json({
    ok: true,
    reportUrl: `/reporte/${reportId}`,
    duplicate: saved.scans > 1,
  });
};
