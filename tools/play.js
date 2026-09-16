// Headless gameplay harness.
// node tools/play.js <outPrefix> [seconds=6] [w=450] [h=800] [mode=auto|menu|bot|crash|soak|ui|video] [shots=4]
// mode=video records a webm of the bot playing for `seconds` seconds, saved to <outPrefix>.webm
import { chromium } from 'playwright';
import { rename } from 'node:fs/promises';
import { dirname } from 'node:path';
(async () => {
  const [, , prefix = 'shots/play', seconds = '6', w = '450', h = '800', mode = 'auto', shots = '4'] = process.argv;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const videoDir = dirname(`${prefix}.webm`) || 'shots';
  const context = mode === 'video'
    ? await browser.newContext({
        viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
        recordVideo: { dir: videoDir, size: { width: +w, height: +h } },
      })
    : null;
  const page = context ? await context.newPage() : await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const logs = [];
  page.on('console', (m) => { if (m.type() !== 'debug' && m.type() !== 'log') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  const url = (process.env.BASE || 'http://localhost:5173/') + (mode === 'menu' ? '' : '?auto=1' + (process.env.Q || ''));
  await page.goto(url, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); } catch (e) { logs.push('timeout waiting ready'); }
  if (mode === 'bot' || mode === 'video') {
    await page.evaluate(() => {
      // a simple reflex bot: looks 12 m ahead in its lane and reacts
      const g = window.__game;
      window.__botTimer = setInterval(() => {
        if (g.state !== 'running') return;
        const p = g.player;
        const lane = p.targetLane;
        const ahead = (l) => g.track.obstacles.filter((o) => o.lane === l && o.zNear < p.z + 1 && o.zNear > p.z - 16 && o.kind !== 'ramp' && !(o.kind === 'train' && p.y > 2)).sort((a, b) => b.zNear - a.zNear)[0];
        const o = ahead(lane);
        if (!o) return;
        const dist = p.z - o.zNear;
        if (dist > 7.5) return;
        const free = (l) => Math.abs(l) <= 1 && !ahead(l);
        if (o.kind === 'barrier') {
          if (o.type === 'road_closed_gantry' || o.type === 'teargas') g._onInput('down');
          else g._onInput('up');
        } else if (o.kind === 'stumble') g._onInput('up');
        else {
          if (free(lane - 1)) g._onInput('left');
          else if (free(lane + 1)) g._onInput('right');
          else if (lane === 0) g._onInput(Math.random() < 0.5 ? 'left' : 'right');
          else g._onInput(lane < 0 ? 'right' : 'left');
        }
      }, 120);
    });
  }
  if (mode === 'video') {
    // just let the bot play for `seconds`, then flush the recording — no screenshot loop needed
    await page.waitForTimeout(+seconds * 1000);
    const info = await page.evaluate(() => { const g = window.__game; return g ? `state=${g.state} dist=${g.distance.toFixed(0)} score=${g.run ? g.run.score.toFixed(0) : '-'} fps=${g.fps.toFixed(0)}` : 'no game'; });
    console.log(info);
    console.log(logs.slice(0, 30).join('\n'));
    const video = page.video();
    await context.close(); // flushes the recording to disk
    await browser.close();
    const videoPath = await video.path();
    await rename(videoPath, `${prefix}.webm`);
    console.log(`video saved to ${prefix}.webm`);
    return;
  }
  if (mode === 'crash') {
    // run straight until dead, then screenshot game over; then try revive
    await page.evaluate(() => { window.__game.save.data.keys = 5; });
    await page.waitForFunction(() => window.__game && window.__game.state === 'dead', null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${prefix}_dead.png` });
    const info0 = await page.evaluate(() => { const g = window.__game; return `cause=${g.deathCause} dist=${g.distance.toFixed(0)} keys=${g.save.data.keys}`; });
    console.log(info0);
    await page.click('[data-act=revive]').catch((e) => logs.push('revive click failed ' + e.message));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${prefix}_revived.png` });
  }
  if (mode === 'soak') {
    const start = Date.now();
    let deaths = 0; const causes = {};
    await page.evaluate(() => { window.__game.save.data.keys = 9999; });
    // bot on
    await page.evaluate(() => {
      const g = window.__game;
      window.__roofTime = 0; window.__lastT = performance.now();
      window.__botTimer = setInterval(() => {
        const now = performance.now(); const dtb = (now - window.__lastT) / 1000; window.__lastT = now;
        if (g.state !== 'running') return;
        const p = g.player; const lane = p.targetLane;
        if (p.y > 2) window.__roofTime += dtb;
        const inLane = (l) => g.track.obstacles.filter((o) => o.lane === l && o.zNear < p.z + 1 && o.zNear > p.z - 18).sort((a, b) => b.zNear - a.zNear);
        const ahead = (l) => {
          const list = inLane(l);
          const first = list[0];
          if (!first) return null;
          if (first.kind === 'ramp') return null;                    // ramps are good: run up them
          if (first.kind === 'train' && p.y > 2 && first.zNear > p.z - 1) return null; // already on a roof
          return first;
        };
        const o = ahead(lane); if (!o) return;
        const dist = p.z - o.zNear; if (dist > 7.5) return;
        const free = (l) => Math.abs(l) <= 1 && !ahead(l);
        if (o.kind === 'barrier') { if (o.type === 'road_closed_gantry' || o.type === 'teargas') g._onInput('down'); else if (dist < 6.5) g._onInput('up'); }
        else if (o.kind === 'stumble') { if (dist < 6.5) g._onInput('up'); }
        else { if (free(lane - 1)) g._onInput('left'); else if (free(lane + 1)) g._onInput('right'); else if (lane === 0) g._onInput(Math.random() < 0.5 ? 'left' : 'right'); else g._onInput(lane < 0 ? 'right' : 'left'); }
      }, 100);
    });
    while (Date.now() - start < +seconds * 1000) {
      await page.waitForTimeout(500);
      const st = await page.evaluate(() => ({ state: window.__game.state, cause: window.__game.deathCause }));
      if (st.state === 'dead') {
        deaths++; causes[st.cause] = (causes[st.cause] || 0) + 1;
        await page.evaluate(() => { window.__game.reviveCount = 0; window.__game.revive(); });
      }
    }
    const info = await page.evaluate(() => { const g = window.__game; const m = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '?'; return `dist=${g.distance.toFixed(0)} speed=${g.speed.toFixed(1)} score=${g.run ? g.run.score.toFixed(0) : '-'} coins=${g.run ? g.run.coins : '-'} live=${g.track.pool.live} obstacles=${g.track.obstacles.length} decor=${g.track.decor.length} coinsLive=${g.track.coins.items.length} calls=${g.renderer.info.render.calls} geoms=${g.renderer.info.memory.geometries} heap=${m}`; });
    const roof = await page.evaluate(() => window.__roofTime.toFixed(1));
    console.log('SOAK', info, 'deaths=' + deaths, JSON.stringify(causes), 'roofTime=' + roof);
    await page.screenshot({ path: `${prefix}_soak.png` });
  }
  if (mode === 'ui') {
    const screens = ['showShop:items', 'showShop:characters', 'showShop:bikes', 'showShop:upgrades', 'showMissions', 'showDaily', 'showRecords', 'showSettings'];
    await page.evaluate(() => { window.__game.save.data.coins = 12345; window.__game.save.data.keys = 3; });
    for (const sc of screens) {
      const [fn, arg] = sc.split(':');
      await page.evaluate(([fn, arg]) => window.__ui[fn](arg), [fn, arg]);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${prefix}_${fn}${arg ? '_' + arg : ''}.png` });
    }
    // pause screen during a run
    await page.evaluate(() => { window.__ui.showMenu(); window.__ui.startFromMenu(); });
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.pause());
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${prefix}_pause.png` });
  }
  const n = +shots;
  const total = +seconds * 1000;
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(total / n);
    if (mode === 'auto' && i === 1) await page.keyboard.press('ArrowUp');
    if (mode === 'auto' && i === 2) await page.keyboard.press('ArrowLeft');
    if (mode === 'auto' && process.env.DUCK) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(+process.env.DUCK); }
    await page.screenshot({ path: `${prefix}_${i}.png` });
  }
  const info = await page.evaluate(() => { const g = window.__game; return g ? `state=${g.state} dist=${g.distance.toFixed(0)} score=${g.run ? g.run.score.toFixed(0) : '-'} coins=${g.run ? g.run.coins : '-'} fps=${g.fps.toFixed(0)} live=${g.track.pool.live} obstacles=${g.track.obstacles.length} calls=${g.renderer.info.render.calls} tris=${g.renderer.info.render.triangles}` : 'no game'; });
  console.log(info);
  console.log(logs.slice(0, 30).join('\n'));
  await browser.close();
})();
