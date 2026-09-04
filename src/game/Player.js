import * as THREE from 'three';
import { LANE_W, PLAYER, TRAIN_H } from './constants.js';

export class Player {
  constructor(assets, scene, characterDef) {
    this.assets = assets;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.char = null;
    this.setCharacter(characterDef);

    // blob shadow
    const shadowGeo = new THREE.CircleGeometry(0.55, 20);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);

    // hoverboard + jetpack attachments
    this.board = assets.prop('hoverboard');
    this.board.visible = false;
    this.group.add(this.board);
    this.jetpackMesh = assets.prop('jetpack');
    this.jetpackMesh.visible = false;
    this.jetpackMesh.scale.setScalar(0.8);
    this.jetpackMesh.position.set(0, 1.25, 0.42);
    this.jetpackMesh.rotation.y = Math.PI;
    this.group.add(this.jetpackMesh);

    this.reset();
  }

  setCharacter(def) {
    if (this.char) this.group.remove(this.char.root);
    this.char = this.assets.character('runner');
    this.group.add(this.char.root);
    this.def = def;
    if (def && def.palette) this.applyPalette(def.palette);
    this.current = null;
    this.play('Idle');
  }

  /** Recolour named materials on this clone so characters look different. */
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
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.groundY = 0;
    this.grounded = true;
    this.onTrain = false;
    this.rolling = 0;
    this.jumping = false;
    this.stumbling = 0;
    this.dead = false;
    this.flying = false;        // jetpack
    this.hover = false;         // hoverboard
    this.superJump = false;     // sneakers
    this.laneT = 1;             // lane lerp progress
    this.laneFrom = 0;
    this.fastFall = false;
    this.height = PLAYER.height;
    this.tilt = 0;
    this.board.visible = false;
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
    const loopOnce = ['Jump', 'Roll', 'Stumble', 'Dead'].includes(name);
    next.setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = true;
    if (prev) { prev.crossFadeTo(next, fade, false); next.play(); }
    else next.play();
    this.current = name;
  }

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
    if (!this.grounded) return false;
    this.vy = this.superJump ? PLAYER.superJumpVel : PLAYER.jumpVel;
    this.grounded = false;
    this.jumping = true;
    this.rolling = 0;
    this.fastFall = false;
    this.play('Jump', 0.06, 1.0);
    return true;
  }

  roll() {
    if (this.dead || this.flying) return false;
    if (!this.grounded) { this.fastFall = true; }
    this.rolling = PLAYER.rollTime;
    this.play('Roll', 0.05, 1.0);
    return true;
  }

  stumble() {
    this.stumbling = PLAYER.stumbleTime;
    this.play('Stumble', 0.05);
  }

  /** Bounce back to the lane we came from (side-swiped a train). */
  bounceBack() {
    const from = Math.round(this.laneFrom);
    this.targetLane = from;
    this.laneFrom = this.x / LANE_W;
    this.laneT = 0;
  }

  die() {
    this.dead = true;
    this.rolling = 0;
    this.play('Dead', 0.05);
  }

  setHover(on) {
    this.hover = on;
    this.board.visible = on;
    if (on && this.grounded) this.play('Hover', 0.15);
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

    // lane movement
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / PLAYER.laneChangeTime);
      const e = this.laneT < 0.5 ? 2 * this.laneT * this.laneT : 1 - Math.pow(-2 * this.laneT + 2, 2) / 2;
      this.x = (this.laneFrom + (this.targetLane - this.laneFrom) * e) * LANE_W;
      if (this.laneT >= 1) this.lane = this.targetLane;
    } else {
      this.x = this.targetLane * LANE_W;
      this.lane = this.targetLane;
    }

    // vertical
    if (this.flying) {
      const target = this.flyAltitude;
      this.y += (target - this.y) * Math.min(1, dt * 4);
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
          if (this.rolling <= 0) this.play(this.hover ? 'Hover' : 'Run', 0.08);
        }
      } else {
        // walked off an edge?
        if (this.y > this.groundY + 0.05) {
          this.grounded = false;
          this.vy = 0;
        } else {
          this.y = this.groundY;
        }
      }
    }

    if (this.rolling > 0) {
      this.rolling -= dt;
      if (this.rolling <= 0 && !this.dead) {
        this.play(this.grounded ? (this.hover ? 'Hover' : 'Run') : 'Jump', 0.1);
      }
    }
    if (this.stumbling > 0) {
      this.stumbling -= dt;
      if (this.stumbling <= 0 && !this.dead) this.play(this.hover ? 'Hover' : 'Run', 0.1);
    }

    this.height = this.rolling > 0 ? PLAYER.rollHeight : PLAYER.height;

    // run animation speed follows running speed
    if (this.current === 'Run') this.char.actions.Run.timeScale = 0.75 + speed / 22;

    // lean into lane changes
    const targetTilt = this.laneT < 1 ? (this.targetLane - this.laneFrom) * -0.18 : 0;
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 12);

    this.char.mixer.update(dt);
    this._sync();
  }

  _sync() {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.z = this.tilt;
    this.group.rotation.x = this.flying ? -0.25 : 0;
    // board sits under the feet
    if (this.board.visible) {
      this.board.position.set(0, 0.12, 0);
      this.board.rotation.set(0, 0, 0);
    }
    this.shadow.position.set(this.x, this.groundY + 0.02, this.z);
    const h = Math.max(0, this.y - this.groundY);
    const s = Math.max(0.35, 1 - h * 0.12);
    this.shadow.scale.setScalar(s);
    this.shadow.material.opacity = 0.3 * s;
  }

  /** AABB in world space used for collisions. */
  bounds() {
    const w = PLAYER.width / 2;
    return {
      minX: this.x - w, maxX: this.x + w,
      minY: this.y, maxY: this.y + this.height,
      minZ: this.z - PLAYER.depth / 2, maxZ: this.z + PLAYER.depth / 2,
    };
  }
}
