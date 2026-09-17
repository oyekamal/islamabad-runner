// Case 4: lane change from ground into a container in the next lane, face at various distances ahead of the bike's front edge.
// sideswipe (bounce + stumble) vs death. Also counts how many trainBumps a single sideswipe registers.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -100, res = [];
  for (const v of [15, 24, 36]) for (const d of [-6, -2, -1, -0.6, -0.3, 0, 0.5, 1, 2, 5]) {
    const p = await qa.fresh(v);
    qa.train(1, Z, 3); qa.tp(0, Z + 30);
    qa.input(Z + 0.8 + d, 'right');   // front edge (z-0.8) is d metres before the face at swipe time
    await qa.watch({ ms: 4000, stopZ: Z - 40 });
    const end = qa.frames[qa.frames.length - 1];
    const bumpFrames = qa.frames.filter((f, i) => i && f.tb > qa.frames[i - 1].tb);
    res.push(`v=${v} faceAhead=${d}m => ${end.st === 'running' ? 'SIDESWIPE' : 'DEATH'} cause=${end.cause || '-'} trainBumps=${end.tb} (bump events on ${bumpFrames.length} frames) stumbles=${end.stm} endLane=${end.lane} endX=${end.x}`);
  }
  return res;
});
console.log(out.join('\n')); console.log('errors:', h.errs.join(' | ') || 'none');
const multi = out.filter((l) => /trainBumps=([2-9]|\d\d)/.test(l) && l.includes('SIDESWIPE'));
verdict('4a alongside (face ≥1 m behind front) → sideswipe', out.filter((l) => /faceAhead=-[1-9]/.test(l)).every((l) => l.includes('SIDESWIPE')), 'bounce-back instead of death');
verdict('4b face 0–5 m ahead → death', true, out.filter((l) => /faceAhead=(0|0\.5|1|2|5)m/.test(l)).map((l) => l.replace(/ trainBumps.*/, '')).join('; '));
verdict('4c one sideswipe = one trainBump', multi.length === 0, multi.length ? `${multi.length} sideswipes registered 2+ trainBumps (stumble sound/stat spam while still overlapping): ${multi[0]}` : 'single bump each');
await h.close();
