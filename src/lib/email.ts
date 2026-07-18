import { Resend } from 'resend';
import { env } from './env';

/* Envío del informe por email (Resend). Si no hay RESEND_API_KEY, no falla:
   registra en consola y devuelve false (útil en desarrollo). */

const key = env('RESEND_API_KEY');
const FROM = env('SCAN_FROM_EMAIL') || 'Optimiza <informes@optimizahq.com>';
const SITE = env('PUBLIC_SITE_URL') || 'https://optimizahq.com';
const REPLY_TO = env('SCAN_REPLY_TO'); // correo real donde recibir respuestas de leads
const NOTIFY = env('LEAD_NOTIFY_EMAIL') || env('SCAN_REPLY_TO'); // a dónde llegan los avisos de nuevos leads

const resend = key ? new Resend(key) : null;

// Escapa datos del lead (nombre, mensaje, host…) antes de meterlos al HTML del email.
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

interface ReportEmail {
  to: string;
  host: string;
  index: number;
  grade: string;
  reportId: string;
}

export async function sendReportEmail(p: ReportEmail): Promise<boolean> {
  const link = `${SITE}/reporte/${p.reportId}`;
  if (!resend) {
    console.log(`[email:dev] Informe listo para ${p.to} → ${link} (índice ${p.index})`);
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: p.to,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject: `Tu diagnóstico Optimiza: ${p.host} obtuvo ${p.index}/100`,
      html: renderEmail(p, link),
    });
    return true;
  } catch (e) {
    console.error('[email] error al enviar', e);
    return false;
  }
}

function renderEmail(p: ReportEmail, link: string): string {
  const color = p.index >= 80 ? '#16A34A' : p.index >= 55 ? '#D97706' : '#DC2626';
  return `<!doctype html><html><body style="margin:0;background:#F7F6FC;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#17141F">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:700;font-size:20px;letter-spacing:-.02em;margin-bottom:24px">Optimiza</div>
    <div style="background:#fff;border:1px solid rgba(23,20,31,.1);border-radius:16px;padding:32px;text-align:center">
      <p style="margin:0 0 8px;color:#615C74;font-size:14px">Diagnóstico de <b>${esc(p.host)}</b></p>
      <div style="font-size:64px;font-weight:800;letter-spacing:-.03em;color:${color};line-height:1">${p.index}</div>
      <p style="margin:4px 0 0;color:#615C74;font-size:13px">Índice Optimiza · calificación ${p.grade}</p>
      <a href="${link}" style="display:inline-block;margin-top:24px;background:#C65D3B;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px">Ver tu informe completo →</a>
      <p style="margin:20px 0 0;color:#726D86;font-size:12px">Velocidad · Visibilidad · Conversión · Automatización</p>
    </div>
    <p style="color:#726D86;font-size:12px;text-align:center;margin-top:20px">
      Optimizamos tu negocio a través de tu web.<br>optimizahq.com
    </p>
  </div></body></html>`;
}

/* ── Aviso interno de nuevo lead (a NOTIFY) ─────────────────────────────── */

export interface LeadNotify {
  source: 'scanner' | 'contacto';
  email: string;
  whatsapp?: string;
  name?: string;
  company?: string;
  message?: string;
  url?: string;
  index?: number | null;
  temperature: number;
  tempLabel: string;
}

export async function sendLeadNotification(l: LeadNotify): Promise<boolean> {
  if (!resend || !NOTIFY) {
    console.log(`[email:dev] Nuevo lead (${l.source}) ${l.email} → ${NOTIFY || 'sin NOTIFY'}`);
    return false;
  }
  const rows: [string, string][] = [
    ['Origen', l.source === 'contacto' ? 'Formulario de contacto' : 'Scanner'],
    ['Nombre', l.name || '—'],
    ['Empresa', l.company || '—'],
    ['Email', l.email],
    ['WhatsApp', l.whatsapp || '—'],
    ['Sitio', l.url || '—'],
    ['Índice', l.index != null ? `${l.index}/100` : '—'],
    ['Temperatura', `${l.temperature} · ${l.tempLabel}`],
    ['Mensaje', l.message || '—'],
  ];
  try {
    await resend.emails.send({
      from: FROM,
      to: NOTIFY,
      replyTo: l.email,
      subject: `🔥 Nuevo lead (${l.tempLabel}): ${l.name || l.email}${l.company ? ' · ' + l.company : ''}`,
      html: `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#17141F;background:#F7F6FC;padding:24px">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid rgba(23,20,31,.1);border-radius:14px;padding:24px">
          <h2 style="margin:0 0 16px;font-size:18px">Nuevo lead en Optimiza</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            ${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#615C74;width:110px;vertical-align:top">${k}</td><td style="padding:7px 0;font-weight:600">${esc(v)}</td></tr>`).join('')}
          </table>
        </div></body></html>`,
    });
    return true;
  } catch (e) {
    console.error('[email] notify error', e);
    return false;
  }
}

/* ── Confirmación al lead del formulario de contacto ────────────────────── */

export async function sendContactConfirmation(to: string, name?: string): Promise<boolean> {
  if (!resend) {
    console.log(`[email:dev] Confirmación de contacto a ${to}`);
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject: 'Recibimos tu mensaje — Optimiza',
      html: `<!doctype html><html><body style="margin:0;background:#F7F6FC;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#17141F">
        <div style="max-width:520px;margin:0 auto;padding:32px 20px">
          <div style="font-weight:700;font-size:20px;margin-bottom:24px">Optimiza</div>
          <div style="background:#fff;border:1px solid rgba(23,20,31,.1);border-radius:16px;padding:32px">
            <p style="margin:0 0 12px;font-size:16px">${name ? '¡Hola ' + esc(name) + '!' : '¡Hola!'}</p>
            <p style="margin:0;color:#615C74;font-size:14px;line-height:1.6">Recibimos tu solicitud. Un miembro del equipo te contactará en menos de 24 horas para revisar tu caso y explicarte, sin tecnicismos, cómo tu web puede vender más.</p>
          </div>
          <p style="color:#726D86;font-size:12px;text-align:center;margin-top:20px">Optimizamos tu negocio a través de tu web.<br>optimizahq.com</p>
        </div></body></html>`,
    });
    return true;
  } catch (e) {
    console.error('[email] confirm error', e);
    return false;
  }
}
