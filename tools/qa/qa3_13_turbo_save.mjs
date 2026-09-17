// Extra: Turbo (hoverboard) save against a container — the player keeps running THROUGH the container with 1.6 s invuln.
// Containers are 12–60 m long; at 15–36 m/s 1.6 s is 24–58 m, so invuln can expire while still inside → instant death.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const Z = -120, res = [];
  for (const v of [15, 20, 30]) for (const coaches of [1, 2, 3, 5]) {
    const p = await qa.fresh(v); qa.tp(0, Z + 40); qa.train(0, Z, coaches); g.save.data.hoverboards = 3; g.useHoverboard();
    await qa.watch({ ms: 8000, stopZ: Z - coaches * 12 - 10 });
    const end = qa.frames[qa.frames.length - 1]; const save = qa.frames.find((f) => f.inv > 1.5);
    const insideAtExpiry = qa.frames.find((f, i) => i && qa.frames[i - 1].inv > 0 && f.inv <= 0);
    res.push(`v=${v}×1.35 coaches=${coaches} (${coaches * 12} m): saved at z=${save && save.z} → ${end.st === 'running' ? 'survived' : 'DEATH ' + end.cause + ' at z=' + end.z + ' (' + (Z - end.z).toFixed(1) + ' m into the container, y=' + end.y + ')'}; invuln expired at ${insideAtExpiry ? (Z - insideAtExpiry.z).toFixed(1) + ' m into it' : 'n/a'}`);
  }
  return res;
});
console.log(out.join('\n'));
verdict('13 Turbo save vs container', out.every((l) => l.includes('survived')), `${out.filter((l) => l.includes('DEATH')).length}/${out.length} runs die inside the container after the save`);
await h.close();
