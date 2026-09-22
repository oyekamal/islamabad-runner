// Gauntlet-loop verification probe for the tutorial/dead-tease/forward-pull/HUD-bleed fixes.
// node tools/qa/flow-probe.mjs
// Exits 1 if any check fails.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5199/';
const CHROME = process.env.CHROME;
let failures = 0;

function check(name, cond, evidence = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${name}${evidence ? ' — ' + evidence : ''}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});

async function freshPage(auto = false) {
  const ctx = await browser.newContext({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await page.goto(BASE + (auto ? '?auto=1' : ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  if (!auto) {
    // first-run name-editor modal blocks the menu — dismiss it same as a real first-time player would.
    const skip = page.locator('[data-act="skip"]');
    if (await skip.count()) await skip.click();
  }
  return { ctx, page, errs };
}

// ------------------------------------------------------------------ GAP 1: tutorial survives death, resumes, gates tutorialDone
{
  const { ctx, page, errs } = await freshPage(false);
  await page.click('[data-act="play"]');
  await page.waitForSelector('.tutorial', { timeout: 5000 });
  const step0 = await page.textContent('.tutorial');
  check('GAP1: fresh run shows tutorial step 1 (lanes)', /CHANGE LANES/.test(step0), step0);

  const box0 = await page.locator('.tutorial').boundingBox();
  check('GAP1/BUG: caption sits near the top, not over the rider (y<250 at 450x800)', box0 && box0.y < 250, box0 ? `y=${box0.y.toFixed(0)}` : 'no box');

  const stepAfterShow = await page.evaluate(() => window.__game.save.data.tutorialStep);
  check('GAP1: tutorialStep persisted the moment step 1 is shown', stepAfterShow === 1, `tutorialStep=${stepAfterShow}`);

  // Die during step 1 (before any swipe) — tutorialDone must NOT flip true.
  await page.evaluate(() => window.__game._die('container'));
  await page.waitForSelector('.panel.gameover', { timeout: 5000 });
  const tutorialDoneAtDeath = await page.evaluate(() => window.__game.save.data.tutorialDone);
  check('GAP1: tutorialDone still false after dying mid-tutorial (step 4-5 never shown)', tutorialDoneAtDeath === false, String(tutorialDoneAtDeath));

  await page.click('[data-act="home"]');
  await page.waitForSelector('[data-act="play"]', { timeout: 5000 });
  await page.click('[data-act="play"]');
  await page.waitForSelector('.tutorial', { timeout: 5000 });
  const step1 = await page.textContent('.tutorial');
  check('GAP1: next startRun resumes at step 2 (jump), not step 1 again', /JUMP/.test(step1), step1);

  // Fast-forward to the final step and confirm tutorialDone only flips once it is actually shown+completed.
  await page.evaluate(() => { const s = window.__game.save.data; s.tutorialStep = 4; s.tutorialDone = false; s.write ? s.write() : window.__game.save.write(); });
  await page.evaluate(() => window.__game._die('container'));
  await page.waitForSelector('.panel.gameover', { timeout: 5000 });
  await page.click('[data-act="home"]');
  await page.waitForSelector('[data-act="play"]', { timeout: 5000 });
  await page.click('[data-act="play"]');
  await page.waitForSelector('.tutorial', { timeout: 5000 });
  const step4 = await page.textContent('.tutorial');
  check('GAP1: resumed run shows final step 5 (turbo)', /TURBO/.test(step4), step4);
  const doneBeforeComplete = await page.evaluate(() => window.__game.save.data.tutorialDone);
  check('GAP1: tutorialDone still false while step 5 is up', doneBeforeComplete === false, String(doneBeforeComplete));
  await page.evaluate(() => window.__game.emit('hoverboard', { time: 5 }));   // simulate the turbo double-tap action
  await page.waitForTimeout(150);
  const doneAfterComplete = await page.evaluate(() => window.__game.save.data.tutorialDone);
  check('GAP1: tutorialDone flips true only after step 5 is shown+completed', doneAfterComplete === true, String(doneAfterComplete));

  check('GAP1: no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ GAP 2a + BUG: dead tease always shows an actionable line; HUD hidden under overlay
{
  const { ctx, page, errs } = await freshPage(false);
  await page.click('[data-act="play"]');
  await page.waitForSelector('#hud', { timeout: 5000 });
  const hudVisibleWhileRunning = await page.evaluate(() => getComputedStyle(document.querySelector('#hud')).display !== 'none');
  check('BUG-pre: HUD visible while running (sanity)', hudVisibleWhileRunning);

  await page.evaluate(() => window.__game._die('container'));
  await page.waitForSelector('.panel.gameover', { timeout: 5000 });

  const hudHiddenAtGameOver = await page.evaluate(() => { const h = document.querySelector('#hud'); return h ? getComputedStyle(h).display === 'none' : true; });
  check('BUG: HUD (pause/turbo) is hidden while game-over overlay is up', hudHiddenAtGameOver);

  const coinsBtn = await page.locator('[data-act="revive-coins"]');
  const coinsBtnCount = await coinsBtn.count();
  check('GAP2a: coin-revive option is always rendered (not hidden when unaffordable)', coinsBtnCount === 1, `count=${coinsBtnCount}`);
  if (coinsBtnCount === 1) {
    const disabled = await coinsBtn.getAttribute('disabled');
    const text = (await coinsBtn.textContent()).replace(/\s+/g, ' ').trim();
    check('GAP2a: coin-revive is disabled on a fresh (0-coin) save', disabled !== null, `disabled=${disabled}`);
    check('GAP2a: coin-revive shows an explicit "need X · have Y" style label', /Need/i.test(text) && /have/i.test(text), text);
  }
  const keysBtn = await page.locator('[data-act="revive"]');
  const keysText = (await keysBtn.textContent()).replace(/\s+/g, ' ').trim();
  check('GAP2a: key-revive option present with actionable "you have" label', /you have/i.test(keysText), keysText);

  await page.click('[data-act="home"]');
  await page.waitForSelector('[data-act="play"]', { timeout: 5000 });
  await page.click('[data-act="play"]');
  await page.waitForSelector('#hud', { timeout: 5000 });
  const hudVisibleAfterReplay = await page.evaluate(() => getComputedStyle(document.querySelector('#hud')).display !== 'none');
  check('BUG: HUD restored (visible again) on the next run', hudVisibleAfterReplay);

  check('GAP2a: no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ GAP 3: Bank + next-unlock + score-short lines
{
  const { ctx, page, errs } = await freshPage(false);
  await page.click('[data-act="play"]');
  await page.waitForSelector('#hud', { timeout: 5000 });
  await page.evaluate(() => {
    const g = window.__game;
    g.save.data.highScore = 99999;   // guarantee this run is NOT a record
    g.save.data.coins = 107;
    g.run.score = 504;
    g.run.coins = 7;
  });
  await page.evaluate(() => window.__game._afterDeath());   // skip the dying/hitstop timers, go straight to the gameOver payload
  await page.waitForSelector('.panel.gameover', { timeout: 5000 });
  const panelText = (await page.locator('.panel.gameover').textContent()).replace(/\s+/g, ' ');
  check('GAP3: game-over panel shows a Bank line', /Bank\s+[\d,]+/.test(panelText), panelText.match(/Bank[^·]*(·[^<]*)?/)?.[0] || '(no Bank line)');
  check('GAP3: game-over panel shows a "short of your best" score line', /short of your best/i.test(panelText), panelText.match(/[\d,]+ pts short of your best/)?.[0] || '(no score-short line)');
  check('GAP3: no NEW HIGH SCORE shown on a non-record run (sanity)', !/NEW HIGH SCORE/.test(panelText));

  check('GAP3: no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ GAP 2b: guaranteed key pickup within the first 500 m
{
  const { ctx, page, errs } = await freshPage(true);   // ?auto=1 starts the run immediately, no menu/tutorial in the way
  await page.waitForFunction(() => window.__game && window.__game.state === 'running', null, { timeout: 10000 });
  await page.evaluate(() => {
    const g = window.__game, t = g.track;
    window.__pickupLog = [];
    const orig = t._pickup.bind(t);
    t._pickup = (kind, lane, z, letter) => { window.__pickupLog.push(kind); return orig(kind, lane, z, letter); };
    // simple reflex bot, same shape as tools/play.js's mode=bot
    window.__botTimer = setInterval(() => {
      if (g.state !== 'running') return;
      const p = g.player;
      const lane = p.targetLane;
      const ahead = (l) => t.obstacles.filter((o) => o.lane === l && o.zNear < p.z + 1 && o.zNear > p.z - 16 && o.kind !== 'ramp' && !(o.kind === 'train' && p.y > 2)).sort((a, b) => b.zNear - a.zNear)[0];
      const o = ahead(lane);
      if (!o) return;
      const dist = p.z - o.zNear;
      if (dist > 7.5) return;
      const free = (l) => Math.abs(l) <= 1 && !ahead(l);
      if (o.kind === 'barrier') { if (o.type === 'road_closed_gantry' || o.type === 'teargas') g._onInput('down'); else g._onInput('up'); }
      else if (o.kind === 'stumble') g._onInput('up');
      else if (free(lane - 1)) g._onInput('left');
      else if (free(lane + 1)) g._onInput('right');
      else if (lane === 0) g._onInput(Math.random() < 0.5 ? 'left' : 'right');
      else g._onInput(lane < 0 ? 'right' : 'left');
    }, 120);
  });
  const deadline = Date.now() + 90000;
  let reached600 = false, finalDist = 0, finalState = '';
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => ({ dist: window.__game.distance, state: window.__game.state }));
    finalDist = st.dist; finalState = st.state;
    if (st.dist >= 600) { reached600 = true; break; }
    if (st.state === 'dead') {
      // bot died before 600 m — revive with debug keys and keep going so the check is meaningful either way
      await page.evaluate(() => { window.__game.save.data.keys = 99; window.__game.revive(); });
    }
  }
  const kinds = await page.evaluate(() => window.__pickupLog);
  const keyCount = kinds.filter((k) => k === 'key').length;
  // GAP A widened pickup eligibility to include the scripted warm-up blocks (0-180 m) so the
  // guaranteed first key can land inside the first 60 m. That guaranteed roll now fires inside the
  // synchronous GEN_AHEAD catch-up burst that runs the instant the run starts — before this
  // probe's post-"running" _pickup hook has a chance to attach — so the LIVE call-interception
  // count can legitimately read 0 even though the key was placed and is sitting in the world.
  // t.keyGiven is Track's own record of "a key has been placed this run" and isn't racy: it's read
  // after the fact, not captured mid-flight, so use it (with the intercepted log as corroboration
  // when it did win the race) as the source of truth for this check.
  const keyGivenFlag = await page.evaluate(() => window.__game.track.keyGiven === true);
  check('GAP2b: bot run reached >=600 m', reached600, `finalDist=${finalDist.toFixed(0)} state=${finalState}`);
  check('GAP2b: >=1 key pickup spawned by the time the run reached 600 m', keyCount >= 1 || keyGivenFlag, `keys spawned=${keyCount} (total pickups=${kinds.length}), track.keyGiven=${keyGivenFlag}`);

  check('GAP2b: no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ------------------------------------------------------------------ GAP A: fresh player is never softlocked by an early death
// Real bot deaths land at 15-69 m — the first-ever pickup roll used to fire only after 130-240 m,
// so a fresh 0-key/0-coin player saw an unactionable "SAVE ME" dead tease. Fix: DEFAULTS.keys=1
// (Save.js) + Track.reset() primes sincePickup so the first pickup spawns inside the first block.
{
  const { ctx, page, errs } = await freshPage(true);   // ?auto=1, fresh localStorage → fresh save (keys should default to 1)
  await page.waitForFunction(() => window.__game && window.__game.state === 'running', null, { timeout: 10000 });
  const keysOnFreshSave = await page.evaluate(() => window.__game.save.data.keys);
  check('GAP A: a brand-new save starts with 1 key (one revive in hand)', keysOnFreshSave === 1, `keys=${keysOnFreshSave}`);

  // Patch _pickup BEFORE the reset that generates the warm-up blocks (block 0 = 0-60 m), so we
  // capture what Track.reset() itself spawns in that first block — not a live-play race where the
  // pickup may already have spawned before this probe attached its listener.
  const pickupsByFirstBlock = await page.evaluate(() => {
    const g = window.__game, t = g.track;
    const log = [];
    const orig = t._pickup.bind(t);
    t._pickup = (kind, lane, z, letter) => { log.push({ kind, z }); return orig(kind, lane, z, letter); };
    t.reset();   // simulates the start of a fresh run — this is exactly what Game.startRun() triggers
    t._pickup = orig;
    return log;
  });
  // Drive distance to ~60 m (the upper end of the observed 15-69 m bot death window) without
  // relying on real-time simulation, then kill the run right there.
  await page.evaluate(() => { window.__game.distance = 60; });
  await page.waitForTimeout(50);
  const gameOverPayload = await new Promise(async (resolve) => {
    await page.exposeFunction('__reportGameOver', (payload) => resolve(payload)).catch(() => {});
    await page.evaluate(() => window.__game.on('gameOver', (d) => window.__reportGameOver({ canRevive: d.canRevive, canReviveWithCoins: d.canReviveWithCoins, keysNeeded: d.keysNeeded, coinsNeeded: d.coinsNeeded })));
    await page.evaluate(() => window.__game._die('container'));
  });
  check('GAP A: an early death (~60 m) leaves the player able to revive (keys or coins)', gameOverPayload.canRevive === true || gameOverPayload.canReviveWithCoins === true, JSON.stringify(gameOverPayload));
  check('GAP A: at least one pickup has spawned within the first 60 m block on a fresh run', pickupsByFirstBlock.length >= 1, `pickups=${JSON.stringify(pickupsByFirstBlock)}`);

  check('GAP A: no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
