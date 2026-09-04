"""Compose app icons, adaptive icons, splash screens and store graphics from the rendered character.
Inputs: /tmp/char_icon.png, /tmp/char_splash.png (from tools/iconshot.mjs)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
TEAL = (31, 178, 166); BLUE = (44, 62, 143); ORANGE = (255, 122, 26); YELLOW = (255, 204, 51); SKY = (116, 192, 255)


def gradient(size, c1, c2, vertical=True):
    w, h = size
    base = Image.new('RGB', size, c1)
    top = Image.new('RGB', size, c2)
    mask = Image.linear_gradient('L').resize(size)
    if not vertical:
        mask = mask.rotate(90, expand=True).resize(size)
    return Image.composite(top, base, mask)


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def font(sz, bold=True):
    for name in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(name):
            return ImageFont.truetype(name, sz)
    return ImageFont.load_default()


def character(path, size):
    im = Image.open(path).convert('RGBA')
    bbox = im.getbbox()
    im = im.crop(bbox)
    scale = size / max(im.size)
    return im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)


def icon(size, full=True):
    """Square launcher icon: sky gradient, sun burst, character, orange rim."""
    bg = gradient((size, size), (74, 163, 255), (157, 211, 255))
    d = ImageDraw.Draw(bg)
    # stylised track lines converging
    for i in range(-3, 4):
        d.line([(size * (0.5 + i * 0.12), size), (size * (0.5 + i * 0.02), size * 0.55)], fill=(200, 226, 250), width=max(2, size // 90))
    # hills
    d.polygon([(0, size * 0.62), (size * 0.25, size * 0.42), (size * 0.5, size * 0.6), (size * 0.75, size * 0.4), (size, size * 0.6), (size, size), (0, size)], fill=(111, 154, 91))
    d.rectangle([0, size * 0.66, size, size], fill=(143, 133, 120))
    ch = character('/tmp/char_icon.png', int(size * 0.86))
    bg.paste(ch, ((size - ch.width) // 2 + int(size * 0.02), size - ch.height + int(size * 0.04)), ch)
    if full:
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(bg, (0, 0), rounded_mask((size, size), int(size * 0.22)))
        rim = ImageDraw.Draw(out)
        rim.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), outline=ORANGE, width=max(3, size // 26))
        return out
    return bg


def adaptive_foreground(size=432):
    """Adaptive icon foreground (108dp canvas; safe zone is the centre 66dp = 61%)."""
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ch = character('/tmp/char_icon.png', int(size * 0.62))
    out.paste(ch, ((size - ch.width) // 2, int(size * 0.20)), ch)
    return out


def splash(w, h):
    bg = gradient((w, h), (74, 163, 255), (222, 241, 255))
    d = ImageDraw.Draw(bg)
    d.polygon([(0, h * 0.62), (w * 0.2, h * 0.5), (w * 0.4, h * 0.6), (w * 0.62, h * 0.47), (w * 0.85, h * 0.6), (w, h * 0.55), (w, h), (0, h)], fill=(111, 154, 91))
    d.rectangle([0, h * 0.68, w, h], fill=(143, 133, 120))
    ch = character('/tmp/char_splash.png', int(min(w, h) * 0.55))
    bg.paste(ch, ((w - ch.width) // 2, int(h * 0.72) - ch.height), ch)
    f = font(int(min(w, h) * 0.085))
    text = 'ISLAMABAD RUNNER'
    tw = d.textlength(text, font=f)
    x, y = (w - tw) / 2, h * 0.12
    for dx, dy in [(0, 6), (0, -3), (3, 0), (-3, 0)]:
        d.text((x + dx, y + dy), text, font=f, fill=BLUE)
    d.text((x, y), text, font=f, fill=YELLOW)
    return bg


def feature_graphic():
    w, h = 1024, 500
    bg = gradient((w, h), (74, 163, 255), (157, 211, 255))
    d = ImageDraw.Draw(bg)
    d.polygon([(0, 330), (150, 240), (330, 320), (520, 230), (700, 320), (880, 250), (1024, 310), (1024, 500), (0, 500)], fill=(111, 154, 91))
    d.rectangle([0, 360, w, h], fill=(143, 133, 120))
    for i in range(-4, 5):
        d.line([(512 + i * 140, 500), (512 + i * 25, 360)], fill=(200, 200, 200), width=6)
    ch = character('/tmp/char_splash.png', 420)
    bg.paste(ch, (640, 500 - ch.height + 10), ch)
    f = font(78); f2 = font(30)
    for dx, dy in [(0, 6), (0, -3), (3, 0), (-3, 0)]:
        d.text((60 + dx, 110 + dy), 'ISLAMABAD', font=f, fill=BLUE)
        d.text((60 + dx, 195 + dy), 'RUNNER', font=f, fill=BLUE)
    d.text((60, 110), 'ISLAMABAD', font=f, fill=YELLOW)
    d.text((60, 195), 'RUNNER', font=f, fill=YELLOW)
    d.text((62, 300), 'Dash through the capital. Dodge the Metro.', font=f2, fill=(255, 255, 255))
    return bg


if __name__ == '__main__':
    # PWA + store icons
    pub = os.path.join(ROOT, 'public', 'icons')
    os.makedirs(pub, exist_ok=True)
    icon(512).save(os.path.join(pub, 'icon-512.png'))
    icon(192).save(os.path.join(pub, 'icon-192.png'))
    store = os.path.join(ROOT, 'store')
    os.makedirs(store, exist_ok=True)
    icon(512, full=False).save(os.path.join(store, 'play-store-icon-512.png'))
    feature_graphic().save(os.path.join(store, 'feature-graphic-1024x500.png'))
    # Android mipmaps (legacy + adaptive)
    dpi = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for k, s in dpi.items():
        folder = os.path.join(RES, f'mipmap-{k}')
        os.makedirs(folder, exist_ok=True)
        icon(s).save(os.path.join(folder, 'ic_launcher.png'))
        icon(s).save(os.path.join(folder, 'ic_launcher_round.png'))
        adaptive_foreground(int(s * 108 / 48)).save(os.path.join(folder, 'ic_launcher_foreground.png'))
    with open(os.path.join(RES, 'drawable', 'ic_launcher_background.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n  <path android:fillColor="#4AA3FF" android:pathData="M0,0h108v108h-108z"/>\n  <path android:fillColor="#6F9A5B" android:pathData="M0,70 L25,50 L50,66 L78,48 L108,64 L108,108 L0,108 Z"/>\n  <path android:fillColor="#8F8578" android:pathData="M0,78h108v30h-108z"/>\n</vector>\n')
    # splash screens
    for k, (pw, ph) in {'port-mdpi': (320, 480), 'port-hdpi': (480, 800), 'port-xhdpi': (720, 1280), 'port-xxhdpi': (960, 1600), 'port-xxxhdpi': (1280, 1920)}.items():
        splash(pw, ph).save(os.path.join(RES, f'drawable-{k}', 'splash.png'))
    for k, (pw, ph) in {'land-mdpi': (480, 320), 'land-hdpi': (800, 480), 'land-xhdpi': (1280, 720), 'land-xxhdpi': (1600, 960), 'land-xxxhdpi': (1920, 1280)}.items():
        splash(pw, ph).save(os.path.join(RES, f'drawable-{k}', 'splash.png'))
    splash(1080, 1920).save(os.path.join(RES, 'drawable', 'splash.png'))
    splash(1080, 1920).save(os.path.join(store, 'splash-1080x1920.png'))
    print('icons written')
