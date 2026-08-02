# Design — Optimiza (optimizahq.com)

Sistema de diseño bloqueado para este sitio. Toda edición visual lee este
archivo antes de emitir código. No se regenera por página — se extiende o
enmienda aquí cuando el sistema necesite crecer.

## Concepto

**"Instrumento de diagnóstico."** El sitio se lee como el informe técnico que
Optimiza vende: tinta sobre papel, monoespaciada para datos, color solo como
señal de dato (crítico/atención/bien), nunca como decoración de marca.

## Genre

editorial-técnico (editorial con voz de reporte/instrumento)

## Macrostructure family

- Home (marketing): **Stat-Led asimétrico** — copy izquierda / instrumento (escáner) derecha, ledger de datos reales debajo.
- Servicios (marketing): **Long Document** — pilares numerados (Pilar 01–04, genuinamente ordinales), paneles de datos con etiqueta "escenario ilustrativo".
- Nosotros / Contacto: documento con sesgo lateral; tarjeta del fundador como ficha.
- /analisis (contenido): artículo-informe (TL;DR, stats, metodología, FAQ).

## Theme — custom "Instrumento"

- `--bg`       #F1F1EC (papel tibio) · dark #101214
- `--surface`  #FAFAF6 (nunca blanco puro) · dark #17191C
- `--text`     #15171A · dark #ECEDE9
- `--muted`    #4E525A · dark #A2A6AC
- `--faint`    #63676E (AA 5:1 sobre bg) · dark #82868D
- `--violet`   #963A1D (óxido — señal crítico/atención) · dark #C97A54
- `--lime`     #1E5A3F (verde tinta — señal bien) · dark #4E9C7A
- `--cyan-ink` #1F4A3E · dark #4E9C8C

Regla de acento: el óxido/verde marcan **datos**, no decoración. ≤5% del viewport.

## Typography

- Display: Inter Variable, weight 800, roman siempre (sin itálicas en headings)
- Body: Inter Variable, weight 400–600
- Mono: Space Mono — datos, cifras, labels de instrumento, H1 de home
- H1 ≤ una oración; escala contenida: H1 34–44px, H2 26–38px (la home no supera al resto del sitio)

## Spacing

Escala 4pt. `--radius-sm 6 / -md 10 / -lg 14`. Bordes hairline `--line`, sombra máxima `--card-shadow` (1px).

## Motion

- Easings nombrados, sin bounce. `prefers-reduced-motion` respetado.
- **Sin reveals on-scroll.** El contenido simplemente está. Animación solo en el instrumento (gauge, barras, progreso del escaneo) — es dato en movimiento, no decoración.
- Focus rings instantáneos, `box-shadow` 3px en inputs.

## Microinteractions stance

- Éxito silencioso; toasts solo para fallos.
- Hover: una sola señal por elemento (fondo O flecha, no ambos + lift + sombra).

## CTA voice

- Primario: fondo tinta (`--vbtn-bg`), radio 6px, label específico ("Analizar mi web", "Recibir diagnóstico" — nunca "Continuar").
- Secundario: ghost con borde hairline.

## Copy — honestidad no negociable

- Cero métricas inventadas. La firma es nueva y lo dice: los paneles de resultados se etiquetan "escenario ilustrativo" y los resultados se formulan como "el estándar que perseguimos", nunca "resultado típico".
- Datos reales permitidos: los del Índice Optimiza (386 sitios, 88%, $122M) con fuente citada.
- Comillas tipográficas, `…`, `—`. Español de Costa Rica, tuteo.

## Prohibido (anti-patterns bloqueados)

- Chrome redibujado (puntos de ventana macOS, marcos de browser falsos).
- Eyebrows decorativos — máx. 1 por página y solo si es cita de dato/ordinal real.
- Grid de 3 tarjetas icono-arriba iguales; icono-en-cuadro-de-color.
- Glow radial, gradiente morado, blanco/negro puros, serif editorial (era el sistema viejo).
- Reveal-on-scroll universal; `transition: all`; itálicas en headings.

## What pages MUST share

Wordmark, tokens completos, Inter+Space Mono, voz de CTA, ritmo de reglas hairline, footer Ft5 statement, nav membrete.

## What pages MAY differ on

Macroestructura dentro de su familia; paneles de datos propios de cada página; densidad tipográfica en /analisis.
