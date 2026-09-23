# Voice lines (optional)

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
