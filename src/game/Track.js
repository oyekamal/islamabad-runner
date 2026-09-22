import * as THREE from 'three';
import { LANE_W, TILE_L, TRAIN_W, TRAIN_H, RAMP_L, PLAYER, ZONES, ZONE_LENGTH } from './constants.js';
import { Pool } from './Pool.js';
import { Coins } from './Coins.js';

const BLOCK_TILES = 5;
const BLOCK_L = BLOCK_TILES * TILE_L;   // 60 m
const GEN_AHEAD = 260;
const CULL_BEHIND = 24;
const JEEP_L = 5.0;

function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }

export function zoneAt(distance) {
  const d = ((distance % ZONE_LENGTH) + ZONE_LENGTH) % ZONE_LENGTH;
  return ZONES.find((z) => d >= z.from && d < z.to) || ZONES[0];
}

/**
 * Endless Islamabad road. "Trains" are shipping containers, container trucks and Metro buses
 * (roof height TRAIN_H, ridable). Oncoming "trains" are army jeeps.
 */
export class Track {
  constructor(assets, scene, game) {
    this.assets = assets;
    this.scene = scene;
    this.game = game;
    this.pool = new Pool(assets, scene);
    this.coins = new Coins(assets, scene);
    this.obstacles = [];
    this.pickups = [];
    this.decor = [];
    this.movers = [];
    this.rangerFree = [];
    this.reset();
  }

  reset(startDistance = 0) {
    for (const o of this.obstacles) this._releaseObstacle(o);
    for (const p of this.pickups) this.pool.release(p.mesh);
    for (const d of this.decor) this.pool.release(d.mesh);
    for (const m of this.movers) this._releaseObstacle(m);
    this.obstacles = [];
    this.pickups = [];
    this.decor = [];
    this.movers = [];
    this.coins.clear();
    this.genZ = 0;
    this.blockIndex = Math.floor(startDistance / BLOCK_L);
    this.prevPlans = { '-1': 'free', 0: 'free', 1: 'free' };
    this.prevPlans2 = { '-1': 'free', 0: 'free', 1: 'free' };
    this.prevTrainEnd = { '-1': null, 0: null, 1: null };
    // Primed above the roll ceiling (rnd(130,240), max 240) so the FIRST _pickupsForBlock() call
    // of a run (BLOCK_L=60 added immediately) already exceeds it and a pickup spawns inside the
    // very first block (~0-60 m) instead of waiting 130-240 m — real bot deaths land at 15-69 m.
    this.sincePickup = 200;
    this.sinceLetter = 0;
    this.sinceBubble = 0;
    this.runStartDistance = startDistance;
    this.keyGiven = false;   // guarantees ≥1 key pickup in the first 500 m of every run (see _pickupsForBlock)
    this.pendingMovers = [];
    this.tunnelActive = false;
    this.airCoinZ = undefined;
    this.bestMarkerPlaced = false;
    this._generateBlock(true);
    this._generateBlock(false, 1); this._generateBlock(false, 2);   // scripted warm-up from any start distance
  }

  /** Distance (metres) at the near edge of the block being generated. */
  get blockDistance() { return this.blockIndex * BLOCK_L; }
  get zone() { return zoneAt(this.blockDistance); }
  get lap() { return Math.floor(this.blockDistance / ZONE_LENGTH); }
  get difficulty() { return Math.min(1, 0.15 + this.blockDistance / 3500 * 0.85); }   // monotonic: no reset at each 3000 m lap

  // ------------------------------------------------------------------ helpers
  _place(name, x, y, z, ry = 0, scale = null) {
    const m = this.pool.acquire(name);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    return m;
  }

  _decor(name, x, y, z, ry = 0, scale = null) {
    const mesh = this._place(name, x, y, z, ry, scale);
    this.decor.push({ mesh, z });
    return mesh;
  }

  _obstacle(kind, type, lane, zNear, length, yBot, yTop, mesh, extra = {}) {
    const cx = lane * LANE_W;
    const o = {
      kind, type, lane, zNear, zFar: zNear - length, length,
      minX: cx - TRAIN_W / 2, maxX: cx + TRAIN_W / 2, yBot, yTop, mesh, meshes: extra.meshes || (mesh ? [mesh] : []),
      speed: extra.speed || 0,
    };
    this.obstacles.push(o);
    return o;
  }

  _releaseObstacle(o) {
    if (o.lamp) { o.meshes[0].remove(o.lamp); o.lamp = null; }
    for (const m of o.meshes) this.pool.release(m);
    if (o.ranger) { o.ranger.root.visible = false; this.rangerFree.push(o.ranger); o.ranger = null; }
  }

