import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { POSES } from '../data/poses.js';
import { box, cyl, disc, ball } from '../art/props.js';
import { createHeron } from '../art/chars.js';
import { toon } from '../render/renderer.js';

const T = [
  { n: 3, hold: 8, r0: 0.30, r1: 0.16, sw: [0.08, 0.22], tr: [0.08, 0.20] },
  { n: 4, hold: 10, r0: 0.30, r1: 0.13, sw: [0.12, 0.30], tr: [0.10, 0.30] },
  { n: 5, hold: 12, r0: 0.30, r1: 0.10, sw: [0.15, 0.38], tr: [0.15, 0.40] },
];
export class Poses extends GameEvent {
  static id = 'poses'; static title = 'Poses'; static discipline = 'Stillness'; static instructor = 'stillwater'; static couch = true; static session = true; static music = 'stillness'; static palette = 'noon';
  static intro = { line: 'Follow the ring to the pose, then hold still while it shrinks. Breathe with the breath ring.', can: 'You can flail, if you must. The heron will notice.', cant: "You can't lose here: a fall only costs the pose you were holding.", prompts: [['move', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Flail']] };
  constructor(game, o) {
    super(game, o); const t = this.t0 = T[this.tier]; this.pose = 0; this.pT = 0; this.glide = 3; this.perPose = this.glide + t.hold; this.duration = o.duration || this.perPose * t.n; this.paletteName = 'noon'; this.music = 'stillness';
    if (o.session) { this.hold = (this.duration / t.n) - this.glide; } else this.hold = t.hold;
    this.perPose = this.glide + this.hold; this.duration = this.perPose * t.n;
    this.makeGround(2.4, 4, '#B07A45'); this.group.add(disc(3.4, 0.4, '#B88852', 0, -0.2, 0)); for (let i = 0; i < 6; i++) this.group.add(cyl(0.15, 3, '#7A4F2A', Math.cos(i) * 3, -1.7, Math.sin(i) * 3, 8));
    this.laneGap = 3.4; this.cam = { pos: [2.8, 2.1, 7.4], look: [0.8, 1.2, 0], fov: 38 };
    this.heron = createHeron(); this.heron.root.position.set(-2.2 + this.laneX(0) * 0, 0, -0.4); this.heron.root.rotation.y = 0.5; this.group.add(this.heron.root);
    this.addDolls({ maxLean: 14, margin: 0.45 }); this.camSnap = true;
    for (const l of this.lanes) { l.earned = 0; l.max = 0; l.sync = 0.5; l.fixedAnim = true; l.breathCyc = 0; l.syncBonus = false; l.penalty = 0; l.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 32), toon('#22A04B')); l.ring.rotation.x = Math.PI / 2; l.ring.visible = false; this.group.add(l.ring); }
  }
  ringAt(t) { const p = Math.min(this.t0.n - 1, Math.floor(t / this.perPose)); const lt = t - p * this.perPose; const pose = POSES[p % POSES.length]; const k = Math.min(1, lt / this.glide); const e = k * k * (3 - 2 * k); const hp = Math.max(0, (lt - this.glide) / this.hold); return { p, x: pose.x * e, z: pose.z * e, r: this.t0.r0 + (this.t0.r1 - this.t0.r0) * hp * (tuningRing()), hold: lt >= this.glide, pose }; }
  breathPhase(t) { const c = t % 8; return { grow: c < 4, f: c < 4 ? c / 4 : 1 - (c - 4) / 4 }; }
  onStart() { for (const l of this.lanes) if (l.rig) l.rig.play('pose0', 0.4, { force: true }); this.lastP = -1; this.heron.J.neck1; }
  botIntent(lane, dt, it) { const r = this.ringAt(this.t); const [wx, wz] = lane.bot.steer(r.x, r.z, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; it.breath = this.breathPhase(this.t - lane.bot.skill.lag * 3).grow; it.flailEdge = false; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const r = this.ringAt(this.t); const b = lane.bal; const bp = this.breathPhase(this.t); const held = lane.kind === 'bot' ? it.breath : it.breath;
    lane.sync += ((held === bp.grow ? 1 : 0) - lane.sync) * (dt / 4); lane.syncBonus = lane.sync > 0.7;
    const k = Math.min(1, this.t / this.duration); const p = r.p; const prog = (this.t - p * this.perPose) / this.perPose; const sw = this.t0.sw[0] + (this.t0.sw[1] - this.t0.sw[0]) * (p / Math.max(1, this.t0.n - 1)); const tr = this.t0.tr[0] + (this.t0.tr[1] - this.t0.tr[0]) * (p / Math.max(1, this.t0.n - 1));
    b.sway = sw * (lane.syncBonus ? 0.6 : 1); b.tremor = tr * (lane.syncBonus ? 0.6 : 1);
    const d = Math.hypot(b.cobX - r.x, b.cobZ - r.z); const gain = 0.30 / r.r; lane.max += 0.3 / this.t0.r1 * 0 + gain * (lane.syncBonus ? 1.25 : 1) * 0 + 0;
    lane.max += (0.30 / r.r) * 1; if (d < r.r) lane.earned += (0.30 / r.r) * (lane.syncBonus ? 1.25 : 1);
    lane.form = Math.max(0, Math.min(100, 100 * lane.earned / Math.max(1e-6, lane.max)) - lane.penalty); lane.score = lane.form;
    if (it.flailEdge) lane.penalty += 1.5;
    if (r.p !== this.lastP) { this.lastP = r.p; lane.rig.play('pose' + (r.p % 8), 0.4, { force: true }); this.game.bark('stillwater', 'pose', { pose: r.pose.name }); this.heronPose = r.p; }
  }
  step() { if (this.t >= this.duration) this.finish(); }
  frameExtra() { const n = this.heron.J; n.neck1 && (n.neck1.rotation.x = Math.sin(this.time * 0.6) * 0.1); n.head.rotation.z = Math.sin(this.time * 0.4) * 0.15;
    for (const l of this.lanes) { if (!l.ring) continue; const r = this.ringAt(Math.min(this.t, this.duration - 0.01)); const b = l.bal; l.ring.visible = this.phase === 'play' && !!b; if (b) { l.ring.position.set(l.x + r.x * 0.5, 0.05, r.z * 0.5); l.ring.scale.setScalar(r.r * 1.2); } } }
  discInfo(lane) { const r = this.ringAt(Math.min(this.t, this.duration - 0.01)); return { zone: { x: r.x, z: r.z, r: r.r, good: true } }; }
  hudInfo(lane) { const bp = this.breathPhase(this.t); const sz = 40 + 90 * bp.f; return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'pose', html: POSES[this.ringAt(Math.min(this.t, this.duration - 0.01)).p % POSES.length].name }, { id: 'br', html: `<span style="display:inline-block;width:${sz}px;height:${sz}px;border:calc(var(--u)*6) solid #fff;border-radius:50%;vertical-align:middle;box-shadow:0 0 0 calc(var(--u)*3) #1A1420"></span> ${bp.grow ? 'Breathe in' : 'Breathe out'}${lane.syncBonus ? ' ✔' : ''}` }] }; }
  prompts() { return Poses.intro.prompts; }
}
const tuningRing = () => 1;
