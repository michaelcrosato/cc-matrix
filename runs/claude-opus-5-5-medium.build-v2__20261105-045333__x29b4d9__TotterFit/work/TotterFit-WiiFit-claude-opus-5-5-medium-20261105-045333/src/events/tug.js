import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { T } from '../core/tuning.js';
import { cyl, box, at, sphere, palm, torus, capsule, rock, bunting, buoy } from '../art/props.js';
import { makeDoll } from '../art/doll.js';
import { makeWalrus } from '../art/walrus.js';
import { GUESTS } from '../data/names.js';
const CALL = 1.2;
export class Tug extends EventBase {
  static id = 'tug'; static title = 'Tug of Peace'; static discipline = 'Strength'; static instructor = 'bolster'; static place = 'The Beach'; static music = 'strength'; static couch = true; static diagram = 'tug';
  static sentence = 'On the call, squeeze both feet and lean back. Best of three pulls.';
  static can = 'You can lean back further for more pull, and pay for it when they ease off.'; static cant = "You can't pull between calls. Peace has rules.";
  static verbs = [['lean', 'Lean back'], ['feet', 'Heave'], ['flail', 'Flail']];
  static tiers = [{ their: .35, ease: 0 }, { their: .5, ease: 12 }, { their: .54, ease: 9 }];
  buildSet() {
    const n = this.opts.laneCount || 1; this.laneSpacing = 2.4;
    this.add(cyl(14, 15, 1, '#F0DDB0', 32), 0, -.5, 0);
    for (let i = -5; i <= 5; i++) { const m = box(.08, .02, 1.6, i === 0 ? '#E8443A' : '#C9B488'); this.add(m, i * .8, .012, 0); }
    this.add(palm(1.6), -9, 0, -6); this.add(palm(1.3), 9, 0, -5); this.add(rock(.7), 7, .1, -7); this.add(buoy(), 3, -.4, -13); this.add(bunting(-7, 3.2, -4, 7, 3.2, -4, 18));
    this.rope = new THREE.Group(); const line = cyl(.035, .035, 12, '#E9D3AE', 8); line.rotation.z = Math.PI / 2; this.rope.add(at(line, 0, 1.05, 0)); const flag = box(.1, .4, .02, '#E8443A'); this.rope.add(at(flag, 0, .8, 0)); this.add(this.rope);
    this.walrus = makeWalrus(); this.add(this.walrus.group, 0, 0, -2.6); this.anim.push(this.walrus);
    this.pos = 0; this.pullsA = 0; this.pullsB = 0; this.pullN = 0; this.callT = 2; this.callIdx = 0; this.easeT = this.tier.ease; this.easing = 0; this.resolveQ = []; this.pullBreak = 0; this.flagShake = 0;
    this.aiDolls = [];
  }
  placeCamera(snap) { this.game.rig.set(0, 2.4, 10.8, 0, 1.1, 0, snap); }
  laneX(i, n) { const side = i % 2 === 0 ? -1 : 1, rank = Math.floor(i / 2); return side * (2.2 + rank * 1.5); }
  start() {
    const anyB = this.lanes.some(l => l.id % 2 === 1 && l.kind !== 'ghost'); this.aiB = !anyB;
    for (const l of this.lanes) { l.team = l.id % 2 === 0 ? 'A' : 'B'; l.customPose = true; l.baseClip = 'tug'; l.doll.rig.play('tug', 0); l.doll.setFace(l.team === 'A' ? Math.PI / 2 : -Math.PI / 2); l.pressT = -9; l.power = 0; l.err = 0; l.nextPress = null; }
    // Solo: you and Retired Kevin against Both Sandras.
    if (this.aiB) {
      const add = (g, x, face) => { const d = makeDoll({ paint: g.paint, hat: g.hat, skin: g.skin, height: g.height, width: g.width }); d.group.position.set(x, 0, 0); d.setFace(face); d.rig.play('tug', 0); this.group.add(d.group); this.anim.push(d); this.aiDolls.push({ d, face, base: x }); };
      add(GUESTS[1], -3.7, Math.PI / 2); add(GUESTS[2], 2.2, -Math.PI / 2); add(GUESTS[3], 3.7, -Math.PI / 2);
    }
  }
  teamPower(team) { const list = this.lanes.filter(l => l.team === team && l.kind !== 'ghost'); if (!list.length) return null; let s = 0; for (const l of list) s += l.power; return s / list.length; }
  fixedPlay(dt) {
    if (this.pullBreak > 0) { this.pullBreak -= dt; if (this.pullBreak <= 0) { this.pos = 0; this.setMsg(''); this.callT = 1.5; for (const l of this.lanes) l.power = 0; } return; }
    const their = this.tier.their;
    // Press detection: both feet squeeze.
    for (const l of this.lanes) {
      if (!l.bal) continue;
      const both = l.in.lf > .5 && l.in.rf > .5 || l.in.hop;
      if (both && !l.wasBoth && !l.fallen) { const err = Math.min(Math.abs(this.playT - (this.lastCall ?? -9)), Math.abs(this.playT - (this.lastCall ?? -9) - CALL), Math.abs(this.callAt - this.playT)); l.power = Math.max(0, 1 - err / .3) * Math.max(0, l.bal.leanZ / l.bal.maxLeanRad()); l.pressT = this.playT; this.game.audio.sfx('foot'); }
      l.wasBoth = both;
      const tension = this.easing > 0 ? 0 : 1; const tp = this.oppPower(l, their);
      if (!l.fallen) l.extraZ -= (.1 + .3 * tp) * tension;
    }
    this.callT -= dt; this.callAt = this.playT + Math.max(0, this.callT);
    if (this.callT <= 0) {
      this.callT = CALL; this.lastCall = this.playT; this.callN = (this.callN || 0) + 1; this.game.audio.speak('bolster', 'Heave!'); this.game.audio.sfx('rim'); this.setBig('HEAVE!'); this.game.after(.3, () => { this.setBig(''); });
      // Resolve shortly after the call so a press just after it still counts.
      this.game.after(.32, () => this.resolve(their));
    }
    if (this.tier.ease) {
      this.easeT -= dt;
      if (this.easeT <= 0) { this.easeT = this.tier.ease * (.8 + this.r() * .4); this.easing = .8; this.setMsg('They eased off!'); for (const l of this.lanes) if (l.bal && !l.fallen && l.bal.leanZ / l.bal.maxLeanRad() > T.tugOverlean) { this.gust(l, 0, 3.2, .5); l.overlean = true; } this.game.after(.8, () => this.setMsg('')); }
      if (this.easing > 0) this.easing -= dt;
    }
    if (this.playT > 240) this.finish();
  }
  oppPower(l, base) { const opp = l.team === 'A' ? 'B' : 'A'; const p = this.teamPower(opp); return p == null ? base : Math.max(.2, p); }
  resolve(their) {
    if (this.phase !== 'play' || this.pullBreak > 0 || this.disposed) return;
    const a = this.teamPower('A') ?? 0, bReal = this.teamPower('B');
    const b = bReal == null ? their * (.8 + this.r() * .4) : bReal;
    this.pos += (a - b) * .33; this.flagShake = 1;
    for (const l of this.lanes) l.power = 0;
    if (Math.abs(this.pos) >= 1) {
      const aWon = this.pos > 0; if (aWon) this.pullsA++; else this.pullsB++; this.pullN++;
      this.setMsg(`${aWon ? 'Your side' : 'Their side'} took the pull. ${this.pullsA} to ${this.pullsB}`); this.game.audio.sfx('bell'); this.game.audio.sfx('cheer');
      if (this.pullsA >= 2 || this.pullsB >= 2 || this.pullN >= 3) { this.finish(); this.tally(); return; }
      this.pullBreak = 2.2;
    }
    this.tally();
  }
  tally() { for (const l of this.lanes) { const won = l.team === 'A' ? this.pullsA : this.pullsB; l.form = Math.max(0, Math.min(100, 40 + 30 * won - 5 * l.falls)); l.score = won; } }
  onFall(l) { const d = l.team === 'A' ? -.3 : .3; this.pos += d; l.customPose = false; if (l.kind === 'local') this.game.barkNow('bolster', 'tugSit'); this.tally(); }
  onRecover(l) { l.customPose = true; l.doll.rig.play('tug', .1); }
  frameLane(l) {
    if (!l.bal || l.fallen) return; const dir = l.team === 'A' ? -1 : 1;
    const back = l.bal.leanZ; l.doll.group.position.set(l.x + this.pos * 1.6, 0, 0); l.doll.setLean(dir * back * 1.2, l.bal.leanX * .4);
  }
  frame2() {
    this.rope.position.x = this.pos * 1.6; if (this.flagShake > 0) this.flagShake = Math.max(0, this.flagShake - .05);
    for (const a of this.aiDolls) { a.d.group.position.x = a.base + this.pos * 1.6; const dir = a.base < 0 ? -1 : 1; a.d.setLean(dir * (.12 + .1 * Math.max(0, Math.sin(this.t * 5.2 + a.base))), 0); }
    this.setNum(`${this.pullsA}-${this.pullsB}`, 'Pulls'); this.setTime(null);
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); const stick = this.tier.ease ? .85 : .9;
    const [x, z] = br.correct(dt, l, 0, stick, false, .5);
    // Press at the call plus this skill's timing error, early or late.
    const nextCall = (this.callN || 0) + 1;
    if (l.fireAt == null && l.doneCall !== nextCall && this.pullBreak <= 0 && this.callAt != null) { l.fireAt = this.callAt + br.gauss() * br.s.timing; l.aimCall = nextCall; }
    if (l.fireAt != null && this.playT >= l.fireAt) { l.fireAt = null; l.doneCall = l.aimCall; l.pressHold = .06; }
    const held = (l.pressHold || 0) > 0; if (held) l.pressHold -= dt;
    return { x, z, lf: held ? 1 : 0, rf: held ? 1 : 0, flail: this.opts.botFlail ? (l.bal?.angle || 0) > .56 : false };
  }
  laneResult(i) { const l = this.lanes[i]; const won = l.team === 'A' ? this.pullsA : this.pullsB, lost = l.team === 'A' ? this.pullsB : this.pullsA; return { form: l.form, big: `${won}-${lost}`, label: 'Pulls', stats: `Floor Exercises: ${l.falls}. Peace has been achieved, roughly.` }; }
  forceThing() { this.easeT = 0; }
}
