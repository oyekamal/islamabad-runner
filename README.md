# Islamabad Runner

A 60–90s auto-scrolling motorcycle runner prototype built with Python/pygame.

Dodge containers, teargas, cones, and rangers on the road to D-Chowk. Tap to jump,
hold to duck, double-tap to turbo. Reach the finish line to win — run out of HP
and you're arrested.

## Controls

| Input | Action |
|---|---|
| Tap | Jump |
| Hold | Duck |
| Double-tap | Turbo |

## Run it

```bash
python3 -m venv venv
source venv/bin/activate
pip install pygame
python3 game.py
```

## Assets

Sprites are procedurally generated with `generate_assets.py` / `generate_sprites_pil.py`
into `assets/sprites` and `assets/sprites_pil`. Preview frames are in the repo root.

## Status

Prototype — single-file game loop in `game.py`, no packaging/build step yet.
