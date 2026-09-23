# Voice lines

**These are generated, not recorded.** All 31 clips come from ElevenLabs (`eleven_v3`, voice
"Fareed — friendly Pakistani accent") via `tools/voice-elevenlabs.py`, because Kamal's mic is poor.
ElevenLabs paid plans grant commercial rights to the generated audio, so unlike the local MMS Urdu
model (CC-BY-NC, non-commercial) these are safe to ship.

Regenerate or tweak a line:

    set -a; . ~/Documents/free_work/synctoon/.env; set +a
    python3 tools/voice-elevenlabs.py --only pu_wah,cc_arre

The delivery tags (`[excited]`, `[sports commentator, shouting]`, `[dizzy, slurred]`) are what give
the lines comic timing — edit those in the script rather than the words if a line feels flat.
`tools/voice-tts.py` is the local MMS fallback, kept for reference only; do NOT ship its output.

Recording over them by hand is still supported, and still the most authentic option:

Drop recordings here as `<id>.webm`, where `<id>` matches an entry in `src/data/voicelines.js`
(for example `pu_wah.webm`). Record them with `tools/voice-recorder.html` — open it while the dev
server is running, at http://localhost:5199/tools/voice-recorder.html

Any line missing from this folder falls back to a built-in procedural stinger, so partial sets are
fine and the game is never silent.

Keep each clip roughly 0.5-2 s and mono. To shrink one:

    ffmpeg -i in.webm -ac 1 -b:a 24k -c:a libopus out.webm

**Only original recordings.** Never sample a broadcast, drama, match commentary or viral clip.

## Delivery note

Say every line **in your own natural voice**. Two of them, "Bhai bhai bhai" and "Oye hoye", are also
famous meme deliveries. The words themselves are ordinary spoken Urdu and free to use, but do not
imitate the viral performance — say it the way you would say it. Your own delivery is both funnier
and legally clean.
