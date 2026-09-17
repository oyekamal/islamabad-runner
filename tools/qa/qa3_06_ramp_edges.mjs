// Case 6: ramp edge cases — lane change onto a ramp midway; jump on the ramp; barricade→ramp; continueTrain roof continuity.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = { side: [], jump: [], bar: [], cont: [] };
  // a) side-enter a ramp at fraction f of its length (ramp lane 1, player in lane 0). The swipe is timed so x reaches the ramp lane at f.
  for (const v of [15, 24, 36]) for (const f of [0.1, 0.2, 0.3, 0.45, 0.6, 0.8]) {
    const p = await qa.fresh(v); qa.tp(0, Z + 30); qa.ramp(1, Z); qa.train(1, Z - 6, 2);
    qa.input(Z - f * 6 + v * 0.1, 'right');   // lane change takes 0.16 s; x-overlap starts ~0.07 s in
    await qa.watch({ ms: 4000, stopZ: Z - 20 });
    const onRamp = qa.frames.filter((fr) => fr.z < Z && fr.z > Z - 6 && fr.x > 1.4);
    const end = qa.frames[qa.frames.length - 1];
    res.side.push(`v=${v} enter@${f} => ${end.st === 'running' ? 'OK' : 'DEATH ' + end.cause} | on ramp: gy ${onRamp.length ? onRamp.map((fr) => fr.gy).slice(0, 8).join(',') : '-'} y ${onRamp.length ? onRamp.map((fr) => fr.y).slice(0, 8).join(',') : '-'}`);
  }
  // b) jump while riding the ramp
  for (const v of [15, 24, 36]) for (const f of [0.1, 0.4, 0.7, 0.95]) {
    const p = await qa.fresh(v); qa.tp(0, Z + 30); qa.ramp(0, Z); qa.train(0, Z - 6, 2);
    qa.input(Z - f * 6, 'up');
    await qa.watch({ ms: 4000, stopZ: Z - 25 });
    const end = qa.frames[qa.frames.length - 1]; const landed = qa.frames.find((fr) => fr.z < Z - 6 && fr.gr);
    res.jump.push(`v=${v} jump@${f} => ${end.st === 'running' ? 'OK' : 'DEATH ' + end.cause} landed y=${landed ? landed.y : 'never'} at ${landed ? (Z - 6 - landed.z).toFixed(1) + 'm past face' : '-'}`);
  }
  // c) barricade 10 m before a ramp (the planner minimum): jump the barricade, arrive at the ramp airborne
  for (const v of [15, 24, 36]) for (const jd of [2, 4, 6]) {
    const p = await qa.fresh(v); qa.tp(0, Z + 40); qa.barrier('police_barricade', 0, Z + 10); qa.ramp(0, Z); qa.train(0, Z - 6, 2);
    qa.input(Z + 10 + jd, 'up');
    await qa.watch({ ms: 4000, stopZ: Z - 25 });
    const end = qa.frames[qa.frames.length - 1];
    res.bar.push(`v=${v} jump ${jd}m before barricade => ${end.st === 'running' ? 'OK endY=' + end.y : 'DEATH ' + end.cause + ' y=' + end.y}`);
  }
  // d) continueTrain: coach 2 starts exactly where coach 1 ends
  for (const v of [15, 36]) {
    const p = await qa.fresh(v); qa.train(0, Z, 2); qa.train(0, Z - 24, 2); qa.tp(0, Z - 4, 2.6);
    await qa.watch({ ms: 4000, stopZ: Z - 44 });
    const fr = qa.frames.filter((f) => f.z < Z - 20 && f.z > Z - 30);
    res.cont.push(`v=${v} minGy over the seam=${Math.min(...fr.map((f) => f.gy))} minY=${Math.min(...fr.map((f) => f.y))} st=${qa.frames[qa.frames.length - 1].st}`);
  }
  return res;
});
for (const k of Object.keys(out)) console.log(`-- ${k}\n` + out[k].join('\n'));
verdict('6a side-enter a ramp midway', out.side.every((l) => l.includes('OK')), `${out.side.filter((l) => l.includes('DEATH')).length}/${out.side.length} die — ramp groundHeight needs y ≥ h-0.6 so a ground rider entering past ~25% clips through the ramp and hits the container face`);
verdict('6b jump while on the ramp', out.jump.every((l) => l.includes('OK')), out.jump.filter((l) => l.includes('DEATH')).join('; ') || 'all land on the roof');
verdict('6c barricade 10 m before ramp', out.bar.every((l) => l.includes('OK')), out.bar.filter((l) => l.includes('DEATH')).join('; ') || 'all fine');
verdict('6d continueTrain seam', out.cont.every((l) => l.includes('minGy over the seam=2.6')), out.cont.join('; '));
await h.close();
