import * as THREE from 'three';
import { LANE_W, TILE_L, TRAIN_W, TRAIN_H, RAMP_L, PLAYER } from './constants.js';
import { Pool } from './Pool.js';
import { Coins } from './Coins.js';

const BLOCK_TILES = 5;
const BLOCK_L = BLOCK_TILES * TILE_L;   // 60 m
const GEN_AHEAD = 260;                   // metres of track kept ahead of the player
const CULL_BEHIND = 22;

const ZONES = ['avenue', 'metro', 'redzone', 'hills', 'bluearea'];
const ZONE_BLOCKS = 9;                   // blocks per zone (~540 m)

function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }

export class Track {
  constructor(assets, scene, game) {
    this.assets = assets;
    this.scene = scene;
    this.game = game;
    this.pool = new Pool(assets, scene);
    this.coins = new Coins(assets, scene);
    this.obstacles = [];
    this.pickups = [];
    this.decor = [];          // {mesh, z}
    this.movers = [];         // moving trains
    this.letterCache = new Map();
    this.reset();
  }

  reset() {
    for (const o of this.obstacles) this._releaseObstacle(o);
    for (const p of this.pickups) this.pool.release(p.mesh);
    for (const d of this.decor) this.pool.release(d.mesh);
    for (const m of this.movers) this._releaseObstacle(m);
    this.obstacles = [];
    this.pickups = [];
    this.decor = [];
    this.movers = [];
    this.coins.clear();
    this.genZ = 0;           // near edge of the next block to generate (z decreases)
    this.blockIndex = 0;
    this.prevPlans = { '-1': 'free', 0: 'free', 1: 'free' };
    this.prevTrainEnd = { '-1': null, 0: null, 1: null };
    this.sincePickup = 0;
    this.sinceLetter = 0;
    this.pendingMovers = [];
    this.tunnelActive = false;
    // starting stretch: 2 blocks of free track
    this._generateBlock(true);
    this._generateBlock(true);
  }

