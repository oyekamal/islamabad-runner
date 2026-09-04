import * as THREE from 'three';

/** Lightweight particle burst system built on THREE.Points. */
export class Effects {
  constructor(scene, capacity = 800) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.particles = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: {},
      vertexShader: `attribute float size; varying vec3 vColor; void main(){ vColor = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vColor; void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c,c); if (d > 0.25) discard; float a = smoothstep(0.25, 0.05, d); gl_FragColor = vec4(vColor, a); }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;
    this._hideAll();
  }

  _hideAll() { for (let i = 0; i < this.capacity; i++) { this.pos[i * 3 + 1] = -1000; this.size[i] = 0; } }

  burst(x, y, z, opts = {}) {
    const n = opts.count || 10;
    const color = new THREE.Color(opts.color || 0xffd53d);
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= this.capacity) this.particles.shift();
      const sp = opts.speed || 3;
      this.particles.push({
        x, y, z,
        vx: (Math.random() - 0.5) * sp, vy: Math.random() * sp * (opts.up || 1), vz: (Math.random() - 0.5) * sp + (opts.vz || 0),
        life: opts.life || 0.5, max: opts.life || 0.5, size: opts.size || 0.25,
        r: color.r, g: color.g, b: color.b, gravity: opts.gravity === undefined ? 6 : opts.gravity,
      });
    }
  }

  coin(x, y, z) { this.burst(x, y, z, { count: 8, color: 0xffe066, speed: 3, life: 0.4, size: 0.22, gravity: 2 }); }
  dust(x, y, z, count = 4) { this.burst(x, y, z, { count, color: 0xd8cbb5, speed: 1.6, life: 0.5, size: 0.35, up: 0.6, vz: 2.0, gravity: -1 }); }
  crash(x, y, z) { this.burst(x, y, z, { count: 30, color: 0xffffff, speed: 8, life: 0.8, size: 0.4 }); this.burst(x, y, z, { count: 20, color: 0xff7a1a, speed: 6, life: 0.6, size: 0.3 }); }
  boardBreak(x, y, z) { this.burst(x, y, z, { count: 26, color: 0x1fb2a6, speed: 7, life: 0.7, size: 0.3 }); this.burst(x, y, z, { count: 14, color: 0x7cf2ff, speed: 5, life: 0.5, size: 0.25 }); }
  jet(x, y, z) { this.burst(x, y, z, { count: 2, color: Math.random() < 0.5 ? 0xff6a00 : 0xffd53d, speed: 0.8, life: 0.22, size: 0.22, up: -2.5, vz: 0.5, gravity: 0 }); }
  powerup(x, y, z, color) { this.burst(x, y, z, { count: 24, color, speed: 5, life: 0.7, size: 0.3, gravity: 1 }); }
  sparks(x, y, z) { this.burst(x, y, z, { count: 3, color: Math.random() < 0.5 ? 0xffd53d : 0xffffff, speed: 4, life: 0.3, size: 0.12, up: 1.2, vz: 3, gravity: 12 }); }
  turboTrail(x, y, z) { this.burst(x, y, z, { count: 2, color: Math.random() < 0.5 ? 0xff7a1a : 0xffd53d, speed: 1.2, life: 0.35, size: 0.4, up: 0.6, vz: 4, gravity: 0 }); }
  hoverTrail(x, y, z) { this.burst(x, y, z, { count: 1, color: 0x7cf2ff, speed: 0.4, life: 0.3, size: 0.3, up: 0.3, vz: 1.5, gravity: 0 }); }

  update(dt) {
    let i = 0;
    const keep = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.life / p.max;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
      this.size[i] = p.size * (0.4 + 0.6 * t);
      keep.push(p);
      i++;
    }
    for (; i < this.capacity; i++) { this.pos[i * 3 + 1] = -1000; this.size[i] = 0; }
    this.particles = keep;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }

  shift(dz) { for (const p of this.particles) p.z += dz; }
}
