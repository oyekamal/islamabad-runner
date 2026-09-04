import * as THREE from 'three';

/** All coins are drawn with one InstancedMesh. */
export class Coins {
  constructor(assets, scene, capacity = 600) {
    const tmpl = assets.props.coin;
    let geo = null;
    tmpl.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; });
    geo = geo.clone();
    geo.clearGroups();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffc81e, emissive: 0x6a4600 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.capacity = capacity;
    this.items = [];           // {x,y,z,alive,pull}
    this.freeIdx = [];
    for (let i = capacity - 1; i >= 0; i--) this.freeIdx.push(i);
    this.slots = new Array(capacity).fill(null);
    this.dummy = new THREE.Object3D();
    this.spin = 0;
    this.hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this.hidden);
    this.mesh.count = capacity;
  }

  add(x, y, z) {
    if (!this.freeIdx.length) return null;
    const idx = this.freeIdx.pop();
    const c = { x, y, z, baseY: y, idx, alive: true, pull: 0 };
    this.slots[idx] = c;
    this.items.push(c);
    return c;
  }

  remove(c) {
    if (!c.alive) return;
    c.alive = false;
    this.slots[c.idx] = null;
    this.freeIdx.push(c.idx);
    this.mesh.setMatrixAt(c.idx, this.hidden);
  }

  clear() {
    for (const c of this.items) if (c.alive) this.remove(c);
    this.items.length = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Update spin, magnet attraction and culling. Returns collected coins. */
  update(dt, player, magnet, cullZ) {
    this.spin += dt * 4;
    const collected = [];
    const px = player.x, py = player.y + 0.9, pz = player.z;
    const keep = [];
    for (const c of this.items) {
      if (!c.alive) continue;
      if (c.z > cullZ) { this.remove(c); continue; }
      if (magnet && c.z < pz + 1 && c.z > pz - 14) {
        c.pull = Math.min(1, c.pull + dt * 3);
        const k = Math.min(1, dt * 10 * (0.5 + c.pull));
        c.x += (px - c.x) * k; c.y += (py - c.y) * k; c.z += (pz - c.z) * k;
      }
      const dx = c.x - px, dy = (c.y) - py, dz = c.z - pz;
      if (Math.abs(dz) < 0.8 && Math.abs(dx) < 0.9 && Math.abs(dy) < 1.4) {
        collected.push(c);
        this.remove(c);
        continue;
      }
      this.dummy.position.set(c.x, c.y + Math.sin(this.spin * 0.5 + c.z * 0.3) * 0.05, c.z);
      this.dummy.rotation.set(0, this.spin, 0);
      this.dummy.scale.setScalar(0.8);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(c.idx, this.dummy.matrix);
      keep.push(c);
    }
    this.items = keep;
    this.mesh.instanceMatrix.needsUpdate = true;
    return collected;
  }

  shift(dz) { for (const c of this.items) c.z += dz; }
}
