import * as THREE from 'three';
import { LANE_W, SPEED, SCORE_PER_METRE, POWERUP_BASE_DURATION, POWERUP_UPGRADE_STEP, HOVERBOARD_TIME, REVIVE_KEYS, COLORS, TRAIN_H } from './constants.js';
import { Player } from './Player.js';
import { Chaser } from './Chaser.js';
import { Track } from './Track.js';
import { Effects } from './Effects.js';
import { Input } from './Input.js';
import { Audio } from './Audio.js';
import { Save } from './Save.js';
import { CHARACTERS, BOARDS } from '../data/characters.js';
import { MISSION_SETS, MAX_MULTIPLIER, DAILY_WORDS, DAILY_REWARDS } from '../data/missions.js';

const POWERUP_COLORS = { jetpack: 0xff4d2b, sneakers: 0xff3333, magnet: 0xff5a5a, multiplier: 0x3d8bff, mystery_box: 0xb36bff, key: 0xffd53d, letter: 0xffffff };

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

    // renderer
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 4;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(COLORS.fog, 60, 230);
    this.camera = new THREE.PerspectiveCamera(58, 9 / 16, 0.3, 600);
    this.camShake = 0;

    this._buildSky();
    this._buildLights();

    this.player = new Player(assets, this.scene, this.characterDef());
    this.chaser = new Chaser(assets, this.scene);
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

    this.clock = new THREE.Clock();
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
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    this.ground = ground;
    this.scene.add(ground);
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 1.25));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
    sun.position.set(-6, 14, 8);
    this.scene.add(sun);
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

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // wider screens see less vertical => keep the runner nicely framed
    this.camera.fov = w > h ? 50 : 60;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ helpers
  characterDef() { return CHARACTERS.find((c) => c.id === this.save.data.character) || CHARACTERS[0]; }
  boardDef() { return BOARDS.find((b) => b.id === this.save.data.board) || BOARDS[0]; }

  _dailyWord() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    const day = Math.floor((d - start) / 86400000);
    const today = d.toISOString().slice(0, 10);
    const daily = this.save.data.daily;
    if (daily.date !== today) {
      // new day
      if (daily.lastDone && daily.done) {
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (daily.lastDone !== y) daily.streak = 0;
      }
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
    this.distance = 0;
    this.speed = SPEED.start;
    this.baseMultiplier = Math.min(MAX_MULTIPLIER, 1 + s.missionSet);
    this.player.reset();
    this.player.setCharacter(this.characterDef());
    this._applyBoardLook();
    this.chaser.reset();
    this.chaser.startRun();
    this.track.reset();
    this.powerups = {};
    this.hoverTimer = 0;
    this.invuln = 0;
    this.reviveCount = 0;
    this.slowmo = 1;
    this.run = {
      score: 0, coins: 0, jumps: 0, rolls: 0, powerups: 0, sneakers: 0, magnets: 0, jetpacks: 0, multipliers: 0, boxes: 0, keys: 0,
      barriersDodged: 0, stumbles: 0, hoverboards: 0, hoverNoCrash: 0, trainBumps: 0, trainJumps: 0, trainStreak: 0, letters: 0,
      signals: 0, bushes: 0, centerRolls: 0, sameLane: 0, sameLaneCur: 0, magnetCoins: 0, boosterBonus: 0, headstarts: 0,
      noCoinScore: 0, noJumpScore: 0, noRollScore: 0, noPowerupScore: 0, allPowerups: 0, kinds: new Set(), earlyCaught: 0,
      hoverCrashed: false, time: 0, tokens: 0, dodgedIds: new Set(),
    };
    this.player.play('Run');
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

  _applyBoardLook() {
    const b = this.boardDef();
    this.player.board.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      o.material = mats.map((m) => {
        const c = m.clone();
        if (m.name === 'hb_deck') c.color.set(b.deck);
        if (m.name === 'hb_stripe') c.color.set(b.stripe);
        if (m.name === 'hb_glow') { c.color.set(b.glow); c.emissive.set(b.glow); }
        return c;
      });
      if (o.material.length === 1) o.material = o.material[0];
    });
  }

  _activateHeadstart() {
    this.headstart = 4.5;
    this.player.setFlying(true, 5.5);
    this.invuln = 5;
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
    this.slowmo = 0.35;
    this.fx.crash(this.player.x, this.player.y + 1, this.player.z);
    if (this.run.time < 10) this.run.earlyCaught = 1;
    this.deathCause = cause;
    this.dyingTimer = 1.6;
    if (navigator.vibrate && this.save.data.settings.haptics) navigator.vibrate(120);
  }

  _afterDeath() {
    this.state = 'dead';
    const keysNeeded = REVIVE_KEYS[Math.min(this.reviveCount, REVIVE_KEYS.length - 1)];
    this.emit('gameOver', { run: this.run, canRevive: this.save.data.keys >= keysNeeded, keysNeeded, cause: this.deathCause });
  }

  revive() {
    const keysNeeded = REVIVE_KEYS[Math.min(this.reviveCount, REVIVE_KEYS.length - 1)];
    if (this.save.data.keys < keysNeeded) return false;
    this.save.data.keys -= keysNeeded;
    this.reviveCount++;
    this.save.write();
    // clear the immediate neighbourhood and lift the player
    this.player.dead = false;
    this.player.rolling = 0; this.player.stumbling = 0;
    this.player.play('Run', 0);
    this.player.setFlying(true, 5.5);
    this.headstart = 2.4;
    this.invuln = 3.2;
    this.chaser.reset(); this.chaser.startRun();
    this.slowmo = 1;
    this.state = 'running';
    this.audio.init(); this.audio.startMusic();
    this.emit('revived');
    return true;
  }

  /** Bank the run into the save. */
  finishRun() {
    const s = this.save.data;
    const r = this.run;
    s.coins += r.coins;
    this.save.addStat('coins', r.coins);
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
    this.player.setCharacter(this.characterDef());
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
      case 'left': if (p.moveLane(-1)) { this.audio.swipe(); this.run.sameLaneCur = 0; } break;
      case 'right': if (p.moveLane(1)) { this.audio.swipe(); this.run.sameLaneCur = 0; } break;
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
    if (this.save.data.hoverboards <= 0) { this.emit('toast', 'No hoverboards! Buy some in the shop.'); return false; }
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
      const dur = POWERUP_BASE_DURATION[kind] + POWERUP_UPGRADE_STEP * (s.upgrades[kind] || 0);
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
    } else if (kind === 'mystery_box') {
      this.run.boxes++; this.save.addStat('boxes');
      const reward = this.openMysteryBox();
      this.audio.powerup();
      this.emit('mystery', reward);
    } else if (kind === 'key') {
      s.keys++; this.run.keys++; this.save.addStat('keys');
      this.audio.key();
      this.emit('toast', '+1 KEY');
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
    if (r < 0.45) { const c = [50, 100, 150, 250, 500][Math.floor(Math.random() * 5)]; s.coins += c; if (this.run) this.run.coins += 0; reward = { type: 'coins', amount: c }; }
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
    let dt = Math.min(0.05, this.clock.getDelta());
    this._fpsAcc += dt; this.frames++;
    if (this._fpsAcc > 1) { this.fps = this.frames / this._fpsAcc; this.frames = 0; this._fpsAcc = 0; }
    this.time += dt;
    if (this.state === 'paused') { this._render(); return; }
    dt *= this.slowmo;
    if (this.state === 'running') this._update(dt);
    else if (this.state === 'dying') {
      this.dyingTimer -= dt / this.slowmo;
      this.slowmo += (1 - this.slowmo) * dt * 2;
      this.player.update(dt, 0, false);
      this.chaser.update(dt, this.player, 0, false);
      if (this.dyingTimer <= 0) this._afterDeath();
    } else {
      this.player.update(dt, 0, false);
      this.chaser.update(dt, this.player, 0, false);
      this.track.coins.update(dt, this.player, false, this.player.z + 30);
    }
    this.fx.update(dt);
    this._updateCamera(dt);
    this._render();
  }

  _update(dt) {
    const p = this.player;
    const r = this.run;
    r.time += dt;

    // speed
    const targetSpeed = Math.min(SPEED.max, SPEED.start + this.distance * SPEED.perMetre);
    let speed = targetSpeed;
    if (this.headstart > 0) { speed = SPEED.headstart; this.headstart -= dt; if (this.headstart <= 0 && !(this.powerups.jetpack > 0)) p.setFlying(false); }
    if (this.boardDef().bonus === 'speed' && p.hover) speed *= 1.1;
    this.speed = speed;
    this.audio.intensity = Math.min(1, this.distance / 2000);

    // move
    const dz = speed * dt;
    p.z -= dz;
    this.distance += dz;
    r.score += dz * SCORE_PER_METRE * this.multiplier;

    // same lane tracking
    r.sameLaneCur += dt; r.sameLane = Math.max(r.sameLane, r.sameLaneCur);

    // timers
    for (const k of Object.keys(this.powerups)) {
      if (this.powerups[k] > 0) {
        this.powerups[k] -= dt;
        if (this.powerups[k] <= 0) {
          this.powerups[k] = 0;
          if (k === 'jetpack' && this.headstart <= 0) p.setFlying(false);
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

    // landings
    if (!wasGrounded && p.grounded) {
      this.audio.landing();
      this.fx.dust(p.x, p.y, p.z, 6);
      if (p.groundY > TRAIN_H - 0.5) {
        r.trainJumps++; this.save.addStat('trainJumps'); r.trainStreak++;
      } else r.trainStreak = 0;
    }
    // fell off a train? nothing special. Jetpack flame
    if (this.powerups.jetpack > 0 && p.flying) this.track.airCoins(p.z, p.flyAltitude);
    if (p.flying) { this.fx.jet(p.x - 0.22, p.y + 0.7, p.z + 0.4); this.fx.jet(p.x + 0.22, p.y + 0.7, p.z + 0.4); }
    if (p.hover && p.grounded && Math.random() < 0.5) this.fx.hoverTrail(p.x, p.y + 0.05, p.z + 0.6);
    if (p.grounded && !p.hover && !p.flying && Math.random() < dt * 8) this.fx.dust(p.x, p.y, p.z + 0.4, 1);

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
    const lowrider = this.boardDef().bonus === 'lowrider' && p.hover;
    const events = this.track.collide(p, prevZ, this.invuln > 0 || p.flying);
    for (const e of events) {
      if (e.type === 'pickup') { this._pickup(e.kind, e.letter); continue; }
      if (e.type === 'stumble') {
        if (p.hover) continue;   // hoverboards plough through bushes & signals
        r.stumbles++; this.save.addStat('stumbles');
        if (e.obstacle.type === 'bush') { r.bushes++; this.save.addStat('bushes'); } else { r.signals++; this.save.addStat('signals'); }
        this.audio.stumble();
        this.camShake = 0.25;
        const caught = this.chaser.stumble();
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
        const caught = this.chaser.stumble();
        p.bounceBack();
        p.stumble();
        this.emit('stumble');
        if (caught) { this._die('caught'); return; }
        continue;
      }
      if (e.type === 'death') {
        if (lowrider && e.obstacle.kind === 'barrier' && e.obstacle.type !== 'barrier_low') continue;
        if (p.hover) {
          // board saves you once
          this.fx.boardBreak(p.x, p.y + 0.3, p.z);
          this.audio.boardBreak();
          r.hoverCrashed = true;
          this._endHoverboard(true);
          this.invuln = 1.6;
          this.camShake = 0.4;
          this.emit('toast', 'Hoverboard saved you!');
          continue;
        }
        if (e.obstacle.kind === 'train') { r.trainBumps++; this.save.addStat('trainBumps'); }
        this._die(e.cause);
        return;
      }
    }

    // barrier dodge counting: barrier passed behind the player without hitting
    for (const o of this.track.obstacles) {
      if (o.kind === 'barrier' && !o.counted && o.zNear > p.z + 1.0 && o.lane === p.lane) {
        o.counted = true;
        if (Math.abs(p.x - o.lane * LANE_W) < 1.2) { r.barriersDodged++; this.save.addStat('barriersDodged'); }
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

    this.emit('hud', { score: Math.floor(r.score), coins: r.coins, multiplier: this.multiplier, powerups: this.powerups, hover: this.hoverTimer, speed, distance: this.distance });
  }

  _updateCamera(dt) {
    const p = this.player;
    const cam = this.camera;
    if (this.state === 'menu') {
      // slowly orbiting menu camera
      const t = this.time * 0.25;
      const target = new THREE.Vector3(Math.sin(t) * 4.2, 2.2, Math.cos(t) * 4.2 + 1.0);
      cam.position.lerp(target, Math.min(1, dt * 3));
      cam.lookAt(0, 1.1, 0);
    } else if (this.state === 'dying' || this.state === 'dead') {
      // swing to the side so we see the runner get caught
      const side = p.lane <= 0 ? 1 : -1;
      const target = new THREE.Vector3(Math.max(-4, Math.min(4, p.x + side * 3.4)), p.y + 2.3, p.z + 3.2);
      cam.position.lerp(target, Math.min(1, dt * 2.5));
      cam.lookAt(p.x, p.y + 1.0, p.z - 0.5);
    } else {
      const yFollow = p.flying ? p.y - 0.6 : Math.min(p.y, p.groundY + 0.6) * 0.9;
      this._camY = this._camY === undefined ? yFollow : this._camY + (yFollow - this._camY) * Math.min(1, dt * 5);
      const speedPull = (this.speed - SPEED.start) / (SPEED.max - SPEED.start);
      const target = new THREE.Vector3(p.x * 0.5, this._camY + 3.15 + speedPull * 0.2, p.z + 5.0 + speedPull * 0.5);
      cam.position.lerp(target, Math.min(1, dt * 10));
      if (this.camShake > 0) {
        this.camShake -= dt;
        cam.position.x += (Math.random() - 0.5) * this.camShake * 0.6;
        cam.position.y += (Math.random() - 0.5) * this.camShake * 0.6;
      }
      cam.lookAt(p.x * 0.5, this._camY + 1.05, p.z - 9);
    }
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
