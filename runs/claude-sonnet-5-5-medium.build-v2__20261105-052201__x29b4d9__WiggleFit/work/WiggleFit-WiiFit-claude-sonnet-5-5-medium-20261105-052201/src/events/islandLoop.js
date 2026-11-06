import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, disc, ball, cone, toyTree } from '../art/props.js';
import { createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { gauss } from '../core/rng.js';

const R = 19, LAP = 2 * Math.PI * R;
export class IslandLoop extends GameEvent {
  static id = 'islandLoop'; static title = 'Island Loop'; static discipline = 'Cardio'; static instructor = 'bolster'; static couch = false; static session = false; static music = 'cardio'; static palette = 'dawn';
  static intro = { line: 'Jog two laps of the ring road. Alternate feet to run, about two and a half steps a second. Keep inside the pace band behind Retired Kevin.', can: 'You can steer with the stick and pick up shells on the path.', cant: "You can't sprint your way to a good score: too fast is as bad as too slow.", prompts: [['feetL', 'Left'], ['feetR', 'Right'], ['move', 'Steer']] };
  constructor(game, o) {
    super(game, o); this.noBal = true; this.duration = o.duration || 110; this.laps = 2; this.paletteName = 'dawn'; this.music = 'cardio'; this.laneGap = 0;
    this.group.add(disc(24, 0.4, '#E8D49A', 0, -0.2, 0), disc(15, 0.45, '#7CCB6A', 0, -0.19, 0)); const road = new THREE.Mesh(new THREE.RingGeometry(R - 2, R + 2, 64).rotateX(-Math.PI / 2), this.game.mat('#C99A62')); road.position.y = 0.02; this.group.add(road);
    for (let i = 0; i < 10; i++) { const a = i * 0.65; this.group.add(toyTree(Math.cos(a) * 9, Math.sin(a) * 9, 0.9)); }
    this.lh = new THREE.Group(); for (let i = 0; i < 5; i++) this.lh.add(cyl(1.8 - i * 0.15, 1.4, i % 2 ? '#F6EAD0' : '#D94A3A', 0, 0.7 + i * 1.4, 0, 16)); this.group.add(this.lh);
    this.kevin = createDoll({ paint: 6, hat: 1, scale: 1.05 }); this.krig = new Rig(this.kevin); this.krig.play('jog', 0); this.group.add(this.kevin.root);
    this.addDolls({}); this.noBal = true; this.shells = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 4 + 0.5; const m = ball(0.2, '#FFB3C7'); m.position.set(Math.cos(a) * (R + (i % 3 - 1) * 1.2), 0.25, Math.sin(a) * (R + (i % 3 - 1) * 1.2)); this.group.add(m); this.shells.push({ m, a, got: false }); }
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.s = 0; l.off = 0; l.v = 0; l.stepT = 0; l.last = null; l.cad = 0; l.steps = []; l.inBand = 0; l.n = 0; l.got = 0; l.fixedAnim = true; l.done = false; l.stats = { shells: 0 }; l.rig.play('jog', 0); }
    this.camSnap = true; this.ks = 12;
  }
  pos(s, off) { const a = s / R; return [Math.cos(a) * (R + off), Math.sin(a) * (R + off), -Math.sin(a), Math.cos(a)]; }
  botIntent(lane, dt, it) { const sk = lane.bot.skill; it.footL = it.footR = false; lane.bt = (lane.bt || 0) + dt; const cad = 1 / 2.5 * (1 + gauss(this.r) * 0.02 * (sk.speedErr + 0.3)); if (lane.bt >= cad) { lane.bt = 0; lane.nf = lane.nf === 'L' ? 'R' : 'L'; if (lane.nf === 'L') it.footL = true; else it.footR = true; } it.sx = -lane.off * 0.5; it.sz = 0; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play' || lane.done) return; const press = it.footL ? 'L' : it.footR ? 'R' : null; const now = this.t;
    if (press && press !== lane.last) { lane.last = press; lane.v = 1.4 * 3.2; lane.steps.push(now); lane.stepT = 0.4; } else if (press) { lane.stepT = 0.1; }
    lane.steps = lane.steps.filter((x) => now - x < 2); const cadence = lane.steps.length / 2; lane.cad = cadence; lane.stepT -= dt; if (lane.stepT <= 0) lane.v *= Math.max(0, 1 - 4 * dt);
    const speed = Math.min(5.2, lane.v * 0.8 * (1 + 0)); lane.speed = cadence * 1.4; lane.s += lane.speed * dt; lane.off = Math.max(-2, Math.min(2, lane.off - (it.sx ?? 0) * 2.2 * dt * -1)); if (lane.kind === 'local') lane.off = Math.max(-2, Math.min(2, lane.off + (it.sx || 0) * 2.2 * dt)); else lane.off += (it.sx || 0) * dt * 2;
    lane.n++; const target = 2.5; if (Math.abs(cadence - target) <= target * 0.15 + 0.08) lane.inBand++;
    for (const sh of this.shells) { if (sh.got) continue; const a = (lane.s / R) % (Math.PI * 4); const da = Math.abs(((sh.a - lane.s / R) + Math.PI * 4 * 10) % (Math.PI * 2)); if (da < 0.08 && Math.abs(lane.off - ((sh.m.position.length() - R))) < 1.2) { sh.got = true; sh.m.visible = false; lane.got++; this.game.audio.sfx('pop'); } }
    const lapsDone = lane.s / LAP; lane.form = Math.min(100, 100 * (0.8 * lane.inBand / Math.max(1, lane.n) + 0.2 * lane.got / 8) * Math.min(1, lapsDone / 0.15 + 0.0) ); lane.stats.shells = lane.got; lane.score = lane.form;
    if (lapsDone >= this.laps) { lane.done = true; lane.form = Math.min(100, 100 * (0.8 * lane.inBand / Math.max(1, lane.n) + 0.2 * lane.got / 8)); }
  }
  step() { this.ks += 3.5 * (1 / 120) * (0.9 + 0.2 * Math.sin(this.t)); if (this.lanes.every((l) => l.kind === 'ghost' || l.done) || this.t >= this.duration) this.finish(); }
  frameExtra() {
    for (const l of this.lanes) { if (!l.doll || l.kind === 'ghost') continue; const [x, z, tx, tz] = this.pos(l.s, l.off); l.doll.root.position.set(x, 0, z); l.doll.root.rotation.set(0, Math.atan2(-Math.sin(l.s / R) * -1, Math.cos(l.s / R) * -1) + 0, 0); l.doll.root.rotation.y = Math.atan2(tx, tz); l.rig.play(l.cad > 0.5 ? 'jog' : 'idle', 0.2); l.rig.update(1 / 60 * Math.max(0.5, l.cad / 2.5)); }
    const ks = this.ks + this.t * 0 ; const [kx, kz, ktx, ktz] = this.pos(this.lanes[0] ? this.lanes[0].s + 6 : ks, 0.5); this.kevin.root.position.set(kx, 0, kz); this.kevin.root.rotation.y = Math.atan2(ktx, ktz); this.krig.update(1 / 60);
    const l0 = this.lanes[0]; if (l0 && l0.doll) { const [x, z, tx, tz] = this.pos(l0.s, 0); this.cam.pos = [x - tx * 7 + (x / R) * 1.5, 3.4, z - tz * 7 + (z / R) * 1.5]; this.cam.look = [x + tx * 4, 1.2, z + tz * 4]; }
  }
  discInfo() { return {}; } banner() { const l = this.lanes[0]; if (!l || this.phase !== 'play') return ''; return l.cad > 2.5 * 1.15 + 0.08 ? 'Slow down' : l.cad < 2.5 * 0.85 - 0.08 ? 'Speed up' : 'Good pace'; }
  hudInfo(lane) { return { score: lane.form || 0, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'c', html: `Pace <b>${(lane.cad || 0).toFixed(1)}</b> / 2.5` }, { id: 'l', html: `Lap ${Math.min(this.laps, Math.floor((lane.s || 0) / LAP) + 1)} / ${this.laps} · shells ${lane.got || 0}` }] }; }
  prompts() { return IslandLoop.intro.prompts; }
}
