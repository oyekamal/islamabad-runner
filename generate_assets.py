#!/usr/bin/env python3
import urllib.parse
import subprocess
import os
import concurrent.futures

DIR = "/home/oye/Documents/free_work/islamabad_runner/assets"
BASE = "https://image.pollinations.ai/prompt"
SEED = 4242

ASSETS = [
    ("sprites/bike_ride",       192, 64,  "flat 2D vector pixel art motorcycle with rider side view facing right 3 animation frames spritesheet, bold black outlines, limited palette, transparent background, retro mobile game sprite, no text"),
    ("sprites/container_stack", 128, 128, "flat 2D vector pixel art blue shipping containers stacked two high, PTI blue color, bold black outlines, side view, transparent background, retro mobile game sprite, no text"),
    ("sprites/ranger_walk",     128, 128, "flat 2D vector pixel art Pakistani ranger soldier character walking side view 2 frames, khaki uniform, beret cap, bold outlines, transparent background, retro game sprite, no text"),
    ("sprites/teargas_can",     128, 128, "flat 2D vector pixel art tear gas canister cylinder with green smoke puff, bold outlines, transparent background, retro game sprite, no text"),
    ("sprites/army_jeep",       192, 96,  "flat 2D vector pixel art army military jeep side view facing left, olive drab green, bold black outlines, transparent background, retro mobile game sprite, no text"),
    ("sprites/police_cone",     128, 128, "flat 2D vector pixel art orange traffic cone road barrier, bold outlines, transparent background, retro game sprite, no text"),
    ("sprites/whatsapp_icon",   128, 128, "flat 2D vector pixel art glowing green wifi signal phone icon collectible power-up, bold outlines, transparent background, retro game collectible icon, no text"),
    ("sprites/biryani_box",     128, 128, "flat 2D vector pixel art Pakistani biryani rice takeaway food box collectible, brown box, steam rising, bold outlines, transparent background, retro game item, no text"),
    ("backgrounds/bg_boulevard",1024,256, "flat 2D vector pixel art side scrolling game background Islamabad wide boulevard Faisal Avenue, smoggy grey sky, palm trees, asphalt road markings, simple clean style, game background tile seamless, no characters no text"),
    ("backgrounds/bg_chokepoint",1024,256,"flat 2D vector pixel art side scrolling game background Islamabad street blocked with blue shipping containers stacked, yellowish tear gas haze in air, smoggy sky, urban setting, game background tile, no characters no text"),
    ("backgrounds/bg_redzone",  1024,256, "flat 2D vector pixel art side scrolling game background Islamabad red zone Constitution Avenue with government building domes parliament, heavy smog, dramatic sky, game background tile, no characters no text"),
    ("backgrounds/bg_finish",   1024,256, "flat 2D vector pixel art side scrolling game background Islamabad D-Chowk parliament gate finish line, dramatic sky, open plaza, game background tile, no characters no text"),
    ("ui/hud_bar",               512,128, "flat 2D vector mobile game HUD interface panel, health indicator 3 motorcycle headlight icons, yellow energy turbo charge bar, dark asphalt colored panel, clean mobile game UI, no text"),
    ("ui/logo",                 1024,256, "flat 2D vector game title logo art for motorcycle runner game set in Pakistan, bold stylized design, blue and yellow-green color scheme, dramatic smoggy background, game title screen art, no legible text"),
]

def download(args):
    rel_path, w, h, prompt = args
    out_path = f"{DIR}/{rel_path}.png"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    encoded = urllib.parse.quote(prompt)
    url = f"{BASE}/{encoded}?width={w}&height={h}&nologo=true&seed={SEED}&model=flux"
    print(f"  Fetching: {rel_path} ({w}x{h})")
    try:
        result = subprocess.run(
            ["curl", "-s", "-L", url, "-o", out_path, "--max-time", "120"],
            capture_output=True
        )
        size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        status = "OK" if size > 1000 else "SMALL/FAIL"
        print(f"  {status}: {rel_path}.png ({size} bytes)")
        return rel_path, status, size
    except Exception as e:
        print(f"  ERROR: {rel_path}: {e}")
        return rel_path, "ERROR", 0

print("Generating 14 Islamabad Runner assets via Pollinations.ai (free, no login)...")
print()

import time

results = []
for i, asset in enumerate(ASSETS):
    print(f"[{i+1}/{len(ASSETS)}]", end=" ")
    result = download(asset)
    results.append(result)
    if i < len(ASSETS) - 1:
        time.sleep(8)  # free tier: 1 req at a time

print()
print("=== Summary ===")
ok = [r for r in results if r[1] == "OK"]
fail = [r for r in results if r[1] != "OK"]
print(f"Downloaded: {len(ok)}/14")
if fail:
    print(f"Failed: {[r[0] for r in fail]}")

print()
print("Files saved to:")
for f in sorted(os.listdir(f"{DIR}/sprites")): print(f"  assets/sprites/{f}")
for f in sorted(os.listdir(f"{DIR}/backgrounds")): print(f"  assets/backgrounds/{f}")
for f in sorted(os.listdir(f"{DIR}/ui")): print(f"  assets/ui/{f}")
