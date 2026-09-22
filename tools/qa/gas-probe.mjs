// Teargas must never end a run. It makes the rider dizzy: reversed steering for a few seconds,
// then a clean recovery. Requested by Kamal 2026-09-22 ("smoke will not end the game, smoke will
// make the agent dizzy"). Exercises the real collision path, not just the internal handler.
// CHROME=... BASE=http://localhost:5199/ node tools/qa/gas-probe.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto((process.env.BASE || 'http://localhost:5199/') + '?auto=1');
await page.waitForFunction(() => window.__ready);

const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ' — ' + detail : ''}`); };

// drop a teargas cloud in the rider's own lane, just ahead, and let them ride into it
await page.evaluate(() => {
  const g = window.__game;
  g.player.targetLane = g.player.lane = 0;
  g.track._barrier('teargas', 0, g.player.z - 14);
});
const gassed = await page.waitForFunction(() => window.__game.dizzy > 0, { timeout: 15000 }).then(() => true).catch(() => false);
check('riding into teargas makes the rider dizzy', gassed);

const after = await page.evaluate(() => ({ state: window.__game.state, dead: window.__game.player.dead, dizzy: window.__game.dizzy }));
check('the run does NOT end on teargas', after.state === 'running' && after.dead === false, `state=${after.state} dead=${after.dead}`);
check('dizzy overlay is on screen', await page.locator('.dizzy-fx').count() > 0);

// steering is inverted while dizzy: a 'left' swipe should move the rider RIGHT
const rev = await page.evaluate(() => {
  const g = window.__game;
  g.player.targetLane = g.player.lane = 0;
  g._onInput('left');
  return { target: g.player.targetLane, dizzy: g.dizzy };
});
check('steering is reversed while dizzy', rev.target === 1, `left input -> lane ${rev.target}`);

// and it wears off on its own
const recovered = await page.waitForFunction(() => window.__game.dizzy === 0, { timeout: 15000 }).then(() => true).catch(() => false);
check('dizziness wears off by itself', recovered);
const norm = await page.evaluate(() => {
  const g = window.__game;
  g.player.targetLane = g.player.lane = 0;
  g._onInput('left');
  return { target: g.player.targetLane, state: g.state };
});
check('steering is normal again afterwards', norm.target === -1, `left input -> lane ${norm.target}`);
check('run still alive after recovery', norm.state === 'running', `state=${norm.state}`);
check('no page errors', pageErrors.length === 0, pageErrors.join('; '));

await browser.close();
const failed = checks.filter((c) => !c.pass);
console.log(failed.length ? `${failed.length} CHECK(S) FAILED` : `gas-probe: ALL ${checks.length} PASS`);
process.exit(failed.length ? 1 : 0);