  _acquireRanger() {
    let r = this.rangerFree.pop();
    if (!r) {
      r = this.assets.character('ranger');
      r.root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
      this.scene.add(r.root);
    }
    r.mixer.stopAllAction();
    r.actions.Idle.reset().play();
    r.mixer.setTime(Math.random() * 2);
    r.root.visible = true;
    r.root.rotation.set(0, Math.PI, 0);   // face the oncoming biker
    return r;
  }

  _coinLine(lane, zNear, count, y = 0.9, step = 1.7, arcOver = null) {
    const x = lane * LANE_W;
    for (let i = 0; i < count; i++) {
      const z = zNear - i * step;
      let yy = y;
      if (arcOver) {
        const t = (z - arcOver.z) / arcOver.half;
        yy = y + Math.max(0, 1 - t * t) * arcOver.h;
      }
      this.coins.add(x, yy, z);
    }
  }

  // ------------------------------------------------------------------ per frame
  update(playerZ, dt, speed) {
    while (this.genZ > playerZ - GEN_AHEAD) this._generateBlock(false);
    this._cull(playerZ + CULL_BEHIND);
    for (let i = this.pendingMovers.length - 1; i >= 0; i--) {
      const pm = this.pendingMovers[i];
      if (playerZ < pm.triggerZ) { this.pendingMovers.splice(i, 1); this._spawnMover(pm); }
    }
    for (const m of this.movers) {
      const dz = m.speed * dt;
      m.zNear += dz; m.zFar += dz;
      for (const mesh of m.meshes) mesh.position.z += dz;
      for (const o of this.obstacles) {
        if (o === m || o.moving || o.lane !== m.lane || (o.kind !== 'train' && o.kind !== 'ramp' && o.kind !== 'solid')) continue;
        if (m.zNear > o.zFar - 1 && m.zFar < o.zNear + 1) { m.dead = true; break; }
      }
      m.lampT = (m.lampT || 0) + dt;
      if (m.lamp) m.lamp.visible = Math.floor(m.lampT * 6) % 2 === 0;
    }
    for (const p of this.pickups) {
      p.mesh.rotation.y += dt * 2.2;
      p.mesh.position.y = p.y + Math.sin(this.game.time * 3 + p.z) * 0.12;
    }
    for (const o of this.obstacles) if (o.ranger) o.ranger.mixer.update(dt);
  }

  _cull(cullZ) {
    const keepO = [];
    for (const o of this.obstacles) {
      if (o.zFar > cullZ && !o.speed) this._releaseObstacle(o); else keepO.push(o);
    }
    this.obstacles = keepO;
    const keepM = [];
    for (const m of this.movers) {
      if (m.zFar > cullZ + 40 || m.dead) { this._releaseObstacle(m); this.obstacles = this.obstacles.filter((x) => x !== m); }
      else keepM.push(m);
    }
    this.movers = keepM;
    const keepP = [];
    for (const p of this.pickups) { if (p.z > cullZ) this.pool.release(p.mesh); else keepP.push(p); }
    this.pickups = keepP;
    const keepD = [];
    for (const d of this.decor) { if (d.z > cullZ + 14) this.pool.release(d.mesh); else keepD.push(d); }
    this.decor = keepD;
  }

