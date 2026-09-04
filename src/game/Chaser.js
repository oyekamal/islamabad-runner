import * as THREE from 'three';
import { CHASER } from './constants.js';

/** The traffic warden and his dog who chase the runner. */
export class Chaser {
  constructor(assets, scene) {
    this.guard = assets.character('guard');
    this.dog = assets.character('dog');
    this.group = new THREE.Group();
    this.group.add(this.guard.root);
    this.group.add(this.dog.root);
    this.dog.root.position.set(1.1, 0, 0.6);
    this.dog.root.scale.setScalar(1.1);
    scene.add(this.group);
    this.dist = CHASER.startDist;
    this.targetDist = CHASER.farDist;
    this.nearTimer = 0;
    this.x = 0;
    this.y = 0;
    this._play('Idle');
  }

  _play(name) {
    for (const c of [this.guard, this.dog]) {
      const a = c.actions[name] || c.actions.Run;
      if (c.current === a) continue;
      if (c.current) c.current.fadeOut(0.15);
      a.reset().fadeIn(0.15).play();
      a.setLoop(THREE.LoopRepeat, Infinity);
      c.current = a;
    }
  }

  reset() {
    this.dist = CHASER.startDist;
    this.targetDist = CHASER.farDist;
    this.nearTimer = 0;
    this.visible = true;
    this.group.visible = true;
    this._play('Idle');
  }

  /** Called on start: show chaser right behind the player, then let him fall back. */
  startRun() { this.dist = CHASER.startDist; this.targetDist = CHASER.farDist; this.nearTimer = 1.5; this._play('Run'); }

  /** Player stumbled – chaser closes in for a while. Returns true if he was already close (=> caught). */
  stumble() {
    const wasNear = this.nearTimer > 0 && this.dist < CHASER.nearDist + 1.5;
    this.nearTimer = CHASER.nearTime;
    this.targetDist = CHASER.nearDist;
    this.dist = Math.min(this.dist, CHASER.nearDist + 2.5);
    return wasNear;
  }

  get isNear() { return this.nearTimer > 0; }

  catchPlayer() { this.targetDist = 2.1; this.dist = Math.min(this.dist, 4.5); this._play('Run'); }

  update(dt, player, speed, running) {
    if (running) {
      if (this.nearTimer > 0) { this.nearTimer -= dt; if (this.nearTimer <= 0) this.targetDist = CHASER.farDist; }
      const k = this.targetDist > this.dist ? 0.9 : 2.2;
      this.dist += (this.targetDist - this.dist) * Math.min(1, dt * k);
    } else if (player.dead) {
      this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 3);
      if (this.dist < 2.2) this._play('Idle');
    }
    // follow lanes with a small delay
    this.x += (player.x - this.x) * Math.min(1, dt * 6);
    const targetY = player.flying ? 0 : player.groundY;
    this.y += (targetY - this.y) * Math.min(1, dt * 8);
    this.group.position.set(this.x, this.y, player.z + this.dist);
    this.guard.mixer.update(dt);
    this.dog.mixer.update(dt);
    if (this.guard.current) this.guard.current.timeScale = running ? 0.8 + speed / 24 : 1;
    if (this.dog.current) this.dog.current.timeScale = running ? 0.9 + speed / 22 : 1;
    // hide when far behind the camera
    this.group.visible = this.dist < 13.5;
  }
}
