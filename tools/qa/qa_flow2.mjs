import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await b.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true, isMobile: true })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
const out = [];
await page.goto('http://localhost:5199/'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const ev = (f, a) => page.evaluate(f, a);
// menu -> play
await ev(() => window.__ui.startFromMenu()); await page.waitForTimeout(1500);
out.push('state after tap: ' + await ev(() => window.__game.state));
// animations
out.push('jump clip: ' + await ev(() => { const g = window.__game; g._onInput('up'); return g.player.current; }));
await page.waitForTimeout(900);
out.push('duck clip: ' + await ev(() => { const g = window.__game; g._onInput('down'); return g.player.current; }));
await page.waitForTimeout(800);
out.push('lane change: ' + await ev(() => { const g = window.__game; g._onInput('left'); return g.player.targetLane; }));
// rangers present + visible at start
out.push('chaser visible at start: ' + await ev(() => window.__game.chaser.group.visible + ' dist=' + window.__game.chaser.dist.toFixed(1)));
// force death, revive keys, revive coins
await ev(() => { const g = window.__game; g.save.data.keys = 3; g.save.data.coins = 5000; g._die('police_barricade'); });
await page.waitForFunction(() => window.__game.state === 'dead', null, { timeout: 10000 });
out.push('dead, revive(keys): ' + await ev(() => window.__game.revive()) + ' state=' + await ev(() => window.__game.state));
await page.waitForTimeout(600);
await ev(() => window.__game._die('caught')); await page.waitForFunction(() => window.__game.state === 'dead', null, { timeout: 10000 });
out.push('reviveWithCoins: ' + await ev(() => window.__game.reviveWithCoins()) + ' coins=' + await ev(() => window.__game.save.data.coins));
await page.waitForTimeout(600);
// pause/resume
await ev(() => window.__game.pause()); out.push('paused: ' + await ev(() => window.__game.state)); await ev(() => window.__game.resume()); out.push('resumed: ' + await ev(() => window.__game.state));
// home + shop buy + open box + recolour
await ev(() => window.__game.goToMenu()); await page.waitForTimeout(500);
await ev(() => { window.__game.save.data.coins = 20000; window.__game.save.data.mysteryBoxes = 1; window.__ui.showShop('items'); });
await page.waitForTimeout(300); await page.click('[data-buy=hoverboard]'); await page.waitForTimeout(300);
out.push('bought turbo: hoverboards=' + await ev(() => window.__game.save.data.hoverboards));
await ev(() => window.__ui.showShop('items')); await page.waitForTimeout(300);
const openBtn = await page.$("[data-open]");
await ev(() => window.__ui.showShop('characters')); await page.waitForTimeout(300); await page.click('[data-buy-char=noor]'); await page.waitForTimeout(400);
out.push('noor unlocked: ' + await ev(() => window.__game.save.data.unlockedCharacters.includes('noor')));
await ev(() => { window.__game.save.data.character = 'noor'; window.__game.save.write(); window.__ui.showMenu(); }); await page.waitForTimeout(800);
out.push('jacket colour (noor): ' + await ev(() => { let c = null; window.__game.player.char.root.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m.name === 'jacket') c = '#' + m.color.getHexString(); } }); return c; }));
await page.screenshot({ path: 'shots/qa2_noor_menu.png' });
for (const t of ['showRecords', 'showMissions', 'showDaily', 'showSettings']) { await ev((t) => window.__ui[t](), t); await page.waitForTimeout(250); }
await ev(() => window.__ui.showRecords('badges')); await page.waitForTimeout(250);
// landmarks
for (const [d, n] of [[250, 'landmark_faisal'], [900, 'landmark_container_wall'], [2930, 'landmark_dchowk_gate']]) {
  await page.goto('http://localhost:5199/?auto=1&dist=' + d); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  out.push(n + ': ' + await ev((n) => { let f = false; window.__game.scene.traverse((o) => { if (o.name === n) f = true; }); return f; }, n));
}
console.log(out.join('\n')); console.log('errors: ' + (errs.length ? '\n' + errs.join('\n') : 'none'));
await b.close();
