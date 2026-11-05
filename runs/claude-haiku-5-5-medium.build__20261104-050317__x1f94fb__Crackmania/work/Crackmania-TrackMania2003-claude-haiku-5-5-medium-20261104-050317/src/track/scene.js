// A track in the world: its road as a three.js mesh (flat colour per quad: asphalt, kerbs, the dashed middle line, boost
// pads), its road as Rapier trimesh colliders in the world's own physics, and the ray the car probes the road with.
// Track points are metres (engine axes); the physics is in engine units (16 a metre); three.js is in metres, y up.
import { U } from '../lib/vec.js';

// the strips across the road, in metres from its middle: [from, to, kind]
const STRIPS = [[-5, -4, 'kerb'], [-4, -.15, 'road'], [-.15, .15, 'line'], [.15, 4, 'road'], [4, 5, 'kerb']];
const ASPHALT = [.24, .23, .27], LINE = [.95, .93, .86], BOOST = [1, .7, .16], RED = [.86, .16, .13], WHITE = [.96, .95, .92];
const LIFT = .02;   // metres above the centre line, so the road never sinks into its own ribbon

/** the strips' quads: positions (metres, engine axes), colours and the triangles of every quad */
export function roadQuads(T) {
  const quads = [];   // { a: [x,y,z] x4 (metres), col }
  for (let i = 0; i + 1 < T.n; i++) {
    for (let s = 0; s < STRIPS.length; s++) {
      const [l0, l1, kind] = STRIPS[s];
      let col = ASPHALT;
      if (kind === 'kerb') col = Math.floor(i / 2) % 2 === 0 ? RED : WHITE;
      else if (kind === 'line') col = Math.floor(i / 6) % 2 === 0 ? LINE : ASPHALT;
      if (T.Boost[i] && kind !== 'kerb') col = BOOST;
      const q = [];
      for (const [k, l] of [[i, l0], [i, l1], [i + 1, l0], [i + 1, l1]]) {
        const P = T.P[k], R = T.R[k], Up = T.U[k];
        q.push([P[0] + R[0] * l + Up[0] * LIFT, P[1] + R[1] * l + Up[1] * LIFT, P[2] + R[2] * l + Up[2] * LIFT]);
      }
      quads.push({ q, col, up: T.U[i] });
    }
  }
  return quads;
}

/** the triangles of the quads, wound so each face points along its road's up (the quad's `up`, engine axes); `map`
 *  takes an engine point to the space the winding is judged in (three's axes reflect the engine's) */
function triangles(quads, map = p => p) {
  const pos = [], idx = [], col = [];
  quads.forEach((Q, qi) => {
    const base = qi * 4;
    for (const p of Q.q) pos.push(p[0], p[1], p[2]);
    for (let k = 0; k < 4; k++) col.push(...Q.col);
    // A B C D as a strip: quad = (0,1,2) and (1,3,2)
    const tris = [[base, base + 1, base + 2], [base + 1, base + 3, base + 2]];
    const up = map(Q.up, true);
    for (const t of tris) {
      const a = map(Q.q[t[0] - base]), b = map(Q.q[t[1] - base]), c = map(Q.q[t[2] - base]);
      if (dot3(cross3(sub3(b, a), sub3(c, a)), up) < 0) idx.push(t[0], t[2], t[1]); else idx.push(t[0], t[1], t[2]);
    }
  });
  return { pos, idx, col };
}
const cross3 = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export class TrackScene {
  constructor(world, T) {
    this.world = world; this.T = T;
    const E = globalThis.My3D2dge, THREE = E.THREE, RAPIER = E.RAPIER, pw = world.pw;
    this.RAPIER = RAPIER; this.pw = pw;
    const quads = roadQuads(T);
    // three.js: metres, y up: (x, z, y). The faces point up (three's y).
    const three = triangles(quads, tf);
    const tpos = new Float32Array(three.pos.length), tIdx = three.idx;
    // (quads hold the metres in engine axes; three gets them reflected)
    for (let i = 0; i < three.pos.length; i += 3) { const p = tf([three.pos[i], three.pos[i + 1], three.pos[i + 2]]); tpos.set(p, i); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(three.col), 3));
    geo.setIndex(tIdx);
    geo.computeVertexNormals();
    const mat = world._obj(new THREE.MeshToonNodeMaterial({ vertexColors: true, gradientMap: E.World3D.TOON_BANDS }));
    this.mesh = new THREE.Mesh(geo, mat);
    world.scene.add(this.mesh);
    // Rapier: engine units, the faces point up in engine axes (z)
    const phys = triangles(quads);
    const cp = new Float32Array(phys.pos.length);
    for (let i = 0; i < phys.pos.length; i++) cp[i] = phys.pos[i] * U;
    this.body = pw.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.collider = pw.createCollider(RAPIER.ColliderDesc.trimesh(cp, new Uint32Array(phys.idx)).setFriction(.6), this.body);
    pw.step();                                                  // the ray queries see the road now
  }
  /** the road under a point: the first hit along dir within len (engine units): { toi, n: [x, y, z] } | null */
  cast(o, dir, len) {
    const h = this.pw.castRayAndGetNormal(new this.RAPIER.Ray({ x: o[0], y: o[1], z: o[2] }, { x: dir[0], y: dir[1], z: dir[2] }), len, true);
    if (!h) return null;
    return { toi: h.timeOfImpact, n: [h.normal.x, h.normal.y, h.normal.z] };
  }
  dispose() {
    this.pw.removeCollider(this.collider, true);
    this.pw.removeRigidBody(this.body);
    this.world.scene.remove(this.mesh); this.mesh.geometry.dispose();
    this.mesh = null;
  }
}
/** engine metres (x, y, z) to three's (x, z, y) */
function tf(p) { return [p[0], p[2], p[1]]; }
