# Gameplay QA scripts

Headed Playwright against the dev server (`npx vite --port 5199`). Run each with:

    DISPLAY=:1 CHROME=~/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome node tools/qa/<script>.mjs

- `qa_live.mjs` — 40 s real-GPU bot run: fps, game-time vs wall-time, draw calls, errors.
- `qa_flow2.mjs` — full flow: tap, jump/duck/lane, chaser, key + coin revive, pause, shop, box, rider recolour, landmarks.
- `soak_deaths.mjs` — 150 s bot soak; logs geometry + trail at every death (fair-death audit).
- `ramp_repro.mjs` / `wall_repro.mjs` — ramp onto container must succeed; container face without ramp must kill. `Q="&dist=4000"` for max speed.
- `qa3_*.mjs` — collision edge cases (roof ends, roof-to-roof, side-swipe, ramps, jeeps, pillars, jetpack, revive, stumbles, close calls, turbo save). `qa3_lib.mjs` is the shared harness.
