import * as THREE from 'three';
import { CHASER } from './constants.js';

/** Two rangers on foot chasing the biker. */
export class Chaser {
  constructor(assets, scene) {
    this.a = assets.character('ranger');
    this.b = assets.character('ranger');
    // second ranger: darker uniform so they read as two people
    this.b.root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      o.material = mats.map((m) => { if (m.name === 'khaki' || m.name === 'skin') { const c = m.clone(); c.color.set(m.name === 'khaki' ? '#9c8a5a' : '#8a5a3a'); return c; } return m; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    this.group = new THREE.Group();
    this.group.add(this.a.root);
    this.group.add(this.b.root);
    this.b.root.position.set(1.25, 0, 0.9);
    this.b.root.scale.setScalar(0.96);
    scene.add(this.group);
    this.dist = CHASER.startDist;
    this.targetDist = CHASER.farDist;
    this.nearTimer = 0;
    this.x = 0;
    this.y = 0;
    this._play('Idle');
  }

  _play(name) {
    for (const c of [this.a, this.b]) {
      const a = c.actions[name] || c.actions.Run;
      if (c.current === a) continue;
      if (c.current) c.current.fadeOut(0.15);
      a.reset().fadeIn(0.15).play();
      a.setLoop(THREE.LoopRepeat, Infinity);
      c.current = a;
    }
    this.b.current.time = 0.25;   // offset the strides
  }

  reset() {
    this.dist = CHASER.startDist;
    this.targetDist = CHASER.farDist;
    this.nearTimer = 0;
    this.group.visible = true;
    this._play('Idle');
  }

  startRun() { this.dist = CHASER.startDist; this.targetDist = CHASER.farDist; this.nearTimer = 1.5; this._play('Run'); }

  /** Player stumbled – rangers close in. Returns true if they were already close (=> arrested). */
  stumble() {
    const wasNear = this.nearTimer > 0 && this.dist < CHASER.nearDist + 1.5;
    this.nearTimer = CHASER.nearTime;
    this.targetDist = CHASER.nearDist;
    this.dist = Math.min(this.dist, CHASER.nearDist + 2.5);
    return wasNear;
  }

  get isNear() { return this.nearTimer > 0; }

  catchPlayer() { this.targetDist = 2.4; this.dist = Math.min(this.dist, 5); this._play('Run'); }

  update(dt, player, speed, running) {
    if (running) {
      if (this.nearTimer > 0) { this.nearTimer -= dt; if (this.nearTimer <= 0) this.targetDist = CHASER.farDist; }
      const k = this.targetDist > this.dist ? 0.9 : 2.2;
      this.dist += (this.targetDist - this.dist) * Math.min(1, dt * k);
    } else if (player.dead) {
      this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 3);
      if (this.dist < 2.7) this._play('Idle');
    }
    this.x += (player.x - this.x) * Math.min(1, dt * 6);
    const targetY = player.flying ? 0 : player.groundY;
    this.y += (targetY - this.y) * Math.min(1, dt * 8);
    this.group.position.set(this.x, this.y, player.z + this.dist);
    this.a.mixer.update(dt);
    this.b.mixer.update(dt);
    const ts = running ? 0.9 + speed / 22 : 1;
    if (this.a.current) this.a.current.timeScale = ts;
    if (this.b.current) this.b.current.timeScale = ts * 1.05;
    this.group.visible = this.dist < 14.5;
  }
}
