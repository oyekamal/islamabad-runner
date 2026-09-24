#!/usr/bin/env node
// Weather layer (WeatherCheck.js / Game.js._applyWeather / UI.js weather badge) proof.
// CHROME=... BASE=http://localhost:5199/ node tools/qa/weather-probe.mjs
//
// (a) OFFLINE-FIRST, NEVER BREAKS: block every request to api.open-meteo.com and confirm the game
//     still boots, still runs (distance > 40 within a few seconds), and throws zero page errors.
//     This is the one that matters most per Kamal's brief — weather is a bonus, never a dependency.
// (b) LIVE FETCH WORKS: with the real network, a fetch resolves within ~6s, window.__game.weather.state
//     has a valid bucket + boolean is_day, and the menu's .weather-pill text becomes non-empty.
// (c) NIGHT STAYS PLAYABLE: sample real rendered pixel luminance (gl.readPixels averaged to
//     0.299R+0.587G+0.114B, the standard perceptual-luminance weighting) for day vs. the worst
//     realistic night combo (night + storm, the darkest weather bucket) and assert night isn't
//     "drastically darker". Threshold: night luminance >= 55% of day luminance. Justification: a
//     genuine day/night swing in an outdoor scene is real (shadows shift, sky darkens) — some drop
//     is expected and fine — but Kamal was explicit that night must never read as hard-to-see, so
//     55% is a floor well above where scenes start looking murky (typical "looks dark" complaints
//     start under ~35-40% of daytime brightness in informal contrast-perception terms), while still
//     leaving room for a genuinely moodier blue-hour palette rather than a flat re-lit clone of day.
import { chromium } from 'playwright';

const CHROME = process.env.CHROME || '/home/oye/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://localhost:5199/';
const NIGHT_MIN_RATIO = 0.55;

let failed = 0;
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });

function verdict(name, pass, evidence) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}: ${evidence}`);
  if (!pass) failed++;
}

// ---------------------------------------------------------------- (a) offline never breaks
{
  const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**://api.open-meteo.com/**', (route) => route.abort());
  await page.goto(BASE + '?auto=1');
  const booted = await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).then(() => true).catch(() => false);
  let dist = -1;
  if (booted) {
    dist = await page.waitForFunction(() => (window.__game?.distance || 0) > 40, null, { timeout: 15000 })
      .then(() => page.evaluate(() => window.__game.distance))
      .catch(() => page.evaluate(() => window.__game?.distance ?? -1));
  }
  const weatherState = booted ? await page.evaluate(() => window.__game?.weather?.state ?? null) : null;
  const ok = booted && dist > 40 && errs.length === 0;
  verdict('offline: boots, plays past 40m, zero errors', ok,
    `booted=${booted} distance=${typeof dist === 'number' ? dist.toFixed(1) : dist} errors=${errs.length}${errs.length ? ' :: ' + errs.slice(0, 2).join(' | ') : ''} weather.source=${weatherState?.source ?? 'n/a'}`);
  await page.close();
}

// ---------------------------------------------------------------- (b) live fetch resolves + badge fills
{
  const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const resolved = await page.waitForFunction(() => {
    const s = window.__game?.weather?.state;
    return s && s.source === 'live' && typeof s.bucket === 'string' && typeof s.is_day === 'boolean';
  }, null, { timeout: 6000 }).then(() => true).catch(() => false);
  const state = await page.evaluate(() => window.__game?.weather?.state ?? null);
  const badgeText = await page.evaluate(() => document.querySelector('.weather-pill')?.textContent?.trim() ?? '');
  const validBucket = ['clear', 'cloudy', 'haze', 'rain', 'storm', 'snow'].includes(state?.bucket);
  const ok = resolved && validBucket && typeof state.is_day === 'boolean' && badgeText.length > 0 && errs.length === 0;
  verdict('live: fetch resolves <=6s, valid bucket/is_day, badge non-empty', ok,
    `resolved=${resolved} state=${JSON.stringify(state)} badge="${badgeText}" errors=${errs.length}`);
  await page.close();
}

// ---------------------------------------------------------------- (c) night stays playable
async function luminance(url) {
  const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(2200);   // let the run establish (obstacles/skyline/track laid out)
  const v = await page.evaluate(() => {
    const g = window.__game;
    g._render();
    const gl = g.renderer.getContext();
    const w = g.renderer.domElement.width, h = g.renderer.domElement.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 4) sum += 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
    return sum / (w * h);
  });
  await page.close();
  return v;
}
{
  const dayLum = await luminance(BASE + '?auto=1&weather=clear&day=1');
  const nightLum = await luminance(BASE + '?auto=1&weather=storm&day=0');   // worst realistic combo
  const ratio = nightLum / dayLum;
  const ok = ratio >= NIGHT_MIN_RATIO;
  verdict('night (+storm) not drastically darker than day', ok,
    `day=${dayLum.toFixed(2)} night+storm=${nightLum.toFixed(2)} ratio=${ratio.toFixed(3)} (min ${NIGHT_MIN_RATIO})`);
}

await browser.close();
console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nweather-probe: ALL PASS');
process.exit(failed ? 1 : 0);
