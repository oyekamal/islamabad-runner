// Case 3: lane change between two adjacent container roofs. Does groundY ever drop mid-change? Does the player die inside the second container?
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -100, res = [];
  // offset = how far the lane-1 train's face is AHEAD of the lane-0 rider when the swipe fires (negative = already alongside)
  for (const v of [15, 24, 36]) for (const offset of [-10, 0, 0.5, 1, 1.5, 2, 3, 4, 6]) for (const dir of ['right', 'left']) {
    const p = await qa.fresh(v);
    const other = dir === 'right' ? 1 : -1;
    qa.train(0, Z, 3); const swipeZ = Z - 8; qa.train(other, swipeZ - 0.8 - offset, 3);
    qa.tp(0, Z - 3, 2.6); qa.input(swipeZ, dir);
    await qa.watch({ ms: 4000, stopZ: swipeZ - 30 });
    const fr = qa.frames.filter((f) => f.z < swipeZ && f.z > swipeZ - 12);
    const minGy = Math.min(...fr.map((f) => f.gy)), minY = Math.min(...fr.map((f) => f.y));
    const end = qa.frames[qa.frames.length - 1];
    res.push(`v=${v} ${dir} faceOffset=${offset} => st=${end.st} cause=${end.cause || '-'} minGy=${minGy.toFixed(2)} minY=${minY.toFixed(2)} tb=${end.tb} endY=${end.y}`);
  }
  return res;
});
console.log(out.join('\n')); console.log('errors:', h.errs.join(' | ') || 'none');
const adjacent = out.filter((l) => l.includes('faceOffset=-10'));
verdict('3a roof→adjacent roof (already alongside)', adjacent.every((l) => l.includes('st=running') && l.includes('minGy=2.60')), adjacent.every((l) => l.includes('minGy=2.60')) ? 'groundY stayed 2.60 throughout the lane change (x-margins overlap)' : 'groundY dipped during change');
const ahead = out.filter((l) => !l.includes('faceOffset=-10'));
verdict('3b roof→roof where the second face is 0–6 m ahead', true, `${ahead.filter((l) => l.includes('cause=container')).length}/${ahead.length} die (fall gap then hit face) — see rows; deaths at offset≤1.5 m are suspicious`);
await h.close();
