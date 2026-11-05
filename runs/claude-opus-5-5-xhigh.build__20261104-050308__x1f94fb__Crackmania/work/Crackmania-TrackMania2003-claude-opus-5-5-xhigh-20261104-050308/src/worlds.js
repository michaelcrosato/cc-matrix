// CRACKMANIA worlds: one E.World3D per environment for the whole session (switching = which world draws), the loaded
// track's meshes, colliders, scenery and crowd. Loading a track rebuilds only its geometry (materials are made at boot)
import { ctx, E, U } from './ctx.js';
import { ENVS, ENV_IDS, worldOptions } from './env/envs.js';
import { TrackView } from './track/view.js';
import { Course } from './race/course.js';
import { scenery, drawAnim } from './track/deco.js';
import { GX, GY, CELL, GRID } from './track/blocks.js';

export class Worlds {
  constructor(game) { this.game = game; this.W = {}; this.env = null; this.course = null; this.draw3d = null; this.deco = null; this.crowd = []; this.time = 0; }
  /** make an environment's world (a boot step) */
  make(env) {
    const self = this, w = new E.World3D(this.game, worldOptions(env, (world, r) => self._onDraw(world, r)));
    w.camera.mouseLook = false; w.camera.target = { x: (GX + 512) * U, y: (GY + 512) * U, z: 0 };
    // (E7) the particles land on the track and its plate, not on the terrain 60 m below
    w.particleGround = (x, y, z) => { const c = self.course; if (!c || !c.ph.pw) return 0; const h = c.ph.groundBelow(x / U, y / U, z / U + 1); return h ? h.z * U : -60 * U; };
    const view = new TrackView(w, env);
    let kitMat = null, ink = null;
    if (E.World3D.renderer) { kitMat = new E.THREE.MeshToonNodeMaterial({ vertexColors: true, gradientMap: E.World3D.TOON_BANDS }); ink = new E.THREE.MeshBasicNodeMaterial({ color: '#0c0818', side: E.THREE.BackSide }); }
    const lamps = ENVS[env].lights ? Array.from({ length: 6 }, () => w.light({ color: '#ffd890', reach: 260, power: 22, on: false })) : [];
    this.W[env] = { env, world: w, view, kitMat, ink, deco: null, decoMesh: null, crowd: [], lamps };
    return this.W[env];
  }
  get cur() { return this.W[this.env]; }
  get world() { return this.cur && this.cur.world; }
  use(env) { if (!this.W[env]) this.make(env); this.env = env; return this.W[env]; }
  /** a Track becomes the course: colliders, meshes, scenery; returns the Course */
  load(track, o = {}) {
    const W = this.use(track.env), w = W.world;
    if (this.course && this.course !== o.keep) this.course.free();
    const course = new Course(track, E.RAPIER);
    W.view.load(course);
    this.setDeco(W, track, course, o);
    this.course = course; ctx.course = course;
    return course;
  }
  /** scenery for the track (seeded by its id): the merged static mesh, moving props, colliders, the crowd */
  setDeco(W, track, course, o = {}) {
    const d = scenery(track, W.env, { sparse: o.sparse });
    W.deco = d;
    for (const s of d.solids) { if (Array.isArray(s)) course.addPropCollider('prop', s[0], s[1], s[2], s[3]); else { const [x, y, z, hx, hy, h, yaw] = s.box; course.addPropBox('prop', x, y, z, hx, hy, h / 2, yaw); } }
    course.ph.commit();
    if (W.decoMesh) { W.world.scene.remove(W.decoMesh); W.decoMesh.traverse(m => m.isMesh && m.geometry.dispose()); W.decoMesh = null; }
    if (W.kitMat) { W.decoMesh = d.kit.build(W.kitMat, W.ink); if (W.decoMesh) W.world.scene.add(W.decoMesh); }
    // the crowd on the stands, the flag man at the start (rigs drawn by the world as cards)
    const w = W.world; w.reset(); W.crowd = []; W.drapeau = null;
    const rnd = E.rng(7), shirts = ['#e8402a', '#2a6ae8', '#ffc21a', '#3ac850', '#f4f4f4', '#b84ae0', '#ff7a1a'];
    for (const st of d.stands) for (let i = 0; i < st.n; i++) {
      const row = i % 3, along = (Math.floor(i / 3) - (st.n / 6 - .5)) * 3.6 + (rnd() - .5), c = Math.cos(st.yaw), s = Math.sin(st.yaw);
      const bx = st.x - c * (1.5 + row * 1.2) - s * along, by = st.y - s * (1.5 + row * 1.2) + c * along, bz = .8 + row * .8 + .1;
      const rig = new E.Humanoid({ style: 'classic', weapon: null, size: .9, colors: { cloth: shirts[Math.floor(rnd() * shirts.length)], pants: '#3a3a48', skin: ['#f0c8a0', '#c89070', '#8a5a3a'][Math.floor(rnd() * 3)] } });
      const a = w.hero({ x: bx * U, y: by * U, z: bz * U, rig, fly: true, facing: st.yaw }); a.anim = { pose: 'wave' }; a.data.ph = rnd() * 4; a.data.cheer = 0; W.crowd.push(a);
    }
    if (d.drapeau) {
      const q = d.drapeau, rig = new E.Humanoid({ build: 'chibi', size: 1.1, weapon: null, hat: { style: 'cap', color: '#1a1a22' }, colors: { cloth: '#f4f4f4', pants: '#1a1a22', hair: '#3a2a20', skin: '#f0c8a0' } });
      W.drapeau = w.hero({ x: q.x * U, y: q.y * U, z: q.z * U, rig, fly: true, facing: Math.atan2(-q.r[1], -q.r[0]) }); W.drapeau.anim = { pose: null };
    }
    w.camera.mouseLook = false;
  }
  /** each step: the rigs pose (the world's actors) */
  step(dt) { const W = this.cur; if (!W) return; this.time += dt; W.world.step(dt); }
  draw(r) { const W = this.cur; if (W) W.world.draw(r); }
  _onDraw(world, r) { if (this.draw3d) this.draw3d(world, r); }
  /** the moving scenery near a point */
  drawScenery(pen, t, near) {
    const W = this.cur; if (!W || !W.deco) return; drawAnim(pen, W.deco.anim, t, near, W.env);
    // dusk in the mountains: the nearest street lamps light the road
    if (W.lamps.length && near) { const L = W.deco.anim.filter(a => a.kind === 'lamp').map(a => [Math.hypot(a.x - near[0], a.y - near[1]), a]).sort((a, b) => a[0] - b[0]); W.lamps.forEach((h, i) => { const a = L[i] && L[i][1]; h.on = !!a && L[i][0] < 400; if (a) { h.x = a.x * U; h.y = a.y * U; h.z = (a.z - .3) * U; } }); }
  }
  /** the crowd cheers (a gate, a finish) */
  cheer(k = 1) { const W = this.cur; if (W) for (const a of W.crowd) a.data.cheer = Math.max(a.data.cheer, k * (1.5 + (a.data.ph % 1) * .5)); }
  animateCrowd(dt) {
    const W = this.cur; if (!W) return;
    for (const a of W.crowd) { a.data.cheer = Math.max(0, a.data.cheer - dt); const t = this.time + a.data.ph; a.anim = { pose: a.data.cheer > 0 ? 'cheer' : (t % 4 < 2.2 ? 'wave' : null) }; }
  }
  prepare() { for (const id of ENV_IDS) if (this.W[id]) this.W[id].world.prepare(); }
}
