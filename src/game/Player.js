import * as THREE from 'three';
import { LANE_W, PLAYER } from './constants.js';

/** The biker. Animation names: Ride, Idle, Jump, Duck, Turbo, Fly, Stumble, Dead. */
const ONE_SHOT = ['Jump', 'Duck', 'Stumble', 'Dead'];

export class Player {
  constructor(assets, scene, characterDef, bikeDef) {
    this.assets = assets;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.char = null;
    this.setCharacter(characterDef, bikeDef);

    // blob shadow (long, like a bike)
    const shadowGeo = new THREE.CircleGeometry(0.6, 20);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(1, 1.7, 1);
    scene.add(this.shadow);

    // turbo flame (hoverboard equivalent) + jetpack
    this.flame = assets.prop('turbo_flame');
    this.flame.visible = false;
    this.flame.position.set(0.2, 0.62, 1.05);
    this.group.add(this.flame);
    this.jetpackMesh = assets.prop('jetpack');
    this.jetpackMesh.visible = false;
    this.jetpackMesh.scale.setScalar(0.8);
    this.jetpackMesh.position.set(0, 1.35, 0.45);
    this.jetpackMesh.rotation.y = Math.PI;
    this.group.add(this.jetpackMesh);

    this.reset();
  }

  setCharacter(def, bikeDef) {
    if (this.char) this.group.remove(this.char.root);
    this.char = this.assets.character('biker');
    this.char.root.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.castShadow = true; });
    this.group.add(this.char.root);
    this.def = def;
    const palette = { ...(def && def.palette ? def.palette : {}), ...(bikeDef && bikeDef.palette ? bikeDef.palette : {}) };
    this.applyPalette(palette);
    this.current = null;
    this.play('Idle');
  }

  /** Recolour named materials on this clone so riders / bikes look different. */
  applyPalette(palette) {
    this.char.root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const out = mats.map((m) => {
        if (palette[m.name] !== undefined) {
          const c = m.clone();
          c.color.set(palette[m.name]);
          return c;
        }
        return m;
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });
  }

  reset() {
    this.lane = 0;
    this.targetLane = 0;
    this.x = 0; this.y = 0; this.z = 0; this.vy = 0;
    this.groundY = 0;
    this.grounded = true;
    this.rolling = 0;
    this.jumping = false;
    this.stumbling = 0;
    this.dead = false;
    this.flying = false;        // jetpack
    this.hover = false;         // turbo
    this.superJump = false;     // nitro springs
    this.laneT = 1;
    this.laneFrom = 0;
    this.fastFall = false;
    this.pendingJump = 0;       // jump pressed while airborne: fires on landing (input buffer)
    this.bufferedJump = false;  // set for one frame when a buffered jump fired
    this.height = PLAYER.height;
    this.tilt = 0;
    this.flame.visible = false;
    this.jetpackMesh.visible = false;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.play('Idle', 0);
  }

  play(name, fade = 0.12, timeScale = 1) {
    if (this.current === name) { const a = this.char.actions[name]; if (a) a.timeScale = timeScale; return; }
    const next = this.char.actions[name];
    if (!next) return;
    const prev = this.current ? this.char.actions[this.current] : null;
    next.reset();
    next.enabled = true;
    next.timeScale = timeScale;
    next.setLoop(ONE_SHOT.includes(name) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = true;
    if (prev) { prev.crossFadeTo(next, fade, false); next.play(); }
    else next.play();
    this.current = name;
  }

  /** Base locomotion clip for the current state. */
  moveClip() { return this.hover ? 'Turbo' : 'Ride'; }

  // -------------------------------------------------------------- actions
  moveLane(dir) {
    if (this.dead) return false;
    const t = Math.max(-1, Math.min(1, this.targetLane + dir));
    if (t === this.targetLane) return false;
    this.laneFrom = this.x / LANE_W;
    this.targetLane = t;
    this.laneT = 0;
    return true;
  }

  jump() {
    if (this.dead || this.flying) return false;
    if (!this.grounded) { this.pendingJump = 0.15; return false; }
    this.vy = this.superJump ? PLAYER.superJumpVel : PLAYER.jumpVel;
    this.grounded = false;
    this.jumping = true;
    this.rolling = 0;
    this.fastFall = false;
    this.play('Jump', 0.06, 1.0);
    return true;
  }

  /** "Roll" in Subway Surfers terms: the biker ducks flat onto the tank. */
  roll() {
    if (this.dead || this.flying) return false;
    if (!this.grounded) { this.fastFall = true; }
    this.rolling = PLAYER.rollTime;
    this.play('Duck', 0.05, 1.0);
    return true;
  }

  stumble() {
    this.stumbling = PLAYER.stumbleTime;
    this.play('Stumble', 0.05);
  }

  bounceBack() {
    const from = Math.round(this.laneFrom);
    this.targetLane = from;
    this.laneFrom = this.x / LANE_W;
    this.laneT = 0;
  }

  die() {
    this.dead = true;
    this.rolling = 0;
    this.flame.visible = false;
    this.play('Dead', 0.05);
  }

  setHover(on) {
    this.hover = on;
    this.flame.visible = on;
    if (on && this.grounded) this.play('Turbo', 0.15);
    else if (!on && this.grounded && !this.dead) this.play('Ride', 0.15);
  }

  setFlying(on, altitude = 7.5) {
    this.flying = on;
    this.jetpackMesh.visible = on;
    this.flyAltitude = altitude;
    if (on) { this.vy = 0; this.grounded = false; this.rolling = 0; this.play('Fly', 0.2); }
  }

  // -------------------------------------------------------------- update
  update(dt, speed, running) {
    if (!running) { this.char.mixer.update(dt); this._sync(); return; }

    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / PLAYER.laneChangeTime);
      const e = this.laneT < 0.5 ? 2 * this.laneT * this.laneT : 1 - Math.pow(-2 * this.laneT + 2, 2) / 2;
      this.x = (this.laneFrom + (this.targetLane - this.laneFrom) * e) * LANE_W;
      if (this.laneT >= 1) this.lane = this.targetLane;
    } else {
      this.x = this.targetLane * LANE_W;
      this.lane = this.targetLane;
    }

    if (this.flying) {
      this.y += (this.flyAltitude - this.y) * Math.min(1, dt * 4);
      this.vy = 0;
    } else if (!this.dead) {
      const g = this.fastFall ? PLAYER.fastFallGravity : PLAYER.gravity;
      if (!this.grounded) {
        this.vy -= g * dt;
        this.y += this.vy * dt;
        if (this.y <= this.groundY && this.vy <= 0) {
          this.y = this.groundY;
          this.vy = 0;
          this.grounded = true;
          this.jumping = false;
          this.fastFall = false;
          if (this.rolling <= 0) this.play(this.moveClip(), 0.08);
          if (this.pendingJump > 0) { this.pendingJump = 0; if (this.jump()) this.bufferedJump = true; }
        }
      } else if (this.y > this.groundY + 0.05) {
        this.grounded = false;
        this.vy = 0;
      } else {
        this.y = this.groundY;
      }
    }

    if (this.pendingJump > 0) this.pendingJump -= dt;
    if (this.rolling > 0) {
      this.rolling -= dt;
      if (this.rolling <= 0 && !this.dead) this.play(this.grounded ? this.moveClip() : 'Jump', 0.1);
    }
    if (this.stumbling > 0) {
      this.stumbling -= dt;
      if (this.stumbling <= 0 && !this.dead) this.play(this.moveClip(), 0.1);
    }

    this.height = this.rolling > 0 ? PLAYER.rollHeight : PLAYER.height;

    // wheel spin follows speed
    if (this.current === 'Ride') this.char.actions.Ride.timeScale = 0.6 + speed / 14;
    if (this.current === 'Turbo') this.char.actions.Turbo.timeScale = 1 + speed / 20;

    // lean into lane changes (bikes lean a lot)
    const targetTilt = this.laneT < 1 ? (this.targetLane - this.laneFrom) * -0.32 : 0;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 10);

    this.char.mixer.update(dt);
    this._sync();
  }

  _sync() {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.z = this.tilt;
    this.group.rotation.x = this.flying ? -0.15 : 0;
    this.shadow.position.set(this.x, this.groundY + 0.02, this.z);
    const h = Math.max(0, this.y - this.groundY);
    const s = Math.max(0.35, 1 - h * 0.12);
    this.shadow.scale.set(s, s * 1.7, 1);
    this.shadow.material.opacity = 0.14 * s;
  }

  bounds() {
    const w = PLAYER.width / 2;
    return {
      minX: this.x - w, maxX: this.x + w,
      minY: this.y, maxY: this.y + this.height,
      minZ: this.z - PLAYER.depth / 2, maxZ: this.z + PLAYER.depth / 2,
    };
  }
}
