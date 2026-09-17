// Recheck 12b/12c/12d with a forced run restart per sub-case (stats as deltas) and the death frame printed.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  const restart = async (v) => { g.startRun(); await qa.sleep(60); return qa.fresh(v); };
  { const p = await restart(20); qa.tp(0, Z + 30); qa.barrier('road_closed_gantry', 0, Z); g.save.data.hoverboards = 3; g.useHoverboard();
    await qa.watch({ ms: 3000, stopZ: Z - 10 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12b Turbo-save on gantry: barriersDodged=${end.bd} closeCalls=${end.cc} ${end.st}`); }
  { const p = await restart(20); qa.train(0, Z, 1); qa.train(0, Z - 12, 2); qa.tp(0, Z - 2, 2.6); qa.input(Z - 12 + 20 * 0.2, 'right');
    await qa.watch({ ms: 3000, stopZ: Z - 30 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12c swipe off roof 4 m before the next coach: closeCalls=${end.cc} ${end.st}`); }
  for (const d of [1.5, 3, 5]) { const p = await restart(20); qa.tp(0, Z + 30); qa.barrier('police_barricade', 0, Z); qa.input(Z + d, 'right');
    await qa.watch({ ms: 3000, stopZ: Z - 15 }); const end = qa.frames[qa.frames.length - 1]; const i = qa.frames.findIndex((f) => f.st !== 'running');
    res.push(`12d swipe out ${d} m before barricade: barriersDodged=${end.bd} closeCalls=${end.cc} ${end.st} ${end.cause || ''} | frames: ${(i > 0 ? qa.frames.slice(i - 3, i + 1) : qa.frames.filter((f) => f.z < Z + 2 && f.z > Z - 2)).map((f) => `z${(f.z - Z).toFixed(2)} x${f.x} y${f.y} ${f.st}`).join(' ')}`); }
  return res;
});
console.log(out.join('\n'));
await h.close();
