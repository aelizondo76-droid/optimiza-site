# Motor del Scanner Optimiza

Diagnóstico real de la web de un lead en los **4 pilares** (Velocidad, Visibilidad,
Conversión, Automatización) → **Índice Optimiza (0–100)** → informe en página con
URL única + captura del lead.

## Cómo funciona (flujo)

```
Home (Scanner)  →  POST /api/scan { url }
                     ├─ rate-limit por IP (8/hora)
                     ├─ diagnose(url): PageSpeed API (móvil+escritorio) + fetch/parse HTML
                     └─ guarda informe en Redis → devuelve puntaje + 2 hallazgos (resto bloqueado)
Email (gate)    →  POST /api/lead { reportId, email }
                     ├─ valida (rechaza correos desechables) + dedup email+dominio
                     ├─ guarda lead + temperatura + envía email (Resend)
                     └─ devuelve enlace al informe: /reporte/<id>
Calificadores   →  POST /api/lead { reportId, email, name, goal, ads }  (afina temperatura)
Informe         →  GET /reporte/<id>  (página con URL única, noindex)
```

## Archivos

| Archivo | Rol |
|---|---|
| `src/lib/diagnose.ts` | Motor: PageSpeed + parse HTML → 4 pilares e Índice Optimiza |
| `src/lib/store.ts` | Redis (Upstash) para informes, rate-limit y leads. Fallback en memoria en dev |
| `src/lib/email.ts` | Envío del informe con Resend |
| `src/lib/validate.ts` | Correos desechables + scoring de temperatura del lead |
| `src/pages/api/scan.ts` | Endpoint de análisis |
| `src/pages/api/lead.ts` | Endpoint de captura de lead |
| `src/pages/reporte/[id].astro` | Página de informe con URL única |
| `src/components/Scanner.astro` | Front-end conectado al API real |

## Variables de entorno

Ver `.env.example`. Resumen de prioridad:

1. **`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`** — **requerido en producción**
   (sin esto, el informe no persiste entre invocaciones serverless y `/reporte/<id>` da 404).
2. **`PAGESPEED_API_KEY`** — para los números reales de velocidad (sin él, los otros 3 pilares
   funcionan pero Velocidad queda "no medible").
3. **`RESEND_API_KEY` + `SCAN_FROM_EMAIL`** — para enviar el email (sin él, el lead igual se captura
   y el enlace al informe aparece en pantalla, pero no se manda correo).

En Vercel: **Project → Settings → Environment Variables**. Redeploy tras agregarlas.

## Anti-abuso incluido

- **Rate-limit por IP** (8 escaneos/hora, 20 leads/hora).
- **Dedup por email+dominio** (no duplica leads; incrementa `scans`).
- **Bloqueo de correos desechables** (mailinator, tempmail, etc.).
- **Validación de URL** (normaliza y descarta entradas inválidas).
- **Temperatura del lead** (0–100) por intención comercial + presupuesto + oportunidad.

## Local

`npm run dev` — funciona sin claves usando un almacén en memoria (no persiste entre
reinicios). Para velocidad real en local, exporta `PAGESPEED_API_KEY`.
