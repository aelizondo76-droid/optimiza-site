import { Resend } from 'resend';
import { env } from './env';

/* Envío del informe por email (Resend). Si no hay RESEND_API_KEY, no falla:
   registra en consola y devuelve false (útil en desarrollo). */

const key = env('RESEND_API_KEY');
const FROM = env('SCAN_FROM_EMAIL') || 'Optimiza <informes@optimizahq.com>';
const SITE = env('PUBLIC_SITE_URL') || 'https://optimizahq.com';

const resend = key ? new Resend(key) : null;

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
      <p style="margin:0 0 8px;color:#615C74;font-size:14px">Diagnóstico de <b>${p.host}</b></p>
      <div style="font-size:64px;font-weight:800;letter-spacing:-.03em;color:${color};line-height:1">${p.index}</div>
      <p style="margin:4px 0 0;color:#615C74;font-size:13px">Índice Optimiza · calificación ${p.grade}</p>
      <a href="${link}" style="display:inline-block;margin-top:24px;background:#6A3EF0;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px">Ver tu informe completo →</a>
      <p style="margin:20px 0 0;color:#726D86;font-size:12px">Velocidad · Visibilidad · Conversión · Automatización</p>
    </div>
    <p style="color:#726D86;font-size:12px;text-align:center;margin-top:20px">
      Optimizamos tu negocio a través de tu web.<br>optimizahq.com
    </p>
  </div></body></html>`;
}
