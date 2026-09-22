// Regression: while flying, the rider must not pass through the Metro bridge deck.
// Tester report 2026-09-22: "crossing over the bridge walls". The deck slab spans 6.70-7.30 m across the
// whole road and the rider's AABB reaches ~2.0 m above player.y. Scenery has no collider (Track._decor)
// and obstacle collision is skipped while flying (Game.js), so vertical clearance is the ONLY thing
// keeping them apart — this probe guards the FLY_ALTITUDE constant in Game.js.
//
// The landmark exports as ONE merged mesh, so its AABB includes support posts that reach the ground at
// x=+-6.3. Comparing whole boxes therefore reports a false hit for a rider that never leaves the lanes.
// Instead we take the bridge's actual VERTICES that sit directly over the rider's own x/z footprint.
// CHROME=... BASE=http://localhost:5199/ node tools/qa/bridge-probe.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

// dist 480 puts the first Metro bridge (placed at inZone 540) just ahead of the player.
await page.goto((process.env.BASE || 'http://localhost:5199/') + '?auto=1&dist=480');
await page.waitForFunction(() => window.__ready);
await page.evaluate(() => window.__game._pickup('jetpack'));

const res = await page.evaluate(async () => {
  const g = window.__game;
  const worldBox = (root) => {
    root.updateWorldMatrix(true, true);
    let box = null;
    root.traverse((n) => {
      if (!n.isMesh || !n.geometry) return;
      if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
      const b = n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld);
      box = box ? box.union(b) : b;
    });
    return box;
  };
  const bridges = () => g.track.decor.filter((d) => d.mesh && String(d.mesh.name).includes('metro_bridge'));
  const out = { samples: 0, flyingSamples: 0, hits: 0, minGap: Infinity, overlap: null, riderTopMax: -Infinity };

  for (let i = 0; i < 140; i++) {
    await new Promise((r) => setTimeout(r, 100));
    out.samples++;
    const player = g.player;
    if (!player.flying) continue;
    out.flyingSamples++;
    const rider = worldBox(player.group);
    if (!rider) continue;
    out.riderTopMax = Math.max(out.riderTopMax, rider.max.y);

    for (const d of bridges()) {
      d.mesh.updateWorldMatrix(true, true);
      d.mesh.traverse((n) => {
        if (!n.isMesh || !n.geometry) return;
        const pos = n.geometry.attributes.position;
        if (!pos) return;
        const idx = n.geometry.index;
        const triCount = idx ? idx.count / 3 : pos.count / 3;
        const a = new n.position.constructor(), b2 = new n.position.constructor(), c = new n.position.constructor();
        const get = (t, corner) => {
          const k = idx ? idx.getX(t * 3 + corner) : t * 3 + corner;
          return [pos.getX(k), pos.getY(k), pos.getZ(k)];
        };
        for (let t = 0; t < triCount; t++) {
          const p0 = get(t, 0), p1 = get(t, 1), p2 = get(t, 2);
          a.set(p0[0], p0[1], p0[2]).applyMatrix4(n.matrixWorld);
          b2.set(p1[0], p1[1], p1[2]).applyMatrix4(n.matrixWorld);
          c.set(p2[0], p2[1], p2[2]).applyMatrix4(n.matrixWorld);
          // triangle AABB vs the rider's footprint: correct for merged box geometry,
          // whose slabs only carry vertices at their far corners
          const tminX = Math.min(a.x, b2.x, c.x), tmaxX = Math.max(a.x, b2.x, c.x);
          const tminZ = Math.min(a.z, b2.z, c.z), tmaxZ = Math.max(a.z, b2.z, c.z);
          if (tmaxX < rider.min.x || tminX > rider.max.x) continue;
          if (tmaxZ < rider.min.z || tminZ > rider.max.z) continue;
          const tminY = Math.min(a.y, b2.y, c.y);
          if (Math.max(a.y, b2.y, c.y) < 0.5) continue;      // ignore road-level geometry
          out.hits++;
          const gap = tminY - rider.max.y;
          if (gap < out.minGap) out.minGap = gap;
          if (gap < 0 && !out.overlap) out.overlap = { gap: +gap.toFixed(2), riderTop: +rider.max.y.toFixed(2), structureY: +tminY.toFixed(2) };
        }
      });
    }
  }
  return out;
});
await browser.close();

const tested = res.hits > 0 && res.flyingSamples > 0;
const ok = tested && res.overlap === null && pageErrors.length === 0;
console.log(JSON.stringify({ ...res, minGap: res.minGap === Infinity ? null : +res.minGap.toFixed(2), riderTopMax: +res.riderTopMax.toFixed(2), pageErrors }, null, 1));
if (!tested) console.log('FAIL probe never found bridge geometry over the flying rider — it proved nothing');
else if (res.overlap) console.log('FAIL rider passed through the bridge: ' + JSON.stringify(res.overlap));
else if (pageErrors.length) console.log('FAIL page errors: ' + pageErrors.join('; '));
else console.log(`PASS rider flew under the bridge with ${res.minGap.toFixed(2)} m clearance (${res.hits} vertex samples overhead)`);
process.exit(ok ? 0 : 1);
