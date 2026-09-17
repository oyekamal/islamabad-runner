// Case 7: army jeep (mover) — passes through a barricade the player is jumping; approaches a roof rider; kill-on-train-overlap timing.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  // a) player jumps a barricade at Z; a jeep (12 m/s) is timed to be at Z when the player is mid-air over it
  for (const v of [15, 24]) for (const lead of [0, 3, 6]) {
    const p = await qa.fresh(v); qa.tp(0, Z + 50); qa.barrier('police_barricade', 0, Z);
    const tPlayer = 50 / v; qa.jeep(0, Z - 12 * tPlayer + lead, 12);
    qa.input(Z + 5, 'up');
    await qa.watch({ ms: 6000, stopZ: Z - 30 });
    const end = qa.frames[qa.frames.length - 1]; const j = g.track.movers[0];
    res.push(`7a v=${v} jeepLead=${lead} => ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause} at y=${end.y} (jeep visible through the barricade: ${j ? !j.dead : 'gone'})`);
  }
  // b) roof rider, jeep coming up the same lane from beyond the train end
  for (const v of [15, 36]) {
    const p = await qa.fresh(v); qa.train(0, Z, 3); qa.tp(0, Z - 2, 2.6); const j = qa.jeep(0, Z - 60, 14);
    const seen = []; qa.at(Z - 30, (g) => seen.push(`at z=-150 jeep dead=${j.dead} zNear=${j.zNear.toFixed(1)}`));
    await qa.watch({ ms: 5000, stopZ: Z - 50 });
    const end = qa.frames[qa.frames.length - 1];
    res.push(`7b v=${v} roof rider vs oncoming jeep => ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause}; ${seen.join(' ')}; jeep culled=${!g.track.movers.includes(j)}`);
  }
  // c) jeep spawned in the SAME frame it overlaps a train while the player is right there (dead flag is set in track.update but the
  //    obstacle stays in the list until the next _cull — collide() runs in between)
  for (const v of [20]) {
    const p = await qa.fresh(v); qa.train(0, Z, 1); qa.tp(0, Z + 3.2); // front edge 2.4 m from the face; no ramp → will die of container anyway
    qa.jeep(1, Z + 5, 14); qa.input(Z + 3, 'right');
    await qa.watch({ ms: 3000, stopZ: Z - 20 });
    const end = qa.frames[qa.frames.length - 1];
    res.push(`7c swipe into a jeep alongside => ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause} (moving trains never sideswipe: Track.js:614 !o.moving)`);
  }
  return res;
});
console.log(out.join('\n'));
verdict('7a jeep through a barricade mid-jump', out.filter((l) => l.startsWith('7a')).every((l) => l.includes('survived')), out.filter((l) => l.startsWith('7a') && l.includes('DEATH')).join('; ') || 'survived all');
verdict('7b roof rider vs oncoming jeep', out.filter((l) => l.startsWith('7b')).every((l) => l.includes('survived')), out.filter((l) => l.startsWith('7b')).join('; '));
console.log(out.filter((l) => l.startsWith('7c')).join('; '));
await h.close();
