import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { T } from '../core/tuning.js';
import { box, at, cyl, sphere, rbox, buoy, palm, bunting, torus } from '../art/props.js';
import { makeGull } from '../art/gull.js';
import { Ragdoll } from '../physics/ragdoll.js';
const W = 2 * Math.PI / .9, ZETA = .035, rad = (d) => d * Math.PI / 180;
export class Springboard extends EventBase {
  static id = 'springboard'; static title = 'Springboard'; static discipline = 'Balance Play'; static instructor = 'trudy'; static place = 'The Dive Tower'; static music = 'balance'; static couch = true; static session = true; static diagram = 'dive';
  static sentence = 'Squeeze both feet as the board goes down. Press Hop to launch. Spin with the stick. Hit the water well.';
  static can = 'You can win with a clean dive or a perfect belly flop.'; static cant = "You can't miss the sea. It is very large.";
  static verbs = [['feet', 'Pump'], ['hop', 'Launch / Tuck'], ['lean', 'Spin']];
  static tiers = [{ tower: 5, par: 128 }, { tower: 7, par: 150 }, { tower: 9, par: 172 }];
  static sessionConfig = { tier: 0, time: 50 };
  groundY() { return -2.5; }
  buildSet() {
    this.noFall = true; this.moveMode = true; this.timeLimit = this.opts.time || 80; this.tower = this.tier.tower; this.faceYaw = Math.PI / 2; this.showDisc = false; this.laneSpacing = 2.2;
    const h = this.tower, n = this.opts.laneCount || 1, depth = 1.6 + (n - 1) * 2.2;
    const COL = ['#E8443A', '#F5B700', '#3B82F6', '#22C55E'];
    let y = 0, i = 0; while (y < h) { const s = Math.min(1.1, h - y); this.add(box(2.2, s, depth + .4, COL[i % 4]), -2.2, y + s / 2, 0); y += s; i++; }
    this.add(cyl(.3, .4, 3, '#7A5A3C'), -2.2, -1.5, 0);
    for (let k = 0; k < n; k++) { const b = rbox(2.2, .1, .5, .04, '#F5F0E0'); this.add(b, -.2, h, n > 1 ? (k - (n - 1) / 2) * 1.8 : 0); }
    this.boards = this.group.children.slice(-n);
    this.add(bunting(-3.2, h + 1.4, -depth / 2, -3.2, h + 1.4, depth / 2, 6)); this.add(at(cyl(.05, .05, 1.5, '#FFF8EE'), -3.2, h + .7, -depth / 2)); this.add(at(cyl(.05, .05, 1.5, '#FFF8EE'), -3.2, h + .7, depth / 2));
    this.add(buoy(), 8, -.4, -3); this.add(buoy('#F5F0E0'), 12, -.4, 2); this.add(palm(1.5), -7, -.5, -3);
    this.gary = makeGull(); this.gary.rig.play('fly'); this.add(this.gary.group, 6, h + 3, -1); this.anim.push(this.gary); this.garyDown = false;
    this.ringG = new THREE.Group(); this.add(this.ringG);
    this.pool = [];
  }
  laneX(i, n) { return 0; }
  ghostPos(x) { return [.3, this.tower, x * .6]; }
  placeCamera(snap) { const l = this.lanes[0]; const h = this.tower; let cx = 2.2, cy = h * .62, d = 6 + h * .95; if (l && l.state === 'air') { const p = l.bal.body.translation(); cy = Math.max(1, (p.y + h * .4) / 1.4); cx = 3.4; } if (this.replay) { const q = this.replay.pos; cx = q.x * .6 + 2; cy = Math.max(1.4, q.y * .7); d = 6.5; } this.game.rig.set(cx, cy + 1, d + (this.lanes.length - 1) * 1.5, cx, cy, 0, snap); }
  start() { this.lanes.forEach((l, i) => { l.laneZ = this.lanes.length > 1 ? (i - (this.lanes.length - 1) / 2) * 1.8 : 0; l.dives = []; l.diveN = 0; l.state = 'pump'; l.y = 0; l.v = 1.2; l.t0 = 0; l.buf = []; l.best = null; l.best2 = null; l.bestBuf = null; l.baseClip = 'diveReady'; l.customPose = false; if (l.bal) { l.bal.moveFoot(.3, this.tower, l.laneZ); l.bal.foot.setTranslation({ x: .3, y: this.tower, z: l.laneZ }, true); l.bal.fx = .3; l.bal.fy = this.tower; l.bal.fz = l.laneZ; l.bal.reset(); } l.doll.rig.play('diveReady', 0); l.pumpT = 0; l.bobT = 0; l.grace = 0; l.splash = 0; }); }
  fixedPlay(dt) {
    let allDone = true;
    for (const l of this.lanes) {
      if (!l.bal) continue;
      if (l.state === 'pump') this.pump(l, dt);
      else if (l.state === 'air') this.air(l, dt);
      else if (l.state === 'water') this.water(l, dt);
      if (l.state !== 'done') allDone = false;
    }
    if (allDone && !this.replay) { this.startReplay(); }
    if (this.replay) { this.replay.t += dt * .25; if (this.replay.t >= this.replay.dur) { this.endReplay(); this.finish(); } else this.playReplay(); }
    if (this.playT >= this.timeLimit && !this.replay) { this.finish(); }
  }
  pump(l, dt) {
    const I = l.in, pumping = Math.min(I.lf, I.rf) > .5 || (I.dev === 'kbm' && I.lf > .4 && I.rf > .4); const a = -W * W * l.y - 2 * ZETA * W * l.v - (pumping ? T.boardGain : 0);
    if (pumping && !l.wasPump) { this.game.audio.sfx('pump'); }
    if (l.lastV > 0 && l.v <= 0) { this.game.audio.sfx('tick', { high: true }); if (this.boards?.[l.id]) l.doll.land(); } l.lastV = l.v; // The click marks the top: squeeze now.
    l.wasPump = pumping; l.v += a * dt; l.y += l.v * dt; l.y = Math.max(-1.3, Math.min(1.3, l.y)); l.pumpT += dt;
    l.bal.moveFoot(.3, this.tower + l.y, l.laneZ); const b = this.boards?.[l.id]; if (b) { b.position.y = this.tower + l.y; b.rotation.z = l.y * .1; }
    // Lean stays on-axis during the pump.
    l.wishX = 0; l.wishZ = 0;
    if (I.hop || l.pumpT > (this.opts.pumpMax || 9)) this.launch(l, Math.max(3, l.v));
    if (this.phase === 'play' && l.doll.rig.currentName !== 'diveReady') l.doll.rig.play('diveReady', .1);
    const d = Math.max(0, Math.min(1, -l.y * 1.1)); l.doll.inner.scale.y = 1 - d * .12;
  }
  launch(l, speed) {
    const b = l.bal; const p = b.body.translation();
    l.launchV = speed; b.release(); b.body.setTranslation({ x: p.x, y: this.tower + l.y + .75, z: l.laneZ }, true); b.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); b.body.setLinvel({ x: 1.1, y: speed, z: 0 }, true); b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    b.collider.setEnabled(false);
    l.state = 'air'; l.maxY = this.tower; l.buf = []; l.angle = 0; l.spin = 0; this.game.audio.sfx('spring'); l.doll.rig.play('splay', .1); l.doll.inner.scale.y = 1; this.game.rumble(l, .4, .1);
    if (this.boards?.[l.id]) { this.boards[l.id].position.y = this.tower; this.boards[l.id].rotation.z = 0; }
  }
  air(l, dt) {
    const b = l.bal.body; const I = l.in; const tuck = I.hopHeld; const stick = Math.max(-1, Math.min(1, I.x));
    const target = stick * T.airTorque * (tuck ? 1.8 : 1);
    l.spin += (target - l.spin) * (1 - Math.exp(-9 * dt)); l.angle += l.spin * dt;
    // Rotation about z: stick right tips the head toward the sea.
    const a = l.angle; b.setRotation({ x: 0, y: 0, z: Math.sin(-a / 2), w: Math.cos(-a / 2) }, true); b.setAngvel({ x: 0, y: 0, z: -l.spin }, true);
    const p = b.translation(); l.maxY = Math.max(l.maxY, p.y - .75);
    const want = tuck ? 'tuck' : (Math.abs(l.spin) > .3 ? 'pike' : 'splay'); if (l.doll.rig.currentName !== want) l.doll.rig.play(want, .1);
    l.buf.push({ x: p.x, y: p.y, z: p.z, a }); if (l.buf.length > 240) l.buf.shift();
    if (p.y <= .55) this.enter(l, a, p);
  }
  scoreEntry(l, a) {
    const deg = ((a * 57.2958 % 360) + 360) % 360; // 0 upright, 90 belly flat, 180 head first, 270 back flat
    const toUp = Math.min(deg, 360 - deg), toHead = Math.abs(deg - 180), toBelly = Math.abs(deg - 90), height = l.maxY;
    const h = 1 + (height - 5) / 10; const grace = Math.min(toUp, toHead) <= 12 ? 100 * (1 - Math.min(toUp, toHead) / 12) * h : 0, splash = toBelly <= 20 ? 100 * (1 - toBelly / 20) * h : 0;
    return { grace, splash, score: Math.max(grace, splash, 8), height, type: splash > grace ? 'splash' : grace > 0 ? 'grace' : 'meh' };
  }
  enter(l, a, p) {
    const s = this.scoreEntry(l, a); l.dives.push(s); l.diveN++;
    if (s.type === 'splash') { this.game.particles.splash(p.x, 0, p.z, 3); this.game.audio.sfx('splash', { big: 1.6 }); this.game.comic('SPLOSH!', p.x, 2.5, p.z, '#BDF2F2', 1.5); this.game.rig.shake(.25); this.game.hitstop(.08); if (!this.garyDown && l.id === 0) { this.garyDown = true; this.garyF = 1; this.game.audio.sfx('squawk'); } if (l.kind === 'local') this.game.barkNow('trudy', 'springSplash'); }
    else if (s.type === 'grace') { this.game.particles.splash(p.x, 0, p.z, .25); this.game.audio.sfx('splash', { big: .3 }); this.game.comic('SO CLEAN', p.x, 2, p.z, '#FFF8EE', .8); if (l.kind === 'local') this.game.barkNow('trudy', 'springGrace'); }
    else { this.game.particles.splash(p.x, 0, p.z, 1); this.game.audio.sfx('splash', { big: .9 }); this.game.comic('TECHNICALLY', p.x, 2, p.z, '#FFF8EE', .8); if (l.kind === 'local') this.game.barkNow('trudy', 'springMeh'); }
    if (s.score > (l.bestReplayScore || 0)) { l.bestReplayScore = s.score; l.bestBuf = l.buf.slice(); }
    const v = l.bal.body.linvel();
    l.bal.setEnabled(false);
    l.doll.setLean(0, 0); l.doll.lean.quaternion.set(0, 0, Math.sin(-a / 2), Math.cos(-a / 2)); l.doll.group.position.set(p.x - Math.sin(a) * .75, p.y - Math.cos(a) * .75, p.z);
    l.ragdoll = new Ragdoll(this.world, l.doll, this.group, { x: v.x * .4, y: v.y * .4, z: 0 }, { x: 0, y: .05, z: 0 });
    l.state = 'water'; l.waterT = 2.2; this.tally(l);
  }
  water(l, dt) {
    l.waterT -= dt;
    if (l.ragdoll) for (const part of l.ragdoll.parts) { const p = part.body.translation(); if (p.y < -.05) { part.body.applyImpulse({ x: 0, y: (-p.y) * .7 * dt * 9 * part.body.mass(), z: 0 }, true); const w = part.body.linvel(); part.body.setLinvel({ x: w.x * .985, y: w.y * .985, z: w.z * .985 }, true); } }
    if (l.waterT <= 0) {
      if (l.ragdoll) { l.ragdoll.remove(); l.ragdoll = null; }
      if (l.diveN >= (this.attract ? 1 : 3) || this.playT > this.timeLimit - 9) { l.state = 'done'; l.doll.group.visible = false; return; }
      const b = l.bal; b.setEnabled(true); b.collider.setEnabled(true); b.moveFoot(.3, this.tower, l.laneZ); b.foot.setTranslation({ x: .3, y: this.tower, z: l.laneZ }, true); b.fx = .3; b.fy = this.tower; b.fz = l.laneZ; b.reattach();
      l.state = 'pump'; l.y = 0; l.v = 1.2; l.pumpT = 0; l.doll.rig.play('diveReady', .1); this.game.audio.sfx('spring');
    }
  }
  tally(l) { const sorted = l.dives.map(d => d.score).sort((a, b) => b - a); const n = Math.max(2, Math.min(2, sorted.length)); const sum = (sorted[0] || 0) + (sorted[1] || 0); l.score = sum; l.form = Math.min(100, 100 * (sum / n) / this.tier.par); }
  startReplay() {
    const l = this.lanes.find(q => q.bestBuf && q.bestBuf.length > 10);
    if (!l || this.opts.noReplay || this.sessionMode) { this.finish(); return; }
    const buf = l.bestBuf; this.replay = { l, buf, t: 0, dur: Math.min(1.3, buf.length / 120), pos: { x: 0, y: 5 } }; l.doll.group.visible = true; l.customPose = true; this.setMsg('Slow motion. For science.'); l.doll.rig.play('pike', .1);
  }
  playReplay() { const r = this.replay; const f = r.buf[Math.min(r.buf.length - 1, Math.floor((r.t / r.dur) * (r.buf.length - 1)))]; r.pos = f; const q = r.l.doll; q.lean.quaternion.set(0, 0, Math.sin(-f.a / 2), Math.cos(-f.a / 2)); q.group.position.set(f.x - Math.sin(f.a) * .75, f.y - Math.cos(f.a) * .75, f.z); }
  endReplay() { this.setMsg(''); this.game.audio.sfx('splash', { big: 1.2 }); this.game.particles.splash(this.replay.pos.x, 0, 0, 2.2); this.replay.l.doll.group.visible = false; this.replay = null; }
  frameLane(l) {
    if (!l.bal || l.ragdoll || l.customPose) return;
    if (l.state === 'air') { const p = l.bal.body.translation(), a = l.angle; l.doll.lean.quaternion.set(0, 0, Math.sin(-a / 2), Math.cos(-a / 2)); l.doll.group.position.set(p.x - Math.sin(a) * .75, p.y - Math.cos(a) * .75, p.z); }
    else if (l.state === 'pump') { l.doll.group.position.set(.3, this.tower + l.y, l.laneZ); }
  }
  frame2(dt) {
    const l = this.localLanes()[0] || this.lanes[0]; if (l) { this.setNum(Math.round(l.score || 0), `Dive ${Math.min(3, l.diveN + 1)} of 3`); this.setTime(null); this.setMsg(this.replay ? 'Slow motion. For science.' : l.state === 'pump' ? (l.v < 0 ? 'Squeeze!' : 'Wait...') : ''); }
    if (this.garyDown) { this.garyF = Math.min(this.garyF, 1); const g = this.gary.group; g.position.y = Math.max(.2, g.position.y - dt * 7); g.rotation.z += dt * 9; if (g.position.y <= .2 && !this.garyS) { this.garyS = true; this.game.particles.splash(g.position.x, 0, g.position.z, .3); } } else { this.gary.group.position.x = 6 + Math.sin(this.t * .6) * 4; this.gary.group.position.z = -1 + Math.cos(this.t * .6) * 2; this.gary.group.rotation.y = this.t * .6 + Math.PI; }
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); const s = br.s; if (!l.bal) return {};
    if (l.state === 'pump') {
      const down = l.v < -.05 && (l.y > -.7), lateS = s.timing * 1.2; const pump = l.v < lateS * 4 && down;
      const wantT = skill === 'sharp' ? 5.4 : skill === 'average' ? 3.2 : 1.8;
      const hop = l.pumpT > wantT && l.y > -.2 && l.v > 1 && l.y < .2;
      return { lf: pump ? 1 : 0, rf: pump ? 1 : 0, hop };
    }
    if (l.state === 'air') {
      if (l.botPlan === undefined || l.planFor !== l.diveN) { l.planFor = l.diveN; l.botPlan = this.opts.botMode === 'grace' ? 180 : 90; l.stopErr = br.gauss() * s.timing * 2.4; }
      const deg = l.angle * 57.3, stick = l.botPlan === 180 ? 1 : .5, coast = Math.abs(l.spin) * 57.3 * .111 + 3;
      const stopped = deg + coast + l.spin * 57.3 * l.stopErr >= l.botPlan;
      return { x: stopped ? 0 : stick };
    }
    return {};
  }
  laneResult(i) { const l = this.lanes[i]; const bestType = l.dives.reduce((b, d) => (d.score > (b?.score ?? -1) ? d : b), null); return { form: l.form, big: Math.round(l.score), label: 'Best two dives', stats: bestType ? (bestType.type === 'splash' ? 'A perfect belly flop was involved.' : bestType.type === 'grace' ? 'Grace was involved.' : 'Technically a Dive.') : 'No dives. The sea is still waiting.' }; }
  forceFinish() { for (const l of this.lanes) this.tally(l); this.finish(); }
  forceThing() { for (const l of this.lanes) if (l.state === 'pump') this.launch(l, 7); }
}