  // ------------------------------------------------------------------ generation
  /** warm: 0 = normal, 1/2 = scripted warm-up blocks used at the start of a fresh run. */
  _generateBlock(safe, warm = 0) {
    const zNear = this.genZ;
    const zFar = zNear - BLOCK_L;
    const zone = this.zone;
    const d = this.difficulty;
    const sprint = zone.id === 'dchowk';
    const tunnel = !safe && !warm && !sprint && !this.tunnelActive && chance(0.10 + d * 0.06) && zone.id !== 'avenue';
    this.tunnelActive = tunnel;

    for (let i = 0; i < BLOCK_TILES; i++) {
      const tz = zNear - i * TILE_L;
      this._decor('road_tile', 0, 0, tz);
      if (tunnel) this._decor('tunnel', 0, 0, tz, 0, [1, 1.6, 1]);
      else this._sideScenery(zone.id, tz, i);
    }

    // best-run marker: an overpass sign where the previous best distance ended (once per run)
    const best = this.game.save.data.bestDistance || 0;
    if (best > 0 && !this.bestMarkerPlaced && best >= this.blockDistance && best < this.blockDistance + BLOCK_L) {
      this.bestMarkerPlaced = true;
      this._decor('overpass_sign', 0, 0, zNear - (best - this.blockDistance));
    }

    const plans = {};
    const warmLane = warm === 2 ? pick([-1, 1]) : null;
    if (safe) {
      plans[-1] = plans[0] = plans[1] = 'free';
    } else if (warm === 1) {
      plans[-1] = plans[1] = 'free'; plans[0] = 'barriers';
    } else if (warm === 2) {
      plans[-1] = plans[1] = 'free'; plans[0] = 'train'; plans[warmLane] = 'barriers';
    } else {
      const freeLane = pick([-1, 0, 1]);
      for (const lane of [-1, 0, 1]) {
        if (lane === freeLane) { plans[lane] = chance((sprint ? 0.3 : 0.55) + d * 0.3) ? 'barriers' : 'free'; continue; }
        const r = Math.random();
        const prevTrain = this.prevPlans[lane] === 'train';
        const recentTrain = prevTrain || this.prevPlans2[lane] === 'train';
        if (sprint) {
          plans[lane] = r < 0.35 ? 'barriers' : r < 0.5 ? 'stumble' : (r < 0.6 && !recentTrain && this.prevPlans[lane] === 'free') ? 'moving' : 'free';
        } else if (prevTrain && r < 0.55) plans[lane] = 'train';
        else if (r < 0.30 + d * 0.15) plans[lane] = 'train';
        else if (r < 0.48 + d * 0.15) plans[lane] = 'barriers';
        else if (r < 0.58 + d * 0.1 && lane === 0 && !tunnel) plans[lane] = 'pillar';
        else if (r < 0.70 + d * 0.12 && !recentTrain && this.prevPlans[lane] === 'free') plans[lane] = 'moving';
        else if (r < 0.82) plans[lane] = 'stumble';
        else plans[lane] = 'free';
      }
      const movers = [-1, 0, 1].filter((l) => plans[l] === 'moving');
      for (let i = 1; i < movers.length; i++) plans[movers[i]] = 'free';
    }

    for (const lane of [-1, 0, 1]) {
      const plan = plans[lane];
      const continueTrain = this.prevPlans[lane] === 'train' && this.prevTrainEnd[lane] !== null &&
        Math.abs(this.prevTrainEnd[lane] - zNear) < 0.01;
      this.prevTrainEnd[lane] = null;
      if (warm === 1 && lane === 0) {
        // block 1: a single barricade in the centre lane with its coin arc, other lanes free
        const z = zNear - 10;   // first dodge at ~70 m ≈ 4.5 s
        this._barrier('police_barricade', 0, z);
        this._coinLine(0, z + 4.5, 6, 0.9, 1.5, { z, half: 3.2, h: 1.6 });
        continue;
      }
      if (warm === 2 && lane === 0) {
        // block 2: dirt ramp onto a container train in the centre lane
        let z = zNear - 8;
        const rampMesh = this._place('dirt_ramp', 0, 0, z);
        this._obstacle('ramp', 'ramp', 0, z, RAMP_L, 0, TRAIN_H, rampMesh);
        z -= RAMP_L;
        const coaches = Math.floor((z - zFar) / TILE_L);
        const meshes = [];
        for (let i = 0; i < coaches; i++) meshes.push(this._place('container_' + Math.floor(Math.random() * 6), 0, 0, z - i * TILE_L));
        this._obstacle('train', 'container_0', 0, z, coaches * TILE_L, 0, TRAIN_H, meshes[0], { meshes });
        this._coinLine(0, z - 2, Math.min(12, Math.floor((coaches * TILE_L - 3) / 1.7)), TRAIN_H + 0.9);
        continue;
      }
      if (warm === 2 && lane === warmLane) { this._barrier('police_barricade', lane, zNear - 30); this._planFree(lane, zNear, zFar, d); continue; }
      switch (plan) {
        case 'free': this._planFree(lane, zNear, zFar, d); break;
        case 'barriers': this._planBarriers(lane, zNear, zFar, d, zone.id); break;
        case 'train': this._planTrain(lane, zNear, zFar, d, continueTrain, zone.id); break;
        case 'pillar': this._planPillar(lane, zNear, zFar); break;
        case 'moving': this._planMoving(lane, zNear, zFar, d); break;
        case 'stumble': this._planStumble(lane, zNear, zFar, d, zone.id); break;
      }
    }
    this.prevPlans2 = this.prevPlans;
    this.prevPlans = plans;
    // GAP A: pickups used to be skipped entirely on the scripted safe/warm-up blocks (0-180 m),
    // so even with sincePickup primed above the roll ceiling, the first roll couldn't actually
    // fire until block index 3 (180 m+) — long past where real bot deaths land (15-69 m). Block 0
    // is fully obstacle-free ('safe' plan == all lanes 'free'), so including it here also makes
    // the forced first-key roll placement-guaranteed, not just early.
    this._pickupsForBlock(plans, zNear, zFar);

    this.genZ = zFar;
    this.blockIndex++;
  }

