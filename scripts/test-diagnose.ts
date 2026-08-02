process.loadEnvFile('.env');
import { diagnose } from '../src/lib/diagnose';

async function main() {
  const d = await diagnose(process.argv[2] || 'guru-viajes.com');
  console.log(JSON.stringify({
    host: d.host,
    index: d.index,
    sitemap: d.meta.sitemap,
    tracking: d.tracking,
    convFindings: d.pillars.find(p => p.key === 'conversion')?.findings.filter(f => /formulari|captura|widget/i.test(f.title)).map(f => `${f.ok === true ? 'OK' : 'FAIL'} ${f.title}`),
    autoFindings: d.pillars.find(p => p.key === 'automatizacion')?.findings.map(f => `${f.ok === true ? 'OK' : f.ok === 'warn' ? 'WARN' : 'FAIL'} ${f.title}`),
    visFindings: d.pillars.find(p => p.key === 'visibilidad')?.findings.filter(f => /itemap|robots/i.test(f.title)).map(f => `${f.ok === true ? 'OK' : 'FAIL'} ${f.title}`),
  }, null, 2));
}
main();
// (la salida de conversión se añadió después: ver commit del motor v2.1)
