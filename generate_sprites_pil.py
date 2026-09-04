#!/usr/bin/env python3
"""
Islamabad Runner — PIL sprite generator.
Draws all game sprites programmatically: same palette, same outline width,
same aesthetic. Output: properly-sized PNG sprite sheets for Flutter Flame.

Inspired by the slack-gif-creator skill's PIL/Pillow approach.
"""
from PIL import Image, ImageDraw
import os

OUT = "/home/oye/Documents/free_work/islamabad_runner/assets/sprites_pil"
os.makedirs(OUT, exist_ok=True)

# ── Palette (from game spec) ──────────────────────────────────────────────────
BLACK   = (20, 18, 24, 255)
WHITE   = (240, 237, 232, 255)
ASPHALT = (28, 28, 34, 255)
PTI_BLUE   = (37, 97, 163, 255)
PTI_LIGHT  = (72, 138, 210, 255)
KHAKI      = (139, 125, 74, 255)
KHAKI_DARK = (100, 88, 50, 255)
OLIVE      = (74, 90, 42, 255)
OLIVE_DARK = (50, 62, 28, 255)
ORANGE     = (224, 90, 26, 255)
ORANGE_LIGHT = (240, 140, 60, 255)
SIGNAL_GREEN = (46, 140, 63, 255)
SKIN       = (200, 168, 130, 255)
TEARGAS    = (183, 212, 64, 255)
TEARGAS_DARK = (140, 170, 30, 255)
GREY       = (110, 110, 120, 255)
GREY_LIGHT = (180, 180, 190, 255)
GREY_DARK  = (60, 60, 70, 255)
CHROME     = (200, 200, 210, 255)
RED        = (200, 50, 40, 255)
TRANS      = (0, 0, 0, 0)

OL = 3  # outline thickness for all sprites


def new(w, h):
    img = Image.new("RGBA", (w, h), TRANS)
    return img, ImageDraw.Draw(img)


def outline_rect(d, xy, fill, ol=OL):
    x0, y0, x1, y1 = xy
    d.rectangle([x0-ol, y0-ol, x1+ol, y1+ol], fill=BLACK)
    d.rectangle([x0, y0, x1, y1], fill=fill)


def outline_ellipse(d, xy, fill, ol=OL):
    x0, y0, x1, y1 = xy
    d.ellipse([x0-ol, y0-ol, x1+ol, y1+ol], fill=BLACK)
    d.ellipse([x0, y0, x1, y1], fill=fill)


# ── 1. Container Stack — 128×128 ──────────────────────────────────────────────
def draw_container(img, d, x_off=0, y_off=0):
    """Single PTI-blue shipping container, front-facing."""
    # Bottom container
    outline_rect(d, [x_off+8, y_off+64, x_off+120, y_off+116], PTI_BLUE)
    # Top container (offset slightly)
    outline_rect(d, [x_off+12, y_off+16, x_off+116, y_off+68], PTI_BLUE)
    # Vertical ribs on containers
    for rx in [x_off+30, x_off+52, x_off+74, x_off+96]:
        d.rectangle([rx, y_off+18, rx+3, y_off+66], fill=PTI_LIGHT)
    for rx in [x_off+28, x_off+50, x_off+72, x_off+94]:
        d.rectangle([rx, y_off+66, rx+3, y_off+114], fill=PTI_LIGHT)
    # Door seam on bottom
    d.rectangle([x_off+62, y_off+66, x_off+65, y_off+114], fill=BLACK)
    # Handles
    outline_rect(d, [x_off+54, y_off+88, x_off+60, y_off+92], CHROME)
    outline_rect(d, [x_off+68, y_off+88, x_off+74, y_off+92], CHROME)

img, d = new(128, 128)
draw_container(img, d)
img.save(f"{OUT}/container_stack.png")
print("✓ container_stack.png  128×128")


