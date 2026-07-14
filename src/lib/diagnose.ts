import { parse as parseHtml } from 'node-html-parser';
import { env } from './env';

/* ────────────────────────────────────────────────────────────────────────
   Motor de diagnóstico Optimiza
   Analiza cualquier URL en los 4 pilares (Velocidad, Visibilidad,
   Conversión, Automatización) y produce el "Índice Optimiza" (0–100).
   Núcleo de velocidad = PageSpeed Insights API (mismo Lighthouse de Google).
   Capa propia = fetch + parse del HTML para SEO/GEO/conversión/medición.
   ──────────────────────────────────────────────────────────────────────── */

export interface Finding {
  ok: boolean | 'warn';
  title: string;
  detail?: string;
  term?: string; // concepto para la explicación educativa en el informe
}

export interface Pillar {
  key: 'velocidad' | 'visibilidad' | 'conversion' | 'automatizacion';
  label: string;
  score: number; // 0–100
  findings: Finding[];
}

export interface SpeedResult {
  performance: number | null; // 0–100
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcp: number | null; // segundos
  cls: number | null;
  tbt: number | null; // ms
  fcp: number | null; // segundos
  speedIndex: number | null; // segundos
  fieldLcp: number | null; // CrUX campo, segundos
  fieldInp: number | null; // ms
  fieldCls: number | null;
  opportunities: { title: string; savingsMs: number }[];
  screenshot?: string | null; // solo en móvil: render final (data URI)
}

export interface Diagnosis {
  url: string;
  finalUrl: string;
  host: string;
  fetchedAt: string;
  index: number; // Índice Optimiza 0–100
  grade: string; // A+ … D
  pillars: Pillar[];
  speed: { mobile: SpeedResult | null; desktop: SpeedResult | null };
  meta: {
    title: string | null;
    titleLen: number;
    description: string | null;
    descLen: number;
    h1: string[];
    canonical: boolean;
    og: boolean;
    schema: string[]; // tipos de Schema.org detectados
    hreflang: boolean;
    viewport: boolean;
    robots: boolean;
    sitemap: boolean;
    llms: boolean; // llms.txt (GEO)
    favicon: boolean;
    lang: string | null;
  };
  conversion: {
    forms: number;
    whatsapp: boolean;
    tel: boolean;
    mailto: boolean;
    ctaButtons: number;
    imgCount: number;
    imgNoAlt: number;
  };
  tracking: {
    ga4: boolean;
    gtm: boolean;
    metaPixel: boolean;
    tiktok: boolean;
    hotjarClarity: boolean;
    any: boolean;
  };
  stack: string | null;
  screenshot: string | null; // data URI del render móvil (PSI)
  error?: string;
}

const UA =
  'Mozilla/5.0 (compatible; OptimizaBot/1.0; +https://optimizahq.com/scanner)';

