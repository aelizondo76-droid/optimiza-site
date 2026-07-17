#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import textwrap

OUTPUT_DIR = '/Users/alonsoelizondo/optimiza-site/public/og'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_og_image(title, subtitle, stat, filename, size='1200x630'):
    if size == '1200x630':
        w, h = 1200, 630
        bg_main = (11, 10, 18)
        color_violet = (167, 139, 250)
        color_lime = (199, 249, 75)
        color_muted = (201, 199, 219)
        border_w = 20
        title_size = 48
        subtitle_size = 20
    else:  # 1080x1350
        w, h = 1080, 1350
        bg_main = (11, 10, 18)
        color_violet = (167, 139, 250)
        color_lime = (199, 249, 75)
        color_muted = (201, 199, 219)
        border_w = 18
        title_size = 52
        subtitle_size = 22

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
    title_lines = textwrap.wrap(title, width=16 if size == '1200x630' else 15)
    try:
        title_font = ImageFont.truetype('/System/Library/Fonts/SFProDisplay-Semibold.otf', title_size)
    except:
        title_font = ImageFont.load_default()

    title_y = 120 if size == '1200x630' else 200
    for line in title_lines:
        draw.text((60, title_y), line, fill=(255, 255, 255), font=title_font)
        title_y += title_size + 12

    # Stat box
    if stat:
        box_w, box_h = 140, 140 if size == '1200x630' else 160
        box_x = w - 60 - box_w
        box_y = 80
        draw.rectangle(
            [(box_x, box_y), (box_x + box_w, box_y + box_h)],
            outline=color_lime,
            width=2
        )
        try:
            stat_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Bold.otf', 48 if size == '1200x630' else 52)
        except:
            stat_font = ImageFont.load_default()
        draw.text((box_x + 15, box_y + 30), stat, fill=color_lime, font=stat_font)
        try:
            small_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Regular.otf', 16)
        except:
            small_font = ImageFont.load_default()
        draw.text((box_x + 20, box_y + 95), 'sin píxel', fill=color_muted, font=small_font)

    # Subtitle
    subtitle_lines = textwrap.wrap(subtitle, width=22 if size == '1200x630' else 20)
    try:
        subtitle_font = ImageFont.truetype('/System/Library/Fonts/SFProText-Regular.otf', subtitle_size)
    except:
        subtitle_font = ImageFont.load_default()

    subtitle_y = h - 160 if size == '1200x630' else h - 320
    for line in subtitle_lines:
        draw.text((60, subtitle_y), line, fill=color_muted, font=subtitle_font)
        subtitle_y += subtitle_size + 10

    # Bottom label
    try:
        label_font = ImageFont.truetype('/System/Library/Fonts/SFMono-Regular.otf', 13)
    except:
        label_font = ImageFont.load_default()
    draw.text((60, h - 40), 'Investigación de mercado digital 2026', fill=color_muted, font=label_font)

    img.save(f'{OUTPUT_DIR}/{filename}')
    print(f'✓ {filename}')

# Crear las 2 imágenes del artículo maestro
create_og_image(
    'La crisis invisible: estado digital de empresas Costa Rica',
    '386 sitios analizados. 88% sin Meta Pixel. Crisis sistémica de medición digital.',
    '88%',
    'estudio-estado-digital.png',
    '1200x630'
)
create_og_image(
    'La crisis invisible: estado digital de empresas Costa Rica',
    '386 sitios analizados. 88% sin Meta Pixel. Crisis sistémica de medición digital.',
    '88%',
    'estudio-estado-digital-sq.png',
    '1080x1350'
)

print('\n✨ OG images generadas en public/og/')