  get zone() { return ZONES[Math.floor(this.blockIndex / ZONE_BLOCKS) % ZONES.length]; }
  get difficulty() { return Math.min(1, this.game.distance / 3000); }

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
      minX: cx - TRAIN_W / 2, maxX: cx + TRAIN_W / 2, yBot, yTop, mesh, meshes: extra.meshes || [mesh],
      speed: extra.speed || 0, hitCount: 0,
    };
    this.obstacles.push(o);
    return o;
  }

  _releaseObstacle(o) { for (const m of o.meshes) this.pool.release(m); }

  _coinLine(lane, zNear, count, y = 0.9, step = 1.7, arcOver = null) {
    const x = lane * LANE_W;
    for (let i = 0; i < count; i++) {
      const z = zNear - i * step;
      let yy = y;
      if (arcOver) {
        const t = (z - arcOver.z) / arcOver.half;          // -1..1 around the barrier
        yy = y + Math.max(0, 1 - t * t) * arcOver.h;
      }
      this.coins.add(x, yy, z);
    }
  }

  // ------------------------------------------------------------------ generation
  update(playerZ, dt, speed) {
    while (this.genZ > playerZ - GEN_AHEAD) this._generateBlock(false);
    this._cull(playerZ + CULL_BEHIND);
    // release pending moving trains when the player gets close
    for (let i = this.pendingMovers.length - 1; i >= 0; i--) {
      const pm = this.pendingMovers[i];
      if (playerZ < pm.triggerZ) {
        this.pendingMovers.splice(i, 1);
        this._spawnMover(pm);
      }
    }
    for (const m of this.movers) {
      const dz = m.speed * dt;
      m.zNear += dz; m.zFar += dz;
      for (const mesh of m.meshes) mesh.position.z += dz;
      m.lampT = (m.lampT || 0) + dt;
    }
    // spin pickups
    for (const p of this.pickups) {
      p.mesh.rotation.y += dt * 2.2;
      p.mesh.position.y = p.y + Math.sin(this.game.time * 3 + p.z) * 0.12;
    }
  }

  _cull(cullZ) {
    const keepO = [];
    for (const o of this.obstacles) {
      if (o.zFar > cullZ && !o.speed) this._releaseObstacle(o); else keepO.push(o);
    }
    this.obstacles = keepO;
    const keepM = [];
    for (const m of this.movers) {
      if (m.zFar > cullZ + 40) { this._releaseObstacle(m); this.obstacles = this.obstacles.filter((x) => x !== m); }
      else keepM.push(m);
    }
    this.movers = keepM;
    const keepP = [];
    for (const p of this.pickups) { if (p.z > cullZ) this.pool.release(p.mesh); else keepP.push(p); }
    this.pickups = keepP;
    const keepD = [];
    for (const d of this.decor) { if (d.z > cullZ + 12) this.pool.release(d.mesh); else keepD.push(d); }
    this.decor = keepD;
  }

  _generateBlock(safe) {
    const zNear = this.genZ;
    const zFar = zNear - BLOCK_L;
    const zone = this.zone;
    const d = this.difficulty;
    const tunnel = !safe && !this.tunnelActive && chance(0.12 + d * 0.08) && zone !== 'hills';
    if (tunnel) this.tunnelActive = true; else this.tunnelActive = false;

    // ground + scenery
    for (let i = 0; i < BLOCK_TILES; i++) {
      const tz = zNear - i * TILE_L;
      this._decor('ground_tile', 0, 0, tz);
      if (tunnel) this._decor('tunnel', 0, 0, tz, 0, [1, 1.6, 1]);
      else this._sideScenery(zone, tz, i);
    }

    // lane plans
    const plans = {};
    if (safe) {
      plans[-1] = plans[0] = plans[1] = 'free';
    } else {
      const freeLane = pick([-1, 0, 1]);
      for (const lane of [-1, 0, 1]) {
        if (lane === freeLane) { plans[lane] = chance(0.55 + d * 0.3) ? 'barriers' : 'free'; continue; }
        const r = Math.random();
        const prevTrain = this.prevPlans[lane] === 'train';
        if (prevTrain && r < 0.55) plans[lane] = 'train';
        else if (r < 0.30 + d * 0.15) plans[lane] = 'train';
        else if (r < 0.48 + d * 0.15) plans[lane] = 'barriers';
        else if (r < 0.58 + d * 0.1 && lane === 0 && !tunnel) plans[lane] = 'pillar';
        else if (r < 0.70 + d * 0.12 && this.prevPlans[lane] !== 'train' && !prevTrain) plans[lane] = 'moving';
        else if (r < 0.80) plans[lane] = 'stumble';
        else plans[lane] = 'free';
      }
      // never two moving trains at once
      const movers = [-1, 0, 1].filter((l) => plans[l] === 'moving');
      for (let i = 1; i < movers.length; i++) plans[movers[i]] = 'free';
    }

    const roofCoins = [];
    for (const lane of [-1, 0, 1]) {
      const plan = plans[lane];
      const continueTrain = this.prevPlans[lane] === 'train' && this.prevTrainEnd[lane] !== null &&
        Math.abs(this.prevTrainEnd[lane] - zNear) < 0.01;
      this.prevTrainEnd[lane] = null;
      switch (plan) {
        case 'free': this._planFree(lane, zNear, zFar, d); break;
        case 'barriers': this._planBarriers(lane, zNear, zFar, d, safe); break;
        case 'train': this._planTrain(lane, zNear, zFar, d, continueTrain, zone); break;
        case 'pillar': this._planPillar(lane, zNear, zFar); break;
        case 'moving': this._planMoving(lane, zNear, zFar, d, zone); break;
        case 'stumble': this._planStumble(lane, zNear, zFar, d); break;
      }
    }
    this.prevPlans = plans;

    // power-ups / keys / letters
    if (!safe) this._pickupsForBlock(plans, zNear, zFar);

    this.genZ = zFar;
    this.blockIndex++;
  }

  // -- lane plans -------------------------------------------------------------
  _planFree(lane, zNear, zFar, d) {
    if (chance(0.7)) {
      const start = zNear - rnd(2, 12);
      const n = Math.floor(rnd(6, 14));
      this._coinLine(lane, start, n);
    }
    if (chance(0.3)) this._coinLine(lane, zNear - rnd(30, 40), Math.floor(rnd(4, 9)));
  }

  _planBarriers(lane, zNear, zFar, d, safe) {
    let z = zNear - rnd(8, 16);
    const minGap = 14 - d * 4;
    let coinsAfter = chance(0.6);
    while (z > zFar + 6) {
      const r = Math.random();
      let type;
      if (r < 0.45) type = 'barrier_low';
      else if (r < 0.75) type = 'barrier_high';
      else type = 'barrier_mid';
      this._barrier(type, lane, z);
      if (type === 'barrier_low' && chance(0.7)) {
        this._coinLine(lane, z + 4.5, 6, 0.9, 1.5, { z, half: 3.2, h: 1.6 });
      } else if (coinsAfter) {
        this._coinLine(lane, z - 3, 4, 0.9, 1.6);
      }
      z -= rnd(minGap, minGap + 12);
    }
  }

  _barrier(type, lane, z) {
    const mesh = this._place(type, lane * LANE_W, 0, z);
    if (type === 'barrier_low') this._obstacle('barrier', type, lane, z + 0.15, 0.3, 0, 1.05, mesh);
    else if (type === 'barrier_high') this._obstacle('barrier', type, lane, z + 0.15, 0.3, 1.55, 3.0, mesh);
    else if (type === 'barrier_mid') this._obstacle('barrier', type, lane, z + 0.15, 0.3, 1.05, 1.5, mesh);
  }

  _trainType(zone) {
    if (zone === 'metro') return chance(0.65) ? 'train_metro' : 'train_passenger';
    if (zone === 'redzone') return chance(0.6) ? 'train_freight' : 'train_passenger';
    const r = Math.random();
    return r < 0.5 ? 'train_passenger' : r < 0.8 ? 'train_metro' : 'train_freight';
  }

  _planTrain(lane, zNear, zFar, d, continueTrain, zone) {
    let z = zNear;
    if (!continueTrain) {
      // gap before the train, optionally a ramp so the runner can climb it
      const gap = rnd(4, 14);
      if (chance(0.6)) this._coinLine(lane, zNear - 1, Math.max(2, Math.floor((gap - 2) / 1.6)));
      z = zNear - gap;
      if (chance(0.55)) {
        const rampMesh = this._place('train_ramp', lane * LANE_W, 0, z);
        this._obstacle('ramp', 'ramp', lane, z, RAMP_L, 0, TRAIN_H, rampMesh);
        z -= RAMP_L;
      }
    }
    // how many coaches fit
    let coaches = Math.floor((z - zFar) / TILE_L);
    if (coaches <= 0) { this._planFree(lane, zNear, zFar, d); return; }
    if (coaches > 1 && chance(0.3)) coaches -= 1;   // leave a jump gap at the end
    const type = this._trainType(zone);
    const meshes = [];
    for (let i = 0; i < coaches; i++) {
      const m = this._place(type, lane * LANE_W, 0, z - i * TILE_L);
      meshes.push(m);
    }
    const len = coaches * TILE_L;
    this._obstacle('train', type, lane, z, len, 0, TRAIN_H, meshes[0], { meshes });
    // roof coins
    if (chance(0.8)) this._coinLine(lane, z - 2, Math.min(12, Math.floor((len - 3) / 1.7)), TRAIN_H + 0.9);
    const end = z - len;
    if (Math.abs(end - zFar) < 0.01) this.prevTrainEnd[lane] = end;
    else if (end - zFar > 3 && chance(0.5)) {
      // small trailing barrier area is unfair right after a drop; put coins instead
      this._coinLine(lane, end - 3, Math.max(1, Math.floor((end - zFar - 4) / 1.7)));
    }
  }

  _planPillar(lane, zNear, zFar) {
    const z = zNear - rnd(18, 42);
    const mesh = this._place('pillar', lane * LANE_W, 0, z + 0.7);
    const deck = this._decor('overpass', 0, 0, z + 1.5);
    this._obstacle('solid', 'pillar', lane, z + 0.7, 1.4, 0, 4.4, mesh);
    // coins in neighbouring lanes to lure
    for (const l of [-1, 0, 1]) if (l !== lane && chance(0.5)) this._coinLine(l, z + 6, 7);
  }

  _planMoving(lane, zNear, zFar, d, zone) {
    const type = this._trainType(zone);
    const coaches = chance(0.5) ? 2 : 3;
    this.pendingMovers.push({ lane, type, coaches, spawnZ: zFar - 10, triggerZ: zNear + 110, speed: rnd(9, 13) + d * 4 });
    if (chance(0.5)) this._coinLine(lane, zNear - rnd(4, 10), 6);
  }

  _spawnMover(pm) {
    const meshes = [];
    for (let i = 0; i < pm.coaches; i++) meshes.push(this._place(pm.type, pm.lane * LANE_W, 0, pm.spawnZ - i * TILE_L));
    // warning lamp on the front
    const o = this._obstacle('train', pm.type, pm.lane, pm.spawnZ, pm.coaches * TILE_L, 0, TRAIN_H, meshes[0], { meshes, speed: pm.speed });
    o.moving = true;
    this.movers.push(o);
    this.game.onMoverSpawn && this.game.onMoverSpawn(o);
  }

  _planStumble(lane, zNear, zFar, d) {
    const n = 1 + (chance(0.5) ? 1 : 0);
    let z = zNear - rnd(10, 20);
    for (let i = 0; i < n && z > zFar + 6; i++) {
      const type = chance(0.5) ? 'bush' : 'light_pole';
      const x = type === 'light_pole' ? lane * LANE_W + (chance(0.5) ? 0.6 : -0.6) : lane * LANE_W;
      const mesh = this._place(type, x, 0, z);
      const o = this._obstacle('stumble', type, lane, z + 0.4, 0.8, 0, type === 'bush' ? 1.3 : 2.8, mesh);
      if (type === 'light_pole') { o.minX = x - 0.25; o.maxX = x + 0.25; }
      if (type === 'bush' && chance(0.6)) this._coinLine(lane, z + 4, 6, 0.9, 1.5, { z, half: 3.0, h: 1.4 });
      z -= rnd(14, 22);
    }
    if (chance(0.5)) this._coinLine(lane, zNear - 3, 5);
  }

  // -- pickups -------------------------------------------------------------------
  _pickupsForBlock(plans, zNear, zFar) {
    this.sincePickup += BLOCK_L;
    this.sinceLetter += BLOCK_L;
    const freeLanes = [-1, 0, 1].filter((l) => plans[l] === 'free' || plans[l] === 'barriers' || plans[l] === 'stumble');
    if (this.sincePickup > rnd(130, 240) && freeLanes.length) {
      this.sincePickup = 0;
      const lane = pick(freeLanes);
      const z = zNear - rnd(6, 50);
      const r = Math.random();
      let kind;
      if (r < 0.22) kind = 'jetpack';
      else if (r < 0.44) kind = 'sneakers';
      else if (r < 0.66) kind = 'magnet';
      else if (r < 0.88) kind = 'multiplier';
      else if (r < 0.95) kind = 'mystery_box';
      else kind = 'key';
      if (!this._spotBlocked(lane, z)) this._pickup(kind, lane, z);
    }
    if (this.sinceLetter > 380 && freeLanes.length && this.game.dailyWord) {
      const idx = this.game.dailyLettersCollected;
      if (idx < this.game.dailyWord.length) {
        this.sinceLetter = 0;
        const lane = pick(freeLanes);
        const z = zNear - rnd(6, 50);
        if (!this._spotBlocked(lane, z)) this._pickup('letter', lane, z, this.game.dailyWord[idx]);
      }
    }
  }

  _spotBlocked(lane, z) {
    for (const o of this.obstacles) if (o.lane === lane && z < o.zNear + 3 && z > o.zFar - 3) return true;
    return false;
  }

  _pickup(kind, lane, z, letter = null) {
    let mesh;
    if (kind === 'letter') mesh = this._letterMesh(letter);
    else mesh = this._place(kind, lane * LANE_W, 1.1, z);
    mesh.position.set(lane * LANE_W, 1.1, z);
    mesh.scale.setScalar(kind === 'coin' ? 1 : 1.0);
    this.pickups.push({ kind, letter, x: lane * LANE_W, y: 1.1, z, mesh, lane });
  }

  _letterMesh(letter) {
    // letters are pooled per-character via the generic pool using a synthetic prop
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
    this._decor(name, s * 4.6, 0, s > 0 ? tz : tz - TILE_L, s > 0 ? 0 : Math.PI);
  }

  _building(s, tz, names = ['building_0', 'building_1', 'building_2', 'building_3', 'building_4', 'building_5'], scaleY = null) {
    this._decor(pick(names), s * rnd(12.5, 16), 0, tz - 3, s > 0 ? -Math.PI / 2 : Math.PI / 2, scaleY ? [1, scaleY, 1] : null);
  }

  _sideScenery(zone, tz, i) {
    const both = [-1, 1];
    const streetProp = (s, z) => this._decor(pick(['dhaba', 'rickshaw', 'bench', 'bench', 'tree', 'palm']), s * rnd(6.2, 8.5), 0, z, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    switch (zone) {
      case 'avenue':
        for (const s of both) this._wall(s, tz);
        if (i % 2 === 0) for (const s of both) this._decor('tree', s * rnd(6.5, 8), 0, tz - rnd(0, 8));
        if (i % 2 === 1) { const s = pick(both); this._decor('lamp_post', s * 5.6, 0, tz - 4, s > 0 ? Math.PI : 0); }
        if (i === 2) this._building(pick(both), tz);
        if (i === 3 && chance(0.6)) streetProp(pick(both), tz - 4);
        if (i === 4 && chance(0.5)) { const s = pick(both); this._decor(pick(['billboard_0', 'billboard_1', 'billboard_2']), s * 9, 0, tz, s > 0 ? -0.35 : 0.35); }
        break;
      case 'metro':
        if (i === 0) for (const s of both) this._decor('metro_station', s * 6.6, 0, s > 0 ? tz : tz - 14, s > 0 ? 0 : Math.PI);
        if (i === 2) for (const s of both) this._decor('station_platform', s * 5.6, 0, s > 0 ? tz : tz - 24, s > 0 ? 0 : Math.PI);
        if (i === 1 || i === 3) this._building(pick(both), tz, ['building_2', 'building_4', 'building_5']);
        if (i === 4 && chance(0.4)) this._decor('overpass_sign', 0, 0, tz);
        if (i === 4) for (const s of both) this._decor('lamp_post', s * 5.6, 0, tz - 6, s > 0 ? Math.PI : 0);
        break;
      case 'redzone':
        for (const s of both) this._wall(s, tz);
        if (i % 2 === 1) { const s = pick(both); this._decor('container_yard', s * 10, 0, tz, s > 0 ? 0 : Math.PI); }
        if (i === 3) this._building(pick(both), tz, ['building_0', 'building_3']);
        if (i === 0 && chance(0.5)) for (const s of both) this._decor('container_stack', s * 7, 0, tz);
        if (i === 2) { const s = pick(both); this._decor('lamp_post', s * 5.6, 0, tz - 4, s > 0 ? Math.PI : 0); }
        break;
      case 'hills':
        for (const s of both) { this._decor(chance(0.5) ? 'tree' : 'palm', s * rnd(5.5, 7.5), 0, tz - rnd(0, 6)); }
        if (i % 2 === 0) for (const s of both) this._decor('tree', s * rnd(9, 14), 0, tz - rnd(0, 8));
        if (i === 1 && chance(0.5)) streetProp(pick(both), tz - 3);
        if (i === 2 && chance(0.4)) { const s = pick(both); this._decor(pick(['billboard_2', 'billboard_1']), s * 8.5, 0, tz, s > 0 ? -0.35 : 0.35); }
        break;
      case 'bluearea':
        for (const s of both) this._wall(s, tz);
        if (i % 2 === 0) for (const s of both) this._building(s, tz, ['building_2', 'building_4', 'building_5', 'building_1'], rnd(1.2, 2.2));
        if (i === 1 && chance(0.6)) { const s = pick(both); this._decor(pick(['billboard_0', 'billboard_2']), s * 9, 0, tz, s > 0 ? -0.35 : 0.35); }
        if (i === 3) for (const s of both) this._decor('lamp_post', s * 5.6, 0, tz - 4, s > 0 ? Math.PI : 0);
        break;
    }
  }

  /** Coins floating at jetpack altitude, spawned while flying. */
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
  /** Height of the surface under the player (ground, ramp or train roof). */
  groundHeight(p) {
    const b = p.bounds();
    let g = 0;
    for (const o of this.obstacles) {
      if (o.kind !== 'train' && o.kind !== 'ramp') continue;
      if (b.maxX <= o.minX + 0.15 || b.minX >= o.maxX - 0.15) continue;
      if (p.z > o.zNear || p.z < o.zFar) continue;
      if (o.kind === 'ramp') {
        const t = (o.zNear - p.z) / o.length;
        const h = t * TRAIN_H;
        if (p.y >= h - 0.6) g = Math.max(g, h);
      } else if (p.y >= o.yTop - 0.45) {
        g = Math.max(g, o.yTop);
      }
    }
    return g;
  }

  /** Returns a list of events: coin/pickup/stumble/sideswipe/death */
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
        // knock it over
        o.mesh.rotation.x = -0.9;
        continue;
      }
      if (o.kind === 'train' || o.kind === 'solid') {
        // side swipe: we were already alongside it last frame and moved sideways into it
        const wasAlongside = (prevZ - PLAYER.depth / 2) < o.zNear - 0.6;
        if (wasAlongside && p.laneT < 1) {
          events.push({ type: 'sideswipe', obstacle: o });
        } else {
          events.push({ type: 'death', obstacle: o, cause: o.moving ? 'moving_train' : o.kind === 'solid' ? 'pillar' : 'train' });
        }
        continue;
      }
      if (o.kind === 'barrier') {
        events.push({ type: 'death', obstacle: o, cause: o.type, onRoof });
      }
    }
    // pickups
    const keep = [];
    for (const pk of this.pickups) {
      const dz = pk.z - p.z, dx = pk.x - p.x, dy = pk.y - (p.y + 0.9);
      if (Math.abs(dz) < 1.0 && Math.abs(dx) < 1.0 && Math.abs(dy) < 1.6) {
        events.push({ type: 'pickup', kind: pk.kind, letter: pk.letter });
        this.pool.release(pk.mesh);
      } else keep.push(pk);
    }
    this.pickups = keep;
    return events;
  }

  /** Shift the whole world by dz to keep coordinates small. */
  shift(dz) {
    for (const o of this.obstacles) { o.zNear += dz; o.zFar += dz; for (const m of o.meshes) m.position.z += dz; }
    for (const p of this.pickups) { p.z += dz; p.mesh.position.z += dz; }
    for (const d of this.decor) { d.z += dz; d.mesh.position.z += dz; }
    for (const pm of this.pendingMovers) { pm.spawnZ += dz; pm.triggerZ += dz; }
    this.coins.shift(dz);
    this.genZ += dz;
  }
}
