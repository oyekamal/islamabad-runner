// Case 2: riding a roof to the container's end (zFar) and falling off — plain, and with a 'down' (fast-fall) swipe right as the rear leaves.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -100, ZF = Z - 24, res = [];
  const cases = [];
  for (const v of [15, 18, 22, 26, 30, 36]) { cases.push({ v, down: null }); cases.push({ v, down: ZF }); cases.push({ v, down: ZF - 0.2 }); cases.push({ v, down: ZF - 0.5 }); }
  for (const c of cases) {
    const p = await qa.fresh(c.v);
    qa.train(0, Z, 2); qa.tp(0, Z - 4, 2.6);
    if (c.down !== null) qa.input(c.down, 'down');
    await qa.watch({ ms: 4000, stopZ: ZF - 20 });
    const fr = qa.frames.filter((f) => f.z < ZF + 0.7 && f.z > ZF - 3);
    const end = qa.frames[qa.frames.length - 1];
    const landed = qa.frames.find((f) => f.z < ZF && f.gr && f.y < 0.01);
    res.push(`v=${c.v} down=${c.down === null ? 'no' : (ZF - c.down).toFixed(1) + 'm after end'} => st=${end.st} cause=${end.cause || '-'} landedAt z=${landed ? (ZF - landed.z).toFixed(1) + 'm past end' : 'never'} | frames: ${fr.map((f) => `z${(f.z - ZF).toFixed(2)}/y${f.y}/vy${f.vy}/${f.st}`).join(' ')}`);
  }
  return res;
});
console.log(out.join('\n')); console.log('errors:', h.errs.join(' | ') || 'none');
const plain = out.filter((l) => l.includes('down=no'));
const deaths = out.filter((l) => l.includes('cause=container'));
verdict('2a roll off roof end, no input', plain.every((l) => l.includes('st=running')), plain.every((l) => l.includes('st=running')) ? 'gy drops to 0 at zFar, free fall, lands, no death' : 'death while falling off the end');
verdict('2b roll off roof end + fast-fall swipe', deaths.length === 0, deaths.length ? `${deaths.length}/${out.length - plain.length} fast-fall variants die with "container" while still over the roof end:\n  ${deaths.map((d) => d.split('|')[0]).join('\n  ')}` : 'no death');
await h.close();
