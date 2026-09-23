// A damaged or hand-edited save must never white-screen the game.
// Bug found 2026-09-23: a save with `stats: null` threw in _setupMissionBase and __ready never set.
// CHROME=... BASE=http://localhost:5199/ node tools/qa/save-probe.mjs
import { chromium } from 'playwright';
const KEY = 'islamabad-runner-save-v1';
const CASES = {
  'null stats': { stats: null },
  'null arrays': { leaderboard: null, unlockedBoards: null, achievementsDone: null, missionProgress: null },
  'null settings and upgrades': { settings: null, upgrades: null, daily: null },
  'wrong types': { coins: 'lots', stats: [], leaderboard: {}, missionSet: null },
  'empty object': {},
};
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
for (const [name, save] of Object.entries(CASES)) {
  const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [KEY, JSON.stringify(save)]);
  await page.goto((process.env.BASE || 'http://localhost:5199/') + '?auto=1');
  const booted = await page.waitForFunction(() => window.__ready, { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(2500);
  const ran = await page.evaluate(() => ({ state: window.__game?.state, dist: window.__game?.distance ?? 0 })).catch(() => ({}));
  const ok = booted && ran.state === 'running' && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} — boots and plays with ${name}${ok ? '' : ` — booted=${booted} state=${ran.state} errors=${errs.slice(0, 1).join('')}`}`);
  if (!ok) failed++;
  await page.close();
}
await browser.close();
console.log(failed ? `${failed} CHECK(S) FAILED` : 'save-probe: ALL PASS');
process.exit(failed ? 1 : 0);
