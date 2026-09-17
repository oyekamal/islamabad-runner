// Case 8 + 9: pillar after a roof end (reaction budget), pillar at 6 m jetpack; jetpack expiring above container / gantry / pillar.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  // 8a) train ends at Z-24; pillar at the planner minimum 18 m later (lane 0)
  for (const v of [15, 26, 36]) {
    const p = await qa.fresh(v); qa.train(0, Z, 2); qa.pillar(0, Z - 24 - 18); qa.tp(0, Z - 4, 2.6);
    await qa.watch({ ms: 5000, stopZ: Z - 60 });
    const end = qa.frames[qa.frames.length - 1]; const off = qa.frames.find((f) => f.gy === 0 && f.z < Z - 20); const land = qa.frames.find((f) => f.z < Z - 24 && f.gr && f.y < 0.01);
    res.push(`8a v=${v} roof end → pillar 18 m later: ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause}; left roof t=${off && off.t} landed t=${land ? land.t : 'never'} died t=${end.st !== 'running' ? end.t : '-'} → ${off && end.st !== 'running' ? ((end.t - off.t).toFixed(2) + ' s from roof end to death, ' + (land ? (end.t - land.t).toFixed(2) : 'n/a') + ' s on the ground') : ''}`);
  }
  // 8b) jetpack at 6 m over a pillar (4.4 m)
  { const p = await qa.fresh(24); qa.tp(0, Z + 30); qa.pillar(0, Z); g._pickup('jetpack'); g.powerups.jetpack = 10; await qa.sleep(700); await qa.watch({ ms: 3000, stopZ: Z - 10 }); const end = qa.frames[qa.frames.length - 1]; res.push(`8b jetpack over pillar: ${end.st} y=${end.y}`); }
  // 9) jetpack expiring so the bike is directly above X when it starts falling from 6 m (fall = 0.63 s)
  for (const v of [15, 30]) for (const what of ['container', 'gantry', 'teargas', 'pillar', 'barricade']) {
    const p = await qa.fresh(v); qa.tp(0, Z + 60); g._pickup('jetpack'); g.powerups.jetpack = 10;
    await qa.sleep(600); // reach altitude
    const fallDist = 0.63 * v, landZ = Z - fallDist;   // set the expiry so the fall begins at Z
    if (what === 'container') qa.train(0, landZ + 8, 2); else if (what === 'gantry') qa.barrier('road_closed_gantry', 0, landZ + 1.5); else if (what === 'teargas') qa.barrier('teargas', 0, landZ + 2); else if (what === 'pillar') qa.pillar(0, landZ - 0.2); else qa.barrier('police_barricade', 0, landZ + 0.5);
    qa.at(Z, (g) => { g.powerups.jetpack = 0.001; });
    await qa.watch({ ms: 5000, stopZ: landZ - 30 });
    const end = qa.frames[qa.frames.length - 1]; const off = qa.frames.find((f) => !f.fly && f.z < Z + 1);
    res.push(`9 v=${v} jetpack ends above ${what}: ${end.st === 'running' ? 'survived y=' + end.y + ' gy=' + end.gy : 'DEATH ' + end.cause + ' at y=' + end.y + ' inv=' + end.inv} (flying off at z=${off && off.z})`);
  }
  return res;
});
console.log(out.join('\n'));
verdict('8a pillar 18 m after a roof end', true, out.filter((l) => l.startsWith('8a')).map((l) => l.split('→')[1]).join(' | ') + ' — informational reaction budget');
verdict('9 jetpack expiry over container', out.filter((l) => l.includes('above container')).every((l) => l.includes('survived')), out.filter((l) => l.includes('above container')).join('; '));
verdict('9 jetpack expiry over gantry/teargas/pillar (no invuln)', false, out.filter((l) => /above (gantry|teargas|pillar|barricade)/.test(l)).join('; '));
await h.close();
