#!/usr/bin/env node
// Runs after `vite build` (see package.json's "build" script). Walks dist/ and
// rewrites dist/sw.js so the service worker precaches every emitted file and
// bumps its cache name whenever the file list changes — this is what makes a
// fresh visit actually cache the app and later builds actually ship updates.
//
// public/sw.js is the checked-in template (has __CACHE_NAME__ / __PRECACHE_LIST__
// markers as comments); this script only ever touches the build output in dist/.
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = join(process.cwd(), 'dist');
const SW_PATH = join(DIST, 'sw.js');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function main() {
  if (!existsSync(DIST)) {
    console.error('[precache] dist/ not found — run `vite build` first');
    process.exit(1);
  }
  if (!existsSync(SW_PATH)) {
    console.error('[precache] dist/sw.js not found — is public/sw.js present?');
    process.exit(1);
  }

  const files = walk(DIST)
    .map((f) => relative(DIST, f).split(sep).join('/'))
    .filter((f) => f !== 'sw.js') // the SW doesn't need to precache itself; the browser updates it out-of-band
    .filter((f) => !f.endsWith('.map'))
    .sort();

  const relUrls = files.map((f) => './' + f);
  if (!relUrls.includes('./index.html')) relUrls.unshift('./index.html');

  const hash = createHash('sha256').update(relUrls.join('\n')).digest('hex').slice(0, 10);
  const cacheName = `islamabad-runner-${hash}`;

  let sw = readFileSync(SW_PATH, 'utf8');
  const beforeCache = sw;

  sw = sw.replace(
    /const CACHE = '.*?';.*$/m,
    `const CACHE = '${cacheName}';`
  );
  sw = sw.replace(
    /const PRECACHE = \[\];.*$/m,
    `const PRECACHE = ${JSON.stringify(relUrls)};`
  );

  if (sw === beforeCache) {
    console.error('[precache] failed to find CACHE/PRECACHE markers in dist/sw.js — template changed?');
    process.exit(1);
  }

  writeFileSync(SW_PATH, sw);
  console.log(`[precache] ${relUrls.length} files -> cache "${cacheName}"`);
}

main();