  // -- lane plans -------------------------------------------------------------
  _planFree(lane, zNear, zFar, d) {
    if (chance(0.75)) this._coinLine(lane, zNear - rnd(2, 12), Math.floor(rnd(10, 20)));
    if (chance(0.4)) this._coinLine(lane, zNear - rnd(30, 42), Math.floor(rnd(6, 12)));
  }

  _planBarriers(lane, zNear, zFar, d, zoneId) {
    const afterTrain = this.prevPlans[lane] === 'train';
    let z = zNear - (afterTrain ? rnd(24, 30) : rnd(8, 16));
    const minGap = 14 - d * 4;
    while (z > zFar + 6) {
      const r = Math.random();
      let type;
      if (r < 0.42) type = 'police_barricade';
      else if (r < 0.62) type = 'teargas';
      else if (r < 0.82) type = 'road_closed_gantry';
      else type = 'barrier_mid';
      if (zoneId === 'avenue' && type === 'teargas') type = 'police_barricade';
      this._barrier(type, lane, z);
      if (type === 'police_barricade' && chance(0.7)) this._coinLine(lane, z + 4.5, 8, 0.9, 1.5, { z, half: 3.2, h: 1.6 });
      else if (chance(0.6)) this._coinLine(lane, z - 3, 4, 0.9, 1.6);
      z -= rnd(minGap, minGap + 12);
    }
  }

  _barrier(type, lane, z) {
    const mesh = this._place(type, lane * LANE_W, 0, z);
    if (type === 'police_barricade') this._obstacle('barrier', type, lane, z + 0.2, 0.4, 0, 1.05, mesh);
    else if (type === 'road_closed_gantry') this._obstacle('barrier', type, lane, z + 0.15, 0.3, 1.55, 3.0, mesh);
    else if (type === 'teargas') { const o = this._obstacle('barrier', type, lane, z + 0.6, 1.2, 1.5, 2.8, mesh); o.gas = true; }
    else if (type === 'barrier_mid') this._obstacle('barrier', type, lane, z + 0.1, 0.2, 1.48, 1.78, mesh);
  }

  _trainType(zoneId) {
    const r = Math.random();
    if (zoneId === 'avenue') return r < 0.5 ? 'train_metro' : r < 0.8 ? 'container_truck' : 'container_' + Math.floor(Math.random() * 6);
    if (zoneId === 'chokepoint') return r < 0.75 ? 'container_' + Math.floor(Math.random() * 6) : 'container_truck';
    return r < 0.55 ? 'container_' + Math.floor(Math.random() * 6) : r < 0.8 ? 'container_truck' : 'train_metro';
  }

  _planTrain(lane, zNear, zFar, d, continueTrain, zoneId) {
    let z = zNear;
    if (!continueTrain) {
      const gap = rnd(4, 14);
      if (chance(0.6)) this._coinLine(lane, zNear - 1, Math.max(2, Math.floor((gap - 2) / 1.6)));
      z = zNear - gap;
      if (chance(0.55)) {
        const rampMesh = this._place('dirt_ramp', lane * LANE_W, 0, z);
        this._obstacle('ramp', 'ramp', lane, z, RAMP_L, 0, TRAIN_H, rampMesh);
        z -= RAMP_L;
      }
    }
    let coaches = Math.floor((z - zFar) / TILE_L);
    if (coaches <= 0) { this._planFree(lane, zNear, zFar, d); return; }
    if (coaches > 1 && chance(0.3)) coaches -= 1;
    const meshes = [];
    const type = this._trainType(zoneId);
    for (let i = 0; i < coaches; i++) {
      const t = type.startsWith('container_') ? 'container_' + Math.floor(Math.random() * 6) : type;
      meshes.push(this._place(t, lane * LANE_W, 0, z - i * TILE_L));
    }
    const len = coaches * TILE_L;
    this._obstacle('train', type, lane, z, len, 0, TRAIN_H, meshes[0], { meshes });
    if (chance(0.8)) this._coinLine(lane, z - 2, Math.min(12, Math.floor((len - 3) / 1.7)), TRAIN_H + 0.9);
    const end = z - len;
    if (Math.abs(end - zFar) < 0.01) this.prevTrainEnd[lane] = end;
    else if (end - zFar > 3 && chance(0.5)) this._coinLine(lane, end - 3, Math.max(1, Math.floor((end - zFar - 4) / 1.7)));
  }