# ── 2. Police Cone — 128×128 ─────────────────────────────────────────────────
img, d = new(128, 128)
# Cone body (triangle via polygon)
d.polygon([(64, 20), (20, 108), (108, 108)], fill=ORANGE)
d.polygon([(64, 20), (22, 108), (106, 108)], fill=None, outline=None)
# Black outline polygon
d.polygon([(64, 14), (12, 114), (116, 114)], fill=BLACK)
d.polygon([(64, 20), (18, 110), (110, 110)], fill=ORANGE)
# White stripe
d.polygon([(64, 46), (36, 90), (92, 90)], fill=WHITE)
d.polygon([(64, 52), (40, 88), (88, 88)], fill=ORANGE)
# Base
outline_rect(d, [14, 108, 114, 120], ORANGE)
img.save(f"{OUT}/police_cone.png")
print("✓ police_cone.png      128×128")


# ── 3. Tear Gas Canister — 128×128 ───────────────────────────────────────────
def draw_teargas(img, d, angle=0):
    """Cylindrical canister + gas puff."""
    # Gas cloud (puff)
    outline_ellipse(d, [50, 10, 110, 55], TEARGAS)
    outline_ellipse(d, [30, 20, 80, 58], TEARGAS)
    outline_ellipse(d, [62, 8, 118, 48], TEARGAS_DARK)
    # Can body
    outline_rect(d, [30, 56, 90, 108], GREY)
    # Red band
    d.rectangle([30, 72, 90, 84], fill=RED)
    # Can cap
    outline_ellipse(d, [28, 50, 92, 68], GREY_LIGHT)
    # Nozzle
    outline_rect(d, [56, 40, 64, 56], GREY_DARK)
    # Label stripe
    d.rectangle([32, 88, 88, 96], fill=WHITE)

img, d = new(128, 128)
draw_teargas(img, d)
img.save(f"{OUT}/teargas_can.png")
print("✓ teargas_can.png      128×128")

# Teargas rolling spritesheet — 3 frames (at 0°, 120°, 240° visual rotation)
# ponytail: simulate rotation by shifting gas cloud position per frame
frames_tg = []
for i, cloud_shift in enumerate([-8, 0, 8]):
    frame, d2 = new(128, 128)
    # Gas cloud shifts left/right to imply rotation
    outline_ellipse(d2, [50+cloud_shift, 10, 110+cloud_shift, 52], TEARGAS)
    outline_ellipse(d2, [28+cloud_shift, 18, 78+cloud_shift, 56], TEARGAS)
    # Can body stays
    outline_rect(d2, [30, 56, 90, 108], GREY)
    d2.rectangle([30, 72, 90, 84], fill=RED)
    outline_ellipse(d2, [28, 50, 92, 68], GREY_LIGHT)
    outline_rect(d2, [56, 40, 64, 56], GREY_DARK)
    d2.rectangle([32, 88, 88, 96], fill=WHITE)
    frames_tg.append(frame)

sheet_tg = Image.new("RGBA", (384, 128), TRANS)
for i, f in enumerate(frames_tg):
    sheet_tg.paste(f, (i * 128, 0))
sheet_tg.save(f"{OUT}/teargas_roll.png")
print("✓ teargas_roll.png     384×128 (3-frame spritesheet)")


# ── 4. WhatsApp Signal Icon — 128×128 ────────────────────────────────────────
img, d = new(128, 128)
# Glow bg
d.ellipse([10, 10, 118, 118], fill=(46, 140, 63, 80))
d.ellipse([20, 20, 108, 108], fill=(46, 140, 63, 140))
# Phone body
outline_rect(d, [44, 30, 84, 98], SIGNAL_GREEN)
# Screen
d.rectangle([48, 36, 80, 84], fill=(20, 80, 30, 255))
# Signal arcs (WiFi style)
d.arc([38, 42, 90, 78], -30, 210, fill=WHITE, width=4)
d.arc([46, 52, 82, 76], -30, 210, fill=WHITE, width=3)
# Home button
outline_ellipse(d, [58, 86, 70, 96], WHITE)
img.save(f"{OUT}/whatsapp_icon.png")
print("✓ whatsapp_icon.png    128×128")


