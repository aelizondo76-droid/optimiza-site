# Pendientes — optimizahq.com

_Última revisión: 2026-08-21. Ordenado por prioridad. Marcar con `[x]` conforme se resuelva cada punto._

---

## 🔴 Bloqueante

- [x] **Hacer `git push` a producción.** ✅ 2026-08-01: 6 commits desplegados (rediseño completo, accesibilidad, tipografía, copy, SEO, pase premium Hallmark). Verificado contra el HTML en vivo de optimizahq.com.

---

## 🟡 Trabajo sin terminar de otra sesión

- [ ] **Commitear el checkbox de consentimiento + página de privacidad.** `src/pages/legal/privacidad.astro` (nueva) y el cambio en `astro.config.mjs` (entrada en el mapa de lastmod del sitemap) están escritos pero nunca se commitearon. No se tocaron durante el rediseño.
- [ ] **Resolver la rama `seo/schema-gaps`.** Muy divergida de `main` (predata todo el rediseño de esta sesión — tocaría casi cada archivo si se mergea tal cual). Decidir si rescatar algo puntual o descartarla.

---

## 🟢 Rendimiento

- [ ] **Revisar el LCP móvil bimodal** (abierto desde 2026-07-18). Con GA4/Clarity diferidos vía `requestIdleCallback`, las corridas de Lighthouse quedaron inconsistentes (1500ms/100 vs 4950ms/80 con el mismo timing de scripts). Se dejó pendiente a propósito hasta tener tráfico real — revisar datos de campo (CrUX) en PageSpeed Insights ahora que el sitio lleva más tiempo en producción.

---

## 🟠 Integridad de datos publicados

- [ ] 🔴 **Corregir el detector de WhatsApp del escáner.** `src/lib/diagnose.ts:448` solo busca `wa.me`, `api.whatsapp.com` y `whatsapp://`. **No detecta `wa.link` (el acortador oficial de WhatsApp) ni el plugin Joinchat** (`creame-whatsapp-me`, muy común en WordPress de Costa Rica). Falso negativo **confirmado con evidencia** en secretocaribe.com: 7 enlaces `wa.link` + Joinchat, y el escáner marcó «Sin WhatsApp directo» — **16 puntos de Conversión descontados de más**. Consecuencias: (a) todo Índice ya entregado a un cliente con este patrón está subestimado; (b) las cifras de «sin WhatsApp» de los estudios publicados en `/analisis` están infladas; (c) **bloquea publicar cualquier cifra de antes/después** en un caso de éxito. Al corregir, re-correr los estudios y revisar los diagnósticos entregados.
- [ ] **Re-validar los estudios publicados con el motor v2 del escáner.** Las cifras en producción ("88% sin píxel", "94% sin píxel" del sector salud, etc.) se midieron con el motor viejo, que solo leía HTML estático — sitios que inyectan píxeles vía Google Tag Manager pudieron contarse como "sin píxel" sin serlo. El motor v2 (2026-08-01) detecta en 3 capas (HTML + contenedor GTM + red real de Lighthouse). Re-correr `scripts/estudio.ts` sobre los `scripts/urls-*.txt` existentes y actualizar las cifras publicadas si cambian — la honestidad de los datos es la tesis central del negocio.

## 🏆 Casos de éxito (no existe nada publicado)

El sitio tiene 24+ estudios de sector en `/analisis` pero **cero resultados de clientes
propios**. Una firma cuya tesis es el dato honesto no publica ni un caso. Es el vacío más
grande del sitio para convertir un prospecto que ya entendió el diagnóstico.

- [ ] **Crear la sección de casos** (`/casos` + `/casos/[slug]`). Decidir la plantilla: antes/después por las 4 palancas, con la misma disciplina de dato medido que `/analisis`. Reusar el sistema visual de `design.md`.
- [ ] **Caso 1 — Secreto Caribe** (agroindustria de coco, B2B, Limón). Registro completo con antes/después ya medido y evidencia archivada en `~/Desktop/Optimiza/Clientes/SecretoCaribe/CASO-antes-despues.md` + `Evidencia-antes/`. **Bloqueado por 4 cosas:** (1) las seis fotografías del cliente; (2) el fallo del detector de WhatsApp de arriba — sin eso el «antes» de 56/C está mal medido y publicarlo infla la mejora; (3) publicar en secretocaribe.com y medir el Índice después; (4) autorización escrita de Michael Brown para usar el nombre. Sin resultado de negocio (consultas recibidas) es un caso técnico y convence mucho menos.
- [ ] **Candidatos siguientes:** Great Home CR, Elizondo Dental, HonguiTicos, Biotopika. Ninguno tiene todavía antes/después medido con evidencia archivada — **capturar el «antes» ANTES de tocar cada sitio**, que es irrecuperable después (en Secreto Caribe casi se pierde).

---

## 📋 Negocio / contenido (motor de `/analisis`)

- [ ] **Definir y ejecutar el próximo nicho de estudio.** Motor actual: salud (104 sitios) + construcción (90) + e-commerce (109) = **303 de los ≥500** que pediste como meta. Faltan ~200, nicho sin definir.
- [ ] **Publicar posts de LinkedIn pendientes:** estética, médicos, construcción (dental y la tesis transversal de salud ya están redactados).
- [ ] **Preparar informes individuales para outreach con permiso** (email corporativo, bajo volumen, respetando Ley 8968/PRODHAB) — no iniciado.
- [ ] *(Opcional, sin urgencia)* **Poblar el singleton de SEO en Keystatic.** Existe en el CMS pero está vacío — todo el `<title>`/meta corre hoy por el fallback en código. Solo hace falta si algún día quieres editar SEO sin tocar código.

---

## ✅ Resuelto (verificado contra el código actual)

- [x] **Nicho 3 — tiendas en línea (e-commerce).** La nota de lanzamiento (15 días) lo marcaba como pendiente; ya está publicado completo: 109 tiendas, 6 sub-nichos (moda, belleza, hogar, electrónica, alimentos, mascotas), todo enlazado desde `/analisis/`.
- [x] Rediseño visual completo del sistema (tokens, Nav, Footer, Scanner, home, servicios, nosotros, contacto + 24 páginas de `/analisis`).
- [x] Correcciones de accesibilidad (contraste WCAG, trampa de foco del menú móvil, ARIA, formularios, skip-link).
- [x] Ajuste de escala tipográfica (home desproporcionada vs. el resto del sitio).
- [x] Copy del statement del statband (menos velocidad, más visibilidad/automatización) y H1 del hero dividido en dos niveles + mejoras de SEO on-page.
- [x] Pase premium anti-genérico (Hallmark audit + redesign): métricas honestas en servicios, hero asimétrico, índice de pilares tipo informe, sin eyebrows decorativos ni reveals, sistema bloqueado en `design.md`.
