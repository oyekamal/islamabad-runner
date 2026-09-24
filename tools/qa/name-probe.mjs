// Probe for the player-name feature: menu pill/modal, persistence across reload, and game-over/leaderboard name.
// node tools/qa/name-probe.mjs
// The edit-name clicks use { force: true }: under headless SwiftShader plus heavy machine load,
// Playwright's default click waits for the target's bounding box to be pixel-stable across two
// animation frames before it will click, and a busy WebGL canvas can jitter forever without ever
// settling. Confirmed with a direct dispatchEvent(new MouseEvent) call that the underlying app
// opens the editor instantly regardless -- the wait, not the app, was what timed out.
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
    // ---- 1. fresh load: first-launch name modal should surface with "Guest" ----
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await page.waitForSelector('.name-input', { timeout: 5000 }).catch(() => {});
    const bodyText1 = await page.textContent('body');
    if (bodyText1.includes('Guest')) ok('menu/first-launch modal shows "Guest"');
    else fail('"Guest" not visible on first load');

    // dismiss the first-launch modal via Skip ("Play as Guest") to get a clean menu
    const skipBtn = await page.$('[data-act=skip]');
    if (skipBtn) await skipBtn.click();
    await page.waitForTimeout(200);

    // ---- 2. open the editor from the menu pill, type "Ali", save ----
    await page.click('[data-act=edit-name]', { force: true });
    await page.waitForSelector('.name-input', { timeout: 3000 });
    await page.fill('.name-input', 'Ali');
    await page.click('[data-act=save]');
    await page.waitForTimeout(200);
    const bodyText2 = await page.textContent('body');
    if (bodyText2.includes('Ali')) ok('name pill shows "Ali" after save');
    else fail('"Ali" not visible in menu after saving name');

    // ---- 3. reload: name should persist via localStorage ----
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    // totalRuns is still 0 post-reload, so the first-launch modal may auto-surface again (once per
    // session, per UI._nameModalOffered) — dismiss it via Skip (it must not overwrite the saved name).
    const reloadSkip = await page.$('[data-act=skip]');
    if (reloadSkip) { await reloadSkip.click(); await page.waitForTimeout(200); }
    const bodyText3 = await page.textContent('body');
    if (bodyText3.includes('Ali')) ok('"Ali" persists after reload');
    else fail('"Ali" did not persist after reload');
    const savedName = await page.evaluate(() => window.__game.save.data.playerName);
    if (savedName === 'Ali') ok('save.data.playerName === "Ali" after reload + dismiss');
    else fail('save.data.playerName is "' + savedName + '", expected "Ali"');

    // ---- 4. start a run, kill the player, check game-over screen shows the name ----
    await page.evaluate(() => { window.__game.startRun({}); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.__game._die('test'); });
    await page.waitForTimeout(3000);
    const bodyText4 = await page.textContent('body');
    if (bodyText4.includes('Ali')) ok('game-over screen contains "Ali"');
    else fail('game-over screen does not contain "Ali"');

    await page.screenshot({ path: 'shots/name-probe-gameover.png' });

    // ---- 5. Unicode name (Urdu): must be accepted, not silently stripped to "Guest" ----
    await page.evaluate(() => { window.__ui.showMenu(); });
    await page.waitForTimeout(200);
    await page.click('[data-act=edit-name]', { force: true });
    await page.waitForSelector('.name-input', { timeout: 3000 });
    await page.fill('.name-input', 'علی');
    await page.waitForTimeout(100);
    const urduValid = await page.evaluate(() => !document.querySelector('[data-act=save]').disabled);
    if (urduValid) ok('Urdu name "علی" is accepted (Save enabled, no silent ASCII strip)');
    else fail('Urdu name "علی" left Save disabled — still ASCII-only under the hood');
    await page.click('[data-act=save]');
    await page.waitForTimeout(200);
    const savedUrdu = await page.evaluate(() => window.__game.save.data.playerName);
    if (savedUrdu === 'علی') ok('save.data.playerName === "علی" after saving a Unicode name');
    else fail('save.data.playerName is "' + savedUrdu + '", expected "علی" (Urdu name was mangled/stripped)');
    const bodyText5 = await page.textContent('body');
    if (bodyText5.includes('علی')) ok('menu pill shows the Urdu name "علی"');
    else fail('menu pill does not show the Urdu name "علی"');

    // ---- 6. inline validation errors: empty name and disallowed characters ----
    await page.click('[data-act=edit-name]', { force: true });
    await page.waitForSelector('.name-input', { timeout: 3000 });
    await page.fill('.name-input', '');
    await page.waitForTimeout(100);
    let errText = await page.evaluate(() => document.querySelector('.name-error').textContent);
    let saveDisabled = await page.evaluate(() => document.querySelector('[data-act=save]').disabled);
    if (errText === "Name can't be empty" && saveDisabled) ok('empty name shows "Name can\'t be empty" and disables Save');
    else fail(`empty name: expected error "Name can't be empty" + Save disabled, got error="${errText}" disabled=${saveDisabled}`);

    await page.fill('.name-input', 'a!!b##');
    await page.waitForTimeout(100);
    errText = await page.evaluate(() => document.querySelector('.name-error').textContent);
    saveDisabled = await page.evaluate(() => document.querySelector('[data-act=save]').disabled);
    if (errText === 'Letters and numbers only' && saveDisabled) ok('disallowed characters show "Letters and numbers only" and disable Save');
    else fail(`invalid chars: expected error "Letters and numbers only" + Save disabled, got error="${errText}" disabled=${saveDisabled}`);

    // valid name restores Save and clears the error, with a live n/12 counter
    await page.fill('.name-input', 'Bilal');
    await page.waitForTimeout(100);
    const finalState = await page.evaluate(() => ({
      err: document.querySelector('.name-error').textContent,
      disabled: document.querySelector('[data-act=save]').disabled,
      count: document.querySelector('.name-count').textContent,
    }));
    if (!finalState.disabled && finalState.err === '' && finalState.count === '5/12') ok('valid name "Bilal" clears the error, enables Save, and shows live counter "5/12"');
    else fail('valid name did not restore a clean state: ' + JSON.stringify(finalState));
    await page.click('[data-act=save]');
    await page.waitForTimeout(200);

    await page.screenshot({ path: 'shots/name-probe-validation.png' });
  } catch (e) {
    fail('exception: ' + (e && e.stack || e));
  }

  if (logs.length) console.log('console/page logs:\n' + logs.join('\n'));
  await browser.close();
  if (process.exitCode) console.error('name-probe: FAILED');
  else console.log('name-probe: ALL PASS');
})();
