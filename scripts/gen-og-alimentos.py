#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import textwrap

OUTPUT_DIR = '/Users/alonsoelizondo/optimiza-site/public/og'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_og_image(title, subtitle, indice, filename, size='1200x630'):
    if size == '1200x630':
        w, h = 1200, 630
        bg_main = (11, 10, 18)
        color_violet = (167, 139, 250)
        color_lime = (199, 249, 75)
        color_muted = (201, 199, 219)
        border_w = 20
        title_size = 52
        subtitle_size = 24
    else:  # 1080x1350
        w, h = 1080, 1350
        bg_main = (11, 10, 18)
        color_violet = (167, 139, 250)
        color_lime = (199, 249, 75)
        color_muted = (201, 199, 219)
        border_w = 18
        title_size = 56
        subtitle_size = 24

    img = Image.new('RGB', (w, h), bg_main)
    draw = ImageDraw.Draw(img)

    # Border
    draw.rectangle(
        [(border_w, border_w), (w - border_w, h - border_w)],
        outline=color_violet,
        width=3
    )

    # Gradient overlay
    grad = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(grad)
    for i in range(h):
        alpha = int((i / h) * 60)
        grad_draw.line(
            [(0, i), (w, i)],
            fill=(167, 139, 250, alpha)
        )
    img = Image.alpha_composite(img.convert('RGBA'), grad).convert('RGB')
    draw = ImageDraw.Draw(img)

    # Logo label (top-right)
    logo_label = 'OPTIMIZA'
    logo_size = 18
    try:
        logo_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Semibold.otf', logo_size)
    except:
        logo_font = ImageFont.load_default()
    draw.text((w - 220, 40), logo_label, fill=color_lime, font=logo_font)

    # Title
    title_lines = textwrap.wrap(title, width=20 if size == '1200x630' else 18)
    try:
        title_font = ImageFont.truetype('/System/Library/Fonts/SFProDisplay-Semibold.otf', title_size)
    except:
        title_font = ImageFont.load_default()

    title_y = 120 if size == '1200x630' else 200
    for line in title_lines:
        draw.text((60, title_y), line, fill=(255, 255, 255), font=title_font)
        title_y += title_size + 12

    # Índice box
    if indice:
        box_w, box_h = 140, 140 if size == '1200x630' else 160
        box_x = w - 60 - box_w
        box_y = 80
        draw.rectangle(
            [(box_x, box_y), (box_x + box_w, box_y + box_h)],
            outline=color_lime,
            width=2
        )
        try:
            indice_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Bold.otf', 64 if size == '1200x630' else 72)
        except:
            indice_font = ImageFont.load_default()
        indice_text = f'{indice}'
        draw.text((box_x + 25, box_y + 25), indice_text, fill=color_lime, font=indice_font)
        try:
            small_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Regular.otf', 16)
        except:
            small_font = ImageFont.load_default()
        draw.text((box_x + 35, box_y + 95), '/100', fill=color_muted, font=small_font)

    # Subtitle
    subtitle_lines = textwrap.wrap(subtitle, width=25 if size == '1200x630' else 22)
    try:
        subtitle_font = ImageFont.truetype('/System/Library/Fonts/SFProText-Regular.otf', subtitle_size)
    except:
        subtitle_font = ImageFont.load_default()

    subtitle_y = h - 160 if size == '1200x630' else h - 300
    for line in subtitle_lines:
        draw.text((60, subtitle_y), line, fill=color_muted, font=subtitle_font)
        subtitle_y += subtitle_size + 10

    # Bottom label
    try:
        label_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Regular.otf', 13)
    except:
        label_font = ImageFont.load_default()
    draw.text((60, h - 40), 'Estudio diagnóstico de webs 2026', fill=color_muted, font=label_font)

    img.save(f'{OUTPUT_DIR}/{filename}')
    print(f'✓ {filename}')

# Crear las 6 imágenes
datos = [
    ('Restaurantes: 41/100', '12 sitios. 100% sin píxel, 100% reprueba velocidad. Como restaurante sin certificado de higiene.', 41, 'estudio-restaurantes'),
    ('Cafeterías: 52/100', '10 espresotecas. 100% sin píxel, 90% lento. Fotos bonitas, sitios lentos.', 52, 'estudio-cafeterias'),
    ('Panaderías: 55/100', '8 panaderías. 88% sin píxel. Pan excelente, venta ciega.', 55, 'estudio-panaderias'),
    ('Heladerías: 53/100', '8 heladerías. 88% sin píxel, 50% sin Product schema. Gelato perfecto, analytics ciego.', 53, 'estudio-heladerias'),
    ('Bares: 50/100', '5 discotecas. 100% sin píxel, 100% sin Event schema. Eventos invisibles.', 50, 'estudio-bares'),
    ('Alimentos y Bebidas', '43 negocios: 95% sin píxel, 67% sin analytics. Sector ciego.', 50, 'estudio-alimentos-bebidas'),
]

for title, subtitle, indice, filename in datos:
    create_og_image(title, subtitle, indice, f'{filename}.png', '1200x630')
    create_og_image(title, subtitle, indice, f'{filename}-sq.png', '1080x1350')

print('\n✨ OG images generadas en public/og/')
