import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { getReport, upsertLead, rateLimit, type Lead } from '../../lib/store';
import { sendReportEmail, sendLeadNotification } from '../../lib/email';
import { pushToClientify } from '../../lib/clientify';
import { checkEmail, scoreTemperature, tempLabel } from '../../lib/validate';

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

  const { reportId, email, whatsapp, name, goal, ads } = body || {};
  if (!reportId) return json({ error: 'Falta el diagnóstico' }, 400);

  const chk = checkEmail(email || '');
  if (!chk.valid) return json({ error: chk.reason || 'Correo inválido' }, 400);

  const isFirst = !goal && !ads; // primera llamada = email + WhatsApp

  // Honeypot: bot detectado → fingimos éxito sin guardar ni enviar nada.
  if (isFirst && (body?.hp || '').toString().trim())
    return json({ ok: true, reportUrl: `/reporte/${reportId}/`, duplicate: false });

  const wa = (whatsapp || '').toString().trim().slice(0, 30);
  if (isFirst && wa.replace(/\D/g, '').length < 8)
    return json({ error: 'Ingresa un WhatsApp válido' }, 400);

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
    source: 'scanner',
    email: email.trim().toLowerCase(),
    whatsapp: wa || undefined,
    name: qualifiers.name || undefined,
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

  // Primera llamada: envía el informe al lead + avisa al negocio
  if (isFirst) {
    await sendReportEmail({
      to: lead.email,
      host: report.host,
      index: report.index,
      grade: report.grade,
      reportId,
    });
    await sendLeadNotification({
      source: 'scanner',
      email: lead.email,
      whatsapp: lead.whatsapp,
      name: lead.name,
      url: lead.url,
      index: report.index,
      temperature,
      tempLabel: tempLabel(temperature),
    });
    // CRM: solo empuja leads nuevos (evita duplicados al reescanear).
    if (saved.scans === 1) {
      await pushToClientify({
        source: 'scanner',
        email: lead.email,
        name: lead.name,
        phone: lead.whatsapp,
        url: lead.url,
        index: report.index,
        temperature,
        tempLabel: tempLabel(temperature),
        goal: qualifiers.goal,
      });
    }
  }

  return json({
    ok: true,
    reportUrl: `/reporte/${reportId}/`,
    duplicate: saved.scans > 1,
  });
};
