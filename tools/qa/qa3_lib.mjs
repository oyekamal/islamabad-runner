// Shared harness for qa3_* scripts. Headed real-GPU Chromium against the dev server.
// Usage: const h = await launch(); const out = await h.run(async (qa, g) => {...}); await h.close();
import { chromium } from 'playwright';

export async function launch() {
  const b = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--window-position=0,0'] });
  const page = await (await b.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:5199/?auto=1'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.bringToFront(); await page.evaluate(INSTALL);
  return {
    page, b, errs,
    async run(fn) { return page.evaluate(`(${fn.toString()})(window.__qa, window.__game)`); },
    async close() { await b.close(); },
  };
}

// Installed into the page once. Builders bypass the random planner so every case is deterministic.
const INSTALL = `(() => {
  const g = window.__game, t = g.track, L = 2.2, TH = 2.6, RL = 6, TL = 12;
  const sleep = (ms) => new Promise((f) => setTimeout(f, ms));
  const frames = [];
  const orig = g._update.bind(g);
  const hooks = [];
  const errors = [];
  g._update = (dt) => { try { orig(dt); } catch (e) { errors.push(e.stack); if (errors.length > 3) return; throw e; } { const p = g.player; for (const h of hooks) if (!h.done && p.z < h.z) { h.done = true; h.fn(g, p); } } const p = g.player; frames.push({ t: +g.run.time.toFixed(3), z: +p.z.toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(3), gy: +p.groundY.toFixed(2), gr: p.grounded, vy: +p.vy.toFixed(1), laneT: +p.laneT.toFixed(2), lane: p.lane, st: g.state, cause: g.deathCause || '', inv: +g.invuln.toFixed(2), fly: p.flying, roll: p.rolling > 0, cc: g.run.closeCalls, bd: g.run.barriersDodged, tb: g.run.trainBumps, stm: g.run.stumbles }); if (frames.length > 4000) frames.shift(); };
  const qa = {
    L, TH, frames, hooks, errors,
    /** frame-precise trigger: fn(g,p) runs on the first sim step where player.z < z */
    at(z, fn) { hooks.push({ z, fn, done: false }); },
    input(z, name) { qa.at(z, (g) => g._onInput(name)); },
    /** ensure a running state, wipe the world ahead, set speed; returns player */
    async fresh(speed = 20, dist = 0) {
      if (g.state !== 'running') { g.startRun({ startDistance: dist }); await sleep(60); }
      hooks.length = 0; frames.length = 0; qa.clearAhead(); qa.setSpeed(speed); g.deathCause = null; g.invuln = 0; g.headstart = 0; g.player.setFlying(false); g.player.superJump = false; g.chaser.reset(); g.chaser.startRun(); g.chaser.nearTimer = 0; g.chaser.dist = 11; g.player.stumbling = 0; g.player.rolling = 0;
      return g.player;
    },
    clearAhead() {
      for (const o of t.obstacles) t._releaseObstacle(o);
      t.obstacles = []; t.movers = []; t.pendingMovers = [];
      for (const p of t.pickups) t.pool.release(p.mesh); t.pickups = [];
      t.coins.clear();
    },
    train(lane, zNear, coaches = 2, type = 'container_0') {
      const meshes = []; for (let i = 0; i < coaches; i++) meshes.push(t._place(type, lane * L, 0, zNear - i * TL));
      return t._obstacle('train', type, lane, zNear, coaches * TL, 0, TH, meshes[0], { meshes });
    },
    ramp(lane, zNear) { const m = t._place('dirt_ramp', lane * L, 0, zNear); return t._obstacle('ramp', 'ramp', lane, zNear, RL, 0, TH, m); },
    barrier(type, lane, z) { t._barrier(type, lane, z); return t.obstacles[t.obstacles.length - 1]; },
    pillar(lane, z) { const m = t._place('pillar', lane * L, 0, z + 0.7); return t._obstacle('solid', 'pillar', lane, z + 0.7, 1.4, 0, 4.4, m); },
    stumble(type, lane, z) { const m = t._place(type, lane * L, 0, z); return t._obstacle('stumble', type, lane, z + 0.4, 0.8, 0, type === 'tyre_stack' ? 0.7 : 0.9, m); },
    jeep(lane, spawnZ, speed = 12, count = 1) { t._spawnMover({ lane, count, spawnZ, speed }); return t.movers[t.movers.length - 1]; },
    tp(lane, z, y = 0) { const p = g.player; p.lane = p.targetLane = lane; p.laneT = 1; p.x = lane * L; p.z = z; p.y = y; p.groundY = y; p.grounded = true; p.vy = 0; p.jumping = false; p.rolling = 0; p.fastFall = false; g.invuln = 0; g.headstart = 0; },
    setSpeed(v) { g.distance = Math.max(0, (v - 15) / 0.0055); },
    /** Sample every 80 ms; fire inputs when player.z drops below trigger z; stop on death or stopZ or ms. */
    async watch({ ms = 8000, triggers = [], stopZ = -Infinity, logFrom = Infinity, logTo = -Infinity } = {}) {
      const out = []; const p = g.player; const t0 = performance.now(); const fired = new Set();
      while (performance.now() - t0 < ms) {
        for (const tr of triggers) if (!fired.has(tr) && p.z < tr.z) { fired.add(tr); if (tr.input) g._onInput(tr.input); if (tr.fn) tr.fn(g, p); }
        if (p.z < logFrom && p.z > logTo) out.push(qa.line());
        if (g.state !== 'running' || p.z < stopZ) { out.push(qa.line()); break; }
        await sleep(80);
      }
      return out;
    },
    line() { const p = g.player; return 'z=' + p.z.toFixed(1) + ' x=' + p.x.toFixed(2) + ' y=' + p.y.toFixed(2) + ' gY=' + p.groundY.toFixed(2) + ' gr=' + p.grounded + ' laneT=' + p.laneT.toFixed(2) + ' st=' + g.state + ' cause=' + (g.deathCause || '-') + ' inv=' + g.invuln.toFixed(2) + ' fly=' + p.flying; },
    framesIn(zFrom, zTo) { return frames.filter((f) => f.z < zFrom && f.z > zTo).map((f) => JSON.stringify(f)); },
    lastFrames(n) { return frames.slice(-n).map((f) => JSON.stringify(f)); },
    sleep,
  };
  window.__qa = qa;
})()`;

export function verdict(name, pass, evidence) { console.log(`\n=== ${name}: ${pass ? 'PASS' : 'FAIL'} — ${evidence}`); }
