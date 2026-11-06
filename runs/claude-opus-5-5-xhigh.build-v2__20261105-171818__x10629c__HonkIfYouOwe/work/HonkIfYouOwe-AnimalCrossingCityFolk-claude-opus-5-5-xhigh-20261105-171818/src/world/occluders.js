// See-through occluders: anything between the camera and the player dissolves a little.
import { THREE, toonMaterial } from '../engine.js';

const dissolveCache = new Map();
function dissolved(mat) {
  const hex = mat.color?.getHex?.() ?? 0xffffff;
  const k = `${hex}`;
  let m = dissolveCache.get(k);
  if (!m) {
    m = toonMaterial(hex, { dissolve: true, rim: hex });
    m.dissolve = 0.72;
    dissolveCache.set(k, m);
  }
  return m;
}
const dir = new THREE.Vector3();
const from = new THREE.Vector3();
const inv = { x: 0, y: 0, z: 0 };
function hitsBox(o, d, min, max) {
  let t0 = 0, t1 = 40;
  for (const a of ['x', 'y', 'z']) {
    const id = 1 / (d[a] || 1e-6);
    let tn = (min[a] - o[a]) * id, tf = (max[a] - o[a]) * id;
    if (tn > tf) [tn, tf] = [tf, tn];
    t0 = Math.max(t0, tn); t1 = Math.min(t1, tf);
    if (t1 < t0) return false;
  }
  return true;
}
function setFaded(view, on) {
  if (view.faded === on) return;
  view.faded = on;
  view.object.traverse((m) => {
    if (!m.isMesh) return;
    if (on) { m.userData.solidMat = m.material; m.material = dissolved(m.material); }
    else if (m.userData.solidMat) { m.material = m.userData.solidMat; m.userData.solidMat = null; }
  });
}
const treeBox = { min: new THREE.Vector3(), max: new THREE.Vector3() };
export function updateOccluders(g) {
  const place = g.place;
  const p = g.player;
  const cam = g.ctx.camera.camera;
  cam.getWorldDirection(dir).multiplyScalar(-1);
  from.set(p.x, p.y + 0.8, p.z);
  const list = place.occluders ?? [];
  for (const v of list) {
    if (Math.abs(v.min.x - p.x) > 16 || Math.abs(v.min.z - p.z) > 16) { setFaded(v, false); continue; }
    const hit = hitsBox(from, dir, v.min, v.max);
    if (hit) { v.holdT = 0.3; setFaded(v, true); }
    else if (v.holdT > 0) { v.holdT -= 0.016; }
    else setFaded(v, false);
  }
  if (place !== g.town) return;
  // Trees: small boxes in the views
  const px = Math.floor(p.x), pz = Math.floor(p.z);
  g.fadedTrees ??= new Map();
  const seen = new Set();
  for (let dz = 0; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
    const k = `${px + dx},${pz + dz}`;
    const o = g.world.town.objects[k];
    if (!o || o.k !== 'tree') continue;
    const v = g.town.objectViews.get(k);
    if (!v) continue;
    const x = px + dx, z = pz + dz, h = o.kind === 'pine' ? 4 : o.kind === 'palm' ? 3.6 : 3.6;
    const y0 = v.position.y;
    treeBox.min.set(x - 0.8, y0 + 1, z - 0.8); treeBox.max.set(x + 1.8, y0 + h, z + 1.8);
    if (hitsBox(from, dir, treeBox.min, treeBox.max)) { seen.add(k); if (!g.fadedTrees.has(k)) { const view = { object: v, faded: false }; setFaded(view, true); g.fadedTrees.set(k, view); } }
  }
  for (const [k, view] of g.fadedTrees) if (!seen.has(k)) { if (view.object.parent) setFaded(view, false); g.fadedTrees.delete(k); }
}
