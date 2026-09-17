#!/usr/bin/env python3
"""Store art via kie.ai nano-banana-pro (Gemini 3 Pro Image). Refs = live game screenshots on GitHub Pages.
Usage: python3 tools/art/gen_store_art.py [icon|feature|all]   -> store/gemini/*.png"""
import json, os, sys, time, urllib.request, concurrent.futures as cf
KEY = os.environ.get("KIE_API_KEY") or next((l.split("=", 1)[1].strip().split()[0] for l in open("/home/oye/Documents/free_work/agent-skills-taleemabad/TOKENS.md") if l.startswith("KIE_API_KEY=")), None)
assert KEY, "KIE_API_KEY missing"
UA = "Mozilla/5.0 Chrome/126"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "store", "gemini")
P = "https://oyekamal.github.io/islamabad-runner/screenshots/"
REFS = [P + "01-menu.png", P + "03-chokepoint.png", P + "05-dchowk.png"]

RIDER = ("IMAGE 1, IMAGE 2 and IMAGE 3 are screenshots of the actual game: keep this EXACT character — a boxy low-poly "
         "cartoon courier with a round bright-orange helmet, tinted dark visor, teal jacket, yellow backpack, navy trousers, "
         "riding a small red Honda 70 style motorcycle with a chrome round headlight. Same proportions, same flat-shaded "
         "low-poly toy look, same colours. Do NOT redesign him. ")
NEG = (" --no text, letters, words, logo, watermark, realistic human face, photorealism, extra riders, extra bikes, "
       "blurry, cropped helmet, dark underexposed face, muddy colours, grid pattern")

ICON_BASE = (RIDER + "Google Play app icon for a mobile endless-runner game, square, no text anywhere. "
  "Hero close-up of the rider on his motorcycle, low three-quarter front view, leaning hard into a turn toward the viewer, "
  "helmet and visor big and readable, filling about 80 percent of the frame, nothing clipped. Bold, clean, high-contrast "
  "mobile-game icon style like top arcade runners: thick clean shapes, strong rim light, crisp soft shadow under the bike, "
  "shallow depth, fun energetic motion. ")
ICONS = {
  "icon_a_sky":    ICON_BASE + "Background: bold radial gradient from bright Islamabad sky blue at the centre to deep teal at the edges, with two or three faint diagonal speed streaks and a hint of a road stripe at the bottom.",
  "icon_b_sunset": ICON_BASE + "Background: punchy sunset gradient, saffron orange to magenta, with the flat silhouette of Faisal Mosque's tent roof and minarets very small and low behind the rider, and soft motion streaks.",
  "icon_c_orange": ICON_BASE + "Background: flat vivid orange with a big soft yellow circle behind the rider like a sun or spotlight, comic-style speed lines radiating outward, stacked blue shipping containers tiny at the bottom corners.",
}
FEATURE = (RIDER + "Wide horizontal Google Play feature graphic for the game. The rider is mid-jump on the right third, "
  "leaping over a red-and-white POLICE barricade, bike tilted, dust puff below. Behind him a bright low-poly Islamabad "
  "street: stacked blue and red shipping containers, green trees, the white tent shape and slim minarets of Faisal Mosque "
  "small on the far left, green Margalla hills, a clear blue sky with a few soft clouds. Two khaki-uniformed rangers "
  "chasing on foot, small, far left behind him. Leave the LEFT 55 percent of the image calm and uncluttered (sky and "
  "hills, no busy detail) so a title can be placed there later. No text anywhere. Same flat-shaded low-poly cartoon "
  "style as the screenshots, bright saturated colours, crisp." )

def create(prompt, ar):
    body = json.dumps({"model": "nano-banana-pro", "input": {"prompt": prompt + NEG, "image_input": REFS,
            "aspect_ratio": ar, "resolution": "2K", "output_format": "png"}}).encode()
    req = urllib.request.Request("https://api.kie.ai/api/v1/jobs/createTask", data=body,
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json", "User-Agent": UA})
    r = json.load(urllib.request.urlopen(req, timeout=30))
    if r.get("code") == 433: print("DAILY BUDGET (433) — ABORT"); sys.exit(2)
    assert r.get("code") == 200, r
    return r["data"]["taskId"]

def poll(tid):
    for _ in range(75):
        time.sleep(8)
        req = urllib.request.Request(f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={tid}", headers={"Authorization": "Bearer " + KEY, "User-Agent": UA})
        r = json.load(urllib.request.urlopen(req, timeout=30))
        d = r.get("data") or {}; st = d.get("state")
        if st == "success": return json.loads(d["resultJson"])["resultUrls"][0]
        if st in ("fail", "failed"): print("FAILED", tid, d.get("failMsg")); return None
    return None

def run(name, prompt, ar):
    dest = os.path.join(OUT, name + ".png")
    tid = create(prompt, ar); url = poll(tid)
    if not url: return name, None
    open(dest, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120).read())
    return name, dest

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    jobs = []
    if which in ("icon", "all"): jobs += [(n, p, "1:1") for n, p in ICONS.items()]
    if which in ("feature", "all"): jobs += [("feature_a", FEATURE, "16:9"), ("feature_b", FEATURE + " Golden-hour late-afternoon light.", "16:9")]
    with cf.ThreadPoolExecutor(5) as ex:
        for name, dest in ex.map(lambda j: run(*j), jobs): print(name, "->", dest, flush=True)
