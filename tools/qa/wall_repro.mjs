import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ['--no-sandbox', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5199/?auto=1'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const log = await page.evaluate(async () => {
  const g = window.__game; const out = [];
  // a train with NO ramp in front of it (ramp zFar != train zNear)
  const noRamp = (t) => !g.track.obstacles.some((o) => o.kind === 'ramp' && o.lane === t.lane && Math.abs(o.zFar - t.zNear) < 0.5);
  let t = g.track.obstacles.find((o) => o.kind === 'train' && !o.moving && noRamp(o) && o.zNear < g.player.z - 10);
  const t0 = performance.now(); while (!t && performance.now() - t0 < 10000) { await new Promise((f) => setTimeout(f, 100)); t = g.track.obstacles.find((o) => o.kind === 'train' && !o.moving && noRamp(o) && o.zNear < g.player.z - 10); }
  if (!t) return ['no rampless train found'];
  out.push(`train ${t.type} lane=${t.lane} zNear=${t.zNear.toFixed(1)}`);
  g.player.targetLane = t.lane; g.player.lane = t.lane; g.player.laneT = 1; g.player.x = t.lane * 2.2; g.player.z = t.zNear + 14; g.invuln = 0;
  const stop = performance.now() + 6000;
  while (performance.now() < stop && g.state === 'running') await new Promise((f) => setTimeout(f, 80));
  out.push(`result: state=${g.state} cause=${g.deathCause} y=${g.player.y.toFixed(2)} z=${g.player.z.toFixed(1)}`);
  return out;
});
console.log(log.join('\n')); console.log('errors:', errs.join(' | ') || 'none'); await b.close();
