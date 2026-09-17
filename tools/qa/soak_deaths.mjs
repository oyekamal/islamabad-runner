import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await b.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:5199/?auto=1'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.evaluate(() => { const g = window.__game; g.save.data.keys = 999; window.__deaths = []; window.__trail = [];
  // ring buffer of recent player state for post-mortems
  setInterval(() => { if (g.state !== 'running') return; const p = g.player; window.__trail.push({ z: +p.z.toFixed(1), y: +p.y.toFixed(2), g: +p.groundY.toFixed(2), lane: p.lane, tl: p.targetLane, x: +p.x.toFixed(2), lt: +p.laneT.toFixed(2), roll: p.rolling > 0, jump: p.jumping, fly: p.flying }); if (window.__trail.length > 12) window.__trail.shift(); }, 40);
  window.__botTimer = setInterval(() => { if (g.state !== 'running') return; const p = g.player; const lane = p.targetLane;
    const ahead = (l) => g.track.obstacles.filter((o) => o.lane === l && o.zNear < p.z + 1 && o.zNear > p.z - 16 && o.kind !== 'ramp' && !(o.kind === 'train' && p.y > 2)).sort((a, b2) => b2.zNear - a.zNear)[0];
    const o = ahead(lane); if (!o) return; const d = p.z - o.zNear; if (d > 7.5) return; const free = (l) => Math.abs(l) <= 1 && !ahead(l);
    if (o.kind === 'barrier') { if (o.type === 'road_closed_gantry' || o.type === 'teargas') g._onInput('down'); else if (d < 6.5) g._onInput('up'); }
    else if (o.kind === 'stumble') { if (d < 6.5) g._onInput('up'); } else { if (free(lane - 1)) g._onInput('left'); else if (free(lane + 1)) g._onInput('right'); else g._onInput(lane <= 0 ? 'right' : 'left'); } }, 90); });
const t0 = Date.now(); let n = 0;
while (Date.now() - t0 < 150000) {
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => window.__game.state);
  if (st === 'dead') {
    n++;
    const info = await page.evaluate(() => { const g = window.__game; const p = g.player; const near = g.track.obstacles.filter((o) => Math.abs(o.zNear - p.z) < 6 || (o.zNear > p.z && o.zFar < p.z)).map((o) => `${o.kind}/${o.type} lane=${o.lane} z=[${o.zNear.toFixed(1)},${o.zFar.toFixed(1)}] y=[${o.yBot},${o.yTop}]${o.moving ? ' MOVING' : ''}`);
      return { cause: g.deathCause, dist: Math.floor(g.distance), speed: +g.speed.toFixed(1), p: { z: +p.z.toFixed(1), y: +p.y.toFixed(2), x: +p.x.toFixed(2), lane: p.lane }, near, trail: window.__trail.slice(-6) }; });
    console.log(`\n#${n} DEATH cause=${info.cause} dist=${info.dist} speed=${info.speed} player=${JSON.stringify(info.p)}`); for (const s of info.near) console.log('   near: ' + s); console.log('   trail: ' + info.trail.map((t) => `z${t.z} y${t.y} g${t.g} L${t.lane}>${t.tl} x${t.x} lt${t.lt}${t.roll ? ' R' : ''}${t.jump ? ' J' : ''}${t.fly ? ' F' : ''}`).join(' | '));
    await page.screenshot({ path: `shots/soak3_death_${n}.png` });
    await page.evaluate(() => { window.__game.reviveCount = 0; window.__game.revive(); });
  }
}
const fin = await page.evaluate(() => ({ dist: Math.floor(window.__game.distance), fps: +window.__game.fps.toFixed(0) }));
console.log(`\nSOAK done: dist=${fin.dist} deaths=${n} fps=${fin.fps} errors=${errs.length ? errs.join(' | ') : 'none'}`);
await b.close();
