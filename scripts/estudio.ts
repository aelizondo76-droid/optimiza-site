/**
 * Estudio en lote — corre el motor Optimiza (diagnose) sobre una lista de URLs
 * SIN pasar por /api/scan, así que NO hay rate-limit ni se crean leads.
 *
 * Uso:
 *   npx tsx scripts/estudio.ts scripts/urls.txt
 *   npx tsx scripts/estudio.ts https://clinica1.com https://clinica2.com
 *
 * Requiere (opcional pero recomendado) PAGESPEED_API_KEY en .env — sin ella
 * Google limita los llamados anónimos de PageSpeed.
 *
 * Salidas (en scripts/out/):
 *   estudio.csv   — una fila por sitio (índice + 4 pilares + datos clave)
 *   estudio.json  — diagnóstico completo de cada sitio
 * Y al final imprime las estadísticas agregadas para el estudio.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import process from 'node:process';
import { diagnose, type Diagnosis } from '../src/lib/diagnose';

// Carga .env local (Node 21.7+/24) para tomar PAGESPEED_API_KEY.
try {
  process.loadEnvFile('.env');
} catch {
  /* sin .env: corre en modo anónimo (PageSpeed limitado) */
}

const CONCURRENCY = 3; // sitios en paralelo (PageSpeed es lento; no subir mucho)

// ── 1. Reunir las URLs (de un archivo .txt o de los argumentos) ──
function collectUrls(): string[] {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Pasá un archivo .txt (una URL por línea) o URLs sueltas.');
    process.exit(1);
  }
  const urls: string[] = [];
  for (const a of args) {
    if (a.endsWith('.txt')) {
      const lines = readFileSync(a, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
      urls.push(...lines);
    } else {
      urls.push(a.trim());
    }
  }
  // dedup preservando orden
  return [...new Set(urls)];
}

// ── 2. Correr diagnose() con concurrencia limitada ──
async function run() {
  const urls = collectUrls();
  const txtArg = process.argv.slice(2).find((a) => a.endsWith('.txt'));
  const outName = txtArg ? basename(txtArg).replace(/\.txt$/, '') : 'estudio';
  const key = process.env.PAGESPEED_API_KEY;
  console.log(`\n🔍 Estudio Optimiza — ${urls.length} sitios`);
  console.log(`   PageSpeed key: ${key ? 'sí ✅' : 'NO (modo anónimo, más lento)'}\n`);

  const results: (Diagnosis | { url: string; failed: string })[] = [];
  let done = 0;

  async function worker(queue: string[]) {
    while (queue.length) {
      const url = queue.shift()!;
      try {
        const d = await diagnose(url);
        results.push(d);
        console.log(
          `  [${++done}/${urls.length}] ${d.host.padEnd(32)} ${String(d.index).padStart(3)}/100 (${d.grade})`
        );
      } catch (e: any) {
        results.push({ url, failed: e?.message || 'error' });
        console.log(`  [${++done}/${urls.length}] ${url.padEnd(32)}  ✗ ${e?.message || 'error'}`);
      }
    }
  }

  const queue = [...urls];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  // ── 3. Escribir salidas ──
  mkdirSync('scripts/out', { recursive: true });
  writeFileSync(`scripts/out/${outName}.json`, JSON.stringify(results, null, 2));

  const ok = results.filter((r): r is Diagnosis => 'index' in r);
  const pillar = (d: Diagnosis, k: string) =>
    d.pillars.find((p) => p.key === k)?.score ?? '';
  const header =
    'host,indice,grado,velocidad,visibilidad,conversion,automatizacion,stack,whatsapp,analytics,meta_pixel,lcp_movil';
  const rows = ok.map((d) =>
    [
      d.host,
      d.index,
      d.grade,
      pillar(d, 'velocidad'),
      pillar(d, 'visibilidad'),
      pillar(d, 'conversion'),
      pillar(d, 'automatizacion'),
      d.stack ?? '',
      d.conversion.whatsapp ? 'sí' : 'no',
      d.tracking.any ? 'sí' : 'no',
      d.tracking.metaPixel ? 'sí' : 'no',
      d.speed.mobile?.lcp ?? '',
    ].join(',')
  );
  writeFileSync(`scripts/out/${outName}.csv`, [header, ...rows].join('\n'));

  // ── 4. Estadísticas agregadas (los titulares del estudio) ──
  const n = ok.length;
  const avg = (f: (d: Diagnosis) => number) =>
    n ? Math.round(ok.reduce((s, d) => s + f(d), 0) / n) : 0;
  const pct = (f: (d: Diagnosis) => boolean) =>
    n ? Math.round((ok.filter(f).length / n) * 100) : 0;

  console.log('\n────────── ESTUDIO (agregado) ──────────');
  console.log(`Sitios analizados: ${n}/${urls.length}`);
  console.log(`Índice Optimiza promedio:  ${avg((d) => d.index)}/100`);
  console.log(`  Velocidad:      ${avg((d) => d.pillars.find((p) => p.key === 'velocidad')!.score)}`);
  console.log(`  Visibilidad:    ${avg((d) => d.pillars.find((p) => p.key === 'visibilidad')!.score)}`);
  console.log(`  Conversión:     ${avg((d) => d.pillars.find((p) => p.key === 'conversion')!.score)}`);
  console.log(`  Automatización: ${avg((d) => d.pillars.find((p) => p.key === 'automatizacion')!.score)}`);
  console.log(`% que reprueba velocidad (<50 móvil): ${pct((d) => (d.speed.mobile?.performance ?? 0) < 50)}%`);
  console.log(`% sin Google Analytics:               ${pct((d) => !d.tracking.any)}%`);
  console.log(`% sin Meta Pixel:                     ${pct((d) => !d.tracking.metaPixel)}%`);
  console.log(`% sin WhatsApp directo:               ${pct((d) => !d.conversion.whatsapp)}%`);
  console.log(`% sin datos estructurados (Schema):   ${pct((d) => d.meta.schema.length === 0)}%`);
  console.log('─────────────────────────────────────────');
  console.log(`\n📄 scripts/out/${outName}.csv  y  scripts/out/${outName}.json\n`);
}

run();
