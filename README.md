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

Sprites, backgrounds, and HUD art are procedurally generated (no external art
assets) via `generate_assets.py` and `generate_sprites_pil.py`, written into
`assets/sprites` and `assets/sprites_pil`. Preview frames from a test run are in
the repo root (`preview_frame*.png`, `preview_win.png`).

## Status

Prototype — single-file game loop in `game.py` (~500 lines), no packaging/build
step, no sound, no menu beyond the ready/win/lose overlays. Built as a fast
concept test, not a polished release.
