import * as THREE from 'three/webgpu';
import { EventBase, lerp } from './base.js';
import { RAPIER, G_PROP } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { cyl, box, at, sphere, bench, crate, tree, bunting, cone, torus } from '../art/props.js';
import { makeWalrus } from '../art/walrus.js';
import { el, txt } from '../ui/ui.js';
export class LogReps extends EventBase {
  static id = 'logReps'; static title = 'Log Reps'; static discipline = 'Strength'; static instructor = 'bolster'; static place = 'The Yard'; static music = 'strength'; static couch = true; static session = true; static diagram = 'feet';
  static sentence = 'Squeeze both feet to sink with the ribbon, rise with it, and keep the dot in the ring.';
  static can = 'You can let the log slide. Coach will catch it. That rep is lost.'; static cant = "You can't rush: the ribbon decides the tempo.";
  static verbs = [['lean', 'Lean'], ['feet', 'Sink'], ['flail', 'Flail']];
  static tiers = [
    { reps: 6, sway: [.08, .22], tremor: [.04, .12], tight: 0 },
    { reps: 9, sway: [.12, .3], tremor: [.06, .16], tight: .02 },
    { reps: 12, sway: [.15, .38], tremor: [.08, .2], tight: .04 },
  ];
  static sessionConfig = { tier: 0, reps: 8 };
  balanceOpts() { return { margin: .8, ankleMax: 6 }; }
  buildSet() {
    this.camYaw = -.3; this.faceYaw = .3; this.nReps = (this.opts.reps || this.tier.reps) + 2;
    const n = this.opts.laneCount || 1;
    const ground = cyl(12, 12.3, 1, '#E3CFA3', 32); this.add(ground, 0, -.5, 0);
    const mat = box(2.2 + (n - 1) * 3.2, .04, 2.2, '#D9694F'); this.add(mat, 0, .02, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 3.1 + 3.3; const log = cyl(.16, .16, 1.9, '#9C7048'); log.rotation.z = 1.57; log.rotation.y = i; this.add(log, Math.cos(a) * 6.5, .17, Math.sin(a) * 6.5); }
    this.add(bench(), -5, 0, -2); this.add(bench(), 5, 0, -3); this.add(crate(.8), 6, 0, -.5); this.add(tree(1.5, '#7CC568'), -7, 0, -5); this.add(tree(1.2, '#F4A6C0'), 7, 0, -6);
    this.add(bunting(-6, 3, -4, 6, 3, -4, 16));
    // A rack of dumb bells made of toy blocks.
    const rack = box(2.4, .1, .5, '#7A5A3C'); this.add(rack, -3.2, .8, -3.6); this.add(at(box(.1, .8, .5, '#7A5A3C'), -4.3, .4, -3.6)); this.add(at(box(.1, .8, .5, '#7A5A3C'), -2.1, .4, -3.6));
    this.walrus = makeWalrus(); this.add(this.walrus.group, -2.7 - (n - 1) * 1.6, 0, -.3); this.walrus.group.rotation.y = .75; this.anim.push(this.walrus);
    this.falling = [];
  }
  placeCamera(snap) { const spread = this.lanes.length ? Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x) : 0; const d = this.game.rig.fitDistance(6.5, spread); this.game.rig.set(Math.sin(.3) * d, 1.8, Math.cos(.3) * d, 0, 1, 0, snap); }
  setupHud2() { this.bar = el('div', 'vbar'); this.band = el('div', 'band'); this.mark = el('div', 'mark'); this.bar.append(this.band, this.mark); this.hudEl.appendChild(this.bar); }
  start() {
    for (const l of this.lanes) {
      l.depth = 0; l.rep = 0; l.inBand = 0; l.inZone = 0; l.ticks = 0; l.repScores = []; l.logOffset = 0; l.zone = { x: 0, z: 0, r: .3 }; l.baseClip = 'squat'; l.logDown = false; l.lost = false; l.err = 0; l.errT = 0;
      l.doll.rig.scrub('squat', 0, 0);
      const log = cyl(.12, .12, 2, '#9C7048'); log.rotation.z = Math.PI / 2; log.position.y = 1.3; l.doll.lean.add(log); l.log = log; for (const s of [-1, 1]) { const end = sphere(.125, '#D9B98A', .2, 1, 1); log.add(at(end, 0, s * 1, 0)); end.rotation.z = 1.57; }
    }
    this.period = 5; this.repT = 0; this.gag = false;
  }
  ribbon(t) { const p = this.period * T.repTempo, a = (t % p) / p * 5; if (a < 2) return a / 2; if (a < 2.5) return 1; if (a < 4.5) return 1 - (a - 2.5) / 2; return 0; }
  halfWidth() { const f = Math.min(1, this.repN() / Math.max(1, this.nReps - 1)); return Math.max(.05, lerp(.16, .1, f) - this.tier.tight); }
  repN() { return Math.floor(this.playT / (this.period * T.repTempo)); }
  fixedPlay(dt) {
    const prog = this.playT / (this.nReps * this.period * T.repTempo), rib = this.ribbon(this.playT), hw = this.halfWidth(), rn = this.repN();
    if (rn !== this.lastRn) {
      if (this.lastRn !== undefined) { for (const l of this.lanes) this.closeRep(l); this.game.audio.sfx('tick'); if (this.barkT <= 0) this.bark('bolster', rn > this.nReps * .6 ? 'tired' : 'rep'); }
      this.lastRn = rn;
      if (rn === 1) this.walrus.rig.play('inhale', .2, 'bounce');
      if (rn === this.nReps - 2 && !this.attract) { this.game.barkNow('bolster', 'last'); this.walrus.rig.play('clap', .2); }
    }
    if (rn >= this.nReps) { this.finish(); return; }
    this.rib = rib; this.hw = hw;
    for (const l of this.lanes) {
      l.sway = lerp(this.tier.sway[0], this.tier.sway[1], prog); l.tremor = lerp(this.tier.tremor[0], this.tier.tremor[1], prog);
      if (l.kind === 'ghost' || !l.bal) continue;
      const I = l.in; let want;
      if (I.dev === 'kbm' || (l.ctrl && l.ctrl.device === 'kbm')) { const both = I.lf > .5 && I.rf > .5; l.kd = Math.max(0, Math.min(1, (l.kd || 0) + (both ? dt : -dt) / (2 * T.repTempo))); want = l.kd; }
      else want = (I.lf + I.rf) / 2;
      const shake = lerp(.015, .07, prog) * Math.sin(this.t * 31 + l.id);
      l.depth += (want + shake - l.depth) * (1 - Math.exp(-14 * dt));
      l.ticks++; if (Math.abs(l.depth - rib) <= hw) l.inBand++;
      if (Math.hypot(l.bal.cobX, l.bal.cobZ) <= l.zone.r && !l.fallen) l.inZone++;
      if (!l.logDown && !l.fallen) {
        const leanDeg = l.bal.leanX * 57.3;
        if (Math.abs(leanDeg) > 6) l.logOffset += .05 * (Math.abs(leanDeg) - 6) * Math.sign(leanDeg) * dt;
        else l.logOffset += -Math.sign(l.logOffset) * Math.min(Math.abs(l.logOffset), .02 * dt);
        l.extraX += .06 * 9.81 * l.logOffset;
        if (Math.abs(l.logOffset) >= .5) this.dropLog(l);
      }
    }
  }
  closeRep(l) {
    if (l.kind === 'ghost' || !l.bal) return;
    const s = l.ticks ? (l.inBand / l.ticks) * (.5 + .5 * (l.inZone / l.ticks)) : 0;
    const bonus = l.repScores.length >= this.nReps - 2; l.repScores.push(l.lost ? 0 : s); if (bonus) l.repScores.push(l.lost ? 0 : s);
    l.lost = false; l.inBand = 0; l.inZone = 0; l.ticks = 0; l.rep++;
    l.form = 100 * l.repScores.reduce((a, b) => a + b, 0) / Math.max(1, l.repScores.length);
    if (l.kind === 'local') this.game.audio.sfx('foot', { high: s > .6 });
    if (s > .75) this.game.comic(s > .9 ? 'NICE!' : 'REP!', l.x, 2.3, 0, '#FFD23F', .55, .6);
    this.game.rumble(l, .1 + .3 * this.repN() / this.nReps, .1);
  }
  dropLog(l) {
    l.logDown = true; l.lost = true; l.log.visible = false; const x = l.x + Math.sign(l.logOffset) * .7;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 1.3, 0).setAngvel({ x: 0, y: 0, z: Math.sign(l.logOffset) * -2 }));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(1, .12).setRotation({ x: 0, y: 0, z: .7071, w: .7071 }).setMass(.3).setCollisionGroups(G_PROP(l.id)), body);
    const m = cyl(.12, .12, 2, '#9C7048'); m.rotation.z = 0; const holder = new THREE.Group(); holder.add(m); m.rotation.z = Math.PI / 2; this.group.add(holder);
    this.falling.push({ body, m: holder, l, left: 1.4 });
    this.game.audio.sfx('clack', { f: 300 }); this.walrus.rig.play('catch', .1, 'bounce'); if (l.kind === 'local') this.game.barkNow('bolster', 'log');
  }
  postPlay(dt) {
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i]; f.left -= dt; const p = f.body.translation(), q = f.body.rotation(); f.m.position.set(p.x, p.y, p.z); f.m.quaternion.set(q.x, q.y, q.z, q.w);
      if (f.left <= 0) { this.group.remove(f.m); this.world.removeRigidBody(f.body); this.falling.splice(i, 1); f.l.logOffset = 0; f.l.logDown = false; f.l.log.visible = true; this.game.audio.sfx('spring'); }
    }
  }
  frameLane(l) {
    if (l.kind === 'ghost') return;
    if (!l.fallen) { l.doll.rig.scrub('squat', Math.max(0, Math.min(1, l.depth)), 0); l.doll.inner.position.y = -Math.max(0, Math.min(1, l.depth)) * .32; }
    if (l.log) { l.log.position.y = 1.3 - l.depth * .32; l.log.position.x = l.logOffset; }
  }
  onFall(l) { if (l.log) l.log.visible = false; l.lost = true; l.doll.inner.position.y = 0; }
  onRecover(l) { if (l.log && !l.logDown) l.log.visible = true; l.logOffset = 0; }
  frame2() {
    const l = this.localLanes()[0] || this.lanes[0];
    if (!l) return; this.setNum(Math.min(this.repN() + 1, this.nReps), 'Rep'); this.setTime(null);
    if (this.bar && this.rib != null) { const h = this.hw * 100; this.band.style.top = `${(this.rib * 100 - h)}%`; this.band.style.height = `${h * 2}%`; this.mark.style.top = `${l.depth * 100}%`; }
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); const [x, z] = br.correct(dt, l, 0, 0, true);
    l.errT -= dt; if (l.errT <= 0) { l.errT = .4; l.err = br.gauss() * br.s.trackErr; }
    const d = Math.max(0, Math.min(1, this.ribbon(t + .06 - br.s.delay * .3) + l.err));
    return { x, z, lf: d, rf: d };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: Math.round(l.form), label: 'Form', stats: `${l.rep} reps. Floor Exercises: ${l.falls}` }; }
  forceThing() { for (const l of this.lanes) if (l.bal && !l.logDown) { l.logOffset = .5; this.dropLog(l); } }
  forceFinish() { for (const l of this.lanes) if (l.ticks > 30) this.closeRep(l); this.finish(); }
}
