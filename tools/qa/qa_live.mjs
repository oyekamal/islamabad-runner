import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--window-size=460,900'] });
const ctx = await b.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true, isMobile: true, recordVideo: { dir: 'shots/live_video', size: { width: 450, height: 800 } } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:5199/?auto=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const gl = await page.evaluate(() => { const g = window.__game.renderer.getContext(); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
await page.evaluate(() => { const g = window.__game; window.__botTimer = setInterval(() => { if (g.state !== 'running') return; const p = g.player; const lane = p.targetLane;
  const ahead = (l) => g.track.obstacles.filter((o) => o.lane === l && o.zNear < p.z + 1 && o.zNear > p.z - 16 && o.kind !== 'ramp' && !(o.kind === 'train' && p.y > 2)).sort((a, b2) => b2.zNear - a.zNear)[0];
  const o = ahead(lane); if (!o) return; const dist = p.z - o.zNear; if (dist > 7.5) return; const free = (l) => Math.abs(l) <= 1 && !ahead(l);
  if (o.kind === 'barrier') { if (o.type === 'road_closed_gantry' || o.type === 'teargas') g._onInput('down'); else if (dist < 6.5) g._onInput('up'); }
  else if (o.kind === 'stumble') { if (dist < 6.5) g._onInput('up'); }
  else { if (free(lane - 1)) g._onInput('left'); else if (free(lane + 1)) g._onInput('right'); else g._onInput(lane <= 0 ? 'right' : 'left'); } }, 90); });
const samples = []; const t0 = Date.now(); let deaths = 0;
while (Date.now() - t0 < 40000) {
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => { const g = window.__game; return { st: g.state, fps: +g.fps.toFixed(1), dist: Math.floor(g.distance), t: g.run ? +g.run.time.toFixed(1) : 0, calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles, speed: +g.speed.toFixed(1) }; });
  samples.push(s);
  if (s.st === 'dead') { deaths++; await page.screenshot({ path: `shots/live_dead_${deaths}.png` }); await page.evaluate(() => window.__game.save.data.keys = 9); await page.click('[data-act=revive]').catch(() => {}); }
  if (samples.length % 8 === 0) await page.screenshot({ path: `shots/live_${samples.length}.png` });
}
const wall = (Date.now() - t0) / 1000; const last = samples[samples.length - 1];
console.log('GPU:', gl); console.log('wall', wall.toFixed(1), 's; game run.time', last.t, 's; deaths', deaths);
console.log('fps samples:', samples.map((s) => s.fps).join(' '));
console.log('final:', JSON.stringify(last)); console.log('max tris', Math.max(...samples.map((s) => s.tris)), 'max calls', Math.max(...samples.map((s) => s.calls)));
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await ctx.close(); await b.close();
