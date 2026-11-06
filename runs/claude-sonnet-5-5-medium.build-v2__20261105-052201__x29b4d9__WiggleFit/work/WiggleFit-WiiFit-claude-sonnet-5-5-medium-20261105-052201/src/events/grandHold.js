import * as THREE from 'three/webgpu';
import { RAPIER, propGroups, dollGroups } from '../physics/world.js';
import { GameEvent } from './base.js';
import { box, cyl, disc, ball, cone } from '../art/props.js';
import { createGull, createTrudy, createHeron, createWalrus } from '../art/chars.js';
import { createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { tuning } from '../data/tuning.js';
import { toon } from '../render/renderer.js';

const PH = [20, 20, 20, 20, 15];
export class GrandHold extends GameEvent {
  static id = 'grandHold'; static title = 'The Grand Hold'; static discipline = 'Finale'; static instructor = 'stillwater'; static couch = false; static session = false; static music = 'level'; static palette = 'golden';
  static intro = { line: 'Your balance is now tied to the island below. Five holds: a pose, four stones, storm gusts, lean cues, and one last hold.', can: 'You can fall: the class catches you with a bedsheet and the hold restarts.', cant: "You can't fail this one. It can only take a while.", prompts: [['move', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Flail']] };
  constructor(game, o) {
    super(game, o); this.paletteName = 'golden'; this.music = 'level'; this.duration = PH.reduce((a, b) => a + b, 0) + 40 * 0; this.laneGap = 3.4;
    this.pw.ground(4.5, 0.5, 4.5);
    this.group.add(disc(4, 0.6, '#F6EAD0', 0, -0.3, 0), cyl(4.4, 0.5, '#D94A3A', 0, -0.8, 0, 20)); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; this.group.add(cyl(0.08, 1, '#3A3A4A', Math.cos(a) * 4.1, 0.5, Math.sin(a) * 4.1, 6)); } this.group.add(cyl(0.5, 8, '#F6EAD0', 0, -4.5, 0));
    // tiny island far below that tips with your lean
    this.mini = new THREE.Group(); this.mini.position.set(0, -26, 0); this.mini.add(disc(22, 1.2, '#E8D49A', 0, -0.6, 0), disc(15, 1.2, '#7CCB6A', 0, -0.59, 0)); for (let i = 0; i < 8; i++) this.mini.add(cyl(0.6, 1.4, i % 2 ? '#E8443A' : '#F6EAD0', Math.cos(i) * 8, 0.7, Math.sin(i) * 8)); this.group.add(this.mini);
    this.cast = []; ['trudy', 'heron', 'walrus'].forEach((w, i) => { const c = w === 'trudy' ? createTrudy() : w === 'heron' ? createHeron() : createWalrus(); c.root.position.set(-3 + i * 3, -25, 8); c.root.scale.setScalar(2); this.group.add(c.root); });
    this.cam = { pos: [0, 2.6, 8], look: [0, 1.2, 0], fov: 38 }; this.gary = createGull(); this.gary.root.visible = false; this.group.add(this.gary.root);
    this.addDolls({ maxLean: 14 }); for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.ph = 0; l.pt = 0; l.zoneT = 0; l.zoneN = 0; l.phScores = []; l.stones = []; l.plate = null; l.fixedAnim = true; l.stats = { restarts: 0 }; l.sync = 0.5; l.gust = null; l.gustN = 0; l.quad = null; l.react = 0; l.cueN = 0; l.cueNext = 1; l.cueHit = 0; l.rig.play('breathe', 0); }
    this.camSnap = true; this.camA = 0;
  }
  ringFor(l) { if (l.ph === 0) return { x: 0.3, z: 0.1, r: 0.25 - 0.05 * (l.pt / PH[0]) }; if (l.ph === 4) { const k = l.pt / PH[4]; return { x: 0, z: 0, r: 0.3 - 0.22 * k }; } return { x: 0, z: 0, r: 0.32 }; }
  setSway(l) { const b = l.bal; if (l.ph === 0) { b.sway = 0.1; b.tremor = 0.06; } else if (l.ph === 1) { b.sway = 0.12; b.tremor = 0.05; b.p.margin = 0.8; b.p.ankleScale = 1.2; } else if (l.ph === 2) { b.sway = 0.08; b.tremor = 0.05; } else if (l.ph === 3) { b.sway = 0.05; b.tremor = 0.03; } else { const k = l.pt / PH[4]; b.sway = 0.2 * (1 - k); b.tremor = 0.08 * (1 - k); } if (l.ph !== 1) { b.p.margin = null; b.p.ankleScale = 1; } }
  startPhase(l) { l.pt = 0; l.zoneT = 0; l.zoneN = 0; l.cueN = 0; l.cueNext = 1; l.cueHit = 0; l.quad = null; l.gust = null; l.gustN = 0; l.gustNext = 2.5; this.clearStones(l); if (l.ph === 1) this.addPlate(l); else this.removePlate(l); this.game.audio.sfx('creak'); }
  clearStones(l) { for (const s of l.stones) { this.pw.removeBody(s.body); s.mesh.removeFromParent(); } l.stones = []; }
  addPlate(l) { if (l.plate) return; l.plate = l.bal.addCollider(RAPIER.ColliderDesc.cuboid(0.35, 0.03, 0.35).setTranslation(0, 0.86, 0).setMass(0.03).setFriction(1).setCollisionGroups(dollGroups(l.id))); l.plateM = box(0.7, 0.06, 0.7, '#9C8F7A', 0, 1.62, 0); l.doll.root.add(l.plateM); }
  removePlate(l) { if (!l.plate) return; this.pw.world.removeCollider(l.plate, true); l.plate = null; if (l.plateM) { l.plateM.removeFromParent(); l.plateM = null; } }
  dropStone(l) { const bp = l.bal.body.translation(); let top = bp.y + 0.89; for (const s of l.stones) { const t = s.body.translation(); if (t.y > bp.y + 0.8) top = Math.max(top, t.y + s.hh); } const hh = 0.06, r = 0.2; const body = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(bp.x + (this.r() - 0.5) * 0.03, top + hh + 0.012, bp.z + (this.r() - 0.5) * 0.03).setLinearDamping(0.1).setAngularDamping(0.6).setCanSleep(false)); this.pw.world.createCollider(RAPIER.ColliderDesc.cuboid(r * 0.8, hh, r * 0.8).setMass(tuning.stoneMass).setFriction(0.95).setCollisionGroups(propGroups(l.id)), body); const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, hh * 2, 10), toon('#B8B2A4')); this.group.add(m); l.stones.push({ body, mesh: m, hh }); }
  botIntent(lane, dt, it) { const r = this.ringFor(lane); let gx = r.x, gz = r.z; if (lane.ph === 2 && lane.gust && lane.gust.warn > 0) gx = -lane.gust.dir * 0.4; if (lane.ph === 3 && lane.quad && this.t - lane.quad.t0 > lane.bot.skill.lag) { gx = lane.quad.x * 0.6; gz = lane.quad.z * 0.6; } const [wx, wz] = lane.bot.steer(gx, gz, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; it.breath = lane.ph === 0 ? ((this.t % 8) < 4) : false; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play' || lane.finished) return; const b = lane.bal; lane.pt += dt; this.setSway(lane);
    const r = this.ringFor(lane); const d = Math.hypot(b.cobX - r.x, b.cobZ - r.z); lane.zoneN++; if (d < r.r) lane.zoneT++;
    if (lane.ph === 0) { const bp = (lane.pt % 8) < 4; lane.sync += (((it.breath === bp) ? 1 : 0) - lane.sync) * dt / 4; if (lane.sync > 0.7) { b.sway *= 0.6; b.tremor *= 0.6; } }
    if (lane.ph === 1) { if (lane.stones.length < 4 && lane.pt > 1.5 + lane.stones.length * 4) this.dropStone(lane); }
    if (lane.ph === 2) { lane.gustNext -= dt; if (lane.gustNext <= 0 && !lane.gust && lane.gustN < 4) { lane.gust = { dir: this.r() < 0.5 ? -1 : 1, warn: 1, on: 0 }; lane.gustNext = 5; lane.gustN++; this.game.audio.sfx('wind'); this.gary.root.visible = true; } if (lane.gust) { const g = lane.gust; if (g.warn > 0) { g.warn -= dt; if (g.warn <= 0) g.on = 0.5; } else { g.on -= dt; b.pushX = g.dir * 3 * tuning.gustForce * 0.85 * Math.sin(Math.PI * Math.max(0, 1 - g.on / 0.5)); if (g.on <= 0) { lane.gust = null; b.pushX = 0; } } } }
    if (lane.ph === 3) { if (!lane.quad && lane.cueN < 6 && lane.pt >= lane.cueNext) { const q = [[-1, -1], [1, -1], [-1, 1], [1, 1]][Math.floor(this.r() * 4)]; lane.quad = { x: q[0], z: q[1], t0: lane.pt }; lane.cueN++; this.game.audio.sfx('tick'); } if (lane.quad) { if (b.cobX * lane.quad.x > 0.3 && b.cobZ * lane.quad.z > 0.3) { lane.quad = null; lane.cueNext = lane.pt + 1.5; lane.cueHit++; this.game.audio.sfx('catch'); } else if (lane.pt - lane.quad.t0 > 2.6) { lane.quad = null; lane.cueNext = lane.pt + 1; } } }
    if (lane.pt >= PH[lane.ph]) { let s = lane.zoneT / Math.max(1, lane.zoneN); if (lane.ph === 1) s = Math.min(1, 0.4 + lane.stones.filter((q) => { const t = q.body.translation(), p = b.body.translation(); return t.y > p.y + 0.8 && Math.hypot(t.x - p.x, t.z - p.z) < 0.5; }).length / 4 * 0.6); if (lane.ph === 3) s = Math.min(1, 0.3 + lane.cueHit / 6 * 0.7); if (lane.ph === 2) s = Math.min(1, 0.5 + 0.5 * (1 - 0));
      lane.phScores.push(Math.min(1, s)); if (lane.ph === 1) { this.clearStones(lane); this.stage = 'plate'; lane.removePlateAt = this.t + 0.05; } lane.ph++; this.game.audio.sfx('bell'); if (lane.ph >= PH.length) { lane.finished = true; lane.form = Math.max(60, 100 * lane.phScores.reduce((a, c) => a + c, 0) / lane.phScores.length); this.finish(); } else this.startPhase(lane); }
    if (lane.removePlateAt && this.t >= lane.removePlateAt) { lane.removePlateAt = 0; this.removePlate(lane); }
    lane.form = Math.max(0, 100 * (lane.phScores.reduce((a, c) => a + c, 0) + lane.zoneT / Math.max(1, lane.zoneN)) / (lane.phScores.length + 1)); lane.score = lane.form;
  }
  onFall(lane) { this.clearStones(lane); lane.stats.restarts++; this.word('CAUGHT!', lane.x, 2, 1); this.game.bark('trudy', 'gary'); }
  onRecover(lane) { this.removePlate(lane); lane.removePlateAt = 0; this.startPhase(lane); }
  step() { }
  frameExtra() { this.camA += 1 / 60 * 0.15; const l = this.lanes[0]; if (l && l.bal) { this.cam.pos = [Math.sin(this.camA) * 7, 2.6, Math.cos(this.camA) * 8]; this.mini.rotation.set(l.bal.leanZ * 0.5, 0, -l.bal.leanX * 0.5); if (!l.bal.fallen) this.game.island && (this.game.island.tx = this.game.island.tx); }
    for (const q of this.lanes) if (q.stones) for (const s of q.stones) { const t = s.body.translation(), r = s.body.rotation(); s.mesh.position.set(t.x, t.y, t.z); s.mesh.quaternion.set(r.x, r.y, r.z, r.w); }
    if (this.gary.root.visible) { const l2 = this.lanes[0]; this.gary.root.position.set(l2.x + Math.sin(this.time * 2) * 0.1, 2.35, 0); } }
  discInfo(l) { const r = this.ringFor(l); if (l.ph === 3 && l.quad) return { marks: [{ x: l.quad.x * 0.6, z: l.quad.z * 0.6, r: 0.25 }] }; if (l.ph === 2 && l.gust && l.gust.warn > 0) return { zone: { x: -l.gust.dir * 0.4, z: 0, r: 0.25, good: true } }; return { zone: { x: r.x, z: r.z, r: r.r, good: true } }; }
  banner() { const l = this.lanes[0]; return l && l.ph === 2 && l.gust && l.gust.warn > 0 ? 'STORM! Lean into the wind' : ''; }
  hudInfo(l) { return { score: l.form || 0, left: l.ph < PH.length ? Math.max(0, PH[l.ph] - l.pt) : 0, widgets: [{ id: 'p', html: ['A pose, with breath', 'Four stones', 'Storm gusts', 'Lean cues', 'The last hold'][Math.min(4, l.ph)] + ' · ' + (Math.min(5, l.ph + 1)) + '/5' }] }; }
  prompts() { return GrandHold.intro.prompts; }
}
