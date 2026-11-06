// One InstancedMesh per material of a model: scatter cheaply, burn one tree by zeroing its matrix.
import { THREE, buildModel, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
const { InstancedMesh, Matrix4, Quaternion, Vector3, Euler } = THREE;
const _m = new Matrix4(), _q = new Quaternion(), _p = new Vector3(), _s = new Vector3(), _e = new Euler();
const ZERO = new Matrix4().makeScale(0, 0, 0);
export class InstanceSet {
  constructor(scene, modelId, capacity, { palette, castShadow = true, seed, params } = {}) {
    this.capacity = capacity; this.count = 0; this.meshes = [];
    const build = buildModel(modelId, { catalog: MODELS, palette, seed, params });
    build.object.updateMatrixWorld(true);
    build.object.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.matrixWorld.equals(_m.identity()) ? o.geometry : o.geometry.clone().applyMatrix4(o.matrixWorld);
      const mesh = new InstancedMesh(geo, o.material, capacity);
      mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.frustumCulled = false;
      for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, ZERO);
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      this.meshes.push(mesh);
    });
    this.build = build;
  }
  add(x, y, z, yaw = 0, scale = 1) { const i = this.count++; this.set(i, x, y, z, yaw, scale); return i; }
  set(i, x, y, z, yaw = 0, scale = 1) {
    _e.set(0, yaw, 0); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(scale, scale, scale));
    for (const m of this.meshes) { m.setMatrixAt(i, _m); m.instanceMatrix.needsUpdate = true; }
  }
  hide(i) { for (const m of this.meshes) { m.setMatrixAt(i, ZERO); m.instanceMatrix.needsUpdate = true; } }
}
