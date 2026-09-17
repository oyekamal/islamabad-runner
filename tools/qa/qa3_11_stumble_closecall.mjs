// Case 11 + 12: stumble objects hit airborne / landing off a roof; close-call and barriersDodged counting edge cases.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  // 11a jump over cones (0.9) / tyres (0.7) / ranger (1.9) — jump apex 2.09
  for (const type of ['cones', 'tyre_stack']) for (const jd of [2, 5, 8, 11]) {
    const p = await qa.fresh(20); qa.tp(0, Z + 30); qa.stumble(type, 0, Z); qa.input(Z + jd, 'up');
    await qa.watch({ ms: 3000, stopZ: Z - 10 }); const end = qa.frames[qa.frames.length - 1]; const at = qa.frames.find((f) => f.z - 0.8 <= Z + 0.4);
    res.push(`11a jump ${jd}m before ${type}: y at object=${at && at.y} stumbles=${end.stm} ${end.st}`);
  }
  // 11b roof end → cones 8 m later (land on them?), then a second stumble 3 s later → caught?
  for (const v of [20]) {
    const p = await qa.fresh(v); qa.train(0, Z, 1); qa.tp(0, Z - 2, 2.6); qa.stumble('cones', 0, Z - 12 - 8); qa.stumble('tyre_stack', 0, Z - 12 - 8 - v * 3);
    await qa.watch({ ms: 6000, stopZ: Z - 12 - 8 - v * 3 - 15 }); const end = qa.frames[qa.frames.length - 1];
    res.push(`11b roof end → cones (8 m) → tyres (+3 s): stumbles=${end.stm} => ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause} (chaser 5 s window, by design)`);
  }
  // 11c stumble while airborne (ranger 1.9 m tall, jump from 3 m before): hit flag + Stumble anim mid-air, then landing
  { const p = await qa.fresh(20); qa.tp(0, Z + 30); qa.stumble('cones', 0, Z); g.track.obstacles[0].yTop = 1.9; g.track.obstacles[0].type = 'ranger'; qa.input(Z + 3, 'up');
    await qa.watch({ ms: 3000, stopZ: Z - 15 }); const end = qa.frames[qa.frames.length - 1]; const hit = qa.frames.find((f, i) => i && f.stm > qa.frames[i - 1].stm);
    res.push(`11c airborne stumble on a 1.9 m object: hit at y=${hit && hit.y} gr=${hit && hit.gr}, landed ok=${qa.frames.some((f) => f.z < Z - 2 && f.gr)} ${end.st}`); }
  // 12a die on a barrier → closeCalls must not tick; 12b Turbo-save on a gantry → closeCall/dodge count?
  { const p = await qa.fresh(20); qa.tp(0, Z + 30); qa.barrier('road_closed_gantry', 0, Z); qa.input(Z + 20, 'up'); // jump into it
    await qa.watch({ ms: 3000 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12a death on gantry: closeCalls=${end.cc} barriersDodged=${end.bd} ${end.st} ${end.cause}`); }
  { const p = await qa.fresh(20); qa.tp(0, Z + 30); qa.barrier('road_closed_gantry', 0, Z); g.save.data.hoverboards = 3; g.useHoverboard();
    await qa.watch({ ms: 3000, stopZ: Z - 10 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12b Turbo-save on gantry: closeCalls=${end.cc} barriersDodged=${end.bd} hover=${p.hover} inv=${end.inv} ${end.st}`); }
  // 12c swipe off a continuous roof right before the next coach seam → 'swerved out of the lane' close call?
  { const p = await qa.fresh(20); qa.train(0, Z, 1); qa.train(0, Z - 12, 2); qa.tp(0, Z - 2, 2.6); qa.input(Z - 12 + 20 * 0.2, 'right');
    await qa.watch({ ms: 3000, stopZ: Z - 30 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12c swipe off roof before the seam: closeCalls=${end.cc} ${end.st} (+50 for leaving a roof?)`); }
  // 12d barrier in the lane being LEFT passes during the change: dodged? 12e barrier in the lane being ENTERED, jumped mid-change
  { const p = await qa.fresh(20); qa.tp(0, Z + 30); qa.barrier('police_barricade', 0, Z); qa.input(Z + 1.5, 'right');
    await qa.watch({ ms: 3000, stopZ: Z - 15 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12d swipe out of a barricade lane 1.5 m before it: barriersDodged=${end.bd} closeCalls=${end.cc} ${end.st}`); }
  { const p = await qa.fresh(20); qa.tp(0, Z + 30); qa.barrier('police_barricade', 1, Z); qa.input(Z + 5, 'right'); qa.input(Z + 4.5, 'up');
    await qa.watch({ ms: 3000, stopZ: Z - 15 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12e swipe into a barricade lane and jump it: barriersDodged=${end.bd} closeCalls=${end.cc} ${end.st} ${end.cause}`); }
  // 12f barriersDodged for a gantry ducked while ON A ROOF above it? (gantry in a lane next to the train, player never in that lane)
  { const p = await qa.fresh(20); qa.train(0, Z, 2); qa.tp(0, Z - 2, 2.6); qa.barrier('road_closed_gantry', 1, Z - 10);
    await qa.watch({ ms: 3000, stopZ: Z - 20 }); const end = qa.frames[qa.frames.length - 1]; res.push(`12f gantry in the next lane while on a roof: barriersDodged=${end.bd} (should be 0)`); }
  return res;
});
console.log(out.join('\n'));
verdict('11 stumble objects airborne / off-roof', true, 'see rows');
verdict('12a no close call on death', out.some((l) => l.startsWith('12a') && l.includes('closeCalls=0')), out.find((l) => l.startsWith('12a')));
verdict('12c no close call for leaving a roof', out.some((l) => l.startsWith('12c') && l.includes('closeCalls=0')), out.find((l) => l.startsWith('12c')));
verdict('12f no dodge credit for other lanes', out.some((l) => l.startsWith('12f') && l.includes('barriersDodged=0')), out.find((l) => l.startsWith('12f')));
await h.close();
