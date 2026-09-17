// Case 5b/6/7b: planner invariants over ~700 generated blocks (42 km, all zones, difficulty→1).
// Stubs meshes so the sweep is cheap. Checks: barrier/stumble/pillar overlapping a train in the same lane; hazard gaps after a
// train end (fall budget); rampless train→train gaps; jeeps whose path (previous block, same lane) holds barriers/stumbles/pillars.
import { launch, verdict } from './qa3_lib.mjs';
const h = await launch();
const out = await h.run(async (qa, g) => {
  const t = g.track;
  const dummy = () => ({ position: { set() {}, z: 0 }, rotation: { set() {}, x: 0, y: 0 }, scale: { set() {} }, add() {}, remove() {}, visible: true });
  const saved = { _place: t._place, _decor: t._decor, _sideScenery: t._sideScenery, _acquireRanger: t._acquireRanger, _releaseObstacle: t._releaseObstacle, _pickup: t._pickup };
  t._place = () => dummy(); t._decor = () => dummy(); t._sideScenery = () => {}; t._pickup = () => {};
  t._acquireRanger = () => ({ root: dummy(), mixer: { update() {}, stopAllAction() {}, setTime() {} }, actions: { Idle: { reset() { return this; }, play() {}, stop() {} }, Dead: {} } });
  t._releaseObstacle = () => {};
  qa.clearAhead(); t.coins.add = () => null;
  const pms = [];
  const origPush = t.pendingMovers.push.bind(t.pendingMovers);
  for (let i = 0; i < 700; i++) { const before = t.pendingMovers.length; t._generateBlock(false); for (let k = before; k < t.pendingMovers.length; k++) pms.push({ ...t.pendingMovers[k], blockZNear: t.genZ + 60 }); }
  const obs = t.obstacles.slice();
  const trains = obs.filter((o) => o.kind === 'train'), ramps = obs.filter((o) => o.kind === 'ramp');
  const hazards = obs.filter((o) => o.kind === 'barrier' || o.kind === 'stumble' || o.kind === 'solid');
  const res = { blocks: 700, obstacles: obs.length, trains: trains.length, ramps: ramps.length, hazards: hazards.length, movers: pms.length };
  // A: hazard overlapping a train/ramp span in the same lane
  res.hazardInsideTrain = 0; res.hazardInsideRamp = 0;
  for (const b of hazards) for (const T of [...trains, ...ramps]) if (T.lane === b.lane && b.zNear > T.zFar - 0.01 && b.zFar < T.zNear + 0.01) { if (T.kind === 'train') res.hazardInsideTrain++; else res.hazardInsideRamp++; }
  // B: nearest hazard after a train end in the same lane (player falls 0.42 s from the roof = 6.3 m @15, 15 m @36)
  const gapsAfterTrain = { barrier: [], stumble: [], solid: [], trainFaceNoRamp: [], trainFaceRamp: [] };
  for (const T of trains) {
    const same = obs.filter((o) => o.lane === T.lane && o !== T && o.zNear < T.zFar && o.zNear > T.zFar - 70 && !(o.kind === 'train' && Math.abs(o.zNear - T.zFar) < 0.01));
    same.sort((a, b) => b.zNear - a.zNear);
    const n = same[0]; if (!n) continue;
    const gap = T.zFar - n.zNear;
    if (n.kind === 'train') { const r = ramps.find((rp) => rp.lane === n.lane && Math.abs(rp.zFar - n.zNear) < 0.01); gapsAfterTrain[r ? 'trainFaceRamp' : 'trainFaceNoRamp'].push(gap); }
    else if (n.kind === 'ramp') gapsAfterTrain.trainFaceRamp.push(gap);
    else gapsAfterTrain[n.kind].push(gap);
  }
  res.minGapAfterTrainEnd = Object.fromEntries(Object.entries(gapsAfterTrain).map(([k, v]) => [k, v.length ? `${Math.min(...v).toFixed(1)} m (n=${v.length}, <16 m: ${v.filter((x) => x < 16).length})` : 'n/a']));
  // C: jeeps driving through hazards in the previous block of their lane
  res.jeepThroughHazards = 0; res.jeepThroughPillar = 0; const examples = [];
  for (const pm of pms) {
    const pathZNear = pm.blockZNear + 60, pathZFar = pm.spawnZ;   // from the previous block's near edge to spawn
    const hit = hazards.filter((o) => o.lane === pm.lane && o.zNear < pathZNear && o.zNear > pathZFar);
    if (hit.length) { res.jeepThroughHazards++; if (hit.some((o) => o.kind === 'solid')) res.jeepThroughPillar++; if (examples.length < 3) examples.push(`jeep lane ${pm.lane} spawn ${pm.spawnZ.toFixed(0)} drives through ${hit.map((o) => o.type + '@' + o.zNear.toFixed(0)).join(',')}`); }
  }
  res.jeepExamples = examples;
  // D: continuous-roof and coaches
  res.trainsEndingAtBlockEdge = trains.filter((T) => Math.abs((T.zFar % 60) + 60) % 60 < 0.01 || Math.abs(T.zFar % 60) < 0.01).length;
  Object.assign(t, saved); t.obstacles = []; t.pendingMovers = [];
  return res;
});
console.log(JSON.stringify(out, null, 1));
verdict('5b barrier/stumble/pillar never inside a train span (same lane)', out.hazardInsideTrain === 0 && out.hazardInsideRamp === 0, `hazardInsideTrain=${out.hazardInsideTrain} hazardInsideRamp=${out.hazardInsideRamp}`);
verdict('7b jeeps do not drive through barriers/stumbles/pillars', out.jeepThroughHazards === 0, `${out.jeepThroughHazards}/${out.movers} jeeps have hazards on their path in the previous block (${out.jeepThroughPillar} incl. a pillar): ${out.jeepExamples.join(' | ')}`);
console.log('gap after roof end →', JSON.stringify(out.minGapAfterTrainEnd));
await h.close();
