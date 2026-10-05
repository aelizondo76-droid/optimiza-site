import { Redis } from '@upstash/redis';

/* ────────────────────────────────────────────────────────────────────────
   Capa de datos del scanner.
   Usa Upstash Redis (REST) en producción; si no hay credenciales, cae a un
   almacén en memoria para desarrollo local (`astro dev`). El almacén en
   memoria NO persiste entre invocaciones serverless — solo sirve para probar.
   ──────────────────────────────────────────────────────────────────────── */

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

/* La construcción también va blindada (incidente 2026-10-05, parte 2): una
   credencial malformada hacía lanzar a Redis.fromEnv() a nivel de módulo —
   ANTES de tryRedis — y tumbaba todos los endpoints sin pasar por el modo
   degradado. Una URL que no empiece con https:// se trata como ausencia. */
const redis = (() => {
  if (!hasRedis) return null;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL!.startsWith('https://'))
      throw new Error(`UPSTASH_REDIS_REST_URL no es una URL https válida`);
    return Redis.fromEnv();
  } catch (e: any) {
    console.error('[store] Redis no construible, modo memoria:', e?.message || e);
    return null;
  }
})();

export const storeMode = hasRedis ? 'redis' : 'memory';

/* Resiliencia (incidente 2026-10-05): la base de Upstash murió y el 500 del
   rate-limit tumbó el escáner COMPLETO — el instrumento de leads estuvo caído
   sin aviso. Regla: Redis nunca es razón para no responder. Cada operación
   intenta Redis y, si falla, degrada a memoria (el lead igual llega a
   Clientify; solo se pierde dedup/persistencia entre invocaciones). */
async function tryRedis<T>(op: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  if (!redis) return { ok: false };
  try {
    return { ok: true, value: await op() };
  } catch (e: any) {
    console.error('[store] Redis caído, degradando a memoria:', e?.message || e);
    return { ok: false };
  }
}

// ── Fallback en memoria (solo dev) ──
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

const REPORT_TTL = 60 * 60 * 24 * 90; // 90 días

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
  const r = await tryRedis(() => redis!.set(`report:${id}`, data, { ex: REPORT_TTL }));
  if (!r.ok) memSet(`report:${id}`, data, REPORT_TTL);
}

export async function getReport<T = any>(id: string): Promise<T | null> {
  const r = await tryRedis(() => redis!.get<T>(`report:${id}`));
  if (r.ok) return r.value ?? memGet<T>(`report:${id}`);
  return memGet<T>(`report:${id}`);
}

/* ── Rate limit por IP ──────────────────────────────────────────────────── */

export async function rateLimit(
  ip: string,
  max: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:${ip}`;
  const r = await tryRedis(async () => {
    const count = await redis!.incr(key);
    if (count === 1) await redis!.expire(key, windowSec);
    return count;
  });
  if (r.ok) return { allowed: r.value <= max, remaining: Math.max(0, max - r.value) };
  const cur = memGet<number>(key) ?? 0;
  const next = cur + 1;
  memSet(key, next, windowSec);
  return { allowed: next <= max, remaining: Math.max(0, max - next) };
}

/* ── Leads + dedup ──────────────────────────────────────────────────────── */

/** Devuelve el lead previo si ya existe (email+dominio), o null. */
export async function findLead(email: string, domain: string): Promise<Lead | null> {
  const key = `lead:${email.toLowerCase()}|${domain.toLowerCase()}`;
  const r = await tryRedis(() => redis!.get<Lead>(key));
  if (r.ok) return r.value ?? null;
  return memGet<Lead>(key);
}

/** Crea o actualiza el lead (upsert con dedup por email+dominio). */
export async function upsertLead(lead: Lead): Promise<Lead> {
  const dedupKey = `lead:${lead.email.toLowerCase()}|${lead.domain.toLowerCase()}`;
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
  const r = await tryRedis(async () => {
    await redis!.set(dedupKey, merged);
    // Solo indexa la primera vez (las actualizaciones reusan el id existente)
    if (!prev) await redis!.lpush('leads:index', merged.id);
    await redis!.set(`leadById:${merged.id}`, merged);
  });
  if (!r.ok) {
    memSet(dedupKey, merged);
    if (!prev) {
      const idx = memGet<string[]>('leads:index') ?? [];
      idx.unshift(merged.id);
      memSet('leads:index', idx);
    }
    memSet(`leadById:${merged.id}`, merged);
  }
  return merged;
}

/** Devuelve los leads más recientes para el panel. */
export async function getLeads(limit = 200): Promise<Lead[]> {
  let ids: string[] = [];
  const r = await tryRedis(() => redis!.lrange('leads:index', 0, limit - 1));
  if (r.ok) ids = r.value as string[];
  else ids = (memGet<string[]>('leads:index') ?? []).slice(0, limit);
  if (!ids.length) return [];
  const leads: Lead[] = [];
  for (const id of ids) {
    const rl = await tryRedis(() => redis!.get<Lead>(`leadById:${id}`));
    const l = rl.ok ? rl.value : memGet<Lead>(`leadById:${id}`);
    if (l) leads.push(l);
  }
  return leads;
}
