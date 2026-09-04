import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const FILES = ['biker', 'ranger', 'props', 'pickups', 'scenery'];

/** Convert every PBR material into a cheap, bright Lambert material (mobile friendly, flat cartoon look). */
function simplifyMaterials(root) {
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      const ck = m.uuid + (o.geometry.attributes.color ? ':vc' : '');
      if (cache.has(ck)) return cache.get(ck);
      const hasVC = !!o.geometry.attributes.color;
      const lm = new THREE.MeshLambertMaterial({
        vertexColors: hasVC,
        color: hasVC ? new THREE.Color(0xffffff) : (m.color ? m.color.clone() : new THREE.Color(0xffffff)),
        emissive: m.emissive ? m.emissive.clone().multiplyScalar(Math.min(1, m.emissiveIntensity || 1) * 0.6) : new THREE.Color(0),
        transparent: m.transparent,
        opacity: m.opacity,
        side: THREE.FrontSide,
      });
      lm.name = m.name;
      cache.set(ck, lm);
      return lm;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

export class Assets {
  constructor() {
    this.gltf = {};
    this.props = {};     // name -> template Object3D
  }

  async load(onProgress) {
    const loader = new GLTFLoader();
    let done = 0;
    await Promise.all(FILES.map((f) => new Promise((res, rej) => {
      loader.load(`models/${f}.glb`, (g) => {
        simplifyMaterials(g.scene);
        this.gltf[f] = g;
        done++;
        onProgress && onProgress(done / FILES.length);
        res();
      }, undefined, rej);
    })));
    for (const f of ['props', 'pickups', 'scenery']) {
      for (const child of this.gltf[f].scene.children) {
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.updateMatrix();
        this.props[child.name] = child;
      }
    }
  }

  /** Clone a static prop by name. */
  prop(name) {
    const t = this.props[name];
    if (!t) throw new Error('no prop ' + name);
    const c = t.clone(true);
    c.position.set(0, 0, 0);
    return c;
  }

  /** Instantiate a skinned character with its own mixer. */
  character(name) {
    const g = this.gltf[name];
    const root = skeletonClone(g.scene);
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
    return { root, mixer, actions, clips: g.animations };
  }
}