/** Normaliza input del usuario a una URL http(s) válida. */
export function normalizeUrl(raw: string): string | null {
  let s = (raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, ...(init?.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

/* ── PageSpeed Insights ─────────────────────────────────────────────────── */

async function runPsi(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<SpeedResult | null> {
  const key = env('PAGESPEED_API_KEY');
  const params = new URLSearchParams({ url, strategy });
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo'])
    params.append('category', c);
  if (key) params.set('key', key);
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;

  try {
    const res = await fetchWithTimeout(endpoint, 55000);
    if (!res.ok) return null;
    const data: any = await res.json();
    const lh = data.lighthouseResult;
    if (!lh) return null;
    const cat = lh.categories || {};
    const audits = lh.audits || {};
    const num = (v: any) => (typeof v === 'number' ? v : null);
    const s = (v: any) => (typeof v === 'number' ? Math.round(v * 100) : null);

    const opportunities = Object.values<any>(audits)
      .filter(
        (a) =>
          a?.details?.type === 'opportunity' &&
          typeof a?.details?.overallSavingsMs === 'number' &&
          a.details.overallSavingsMs > 150
      )
      .map((a) => ({
        title: a.title as string,
        savingsMs: Math.round(a.details.overallSavingsMs),
      }))
      .sort((a, b) => b.savingsMs - a.savingsMs)
      .slice(0, 6);

    const field = data.loadingExperience?.metrics || {};
    const fieldMs = (m: any) => (m ? m.percentile : null);

    return {
      performance: s(cat.performance?.score),
      accessibility: s(cat.accessibility?.score),
      bestPractices: s(cat['best-practices']?.score),
      seo: s(cat.seo?.score),
      lcp: num(audits['largest-contentful-paint']?.numericValue)
        ? +(audits['largest-contentful-paint'].numericValue / 1000).toFixed(2)
        : null,
      cls: num(audits['cumulative-layout-shift']?.numericValue),
      tbt: num(audits['total-blocking-time']?.numericValue)
        ? Math.round(audits['total-blocking-time'].numericValue)
        : null,
      fcp: num(audits['first-contentful-paint']?.numericValue)
        ? +(audits['first-contentful-paint'].numericValue / 1000).toFixed(2)
        : null,
      speedIndex: num(audits['speed-index']?.numericValue)
        ? +(audits['speed-index'].numericValue / 1000).toFixed(2)
        : null,
      fieldLcp: fieldMs(field.LARGEST_CONTENTFUL_PAINT_MS)
        ? +(field.LARGEST_CONTENTFUL_PAINT_MS.percentile / 1000).toFixed(2)
        : null,
      fieldInp: fieldMs(field.INTERACTION_TO_NEXT_PAINT) ?? null,
      fieldCls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE
        ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
        : null,
      opportunities,
      screenshot:
        strategy === 'mobile'
          ? audits['final-screenshot']?.details?.data ?? null
          : null,
    };
  } catch {
    return null;
  }
}

/* ── Capa propia: fetch + parse del HTML ────────────────────────────────── */

interface HtmlLayer {
  finalUrl: string;
  host: string;
  meta: Diagnosis['meta'];
  conversion: Diagnosis['conversion'];
  tracking: Diagnosis['tracking'];
  stack: string | null;
}

async function analyzeHtml(url: string): Promise<HtmlLayer | null> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url, 20000, {
      headers: { accept: 'text/html' },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const finalUrl = res.url || url;
  const origin = new URL(finalUrl).origin;
  const host = new URL(finalUrl).host.replace(/^www\./, '');
  const html = await res.text();
  const headers = res.headers;
  const root = parseHtml(html, { comment: false });
  const lower = html.toLowerCase();

  const attr = (sel: string, name: string) =>
    root.querySelector(sel)?.getAttribute(name) || null;

  // Schema.org (JSON-LD + microdata)
  const schema = new Set<string>();
  root.querySelectorAll('script[type="application/ld+json"]').forEach((n) => {
    try {
      const j = JSON.parse(n.text);
      const arr = Array.isArray(j) ? j : [j];
      arr.forEach((o: any) => {
        const t = o?.['@type'];
        if (typeof t === 'string') schema.add(t);
        else if (Array.isArray(t)) t.forEach((x) => schema.add(String(x)));
      });
    } catch {
      /* ignora JSON-LD inválido */
    }
  });
  root.querySelectorAll('[itemtype]').forEach((n) => {
    const t = n.getAttribute('itemtype')?.split('/').pop();
    if (t) schema.add(t);
  });

  // Recursos externos (existencia)
  const exists = async (path: string, mustInclude?: RegExp) => {
    try {
      const r = await fetchWithTimeout(origin + path, 8000);
      if (!r.ok) return false;
      if (mustInclude) {
        const txt = (await r.text()).slice(0, 4000);
        return mustInclude.test(txt);
      }
      return true;
    } catch {
      return false;
    }
  };
  const [robots, sitemap, llms] = await Promise.all([
    exists('/robots.txt'),
    exists('/sitemap.xml').then((ok) => ok || exists('/sitemap_index.xml')),
    exists('/llms.txt'),
  ]);

  const title = root.querySelector('title')?.text?.trim() || null;
  const description = attr('meta[name="description"]', 'content');
  const h1 = root
    .querySelectorAll('h1')
    .map((n) => n.text.trim())
    .filter(Boolean)
    .slice(0, 5);
  const imgs = root.querySelectorAll('img');
  const imgNoAlt = imgs.filter((n) => !n.getAttribute('alt')?.trim()).length;

  // Conversión
  const links = root.querySelectorAll('a');
  const hrefs = links.map((n) => (n.getAttribute('href') || '').toLowerCase());
  const whatsapp =
    hrefs.some((h) => /wa\.me|api\.whatsapp\.com|whatsapp:\/\//.test(h)) ||
    /wa\.me|api\.whatsapp\.com/.test(lower);
  const tel = hrefs.some((h) => h.startsWith('tel:'));
  const mailto = hrefs.some((h) => h.startsWith('mailto:'));
  const ctaWords =
    /(comprar|cotiza|agenda|reserva|contact|solicita|empieza|regist|suscrib|prueba|demo|llama|escríbe|escribe|book|buy|get started|sign up)/i;
  const ctaButtons = [
    ...root.querySelectorAll('button'),
    ...links.filter((n) => /(btn|button|cta)/i.test(n.getAttribute('class') || '')),
    ...links.filter((n) => ctaWords.test(n.text)),
  ].length;

  // Medición / tracking
  const tracking = {
    ga4: /gtag\('config'|googletagmanager\.com\/gtag|google-analytics\.com\/g\/collect/.test(lower),
    gtm: /googletagmanager\.com\/gtm\.js|dataLayer/.test(lower),
    metaPixel: /connect\.facebook\.net\/.*fbevents\.js|fbq\(/.test(lower),
    tiktok: /analytics\.tiktok\.com|ttq\.load/.test(lower),
    hotjarClarity: /static\.hotjar\.com|clarity\.ms/.test(lower),
    any: false,
  };
  tracking.any =
    tracking.ga4 || tracking.gtm || tracking.metaPixel || tracking.tiktok || tracking.hotjarClarity;

  // Stack
  const gen = attr('meta[name="generator"]', 'content') || '';
  let stack: string | null = null;
  if (/wordpress/i.test(gen) || /wp-content|wp-includes/.test(lower)) stack = 'WordPress';
  else if (/shopify/i.test(gen) || /cdn\.shopify\.com/.test(lower)) stack = 'Shopify';
  else if (/wix/i.test(gen) || /wix\.com|wixstatic/.test(lower)) stack = 'Wix';
  else if (/squarespace/i.test(lower)) stack = 'Squarespace';
  else if (/webflow/i.test(gen) || /webflow/.test(lower)) stack = 'Webflow';
  else if (/next\.js|__next/i.test(lower) || headers.get('x-powered-by')?.includes('Next'))
    stack = 'Next.js';
  else if (gen) stack = gen.split(' ')[0];

  return {
    finalUrl,
    host,
    meta: {
      title,
      titleLen: title?.length ?? 0,
      description,
      descLen: description?.length ?? 0,
      h1,
      canonical: !!attr('link[rel="canonical"]', 'href'),
      og: !!attr('meta[property="og:title"]', 'content') ||
        !!attr('meta[property="og:image"]', 'content'),
      schema: [...schema],
      hreflang: !!root.querySelector('link[rel="alternate"][hreflang]'),
      viewport: !!attr('meta[name="viewport"]', 'content'),
      robots,
      sitemap,
      llms,
      favicon:
        !!attr('link[rel="icon"]', 'href') ||
        !!attr('link[rel="shortcut icon"]', 'href'),
      lang: root.querySelector('html')?.getAttribute('lang') || null,
    },
    conversion: {
      forms: root.querySelectorAll('form').length,
      whatsapp,
      tel,
      mailto,
      ctaButtons,
      imgCount: imgs.length,
      imgNoAlt,
    },
    tracking,
    stack,
  };
}

/* ── Cálculo de pilares e Índice Optimiza ───────────────────────────────── */

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildPillars(
  mobile: SpeedResult | null,
  html: HtmlLayer | null
): Pillar[] {
  // ── VELOCIDAD ──
  const vFindings: Finding[] = [];
  let velocidad = 50;
  if (mobile?.performance != null) {
    velocidad = mobile.performance;
    vFindings.push({
      ok: mobile.performance >= 90 ? true : mobile.performance >= 50 ? 'warn' : false,
      title: `Rendimiento móvil: ${mobile.performance}/100`,
      term: 'perf',
    });
    if (mobile.lcp != null)
      vFindings.push({
        ok: mobile.lcp <= 2.5 ? true : mobile.lcp <= 4 ? 'warn' : false,
        title: `LCP (carga): ${mobile.lcp}s`,
        detail: mobile.lcp > 2.5 ? 'Google recomienda menos de 2.5s' : undefined,
        term: 'lcp',
      });
    if (mobile.cls != null)
      vFindings.push({
        ok: mobile.cls <= 0.1 ? true : mobile.cls <= 0.25 ? 'warn' : false,
        title: `CLS (estabilidad): ${mobile.cls.toFixed(3)}`,
        term: 'cls',
      });
    if (mobile.tbt != null)
      vFindings.push({
        ok: mobile.tbt <= 200 ? true : mobile.tbt <= 600 ? 'warn' : false,
        title: `Bloqueo de interacción (TBT): ${mobile.tbt}ms`,
        term: 'tbt',
      });
    for (const o of mobile.opportunities.slice(0, 3))
      vFindings.push({ ok: false, title: o.title, detail: `~${o.savingsMs}ms de ahorro`, term: 'opp' });
  } else {
    vFindings.push({ ok: 'warn', title: 'No se pudo medir la velocidad (PageSpeed no respondió)' });
  }

  // ── VISIBILIDAD (SEO + GEO) ──
  const viFindings: Finding[] = [];
  let visibilidad = 0;
  const addV = (cond: boolean | 'warn', pts: number, title: string, detail?: string, term?: string) => {
    const ok = cond === 'warn' ? 'warn' : !!cond;
    if (ok === true) visibilidad += pts;
    else if (ok === 'warn') visibilidad += pts * 0.5;
    viFindings.push({ ok, title, detail, term });
  };
  if (html) {
    const m = html.meta;
    addV(!!m.title && m.titleLen >= 15 && m.titleLen <= 65, 14,
      m.title ? `Título: ${m.titleLen} caracteres` : 'Sin etiqueta <title>',
      m.title && (m.titleLen < 15 || m.titleLen > 65) ? 'Ideal 15–65 caracteres' : undefined, 'title');
    addV(!!m.description && m.descLen >= 50 && m.descLen <= 165, 12,
      m.description ? `Meta descripción: ${m.descLen} caracteres` : 'Sin meta descripción',
      m.description && (m.descLen < 50 || m.descLen > 165) ? 'Ideal 50–165 caracteres' : undefined, 'meta-desc');
    addV(m.h1.length === 1 ? true : m.h1.length === 0 ? false : 'warn', 10,
      `Encabezado H1: ${m.h1.length}`,
      m.h1.length !== 1 ? 'Debe haber exactamente un H1' : undefined, 'h1');
    addV(m.canonical, 8, m.canonical ? 'URL canónica definida' : 'Sin URL canónica', undefined, 'canonical');
    addV(m.og, 10, m.og ? 'Open Graph (previews en redes)' : 'Sin Open Graph', undefined, 'og');
    addV(m.schema.length > 0, 12,
      m.schema.length ? `Schema.org: ${m.schema.slice(0, 4).join(', ')}` : 'Sin datos estructurados (Schema.org)', undefined, 'schema');
    addV(m.sitemap, 8, m.sitemap ? 'sitemap.xml presente' : 'Sin sitemap.xml', undefined, 'sitemap');
    addV(m.robots, 6, m.robots ? 'robots.txt presente' : 'Sin robots.txt', undefined, 'robots');
    addV(m.viewport, 6, m.viewport ? 'Viewport móvil configurado' : 'Sin viewport (no responsive)', undefined, 'viewport');
    addV(!!m.lang, 4, m.lang ? `Idioma declarado: ${m.lang}` : 'Sin atributo lang', undefined, 'lang');
    // GEO / IA
    addV(m.llms, 10, m.llms ? 'llms.txt (visibilidad en IA) ✦' : 'Sin llms.txt — invisible para buscadores de IA',
      m.llms ? undefined : 'Frontera GEO: ChatGPT/Perplexity', 'llms');
    if (mobile?.seo != null)
      viFindings.push({ ok: mobile.seo >= 90, title: `SEO técnico (Lighthouse): ${mobile.seo}/100`, term: 'seo-lh' });
  } else {
    visibilidad = mobile?.seo ?? 40;
    viFindings.push({ ok: 'warn', title: 'No se pudo leer el HTML para el análisis SEO/GEO' });
  }
  visibilidad = clamp(visibilidad);

  // ── CONVERSIÓN ──
  const cFindings: Finding[] = [];
  let conversion = 0;
  const addC = (cond: boolean, pts: number, title: string, detail?: string, term?: string) => {
    if (cond) conversion += pts;
    cFindings.push({ ok: cond, title, detail, term });
  };
  if (html) {
    const c = html.conversion;
    addC(c.ctaButtons > 0, 22, c.ctaButtons ? `${c.ctaButtons} llamados a la acción (CTA)` : 'Sin CTA visibles', c.ctaButtons ? undefined : 'El visitante no sabe qué hacer', 'cta');
    addC(c.forms > 0, 18, c.forms ? `${c.forms} formulario(s) de captura` : 'Sin formularios de captura de leads', undefined, 'forms');
    addC(c.whatsapp, 16, c.whatsapp ? 'WhatsApp click-to-chat' : 'Sin WhatsApp directo', c.whatsapp ? undefined : 'Canal #1 en Costa Rica', 'whatsapp');
    addC(c.tel || c.mailto, 10, c.tel || c.mailto ? 'Contacto directo (teléfono/email)' : 'Sin contacto directo visible', undefined, 'contacto');
    addC(html.meta.h1.length >= 1, 12, html.meta.h1.length ? 'Propuesta de valor en H1' : 'Sin titular claro (H1)', undefined, 'h1-valor');
    addC(html.meta.viewport, 12, html.meta.viewport ? 'Experiencia móvil apta' : 'No optimizado para móvil', undefined, 'movil');
    const altOk = c.imgCount === 0 || c.imgNoAlt / c.imgCount < 0.3;
    addC(altOk, 10, altOk ? 'Imágenes con texto alternativo' : `${c.imgNoAlt}/${c.imgCount} imágenes sin alt`, undefined, 'alt');
  } else {
    conversion = 40;
    cFindings.push({ ok: 'warn' as const, title: 'No se pudo analizar la conversión' } as Finding);
  }
  conversion = clamp(conversion);

  // ── AUTOMATIZACIÓN / MEDICIÓN ──
  const aFindings: Finding[] = [];
  let automatizacion = 0;
  if (html) {
    const t = html.tracking;
    const addA = (cond: boolean, pts: number, title: string, term?: string) => {
      if (cond) automatizacion += pts;
      aFindings.push({ ok: cond, title, term });
    };
    addA(t.ga4 || t.gtm, 30, t.ga4 || t.gtm ? 'Google Analytics / Tag Manager' : 'Sin Google Analytics — vuelas a ciegas', 'ga');
    addA(t.metaPixel, 26, t.metaPixel ? 'Meta Pixel (retargeting)' : 'Sin Meta Pixel — no puedes reimpactar', 'meta-pixel');
    addA(t.tiktok, 8, t.tiktok ? 'TikTok Pixel' : 'Sin TikTok Pixel', 'tiktok');
    addA(t.hotjarClarity, 10, t.hotjarClarity ? 'Mapas de calor (Hotjar/Clarity)' : 'Sin análisis de comportamiento', 'heatmap');
    addA(html.conversion.whatsapp, 16, html.conversion.whatsapp ? 'Canal WhatsApp para automatizar' : 'Sin WhatsApp para flujos automáticos', 'wa-auto');
    addA(html.conversion.forms > 0, 10, html.conversion.forms ? 'Formulario conectable a CRM' : 'Sin formulario para alimentar un CRM', 'form-crm');
    if (!t.any)
      aFindings.unshift({ ok: false, title: 'No se detectó NINGUNA herramienta de medición', detail: 'No sabes de dónde vienen tus ventas', term: 'sin-medicion' });
  } else {
    automatizacion = 30;
    aFindings.push({ ok: 'warn', title: 'No se pudo analizar la medición' });
  }
  automatizacion = clamp(automatizacion);

  return [
    { key: 'velocidad', label: 'Velocidad', score: clamp(velocidad), findings: vFindings },
    { key: 'visibilidad', label: 'Visibilidad', score: visibilidad, findings: viFindings },
    { key: 'conversion', label: 'Conversión', score: conversion, findings: cFindings },
    { key: 'automatizacion', label: 'Automatización', score: automatizacion, findings: aFindings },
  ];
}

function gradeFor(n: number): string {
  if (n >= 90) return 'A+';
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 55) return 'C';
  if (n >= 40) return 'D';
  return 'E';
}

/** Punto de entrada: diagnostica una URL completa. */
export async function diagnose(rawUrl: string): Promise<Diagnosis> {
  const url = normalizeUrl(rawUrl);
  if (!url) throw new Error('URL inválida');

  const [mobile, desktop, html] = await Promise.all([
    runPsi(url, 'mobile'),
    runPsi(url, 'desktop'),
    analyzeHtml(url),
  ]);
  const screenshot = mobile?.screenshot ?? null;

  const pillars = buildPillars(mobile, html);
  // Índice Optimiza: promedio ponderado (velocidad 30, visibilidad 30, conversión 20, automatización 20)
  const weights: Record<Pillar['key'], number> = {
    velocidad: 0.3, visibilidad: 0.3, conversion: 0.2, automatizacion: 0.2,
  };
  const index = clamp(pillars.reduce((sum, p) => sum + p.score * weights[p.key], 0));

  const host = html?.host || new URL(url).host.replace(/^www\./, '');

  return {
    url,
    finalUrl: html?.finalUrl || url,
    host,
    fetchedAt: new Date().toISOString(),
    index,
    grade: gradeFor(index),
    pillars,
    speed: { mobile, desktop },
    meta:
      html?.meta ??
      ({ title: null, titleLen: 0, description: null, descLen: 0, h1: [], canonical: false, og: false, schema: [], hreflang: false, viewport: false, robots: false, sitemap: false, llms: false, favicon: false, lang: null } as Diagnosis['meta']),
    conversion:
      html?.conversion ??
      { forms: 0, whatsapp: false, tel: false, mailto: false, ctaButtons: 0, imgCount: 0, imgNoAlt: 0 },
    tracking:
      html?.tracking ??
      { ga4: false, gtm: false, metaPixel: false, tiktok: false, hotjarClarity: false, any: false },
    stack: html?.stack ?? null,
    screenshot: screenshot ? `data:image/jpeg;base64,${screenshot.replace(/^data:image\/[a-z]+;base64,/, '')}` : null,
    error: !mobile && !html ? 'No se pudo analizar el sitio' : undefined,
  };
}
