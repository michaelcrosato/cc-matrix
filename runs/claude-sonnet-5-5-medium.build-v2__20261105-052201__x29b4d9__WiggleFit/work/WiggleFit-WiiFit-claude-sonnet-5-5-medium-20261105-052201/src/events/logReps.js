import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, ball } from '../art/props.js';
import { createWalrus } from '../art/chars.js';
import { gauss } from '../core/rng.js';
import { tuning } from '../data/tuning.js';

const TIERS = [{ reps: 6, sw: [0.08, 0.22], tr: [0.04, 0.12], band: [0.16, 0.10], tight: 0 }, { reps: 9, sw: [0.12, 0.3], tr: [0.06, 0.16], band: [0.16, 0.10], tight: 0.02 }, { reps: 12, sw: [0.15, 0.38], tr: [0.08, 0.2], band: [0.16, 0.10], tight: 0.04 }];
export class LogReps extends GameEvent {
  static id = 'logReps'; static title = 'Log Reps'; static discipline = 'Strength'; static instructor = 'bolster'; static couch = true; static session = true; static music = 'strength'; static palette = 'noon';
  static intro = { line: 'A log across your shoulders. Squeeze both triggers to sink, following the ribbon. Keep the dot centred.', can: 'You can flail to save a slipping log, at a cost.', cant: "You can't lose: a dropped log only costs that rep.", prompts: [['both', 'Squat'], ['move', 'Lean'], ['flail', 'Flail']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.reps = o.session ? 8 : T.reps; this.cyc = 5 * (1 / tuning.repTempo); this.bonus = 2; this.total = this.reps + this.bonus; this.duration = o.duration || (this.total * this.cyc + 1); if (o.session) { this.cyc = (this.duration - 2) / this.total; }
    this.paletteName = 'noon'; this.music = 'strength'; this.makeGround(2.6, 4, '#D8C08A'); this.laneGap = 3.4; this.cam = { pos: [0, 2.4, 7.6], look: [0, 1.0, 0], fov: 38 };
    this.coach = createWalrus(); this.coach.root.position.set(-2.8, 0, -0.5); this.coach.root.rotation.y = 0.5; this.group.add(this.coach.root);
    this.addDolls({ margin: 0.8, ankleMax: 6 });
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.depth = 0; l.repScores = []; l.rep = -1; l.inBand = 0; l.inZone = 0; l.ticks = 0; l.offset = 0; l.lost = 0; l.fixedAnim = true; l.log = cyl(0.12, 1.7, '#9A6B3F', 0, 1.25, 0.1); l.log.rotation.z = Math.PI / 2; l.doll.root.add(l.log); l.rig.play('squat', 0); l.depthKb = 0; l.stats = { reps: 0 }; }
    this.camSnap = true;
  }
  ribbon(t) { const c = this.cyc, f = (t % c) / c; const d = 2 / 5, h = 0.5 / 5; if (f < d) return f / d; if (f < d + h) return 1; if (f < d + h + d) return 1 - (f - d - h) / d; return 0; }
  band(rep) { const k = Math.min(1, rep / Math.max(1, this.total - 1)); return Math.max(0.05, this.T.band[0] + (this.T.band[1] - this.T.band[0]) * k - this.T.tight); }
  fatigue(rep) { return 0.015 + (0.07 - 0.015) * Math.min(1, rep / Math.max(1, this.total - 1)); }
  botIntent(lane, dt, it) { const [wx, wz] = lane.bot.steer(0, 0, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; const tgt = this.ribbon(Math.max(0, this.t - lane.bot.skill.lag)); const noise = gauss(this.r) * 0.02 * (lane.bot.skill.speedErr + 0.3); it.L = it.R = Math.max(0, Math.min(1, tgt + noise + lane.bot.skill.noise * Math.sin(this.t * 2))); it.flailEdge = false; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal; const rep = Math.min(this.total - 1, Math.floor(this.t / this.cyc)); const k = Math.min(1, rep / Math.max(1, this.total - 1));
    let target;
    if (lane.kind === 'local' && lane.dev === 'kbm') { const both = it.L > 0.5 && it.R > 0.5; const rate = 0.5 * tuning.repTempo; lane.depthKb = Math.max(0, Math.min(1, lane.depthKb + (both ? rate : -rate) * dt)); target = lane.depthKb; } else target = (it.L + it.R) / 2;
    lane.depth += (target - lane.depth) * Math.min(1, dt * 14); const shake = Math.sin(this.t * 31) * this.fatigue(rep) * (target > 0.1 ? 1 : 0.4); const depth = Math.max(0, Math.min(1, lane.depth + shake));
    b.sway = (this.T.sw[0] + (this.T.sw[1] - this.T.sw[0]) * k); b.tremor = this.T.tr[0] + (this.T.tr[1] - this.T.tr[0]) * k;
    if (rep !== lane.rep) { if (lane.rep >= 0) this.scoreRep(lane); lane.rep = rep; lane.inBand = 0; lane.inZone = 0; lane.ticks = 0; if (rep === this.reps) this.game.bark('bolster', 'bonus'); else if (rep === this.reps - 1) this.game.bark('bolster', 'last'); else if (rep % 3 === 1) this.game.bark('bolster', 'rep'); }
    const rib = this.ribbon(this.t); lane.ticks++; if (Math.abs(depth - rib) < this.band(rep)) lane.inBand++; if (Math.hypot(b.cobX, b.cobZ) < 0.3) lane.inZone++;
    const deg = b.leanX * 180 / Math.PI; const over = Math.abs(deg) - 6; lane.offset += Math.sign(deg) * 0.05 * (over > 0 ? over : -2) * dt * (over > 0 ? 1 : 0.5) * (over > 0 ? 1 : (lane.offset ? -Math.sign(lane.offset) / Math.sign(deg || 1) : 0)); if (Math.abs(deg) < 6) lane.offset *= Math.max(0, 1 - dt * 0.6);
    b.pushX = 0.06 * 9.81 * lane.offset * 0.3; lane.curDepth = depth;
    if (Math.abs(lane.offset) > 0.5) { lane.lost++; lane.offset = 0; lane.inBand = 0; lane.repLost = true; this.word('OOF', lane.x, 1.7); this.game.audio.sfx('clack'); this.game.bark('bolster', 'fall'); }
    const cb = this.coach; cb.J.body.position.y = 0.95 + Math.abs(Math.sin(this.time * 4)) * 0.08;
  }
  scoreRep(lane) { const rep = lane.rep; const bandS = lane.inBand / Math.max(1, lane.ticks); const zoneS = lane.inZone / Math.max(1, lane.ticks); let s = bandS * (0.5 + 0.5 * zoneS); if (lane.repLost) s = 0; lane.repLost = false; if (rep >= this.reps) s *= 2; lane.repScores.push(Math.min(1, s)); lane.stats.reps = lane.repScores.length; const mean = lane.repScores.reduce((a, b) => a + b, 0) / this.total; lane.form = Math.min(100, 100 * mean * (this.total / (this.reps + this.bonus * 0.0 + 0)) * 0.97); lane.score = lane.form; }
  step() { if (this.t >= this.duration - 0.6) { for (const l of this.lanes) if (l.bal && l.rep >= 0 && l.repScores.length < this.total) { this.scoreRep(l); l.rep = 99; } this.finish(); } }
  frameExtra() { for (const l of this.lanes) { if (!l.rig || l.kind === 'ghost' || !l.bal) continue; l.rig.scrub('squat', Math.max(0, Math.min(1, l.curDepth ?? 0))); l.log.position.x = l.offset; } this.coach.J.flipperL.rotation.z = Math.sin(this.time * 5) * 0.4; this.coach.J.flipperR.rotation.z = -Math.sin(this.time * 5) * 0.4; }
  discInfo() { return { zone: { x: 0, z: 0, r: 0.3, good: true } }; }
  banner() { const l = this.lanes[0]; return this.phase === 'play' ? (this.ribbon(this.t) > 0.5 ? 'HOLD' : '') : ''; }
  hudInfo(lane) { const rib = this.ribbon(this.t); const d = lane.curDepth ?? 0; return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'rep', html: `Rep <b>${Math.min(this.total, Math.max(1, lane.rep + 1))}</b> / ${this.total}` }, { id: 'rib', html: `<span class="meter" style="width:calc(var(--u)*60);height:calc(var(--u)*200);display:inline-block;position:relative"><i style="position:absolute;left:0;right:0;top:${Math.round(rib * 80)}%;height:${Math.round(this.band(Math.max(0, lane.rep)) * 160)}%;background:#22C55E88"></i><i style="position:absolute;left:0;right:0;top:${Math.round(d * 90)}%;height:6px;background:#E8443A"></i></span>` }] }; }
  prompts() { return LogReps.intro.prompts; }
}
