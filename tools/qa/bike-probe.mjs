// Bike-power verification: each bike in BIKES must have an observable, distinct effect on a
// real run, matching its perkText. Run: CHROME=... node tools/qa/bike-probe.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5199/';
const BIKE_IDS = ['default', 'truckart', 'margalla', 'metro', 'lowrider', 'bouncer'];

const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 450, height: 800 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(BASE + '?auto=1&hover=1');
await page.waitForFunction(() => window.__ready);
await page.waitForTimeout(1500); // let the auto/hover=1 boot run settle before we take over

async function measureBike(id) {
  // ---- set up the bike + a fresh run --------------------------------
  await page.evaluate((bid) => {
    const g = window.__game;
    g.save.data.board = bid;
    if (!g.save.data.unlockedBoards.includes(bid)) g.save.data.unlockedBoards.push(bid);
    g.save.data.hoverboards = 5;
    g.startRun({});
  }, id);
  await page.waitForTimeout(150);

  // ---- activate Turbo, read hoverTimer at activation -----------------
  const hoverTimerAtActivation = await page.evaluate(() => {
    const g = window.__game;
    g.useHoverboard();
    return g.hoverTimer;
  });
  await page.waitForTimeout(150);

  // ---- Turbo speed (Game._update multiplies speed while p.hover) -----
  const speedWhileHover = await page.evaluate(() => window.__game.speed);

  // ---- coin gain: drop a coin exactly on the player, let one tick collect it, during Turbo
  const coinsGained = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    if (!p.hover) { g.save.data.hoverboards = 5; g.useHoverboard(); }
    g.track.coins.clear();       // remove ambient procedurally-placed coins so only our synthetic ones are counted
    g.run.coins = 0;
    g.track.coins.add(p.x, p.y + 0.9, p.z);
    g.track.coins.add(p.x, p.y + 0.9, p.z);
    g.track.coins.add(p.x, p.y + 0.9, p.z);
    await new Promise((r) => setTimeout(r, 120));
    return g.run.coins;
  });

  // ---- lane change duration, measured in exact SIMULATION TICKS (Player.update calls
  // at a fixed 1/60s each) rather than wall-clock ms or rAF frames — the headless page
  // renders at very low real fps under swiftshader, so _loop's per-frame MAX_STEPS=4
  // batching hides the ~1-tick difference this perk produces if measured in wall time.
  const laneChangeMs = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    const origUpdate = p.update.bind(p);
    let ticks = 0;
    let settledTicks = null;   // recorded on the exact tick laneT first reaches 1 — _loop's
                                // MAX_STEPS=4 per-frame batching means checking laneT between
                                // rAF frames (instead of between ticks) overshoots by up to 3
                                // ticks and washes out the ~1-tick difference this perk makes.
    p.update = (...args) => {
      const r = origUpdate(...args);
      ticks++;
      if (settledTicks === null && p.laneT >= 1) settledTicks = ticks;
      return r;
    };
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const dir = p.lane < 1 ? 1 : -1;
    p.moveLane(dir);
    while (settledTicks === null) await raf();
    p.update = origUpdate;
    return settledTicks * (1000 / 60);
  });

  // ---- jump peak height while Turbo is active -------------------------
  const jumpPeak = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    if (!p.grounded) p.snapTo(p.groundY);
    if (!p.hover) { g.save.data.hoverboards = 5; g.useHoverboard(); }
    await new Promise((r) => setTimeout(r, 60)); // let hover flag settle a frame before jumping
    const groundY = p.groundY;
    const jumped = p.jump();
    let peak = p.y;
    const t0 = performance.now();
    while (performance.now() - t0 < 1200) { peak = Math.max(peak, p.y); await new Promise((r) => setTimeout(r, 16)); }
    return { peak: peak - groundY, jumped, hoverAtJump: p.hover };
  });

  // ---- lowrider: does Turbo survive hitting a non-police barrier? -----
  const lowriderSurvived = await page.evaluate(async () => {
    const g = window.__game, p = g.player;
    if (!p.grounded) { p.snapTo(0); }
    if (!p.hover) { g.save.data.hoverboards = 5; g.useHoverboard(); }
    const hoverBefore = g.hoverTimer;
    g.track.obstacles.push({
      kind: 'barrier', type: 'tape', lane: p.lane, zNear: p.z + 0.3, zFar: p.z - 0.3,
      minX: p.x - 1, maxX: p.x + 1, yBot: 0, yTop: 2, mesh: null, meshes: [],
    });
    await new Promise((r) => setTimeout(r, 150));
    return { hoverBefore, hoverAfter: g.hoverTimer };
  });

  return { id, hoverTimerAtActivation, speedWhileHover, coinsGained, laneChangeMs, jumpPeak: jumpPeak.peak, jumpMeta: jumpPeak, lowriderSurvived };
}