# ── 5. Biryani Box — 128×128 ─────────────────────────────────────────────────
img, d = new(128, 128)
BOX_BROWN = (120, 80, 40, 255)
BOX_LIGHT = (160, 110, 60, 255)
RICE      = (230, 215, 180, 255)
SAFFRON   = (255, 180, 0, 255)
# Box body
outline_rect(d, [16, 52, 112, 106], BOX_BROWN)
# Box lid
outline_rect(d, [12, 36, 116, 58], BOX_LIGHT)
# Lid fold line
d.rectangle([14, 46, 114, 50], fill=BOX_BROWN)
# Rice visible through lid gap
d.rectangle([20, 56, 108, 82], fill=RICE)
# Saffron strands
for sx in [30, 48, 66, 84]:
    d.rectangle([sx, 58, sx+6, 62], fill=SAFFRON)
# Steam puffs
for sp_x in [35, 64, 93]:
    outline_ellipse(d, [sp_x, 16, sp_x+16, 36], (240, 240, 240, 180))
img.save(f"{OUT}/biryani_box.png")
print("✓ biryani_box.png      128×128")


# ── 6. Army Jeep — 192×96 (side view facing left) ────────────────────────────
img, d = new(192, 96)
# Body
outline_rect(d, [12, 28, 168, 68], OLIVE)
# Cab top
outline_rect(d, [50, 10, 140, 34], OLIVE_DARK)
# Windshield
outline_rect(d, [56, 14, 102, 32], (80, 120, 90, 200))
# Wheels
outline_ellipse(d, [14, 54, 54, 88], ASPHALT)
d.ellipse([22, 62, 46, 80], fill=GREY_DARK)
outline_ellipse(d, [130, 54, 170, 88], ASPHALT)
d.ellipse([138, 62, 162, 80], fill=GREY_DARK)
# Headlight
outline_rect(d, [152, 34, 166, 46], (220, 220, 140, 255))
# Star insignia
d.polygon([(80,20),(82,26),(88,26),(84,30),(86,36),(80,32),(74,36),(76,30),(72,26),(78,26)],
           fill=KHAKI)
img.save(f"{OUT}/army_jeep.png")
print("✓ army_jeep.png        192×96")


# ── 7. Ranger — 2-frame walk spritesheet (96×128 per frame → 192×128 total) ──
def draw_ranger(d, x_off, leg_fwd=True):
    """Ranger in khaki uniform. leg_fwd toggles walking phase."""
    # Boots
    lx = x_off + (10 if leg_fwd else 20)
    rx = x_off + (50 if leg_fwd else 40)
    outline_rect(d, [lx, 102, lx+18, 122], KHAKI_DARK)
    outline_rect(d, [rx, 102, rx+18, 122], KHAKI_DARK)
    # Legs
    outline_rect(d, [lx+2, 74, lx+14, 106], KHAKI)
    outline_rect(d, [rx+2, 74, rx+14, 106], KHAKI)
    # Torso
    outline_rect(d, [x_off+20, 42, x_off+70, 80], KHAKI)
    # Left arm (raised if leg_fwd)
    arm_y = 44 if leg_fwd else 52
    outline_rect(d, [x_off+8, arm_y, x_off+22, arm_y+28], KHAKI)
    # Right arm
    outline_rect(d, [x_off+68, 52, x_off+80, 78], KHAKI)
    # Beret
    outline_ellipse(d, [x_off+22, 10, x_off+68, 36], OLIVE_DARK)
    # Head
    outline_ellipse(d, [x_off+26, 22, x_off+64, 50], SKIN)
    # Face details
    d.rectangle([x_off+32, 32, x_off+38, 36], fill=ASPHALT)  # sunglasses
    d.rectangle([x_off+44, 32, x_off+50, 36], fill=ASPHALT)
    # Belt
    d.rectangle([x_off+20, 72, x_off+70, 78], fill=KHAKI_DARK)

sheet_r, dr = new(192, 128)
draw_ranger(dr, 0, leg_fwd=True)
draw_ranger(dr, 96, leg_fwd=False)
sheet_r.save(f"{OUT}/ranger_walk.png")
print("✓ ranger_walk.png      192×128 (2-frame spritesheet)")


