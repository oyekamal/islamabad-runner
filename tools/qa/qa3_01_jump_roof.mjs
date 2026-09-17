// Case 1: jump from ground onto a container roof without a ramp — normal jump (apex 2.09 < 2.6) and Nitro superJump (apex 4.0).
// Sweeps the jump trigger distance before the face and reports what happened the frame the FRONT edge crossed the face.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  for (const sup of [false, true]) for (let d = 3; d <= 16; d += 1) {
    const p = await qa.fresh(20);
    qa.tp(0, Z + 40); qa.train(0, Z, 2); p.superJump = sup;
    qa.input(Z + d, 'up');
    await qa.watch({ ms: 5000, stopZ: Z - 6 });
    const cross = qa.frames.find((f) => f.z - 0.8 <= Z);
    const end = qa.frames[qa.frames.length - 1];
    res.push(`${sup ? 'SUPER' : 'normal'} d=${d} | at face: y=${cross ? cross.y : '?'} gy=${cross ? cross.gy : '?'} vy=${cross ? cross.vy : '?'} | end: st=${end.st} cause=${end.cause || '-'} y=${end.y} gy=${end.gy}`);
  }
  res.push('ERRORS: ' + (qa.errors[0] || 'none'));
  return res;
});
console.log(out.join('\n')); console.log('errors:', h.errs.join(' | ') || 'none');
const superDeaths = out.filter((l) => l.startsWith('SUPER') && l.includes('cause=container'));
const superRoofDeaths = superDeaths.filter((l) => /gy=2\.6/.test(l.split('|')[1]));
verdict('1a normal jump vs 2.6 m roof', out.filter((l) => l.startsWith('normal')).every((l) => l.includes('cause=container')), 'normal jump can never reach roof: every attempt dies at the face (fair, apex 2.09 < 2.6)');
verdict('1b superJump onto roof', superRoofDeaths.length === 0, superRoofDeaths.length ? `${superRoofDeaths.length} super jumps died with groundHeight ALREADY reporting the roof (gy=2.6) under them:\n  ${superRoofDeaths.join('\n  ')}` : 'no death while groundHeight reported the roof');
await h.close();
