# Islamabad Runner 3D

A Subway-Surfers-style 3D endless runner set on the roads of Islamabad. You are a biker trying to get
across the city on a protest-lockdown day: the roads are blocked with shipping containers, rangers are
on patrol, army jeeps come the other way, teargas hangs at head height and the mobile internet is down.

This is the 3D successor of the pygame prototype (`game.py` in the original repo). Same world, same
jokes, Subway-Surfers gameplay.

## Gameplay (Subway Surfers mechanics, Islamabad skin)

| Action | Input | Notes |
|---|---|---|
| Change lane | swipe left / right (A/D, ←/→) | three lanes, bikes lean into the turn |
| Jump | swipe up (W/↑/space) | clears police barricades, cones, tyre piles |
| Duck ("roll") | swipe down (S/↓) | slides under ROAD CLOSED gantries, police tape and teargas; in the air = fast fall |
| Turbo | double-tap (H) | the hoverboard mechanic: 30 s, saves you from one crash |
| Pause | ⏸ / Esc | |

* **Containers, container trucks and Metro buses** are the "trains": ride up dirt ramps onto their
  roofs, hop between them, fall off the end.
* **Army jeeps** are the oncoming trains — flashing lights, lethal.
* **Rangers, cones and tyre piles** make you stumble; two stumbles while the rangers are close and
  you are arrested.
* **Signal bubbles** (the WhatsApp-style icon from the prototype) — collect 3 to earn a Turbo.
* **Biryani box** = mystery box: coins, keys, Turbos, headstarts, character tokens.
* **Keys** revive you ("Save me!"). Jetpack, Nitro Springs, Coin Magnet and 2X Multiplier are the
  classic power-ups and can be upgraded in the shop.
* **Zones** loop every 3000 m exactly like the prototype: Faisal Avenue → Srinagar Chokepoint →
  Red Zone → D-Chowk final sprint. Reaching D-Chowk pays a bonus and shows the prototype's win line;
  getting arrested shows its lose line.
* 7 riders, 6 bikes, 50 mission sets (multiplier up to 30x), Daily Word Hunt with streak rewards,
  local leaderboard, procedural music & SFX. No ads, no tracking, fully offline.

## Project layout

```
index.html, src/            Vite + Three.js game (ES modules)
  src/game/Game.js          state machine, scoring, power-ups, camera
  src/game/Track.js         procedural road: lane plans, obstacles, scenery, collisions
  src/game/Player.js        biker controller (lanes, jump, duck, turbo, jetpack)
  src/game/Chaser.js        the two rangers
  src/ui/UI.js, ui.css      HUD, menus, shop, missions, word hunt, settings
  src/data/                 characters, bikes, missions, daily words
tools/blender/*.py          bpy scripts that generate EVERY 3D asset (public/models/*.glb)
tools/play.js               headless Playwright harness (screenshots, bot, soak test)
android/                    Capacitor Android project (API 36, portrait, immersive)
store/                      Play Store icon, feature graphic, splash
docs/store-listing.md       listing copy + data-safety answers
public/privacy.html         privacy policy (host it and paste the URL in Play Console)
```

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production web build in dist/
```

Regenerate the 3D assets (needs `pip install bpy`, Blender 4.2+ as a Python module):

```bash
npm run assets
```

## Build for Google Play

The repo ships a complete Capacitor Android project and a GitHub Actions workflow
(`.github/workflows/android.yml`) that builds a debug APK and a release AAB on every push.

Locally (Android Studio / SDK 36 + JDK 17+ installed):

```bash
npm run android              # build web + npx cap sync android
cd android && ./gradlew bundleRelease     # -> app/build/outputs/bundle/release/app-release.aab
```

Release signing: create a keystore once

```bash
keytool -genkeypair -v -keystore release.keystore -alias islamabad -keyalg RSA -keysize 2048 -validity 10000
```

and either export `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` before running
Gradle, or add them as GitHub secrets (`KEYSTORE_BASE64` = `base64 -w0 release.keystore`,
`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) and download the signed `.aab` from the workflow
artifacts. Upload it in Play Console together with `store/play-store-icon-512.png`,
`store/feature-graphic-1024x500.png`, phone screenshots and the privacy policy URL.

App id: `com.oyekamal.islamabadrunner` (change in `capacitor.config.json`, `android/app/build.gradle`
and the `android/app/src/main/java/...` package if you want a different one before first upload).

## Headless testing

```bash
npm run dev &
node tools/play.js shots/run 30 450 800 bot 6     # bot plays, 6 screenshots
node tools/play.js shots/soak 300 450 800 soak 1   # 5-minute stability soak (auto-revive)
node tools/play.js shots/ui 1 450 800 ui 0         # every UI screen
```
