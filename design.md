# Design — Optimiza (optimizahq.com) · v2

Sistema de diseño bloqueado para este sitio. Toda edición visual lee este
archivo antes de emitir código. No se regenera por página — se extiende o
enmienda aquí cuando el sistema necesite crecer.

v2 (2026-08-02): muerte del look "terminal oscuro" (hero dark + verde ácido +
titular mono = cliché IA). Nace "el instrumento sobre el papel".

## Concepto

**"El instrumento sobre el papel."** El sitio es un informe técnico impreso en
papel claro. El ÚNICO objeto oscuro de cada página es el instrumento (el
escáner) — un dispositivo físico descansando sobre el papel. Esa relación
figura-fondo es la identidad: papel plano y tranquilo, instrumento denso y
con peso (única sombra real permitida del sitio).

## Genre

editorial-técnico (informe de laboratorio, no terminal de developer —
la audiencia son empresarios costarricenses 40+, no programadores)

## Macrostructure family

- Home (marketing): **Stat-Led asimétrico** — copy izquierda / instrumento derecha, regleta-ledger de datos reales debajo. Fondo papel, nunca oscuro.
- Servicios: **Long Document** — pilares numerados solo si genuinamente ordinales.
- Nosotros / Contacto: documento con sesgo lateral; ficha del fundador.
- /analisis: artículo-informe (TL;DR, fichas de dato, metodología, FAQ).

## Theme — "Instrumento" v2 (papel primero)

- `--bg`       #F1F0E9 (papel técnico tibio)
- `--surface`  #FAF9F3
- `--text`     #191A17 · `--muted` #4C4F49 · `--faint` #64675F (AA sobre bg)
- `--crit`     #963A1D (óxido — señal crítico/atención)
- `--ok`       #1E5A3F (verde tinta — señal bien)
- Instrumento (solo dentro del escáner): fondo #14161A, tokens dark propios.
- Alias legacy: `--violet`→óxido, `--lime`→verde. No introducir colores nuevos.

Reglas de color:
1. Óxido/verde marcan **datos**, nunca decoración. ≤5% del viewport
   (excepción única: las ondas de la portada, abajo).
2. **La portada entintada** (v2.1, dirección de arte de Alonso sobre el
   modelo SpeedCurve): el hero de la HOME es la única sección inmersiva —
   campo profundo de verde tinta (#16241D→#0C1410) con papel milimetrado
   al 3% y ondas de calibración en capas (verde/óxido/papel translúcidos),
   clase `dark portada`. Metáfora: los informes tienen portada entintada
   y páginas de papel. El resto del sitio sigue la regla original: dark
   solo dentro de `.scanner`. Prohibido extender la portada a más
   secciones o volver al near-black + verde neón.

## Typography

- Display: **Archivo Variable, wdth 120–125, wght 750–800** — expandida,
  técnica, con carácter. Roman siempre (sin itálicas en headings).
- Body: **Archivo Variable, wdth 100, wght 400–600** (17px, alta legibilidad 40+).
- Datos: **IBM Plex Mono 400/600** — cifras, labels de instrumento, kickers.
  Nunca para titulares ni párrafos.
- H1 ≤ una oración. H1 40–60px, H2 26–36px.
- Inter y Space Mono quedan PROHIBIDAS (par por defecto de sitio generado).

## Firma visual — la hoja viva

Tres dispositivos convierten los heroes en escena (lección de SpeedCurve:
mostrar el producto vivo), sin copiar su atmósfera azul:

1. **La hoja técnica** (`SheetMarks.astro`): esquinas de registro + rótulo
   mono ("Optimiza · Hoja 0X · …") en cada hero. El hero es una lámina.
2. **La cinta de registro** (`RegistroCinta.astro`): teletipo al TOPE del
   hero (home bajo el nav; /analisis al pie) que desfila lecturas REALES
   anonimizadas de los 346 sitios medidos. Datos reales en movimiento —
   nunca actividad simulada. Pausa on-hover; estática con reduced-motion.
3. **Las ondas de calibración**: capas orgánicas translúcidas al pie de la
   portada (verde #2E7A55, óxido, papel) — nuestras "curvas". Solo portada.
4. **El instrumento llega encendido**: el escáner precarga la lectura real
   de optimizahq.com (constante SELF en Scanner.astro, fechada).

## Firma visual — la regleta calibrada

Toda estadística clave (porcentaje o puntaje 0–100) se muestra sobre una
**regla calibrada**: baseline con ticks cada 10%, ticks mayores en 0/50/100,
aguja de 2px en el valor, en color señal. Componente global `.regla`
(global.css) con `--val` y `--sig`. La aguja anima desde 0 al cargar
(@starting-style; respeta reduced-motion). Conteos y dinero NO llevan regla
(no son posiciones en una escala) — van como cifra mono simple.
Las tarjetas-estadística oscuras (fondo #101214) quedan prohibidas: los datos
van en **fichas claras** (`.stat` global: superficie papel, filete izquierdo
en color señal) o sobre regletas.

## Spacing

Escala 4pt. `--radius-sm 6 / -md 10 / -lg 14`. Bordes hairline `--line`.
Sombra: plano total, salvo la única sombra física del instrumento
(`--instrument-shadow`).

## Motion

- Sin reveals on-scroll. El contenido simplemente está.
- Animación solo en dato en movimiento: aguja de regleta, gauge y barras del
  escáner. `prefers-reduced-motion` respetado siempre.

## Microinteractions

- Éxito silencioso; toasts solo para fallos.
- Hover: una sola señal por elemento.

## CTA voice

- Primario: fondo tinta, radio 6px, label específico ("Analizar mi web").
- Secundario: ghost con borde hairline.

## Patrones aprobados (aún no activos)

- **Cita con dato resaltado** (estudiado de SpeedCurve): cuando existan
  testimonios REALES con métrica verificable, la frase del dato lleva
  marcador (fondo señal suave), foto real, nombre y empresa verificable.
  Prohibido activarlo con testimonios inventados o sin métrica.

## Copy — honestidad no negociable

- Cero métricas inventadas. Paneles ilustrativos etiquetados como tales.
- Datos reales permitidos: Índice Optimiza (346 sitios, 66%, $82M) con fuente.
- Comillas tipográficas, `…`, `—`. Español de Costa Rica, tuteo.

## Prohibido (anti-patterns bloqueados)

- Secciones/bandas de marketing con fondo oscuro (cliché IA #1 de 2026).
- Titulares en monospace. Inter. Space Mono.
- Tarjetas-estadística oscuras con número verde en grid.
- Chrome redibujado (puntos macOS, marcos de browser falsos).
- Iconos-en-círculo/cuadro decorativos; grid de 3 tarjetas icono-arriba.
- Glow radial, gradiente morado, blanco/negro puros, serif editorial.
- Reveal-on-scroll universal; `transition: all`; itálicas en headings.
- Eyebrows decorativos — máx. 1 por página y solo si es cita de dato real.

## What pages MUST share

Wordmark, tokens completos, Archivo + IBM Plex Mono, voz de CTA, regleta como
lenguaje de dato, fichas claras, footer colofón, nav membrete.

## What pages MAY differ on

Macroestructura dentro de su familia; densidad tipográfica en /analisis.
