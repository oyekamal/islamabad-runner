import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ['--no-sandbox', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5199/?auto=1' + (process.env.Q || '')); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
// steer into the first ramp lane, never jump; log every 100ms around the ramp
const log = await page.evaluate(async () => {
  const g = window.__game; const out = [];
  const ramp = () => g.track.obstacles.find((o) => o.kind === 'ramp' && o.zNear < g.player.z);
  let r = ramp(); const t0 = performance.now();
  while (!r && performance.now() - t0 < 15000) { await new Promise((f) => setTimeout(f, 100)); r = ramp(); if (g.state !== 'running') break; }
  if (!r) return ['no ramp found; state=' + g.state];
  const train = g.track.obstacles.find((o) => o.kind === 'train' && o.lane === r.lane && Math.abs(o.zNear - r.zFar) < 0.5);
  out.push(`ramp lane=${r.lane} zNear=${r.zNear.toFixed(1)} zFar=${r.zFar.toFixed(1)} train=${train ? `${train.type} zNear=${train.zNear.toFixed(1)} zFar=${train.zFar.toFixed(1)} yTop=${train.yTop}` : 'NONE'} playerZ=${g.player.z.toFixed(1)}`);
  g.player.targetLane = r.lane; g.player.lane = r.lane; g.player.laneT = 1; g.player.x = r.lane * 2.2; g.player.z = r.zNear + 22; g.invuln = 0.3;
  const stop = performance.now() + 12000;
  while (performance.now() < stop) {
    const p = g.player;
    if (p.z < r.zNear + 6 && p.z > r.zFar - 30) out.push(`z=${p.z.toFixed(1)} y=${p.y.toFixed(2)} ground=${p.groundY.toFixed(2)} grounded=${p.grounded} state=${g.state} cause=${g.deathCause || ''} lane=${p.lane}`);
    if (g.state !== 'running' || p.z < r.zFar - 30) break;
    await new Promise((f) => setTimeout(f, 80));
  }
  return out;
});
console.log(log.join('\n')); console.log('errors:', errs.join(' | ') || 'none');
await page.screenshot({ path: 'shots/ramp_repro.png' }); await b.close();