const results = {};
for (const id of BIKE_IDS) results[id] = await measureBike(id);

await b.close();

// ---- report -----------------------------------------------------------
console.log('\nBike probe results:');
console.log('id        | hoverTimerAtAct | speedWhileHover | coinsGained | laneChangeMs | jumpPeak | lowriderSurvived');
for (const id of BIKE_IDS) {
  const r = results[id];
  console.log(
    id.padEnd(9), '|',
    String(r.hoverTimerAtActivation.toFixed(2)).padEnd(15), '|',
    String(r.speedWhileHover.toFixed(2)).padEnd(16), '|',
    String(r.coinsGained).padEnd(11), '|',
    String(r.laneChangeMs.toFixed(0)).padEnd(12), '|',
    String(r.jumpPeak.toFixed(2)).padEnd(8), '|',
    JSON.stringify(r.lowriderSurvived),
  );
}

// ---- assertions ---------------------------------------------------------
const base = results.default;
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(results.default.hoverTimerAtActivation > base.hoverTimerAtActivation - 0.01 && results.default.hoverTimerAtActivation >= 30.9,
  `default: hoverTimer should be baseline HOVERBOARD_TIME+1 (~31), got ${results.default.hoverTimerAtActivation}`);
check(Math.abs(results.truckart.hoverTimerAtActivation - 30) < 1,
  `truckart: hoverTimer should be plain HOVERBOARD_TIME (~30), got ${results.truckart.hoverTimerAtActivation}`);

check(results.default.hoverTimerAtActivation > results.truckart.hoverTimerAtActivation,
  `default should have a longer Turbo than truckart (extraHover perk), got default=${results.default.hoverTimerAtActivation} truckart=${results.truckart.hoverTimerAtActivation}`);

check(results.truckart.coinsGained >= 2 * base.coinsGained,
  `truckart: coins during Turbo should be ~2x default (${base.coinsGained}), got ${results.truckart.coinsGained}`);

check(results.margalla.laneChangeMs < base.laneChangeMs * 0.95,
  `margalla: lane change should be faster than default (${base.laneChangeMs}ms), got ${results.margalla.laneChangeMs}ms`);

check(results.metro.speedWhileHover > base.speedWhileHover * 1.05,
  `metro: Turbo speed should exceed default Turbo speed (${base.speedWhileHover}), got ${results.metro.speedWhileHover}`);

check(results.bouncer.jumpPeak > base.jumpPeak * 1.3,
  `bouncer: jump peak during Turbo should clearly exceed default (${base.jumpPeak}), got ${results.bouncer.jumpPeak}`);

check(results.lowrider.lowriderSurvived.hoverAfter > 0,
  `lowrider: Turbo should survive a non-police barrier hit, got hoverAfter=${results.lowrider.lowriderSurvived.hoverAfter}`);
check(results.default.lowriderSurvived.hoverAfter <= 0,
  `default: Turbo should be consumed (board-save) by the same barrier hit, got hoverAfter=${results.default.lowriderSurvived.hoverAfter}`);

if (pageErrors.length) failures.push('page errors: ' + pageErrors.join(' | '));

console.log('\n' + (failures.length ? 'FAIL' : 'PASS') + (failures.length ? ':\n - ' + failures.join('\n - ') : ' all bikes have distinct, working effects'));
process.exit(failures.length ? 1 : 0);
