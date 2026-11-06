import { EventBase } from './base.js';
import { M, G, geo, add } from '../art/materials.js';
import { SAND, CREAM, rope, umbrella, palm, RED, TEAL } from '../art/props.js';
import { Doll } from '../art/doll.js';
import { Walrus } from '../art/cast.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const CALL = 1.2, DEG = Math.PI / 180;
/** The rope is one number. Heave on the call. How far you dare lean is the game. */
export class Tug extends EventBase {
  static id = 'tug';
  constructor(spec) {
    super(spec);
    this.god = false; this.seaLevel = -2; this.customPose = true;
    this.rope = 0; this.pull = 1; this.wins = [0, 0]; this.next = 1.2; this.callN = 0; this.ease = 0; this.easeT = this.cfg.ease || 0; this.done = false; this.pause = 0;
    this.teams = null;
  }
  laneX(i) { return 0; }
  setupLane(lane) {
    lane.team = lane.id % 2;
    lane.pressT = -9; lane.power = 0; lane.sat = 0; lane.lastPress = -9; lane.wasBoth = false;
    lane.doll.rig.loop('tug');
  }
  get solo() { return this.lanes.length === 1; }
  buildSet() {
    const g = this.group;
    add(g, M(geo.box(120, 1, 40), SAND, 0, -0.5, -8));
    for (let i = -6; i <= 6; i++) add(g, M(geo.box(0.08, 0.01, 1.6), i === 0 ? RED : CREAM, i * 1, 0.006, 0, { shadow: false }));
    add(g, M(geo.box(0.16, 0.012, 2), RED, -6.2, 0.006, 0, { shadow: false }), M(geo.box(0.16, 0.012, 2), RED, 6.2, 0.006, 0, { shadow: false }));
    const u = umbrella(RED); u.position.set(-9, 0, -4); g.add(u);
    const u2 = umbrella(TEAL); u2.position.set(8, 0, -5); g.add(u2);
    const p = palm(3.8); p.position.set(0, 0, -7); g.add(p);
    this.ropeG = G('');
    this.ropeM = rope(-5, 1.05, 0, 5, 1.05, 0, 0.1, 0.05);
    this.ropeG.add(this.ropeM);
    add(this.ropeG, M(geo.sphere(0.12, 10, 8), RED, 0, 1, 0, { scale: [1, 1.2, 1] }));
    g.add(this.ropeG);
    // Solo: you and Retired Kevin against Both Sandras.
    this.extra = [];
    if (this.solo) {
      const kevin = new Doll({ shirt: '#6FB7D6', hat: 'visor', shorts: 0x38503A });
      const s1 = new Doll({ shirt: '#E78FB3', hat: 'bucket', height: 0.96, shorts: 0x7A3F5A }), s2 = new Doll({ shirt: '#E78FB3', hat: 'bucket', height: 0.96, shorts: 0x7A3F5A });
      this.kevin = kevin; this.sandras = [s1, s2];
      for (const d of [kevin, s1, s2]) { g.add(d.root); d.rig.loop('tug'); d.flatFeet = false; this.extra.push(d); }
    }
    this.walrus = new Walrus();
    this.walrus.root.position.set(0.2, 0, -3.2);
    this.walrus.rig.loop('bounce');
    g.add(this.walrus.root);
    this.game.setBackdrop(30, -125);
  }
  cameraShot(snap) { this.game.rig.shot(0, 2.3, 11, 0, 1.1, 0, { snap, rate: 4, fov: 38 }); }
  hudSetup(hud) { this.scoreTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, '')); this.ropeBar = hud.addWidget(hud.meter('Rope', '#E8644A')); hud.setScore('0-0', 'Pulls'); }
  start() { this.next = 1.4; if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', 'tug_intro'), { auto: 3, top: true }); }
  fixedEvent(dt) {
    const c = this.cfg;
    if (this.pause > 0) { this.pause -= dt; for (const l of this.lanes) if (l.bal) { l.bal.sway = 0.05; } return; }
    this.next -= dt;
    if (this.next <= 0) {
      this.callT = this.t; this.next = CALL; this.callN++;
      this.game.hud.flash('HEAVE!', 0.45);
      this.game.audio.sfx('metronome', { vel: 1 });
      this.walrus.rig.once('clap');
      this.judgeT = this.t + 0.3;
      this.judged = false;
      for (const l of this.lanes) { l.timing = 0; l.share = 0; }
    }
    // Their pull forward. Your lean back is plus z.
    const theirPower = this.solo ? c.power * (1 + (this.ropeNoise || 0)) : 0.3;
    if (c.ease) {
      this.easeT -= dt;
      if (this.easeT <= 0) { this.ease = 0.8; this.easeT = c.ease * (0.8 + this.r() * 0.4); this.easeNow = true; if (this.mode === 'solo') this.bark('bolster', 'tug_ease', 2, 4); this.game.hud.setNote('They eased off!', 0.8); }
    }
    const easing = this.ease > 0;
    if (easing) this.ease -= dt;
    for (const lane of this.lanes) {
      const b = lane.bal, i = lane.input;
      if (!b) continue;
      b.sway = 0.03;
      if (!easing) b.extZ += -(0.1 + 0.3 * theirPower) * this.diff.dist;
      const share = Math.max(0, b.leanZ / b.maxLean);
      lane.shareNow = share;
      // Leaning too far at the moment they ease off sits you down: one hit, not one a step.
      if (this.easeNow && share > 0.72 && !lane.fallen) lane.sat = 0.5;
      if (lane.sat > 0) {
        lane.sat -= dt;
        // A flail shrugs the jolt off while it lasts. Too late and you are already going.
        if (b.flailLeft <= 0) b.extZ += 3.2;
      }
      const both = (i.footL > 0.5 && i.footR > 0.5) || i.hop;
      if (both && !lane.wasBoth) lane.lastPress = this.t;
      lane.wasBoth = both;
      if (this.callT !== undefined && Math.abs(lane.lastPress - this.callT) <= 0.3 && !lane.fallen) {
        const tim = Math.max(0, 1 - Math.abs(lane.lastPress - this.callT) / 0.3);
        if (tim > (lane.timing || 0)) lane.timing = tim;
        lane.share = Math.max(lane.share || 0, share);
      }
    }
    this.easeNow = false;
    if (this.judgeT !== undefined && !this.judged && this.t >= this.judgeT) {
      this.judged = true;
      this.judge();
    }
    this.rope = Math.max(-1, Math.min(1, this.rope));
    if (Math.abs(this.rope) >= 1) this.endPull(this.rope > 0 ? 0 : 1);
  }
  judge() {
    const c = this.cfg;
    const power = (l) => (l.fallen ? 0 : (l.timing || 0) * (l.share || 0));
    let a = 0, b = 0, na = 0, nb = 0;
    for (const l of this.lanes) { if (!l.bal) continue; const p = power(l); l.power = p; if (l.team === 0) { a += p; na++; } else { b += p; nb++; } }
    const ours = na ? a / na : 0;
    let theirs;
    if (nb) theirs = b / nb;
    else theirs = c.power * (0.8 + this.r() * 0.4);
    // A fall's cost is the rope's leap. Nobody hauls on a rope while the other side is on the floor.
    const down = (team) => { const t = this.lanes.filter((l) => l.bal && l.team === team); return t.length > 0 && t.every((l) => l.fallen); };
    if (!down(0) && !down(1)) this.rope += (ours - theirs) * 0.33;
    this.ropeNoise = (this.r() - 0.5) * 0.4;
    this.game.audio.sfx('thud', { pitch: 130 });
  }
  endPull(winner) {
    this.wins[winner]++;
    const me = this.lanes[0];
    this.game.audio.sfx('bell');
    if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', winner === 0 ? 'tug_win' : 'tug_lose'), { auto: 2.8, top: true });
    this.game.hud.flash(winner === 0 ? 'Pull won!' : 'Pull lost', 1.5);
    if (winner === 0 && me.kind === 'local') this.game.fx.confetti(0, 5, 0, 60, [0xE8443A, 0xF5B700, 0x2CB5A0, 0xFFF3DC], 5);
    this.rope = 0; this.pause = 2.4; this.next = 1.4; this.pull++;
    this.ease = 0; this.callT = undefined;
    if (this.wins[0] >= 2 || this.wins[1] >= 2 || this.pull > 3) this.done = true;
  }
  onFall(lane) {
    // Lean back too far when the other side eases off and you sit down hard.
    this.rope += lane.team === 0 ? -0.3 : 0.3;
    if (lane.kind === 'local') this.bark('bolster', 'tug_sit', 2.6, 2);
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    const stick = lane.tugStick ?? 0.9;
    const [x] = bot.steer(0, stick, true);
    out.wishX = x * 0.3; out.wishZ = stick;
    // One timing error per call, early or late.
    const d = bot.data;
    if (d.call !== this.callN) { d.call = this.callN; d.lateBy = d.err ?? 0; d.err = bot.timing(); }
    const since = this.callT === undefined ? 9 : this.t - this.callT;
    const early = d.err < 0 && this.next <= -d.err;
    const late = d.lateBy > 0 ? since >= d.lateBy && since < d.lateBy + 0.12 : since < 0.12;
    const v = early || late ? 1 : 0;
    out.footL = v; out.footR = v;
    out.flail = !lane.fallen && lane.bal.lean > 0.39 + bot.s.lag * 0.3 && lane.bal.flailCool <= 0;
  }
  hud() {
    const hud = this.game.hud;
    hud.setScore(`${this.wins[0]}-${this.wins[1]}`, 'Pulls');
    hud.setTime(null);
    if (this.ropeBar) this.ropeBar.set((this.rope + 1) / 2);
    if (this.scoreTag) { const s = `Pull ${Math.min(3, this.pull)} of 3`; if (this.scoreTag.textContent !== s) this.scoreTag.textContent = s; }
  }
  placeDoll(d, x, faceRight, leanBack, y = 0) {
    d.root.position.set(x, y, 0);
    d.face(faceRight ? Math.PI / 2 : -Math.PI / 2);
    d.root.rotation.set(0, 0, (faceRight ? 1 : -1) * leanBack);
    d.setLean && 0;
  }
  frameEvent(dt) {
    const r = this.rope * 1.4;
    this.ropeG.position.x = -r;
    const positions = this.solo ? [] : [[-3.4, true], [3.4, false], [-5, true], [5, false]];
    this.lanes.forEach((l, i) => {
      if (l.fallen) return;
      const left = this.solo ? true : l.team === 0;
      const x = this.solo ? -3.4 : positions[i][0];
      const lean = Math.max(0, l.bal ? l.bal.leanZ * 0.8 : 0);
      this.placeDoll(l.doll, x - r, left, lean);
    });
    if (this.solo) {
      this.placeDoll(this.kevin, -5 - r, true, 0.28 + Math.sin(this.t * 3) * 0.04);
      this.placeDoll(this.sandras[0], 3.4 - r, false, 0.3 + Math.sin(this.t * 3.1) * 0.04);
      this.placeDoll(this.sandras[1], 5 - r, false, 0.3 + Math.sin(this.t * 3.1) * 0.04);
      for (const d of this.extra) d.update(dt);
    }
    if (this.walrus) this.walrus.update(dt);
  }
  isDone() { return this.done; }
  laneResult(lane) {
    const won = lane.team === 0 ? this.wins[0] : this.wins[1];
    const form = Math.max(0, 40 + 30 * won - 5 * lane.falls);
    return { form, raw: won, big: `${won} won`, stats: `Pulls ${this.wins[0]}-${this.wins[1]} · ${lane.falls} sat down` };
  }
}
export { DEG };
