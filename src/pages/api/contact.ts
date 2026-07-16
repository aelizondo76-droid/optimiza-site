import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { upsertLead, rateLimit, type Lead } from '../../lib/store';
import { sendContactConfirmation, sendLeadNotification } from '../../lib/email';
import { checkEmail, scoreTemperature, tempLabel } from '../../lib/validate';
import { normalizeUrl } from '../../lib/diagnose';

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

  const { name, company, email, whatsapp, url, goal, ads, message } = body || {};

  // Honeypot: si un bot llenó el campo oculto, fingimos éxito y descartamos.
  if ((body?.hp || '').toString().trim()) return json({ ok: true });

  if (!(name || '').toString().trim()) return json({ error: 'Falta tu nombre' }, 400);

  const chk = checkEmail(email || '');
  if (!chk.valid) return json({ error: chk.reason || 'Correo inválido' }, 400);

  const wa = (whatsapp || '').toString().trim().slice(0, 30);
  if (wa.replace(/\D/g, '').length < 8) return json({ error: 'Ingresa un WhatsApp válido' }, 400);

  const ip =
    clientAddress ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'anon';
  const rl = await rateLimit(`contact:${ip}`, 10, 60 * 60);
  if (!rl.allowed) return json({ error: 'Demasiadas solicitudes. Intenta luego.' }, 429);

  const normUrl = normalizeUrl((url || '').toString());
  const domain = normUrl ? new URL(normUrl).host.replace(/^www\./, '') : `contacto-${nanoid(6)}`;

  const qualifiers = {
    name: (name || '').toString().slice(0, 80),
    goal: (goal || '').toString().slice(0, 80),
    ads: (ads || '').toString().slice(0, 20),
  };
  // Lead de contacto = alta intención (llenó todo + WhatsApp): base más caliente.
  const temperature = Math.min(100, scoreTemperature(65, qualifiers, !chk.free) + 12);

  const lead: Lead = {
    id: nanoid(10),
    source: 'contacto',
    email: email.trim().toLowerCase(),
    whatsapp: wa,
    name: qualifiers.name || undefined,
    company: (company || '').toString().slice(0, 120) || undefined,
    message: (message || '').toString().slice(0, 1000) || undefined,
    domain,
    url: normUrl || '',
    index: null,
    grade: null,
    temperature,
    qualifiers,
    ip,
    createdAt: new Date().toISOString(),
    scans: 1,
  };
  await upsertLead(lead);

  await Promise.all([
    sendContactConfirmation(lead.email, lead.name),
    sendLeadNotification({
      source: 'contacto',
      email: lead.email,
      whatsapp: lead.whatsapp,
      name: lead.name,
      company: lead.company,
      message: lead.message,
      url: lead.url,
      index: null,
      temperature,
      tempLabel: tempLabel(temperature),
    }),
  ]);

  return json({ ok: true });
};
