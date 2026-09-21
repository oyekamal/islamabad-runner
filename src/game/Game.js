import * as THREE from 'three';
import { LANE_W, SPEED, SCORE_PER_METRE, POWERUP_BASE_DURATION, POWERUP_UPGRADE_STEP, HOVERBOARD_TIME, BUBBLES_PER_TURBO, REVIVE_KEYS, COLORS, TRAIN_H, ZONE_LENGTH } from './constants.js';
import { Player } from './Player.js';
import { Chaser } from './Chaser.js';
import { Track, zoneAt } from './Track.js';
import { Effects } from './Effects.js';
import { Input } from './Input.js';
import { Audio } from './Audio.js';
import { Save } from './Save.js';
import { CHARACTERS, BIKES } from '../data/characters.js';
import { MISSION_SETS, MAX_MULTIPLIER, DAILY_WORDS, DAILY_REWARDS } from '../data/missions.js';

const POWERUP_COLORS = { jetpack: 0xff4d2b, sneakers: 0xff3333, magnet: 0xff5a5a, multiplier: 0x3d8bff, biryani: 0xffb347, key: 0xffd53d, token: 0x7b3fe4, letter: 0xffffff, msg_bubble: 0x25a244 };
const STEP = 1 / 60;          // fixed simulation substep
const MAX_STEPS = 4;          // per rendered frame; anything beyond is dropped

export class Game {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets;
    this.save = new Save();
    this.audio = new Audio(this.save.data.settings);
    this.listeners = {};
    this.state = 'menu';         // menu | running | paused | dying | dead | revive
    this.time = 0;
    this.distance = 0;

    // renderer — quality from settings: low | auto (default) | high. Antialias is fixed at creation.
    this.quality = this.save.data.settings.quality || 'auto';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this._applyQuality(this.quality);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(COLORS.fog, 60, 230);
    this.camera = new THREE.PerspectiveCamera(58, 9 / 16, 0.3, 600);
    this.camShake = 0;

    this._buildSky();
    this._buildLights();

    this.player = new Player(assets, this.scene, this.characterDef(), this.bikeDef());
    this.chaser = new Chaser(assets, this.scene);
    for (const root of [this.player.group, this.chaser.group]) root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
    this.track = new Track(assets, this.scene, this);
    this.fx = new Effects(this.scene);
    this._buildSkyline();

    this.input = new Input(canvas);
    this.input.on((t) => this._onInput(t));

    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.speed = 0;
    this.baseMultiplier = 1;
    this.run = null;
    this.powerups = {};              // kind -> remaining seconds
    this.hoverTimer = 0;
    this.invuln = 0;
    this.reviveCount = 0;
    this.dailyWord = this._dailyWord();
    this.dailyLettersCollected = this.save.data.daily.letters;
    this._setupMissionBase();

