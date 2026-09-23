// Voice stingers must be pure upside: funny when present, invisible when absent.
// Asserts the game plays with NO recorded clips, the setting silences them, variants never repeat
// back to back, the rate limiter stops chatter, and a 404 clip never throws.
// CHROME=... BASE=http://localhost:5199/ node tools/qa/voice-probe.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`); };

await page.goto((process.env.BASE || 'http://localhost:5199/') + '?auto=1');
await page.waitForFunction(() => window.__ready);
await page.evaluate(() => window.__game.audio.init());

// the game must run whether or not clips are present. Wait for distance rather than sleeping a
// fixed time: headless SwiftShader is 4-8 fps and slower still when other agents share the machine.
const moved = await page.waitForFunction(() => window.__game.distance > 40, { timeout: 60000 }).then(() => true).catch(() => false);
const run = await page.evaluate(() => ({ dist: window.__game.distance, state: window.__game.state, loaded: window.__game.audio.voice.available }));
check('game runs normally regardless of voice clips', moved && run.state === 'running', `dist=${run.dist.toFixed(0)} clipsLoaded=${run.loaded}`);

// every trigger must be safe to fire, recorded or not
const fired = await page.evaluate(() => {
  const g = window.__game, out = {};
  for (const t of ['powerup', 'closeCall', 'turbo', 'milestone', 'highScore', 'death', 'revive', 'dizzy']) {
    g.audio.voice._lastAt = -Infinity;
    try { out[t] = g.audio.say(t); } catch (e) { out[t] = 'THREW: ' + e.message; }
  }
  return out;
});
check('every trigger plays without throwing', Object.values(fired).every((v) => v === true), JSON.stringify(fired));

// no variant twice in a row
const repeats = await page.evaluate(() => {
  const v = window.__game.audio.voice;
  let prev = -1, bad = 0;
  for (let i = 0; i < 60; i++) { const k = v._pick('powerup', 5); if (k === prev) bad++; prev = k; }
  return bad;
});
check('never picks the same variant twice in a row', repeats === 0, `backToBack=${repeats} over 60 draws`);

// rate limiter
const gap = await page.evaluate(() => {
  const g = window.__game;
  g.audio.voice._lastAt = -Infinity;
  g.audio.voice._lastPer.clear();
  const first = g.audio.say('powerup');
  const immediate = g.audio.say('closeCall');   // different trigger, still refused: too soon overall
  return { first, immediate };
});
check('rate limiter blocks a second line fired immediately', gap.first === true && gap.immediate === false, JSON.stringify(gap));

// the setting silences it
const off = await page.evaluate(() => {
  const g = window.__game;
  g.save.data.settings.voice = false;
  g.audio.voice._lastAt = -Infinity;
  const r = g.audio.say('powerup');
  g.save.data.settings.voice = true;
  return r;
});
check('voice setting off silences voice lines', off === false);

// a missing clip is remembered, not retried forever, and never throws
const miss = await page.evaluate(async () => {
  const v = window.__game.audio.voice;
  const r = await v._load('definitely_not_a_real_line');
  return { result: r, remembered: v.missing.has('definitely_not_a_real_line') };
});
check('a missing clip fails soft and is remembered', miss.result === null && miss.remembered === true);

// clustered pickups (a magnet sweeping several at once) must not turn into chatter
const cluster = await page.evaluate(() => {
  const g = window.__game, v = g.audio.voice;
  v._lastAt = -Infinity; v._lastPer.clear();
  let spoke = 0;
  for (let i = 0; i < 5; i++) { if (g.audio.say('powerup')) spoke++; v._lastAt = -Infinity; }  // same trigger, back to back
  return spoke;
});
check('repeated power-up pickups do not chatter', cluster === 1, `spoke ${cluster} times for 5 rapid pickups`);

check('no page errors', pageErrors.length === 0, pageErrors.join('; '));
await browser.close();
const failed = checks.filter((c) => !c.pass).length;
console.log(failed ? `${failed} CHECK(S) FAILED` : `voice-probe: ALL ${checks.length} PASS`);
process.exit(failed ? 1 : 0);
