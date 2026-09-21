// Regression: a jetpack picked up on a run WITHOUT a headstart must land the rider when its timer ends.
// Bug (2026-09-21 tester report "jetpack is infinite"): Game.headstart was undefined → `undefined <= 0` false → never landed.
// CHROME=~/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome BASE=http://localhost:5199/ node tools/qa/jet-probe.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 450, height: 800 } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto((process.env.BASE || 'http://localhost:5199/') + '?auto=1&pu=jetpack');
await p.waitForFunction(() => window.__ready);
let expiredAt = null, landed = false, last = '';
for (let i = 0; i < 40 && !landed; i++) {
  await p.waitForTimeout(1000);
  const s = await p.evaluate(() => { const g = window.__game, pl = g.player; return { t: g.run?.time ?? 0, jet: g.powerups.jetpack || 0, flying: pl.flying, y: pl.y, state: g.state }; });
  last = JSON.stringify(s);
  if (s.state !== 'running') break;
  if (s.jet <= 0 && s.t > 3 && expiredAt === null) expiredAt = s.t;
  if (expiredAt !== null && !s.flying) landed = true;
  if (expiredAt !== null && s.t - expiredAt > 2.5) break;
}
await b.close();
console.log(landed ? 'PASS jetpack landed after expiry' : 'FAIL rider still flying after jetpack expired: ' + last);
process.exit(landed ? 0 : 1);
