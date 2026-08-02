# Pendientes — optimizahq.com

_Última revisión: 2026-08-01. Ordenado por prioridad. Marcar con `[x]` conforme se resuelva cada punto._

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

- [ ] **Re-validar los estudios publicados con el motor v2 del escáner.** Las cifras en producción ("88% sin píxel", "94% sin píxel" del sector salud, etc.) se midieron con el motor viejo, que solo leía HTML estático — sitios que inyectan píxeles vía Google Tag Manager pudieron contarse como "sin píxel" sin serlo. El motor v2 (2026-08-01) detecta en 3 capas (HTML + contenedor GTM + red real de Lighthouse). Re-correr `scripts/estudio.ts` sobre los `scripts/urls-*.txt` existentes y actualizar las cifras publicadas si cambian — la honestidad de los datos es la tesis central del negocio.

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
