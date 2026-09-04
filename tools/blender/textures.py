"""Procedural tileable 'multiply' textures (PIL). Mostly bright with darker grime so they modulate vertex colours.
Run: python3 tools/blender/textures.py -> tools/blender/tex/*.png
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tex")
os.makedirs(OUT, exist_ok=True)
S = 512


def noise(size, octaves=(4, 8, 16, 32), seed=0, weights=None):
    """Tileable value noise (numpy): wrapped random grids upscaled bicubically and summed. Returns float array 0..1."""
    import numpy as np
    rng = random.Random(seed)
    acc = np.zeros((size, size), dtype=np.float32)
    total = 0.0
    weights = weights or [1.0 / (i + 1) for i in range(len(octaves))]
    for o, w in zip(octaves, weights):
        g = Image.new("F", (o, o))
        g.putdata([rng.random() for _ in range(o * o)])
        big = Image.new("F", (o * 3, o * 3))
        for a in range(3):
            for b in range(3):
                big.paste(g, (a * o, b * o))
        big = big.resize((size * 3, size * 3), Image.BICUBIC).crop((size, size, size * 2, size * 2))
        acc += np.asarray(big, dtype=np.float32) * w
        total += w
    acc /= total
    return np.clip(acc, 0, 1)


def to_rgb(arr, lo, hi, tint=(255, 255, 255)):
    """Map float noise 0..1 into grey range lo..hi and tint -> RGB image."""
    import numpy as np
    g = (lo + (hi - lo) * arr)
    rgb = np.stack([g * tint[0] / 255, g * tint[1] / 255, g * tint[2] / 255], axis=-1)
    return Image.fromarray(np.clip(rgb, 0, 255).astype("uint8"), "RGB")


def asphalt():
    n = noise(S, (8, 16, 32, 64, 128), seed=3, weights=[0.5, 0.3, 0.2, 0.15, 0.1])
    img = to_rgb(n, 190, 255)
    d = ImageDraw.Draw(img)
    rng = random.Random(7)
    # fine speckle
    px = img.load()
    for _ in range(9000):
        x, y = rng.randrange(S), rng.randrange(S)
        v = rng.randint(120, 200)
        px[x, y] = (v, v, v)
    # a few cracks
    for _ in range(6):
        x, y = rng.randrange(S), rng.randrange(S)
        for _ in range(60):
            nx, ny = (x + rng.randint(-6, 6)) % S, (y + rng.randint(-6, 6)) % S
            d.line([(x, y), (nx, ny)], fill=(110, 110, 110), width=1)
            x, y = nx, ny
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    img.save(os.path.join(OUT, "asphalt.png"))


def rust_metal():
    n = noise(S, (4, 8, 16, 64), seed=11, weights=[0.6, 0.3, 0.2, 0.1])
    base = to_rgb(n, 205, 255)
    rng = random.Random(5)
    over = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    # vertical rust streaks (rain)
    for _ in range(40):
        x = rng.randrange(S)
        h = rng.randint(40, 300)
        y = rng.randrange(S)
        w = rng.randint(2, 9)
        col = (150 + rng.randint(-20, 20), 95 + rng.randint(-20, 20), 45, rng.randint(40, 110))
        d.rectangle([x, y, x + w, y + h], fill=col)
    # scratches
    for _ in range(60):
        x, y = rng.randrange(S), rng.randrange(S)
        d.line([(x, y), (x + rng.randint(-40, 40), y + rng.randint(-8, 8))], fill=(255, 255, 255, 70), width=1)
    over = over.filter(ImageFilter.GaussianBlur(2.5))
    base = Image.alpha_composite(base.convert("RGBA"), over).convert("RGB")
    # bottom-edge grime (darker band at v ~ 0)
    px = base.load()
    for y in range(S):
        k = max(0, 1 - abs(y - S) / 60)  # near the bottom
        if k <= 0:
            continue
        for x in range(S):
            r, g, b = px[x, y]
            f = 1 - 0.35 * k
            px[x, y] = (int(r * f), int(g * f), int(b * f))
    base.save(os.path.join(OUT, "rust_metal.png"))


def plaster():
    n = noise(S, (6, 12, 24, 96), seed=21, weights=[0.5, 0.3, 0.2, 0.15])
    img = to_rgb(n, 222, 255)
    rng = random.Random(9)
    over = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    for _ in range(25):   # stains
        x, y = rng.randrange(S), rng.randrange(S)
        r = rng.randint(20, 90)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(60, 50, 40, rng.randint(10, 28)))
    for _ in range(8):    # hairline cracks
        x, y = rng.randrange(S), rng.randrange(S)
        for _ in range(40):
            nx, ny = x + rng.randint(-8, 8), y + rng.randint(-8, 8)
            d.line([(x, y), (nx, ny)], fill=(70, 60, 50, 120), width=1)
            x, y = nx, ny
    over = over.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img.convert("RGBA"), over).convert("RGB")
    img.save(os.path.join(OUT, "plaster.png"))


def grime():
    n = noise(S, (4, 8, 16, 32), seed=31, weights=[0.5, 0.3, 0.2, 0.1])
    img = to_rgb(n, 215, 255)
    img.save(os.path.join(OUT, "grime.png"))


def foliage():
    n = noise(S, (8, 16, 32, 64), seed=41, weights=[0.5, 0.35, 0.25, 0.15])
    img = to_rgb(n, 150, 255, tint=(235, 255, 225))
    rng = random.Random(3)
    d = ImageDraw.Draw(img)
    for _ in range(600):   # leaf highlights
        x, y = rng.randrange(S), rng.randrange(S)
        d.ellipse([x, y, x + rng.randint(6, 14), y + rng.randint(4, 9)], fill=(255, 255, 240))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    img.save(os.path.join(OUT, "foliage.png"))


def fabric():
    """Subtle cloth weave for the rider / rangers."""
    img = Image.new("RGB", (S, S), (245, 245, 245))
    px = img.load()
    for y in range(S):
        for x in range(S):
            v = 235 + ((x + y) % 4 == 0) * 20 - ((x * 3 + y) % 7 == 0) * 12
            px[x, y] = (v, v, v)
    n = noise(S, (8, 32), seed=51, weights=[0.6, 0.4])
    m = to_rgb(n, 225, 255)
    img = ImageChops.multiply(img, m)
    img.save(os.path.join(OUT, "fabric.png"))


if __name__ == "__main__":
    asphalt(); rust_metal(); plaster(); grime(); foliage(); fabric()
    print("textures written to", OUT)
