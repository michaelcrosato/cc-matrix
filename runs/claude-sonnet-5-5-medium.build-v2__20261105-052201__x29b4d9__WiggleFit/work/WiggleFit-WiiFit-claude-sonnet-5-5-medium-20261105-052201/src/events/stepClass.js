import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, disc, ball } from '../art/props.js';
import { createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { createWalrus } from '../art/chars.js';
import { CHARTS, SESSION_CHART } from '../data/charts.js';
import { tuning } from '../data/tuning.js';
import { gauss } from '../core/rng.js';

const W = [0.045, 0.09, 0.135];
export class StepClass extends GameEvent {
  static id = 'stepClass'; static title = 'Step Class'; static discipline = 'Cardio'; static instructor = 'bolster'; static couch = true; static session = true; static music = 'cardio'; static palette = 'dusk';
  static intro = { line: 'Footprints slide toward your feet. Press the matching foot as they land, and lean when you see a ribbon.', can: 'You can hit Both feet together for a double step.', cant: "You can't fall here: a miss only makes someone in the class trip.", prompts: [['feetL', 'Left'], ['feetR', 'Right'], ['hop', 'Both'], ['move', 'Lean']] };
  constructor(game, o) {
    super(game, o); this.chart = o.session ? SESSION_CHART : CHARTS[this.tier]; this.bpm = this.chart.bpm; this.cell = 60 / this.bpm / 2; this.lead = 2.2; this.start0 = 2; this.paletteName = 'dusk'; this.music = 'cardio';
    this.notes = []; this.chart.bars.forEach((bar, bi) => { for (let c = 0; c < 8; c++) { const ch = bar[c]; if (ch && ch !== '.') this.notes.push({ t: this.start0 + (bi * 8 + c) * this.cell, ch, j: null }); } });
    this.duration = o.duration && o.session ? o.duration : this.start0 + this.chart.bars.length * 8 * this.cell + 1.5; if (o.attract) this.duration = Math.min(this.duration, 20);
    this.noBal = false; this.makeGround(2.6, 5, '#B98A52'); this.laneGap = 3.4; this.cam = { pos: [0, 2.3, 8.2], look: [0, 1.3, -0.5], fov: 38 };
    this.coach = createWalrus(); this.coach.root.position.set(3.2, 0, -1.8); this.group.add(this.coach.root);
    this.crowd = []; for (let i = 0; i < 8; i++) { const d = createDoll({ paint: i % 10, hat: i % 7 }); d.root.position.set(-5 + (i % 4) * 3.3, 0, -3.5 - Math.floor(i / 4) * 1.8); const rig = new Rig(d); rig.play('idle', 0); this.group.add(d.root); this.crowd.push({ d, rig, trip: 0 }); }
    this.lights = []; for (let i = 0; i < 3; i++) { const s = new THREE.SpotLight(0xffd0a0, 0, 20, 0.5, 0.5); s.position.set(-4 + i * 4, 7, 2); s.target.position.set(0, 0, 0); this.group.add(s, s.target); this.lights.push(s); }
    this.addDolls({ margin: 0.45, ankleMax: 4.6 }); for (const l of this.lanes) { l.combo = 0; l.maxCombo = 0; l.earned = 0; l.maxE = 0; l.prints = []; l.judged = this.notes.map((n) => ({ ...n, j: null })); l.heldB = 0; l.hits = { P: 0, G: 0, O: 0, M: 0 }; l.fixedAnim = true; l.pulse = 0; l.leanDone = new Set(); l.stats = { combo: 0 }; if (l.kind !== 'ghost') l.bal.p.maxLean = 14; }
    this.confetti = []; this.camSnap = true; this.clock = 0;
  }
  onStart() { this.game.audio.play('cardio', this.bpm); }
  tNow() { return this.t + (this.game.settings.rhythmOffset || 0) / 1000 + this.latencyCorr(); }
  latencyCorr() { const a = this.game.audio; if (a.ctx && a.ctx.outputLatency && a.state === 'running') return -a.ctx.outputLatency * 0 ; return 0; }
  win(k) { return W[k] * tuning.rhythmWindow * this.diff.win; }
  botIntent(lane, dt, it) {
    const sk = lane.bot.skill; it.footL = it.footR = false; it.hopEdge = false; let gx = 0, gz = 0; const now = this.t;
    for (const n of lane.judged) { if (n.j !== null) continue; if (!n.due) n.due = n.t + gauss(this.r) * sk.timing + 0; if (n.miss === undefined) n.miss = this.r() < (sk.timing > 0.05 ? 0.06 : 0.01); const isLean = '<>^v'.includes(n.ch);
      if (isLean) { if (now > n.t - 0.6 && now < n.t + 0.8) { gx = n.ch === '<' ? -0.8 : n.ch === '>' ? 0.8 : 0; gz = n.ch === '^' ? -0.8 : n.ch === 'v' ? 0.8 : 0; } continue; }
      if (!n.miss && now >= n.due && !n.pressed) { n.pressed = true; if (n.ch === 'L') it.footL = true; else if (n.ch === 'R') it.footR = true; else { it.footL = it.footR = true; } } }
    const [wx, wz] = lane.bot.steer(gx, gz, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; it.flailEdge = false;
  }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const now = this.tNow(); lane.pulse = Math.max(0, lane.pulse - dt * 4);
    let L = it.footL, R = it.footR; if (L && R) { /* both */ } if (it.hopEdge) { L = R = true; }
    if (L || R) { this.game.audio.sfx('footClick', 1); lane.rig.play(L && R ? 'hop' : L ? 'stepL' : 'stepR', 0.05, { force: true }); lane.lastPressT = now; if (L) lane.lastL = now; if (R) lane.lastR = now; this.pressed(lane, L, R, now); }
    // lean notes
    const b = lane.bal; for (const n of lane.judged) { if (n.j !== null || !'<>^v'.includes(n.ch)) continue; const ok = n.ch === '<' ? b.cobX < -0.25 : n.ch === '>' ? b.cobX > 0.25 : n.ch === '^' ? b.cobZ < -0.25 : b.cobZ > 0.25; const beat = this.cell * 2; if (ok && now > n.t - beat && now < n.t + 2 * beat) { const late = now - n.t; n.j = late < 1.5 * beat ? 'P' : 'G'; this.award(lane, n, n.j === 'P' ? 1 : 0.5); } else if (now > n.t + 2 * beat) { n.j = 'M'; this.award(lane, n, 0); } }
    for (const n of lane.judged) { if (n.j === null && !'<>^v'.includes(n.ch) && now > n.t + this.win(2) + 0.03) { n.j = 'M'; this.award(lane, n, 0); } }
    for (const n of lane.judged) if (n.j === null || true) { /* maxE accumulates once */ }
  }
  pressed(lane, L, R, now) {
    const want = L && R ? 'B' : L ? 'L' : 'R'; let best = null, be = 9; const chk = (ch) => { for (const n of lane.judged) { if (n.j !== null || n.ch !== ch) continue; const e = Math.abs(now - n.t); if (e < be && e <= this.win(2)) { be = e; best = n; } } }; chk(want);
    if (!best && want !== 'B') { /* may be part of a both-note: press within 60ms of other foot */ for (const n of lane.judged) { if (n.j !== null || n.ch !== 'B') continue; const e = Math.abs(now - n.t); if (e <= this.win(2)) { const other = want === 'L' ? lane.lastR : lane.lastL; if (other !== undefined && Math.abs(other - now) < 0.09) { best = n; be = e; } else { n.half = (n.half || 0) + 1; } } } }
    if (best) { best.j = be <= this.win(0) ? 'P' : be <= this.win(1) ? 'G' : 'O'; this.award(lane, best, best.j === 'P' ? 1 : best.j === 'G' ? 0.7 : 0.4); this.judgeFx(lane, best.j); }
  }
  award(lane, n, v) { lane.earned += v; lane.maxE += 1; if (n.j === 'M') { lane.combo = 0; lane.hits.M++; this.crowdTrip(); } else { lane.combo++; lane.maxCombo = Math.max(lane.maxCombo, lane.combo); lane.hits[n.j === 'P' ? 'P' : n.j === 'G' ? 'G' : 'O']++; lane.pulse = 1; for (const c of this.crowd) c.rig.play(Math.floor(this.t * 2) % 2 ? 'stepL' : 'stepR', 0.05, { force: true }); if (lane.combo === 16) { this.game.audio.sfx('unlock'); this.word('COMBO!', lane.x, 2.2); for (const s of this.lights) s.intensity = 60; } } lane.stats.combo = lane.combo; lane.form = Math.min(100, 100 * lane.earned / Math.max(1, this.notes.length)); lane.score = lane.form; }
  judgeFx(lane, j) { this.word(j === 'P' ? 'Perfect' : j === 'G' ? 'Good' : 'OK', lane.x, 1.9); }
  crowdTrip() { const c = this.crowd[Math.floor(this.r() * this.crowd.length)]; c.trip = 0.8; c.rig.play('flop', 0.05, { force: true }); this.game.audio.sfx('clack'); }
  step() { for (const l of this.lanes) { if (l.kind === 'ghost') continue; /* make sure total counts every note */ } if (this.t >= this.duration) { for (const l of this.lanes) if (l.judged) for (const n of l.judged) if (n.j === null) { n.j = 'M'; l.maxE++; } this.finish(); } }
  frameExtra() {
    for (const c of this.crowd) { if (c.trip > 0) { c.trip -= 1 / 60; if (c.trip <= 0) c.rig.play('idle', 0.2, { force: true }); } c.rig.update(1 / 60); }
    for (const l of this.lanes) { if (!l.judged || !l.doll) continue; if (!l.printMeshes) { l.printMeshes = new Map(); }
      for (const n of l.judged) { const dt = n.t - this.t; const vis = n.j === null && dt < this.lead && dt > -0.4; let m = l.printMeshes.get(n); if (vis && !m) { const isLean = '<>^v'.includes(n.ch); const col = n.ch === 'L' ? '#3B82F6' : n.ch === 'R' ? '#E8443A' : n.ch === 'B' ? '#F5B700' : '#22C55E'; m = isLean ? box(0.2, 0.05, 1.4, col) : box(n.ch === 'B' ? 0.9 : 0.35, 0.05, 0.6, col); this.group.add(m); l.printMeshes.set(n, m); }
        if (m) { if (!vis) { m.removeFromParent(); l.printMeshes.delete(n); continue; } const zf = 6.5 - dt / this.lead * 11; m.position.set(l.x + (n.ch === 'L' ? -0.35 : n.ch === 'R' ? 0.35 : n.ch === '<' ? -1.5 : n.ch === '>' ? 1.5 : 0), 0.05, 0.9 - dt * 4.2); } } }
    for (const s of this.lights) { s.intensity *= 0.98; } this.coach.J.body.position.y = 0.95 + Math.abs(Math.sin(this.time * (this.bpm / 30))) * 0.1;
  }
  discInfo(lane) { for (const n of lane.judged) if (n.j === null && '<>^v'.includes(n.ch) && n.t - this.t < 1.6 && n.t - this.t > -0.5) return { marks: [{ x: n.ch === '<' ? -0.5 : n.ch === '>' ? 0.5 : 0, z: n.ch === '^' ? -0.5 : n.ch === 'v' ? 0.5 : 0, r: 0.2 }] }; return {}; }
  hudInfo(lane) { return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'c', html: `Combo <b>${lane.combo}</b>` }] }; }
  prompts() { return StepClass.intro.prompts; }
  onDispose() { for (const l of this.lanes) if (l.printMeshes) for (const m of l.printMeshes.values()) m.removeFromParent(); }
}
