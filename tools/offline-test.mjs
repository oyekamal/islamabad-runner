#!/usr/bin/env node
// Offline-PWA proof. Requires a fresh `npm run build` (dist/ must exist and its
// sw.js must already be precache-rewritten by tools/precache.mjs, which `npm run
// build` runs automatically).
//
// Two-terminal alternative to the auto-spawn below, if you'd rather watch the
// preview server's own logs:
//   Terminal 1: npx vite preview --port 5201 --strictPort
//   Terminal 2: BASE=http://localhost:5201/ node tools/offline-test.mjs --no-spawn
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 5201;
const BASE = process.env.BASE || `http://localhost:${PORT}/`;
const CHROME = '/home/oye/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const NO_SPAWN = process.argv.includes('--no-spawn');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`preview server at ${url} did not come up in ${timeoutMs}ms`);
}

async function main() {
  let preview = null;
  let previewOut = '';
  if (!NO_SPAWN) {
    preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    preview.stdout.on('data', (d) => { previewOut += d; });
    preview.stderr.on('data', (d) => { previewOut += d; });
  }

  let exitCode = 0;
  let browser = null;
  try {
    await waitForServer(BASE);

    browser = await chromium.launch({
      executablePath: CHROME,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
    });
    const context = await browser.newContext({ viewport: { width: 450, height: 800 } });
    const page = await context.newPage();

    const failedRequests = [];
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()} :: ${(r.failure() || {}).errorText || 'unknown'}`));

    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

    // src/main.js only registers the SW on `location.protocol === 'https:'`, and
    // localhost over http doesn't qualify — register it explicitly here instead,
    // the same registration call a real https deploy would trigger on its own.
    await page.evaluate(() => navigator.serviceWorker.register('./sw.js'));
    await page.evaluate(() => navigator.serviceWorker.ready);

    // Wait for the precache to actually finish: poll the SW's cache until its key
    // count is non-zero and holds steady across two consecutive checks.
    const precacheCount = await page.evaluate(async () => {
      let prev = -1;
      let stable = 0;
      const start = Date.now();
      while (Date.now() - start < 30000) {
        const names = await caches.keys();
        const name = names.find((n) => n.startsWith('islamabad-runner-'));
        const count = name ? (await (await caches.open(name)).keys()).length : 0;
        if (count > 0 && count === prev) {
          stable++;
          if (stable >= 2) return count;
        } else {
          stable = 0;
        }
        prev = count;
        await new Promise((r) => setTimeout(r, 500));
      }
      return prev;
    });

    if (!precacheCount || precacheCount <= 0) {
      throw new Error('precache never populated (0 files cached) — check dist/sw.js was rewritten by tools/precache.mjs');
    }
    console.log(`[offline-test] precache complete: ${precacheCount} files cached`);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

    if (failedRequests.length) {
      console.log('[offline-test] failed requests while offline:');
      for (const f of failedRequests) console.log('  ' + f);
    }

    console.log(`PASS — app booted offline (${precacheCount} precached files, ${failedRequests.length} failed requests while offline)`);
  } catch (err) {
    exitCode = 1;
    console.log('FAIL —', err.message);
    if (previewOut) {
      console.log('--- vite preview output ---');
      console.log(previewOut);
    }
  } finally {
    if (browser) await browser.close();
    if (preview) preview.kill();
  }
  process.exit(exitCode);
}

main();
