import { Redis } from '@upstash/redis';

/* ────────────────────────────────────────────────────────────────────────
   Capa de datos del scanner.
   Usa Upstash Redis (REST) en producción; si no hay credenciales, cae a un
   almacén en memoria para desarrollo local (`astro dev`). El almacén en
   memoria NO persiste entre invocaciones serverless — solo sirve para probar.
   ──────────────────────────────────────────────────────────────────────── */

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis ? Redis.fromEnv() : null;

export const storeMode = hasRedis ? 'redis' : 'memory';

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
  if (redis) await redis.set(`report:${id}`, data, { ex: REPORT_TTL });
  else memSet(`report:${id}`, data, REPORT_TTL);
}

export async function getReport<T = any>(id: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(`report:${id}`)) ?? null;
  return memGet<T>(`report:${id}`);
}

/* ── Rate limit por IP ──────────────────────────────────────────────────── */

export async function rateLimit(
  ip: string,
  max: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:${ip}`;
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return { allowed: count <= max, remaining: Math.max(0, max - count) };
  }
  const cur = memGet<number>(key) ?? 0;
  const next = cur + 1;
  memSet(key, next, windowSec);
  return { allowed: next <= max, remaining: Math.max(0, max - next) };
}

/* ── Leads + dedup ──────────────────────────────────────────────────────── */

/** Devuelve el lead previo si ya existe (email+dominio), o null. */
export async function findLead(email: string, domain: string): Promise<Lead | null> {
  const key = `lead:${email.toLowerCase()}|${domain.toLowerCase()}`;
  if (redis) return (await redis.get<Lead>(key)) ?? null;
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
  if (redis) {
    await redis.set(dedupKey, merged);
    // Solo indexa la primera vez (las actualizaciones reusan el id existente)
    if (!prev) await redis.lpush('leads:index', merged.id);
    await redis.set(`leadById:${merged.id}`, merged);
  } else {
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
  if (redis) ids = (await redis.lrange('leads:index', 0, limit - 1)) as string[];
  else ids = (memGet<string[]>('leads:index') ?? []).slice(0, limit);
  if (!ids.length) return [];
  const leads: Lead[] = [];
  for (const id of ids) {
    const l = redis ? await redis.get<Lead>(`leadById:${id}`) : memGet<Lead>(`leadById:${id}`);
    if (l) leads.push(l);
  }
  return leads;
}
