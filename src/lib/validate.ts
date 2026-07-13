/* Validación de email y scoring de "temperatura" del lead. */

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'trashmail.com',
  'getnada.com', 'maildrop.cc', 'sharklasers.com', 'dispostable.com', 'fakeinbox.com',
  'mailnesia.com', 'mvrht.com', 'tmpmail.org', 'tmpeml.com', 'emailondeck.com',
]);

const FREE = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.es', 'icloud.com',
  'live.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com',
]);

export interface EmailCheck {
  valid: boolean;
  disposable: boolean;
  free: boolean;
  domain: string;
  reason?: string;
}

export function checkEmail(email: string): EmailCheck {
  const e = (email || '').trim().toLowerCase();
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(e);
  if (!m) return { valid: false, disposable: false, free: false, domain: '', reason: 'Correo inválido' };
  const domain = m[1];
  if (DISPOSABLE.has(domain))
    return { valid: false, disposable: true, free: false, domain, reason: 'Correo temporal no permitido' };
  return { valid: true, disposable: false, free: FREE.has(domain), domain };
}

export interface Qualifiers {
  name?: string;
  goal?: string;
  ads?: string; // si | no | pronto
}

/** Temperatura del lead (0–100): intención comercial + presupuesto + oportunidad. */
export function scoreTemperature(index: number, q: Qualifiers, emailIsBusiness: boolean): number {
  let t = 35;
  if (q.ads === 'si') t += 22;
  else if (q.ads === 'pronto') t += 12;
  if (q.goal) t += 8;
  if (q.goal === 'Vender más' || q.goal === 'Conseguir más leads') t += 15;
  if (q.name && q.name.trim()) t += 6;
  if (emailIsBusiness) t += 10; // correo corporativo, no gratuito
  if (index < 60) t += 10; // hay oportunidad clara de mejora
  else if (index < 75) t += 5;
  return Math.max(0, Math.min(100, Math.round(t)));
}

export function tempLabel(t: number): string {
  if (t >= 75) return 'caliente';
  if (t >= 55) return 'tibio';
  return 'frío';
}
