import { GameEvent } from './base.js';
import { box, cyl, disc } from '../art/props.js';
import { createTrudy } from '../art/chars.js';
import { gauss } from '../core/rng.js';
import { CHECK_NAMES } from '../data/programme.js';

const CFG = {
  standStill: { dur: 10, sway: 0.1, tremor: 0.06, line: 'Stand still. Keep the dot in the middle.' },
  leanMatch: { dur: 18, sway: 0.04, tremor: 0.02, line: 'Lean to the marker' },
  stepTime: { dur: 16, sway: 0.02, tremor: 0.02, line: 'Alternate feet with the beat' },
  quickLean: { dur: 15, sway: 0.03, tremor: 0.02, line: 'Lean to the lit quarter, fast' },
  oneFoot: { dur: 12, sway: 0.1, tremor: 0.06, line: 'Hold right foot down, left foot up. Dot in the middle.' },
};
const TARGETS = [[-0.7, 0, 'Lean 70% left'], [0.7, 0, 'Lean 70% right'], [0, -0.7, 'Lean 70% back'], [0, 0.7, 'Lean 70% forward']];
export class CheckInTest extends GameEvent {
  static id = 'checkin'; static title = 'Check-In'; static discipline = 'Check-In'; static instructor = 'trudy'; static music = 'island'; static couch = false; static session = false;
  static intro = { line: 'Three short tests.', can: '', cant: '', prompts: [['move', 'Lean']] };
  constructor(game, o) {
    super(game, o); this.kind = o.kind || 'standStill'; const c = CFG[this.kind]; this.c = c; this.duration = c.dur; this.paletteName = 'dawn';
    this.makeGround(2.2, 4, '#E8D49A'); this.group.add(disc(2.6, 0.1, '#F5E6C0', 0, 0.0, 0), disc(2.3, 0.1, '#E8443A', 0, 0.025, 0)); this.trudy = createTrudy(); this.trudy.root.position.set(2.8, 0, -0.6); this.trudy.root.rotation.y = -0.5; this.group.add(this.trudy.root);
    this.cam = { pos: [0, 2.3, 7.4], look: [0, 1.2, 0], fov: 38 }; this.addDolls({}); const l = this.lanes[0]; l.bal.sway = c.sway; l.bal.tremor = c.tremor; this.camSnap = true;
    this.samples = 0; this.sumDist = 0; this.errs = []; this.beat = 0.625; this.lastFoot = null; this.react = []; this.quad = null; this.nextPrompt = 1; this.promptN = 0; this.score01 = 0; this.tIdx = 0; this.tgtErr = 0; this.tgtN = 0; this.hit = null; this.penalty = 0;
    this.bot0 = { pressT: [] }; this.tick = 0;
  }
  start() { }
  currentTarget() { return TARGETS[this.tIdx % 3]; }
  botIntent(lane, dt, it) {
    const b = lane.bot; let gx = 0, gz = 0; it.footL = it.footR = false; it.R = 0; it.L = 0;
    if (this.kind === 'leanMatch') { const tg = this.currentTarget(); gx = tg[0]; gz = tg[1]; } else if (this.kind === 'quickLean' && this.quad) { if (this.t - this.quad.t > b.skill.lag) { gx = this.quad.x * 0.8; gz = this.quad.z * 0.8; } }
    else if (this.kind === 'oneFoot') { it.R = 1; }
    if (this.kind === 'stepTime' && this.phase === 'play') { const n = Math.round((this.t - 0.1) / this.beat); const due = n * this.beat + 0.1 + b.gaussT(); if (n >= 0 && n !== lane.botN && this.t >= due) { lane.botN = n; if (n % 2) it.footR = true; else it.footL = true; } }
    const [wx, wz] = b.steer(gx, gz, lane.bal.cobX, lane.bal.cobZ, dt, this.kind === 'leanMatch'); it.wx = wx; it.wz = wz;
  }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal; this.tick++;
    if (this.kind === 'oneFoot') { const ok = it.R > 0.5 && it.L < 0.4; b.halfMargin = ok; lane.penalty = ok ? 0 : 0.25; }
    if (this.kind === 'standStill' || this.kind === 'oneFoot') { this.sumDist += Math.hypot(b.cobX, b.cobZ) + (lane.penalty || 0); this.samples++; }
    if (this.kind === 'leanMatch') { const seg = Math.floor(this.t / 6); this.tIdx = Math.min(2, seg); const sT = this.t - seg * 6; if (sT > 1.5 && seg < 3) { const tg = TARGETS[seg]; this.tgtErr += Math.hypot(b.cobX - tg[0], b.cobZ - tg[1]); this.tgtN++; } }
    if (this.kind === 'stepTime') { const press = it.footL ? 'L' : it.footR ? 'R' : null; if (press) { const n = Math.round((this.t - 0.1) / this.beat); const err = Math.abs(this.t - (n * this.beat + 0.1)) * 1000; const same = this.lastFoot === press; this.errs.push(Math.min(200, same ? err + 80 : err)); this.lastFoot = press; this.pulse = 0.2; } }
    if (this.kind === 'quickLean') {
      if (!this.quad && this.promptN < 6 && this.t >= this.nextPrompt) { const q = [[-1, -1], [1, -1], [-1, 1], [1, 1]][Math.floor(this.r() * 4)]; this.quad = { x: q[0], z: q[1], t: this.t }; this.promptN++; this.game.audio.sfx('tick'); }
      if (this.quad) { const d = (b.cobX * this.quad.x + b.cobZ * this.quad.z); if (b.cobX * this.quad.x > 0.3 && b.cobZ * this.quad.z > 0.3 || d > 0.7) { this.react.push(this.t - this.quad.t); this.quad = null; this.nextPrompt = this.t + 1.2; this.game.audio.sfx('catch'); } else if (this.t - this.quad.t > 2.4) { this.react.push(2.4); this.quad = null; this.nextPrompt = this.t + 1.0; } }
    }
  }
  step() { if (this.t >= this.duration) this.finish(); }
  onFinish() {
    let s = 0;
    if (this.kind === 'standStill' || this.kind === 'oneFoot') s = 1 - (this.sumDist / Math.max(1, this.samples)) / 0.25;
    else if (this.kind === 'leanMatch') s = 1 - (this.tgtErr / Math.max(1, this.tgtN)) / 0.4;
    else if (this.kind === 'stepTime') s = this.errs.length ? 1 - (this.errs.reduce((a, b) => a + b, 0) / this.errs.length) / 120 : 0;
    else if (this.kind === 'quickLean') { while (this.react.length < 6) this.react.push(2.4); s = 1 - ((this.react.reduce((a, b) => a + b, 0) / this.react.length) - 0.35) / 0.9; }
    this.score01 = Math.max(0, Math.min(1, s)); this.lanes[0].form = this.score01 * 100;
  }
  banner() { const tg = this.kind === 'leanMatch' ? this.currentTarget()[2] : null; return tg ? tg : this.kind === 'quickLean' ? (this.quad ? 'NOW!' : 'Wait for it...') : this.c.line; }
  discInfo() { if (this.kind === 'standStill' || this.kind === 'oneFoot') return { zone: { x: 0, z: 0, r: 0.25, good: true } }; if (this.kind === 'leanMatch') { const t = this.currentTarget(); return { marks: [{ x: t[0], z: t[1], r: 0.14 }] }; } if (this.kind === 'quickLean' && this.quad) return { marks: [{ x: this.quad.x * 0.6, z: this.quad.z * 0.6, r: 0.25 }] }; return {}; }
  hudInfo(lane) { const pct = this.kind === 'leanMatch' ? `<span class="meter"><i style="width:${Math.min(100, Math.round(Math.hypot(lane.bal.cobX, lane.bal.cobZ) * 100))}%"></i></span> ${Math.round(Math.hypot(lane.bal.cobX, lane.bal.cobZ) * 100)}%` : ''; return { score: this.score01 * 100, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'name', html: CHECK_NAMES[this.kind] }, ...(pct ? [{ id: 'pct', html: pct }] : [])] }; }
  prompts() { return this.kind === 'stepTime' ? [['feetL', 'Left'], ['feetR', 'Right']] : this.kind === 'oneFoot' ? [['move', 'Lean'], ['feetR', 'Hold right foot']] : [['move', 'Lean']]; }
  frameExtra() { const tb = this.trudy.body; tb.position.y = 0.62 + Math.abs(Math.sin(this.time * (this.phase === 'play' ? 3 : 1.4))) * 0.05; this.trudy.bubble.position.x = Math.sin(this.time * 0.8) * 0.15; }
}
export const CHECK_KINDS = Object.keys(CFG);
