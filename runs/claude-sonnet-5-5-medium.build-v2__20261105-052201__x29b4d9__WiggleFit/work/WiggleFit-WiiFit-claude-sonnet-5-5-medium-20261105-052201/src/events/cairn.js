import * as THREE from 'three/webgpu';
import { RAPIER, propGroups, dollGroups } from '../physics/world.js';
import { GameEvent } from './base.js';
import { box, cyl, ball } from '../art/props.js';
import { createHeron } from '../art/chars.js';
import { tuning } from '../data/tuning.js';
import { toon } from '../render/renderer.js';

const SIZES = [[0.26, 0.09], [0.24, 0.085], [0.22, 0.08], [0.2, 0.078], [0.18, 0.074], [0.165, 0.07], [0.15, 0.066], [0.14, 0.062], [0.125, 0.058], [0.11, 0.054]];
const WIDE = [[0.28, 0.09], [0.27, 0.085], [0.26, 0.08], [0.25, 0.078], [0.24, 0.074], [0.23, 0.07], [0.22, 0.066], [0.21, 0.062], [0.2, 0.058], [0.19, 0.054]];
const TIERS = [{ n: 6, per: 5.5, hold: 8, sw: [0.1, 0.3], tr: [0.05, 0.15], off: 0.015, sizes: SIZES }, { n: 8, per: 5, hold: 10, sw: [0.3, 0.7], tr: [0.1, 0.25], off: 0.02, sizes: SIZES }, { n: 10, per: 4.5, hold: 10, sw: [0.25, 0.6], tr: [0.1, 0.25], off: 0.02, sizes: WIDE }];
export class Cairn extends GameEvent {
  static id = 'cairn'; static title = 'The Cairn'; static discipline = 'Stillness'; static instructor = 'stillwater'; static couch = true; static session = true; static music = 'stillness'; static palette = 'golden';
  static intro = { line: 'Hold the slab level overhead while stones are stacked on it. Then hold still.', can: 'You can breathe with the ring to steady the stack.', cant: "You can't catch a stone: dropped stones clatter and the next one still comes.", prompts: [['move', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Flail']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.paletteName = 'golden'; this.music = 'stillness'; this.per = o.session ? (o.duration - 6) / (T.n + T.hold / T.per) : T.per; this.hold = o.session ? o.duration - this.per * T.n - 1 : T.hold; this.duration = this.per * T.n + this.hold; this.laneGap = 3.2;
    this.makeGround(2.6, 4, '#CFC6B4'); this.group.add(box(8, 4, 3, '#A8A092', 0, -1.5, -5)); this.cam = { pos: [3.6, 2.4, 7.2], look: [0, 1.7, 0], fov: 38 };
    this.heron = createHeron(); this.heron.root.position.set(-2.3, 0, -0.5); this.heron.root.rotation.y = 0.6; this.group.add(this.heron.root);
    this.pw.world.integrationParameters.numSolverIterations = 10; this.addDolls({ margin: 0.8, ankleMax: 6 });
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.stones = []; l.dropped = 0; l.nextStone = 2; l.steady = 0; l.steadyN = 0; l.bal.p.ankleScale = 1; const gq = dollGroups(l.id); l.bal.addCollider(RAPIER.ColliderDesc.cuboid(0.55, 0.03, 0.55).setTranslation(0, 0.95, 0).setMass(0.05).setFriction(1).setCollisionGroups(gq)); const slab = box(1.1, 0.06, 1.1, '#9C8F7A', 0, 1.7, 0); l.doll.root.add(slab); l.slab = slab; l.doll.root.userData.slab = slab; l.rig.play('holdSlab', 0); l.fixedAnim = true; l.stats = { stones: 0 }; }
    this.camSnap = true;
  }
  stoneOf(i) { return this.T.sizes[i % this.T.sizes.length]; }
  dropStone(lane) {
    if (lane.stones.length + lane.dropped >= this.T.n && !this.forcing) { /* limit */ } const i = lane.stones.length + lane.dropped; const [r, hh] = this.stoneOf(i); const h = this.topOf(lane); const off = this.T.off; const bp = lane.bal.body.translation();
    const body = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(bp.x + (this.r() - 0.5) * 2 * off, h + hh + 0.012, bp.z + (this.r() - 0.5) * 2 * off).setLinearDamping(0.1).setAngularDamping(0.6).setCanSleep(false));
    this.pw.world.createCollider(RAPIER.ColliderDesc.cuboid(r * 0.8, hh, r * 0.8).setMass(tuning.stoneMass).setFriction(0.95).setRestitution(0).setCollisionGroups(propGroups(lane.id)), body);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, hh * 2, 10), toon(['#B8B2A4', '#A39C8C', '#C9C2B2'][i % 3])); m.castShadow = true; this.group.add(m); lane.stones.push({ body, mesh: m, hh, r }); this.game.audio.sfx('thud'); this.heron.J.neck2 && (this.heron.J.neck2.rotation.x = 0.6);
  }
  topOf(lane) { let top = lane.bal.body.translation().y + 0.98 + 0.03; const sb = lane.bal.body.translation(); for (const s of lane.stones) { const t = s.body.translation(); if (Math.hypot(t.x - sb.x, t.z - sb.z) < 0.9 && t.y + s.hh > top && t.y > sb.y) top = Math.max(top, t.y + s.hh); } return top; }
  botIntent(lane, dt, it) { const [wx, wz] = lane.bot.steer(0, 0, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; it.breath = (this.t % 8) < 4; it.flailEdge = false; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal; const k = Math.min(1, this.t / this.duration); const bp = (this.t % 8) < 4; lane.sync = (lane.sync ?? 0.5) + (((it.breath === bp) ? 1 : 0) - (lane.sync ?? 0.5)) * dt / 4; const bonus = lane.sync > 0.7 ? 0.6 : 1;
    b.sway = (this.T.sw[0] + (this.T.sw[1] - this.T.sw[0]) * k) * bonus; b.tremor = (this.T.tr[0] + (this.T.tr[1] - this.T.tr[0]) * k) * bonus;
    if (lane.stones.length + lane.dropped < this.T.n && this.t >= lane.nextStone) { lane.nextStone += this.per; this.dropStone(lane); }
    lane.steadyN++; if (Math.hypot(b.cobX, b.cobZ) < 0.55) lane.steady++;
  }
  step() {
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; const sb = l.bal.body.translation(); let on = 0; for (const s of l.stones) { const t = s.body.translation(); s.mesh.position.set(t.x, t.y, t.z); const q = s.body.rotation(); s.mesh.quaternion.set(q.x, q.y, q.z, q.w); if (Math.hypot(t.x - sb.x, t.z - sb.z) < 0.7 && t.y > sb.y + 0.9) on++; }
      l.stats.stones = on; l.form = 100 * (0.8 * on / this.T.n + 0.2 * (l.steady / Math.max(1, l.steadyN))); l.score = l.form;
      for (let i = l.stones.length - 1; i >= 0; i--) if (l.stones[i].body.translation().y < -3) { const s = l.stones[i]; this.pw.removeBody(s.body); s.mesh.removeFromParent(); l.stones.splice(i, 1); l.dropped++; this.game.audio.sfx('clack'); } }
    if (this.t >= this.duration) this.finish();
  }
  onFall(lane) { for (const s of lane.stones) { s.mesh.removeFromParent(); this.pw.removeBody(s.body); } lane.dropped += lane.stones.length; lane.stones = []; lane.slab.visible = false; this.word('CRASH', lane.x, 2, 1); }
  onRecover(lane) { lane.slab.visible = true; lane.nextStone = this.t + 2; }
  frameExtra() { for (const l of this.lanes) if (l.stones) for (const s of l.stones) { const t = s.body.translation(); s.mesh.position.set(t.x, t.y, t.z); const q = s.body.rotation(); s.mesh.quaternion.set(q.x, q.y, q.z, q.w); } const n = this.heron.J; n.head.rotation.z = Math.sin(this.time * 0.4) * 0.12; if (n.neck2) n.neck2.rotation.x *= 0.95; }
  discInfo() { return { zone: { x: 0, z: 0, r: 0.3, good: true } }; }
  hudInfo(lane) { return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: [{ id: 's', html: `Stones <b>${lane.stats.stones || 0}</b> / ${this.T.n}` }] }; }
  prompts() { return Cairn.intro.prompts; }
}