    this.slowmo = 1;
    this.frames = 0;
    this.fps = 60;
    this._fpsAcc = 0;
    this.idleCam();
    this._loop();
  }

  // ------------------------------------------------------------------ events
  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  emit(ev, data) { for (const f of this.listeners[ev] || []) f(data); }

  // ------------------------------------------------------------------ scene setup
  _buildSky() {
    const geo = new THREE.SphereGeometry(500, 24, 12);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x4aa3ff) }, mid: { value: new THREE.Color(0x9dd3ff) }, bottom: { value: new THREE.Color(0xf2f6ff) } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bottom, clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
    // a few soft clouds
    this.clouds = new THREE.Group();
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 8, 8, 6), cm);
        s.position.set(k * 9 - n * 4, Math.random() * 3, Math.random() * 4);
        s.scale.y = 0.55;
        g.add(s);
      }
      g.position.set((Math.random() - 0.5) * 500, 60 + Math.random() * 50, -180 - Math.random() * 220);
      this.clouds.add(g);
    }
    this.scene.add(this.clouds);
    // endless ground plane under everything (dry Islamabad grass / earth)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 900), new THREE.MeshLambertMaterial({ color: 0x9db06a }));
    ground.receiveShadow = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    this.ground = ground;
    this.scene.add(ground);
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 1.25));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
    sun.position.set(-6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -7; sc.right = 7; sc.top = 9; sc.bottom = -9; sc.near = 2; sc.far = 40;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
    const fill = new THREE.DirectionalLight(0xc9e6ff, 0.5);
    fill.position.set(8, 6, -10);
    this.scene.add(fill);
  }

  _buildSkyline() {
    // Far backdrop that travels with the player (skybox-like)
    this.skyline = new THREE.Group();
    const fogC = new THREE.Color(COLORS.fog);
    const add = (name, x, z, ry = 0, s = 1, tint = 0.45) => {
      const m = this.assets.prop(name); m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar(s);
      m.traverse((o) => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; o.material = mats.map((mm) => { const c = mm.clone(); c.fog = false; c.color.lerp(fogC, tint); c.emissive.set(0); return c; }); if (o.material.length === 1) o.material = o.material[0]; });
      this.skyline.add(m); return m; };
    add('margalla_hills', 0, -420, 0, 2.2);
    add('margalla_hills', -260, -400, 0.3, 1.8);
    add('margalla_hills', 260, -400, -0.3, 1.8);
    add('faisal_mosque', -95, -330, 0.4, 1.6);
    add('centaurus', 120, -340, -0.4, 1.4);
    add('pakistan_monument', -35, -300, 0, 1.3);
    for (let i = 0; i < 10; i++) {
      const s = i % 2 ? 1 : -1;
      add('building_' + (i % 6), s * (45 + Math.random() * 40), -160 - i * 18, s * Math.PI / 2 + (Math.random() - 0.5), 1.6 + Math.random() * 1.6);
    }
    this.scene.add(this.skyline);
  }

  /** DPR + shadow settings for a quality tier (antialias can't change after renderer creation). */
  _applyQuality(q) {
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(dpr, q === 'high' ? 2 : 1.5));
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.shadowMap.needsUpdate = true;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // wider screens see less vertical => keep the runner nicely framed
    this.baseFov = w > h ? 50 : 60;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ helpers
  characterDef() { return CHARACTERS.find((c) => c.id === this.save.data.character) || CHARACTERS[0]; }
  bikeDef() { return BIKES.find((b) => b.id === this.save.data.board) || BIKES[0]; }

  /** Daily Word Hunt rollover. Uses the LOCAL calendar date throughout; safe to call on every run start. */
  _dailyWord() {
    const d = new Date();
    const local = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const start = new Date(d.getFullYear(), 0, 0);
    const day = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000);
    const today = local(d);
    const daily = this.save.data.daily;
    if (daily.date !== today) {
      // new day: the streak survives only if yesterday's word was completed
      const yesterday = local(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
      if (daily.lastDone !== yesterday) daily.streak = 0;
      daily.date = today; daily.letters = 0; daily.done = false;
      this.save.write();
    }
    return DAILY_WORDS[day % DAILY_WORDS.length];
  }

  _setupMissionBase() {
    const s = this.save.data;
    if (!s.missionBase) {
      s.missionBase = {};
      const set = MISSION_SETS[Math.min(s.missionSet, MISSION_SETS.length - 1)];
      for (const m of set) if (m.scope === 'total') s.missionBase[m.stat] = s.stats[m.stat] || 0;
      this.save.write();
    }
  }

  get multiplier() {
    let m = this.baseMultiplier + (this.run ? this.run.boosterBonus : 0);
    if (this.powerups.multiplier > 0) m *= 2;
    return m;
  }

  // ------------------------------------------------------------------ run control
  startRun(opts = {}) {
    this.audio.init();
    this.audio.startMusic();
    const s = this.save.data;
    this.dailyWord = this._dailyWord();                  // re-run the day rollover on every start
    this.dailyLettersCollected = s.daily.letters;
    this.perk = this.characterDef().perk || null;        // 'coins' | 'shield' | 'powerups' | null
    this.distance = 0;
    this.speed = SPEED.start;
    this.baseMultiplier = Math.min(MAX_MULTIPLIER, 1 + s.missionSet);
    this.player.reset();
    this.player.setCharacter(this.characterDef(), this.bikeDef());
    this.chaser.reset();
    this.chaser.startRun();
    this.track.reset(opts.startDistance || 0);
    this.distance = opts.startDistance || 0;
    this.powerups = {};
    this.hoverTimer = 0;
    this.headstart = 0;   // was undefined on runs without a headstart: `undefined <= 0` is false, so the jetpack never landed
    this.invuln = 0;
    this.reviveCount = 0;
    this.slowmo = 1;
    this.bubbleCharge = s.bubbleCharge || 0;   // signal charge survives death
    this.run = {
      score: 0, coins: 0, jumps: 0, rolls: 0, powerups: 0, sneakers: 0, magnets: 0, jetpacks: 0, multipliers: 0, boxes: 0, keys: 0,
      barriersDodged: 0, stumbles: 0, hoverboards: 0, hoverNoCrash: 0, trainBumps: 0, trainJumps: 0, trainStreak: 0, letters: 0,
      signals: 0, bushes: 0, centerRolls: 0, sameLane: 0, sameLaneCur: 0, magnetCoins: 0, boosterBonus: 0, headstarts: 0,
      noCoinScore: 0, noJumpScore: 0, noRollScore: 0, noPowerupScore: 0, allPowerups: 0, kinds: new Set(), earlyCaught: 0,
      hoverCrashed: false, time: 0, tokens: 0, dodgedIds: new Set(), bubbles: 0, laps: 0,
      closeCalls: 0, newBestDistance: false, shieldUsed: false,
    };
    this._lastCloseCall = -1;
    this._laneChangeAt = -1; this._laneChangeFrom = 0;
    this._perfFrames = 0; this._perfWall = 0; this._perfChecked = false;
    this.zoneId = null;
    this.lastLap = 0;
    this.player.play('Ride');
    this.state = 'running';
    this.emit('runStart');
    if (opts.headstart && s.headstarts > 0) {
      s.headstarts--; this.save.addStat('headstarts'); this.run.headstarts++;
      this._activateHeadstart();
    }
    if (opts.booster && s.scoreBoosters > 0) {
      s.scoreBoosters--; this.run.boosterBonus = 5 + Math.floor(Math.random() * 3);
      this.emit('toast', `Score Booster +${this.run.boosterBonus}`);
    }
    this.save.write();
  }

  _activateHeadstart() {
    this.headstart = 4.5;
    this.player.setFlying(true, 5.5);
    this.invuln = 5.4;   // 4.5 s flight + ~0.6 s fall
    this.audio.jetpack();
    this.emit('toast', 'HEADSTART!');
  }

  pause() { if (this.state !== 'running') return; this.state = 'paused'; this.audio.stopMusic(); this.emit('paused'); }
  resume() { if (this.state !== 'paused') return; this.state = 'running'; this.audio.init(); this.audio.startMusic(); this.emit('resumed'); }

  /** Player died. Offer revive if keys are available. */
  _die(cause) {
    if (this.state !== 'running') return;
    this.state = 'dying';
    this.player.die();
    this.chaser.catchPlayer();
    this.audio.crash();
    this.audio.whistle();
    this.audio.stopMusic();
    this.camShake = 0.6;
    this.slowmo = 0.02; this.hitStop = 0.08;   // hit-stop, then 0.35 slow-mo (see _tick)
    this.fx.crash(this.player.x, this.player.y + 1, this.player.z);
    if (this.run.time < 10) { this.run.earlyCaught = 1; this.save.addStat('earlyCaught'); }
    this.emit('dying', cause);
    this.deathCause = cause;
    this.dyingTimer = 1.6;
    if (navigator.vibrate && this.save.data.settings.haptics) navigator.vibrate(120);
  }

  /** Cost of the next revive: keys, or the coin equivalent. */
  reviveCost() {
    const keysNeeded = REVIVE_KEYS[Math.min(this.reviveCount, REVIVE_KEYS.length - 1)];
    return { keysNeeded, coinsNeeded: 120 * Math.pow(2, this.reviveCount) };
  }

  _afterDeath() {
    this.state = 'dead';
    const { keysNeeded, coinsNeeded } = this.reviveCost();
    const s = this.save.data;
    this.emit('gameOver', { run: this.run, canRevive: s.keys >= keysNeeded, keysNeeded, coinsNeeded, canReviveWithCoins: s.coins >= coinsNeeded, cause: this.deathCause });
  }

  /** Spend keys to continue the run. */
  revive() {
    if (this.state !== 'dead') return false;
    const { keysNeeded } = this.reviveCost();
    if (this.save.data.keys < keysNeeded) return false;
    this.save.data.keys -= keysNeeded;
    this._doRevive();
    return true;
  }

  /** Spend banked coins (keysNeeded * 400) to continue the run. */
  reviveWithCoins() {
    if (this.state !== 'dead') return false;
    const { coinsNeeded } = this.reviveCost();
    if (this.save.data.coins < coinsNeeded) return false;
    this.save.data.coins -= coinsNeeded;
    this._doRevive();
    return true;
  }

  _doRevive() {
    this.reviveCount++;
    this.save.write();
    // clear the immediate neighbourhood and lift the player
    this.player.dead = false;
    this.player.rolling = 0; this.player.stumbling = 0;
    this.player.play('Ride', 0);
    this.player.setFlying(true, 5.5);
    this.headstart = 2.4;
    this.invuln = 3.6;   // 2.4 s flight + fall
    this.chaser.reset(); this.chaser.startRun();
    this.slowmo = 1;
    this.state = 'running';
    this.audio.init(); this.audio.startMusic();
    this.emit('revived');
  }

  /** Bank the run into the save. */
  finishRun() {
    const s = this.save.data;
    const r = this.run;
    const banked = this.perk === 'coins' ? Math.ceil(r.coins * 11 / 10) : r.coins;   // Noor: +10% coins (integer maths, no float ceil)
    s.coins += banked;
    this.save.addStat('coins', banked);
    this.save.addStat('score', Math.floor(r.score));
    this.save.addScore({ score: Math.floor(r.score), coins: r.coins, distance: Math.floor(this.distance), date: new Date().toISOString().slice(0, 10), character: s.character });
    this._checkMissions(true);
    this.save.write();
    this.emit('runFinished', r);
    this.run = null;
  }

  goToMenu() {
    if (this.run) this.finishRun();
    this.state = 'menu';
    this.audio.stopMusic();
    this.player.reset();
    this.player.setCharacter(this.characterDef(), this.bikeDef());
    this.chaser.reset();
    this.track.reset();
    this.distance = 0;
    this.idleCam();
    this.emit('menu');
  }

  idleCam() {
    this.camTarget = new THREE.Vector3();
  }

  // ------------------------------------------------------------------ input
  _onInput(t) {
    if (t === 'pause') { if (this.state === 'running') this.pause(); else if (this.state === 'paused') this.resume(); return; }
    if (this.state === 'menu' && (t === 'tap' || t === 'up' || t === 'doubletap')) { this.emit('tapToPlay'); return; }
    if (this.state !== 'running') return;
    const p = this.player;
    switch (t) {
      case 'left': if (p.moveLane(-1)) { this.audio.swipe(); this.run.sameLaneCur = 0; this._laneChangeAt = this.run.time; this._laneChangeFrom = p.lane; } break;
      case 'right': if (p.moveLane(1)) { this.audio.swipe(); this.run.sameLaneCur = 0; this._laneChangeAt = this.run.time; this._laneChangeFrom = p.lane; } break;
      case 'up':
        if (p.jump()) { this.audio.jump(); this.run.jumps++; this.save.addStat('jumps'); if (!this.run.firstJump) this.run.firstJump = this.run.score; this.fx.dust(p.x, p.y, p.z + 0.3, 5); }
        break;
      case 'down':
        if (p.roll()) { this.audio.roll(); this.run.rolls++; this.save.addStat('rolls'); if (p.lane === 0) { this.run.centerRolls++; this.save.addStat('centerRolls'); } if (!this.run.firstRoll) this.run.firstRoll = this.run.score; }
        break;
      case 'doubletap': this.useHoverboard(); break;
    }
  }

  useHoverboard() {
    if (this.state !== 'running' || this.player.hover || this.player.flying) return false;
    if (this.save.data.hoverboards <= 0) { this.emit('toast', `No Turbo! Collect ${BUBBLES_PER_TURBO} signal bubbles or buy one in the shop.`); return false; }
    this.save.data.hoverboards--;
    this.save.write();
    this.hoverTimer = HOVERBOARD_TIME;
    this.player.setHover(true);
    this.run.hoverboards++; this.save.addStat('hoverboards');
    this.run.hoverCrashed = false;
    this.audio.hover();
    this.emit('hoverboard', { time: HOVERBOARD_TIME });
    return true;
  }

  _endHoverboard(crashed) {
    this.player.setHover(false);
    this.hoverTimer = 0;
    if (!crashed) { this.run.hoverNoCrash++; this.save.addStat('hoverNoCrash'); }
    this.emit('hoverboardEnd');
  }

  // ------------------------------------------------------------------ pickups & power-ups
  _pickup(kind, letter) {
    const p = this.player;
    const s = this.save.data;
    this.fx.powerup(p.x, p.y + 1, p.z, POWERUP_COLORS[kind] || 0xffffff);
    if (['jetpack', 'sneakers', 'magnet', 'multiplier'].includes(kind)) {
      const dur = POWERUP_BASE_DURATION[kind] + POWERUP_UPGRADE_STEP * (s.upgrades[kind] || 0) + (this.perk === 'powerups' ? 3 : 0);
      this.powerups[kind] = dur;
      this.run.powerups++; this.save.addStat('powerups');
      this.run.kinds.add(kind);
      if (this.run.kinds.size >= 4) this.run.allPowerups = 1;
      if (!this.run.firstPowerup) this.run.firstPowerup = this.run.score;
      const statKey = { jetpack: 'jetpacks', sneakers: 'sneakers', magnet: 'magnets', multiplier: 'multipliers' }[kind];
      this.run[statKey]++; this.save.addStat(statKey);
      if (kind === 'jetpack') { p.setFlying(true, 6.0); this.audio.jetpack(); }
      else this.audio.powerup();
      if (kind === 'sneakers') p.superJump = true;
      this.emit('powerup', { kind, duration: dur });
    } else if (kind === 'msg_bubble') {
      this.run.bubbles++; this.save.addStat('bubbles');
      this.bubbleCharge = (this.bubbleCharge || 0) + 1;
      this.audio.letter();
      if (this.bubbleCharge >= BUBBLES_PER_TURBO) {
        this.bubbleCharge = 0; s.hoverboards++; this.emit('toast', 'SIGNAL FULL — +1 TURBO!');
      } else this.emit('toast', `SIGNAL ${this.bubbleCharge}/${BUBBLES_PER_TURBO}`);
      s.bubbleCharge = this.bubbleCharge;
      this.emit('bubbles', this.bubbleCharge);
    } else if (kind === 'biryani') {
      this.run.boxes++; this.save.addStat('boxes');
      const reward = this.openMysteryBox();
      this.audio.powerup();
      this.emit('mystery', reward);
    } else if (kind === 'key') {
      s.keys++; this.run.keys++; this.save.addStat('keys');
      this.audio.key();
      this.emit('toast', '+1 KEY');
    } else if (kind === 'token') {
      s.tokens++; this.run.tokens++; this.save.addStat('tokens');
      this.audio.key();
      this.emit('toast', '+1 TOKEN');
      const ranger = CHARACTERS.find((c) => c.tokens);
      if (ranger && s.tokens >= ranger.tokens && !s.unlockedCharacters.includes(ranger.id)) { s.unlockedCharacters.push(ranger.id); this.emit('toast', `${ranger.name.toUpperCase()} UNLOCKED!`); }
    } else if (kind === 'letter') {
      this.run.letters++; this.save.addStat('letters');
      this.dailyLettersCollected++;
      s.daily.letters = this.dailyLettersCollected;
      this.audio.letter();
      if (this.dailyLettersCollected >= this.dailyWord.length && !s.daily.done) {
        s.daily.done = true; s.daily.streak = (s.daily.streak || 0) + 1; s.daily.lastDone = s.daily.date;
        this.save.addStat('daily');
        const reward = DAILY_REWARDS[Math.min(s.daily.streak - 1, DAILY_REWARDS.length - 1)];
        if (typeof reward === 'number') { s.coins += reward; this.emit('toast', `WORD HUNT COMPLETE! +${reward} coins`); }
        else if (reward.keys) { s.keys += reward.keys; this.emit('toast', `WORD HUNT COMPLETE! +${reward.keys} keys`); }
        else if (reward.mystery) { s.mysteryBoxes += reward.mystery; this.emit('toast', 'WORD HUNT COMPLETE! +1 Mystery Box'); }
      } else this.emit('letter', { letter, index: this.dailyLettersCollected });
    }
    this.save.write();
    this._checkMissions();
  }

  openMysteryBox() {
    const s = this.save.data;
    const r = Math.random();
    let reward;
    if (r < 0.45) {
      const c = [50, 100, 150, 250, 500][Math.floor(Math.random() * 5)];
      // in a run the coins ride along in run.coins (banked + counted once by finishRun); otherwise bank now
      if (this.run) this.run.coins += c; else { s.coins += c; this.save.addStat('coins', c); }
      reward = { type: 'coins', amount: c };
    }
    else if (r < 0.62) { s.keys++; reward = { type: 'keys', amount: 1 }; }
    else if (r < 0.78) { s.hoverboards++; reward = { type: 'hoverboard', amount: 1 }; }
    else if (r < 0.88) { s.tokens++; this.save.addStat('tokens'); if (this.run) this.run.tokens++; reward = { type: 'token', amount: 1 }; }
    else if (r < 0.95) { s.headstarts++; reward = { type: 'headstart', amount: 1 }; }
    else { s.scoreBoosters++; reward = { type: 'booster', amount: 1 }; }
    const ranger = CHARACTERS.find((c) => c.tokens);
    if (ranger && s.tokens >= ranger.tokens && !s.unlockedCharacters.includes(ranger.id)) { s.unlockedCharacters.push(ranger.id); reward.unlock = ranger.name; }
    this.save.write();
    return reward;
  }

  // ------------------------------------------------------------------ missions
  missionProgress() {
    const s = this.save.data;
    const set = MISSION_SETS[Math.min(s.missionSet, MISSION_SETS.length - 1)];
    return set.map((m, i) => {
      let v;
      if (m.scope === 'run') v = this.run ? this._runStat(m.stat) : 0;
      else v = (s.stats[m.stat] || 0) - (s.missionBase[m.stat] || 0);
      const done = s.missionDone[i] || v >= m.target;
      return { ...m, value: Math.min(m.target, done ? m.target : v), done };
    });
  }

  _runStat(stat) {
    const r = this.run;
    if (!r) return 0;
    switch (stat) {
      case 'score': return Math.floor(r.score);
      case 'distance': return Math.floor(this.distance);
      case 'noCoinScore': return Math.floor(r.coins > 0 ? (r.firstCoin || 0) : r.score);
      case 'noJumpScore': return Math.floor(r.jumps > 0 ? (r.firstJump || 0) : r.score);
      case 'noRollScore': return Math.floor(r.rolls > 0 ? (r.firstRoll || 0) : r.score);
      case 'noPowerupScore': return Math.floor(r.powerups > 0 ? (r.firstPowerup || 0) : r.score);
      case 'sameLane': return Math.floor(r.sameLane);
      default: return r[stat] || 0;
    }
  }

  _checkMissions(final = false) {
    const s = this.save.data;
    if (s.missionSet >= MISSION_SETS.length) return;
    const prog = this.missionProgress();
    let changed = false;
    prog.forEach((m, i) => { if (m.done && !s.missionDone[i]) { s.missionDone[i] = true; changed = true; this.audio.mission(); this.emit('missionComplete', m); } });
    if (s.missionDone.every(Boolean)) {
      s.missionSet++;
      s.missionDone = [false, false, false];
      s.missionBase = {};
      const set = MISSION_SETS[Math.min(s.missionSet, MISSION_SETS.length - 1)];
      for (const m of set) if (m.scope === 'total') s.missionBase[m.stat] = s.stats[m.stat] || 0;
      this.baseMultiplier = Math.min(MAX_MULTIPLIER, 1 + s.missionSet);
      this.emit('missionSetComplete', { set: s.missionSet, multiplier: this.baseMultiplier });
      changed = true;
    }
    if (changed) this.save.write();
  }

  // ------------------------------------------------------------------ main loop
  _loop() {
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const wall = this._lastFrame === undefined ? STEP : (now - this._lastFrame) / 1000;
    this._lastFrame = now;
    // fps from real wall-clock deltas (never clamped)
    this._fpsAcc += wall; this.frames++;
    if (this._fpsAcc > 1) { this.fps = this.frames / this._fpsAcc; this.frames = 0; this._fpsAcc = 0; }
    this.time += wall;
    if (this.state === 'paused') { this._render(); return; }
    if (this.state === 'running' && this.run && this.run.time < 4) { this._perfFrames++; this._perfWall += wall; }
    // fixed 1/60 s substeps so game time tracks wall time; at most MAX_STEPS per frame, the rest is dropped
    this._acc = Math.min((this._acc || 0) + wall, MAX_STEPS * STEP);
    let steps = 0;
    while (this._acc >= STEP - 1e-9 && steps < MAX_STEPS) { this._acc -= STEP; steps++; this._tick(STEP); }
    const dt = Math.min(0.25, wall) * this.slowmo;   // camera / particles: clamp so a hidden tab can't fling them
    this.fx.update(dt);
    this._updateCamera(dt);
    this._render();
  }

  /** One fixed simulation step. `raw` is unscaled game-clock time; slow-mo scales it. */
  _tick(raw) {
    const dt = raw * this.slowmo;
    if (this.state === 'running') this._update(dt);
    else if (this.state === 'dying') {
      this.dyingTimer -= raw;
      if (this.hitStop > 0) { this.hitStop -= raw; if (this.hitStop <= 0) this.slowmo = 0.35; }
      else this.slowmo += (1 - this.slowmo) * dt * 2;
      this.player.update(dt, 0, false);
      this.chaser.update(dt, this.player, 0, false);
      if (this.dyingTimer <= 0) this._afterDeath();
    } else if (this.state !== 'paused') {
      this.player.update(dt, 0, false);
      this.chaser.update(dt, this.player, 0, false);
      this.track.coins.update(dt, this.player, false, this.player.z + 30);
    }
  }

  _update(dt) {
    const p = this.player;
    const r = this.run;
    r.time += dt;

    // speed
    const targetSpeed = Math.min(SPEED.max, SPEED.start + this.distance * SPEED.perMetre);
    let speed = targetSpeed;
    if (this.headstart > 0) { speed = SPEED.headstart; this.headstart -= dt; if (this.headstart <= 0 && !(this.powerups.jetpack > 0)) p.setFlying(false); }
    if (p.hover) speed *= (this.bikeDef().bonus === 'speed' ? 1.5 : 1.35);
    this.speed = speed;
    this.audio.intensity = Math.min(1, this.distance / 2000);

    // move
    const dz = speed * dt;
    p.z -= dz;
    this.distance += dz;
    r.score += dz * SCORE_PER_METRE * this.multiplier;

    // zones & the D-Chowk milestone every 3000 m
    const zone = zoneAt(this.distance);
    if (zone.id !== this.zoneId) { this.zoneId = zone.id; this.emit('zone', zone); }
    const lap = Math.floor(this.distance / ZONE_LENGTH);
    if (lap > this.lastLap) {
      this.lastLap = lap; r.laps = lap; this.save.addStat('dchowk');
      const bonus = 250 * lap;
      r.coins += bonus;
      this.audio.mission();
      this.emit('milestone', { lap, bonus });
    }

    // beat the previous best distance (once per run)
    const best = this.save.data.bestDistance;
    if (best > 0 && !r.newBestDistance && this.distance > best) {
      r.newBestDistance = true;
      this.audio.mission();
      this.emit('toast', 'NEW RECORD DISTANCE!');
    }

    // 'auto' quality: if the first 4 s of a run render under 28 fps, drop to low settings for this session
    if (r.time >= 4 && !this._perfChecked) {
      this._perfChecked = true;
      if (this.quality === 'auto' && !this._perfDropped && this._perfWall > 0 && this._perfFrames / this._perfWall < 28) {
        this._perfDropped = true;
        this._applyQuality('low');
        this.emit('toast', 'Performance mode');
      }
    }

    // same lane tracking
    r.sameLaneCur += dt; r.sameLane = Math.max(r.sameLane, r.sameLaneCur);

    // timers
    for (const k of Object.keys(this.powerups)) {
      if (this.powerups[k] > 0) {
        this.powerups[k] -= dt;
        if (this.powerups[k] <= 0) {
          this.powerups[k] = 0;
          if (k === 'jetpack' && this.headstart <= 0) { p.setFlying(false); this.invuln = Math.max(this.invuln, 0.8); }
          if (k === 'sneakers') p.superJump = false;
          this.emit('powerupEnd', k);
        }
      }
    }
    if (this.hoverTimer > 0) { this.hoverTimer -= dt; if (this.hoverTimer <= 0) this._endHoverboard(false); }
    if (this.invuln > 0) this.invuln -= dt;

    // world
    const prevZ = p.z + dz;
    this.track.update(p.z, dt, speed);
    const wasGrounded = p.grounded;
    const prevGround = p.groundY;
    p.groundY = this.track.groundHeight(p);
    p.update(dt, speed, true);
    // re-sample the ground at the post-move position: at 36 m/s one step is 0.6 m, enough for the bumper to
    // enter a container roof before the pre-move sample saw it (collide() below uses the post-move bounds)
    if (!p.flying && !p.dead) {
      const g2 = this.track.groundHeight(p);
      if (g2 > p.y + 1e-6) { const wasAir = !p.grounded; p.snapTo(g2); p._sync(); if (wasAir) { this.audio.landing(); this.fx.dust(p.x, p.y, p.z, 6); if (g2 > TRAIN_H - 0.5) { r.trainJumps++; this.save.addStat('trainJumps'); } } }
      else if (p.grounded && g2 > p.groundY) { p.groundY = g2; p.y = g2; p._sync(); }
    }

    // landings (a buffered jump re-launches inside p.update, so it also counts as a landing)
    if ((!wasGrounded && p.grounded) || p.bufferedJump) {
      this.audio.landing();
      this.fx.dust(p.x, p.y, p.z, 6);
      if (p.groundY > TRAIN_H - 0.5) {
        r.trainJumps++; this.save.addStat('trainJumps'); r.trainStreak++;
      } else r.trainStreak = 0;
    }
    if (p.bufferedJump) {
      p.bufferedJump = false;
      this.audio.jump(); r.jumps++; this.save.addStat('jumps'); if (!r.firstJump) r.firstJump = r.score; this.fx.dust(p.x, p.y, p.z + 0.3, 5);
    }
    // fell off a train? nothing special. Jetpack flame
    if (this.powerups.jetpack > 0 && p.flying) this.track.airCoins(p.z, p.flyAltitude);
    if (p.flying) { this.fx.jet(p.x - 0.22, p.y + 0.7, p.z + 0.4); this.fx.jet(p.x + 0.22, p.y + 0.7, p.z + 0.4); }
        if (p.grounded && !p.flying && Math.random() < dt * 10) this.fx.dust(p.x, p.y, p.z + 1.0, 1);
    if (p.hover && p.grounded) { this.fx.hoverTrail(p.x + 0.2, p.y + 0.6, p.z + 1.4); this.fx.turboTrail(p.x, p.y + 0.3, p.z + 1.2); this.camShake = Math.max(this.camShake, 0.08); }
    if (p.rolling > 0 && p.grounded) this.fx.sparks(p.x + 0.55, p.y + 0.08, p.z + 0.3);

    // coins
    const magnet = this.powerups.magnet > 0;
    const got = this.track.coins.update(dt, p, magnet, p.z + 25);
    if (got.length) {
      for (const c of got) this.fx.coin(c.x, c.y, c.z);
      r.coins += got.length;
      if (magnet) { r.magnetCoins += got.length; this.save.addStat('magnetCoins', got.length); }
      if (!r.firstCoin) r.firstCoin = r.score;
      this.audio.coin();
      this.emit('coins', r.coins);
    }

    // collisions
    const lowrider = this.bikeDef().bonus === 'lowrider' && p.hover;
    const events = this.track.collide(p, prevZ, this.invuln > 0 || p.flying);
    for (const e of events) {
      if (e.type === 'pickup') { this._pickup(e.kind, e.letter); continue; }
      if (e.type === 'stumble') {
        if (p.hover) continue;   // turbo ploughs through cones, tyres and rangers
        r.stumbles++; this.save.addStat('stumbles');
        if (e.obstacle.type === 'tyre_stack') { r.bushes++; this.save.addStat('bushes'); } else if (e.obstacle.type === 'ranger') { r.rangers = (r.rangers || 0) + 1; this.save.addStat('rangers'); } else { r.signals++; this.save.addStat('signals'); }
        this.audio.stumble();
        this.camShake = 0.25;
        const caught = this._chaserStumble();
        p.stumble();
        this.emit('stumble');
        if (caught) { this._die('caught'); return; }
        continue;
      }
      if (e.type === 'sideswipe') {
        if (p.hover) { p.bounceBack(); continue; }
        r.trainBumps++; this.save.addStat('trainBumps');
        this.audio.stumble();
        this.camShake = 0.3;
        const caught = this._chaserStumble();
        p.bounceBack();
        p.stumble();
        this.emit('stumble');
        if (caught) { this._die('caught'); return; }
        continue;
      }
      if (e.type === 'death') {
        if (lowrider && e.obstacle.kind === 'barrier' && e.obstacle.type !== 'police_barricade') continue;
        if (p.hover) {
          // board saves you once
          this.fx.boardBreak(p.x, p.y + 0.3, p.z);
          this.audio.boardBreak();
          r.hoverCrashed = true;
          this._endHoverboard(true);
          this.invuln = 1.6;
          if (e.obstacle.kind === 'train' && !e.obstacle.moving) { p.y = p.groundY = e.obstacle.yTop; p.grounded = true; p.vy = 0; }   // hop onto the roof, don't run inside it
          e.obstacle.counted = true;   // a crash is not a dodge
          this.camShake = 0.4;
          this.emit('toast', 'TURBO saved you!');
          continue;
        }
        if (e.obstacle.kind === 'train') { r.trainBumps++; this.save.addStat('trainBumps'); }
        this._die(e.cause);
        return;
      }
    }

    // barrier dodge counting: barrier passed behind the player without hitting
    const canCloseCall = this.invuln <= 0 && !p.flying;
    for (const o of this.track.obstacles) {
      if (o.kind === 'barrier' && !o.counted && o.zNear > p.z + 1.0 && o.lane === p.lane) {
        o.counted = true;
        if (Math.abs(p.x - o.lane * LANE_W) < 1.2) {
          r.barriersDodged++; this.save.addStat('barriersDodged');
          // close call: barely cleared it in the air, or ducked under a gantry / teargas cloud
          const overhang = !p.grounded && (p.y - o.yTop) < 0.35;
          const ducked = p.rolling > 0 && (o.type === 'road_closed_gantry' || o.type === 'teargas');
          if (canCloseCall && (overhang || ducked)) this._closeCall();
        }
      }
      // close call: swerved out of this obstacle's lane just before reaching it
      if (!o.passed && o.zNear > p.z && (o.kind === 'train' || o.kind === 'solid' || o.kind === 'barrier')) {
        o.passed = true;
        const wasOnIt = o.kind === 'train' && p.y > o.yTop - 0.5;
        if (canCloseCall && !wasOnIt && o.lane === this._laneChangeFrom && o.lane !== p.targetLane && r.time - this._laneChangeAt < 0.3) this._closeCall();
      }
    }

    // sneakers indicator: stretch the runner a tiny bit while active
    this.chaser.update(dt, p, speed, true);

    // world re-basing to keep float precision
    if (p.z < -2000) {
      const shift = 2000;
      p.z += shift; this.track.shift(shift); this.fx.shift(shift);
      this.chaser.group.position.z += shift;
    }

    // periodic mission check
    this._missionTick = (this._missionTick || 0) + dt;
    if (this._missionTick > 0.5) { this._missionTick = 0; this._checkMissions(); }

    this.emit('hud', { score: Math.floor(r.score), coins: r.coins, multiplier: this.multiplier, powerups: this.powerups, hover: this.hoverTimer, speed, distance: this.distance, bubbles: this.bubbleCharge || 0, fast: this._speedPull() > 0.6 });
  }

  /** 0..1 how far along the base speed ramp we are (headstart / turbo can push it to 1). */
  _speedPull() { return Math.max(0, Math.min(1, (this.speed - SPEED.start) / (SPEED.max - SPEED.start))); }

  /** Rangers close in on a stumble — unless Guddu's shield eats the first one of the run. */
  _chaserStumble() {
    if (this.perk === 'shield' && !this.run.shieldUsed) { this.run.shieldUsed = true; this.emit('toast', 'GUDDU SHRUGS IT OFF'); return false; }
    return this.chaser.stumble();
  }

  /** Near-miss reward. Throttled to one per 0.6 s of run time. */
  _closeCall() {
    const r = this.run;
    if (r.time - this._lastCloseCall < 0.6) return;
    this._lastCloseCall = r.time;
    const p = this.player;
    this.fx.sparks(p.x, p.y + 0.6, p.z);
    this.camShake = Math.max(this.camShake, 0.12);
    this.audio.whoosh();
    r.score += 50 * this.multiplier;
    r.closeCalls++; this.save.addStat('closeCalls');
    this.emit('toast', 'CLOSE CALL +50');
  }

  _updateCamera(dt) {
    const p = this.player;
    const cam = this.camera;
    const speedPull = this.state === 'running' ? this._speedPull() : 0;
    if (this.state === 'menu') {
      // slowly orbiting menu camera
      const t = this.time * 0.25;
      const target = new THREE.Vector3(Math.sin(t) * 4.2, 2.2, Math.cos(t) * 4.2 + 1.0);
      cam.position.lerp(target, Math.min(1, dt * 3));
      cam.lookAt(0, 1.1, 0);
    } else if (this.state === 'dying' || this.state === 'dead') {
      // swing to the side so we see the runner get caught
      const side = p.lane <= 0 ? 1 : -1;
      const target = new THREE.Vector3(Math.max(-4.2, Math.min(4.2, p.x + side * 2.8)), p.y + 3.4, p.z + 4.6);
      cam.position.lerp(target, Math.min(1, dt * 2.5));
      cam.lookAt(p.x, p.y + 0.9, p.z - 0.5);
    } else {
      const yFollow = p.flying ? p.y - 0.6 : Math.min(p.y, p.groundY + 0.6) * 0.9;
      this._camY = this._camY === undefined ? yFollow : this._camY + (yFollow - this._camY) * Math.min(1, dt * 5);
      // speed reads as speed: camera drops, pulls back and widens as the run accelerates
      const target = new THREE.Vector3(p.x * 0.5, this._camY + 4.4 - speedPull * 0.4, p.z + 9.2 + speedPull * 1.2);   // far enough back that the rangers stay in frame
      cam.position.lerp(target, Math.min(1, dt * 10));
      cam.lookAt(p.x * 0.5, this._camY + 0.7, p.z - 8);
    }
    // shake applies in every state so the death hit lands too
    if (this.camShake > 0) {
      this.camShake -= dt;
      cam.position.x += (Math.random() - 0.5) * this.camShake * 0.6;
      cam.position.y += (Math.random() - 0.5) * this.camShake * 0.6;
    }
    // widen the lens with speed, and more when going fast (turbo / jetpack / headstart)
    const wantFov = (this.baseFov || 60) + speedPull * 8 + ((this.state === 'running' && p.hover) ? 12 : (this.state === 'running' && (p.flying || this.speed > 40)) ? 7 : 0);
    if (Math.abs(cam.fov - wantFov) > 0.05) { cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); }
    this.sky.position.set(cam.position.x, 0, p.z);
    this.ground.position.z = p.z - 200;
    this.skyline.position.z = p.z;
    this.clouds.position.z = p.z;
    this.sun.position.set(p.x - 6, 14, p.z + 8);
    this.sun.target.position.set(p.x, 0, p.z - 10);
    this.sun.target.updateMatrixWorld();
  }

  _render() { this.renderer.render(this.scene, this.camera); }
}
