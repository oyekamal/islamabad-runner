// Extra (from the planner sweep): train → 4–14 m gap → next train with NO ramp (45% of prevTrain→train blocks).
// Rolling off the roof drops the bike below the 2.15 m roof-snap threshold before the next face. Is a jump from the roof enough?
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  for (const v of [15, 22, 36]) for (const gap of [4, 6, 9, 12, 14]) for (const jump of ['none', 'atEnd', '3m before end']) {
    const p = await qa.fresh(v); qa.train(0, Z, 1); qa.train(0, Z - 12 - gap, 2); qa.tp(0, Z - 2, 2.6);
    if (jump === 'atEnd') qa.input(Z - 12 + 0.3, 'up'); else if (jump !== 'none') qa.input(Z - 12 + 3, 'up');
    await qa.watch({ ms: 4000, stopZ: Z - 12 - gap - 8 });
    const end = qa.frames[qa.frames.length - 1]; const face = qa.frames.find((f) => f.z - 0.8 <= Z - 12 - gap);
    res.push(`v=${v} gap=${gap} jump=${jump} => ${end.st === 'running' ? 'OK y=' + end.y : 'DEATH ' + end.cause} (y at face=${face && face.y}, gy=${face && face.gy}, vy=${face && face.vy})`);
  }
  return res;
});
console.log(out.join('\n'));
const noJump = out.filter((l) => l.includes('jump=none')), jumped = out.filter((l) => !l.includes('jump=none'));
verdict('14a roll off roof into a rampless face 4–14 m later', true, `${noJump.filter((l) => l.includes('DEATH')).length}/${noJump.length} die without a jump (needs jump or lane change; visible ahead)`);
verdict('14b jump from the roof clears the gap', jumped.every((l) => l.includes('OK')), `${jumped.filter((l) => l.includes('DEATH')).length}/${jumped.length} die even with a jump: ${jumped.filter((l) => l.includes('DEATH')).map((l) => l.split(' =>')[0]).join('; ')}`);
await h.close();
