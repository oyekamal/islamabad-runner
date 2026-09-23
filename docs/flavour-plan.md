# Islamabad Flavour Plan — making every run feel different

Research done 2026-09-22 by two low-effort research agents (as requested). Sources are listed
per item. **Anything marked NEEDS-CHECK was produced by a low-effort model and should be
confirmed before an artist spends time on it.**

The goal Kamal set: no two runs feel the same. Sometimes a baba is jogging beside you. The walls
carry different posters. Different ads run. Biryani and signals actually pay for something.
Pakistani humour lands when you grab things.

---

## 1. Ambient life — the baba running beside you

Roadside characters, **decor only, never colliders**, spawned in the side bands the scenery
already uses. Pick 2–3 per run so runs differ, and weight them by zone.

| Character | Look | Zone it fits |
|---|---|---|
| Morning-walk baba | cream shalwar kameez, brown shawl, white topi, sandals | Margalla / F-sectors, dawn |
| Chai wala | dark kameez, steel kettle, stacked cups, small stall | intersections, Blue Area |
| Rickshaw / qingqi driver | bright orange or green shirt, topi | main avenues |
| Traffic warden | blue-and-white uniform, reflective vest, whistle (NEEDS-CHECK: reported 2026 change from khaki) | roundabouts |
| Fruit cart pusher | worn kameez, crates of mango/melon, tarp overhead | sector edges |
| School kids | white shirt + navy trousers; white shalwar + blue kameez | near schools, morning |
| Cricket-playing boys | loose shirts, rolled trousers, tape-ball bat | empty plots, afternoon |
| Stray dogs | tan mongrels, lean | everywhere, dusk |
| Margalla monkeys | rhesus, grey-brown, small troop, raiding a fruit cart | Margalla foothills only |
| Pre-Eid goats | white/brown, tied or grazing | empty plots, seasonal |

Rules: goats grazing or being led only, **never slaughter** (Eid is sensitive and it would fail
review). Monkeys mischievous, never aggressive. No animal cruelty of any kind.

Performance: these must ride the existing pool. Budget them as billboards or low-poly meshes and
keep them out of the collision list entirely. We are already at ~195 draw calls and ~244k
triangles in Faisal Avenue, so ambient life needs an instancing pass first, which is already on
the open list from the last gauntlet.

## 2. Walls, posters and ads

Rotate poster textures per wall segment so the same stretch of road never repeats.

**Safe to build:**
- Tuition and coaching adverts ("O/A LEVELS", star bursts, phone numbers), bright yellow/red.
- Hakeem and herbal-medicine ads with bottles and powders.
- Istikhara and spiritual-healer ads, crescent and star motifs, sun-faded paper. Present them
  straight, never as a joke.
- Missing-person and property notices with invented names and numbers.
- Wall chalking: Urdu couplets, football and cricket team names.
- Truck-art panels and couplets.
- CDA sector boards (F-6, G-9, I-8), green and white, Urdu and English.

**Generic-only, do not reproduce the real marks:**
- Telecom billboards. Use colour blocks: purple, orange, red, blue, with Urdu-script slogans and
  **no brand names**. Jazz, Zong, Ufone and Telenor marks are all trademarked.
- Political posters. Use party colour bands and vague emblems. Do **not** draw the tiger, the
  cricket bat or the arrow, and do not put any living politician's face or name on a wall.

**Do not build at all:**
- Men's-clinic and "mardana kamzori" adverts. Real and everywhere, but wrong for a game rated
  for children.

## 3. Pickups that are actually worth something

Today biryani and signal bubbles exist but pay little. Proposals, all offline and fixed-rate:

- **Biryani plate** — full meal, full value. Instant score multiplier bump for the rest of the
  run, or a one-hit shield ("you ate, you can take a hit"). Currently it is nearly decorative.
- **Signal bubbles** — already charge a Turbo at a fixed count. Keep the fixed rate and show the
  charge meter more clearly; the payout is invisible right now.
