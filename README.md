# Islamabad Runner

A 60–90s auto-scrolling motorcycle runner prototype built with Python/pygame,
satirizing the chaos of getting across Islamabad during a protest lockdown.

You're a biker trying to reach D-Chowk before your HP runs out or you get arrested.
The road is closed, the containers are stacked, the rangers are out, and the
mobile internet is down — but you ride anyway.

## The idea

Three-lane endless runner, but themed entirely around a Pakistani protest/lockdown
day: shipping containers blocking the road, teargas canisters rolling at you,
traffic cones, rangers on foot patrol, and an army jeep once you're deep in. You
dodge on your bike, grab WhatsApp icons to charge turbo (because that's the only
way messages get through when mobile data's cut) and biryani boxes to heal HP.

The run is split into four zones that get progressively more hostile:

| Zone | Distance | Vibe |
|---|---|---|
| Faisal Avenue | 0–700m | Warm-up, low obstacle density |
| Srinagar Chokepoint | 700–1600m | Density ramps up |
| Red Zone | 1600–2600m | Heaviest obstacle density, jeeps start appearing |
| D-Chowk — Final Sprint | 2600–3000m | No new obstacles, just outrun the clock |

**Win:** reach 3000m (D-Chowk) — "You reached D-Chowk! Mobile internet still
blocked. But you made it."
**Lose:** HP hits 0 — "Arrested. 954 others join you today. Section 144 is still
in effect."

## Character & obstacles

| Sprite | Role |
|---|---|
| Biker (player) | 3-frame ride animation, jumps/ducks, glows green when turbo is active |
| Shipping container | Static obstacle, jump over |
| Traffic cone | Static obstacle, jump over |
| Teargas canister | Rolling animated obstacle, duck under |
| Ranger | Walking animated obstacle, jump over |
| Army jeep | Wide static obstacle (Red Zone onward), jump over |
| WhatsApp icon | Collectible — fills turbo meter |
| Biryani box | Collectible — restores 1 HP |

Player starts with 3 HP and a 1.2s invulnerability window (sprite flickers) after
each hit.

## Controls

| Input | Action |
|---|---|
| Tap (Space / click) | Jump |
| Hold Down arrow | Duck |
| Double-tap | Turbo boost (needs a full turbo meter, 1.8x speed for 2s) |

## Run it

```bash
python3 -m venv venv
source venv/bin/activate
pip install pygame
python3 game.py
```

## Assets

Two asset pipelines exist, both procedural (no hand-drawn or purchased art):

**`generate_sprites_pil.py`** — the one `game.py` actually loads (`assets/sprites_pil`).
Draws every sprite with Pillow as flat-color shapes with a 3px black outline, on a
shared palette (PTI blue for containers, khaki for the ranger, olive for the jeep,
teargas green-yellow, biryani brown/saffron). This is what's on screen in-game:

| Sprite | Design |
|---|---|
| **Biker (player)** | Side-view motorcycle (2 wheels, tank, exhaust) + rider in a khaki jacket with a brown backpack, dark helmet, tinted visor. 3-frame spritesheet (neutral / lean-forward / lean-back) for the ride animation. |
| **Ranger** | Khaki uniform, dark green beret, sunglasses, black boots, belt — 2-frame walk cycle (legs/arms alternate). |
| **Container stack** | Two PTI-blue shipping containers stacked, corrugated ribs, chrome door handles. |
| **Army jeep** | Olive-drab body, dark cab top, tinted windshield, a small star insignia on the hood. |
| **Teargas canister** | Grey cylinder with a red warning band, white label stripe, and a yellow-green gas puff that shifts position across 3 frames to fake rotation as it rolls. |
| **Traffic cone** | Orange with a white reflective stripe, black outline. |
| **WhatsApp icon** (collectible) | Green phone silhouette with white WiFi-style signal arcs and a glow halo — turbo fuel. |
| **Biryani box** (collectible) | Brown takeaway box, lid ajar showing rice + saffron strands, steam puffs rising — the healing item. |
| **HUD bar** | Dark asphalt panel, 3 round "headlight" HP indicators, a turbo meter bar, distance counter. |

**`generate_assets.py`** — an earlier/alternate pass that calls Pollinations.ai
(free text-to-image, `flux` model) for a more painterly sprite set plus the
**background art**, one per zone, all real Islamabad geography reskinned for the
runner:

| Background | Setting |
|---|---|
| `bg_boulevard` | Faisal Avenue — wide boulevard, smoggy grey sky, palm trees (Zone 1) |
| `bg_chokepoint` | A street sealed with stacked blue containers, yellow teargas haze in the air (Zone 2) |
| `bg_redzone` | Constitution Avenue — government building domes / parliament in the distance, heavy smog, dramatic sky (Zone 3) |
| `bg_finish` | D-Chowk — the parliament gate and open plaza, the finish line (Zone 4) |

There's also an unused `ui/logo` prompt (motorcycle-runner title art, blue/yellow-green,
smoggy backdrop) generated but not yet wired into `game.py`, which currently draws
its zone backgrounds as flat colors + simple shapes rather than these AI images.

Preview frames from a test run are in the repo root (`preview_frame*.png`, `preview_win.png`).

## Status

Prototype — single-file game loop in `game.py` (~500 lines), no packaging/build
step, no sound, no menu beyond the ready/win/lose overlays. Built as a fast
concept test, not a polished release.
