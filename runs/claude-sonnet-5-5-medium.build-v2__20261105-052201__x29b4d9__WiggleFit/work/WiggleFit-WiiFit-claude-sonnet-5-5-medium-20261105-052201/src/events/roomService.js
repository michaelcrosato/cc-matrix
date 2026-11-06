import * as THREE from 'three/webgpu';
import { RAPIER, propGroups, dollGroups } from '../physics/world.js';
import { GameEvent } from './base.js';
import { box, cyl, ball } from '../art/props.js';
import { createGull } from '../art/chars.js';
import { tuning } from '../data/tuning.js';
import { toon } from '../render/renderer.js';

const TIERS = [{ len: 30, gust: 1.0, every: 7 }, { len: 45, gust: 1.5, every: 6 }, { len: 60, gust: 1.8, every: 5 }];
export class RoomService extends GameEvent {
  static id = 'roomService'; static title = 'Room Service'; static discipline = 'Balance Play'; static instructor = 'trudy'; static couch = true; static session = false; static music = 'balance'; static palette = 'golden';
  static intro = { line: 'Carry five glasses along the boardwalk. Alternate feet to step. Small early leans keep the glasses; sudden big ones throw them.', can: 'You can lean into a gust when the green zone appears on the disc.', cant: "You can't hurry: the same foot twice is a stumble.", prompts: [['feetL', 'Left foot'], ['feetR', 'Right foot'], ['move', 'Steer']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.duration = o.duration || 100; this.paletteName = 'golden'; this.music = 'balance'; this.laneGap = 3.2; this.noBal = false;
    this.pw.ground(2 + this.lanes.length * 2, 0.5, 60, 0, -0.5, -T.len / 2); for (let i = 0; i < this.lanes.length; i++) { const x = this.laneX(i); this.group.add(box(1.8, 0.2, T.len + 8, '#C99A62', x, -0.1, -T.len / 2 + 2)); for (let k = 0; k < 12; k++) this.group.add(box(0.1, 0.5, 0.1, '#7A4F2A', x - 0.95, 0.25, 1 - k * T.len / 11), box(0.1, 0.5, 0.1, '#7A4F2A', x + 0.95, 0.25, 1 - k * T.len / 11)); this.group.add(box(1.4, 0.8, 1.4, '#F4A261', x, 0.4, -T.len - 2), box(1.6, 0.1, 1.6, '#FFF4DC', x, 0.85, -T.len - 2)); }
    this.cam = { pos: [0, 3.4, 8], look: [0, 1.2, -4], fov: 38 }; this.gull = createGull(); this.gull.root.visible = false; this.group.add(this.gull.root);
    this.addDolls({ margin: 0.8, ankleMax: 6, reflex: 5 });
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.stepT = 0; l.lastFoot = null; l.vel = 0; l.dist = 0; l.glasses = []; l.rock = 0; l.buoy = 0; l.fixedAnim = true; l.lostN = 0; l.respawn = 0; l.delivered = 0; l.done = false; l.nextGust = 4; l.gust = null; l.gx = 0; l.stats = { glasses: 5 }; l.rig.play('carry', 0);
      const gq = dollGroups(l.id); l.bal.addCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.02, 0.3).setTranslation(0, 0.5, 0.3).setMass(0.04).setFriction(1.6).setCollisionGroups(gq)); l.tray = box(0.6, 0.04, 0.6, '#D9AE5A', 0, 1.25, 0.3); l.doll.root.add(l.tray); this.fillTray(l); }
    this.camSnap = true;
  }
  fillTray(l) { for (const g of l.glasses) { this.pw.removeBody(g.body); g.mesh.removeFromParent(); } l.glasses = []; const bp = l.bal.body.translation(); for (let i = 0; i < 5; i++) { const ox = i < 3 ? (i - 1) * 0.12 : (i - 3.5) * 0.12, oz = (i > 2 ? 0.12 : -0.1); const body = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(bp.x + ox, 1.3, bp.z + 0.3 + oz).setLinearDamping(0.1).setAngularDamping(0.5).setCanSleep(false)); this.pw.world.createCollider(RAPIER.ColliderDesc.cylinder(0.06, 0.05).setMass(0.012).setFriction(1.6).setRestitution(0).setCollisionGroups(propGroups(l.id)), body); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 10), new THREE.MeshBasicNodeMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.55 })); this.group.add(m); l.glasses.push({ body, mesh: m }); } l.stats.glasses = 5; }
  botIntent(lane, dt, it) {
    const sk = lane.bot.skill; it.footL = it.footR = false; lane.bt = (lane.bt || 0) + dt; const cadence = 0.42 * (1 + sk.speedErr * 0.05); if (lane.bt >= cadence) { lane.bt -= cadence; lane.nextF = lane.nextF === 'L' ? 'R' : 'L'; if (lane.nextF === 'L') it.footL = true; else it.footR = true; }
    let brace = 0; if (lane.gust && lane.gust.warn > 0) brace = 0.2 * lane.gust.f * -lane.gust.dir; const [wx, wz] = lane.bot.steer(Math.max(-0.2, Math.min(0.2, (lane.x - lane.bal.fx) * 0.3)) + brace, 0, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = Math.max(-0.45, Math.min(0.45, wx * 0.8)); it.wz = 0; it.flailEdge = false;
  }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play' || lane.done) return; const b = lane.bal; const T = this.T; lane.respawn = Math.max(0, lane.respawn - dt);
    const press = it.footL ? 'L' : it.footR ? 'R' : null;
    if (press) { if (lane.lastFoot === press) { lane.stumble = 0.5; b.kickX = (this.r() < 0.5 ? -1 : 1) * 0.8; b.kickT = 0.2; } else { lane.stepT = 0.42 * 1.6; lane.cad = 0.42; lane.rock = 0.18; b.fx += b.leanX * 0.25 * 0.55; this.game.audio.sfx('tick'); } lane.lastFoot = press; }
    lane.stepT = Math.max(0, lane.stepT - dt); const moving = lane.stepT > 0; const vTarget = moving ? 0.55 / 0.42 : 0; const dz = lane.vel * dt; b.moveFoot((b.fx - b.fx), -vTarget, dt, 0.5); lane.vel = vTarget ? -b.footV.z : -b.footV.z; lane.dist = -b.fz;
    if (lane.rock > 0) { lane.rock -= dt; b.pushX = 0.2 * Math.sin(this.t * 17); } else b.pushX = 0; b.sway = 0.03;
    // gusts
    lane.nextGust -= dt; if (lane.nextGust <= 0 && !lane.gust) { lane.gust = { dir: this.r() < 0.5 ? -1 : 1, f: T.gust * tuning.gustForce, warn: 1, on: 0 }; lane.nextGust = T.every + this.r() * 2; this.game.audio.sfx('wind'); this.word('WHOOSH', lane.x + lane.gust.dir * -1.5, 1.8); }
    if (lane.gust) { const g = lane.gust; if (g.warn > 0) { g.warn -= dt; if (g.warn <= 0) g.on = 0.5; } else { g.on -= dt; b.pushX += g.dir * g.f * 1.25 * Math.sin(Math.PI * Math.max(0, 1 - g.on / 0.5)); if (g.on <= 0) lane.gust = null; } }
    // edge
    const off = b.fx - lane.x; if (Math.abs(off) > 0.8 && !lane.fell) { lane.fell = true; this.word('SPLOSH!', lane.x + off, 0.3); this.game.audio.sfx('splash'); lane.rig.play('flop', 0.05); lane.lostN++; this.loseGlass(lane); lane.respawnAt = this.t + 1.2; }
    if (lane.fell && this.t >= lane.respawnAt) { lane.fell = false; b.fx = lane.x; const bz = -Math.floor(lane.dist / 10) * 10; b.fz = bz; b.footBase.y = 0; b.footV.x = b.footV.z = 0; b.foot.setNextKinematicTranslation({ x: b.fx, y: 0, z: b.fz }); lane.rig.play('carry', 0.1); }
    for (let i = lane.glasses.length - 1; i >= 0; i--) { const g = lane.glasses[i]; if (g.body.translation().y < 0.5) { this.pw.removeBody(g.body); g.mesh.removeFromParent(); lane.glasses.splice(i, 1); this.game.audio.sfx('clack'); this.word('CLINK', lane.x, 1.5); } } lane.stats.glasses = lane.glasses.length;
    if (lane.dist >= T.len) { lane.done = true; lane.delivered = lane.glasses.length; const tb = Math.max(0, 1 - this.t / (T.len / 1.31 * 2.2)); lane.form = Math.min(100, 100 * (0.8 * lane.delivered / 5 + 0.2 * tb)); lane.score = lane.delivered * 100; this.game.audio.sfx('bell'); this.word('DELIVERED', lane.x, 2); }
    else { lane.form = 100 * (0.8 * lane.glasses.length / 5) * (lane.dist / T.len) * 0.9; lane.score = lane.glasses.length * 100; }
  }
  loseGlass(lane) { const g = lane.glasses.pop(); if (g) { this.pw.removeBody(g.body); g.mesh.removeFromParent(); } }
  step() { if (this.lanes.every((l) => l.kind === 'ghost' || l.done)) this.finish(); else if (this.t >= this.duration) { for (const l of this.lanes) if (l.bal && !l.done) { l.delivered = l.glasses.length; l.form = Math.max(0, l.form * 0.7); } this.finish(); } }
  onFall(lane) { this.loseGlass(lane); }
  onRecover() { }
  updateCamera(dt) { const l = this.lanes[0]; if (l && l.bal) { const z = l.bal.fz; this.cam.pos = [l.x * 0.5, 3.4, z + 7.5]; this.cam.look = [l.x, 1.2, z - 4]; if (this.lanes.length > 1) { const m = Math.min(...this.lanes.filter((q) => q.bal).map((q) => q.bal.fz)); this.cam.pos = [0, 4.6, m + 9]; this.cam.look = [0, 1.2, m - 3]; } } super.updateCamera(dt); }
  frameExtra() { for (const l of this.lanes) { if (!l.glasses) continue; for (const g of l.glasses) { const t = g.body.translation(), q = g.body.rotation(); g.mesh.position.set(t.x, t.y, t.z); g.mesh.quaternion.set(q.x, q.y, q.z, q.w); } if (l.doll && l.bal) { const d = l.bal.fz; /* gull */ } } }
  discInfo(lane) { const g = lane.gust; if (g && g.warn > 0) return { zone: { x: -g.dir * Math.min(0.8, 0.2 * g.f * 2), z: 0, r: 0.25, good: true } }; return {}; }
  banner() { const l = this.lanes[0]; return l && l.gust && l.gust.warn > 0 ? 'GUST! Lean into it' : ''; }
  hudInfo(lane) { return { score: lane.score || 0, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'g', html: `Glasses <b>${lane.glasses ? lane.glasses.length : 0}</b> / 5` }, { id: 'd', html: `<span class="meter"><i style="width:${Math.round(Math.min(1, (lane.dist || 0) / this.T.len) * 100)}%;background:#22C55E"></i></span> ${Math.round(lane.dist || 0)} / ${this.T.len} m` }] }; }
  prompts() { return RoomService.intro.prompts; }
}