# ── 8. Bike Rider — 3-frame spritesheet (128×96 per frame → 384×96 total) ────
def draw_bike_rider(d, x_off, body_lean=0):
    """
    Pixel-art motorcycle + rider. body_lean shifts rider y for animation.
    Frame 0: neutral, Frame 1: lean-fwd, Frame 2: lean-back
    """
    bx = x_off  # base x
    by = body_lean  # y shift for rider body

    # ── Motorcycle ──
    # Rear wheel
    outline_ellipse(d, [bx+8, 44, bx+52, 86], ASPHALT)
    d.ellipse([bx+16, 52, bx+44, 78], fill=GREY_DARK)
    # Front wheel
    outline_ellipse(d, [bx+82, 48, bx+122, 86], ASPHALT)
    d.ellipse([bx+90, 56, bx+114, 78], fill=GREY_DARK)
    # Engine/frame
    outline_rect(d, [bx+42, 52, bx+90, 68], GREY_DARK)
    # Exhaust
    outline_rect(d, [bx+14, 68, bx+52, 76], CHROME)
    # Fuel tank
    outline_rect(d, [bx+52, 38, bx+92, 60], ASPHALT)
    # Seat
    outline_rect(d, [bx+44, 34+by, bx+80, 44+by], ASPHALT)
    # Handlebar
    outline_rect(d, [bx+88, 30+by, bx+106, 38+by], GREY)
    # Fork
    d.line([bx+94, 38+by, bx+100, 54], fill=GREY, width=4)

    # ── Rider ──
    # Boots
    outline_rect(d, [bx+42, 70+by, bx+58, 82+by], KHAKI_DARK)
    # Legs (sitting position)
    outline_rect(d, [bx+44, 48+by, bx+56, 74+by], KHAKI)
    outline_rect(d, [bx+60, 50+by, bx+72, 74+by], KHAKI)
    # Torso
    outline_rect(d, [bx+54, 22+by, bx+80, 52+by], KHAKI)
    # Backpack
    outline_rect(d, [bx+58, 20+by, bx+74, 38+by], BOX_BROWN)
    # Arms (hunched forward)
    outline_rect(d, [bx+76, 28+by, bx+92, 40+by], KHAKI)
    # Head / helmet
    outline_ellipse(d, [bx+68, 6+by, bx+94, 28+by], ASPHALT)
    # Visor
    d.ellipse([bx+72, 12+by, bx+90, 24+by], fill=(40, 60, 40, 200))

BOX_BROWN = (120, 80, 40, 255)
sheet_b, db = new(384, 96)
for i, lean in enumerate([0, -2, 1]):
    draw_bike_rider(db, i * 128, lean)
sheet_b.save(f"{OUT}/bike_ride.png")
print("✓ bike_ride.png        384×96  (3-frame spritesheet)")


# ── 9. HUD Bar — 512×80 ──────────────────────────────────────────────────────
img, d = new(512, 80)
# Background panel
d.rectangle([0, 0, 512, 80], fill=(28, 28, 34, 220))
d.rectangle([0, 0, 512, 4], fill=PTI_BLUE)  # top accent line
# HP indicators (3 headlight icons)
for i in range(3):
    hx = 20 + i * 52
    outline_ellipse(d, [hx, 16, hx+40, 54], (220, 220, 140, 255))  # lit
    d.ellipse([hx+4, 20, hx+36, 50], fill=(255, 255, 200, 255))
# Turbo bar track
outline_rect(d, [200, 24, 400, 52], GREY_DARK)
# Turbo fill (2/3 full)
d.rectangle([203, 27, 333, 49], fill=TEARGAS)
# Distance label area
outline_rect(d, [420, 16, 500, 60], ASPHALT)
img.save(f"{OUT}/hud_bar.png")
print("✓ hud_bar.png          512×80")


print()
print("All sprites saved to:", OUT)
print("Sizes are Flutter Flame-ready (power-of-2-friendly, RGBA PNG).")
print()
print("Sprite sheet frame sizes:")
print("  bike_ride:    128×96  per frame, 3 frames → load as SpriteSheet(3, 1)")
print("  ranger_walk:   96×128 per frame, 2 frames → load as SpriteSheet(2, 1)")
print("  teargas_roll: 128×128 per frame, 3 frames → load as SpriteSheet(3, 1)")
