#!/usr/bin/env python3
"""Apply store/gemini/<icon>.png as the app icon everywhere: Play icon 512, PWA icons, Android legacy + adaptive launcher icons, splash."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
src = Image.open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'store', 'gemini', 'icon_a_sky.png')).convert('RGB')
sq = src.resize((1024, 1024), Image.LANCZOS)
edge = sq.getpixel((8, 8))

# Play Store icon (opaque 512) + PWA icons
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'store', 'play-store-icon-512.png'))
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'icons', 'icon-512.png'))
sq.resize((192, 192), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'icons', 'icon-192.png'))

def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=r, fill=255)
    out = im.convert('RGBA'); out.putalpha(m); return out
def circle(im):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).ellipse([0, 0, im.width - 1, im.height - 1], fill=255)
    out = im.convert('RGBA'); out.putalpha(m); return out

# Adaptive foreground: full-bleed art scaled so the safe circle (66/108 dp) holds the rider. The gradient bg is the art itself,
# so we make the foreground the whole image and set the background colour to the icon's edge colour.
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, s in dens.items():
    folder = os.path.join(RES, f'mipmap-{d}')
    legacy = int(48 * s); fg = int(108 * s)
    sq.resize((legacy, legacy), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))
    circle(sq.resize((legacy, legacy), Image.LANCZOS)).save(os.path.join(folder, 'ic_launcher_round.png'))
    # foreground: art covers the full 108dp canvas (Android masks the outer 18dp ring, keeping the rider inside)
    canvas = Image.new('RGB', (fg, fg), edge); inner = int(fg * 0.84)
    canvas.paste(sq.resize((inner, inner), Image.LANCZOS), ((fg - inner) // 2, (fg - inner) // 2))
    canvas.convert('RGBA').save(os.path.join(folder, 'ic_launcher_foreground.png'))
open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % edge)

# Splash 1080x1920: art centred on a matching gradient
top = sq.getpixel((512, 40)); splash = Image.new('RGB', (1080, 1920), edge)
mask = Image.linear_gradient('L').resize((1080, 1920)); splash = Image.composite(Image.new('RGB', (1080, 1920), edge), Image.new('RGB', (1080, 1920), top), mask)
art = rounded(sq.resize((720, 720), Image.LANCZOS), 120); splash.paste(art, (180, 520), art)
splash.save(os.path.join(ROOT, 'store', 'splash-1080x1920.png'))
print('applied', edge)
