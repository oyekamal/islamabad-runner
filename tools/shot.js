// Usage: node tools/shot.js <url-path-and-query> <out.png> [width] [height] [waitMs]
// Screenshot helper using headless chromium with SwiftShader WebGL.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [, , urlPath, out, w = '800', h = '800', wait = '1500'] = process.argv;
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5173' + urlPath, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__done === true, null, { timeout: 20000 }); } catch (e) { logs.push('timeout waiting __done'); }
  await page.waitForTimeout(+wait);
  const info = await page.evaluate(() => (document.getElementById('info') || {}).textContent || '');
  await page.screenshot({ path: out });
  console.log(info);
  console.log(logs.filter(l => !l.startsWith('log:')).slice(0, 20).join('\n'));
  await browser.close();
})();
