// Case 10: revive (5.5 m for 2.4 s, invuln 3.2) and purchased headstart (4.5 s, invuln 5): does invuln outlast the fall?
// A 'barrier carpet' (gantries every 3 m in all lanes) covers the landing zone so any unprotected frame below 3 m is a death.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const res = [];
  const carpet = (zFrom, zTo) => { for (let z = zFrom; z > zTo; z -= 3) for (const l of [-1, 0, 1]) qa.barrier('road_closed_gantry', l, z); };
  // 10a revive
  for (const v of [15, 30]) {
    const p = await qa.fresh(v); const Z = -120; qa.tp(0, Z + 20); qa.train(0, Z, 1);
    await qa.watch({ ms: 4000 });   // dies at the face
    while (g.state !== 'dead') await qa.sleep(50);
    g.save.data.keys = 10; qa.clearAhead(); carpet(g.player.z - 60, g.player.z - 400);
    const zDead = g.player.z; qa.frames.length = 0; g.revive();
    await qa.watch({ ms: 6000, stopZ: zDead - 320 });
    const off = qa.frames.find((f) => !f.fly), land = qa.frames.find((f) => !f.fly && f.gr), end = qa.frames[qa.frames.length - 1];
    res.push(`10a revive v=${v}: flying off at t=${off && off.t} (inv ${off && off.inv}), landed t=${land ? land.t : 'never'} (inv ${land ? land.inv : '-'}) => ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause + ' at t=' + end.t + ' y=' + end.y + ' inv=' + end.inv}`);
  }
  // 10b purchased headstart from run start (state=running already)
  for (const v of [15]) {
    const p = await qa.fresh(v); g.save.data.headstarts = 5; qa.frames.length = 0; g._activateHeadstart();
    // headstart runs 4.5 s at 70 m/s = 315 m; carpet the landing zone 280–420 m ahead
    carpet(g.player.z - 250, g.player.z - 450);
    await qa.watch({ ms: 8000, stopZ: g.player.z - 440 });
    const off = qa.frames.find((f) => !f.fly), land = qa.frames.find((f) => !f.fly && f.gr), end = qa.frames[qa.frames.length - 1];
    res.push(`10b headstart: flying off at t=${off && off.t} (inv ${off && off.inv}), landed t=${land ? land.t : 'never'} (inv ${land ? land.inv : '-'}) => ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause + ' at t=' + end.t + ' y=' + end.y + ' inv=' + end.inv}`);
  }
  return res;
});
console.log(out.join('\n'));
verdict('10a revive landing is protected', out.filter((l) => l.startsWith('10a')).every((l) => l.includes('survived')), out.filter((l) => l.startsWith('10a')).join(' | '));
verdict('10b purchased headstart landing is protected', out.filter((l) => l.startsWith('10b')).every((l) => l.includes('survived')), out.filter((l) => l.startsWith('10b')).join(' | '));
await h.close();
