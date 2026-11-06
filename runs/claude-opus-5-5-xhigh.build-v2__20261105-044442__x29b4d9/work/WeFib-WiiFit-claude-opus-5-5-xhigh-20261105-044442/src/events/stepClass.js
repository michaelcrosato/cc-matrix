import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { M, G, geo, toon, add, basic } from '../art/materials.js';
import { post, pavilionRoof, bunting, TEAK, CREAM, TEAL, ORANGE } from '../art/props.js';
import { Doll } from '../art/doll.js';
import { Walrus } from '../art/cast.js';
import { chartNotes } from '../data/charts.js';
import { tun } from '../core/tuning.js';
import { cos, cosPick } from '../core/rng.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const CLASS_COLOURS = ['#C9A0DC', '#6FB7D6', '#E78FB3', '#F5C84A', '#7FA650', '#E8644A', '#5AA9E6', '#F2A65A'];
const LEAD = 2.4; // seconds a footprint is on the deck before it arrives
const TRACK = 5; // metres of deck it slides along, toward your feet from the camera side
const DIRS = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], v: [0, 1] };
const NOTE_COL = { L: 0x7FB4E8, R: 0xE8707A, B: 0xF5B700 };

/** Footprints slide toward your feet. The class copies you. Miss one and somebody trips. */
export class StepClass extends EventBase {
  static id = 'stepClass';
  constructor(spec) {
    super(spec);
    this.seaLevel = -5; this.god = true; this.barkHigh = true;
    const ch = chartNotes(this.cfg.chart, this.cfg.bpm);
    this.notes = ch.notes; this.length = ch.length; this.beat = ch.beat;
    this.clock = -0.0; this.ownsMusic = true;
    this.max = this.notes.length;
    this.pulse = 0; this.lastBeat = -1;
    this.nextClick = 0;
  }
  setupLane(lane) {
    lane.judge = this.notes.map(() => ({ done: false, score: 0 }));
    lane.sum = 0; lane.combo = 0; lane.best = 0; lane.perfect = 0; lane.miss = 0; lane.lastWord = '';
    lane.doll.rig.loop('stand');
    lane.fx = 0;
    lane.wasBoth = false;
    lane.leanScored = 0;
    lane.prints = [];
  }
  buildSet() {
    const g = this.group, n = this.lanes.length, w = Math.max(12, n * 3.2 + 7);
    add(g, M(geo.cyl(w * 0.72, w * 0.76, 1, 8), CREAM, 0, -0.5, -2), M(geo.cyl(w * 0.7, w * 0.7, 0.04, 8), TEAK, 0, -0.01, -2));
    add(g, M(geo.box(w * 2.4, 1, 50), 0x8CCB6A, 0, -1.2, -8));
    // Footprint tracks.
    for (const lane of this.lanes) {
      add(g, M(geo.box(0.62, 0.012, TRACK + 1), 0xE9D7A8, lane.x - 0.42, 0.012, 0.5 + TRACK / 2 - 0.5, { shadow: false }), M(geo.box(0.62, 0.012, TRACK + 1), 0xE9D7A8, lane.x + 0.42, 0.012, 0.5 + TRACK / 2 - 0.5, { shadow: false }));
      lane.markL = M(geo.sphere(0.2, 12, 8), 0x7FB4E8, lane.x - 0.42, 0.016, 0.5, { scale: [1, 0.05, 1.4], shadow: false });
      lane.markR = M(geo.sphere(0.2, 12, 8), 0xE8707A, lane.x + 0.42, 0.016, 0.5, { scale: [1, 0.05, 1.4], shadow: false });
      add(g, lane.markL, lane.markR);
    }
    const roof = pavilionRoof(w * 0.85, TEAL, ORANGE);
    roof.position.set(0, 7.6, -2);
    roof.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    g.add(roof);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + 0.39;
      add(g, post(7.6, 0.13, CREAM, Math.cos(a) * w * 0.68, 0, -2 + Math.sin(a) * w * 0.68));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283 + 0.39, b = ((i + 1) / 8) * 6.283 + 0.39;
      g.add(bunting(Math.cos(a) * w * 0.68, 6.4, -2 + Math.sin(a) * w * 0.68, Math.cos(b) * w * 0.68, 6.4, -2 + Math.sin(b) * w * 0.68, 7));
    }
    // A class of eight behind you, getting more in sync as your combo grows.
    this.klass = [];
    for (let i = 0; i < 8; i++) {
      const d = new Doll({ shirt: CLASS_COLOURS[i], hat: cosPick(['none', 'visor', 'bucket', 'beret', 'perm', 'none']), height: cos(0.9, 1.06), width: cos(0.95, 1.05) });
      d.flatFeet = false;
      const row = i < 4 ? 0 : 1;
      d.root.position.set((i % 4 - 1.5) * 2.2 + row * 0.8, 0, -4 - row * 2);
      d.rig.loop('stand');
      g.add(d.root);
      this.klass.push({ d, lag: 0, tripT: 0 });
    }
    this.walrus = new Walrus();
    this.walrus.root.position.set(-w * 0.42, 0, -1.4);
    this.walrus.root.rotation.y = 0.7;
    this.walrus.rig.loop('bounce', { speed: this.cfg.bpm / 75 });
    g.add(this.walrus.root);
    // Spotlights that swing at a combo of 16.
    this.spots = [];
    for (const x of [-w * 0.32, w * 0.32]) {
      const s = new THREE.SpotLight(0xFFE9A8, 40, 26, 0.5, 0.5, 1.1);
      s.position.set(x, 7.2, -1);
      s.target.position.set(0, 0, 0);
      add(g, s, s.target);
      this.spots.push(s);
    }
    this.printPool = [];
    this.printGeo = geo.sphere(0.2, 12, 8);
    this.ribbonGeo = geo.box(1, 0.02, 0.5);
    for (const lane of this.lanes) lane.printsK = this.notes.map(() => null);
    this.game.setIsland('hidden');
  }
  cameraShot(snap) {
    const n = this.lanes.length, d = this.game.rig.fitDistance(9.4, (n - 1) * 3.2 + 2);
    this.game.rig.shot(0, 3.9, d, 0, 0.75, 0.6, { snap, rate: 4 });
  }
  hudSetup(hud) { this.comboTag = hud.addWidget(h('div.tag', { style: 'font-size:3.8rem' }, 'Combo 0')); hud.setScore(0, 'Form'); }
  musicOpts() { return { bpm: this.cfg.bpm }; }
  start() {
    const a = this.game.audio;
    this.useAudio = !this.game.params.manual && a.state === 'running';
    a.music('cardio', { bpm: this.cfg.bpm, at: a.ctx ? a.ctx.currentTime + 0.05 : undefined, fade: 0.2 });
    this.clock = 0;
    if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', 'step_intro'), { auto: 3, top: true });
  }
  /** Step timing comes from the audio clock, minus output latency, when audio runs; otherwise the sim clock. */
  syncClock() {
    if (!this.useAudio) return;
    const a = this.game.audio, seq = a.seq;
    if (!seq || seq.id !== 'cardio' || seq.paused) return;
    const lat = a.ctx.outputLatency || 0;
    const want = seq.position() - lat;
    const d = want - this.clock;
    if (Math.abs(d) > 0.25) this.clock = want; else this.clock += d * 0.1;
  }
  windows() {
    const k = tun.rhythmWindow * this.diff.rhythm;
    return { perfect: 0.045 * k, good: 0.09 * k, ok: 0.135 * k };
  }
  fixedEvent(dt) {
    this.clock += dt;
    const offset = this.game.save.settings.rhythmOffset / 1000;
    const now = this.clock - offset;
    // Click every note on the sound bus: music is only 10%, so the beat must read without it.
    const a = this.game.audio;
    while (this.nextClick < this.notes.length && this.notes[this.nextClick].t <= now + 0.1) {
      const nt = this.notes[this.nextClick];
      if (a.mix && a.state === 'running') a.mix.playSfx('foot', a.ctx.currentTime + Math.max(0, nt.t - now), { note: nt.lean ? 76 : nt.type === 'L' ? 84 : nt.type === 'R' ? 88 : 93, vel: 0.9 });
      this.nextClick++;
    }
    const beatN = Math.floor(now / this.beat);
    if (beatN !== this.lastBeat) { this.lastBeat = beatN; this.pulse = 1; }
    const win = this.windows();
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost') continue;
      const i = lane.input;
      const both = i.hopPressed || (i.footL > 0.5 && i.footR > 0.5 && !lane.wasBoth);
      lane.wasBoth = i.footL > 0.5 && i.footR > 0.5;
      if (both) this.press(lane, 'B', now, win);
      else {
        if (i.footLPressed) this.press(lane, 'L', now, win);
        if (i.footRPressed) this.press(lane, 'R', now, win);
      }
      // Lean notes score when the dot passes .25 in that direction: full within 1.5 beats, half within 2.
      this.notes.forEach((n, k) => {
        const j = lane.judge[k];
        if (j.done) return;
        if (n.lean) {
          if (now < n.t - 0.75 * this.beat) return;
          const [dx, dz] = DIRS[n.type];
          const proj = lane.dotX * dx + lane.dotZ * dz;
          const dtN = now - n.t;
          if (proj > 0.25) {
            const s = dtN <= 1.5 * this.beat ? 1 : 0.5;
            this.score(lane, k, s, s === 1 ? 'Lean!' : 'Late');
          } else if (dtN > 2 * this.beat) this.miss(lane, k);
        } else if (now - n.t > win.ok) this.miss(lane, k);
      });
    }
  }
  press(lane, type, now, win) {
    // Nearest unjudged foot note of a matching type; both-foot notes accept a hop, single notes a press.
    let best = -1, bd = 1e9;
    for (let k = 0; k < this.notes.length; k++) {
      const n = this.notes[k];
      if (n.lean || lane.judge[k].done) continue;
      if (n.t - now > win.ok) break;
      if (type === 'B' ? n.type !== 'B' : n.type !== type && n.type !== 'B') continue;
      const d = Math.abs(now - n.t);
      if (d < bd) { bd = d; best = k; }
    }
    this.stepPose(lane, type);
    if (best < 0 || bd > win.ok) return;
    const n = this.notes[best];
    if (n.type === 'B' && type !== 'B') {
      // A both-foot note wants both feet: one foot gets half marks only if the other comes too.
      const other = type === 'L' ? lane.input.footR : lane.input.footL;
      if (other < 0.5) return;
    }
    const s = bd <= win.perfect ? 1 : bd <= win.good ? 0.7 : 0.4;
    if (s === 1) lane.perfect++;
    this.score(lane, best, s, s === 1 ? 'Perfect' : s > 0.5 ? 'Good' : 'OK');
  }
  stepPose(lane, type) {
    // Mirrored on purpose: your left is the doll's right as it faces you.
    if (type === 'L') lane.doll.rig.once('stepR');
    else if (type === 'R') lane.doll.rig.once('stepL');
    else lane.doll.rig.once('hop', { speed: 1.6 });
    this.game.audio.sfx('thud', { pitch: 200 });
  }
  score(lane, k, s, word) {
    lane.judge[k].done = true; lane.judge[k].score = s;
    lane.sum += s;
    lane.combo++;
    lane.best = Math.max(lane.best, lane.combo);
    lane.lastWord = word;
    if (lane.kind === 'local') {
      this.game.hud.setNote(word, 0.5);
      if (lane.combo === 16) {
        this.game.fx.confetti(0, 7, -1, 120, [0xE8443A, 0xF5B700, 0x2CB5A0, 0x5AA9E6, 0xFFF3DC], 7);
        this.bark('bolster', 'step_combo', 2.4, 3);
        for (const sp of this.spots) sp.intensity = 140;
      }
    }
    this.flashPrint(lane, k);
  }
  miss(lane, k) {
    lane.judge[k].done = true;
    lane.combo = 0; lane.miss++;
    lane.lastWord = 'Miss';
    for (const sp of this.spots) sp.intensity = 40;
    // A miss makes someone in the class trip.
    const c = this.klass[Math.floor(cos(0, this.klass.length))];
    if (c && c.tripT <= 0) { c.tripT = 1.1; c.d.rig.once('flop', { speed: 1.2, hold: 0.5 }); this.game.audio.sfx('clack'); }
    if (lane.kind === 'local') { this.game.hud.setNote('Miss', 0.5); this.bark('bolster', 'step_miss', 2.2, 7); }
  }
  flashPrint(lane, k) { const p = lane.printsK && lane.printsK[k]; if (p) { this.group.remove(p); lane.printsK[k] = null; } }
  botInput(lane, t, bot) {
    const out = lane.input;
    const now = this.clock - this.game.save.settings.rhythmOffset / 1000;
    out.footLPressed = false; out.footRPressed = false; out.hopPressed = false; out.hop = false;
    out.footL = 0; out.footR = 0;
    let lean = null;
    bot.data.err = bot.data.err || {};
    for (let k = 0; k < this.notes.length; k++) {
      const n = this.notes[k];
      if (lane.judge[k].done) continue;
      if (n.t > now + 1) break;
      if (n.lean) { if (!lean && n.t - now < 0.45 - bot.s.lag) lean = n; continue; }
      if (bot.data.err[k] === undefined) bot.data.err[k] = bot.chance(0.03 + (bot.s.timing > 0.06 ? 0.04 : 0)) ? 9 : bot.timing();
      const due = n.t + bot.data.err[k];
      if (now >= due && now < due + 0.1) {
        if (n.type === 'L') { out.footLPressed = true; out.footL = 1; } else if (n.type === 'R') { out.footRPressed = true; out.footR = 1; } else { out.hopPressed = true; out.hop = true; }
      }
    }
    let gx = 0, gz = 0;
    if (lean) { [gx, gz] = DIRS[lean.type]; gx *= 0.7; gz *= 0.7; }
    const [x, z] = bot.steer(gx, gz);
    out.wishX = lean ? gx * 1.3 : x; out.wishZ = lean ? gz * 1.3 : z;
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    hud.setTime(Math.max(0, this.length - this.clock));
    hud.setScore(Math.round((100 * me.sum) / this.max), 'Form');
    if (this.comboTag) { const s = `Combo ${me.combo}`; if (this.comboTag.textContent !== s) this.comboTag.textContent = s; }
  }
  frameEvent(dt) {
    const now = this.clock;
    this.pulse = Math.max(0, this.pulse - dt * 6);
    const lane0 = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    // Footprints for the notes coming up, on every lane that has a body here.
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost' || !lane.printsK) continue;
      this.notes.forEach((n, k) => {
        const until = n.t - now;
        if (lane.judge[k].done) { this.flashPrint(lane, k); return; }
        if (until < LEAD && until > -0.4) {
          let p = lane.printsK[k];
          if (!p) {
            p = this.makePrint(n, lane);
            lane.printsK[k] = p;
            this.group.add(p);
          }
          p.position.z = 0.5 + (until / LEAD) * TRACK;
          p.position.y = until < 0.15 ? this.pulse * 0.02 : 0;
        } else if (until <= -0.4) this.flashPrint(lane, k);
      });
    }
    for (const lane of this.lanes) {
      if (lane.markL) { const s = 1 + this.pulse * 0.25; lane.markL.scale.set(s, 0.05, 1.4 * s); lane.markR.scale.set(s, 0.05, 1.4 * s); }
      if (lane.doll && lane.kind !== 'ghost' && this.lastBeat >= 0 && lane.doll.rig.onceLeft <= 0) lane.doll.rig.loop('stand');
    }
    // The class gets more in sync as your combo grows.
    const combo = lane0.combo || 0;
    const sync = Math.min(1, combo / 16);
    const beat = this.lastBeat;
    this.klass.forEach((c, i) => {
      c.tripT = Math.max(0, c.tripT - dt);
      c.d.update(dt);
      if (c.tripT > 0) return;
      const phase = (now / this.beat + (1 - sync) * i * 0.37) % 2;
      if (Math.floor(phase) !== c.lastF) {
        c.lastF = Math.floor(phase);
        c.d.rig.once(c.lastF ? 'stepL' : 'stepR');
      }
    });
    if (combo >= 16) {
      const s = Math.sin(now * 1.6) * 3;
      this.spots[0].target.position.set(s, 0, 0); this.spots[1].target.position.set(-s, 0, 0);
    }
    if (this.walrus) this.walrus.update(dt);
    return beat;
  }
  makePrint(n, lane) {
    const g = G();
    const m = (x, c) => M(this.printGeo, c, lane.x + x, 0.04, 0, { scale: [1.15, 0.16, 1.6], shadow: false });
    if (n.lean) {
      const [dx, dz] = DIRS[n.type];
      const bar = M(geo.box(1.5, 0.02, 0.32), 0x9BE08F, lane.x, 0.03, 0, { shadow: false });
      const arrow = M(geo.cone(0.24, 0.42, 4), 0x2F8F46, lane.x + dx * 0.6, 0.06, dz * 0.25, { rot: [Math.PI / 2, 0, Math.atan2(-dx, -dz)], scale: [1, 1, 0.2], shadow: false });
      add(g, bar, arrow);
    } else {
      if (n.type === 'L' || n.type === 'B') g.add(m(-0.42, NOTE_COL[n.type]));
      if (n.type === 'R' || n.type === 'B') g.add(m(0.42, NOTE_COL[n.type]));
    }
    return g;
  }
  onResume() { this.syncClock(); }
  afterStep() { if (this.useAudio && (this.stepCount++ % 12 === 0)) this.syncClock(); }
  isDone() { return this.clock >= this.length; }
  laneResult(lane) {
    const form = (100 * (lane.sum || 0)) / Math.max(1, this.max);
    return { form, raw: lane.sum, big: Math.round(form), stats: `Best combo ${lane.best} · ${lane.perfect} perfect · ${lane.miss} missed` };
  }
}
export { toon, basic };