  _planPillar(lane, zNear, zFar) {
    const z = zNear - rnd(18, 42);
    const mesh = this._place('pillar', lane * LANE_W, 0, z + 0.7);
    this._decor('overpass', 0, 0, z + 1.5);
    this._obstacle('solid', 'pillar', lane, z + 0.7, 1.4, 0, 4.4, mesh);
    for (const l of [-1, 0, 1]) if (l !== lane && chance(0.5)) this._coinLine(l, z + 6, 7);
  }

  _planMoving(lane, zNear, zFar, d) {
    const count = chance(0.6) ? 1 : 2;
    this.pendingMovers.push({ lane, count, spawnZ: zFar - 3, triggerZ: zNear + 110, speed: rnd(10, 14) + d * 5 });
    if (chance(0.5)) this._coinLine(lane, zNear - rnd(4, 10), 6);
  }

  _spawnMover(pm) {
    const meshes = [];
    for (let i = 0; i < pm.count; i++) meshes.push(this._place('army_jeep', pm.lane * LANE_W, 0, pm.spawnZ - i * (JEEP_L + 1.5)));
    const len = pm.count * (JEEP_L + 1.5) - 1.5;
    const o = this._obstacle('train', 'army_jeep', pm.lane, pm.spawnZ, len, 0, 2.5, meshes[0], { meshes, speed: pm.speed });
    o.moving = true;
    if (!this.lampGeo) { this.lampGeo = new THREE.SphereGeometry(0.2, 10, 8); this.lampMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a }); }
    const lamp = new THREE.Mesh(this.lampGeo, this.lampMat);
    lamp.position.set(0.3, 2.6, -3.2);
    meshes[0].add(lamp);
    o.lamp = lamp;
    this.movers.push(o);
    this.game.onMoverSpawn && this.game.onMoverSpawn(o);
  }

  _planStumble(lane, zNear, zFar, d, zoneId) {
    const n = 1 + (chance(0.5) ? 1 : 0);
    let z = zNear - (this.prevPlans[lane] === 'train' ? rnd(24, 30) : rnd(10, 20));
    for (let i = 0; i < n && z > zFar + 6; i++) {
      const r = Math.random();
      if (r < 0.4) {
        const mesh = this._place('cones', lane * LANE_W, 0, z);
        this._obstacle('stumble', 'cones', lane, z + 0.4, 0.8, 0, 0.9, mesh);
        if (chance(0.6)) this._coinLine(lane, z + 4, 8, 0.9, 1.5, { z, half: 3.0, h: 1.4 });
      } else if (r < 0.65) {
        const mesh = this._place('tyre_stack', lane * LANE_W, 0, z);
        this._obstacle('stumble', 'tyre_stack', lane, z + 0.5, 1.0, 0, 0.7, mesh);
        if (chance(0.6)) this._coinLine(lane, z + 4, 8, 0.9, 1.5, { z, half: 3.0, h: 1.4 });
      } else {
        // a ranger standing in the lane: swerve or get knocked about
        const rg = this._acquireRanger();
        rg.root.position.set(lane * LANE_W, 0, z);
        const o = this._obstacle('stumble', 'ranger', lane, z + 0.4, 0.8, 0, 1.9, null);
        o.ranger = rg;
        o.minX = lane * LANE_W - 0.5; o.maxX = lane * LANE_W + 0.5;
      }
      z -= rnd(14, 22);
    }
    if (chance(0.5)) this._coinLine(lane, zNear - 3, 5);
  }

  // -- pickups -------------------------------------------------------------------
  _pickupsForBlock(plans, zNear, zFar) {
    this.sincePickup += BLOCK_L;
    this.sinceLetter += BLOCK_L;
    this.sinceBubble += BLOCK_L;
    const freeLanes = [-1, 0, 1].filter((l) => plans[l] === 'free' || plans[l] === 'barriers' || plans[l] === 'stumble');
    if (!freeLanes.length) return;
    if (this.sincePickup > rnd(130, 240)) {
      this.sincePickup = 0;
      const lane = pick(freeLanes);
      const z = zNear - rnd(6, 50);
      const r = Math.random();
      let kind;
      if (r < 0.21) kind = 'jetpack';
      else if (r < 0.42) kind = 'sneakers';
      else if (r < 0.63) kind = 'magnet';
      else if (r < 0.84) kind = 'multiplier';
      else if (r < 0.91) kind = 'biryani';
      else if (r < 0.96) kind = 'key';
      else kind = 'token';
      // First-run safety net: a key within 500 m gives a fresh player a real shot at the revive option
      // instead of the "SAVE ME ⚷1 · you have 0" dead tease.
      if (!this.keyGiven) kind = 'key';   // first pickup of every run is a key: warm-up blocks spawn none, so a distance window missed it
      if (!this._spotBlocked(lane, z)) { this._pickup(kind, lane, z); if (kind === 'key') this.keyGiven = true; }
    }
    if (this.sinceBubble > rnd(90, 170)) {
      this.sinceBubble = 0;
      const lane = pick(freeLanes);
      const z = zNear - rnd(6, 50);
      if (!this._spotBlocked(lane, z)) this._pickup('msg_bubble', lane, z);
    }
    if (this.sinceLetter > 150 && this.game.dailyWord) {
      const idx = this.game.dailyLettersCollected;
      if (idx < this.game.dailyWord.length) {
        const lane = pick(freeLanes);
        const z = zNear - rnd(6, 50);
        if (!this._spotBlocked(lane, z)) { this.sinceLetter = 0; this._pickup('letter', lane, z, this.game.dailyWord[idx]); }
      }
    }
  }

  _spotBlocked(lane, z) {
    for (const o of this.obstacles) if (o.lane === lane && z < o.zNear + 3 && z > o.zFar - 3) return true;
    for (const p of this.pickups) if (p.lane === lane && Math.abs(p.z - z) < 4) return true;
    return false;
  }

  _pickup(kind, lane, z, letter = null) {
    const mesh = kind === 'letter' ? this._letterMesh(letter) : kind === 'token' ? this._tokenMesh() : this._place(kind, lane * LANE_W, 1.1, z);
    mesh.position.set(lane * LANE_W, 1.1, z);
    this.pickups.push({ kind, letter, x: lane * LANE_W, y: 1.1, z, mesh, lane });
  }

  /** Biryani-box token: a smaller, purple-tinted key. Registered as a synthetic prop so the pool can recycle it. */
  _tokenMesh() {
    if (!this.assets.props.token) {
      const k = this.assets.prop('key');
      k.scale.setScalar(0.8);
      k.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const out = mats.map((m) => { const c = m.clone(); c.color.set(0x7b3fe4); return c; });
        o.material = Array.isArray(o.material) ? out : out[0];
      });
      const g = new THREE.Group(); g.add(k); g.name = 'token';
      this.assets.props.token = g;
    }
    return this.pool.acquire('token');
  }

  _letterMesh(letter) {
    const name = 'letter_' + letter;
    if (!this.assets.props[name]) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7b3fe4'; ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 84px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(letter, 64, 70);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mat);
      const g = new THREE.Group(); g.add(m); g.name = name;
      this.assets.props[name] = g;
    }
    return this.pool.acquire(name);
  }

  // -- scenery ----------------------------------------------------------------------
  _wall(s, tz) {
    const name = chance(0.25) ? 'wall_segment' : 'wall_graffiti_' + Math.floor(Math.random() * 4);
    this._decor(name, s * 7.6, 0, s > 0 ? tz : tz - TILE_L, s > 0 ? 0 : Math.PI);
  }

  _building(s, tz, names = ['building_0', 'building_1', 'building_2', 'building_3', 'building_4', 'building_5'], scaleY = null) {
    this._decor(pick(names), s * rnd(13.5, 17), 0, tz - 3, s > 0 ? -Math.PI / 2 : Math.PI / 2, scaleY ? [1, scaleY, 1] : null);
  }

  /** One landmark per zone per lap, placed on the first tile of a fixed block inside the zone. */
  _landmark(zoneId, tz, i) {
    if (i !== 0) return;
    const inZone = this.blockDistance % ZONE_LENGTH;
    const s = pick([-1, 1]);
    const face = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    switch (zoneId) {
      case 'avenue':
        if (inZone === 300) this._decor('landmark_faisal', s * 26, 0, tz - 12, face);
        if (inZone === 540) this._decor('landmark_metro_bridge', 0, 0, tz - 6);
        break;
      case 'chokepoint':
        if (inZone % 180 === 0) for (const ss of [-1, 1]) this._decor('landmark_container_wall', ss * 7.6, 0, tz - 6);
        if (inZone === 1200) this._decor('landmark_metro_bridge', 0, 0, tz - 6);
        break;
      case 'redzone':
        if (inZone === 1860) this._decor('landmark_monument', s * 15, 0, tz - 8, face);
        if (inZone === 2280) this._decor('landmark_parliament', s * 19, 0, tz - 16, face);
        break;
      case 'dchowk':
        if (inZone === 2940) this._decor('landmark_dchowk_gate', 0, 0, tz - BLOCK_L + 1);   // ride under it exactly at 3000 m
        break;
    }
  }

  _sideScenery(zoneId, tz, i) {
    const both = [-1, 1];
    this._landmark(zoneId, tz, i);
    const streetProp = (s, z) => this._decor(pick(['dhaba', 'rickshaw', 'bench', 'bench', 'tree', 'palm']), s * rnd(8.2, 10.5), 0, z, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    switch (zoneId) {
      case 'avenue':
        for (const s of both) { const r = Math.random(); const name = r < 0.35 ? 'palm' : r < 0.6 ? 'tree_pipal' : 'tree'; this._decor(name, s * (name === 'palm' ? rnd(5.6, 6.2) : rnd(4.8, 5.6)), 0, tz - rnd(1, 9)); }
        if (i % 2 === 1) for (const s of both) this._decor('lamp_post', s * 6.4, 0, tz - 4, s > 0 ? Math.PI : 0);
        if (i === 2) this._building(pick(both), tz);
        if (i === 3 && chance(0.7)) streetProp(pick(both), tz - 4);
        if (i === 4 && chance(0.5)) { const s = pick(both); this._decor(pick(['billboard_0', 'billboard_1', 'billboard_2']), s * 10.5, 0, tz, s > 0 ? -0.35 : 0.35); }
        if (i === 0 && chance(0.4)) for (const s of both) this._decor('tree', s * rnd(9, 13), 0, tz - rnd(0, 6));
        break;
      case 'chokepoint':
        for (const s of both) this._wall(s, tz);
        if (i % 2 === 1) { const s = pick(both); this._decor('container_yard', s * 12, 0, tz, s > 0 ? 0 : Math.PI); }
        if (i === 0) for (const s of both) if (chance(0.6)) this._decor('container_stack', s * 9.5, 0, tz);
        if (i === 2) { const s = pick(both); this._decor('police_van', s * 6.0, 0, tz - 2, s > 0 ? Math.PI : 0); }
        if (i === 3) this._building(pick(both), tz, ['building_0', 'building_3']);
        if (i === 4) { const s = pick(both); this._decor('lamp_post', s * 6.4, 0, tz - 4, s > 0 ? Math.PI : 0); }
        if (i === 1 && chance(0.5)) { const s = pick(both); this._decor('tyre_stack', s * 5.4, 0, tz - 5); }
        break;
      case 'redzone':
        for (const s of both) this._wall(s, tz);
        if (i % 2 === 0) for (const s of both) this._building(s, tz, ['building_2', 'building_4', 'building_5', 'building_1'], rnd(1.2, 2.2));
        if (i === 1 && chance(0.6)) { const s = pick(both); this._decor(pick(['billboard_0', 'billboard_2']), s * 10.5, 0, tz, s > 0 ? -0.35 : 0.35); }
        if (i === 3) for (const s of both) this._decor('lamp_post', s * 6.4, 0, tz - 4, s > 0 ? Math.PI : 0);
        if (i === 4 && chance(0.5)) this._decor('overpass_sign', 0, 0, tz);
        if (i === 2 && chance(0.6)) { const s = pick(both); this._decor('police_van', s * 6.0, 0, tz - 2, s > 0 ? Math.PI : 0); }
        break;
      case 'dchowk':
        for (const s of both) this._decor(chance(0.4) ? 'tree_pipal' : 'tree', s * rnd(4.6, 5.4), 0, tz - rnd(1, 9));
        if (i % 2 === 0) for (const s of both) this._decor('flag_pole', s * 6.6, 0, tz - 3);
        if (i === 1) for (const s of both) this._decor('lamp_post', s * 6.4, 0, tz - 6, s > 0 ? Math.PI : 0);
        if (i === 2) this._decor('metro_station', 7.4, 0, tz, 0);
        if (i === 3) { const s = pick(both); this._building(s, tz, ['building_1', 'building_3', 'building_5']); }
        if (i === 4 && chance(0.6)) this._decor('overpass_sign', 0, 0, tz);
        break;
    }
  }

  airCoins(playerZ, altitude) {
    if (this.airCoinZ === undefined || this.airCoinZ > playerZ - 30) this.airCoinZ = playerZ - 60;
    while (this.airCoinZ > playerZ - 120) {
      const lane = pick([-1, 0, 1]);
      const n = 6 + Math.floor(Math.random() * 6);
      for (let k = 0; k < n; k++) this.coins.add(lane * LANE_W, altitude - 0.3 + Math.sin(k * 0.7) * 0.4, this.airCoinZ - k * 1.8);
      this.airCoinZ -= n * 1.8 + rnd(6, 16);
    }
  }

  // ------------------------------------------------------------------ collisions
  groundHeight(p) {
    const b = p.bounds();
    let g = 0;
    for (const o of this.obstacles) {
      if (o.kind !== 'train' && o.kind !== 'ramp') continue;
      if (o.moving) continue;
      if (b.maxX <= o.minX + 0.15 || b.minX >= o.maxX - 0.15) continue;
      // trains: snap up as soon as the bike's FRONT edge reaches the roof (collide() also tests the front edge,
      // so using the centre here let the bumper clip the container face at the top of every ramp)
      // near end: the FRONT edge; far end: the REAR edge — the roof holds until the whole bike has left it
      const half = o.kind === 'train' ? PLAYER.depth / 2 : 0;
      if (p.z - half > o.zNear || p.z + half < o.zFar) continue;
      if (o.kind === 'ramp') {
        const t = (o.zNear - p.z) / o.length;
        const h = t * TRAIN_H;
        if (p.y >= h - 0.6 || p.grounded) g = Math.max(g, h);
      } else if (p.y >= o.yTop - 0.45) {
        g = Math.max(g, o.yTop);
      }
    }
    return g;
  }

  collide(p, prevZ, ignoreHits) {
    const events = [];
    const b = p.bounds();
    const onRoof = p.y > TRAIN_H - 0.5;
    for (const o of this.obstacles) {
      if (o.zFar > b.maxZ || o.zNear < b.minZ) continue;
      if (b.maxX <= o.minX || b.minX >= o.maxX) continue;
      if (o.kind === 'ramp') continue;
      if (b.minY >= o.yTop - 0.05 || b.maxY <= o.yBot) continue;
      if (ignoreHits) continue;
      if (o.kind === 'stumble') {
        if (o.hit) continue;
        o.hit = true;
        events.push({ type: 'stumble', obstacle: o });
        if (o.ranger) { o.ranger.actions.Idle.stop(); const d = o.ranger.actions.Dead; d.reset(); d.setLoop(THREE.LoopOnce, 1); d.clampWhenFinished = true; d.play(); }
        else if (o.mesh) o.mesh.rotation.x = -0.9;
        continue;
      }
      if (o.kind === 'train' || o.kind === 'solid') {
        const wasAlongside = (prevZ - PLAYER.depth / 2) < o.zNear - 0.6;
        if (wasAlongside && p.laneT < 1 && !o.moving) events.push({ type: 'sideswipe', obstacle: o });
        else events.push({ type: 'death', obstacle: o, cause: o.moving ? 'jeep' : o.kind === 'solid' ? 'pillar' : 'container' });
        continue;
      }
      if (o.kind === 'barrier') events.push({ type: 'death', obstacle: o, cause: o.type, onRoof });
    }
    const keep = [];
    for (const pk of this.pickups) {
      const dz = pk.z - p.z, dx = pk.x - p.x, dy = pk.y - (p.y + 0.9);
      if (Math.abs(dz) < 1.2 && Math.abs(dx) < 1.0 && Math.abs(dy) < 1.6) {
        events.push({ type: 'pickup', kind: pk.kind, letter: pk.letter });
        this.pool.release(pk.mesh);
      } else keep.push(pk);
    }
    this.pickups = keep;
    return events;
  }

  shift(dz) {
    for (const o of this.obstacles) { o.zNear += dz; o.zFar += dz; for (const m of o.meshes) m.position.z += dz; if (o.ranger) o.ranger.root.position.z += dz; }
    for (const p of this.pickups) { p.z += dz; p.mesh.position.z += dz; }
    for (const d of this.decor) { d.z += dz; d.mesh.position.z += dz; }
    for (const pm of this.pendingMovers) { pm.spawnZ += dz; pm.triggerZ += dz; }
    if (this.airCoinZ !== undefined) this.airCoinZ += dz;
    this.coins.shift(dz);
    this.genZ += dz;
  }
}
