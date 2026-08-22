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
2. **Las portadas de ACUARELA** (v2.3, dirección de arte de Alonso,
   confirmada sobre la opción D): cada hero lleva una acuarela DISTINTA
   de la misma familia como fondo (`public/hero/acuarela-*.webp`,
   generadas con el skill banana/Gemini): lavados suaves de salvia,
   verde mar y terracota sobre papel, con líneas de contorno de
   cartógrafo. Home=equilibrada · Servicios=corriente verde ·
   Nosotros=terracota cálida · Contacto=bruma mínima ·
   /analisis=cartográfica con bloom terracota. Los lavados viven en el
   TERCIO INFERIOR; el texto siempre sobre papel limpio. Regenerar
   nuevas piezas con el mismo prompt-base (misma línea, pieza nueva).
   RECHAZADOS: portada oscura ("oscuro y triste"), ondas SVG planas a
   mano ("diseño de los 80s"), listones vectoriales rígidos
   ("acartonado"). El porqué de los colores: verde=bien y óxido=crítico
   son las señales del Índice — la acuarela es el lenguaje del
   instrumento diluido en agua. Dark solo dentro de `.scanner`.

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
3. **Ilustraciones generadas** (skill banana): diagramas y artwork se
   generan como piezas editoriales (ej. diagrama CRM de servicios:
   listones de seda + CRM como dispositivo), nunca SVG de cajitas a
   mano. Texto de diagramas: verificar erratas SIEMPRE antes de usar.
4. **El instrumento llega encendido**: el escáner precarga la lectura real
   de optimizahq.com (constante SELF en Scanner.astro, fechada).

## Paleta editorial extendida (v2.4)

Para ilustraciones y paneles editoriales (NUNCA para señales de dato):
azul #8FA7BC · ocre #E3C68C · terracota #C87B5F · salvia #AEC3A9 ·
gris #BDB8B1, con sus tintes wash (--wash-*) como fondos de panel.
Regla de armonía: máximo 2 tintes wash visibles por viewport; las
señales de dato siguen siendo exclusivamente crit/ok.

## El footer — tinta, no acuarela

El footer NO repite la acuarela del hero (SpeedCurve clona sus formas en
el footer; decisión nuestra: variante, no clon). Su pieza es un trazo
sumi-e de tinta china monocroma con un sello terracota
(`/ilustraciones/trazo-footer.webp`) — misma familia manual, cero
repetición de color, y remata el concepto "quién firma el informe".

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
