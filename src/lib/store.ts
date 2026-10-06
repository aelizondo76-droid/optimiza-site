import { put, get, list } from '@vercel/blob';

/* ────────────────────────────────────────────────────────────────────────
   Capa de datos del scanner — Vercel Blob (store privado `optimiza-datos`).

   Historia: la versión original usaba Upstash Redis. El 2026-10-05 Upstash
   eliminó la base gratuita por inactividad y el escáner completo cayó con
   500 (el cliente se construía a nivel de módulo y la primera llamada
   estaba fuera de todo try/catch). Migrado a Vercel Blob porque el token
   (BLOB_READ_WRITE_TOKEN) lo inyecta la propia plataforma — cero
   credenciales manuales, que fue la causa raíz de 4 intentos fallidos de
   restauración.

   Doctrina de resiliencia (se conserva): el almacén NUNCA es razón para no
   responder. Toda operación intenta Blob y degrada a memoria si falla; en
   modo degradado el escáner funciona y el lead llega igual a Clientify.

   Trade-offs aceptados vs Redis:
   - rateLimit es por instancia (memoria): suficiente contra abuso casual;
     un atacante distribuido lo esquivaría igual con IPs múltiples.
   - Los informes no expiran (eran 90 días): son JSON de ~5KB, costo nulo.
   - upsertLead tiene una ventana de carrera read-modify-write: con el
     tráfico actual es teórica; si algún día duele, se migra a algo con
     transacciones.
   ──────────────────────────────────────────────────────────────────────── */

const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
export const storeMode = hasBlob ? 'blob' : 'memory';

async function tryBlob<T>(op: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  if (!hasBlob) return { ok: false };
  try {
    return { ok: true, value: await op() };
  } catch (e: any) {
    console.error('[store] Blob falló, degradando a memoria:', e?.message || e);
    return { ok: false };
  }
}

async function blobReadJson<T>(path: string): Promise<T | null> {
  const r = await get(path, { access: 'private' });
  if (!r) return null;
  let text = '';
  for await (const chunk of r.stream as AsyncIterable<Uint8Array>) {
    text += Buffer.from(chunk).toString('utf8');
  }
  return JSON.parse(text) as T;
}

async function blobWriteJson(path: string, data: any): Promise<void> {
  await put(path, JSON.stringify(data), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

// ── Fallback en memoria (dev local y modo degradado) ──
const mem = new Map<string, { value: any; expires: number }>();
function memGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expires && e.expires < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}
function memSet(key: string, value: any, ttlSec?: number) {
  mem.set(key, { value, expires: ttlSec ? Date.now() + ttlSec * 1000 : 0 });
}

export interface Lead {
  id: string;
  source: 'scanner' | 'contacto';
  email: string;
  whatsapp?: string;
  name?: string;
  company?: string;
  message?: string;
  domain: string;
  url: string;
  index: number | null;
  grade: string | null;
  temperature: number; // 0–100
  qualifiers: Record<string, string>;
  ip: string;
  createdAt: string;
  scans: number;
}

/* ── Informes ───────────────────────────────────────────────────────────── */

export async function saveReport(id: string, data: any): Promise<void> {
  const r = await tryBlob(() => blobWriteJson(`reports/${id}.json`, data));
  if (!r.ok) memSet(`report:${id}`, data, 60 * 60 * 24);
}

export async function getReport<T = any>(id: string): Promise<T | null> {
  // El id viene de la URL pública /reporte/[id] — se restringe a nanoid
  // para que jamás forme un pathname fuera de reports/.
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) return null;
  const r = await tryBlob(() => blobReadJson<T>(`reports/${id}.json`));
  if (r.ok) return r.value ?? memGet<T>(`report:${id}`);
  return memGet<T>(`report:${id}`);
}

/* ── Rate limit por IP (memoria por instancia — ver trade-offs arriba) ──── */

export async function rateLimit(
  ip: string,
  max: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:${ip}`;
  const cur = memGet<number>(key) ?? 0;
  const next = cur + 1;
  memSet(key, next, windowSec);
  return { allowed: next <= max, remaining: Math.max(0, max - next) };
}

/* ── Leads + dedup ──────────────────────────────────────────────────────── */

function dedupPath(email: string, domain: string): string {
  const raw = `${email.toLowerCase()}|${domain.toLowerCase()}`;
  // pathname seguro y estable (los emails traen @, | y acentos ocasionales)
  return `leads/dedup/${Buffer.from(raw).toString('base64url')}.json`;
}

/** Devuelve el lead previo si ya existe (email+dominio), o null. */
export async function findLead(email: string, domain: string): Promise<Lead | null> {
  const path = dedupPath(email, domain);
  const r = await tryBlob(() => blobReadJson<Lead>(path));
  if (r.ok) return r.value;
  return memGet<Lead>(path);
}

/** Crea o actualiza el lead (upsert con dedup por email+dominio). */
export async function upsertLead(lead: Lead): Promise<Lead> {
  const path = dedupPath(lead.email, lead.domain);
  const prev = await findLead(lead.email, lead.domain);
  // Al reincidir, conserva lo previo pero prefiere los valores nuevos no vacíos.
  const pick = <T>(a: T | undefined | null, b: T | undefined | null) =>
    (a !== undefined && a !== null && a !== '' ? a : b) as T;
  const merged: Lead = prev
    ? {
        ...prev,
        source: lead.source || prev.source,
        whatsapp: pick(lead.whatsapp, prev.whatsapp),
        name: pick(lead.name, prev.name),
        company: pick(lead.company, prev.company),
        message: pick(lead.message, prev.message),
        index: lead.index ?? prev.index,
        grade: lead.grade ?? prev.grade,
        temperature: Math.max(lead.temperature, prev.temperature),
        url: lead.url || prev.url,
        qualifiers: { ...prev.qualifiers, ...lead.qualifiers },
        scans: prev.scans + 1,
      }
    : lead;
  const id = prev?.id || merged.id;
  const r = await tryBlob(async () => {
    await blobWriteJson(path, { ...merged, id });
    await blobWriteJson(`leads/by-id/${id}.json`, { ...merged, id });
  });
  if (!r.ok) {
    memSet(path, merged);
    memSet(`leadById:${id}`, merged);
  }
  return merged;
}

/** Devuelve los leads más recientes para el panel. */
export async function getLeads(limit = 200): Promise<Lead[]> {
  const r = await tryBlob(async () => {
    const { blobs } = await list({ prefix: 'leads/by-id/', limit: 1000 });
    const recent = blobs
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
      .slice(0, limit);
    const out: Lead[] = [];
    for (const b of recent) {
      const l = await blobReadJson<Lead>(b.pathname);
      if (l) out.push(l);
    }
    return out;
  });
  if (r.ok) return r.value;
  // modo memoria: lo que haya en esta instancia
  const leads: Lead[] = [];
  for (const [k, v] of mem) if (k.startsWith('leadById:')) leads.push(v.value as Lead);
  return leads.slice(0, limit);
}
