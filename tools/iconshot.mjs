import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
for (const [pose, size] of [['icon', 1024], ['splash', 1024]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/icon.html?pose=' + pose);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/char_${pose}.png`, omitBackground: true });
  await page.close();
}
await browser.close();
