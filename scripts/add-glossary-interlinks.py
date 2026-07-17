#!/usr/bin/env python3
"""
Agregar interlinks a términos de glosario en todos los artículos de análisis.
Solo primera mención de cada término en la sección .prose
"""

import re
import os
from pathlib import Path

# Mapeo de términos a anchors del glosario
GLOSSARY_TERMS = {
    'Meta Pixel': 'pixel',
    'píxel': 'pixel',
    'Pixel': 'pixel',
    'retargeting': 'retargeting',
    'retargetar': 'retargeting',
    'conversión': 'conversion',
    'convierte': 'conversion',
    'convertir': 'conversion',
    'conversiones': 'conversion',
    'Conversión': 'conversion',
    'velocidad': 'velocidad',
    'Velocidad': 'velocidad',
    'Analytics': 'analitycs',
    'analytics': 'analitycs',
    'SEO': 'seo',
    'schema': 'schema',
    'Schema': 'schema',
    'Índice Optimiza': 'indice',
    'índice': 'indice',
    'automatización': 'automation',
    'automatiza': 'automation',
    'Automatización': 'automation',
    'CRM': 'crm',
    'e-commerce': 'ecommerce',
    'ecommerce': 'ecommerce',
    'carrito abandonado': 'carrito-abandonado',
    'lead': 'lead',
    'leads': 'lead',
    'Lead': 'lead',
    'Core Web Vitals': 'core-web-vitals',
    'tasa de conversión': 'tasa-conversion',
    'CPC': 'cpc',
    'ROAS': 'roas',
    'funnel': 'funnel',
    'Funnel': 'funnel',
    'bounce rate': 'bounce-rate',
    'landing page': 'landing-page',
}

def add_interlinks_to_file(filepath):
    """Agregar interlinks a un archivo Astro."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Encontrar la sección .prose
    prose_pattern = r'<div class="prose">(.*?)</div>\s*(?=</div>|<div class="art-cta"|<style>)'
    prose_match = re.search(prose_pattern, content, re.DOTALL)

    if not prose_match:
        print(f"  ⚠️  No .prose section found")
        return False

    prose_content = prose_match.group(1)
    prose_start = prose_match.start(1)

    # Rastrear términos ya linkedados para no repetir
    linked_terms = set()

    # Procesar cada término
    for term, anchor in sorted(GLOSSARY_TERMS.items(), key=lambda x: -len(x[0])):
        # Buscar el término en el contenido prose
        # Pattern: palabra completa, no dentro de un HTML tag existente
        pattern = r'\b' + re.escape(term) + r'\b(?!</a>)'

        matches = list(re.finditer(pattern, prose_content, re.IGNORECASE))

        if matches and anchor not in linked_terms:
            # Reemplazar solo la primera mención
            first_match = matches[0]
            start, end = first_match.span()

            # Crear el link
            link = f'<a href="/analisis/glosario-digital-empresas#{anchor}">{term}</a>'

            # Reemplazar en el contenido prose
            prose_content = prose_content[:start] + link + prose_content[end:]

            linked_terms.add(anchor)
            print(f"  ✓ Linked: {term} → #{anchor}")

    # Reemplazar la sección prose en el contenido original
    new_content = content[:prose_start] + prose_content + content[prose_match.end(1):]

    # Escribir el archivo actualizado
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True

def main():
    analisis_dir = Path('/Users/alonsoelizondo/optimiza-site/src/pages/analisis')

    # Procesar solo archivos estudio-
    estudio_files = sorted(analisis_dir.glob('estudio-*.astro'))

    print(f"📚 Procesando {len(estudio_files)} artículos...\n")

    for filepath in estudio_files:
        print(f"📄 {filepath.name}")
        add_interlinks_to_file(filepath)

    print(f"\n✅ Interlinks agregados a {len(estudio_files)} artículos")

if __name__ == '__main__':
    main()
