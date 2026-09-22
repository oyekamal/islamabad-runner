// Shop/garage UI probe: bikes tab shows all 6 bikes (or a visible scroll affordance), and every
// tappable button on riders/bikes/power-ups is >=44px tall (touch-target minimum).
// CHROME=~/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome BASE=http://localhost:5199/ node tools/qa/shop-probe.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5199/';
const CHROME = process.env.CHROME;

const fail = (msg) => { console.error('FAIL: ' + msg); process.exitCode = 1; };
const ok = (msg) => console.log('OK: ' + msg);

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));

  try {
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    const skipBtn = await page.$('[data-act=skip]');
    if (skipBtn) { await skipBtn.click(); await page.waitForTimeout(200); }

    // ---- 1. bikes tab: all 6 cards visible in-viewport, OR a scroll affordance is shown ----
    await page.evaluate(() => window.__ui.showShop('bikes'));
    await page.waitForTimeout(250);
    const bikeCheck = await page.evaluate(() => {
      const names = Array.from(document.querySelectorAll('.list .card .name'));
      const cardCount = names.length;
      const allFit = names.every((n) => n.getBoundingClientRect().bottom <= window.innerHeight);
      const hint = document.querySelector('.scroll-hint');
      const hintVisible = !!hint && !hint.hidden && hint.getBoundingClientRect().height > 0;
      return { cardCount, allFit, hintVisible };
    });
    if (bikeCheck.cardCount === 6) ok('bikes tab renders all 6 bike cards');
    else fail(`bikes tab rendered ${bikeCheck.cardCount} cards, expected 6`);
    if (bikeCheck.allFit) ok('all 6 bike card names fit within the viewport (no scroll needed)');
    else if (bikeCheck.hintVisible) ok('not all 6 bike cards fit, but a visible scroll affordance is shown');
    else fail('bike cards overflow the viewport AND no scroll affordance is visible');

    // ---- 2. distinct bike art: each bike card renders its own tinted SVG silhouette ----
    // the frame stroke is a fixed ink/white chosen for contrast against each card's own swatch
    // background, so the per-bike distinguishing signal is the wheel-rim colour + the swatch bg itself.
    const swatchFills = await page.evaluate(() => Array.from(document.querySelectorAll('.list .card .bike-swatch')).map((el) => ({
      bg: el.style.background, rim: el.querySelector('svg circle') && el.querySelector('svg circle').getAttribute('stroke'),
    })));
    const uniqueCombos = new Set(swatchFills.map((s) => `${s.bg}|${s.rim}`));
    if (swatchFills.length >= 6 && uniqueCombos.size >= 5) ok(`bike cards render distinct SVG silhouettes (${uniqueCombos.size}/${swatchFills.length} distinct bg+rim combos)`);
    else fail(`expected near-all-distinct bike card art, got ${uniqueCombos.size}/${swatchFills.length} distinct combos: ${JSON.stringify(swatchFills)}`);

    // ---- 2b. GAP B: the 6 bikes must draw genuinely different GEOMETRY, not just different
    // colours on one shared silhouette. Strip numeric attrs' colour values and compare the raw
    // d/points/x/y/r shape data pairwise — all 6 must be distinct.
    const geometries = await page.evaluate(() => Array.from(document.querySelectorAll('.list .card .bike-swatch svg')).map((svg) => {
      const shapeEls = Array.from(svg.querySelectorAll('path, circle, rect, ellipse, polygon, polyline'));
      return shapeEls.map((el) => {
        const tag = el.tagName.toLowerCase();
        const geo = ['d', 'points', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'ry'].map((attr) => el.getAttribute(attr) || '').join('|');
        return `${tag}:${geo}`;
      }).join(';');
    }));
    const uniqueGeometries = new Set(geometries);
    if (geometries.length === 6 && uniqueGeometries.size === 6) ok(`GAP B: all 6 bikes render pairwise-distinct SVG geometry (${uniqueGeometries.size}/6 unique)`);
    else fail(`GAP B: expected 6 pairwise-distinct bike geometries, got ${uniqueGeometries.size}/${geometries.length} unique: ${JSON.stringify(geometries)}`);

    // ---- 3. button heights >=44px on riders/bikes/power-ups tabs ----
    for (const tab of ['characters', 'bikes', 'upgrades']) {
      await page.evaluate((t) => window.__ui.showShop(t), tab);
      await page.waitForTimeout(200);
      const heights = await page.evaluate(() => Array.from(document.querySelectorAll('.tabs .tab, .list button.btn')).map((b) => ({ text: b.textContent.trim().slice(0, 20), h: b.getBoundingClientRect().height })));
      const short = heights.filter((b) => b.h < 44);
      if (short.length === 0) ok(`tab "${tab}": all ${heights.length} tappable buttons are >=44px tall`);
      else fail(`tab "${tab}": ${short.length} button(s) under 44px tall: ${JSON.stringify(short)}`);
    }

    // ---- 4. locked cards show a lock affordance; owned/selected show a badge ----
    await page.evaluate(() => window.__ui.showShop('bikes'));
    await page.waitForTimeout(200);
    const badgeCheck = await page.evaluate(() => {
      const selected = document.querySelector('.tag-selected');
      const cards = Array.from(document.querySelectorAll('.list .card'));
      const anyLockGlyph = cards.some((c) => c.textContent.includes('🔒'));
      return { hasSelected: !!selected, anyLockGlyph };
    });
    if (badgeCheck.hasSelected) ok('the currently-selected bike shows a SELECTED badge');
    else fail('no SELECTED badge found on the bikes tab');
    if (badgeCheck.anyLockGlyph) ok('at least one unaffordable bike shows a 🔒 lock glyph');
    else fail('no 🔒 lock glyph found among unaffordable bikes (expected — starting coins are 0)');

    // ---- 5. garage/riders nav label matches what it opens ----
    await page.evaluate(() => window.__ui.showMenu());
    await page.waitForTimeout(200);
    const navText = await page.evaluate(() => { const b = document.querySelector('[data-act=chars]'); return b ? b.textContent.trim() : null; });
    if (navText && !/garage/i.test(navText)) ok(`nav button opening the riders tab is labeled "${navText}" (not the mismatched "Garage")`);
    else fail(`nav button text is "${navText}", still reads "Garage" while opening the riders tab`);

    await page.screenshot({ path: 'shots/shop-probe-bikes.png' });
  } catch (e) {
    fail('exception: ' + (e && e.stack || e));
  }

  if (logs.length) console.log('console/page logs:\n' + logs.join('\n'));
  await browser.close();
  if (process.exitCode) console.error('shop-probe: FAILED');
  else console.log('shop-probe: ALL PASS');
})();