- **Chai cup** — small speed burst with a wobble, cheap and common.
- **Golgappa** — a short chain-collect line; finish the chain for a coin bonus.
- **Key** — already the revive currency, now guaranteed early in a run.

**Reward-schedule warning.** Jetpack Joyride's spin and Subway Surfers' mystery box use variable
payouts, which is exactly what EU regulators, and Belgium and the Netherlands in particular, treat
as gambling-adjacent when children play. Our game is offline, child-friendly, with no purchases.
Recommendation: **fixed, published payouts only**, no loot boxes, no random-multiplier spin.
Crossy Road's flat "100 coins per pull" model is the safer shape if we ever want a prize machine.

## 4. Pakistani voices and humour

Short stingers on pickups and milestones. Research guidance: clips of roughly 0.5 to 2 seconds,
**3 to 8 variants per trigger**, chosen at random, or the same line becomes grating within a
session.

Safe lines, all generic street Urdu, recorded **fresh in our own voice**:
"Bhai bhai bhai", "Kya baat hai!", "Shukriya!", "Yaaaar", "Wah wah", "Arre!"

Cricket-commentary energy is the best fit for milestone moments, delivered in that rapid,
rising style.

**Hard copyright rule: never sample a real clip.** No talk-show audio, no drama audio, no PTV or
PCB match commentary, no viral clip lifted from social media. Those are owned. We record
originals *in the style of*, which carries no rights problem. A recognisable meme line copied
verbatim from a specific broadcast is a takedown risk even when everyone repeats it.

## 5. Variety cadence, from how the good ones do it

- Subway Surfers rotates a themed world roughly every three weeks. We are offline with no server,
  so the local equivalent is a **date-seeded rotation**: derive the theme from the local date so
  it changes on its own without a server.
- Alto's Odyssey varies time of day and weather per run. Cheap here: swap the sky and light colour
  and add a particle pass. This is the highest variety-per-hour-of-work item on the list.
- Temple Run 2 uses daily objectives with streaks. We already have missions and a daily word hunt,
  so extending the streak is cheap.
- Ambient events should be rare enough to stay special. A monkey stealing from a fruit cart should
  feel like a story you tell, not wallpaper.

## Build order (Kamal set this 2026-09-23: voices first, one item at a time)

1. **Voice stingers — IN PROGRESS.** Kamal wants meme voices to make the game fun, so this moved
   to the front.
2. Time of day and weather per run. Biggest felt variety for the least work, no new art.
3. Poster rotation on existing wall segments. Texture work only, no new geometry.
4. Make biryani and signals pay visibly, with the payout shown on screen.
5. Ambient characters, after the instancing pass, since they cost draw calls.

### Where the voices come from

The game ships **zero audio files** today; `Audio.js` is entirely procedural WebAudio, which is
why it is tiny and works offline. Voice lines are the first real audio assets, so size and the
service-worker precache list both have to be respected.

Local Urdu TTS was checked and rejected for shipping. The bake-off in the urdu-reading-course
repo found `facebook/mms-tts-urd-script_arabic` is **CC-BY-NC-4.0**, non-commercial, and the best
fine-tune inherits that restriction. Shipping it on the Play Store is a licence risk even though
the game is free. Separately, TTS reads text flatly; a meme line lives or dies on comic timing,
which TTS does not give us.

**So the voice is Kamal's own.** Free, authentic, zero rights problems, and funnier than any
synthetic voice. The build therefore ships a recorder page so the lines can be captured in one
sitting, and procedural fallback stingers so the game is never silent before that happens.

## Legal and sensitivity summary

| Thing | Call |
|---|---|
| Telecom and brand marks | Generic colours only, no names |
| Political symbols and politicians | Generic colour bands only, no faces, no names |
| Men's-clinic ads | Do not ship |
| Eid goats | Grazing and markets only, never slaughter |
| Faisal Mosque and monuments | Landmarks, treated with respect, never a crash target |
| Meme and commentary audio | Original recordings only, never a sampled clip |
| Random-payout pickups | Avoid; fixed published rates, no loot boxes |
