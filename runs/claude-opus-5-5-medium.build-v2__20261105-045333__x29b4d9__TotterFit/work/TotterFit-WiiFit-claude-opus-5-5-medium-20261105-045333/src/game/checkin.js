// The Check-In: a round mat, Trudy, and three short tests.
import * as THREE from 'three/webgpu';
import { EventBase } from '../events/base.js';
import { TEST_NAMES } from '../data/programme.js';
import { makeTrudy } from '../art/trudy.js';
import { cyl, torus, at, sphere, box, lantern, palm } from '../art/props.js';
import { el, txt } from '../ui/ui.js';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const DUR = { standStill: 10, leanMatch: 18, stepTime: 16, quickLean: 15, oneFoot: 12 };
export class CheckIn extends EventBase {
  static id = 'checkin'; static title = 'The Check-In'; static discipline = 'Check-In'; static instructor = 'trudy'; static place = 'The mat'; static music = 'island';
  static sentence = 'Three short tests. Then I tell you your Wobble Age.'; static can = 'You can only do your best.'; static cant = "You can't lose this. You can only do it badly.";
  static verbs = [['lean', 'Lean'], ['left', 'Left'], ['right', 'Right']];
  static tiers = [{}];
  buildSet() {
    this.tests = this.opts.tests || ['standStill', 'leanMatch', 'stepTime']; this.ti = 0; this.st = -2.4; this.results = [];
    this.add(cyl(13, 13.2, .4, '#8FD06F', 40), 0, -.2, 0); this.add(cyl(2.3, 2.3, .05, '#E77BB0', 40), 0, .025, 0); const r = torus(2.1, .05, '#FFF8EE'); r.rotation.x = Math.PI / 2; this.add(r, 0, .055, 0); const r2 = torus(1.1, .04, '#FFF8EE'); r2.rotation.x = Math.PI / 2; this.add(r2, 0, .055, 0);
    this.add(palm(1.6), -5, 0, -4); this.add(palm(1.3), 5.4, 0, -5); this.add(lantern(), -3.2, 0, -2); this.add(lantern(), 3.2, 0, -2);
    this.trudy = makeTrudy(); this.add(this.trudy.group, -1.9, 0, .5); this.trudy.group.rotation.y = .6; this.anim.push({ tick: (dt) => this.trudy.tick(dt, this.lanes[0]?.bal ? -this.lanes[0].bal.cobX * .2 : 0) });
    this.quads = null;
  }
  placeCamera(snap) { this.game.rig.set(0, 1.5, 6.4, 0, 1.05, 0, snap); }
  setupHud2() { this.hbar = el('div', 'hbar'); this.hbarFill = el('div', 'fill'); this.hbarMark = el('div', 'mark'); this.hbar.append(this.hbarFill, this.hbarMark); this.hbar.style.cssText += 'position:absolute;left:50%;transform:translateX(-50%);bottom:15vh;display:none'; this.hudEl.appendChild(this.hbar); }
  start() { const l = this.lanes[0]; l.zone = null; l.score = 0; this.begin(); }
  cur() { return this.tests[this.ti]; }
  begin() {
    const id = this.cur(), l = this.lanes[0]; this.st = -2.4; l.errSum = 0; l.errN = 0; l.lp = false; l.rp = false; this.sub = { n: 0, last: null }; l.zone = null; l.sway = 0; l.tremor = 0; l.bal.mods.margin = null; if (this.hbar) this.hbar.style.display = 'none';
    this.setMsg(TEST_NAMES[id]); if (!this.attract) this.game.barkNow('trudy', id); this.game.audio.sfx('bell');
    this.trudy.rig.play('read', .3);
    if (id === 'stepTime') { this.beat = 60 / 96; this.nextBeat = 1; }
    if (id === 'quickLean') { this.prompts = 6; this.pI = -1; this.pGap = 2.2; this.pT = .5; this.reacts = []; }
    if (id === 'leanMatch') { this.targets = [[-.7, 0, '70% left'], [.5, 0, '50% right'], [0, -.6, '60% forward']]; if (this.r() < .5) this.targets[1] = [.8, 0, '80% right']; }
  }
  fixedPlay(dt) {
    const l = this.lanes[0]; this.st += dt; if (this.st < 0) return;
    const id = this.cur(), dur = DUR[id], b = l.bal;
    if (id === 'standStill' || id === 'oneFoot') {
      l.sway = .1; l.tremor = .06; l.zone = { x: 0, z: 0, r: .25 };
      if (id === 'oneFoot') { const good = l.in.rf > .5 && l.in.lf < .5; b.mods.margin = good ? .225 : .45; this.setBig(''); this.setMsg(good ? 'Good. Stay on that foot.' : 'Hold your right foot, let the left one go'); if (!good) { l.errSum += .25 * dt * 120 / 120; } }
      else this.setMsg('Keep the dot in the middle');
      l.errSum += Math.min(1, Math.hypot(b.cobX, b.cobZ)); l.errN++;
    } else if (id === 'leanMatch') {
      l.sway = .04; const k = Math.min(2, Math.floor(this.st / 6)), tg = this.targets[k], into = this.st - k * 6; l.zone = { x: tg[0], z: tg[1], r: .12 }; this.setMsg(`Lean ${tg[2]}`);
      if (into > 1.5) { l.errSum += Math.hypot(b.cobX - tg[0], b.cobZ - tg[1]); l.errN++; }
      if (this.hbar) { this.hbar.style.display = ''; const pct = Math.min(1, Math.hypot(b.cobX, b.cobZ)); this.hbarFill.style.width = `${pct * 100}%`; this.hbarMark.style.left = `${Math.hypot(tg[0], tg[1]) * 100}%`; }
    } else if (id === 'stepTime') {
      l.sway = .02; this.setMsg('Alternate your feet on the tick');
      if (this.st >= this.nextBeat) { this.nextBeat += this.beat; this.game.audio.sfx('tick', { high: true }); this.trudy.hop(); }
      const L = l.in.lf > .5, R = l.in.rf > .5, lE = L && !l.lp, rE = R && !l.rp; l.lp = L; l.rp = R;
      if (lE || rE) { const foot = lE ? 'L' : 'R'; const near = Math.abs(this.st - (this.nextBeat - this.beat)) < Math.abs(this.st - this.nextBeat) ? this.nextBeat - this.beat : this.nextBeat; let err = Math.abs(this.st - near); if (foot === this.sub.last) err = .12; this.sub.last = foot; l.errSum += Math.min(.12, err); l.errN++; l.doll.rig.play(foot === 'L' ? 'stepL' : 'stepR', .03, 'idle'); this.game.audio.sfx('foot', { high: foot === 'R' }); }
    } else if (id === 'quickLean') {
      l.sway = .02; this.pT -= dt;
      if (this.pT <= 0 && !this.active && this.pI < this.prompts - 1) { this.pI++; const d = [[-1, 0, 'left'], [1, 0, 'right'], [0, -1, 'forward'], [0, 1, 'back']][Math.floor(this.r() * 4)]; this.active = { d, t: 0 }; l.zone = { x: d[0] * .55, z: d[1] * .55, r: .3 }; this.setMsg(`Lean ${d[2]}!`); this.game.audio.sfx('foot', { high: true }); }
      if (this.active) { this.active.t += dt; if (b.cobX * this.active.d[0] + b.cobZ * this.active.d[1] > .4) { this.reacts.push(this.active.t); this.active = null; l.zone = null; this.setMsg('Back to the middle'); this.pT = 1; this.game.audio.sfx('marble', { r: .5 }); } else if (this.active.t > 1.9) { this.reacts.push(1.9); this.active = null; l.zone = null; this.pT = .6; } }
      if (this.pI >= this.prompts - 1 && !this.active && this.pT <= 0) { this.st = dur; }
    }
    if (this.st >= dur) this.endTest();
  }
  score(id) {
    const l = this.lanes[0], mean = l.errN ? l.errSum / l.errN : 1;
    if (id === 'standStill' || id === 'oneFoot') return clamp01(1 - mean / .25);
    if (id === 'leanMatch') return clamp01(1 - mean / .4);
    if (id === 'stepTime') return l.errN >= 8 ? clamp01(1 - mean / .12) : 0;
    if (id === 'quickLean') { const r = this.reacts; const m = r.length ? r.reduce((a, c) => a + c, 0) / r.length : 1.9; return clamp01(1 - (m - .35) / .9); }
    return 0;
  }
  endTest() {
    const id = this.cur(), s = this.score(id); this.results.push({ id, score: s }); this.game.audio.sfx('stamp'); this.game.comic(`${Math.round(s * 100)}`, 0, 2.3, 0, '#FFD23F', 1.1);
    if (!this.attract) this.game.barkNow('trudy', s > .55 ? 'testGood' : 'testBad'); this.trudy.rig.play(s > .55 ? 'hop' : 'sulk', .2);
    this.ti++; if (this.ti >= this.tests.length) { this.lanes[0].form = 100 * this.results.reduce((a, r) => a + r.score, 0) / this.results.length; this.finish(); return; }
    this.begin();
  }
  frame2() { const l = this.lanes[0]; if (!l) return; this.setNum(`${Math.min(this.ti + 1, this.tests.length)}/${this.tests.length}`, 'Test'); const id = this.cur(); this.setTime(id ? (this.st < 0 ? null : DUR[id] - this.st) : null); }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l), id = this.cur(); if (!id || this.st < 0) return { x: 0, z: 0 };
    let gx = 0, gz = 0, load = false, lf = 0, rf = 0; if (l.zone && (id === 'leanMatch' || id === 'quickLean')) { gx = l.zone.x; gz = l.zone.z; load = id === 'leanMatch'; }
    if (id === 'oneFoot') rf = 1;
    if (id === 'stepTime') {
      l.bq = l.bq || { next: null, foot: 'L', tL: 0, tR: 0 }; const q = l.bq; if (q.next === null || q.for !== this.nextBeat) { q.for = this.nextBeat; q.next = this.nextBeat + br.gauss() * br.s.timing; }
      if (this.st >= q.next && !q.fired) { q.fired = true; if (q.foot === 'L') { q.tL = .05; q.foot = 'R'; } else { q.tR = .05; q.foot = 'L'; } } if (this.st < q.next) q.fired = false;
      q.tL -= dt; q.tR -= dt; lf = q.tL > 0 ? 1 : 0; rf = q.tR > 0 ? 1 : 0;
    }
    const [x, z] = br.correct(dt, l, gx, gz, load);
    return { x, z, lf, rf };
  }
  laneResult() { return { form: this.lanes[0].form, big: Math.round(this.lanes[0].form), label: 'Check-In', stats: '' }; }
  forceFinish() { while (this.results.length < this.tests.length) { const id = this.tests[this.results.length]; this.results.push({ id, score: .5 }); } this.lanes[0].form = 50; this.finish(); }
}
