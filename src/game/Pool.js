/** Simple per-prop object pool so the endless track never allocates while running. */
export class Pool {
  constructor(assets, scene) {
    this.assets = assets;
    this.scene = scene;
    this.free = new Map();
    this.live = 0;
  }

  acquire(name) {
    let list = this.free.get(name);
    if (!list) { list = []; this.free.set(name, list); }
    let obj = list.pop();
    if (!obj) {
      obj = this.assets.prop(name);
      obj.userData.poolName = name;
      this.scene.add(obj);
    }
    obj.visible = true;
    obj.scale.set(1, 1, 1);
    obj.rotation.set(0, 0, 0);
    this.live++;
    return obj;
  }

  release(obj) {
    if (!obj) return;
    obj.visible = false;
    obj.position.set(0, -100, 0);
    this.free.get(obj.userData.poolName).push(obj);
    this.live--;
  }
}
