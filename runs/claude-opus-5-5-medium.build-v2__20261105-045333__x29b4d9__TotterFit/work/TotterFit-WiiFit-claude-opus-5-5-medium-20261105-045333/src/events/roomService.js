import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { RAPIER, G_PROP } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { box, at, cyl, sphere, cone, plankWalk, buoy, palm, lantern, bunting, bench, flat, mesh, cached } from '../art/props.js';
import { makeGull } from '../art/gull.js';
export class RoomService extends EventBase {
  static id = 'roomService'; static title = 'Room Service'; static discipline = 'Balance Play'; static instructor = 'trudy'; static place = 'The Boardwalk'; static music = 'balance'; static couch = true; static diagram = 'tray';
  static sentence = 'Alternate your feet to walk the tray of glasses to the cabana. Lean early and small when wind comes.';
  static can = 'You can lean into a gust before it arrives: the disc shows where.'; static cant = "You can't walk with the same foot twice. That is a stumble.";
  static verbs = [['left', 'Left'], ['right', 'Right'], ['lean', 'Lean'], ['flail', 'Flail']];
  static tiers = [{ length: 30, gust: 1.2, every: 7, gary: false, par: 560 }, { length: 45, gust: 2, every: 6, gary: true, par: 500 }, { length: 60, gust: 2.3, every: 5, gary: true, par: 440 }];
  balanceOpts() { return { margin: .8, ankleMax: 6, reflex: 5 }; }
  worldOpts() { return { iterations: 10 }; }
  buildSet() {
    this.len = this.tier.length; this.timeLimit = this.len * 3 + 30; const n = this.opts.laneCount || 1;
    for (let i = 0; i < n; i++) { const w = plankWalk(this.len + 3, 1.6); w.position.set(this.laneX(i, n), 0, 3); this.add(w); for (const s of [-1, 1]) for (let k = 0; k < this.len / 6; k++) this.add(at(cyl(.03, .03, .8, '#E9D3AE', 8), this.laneX(i, n) + s * .82, .4, -k * 6)); }
    // Far cabana and its table.
    const z0 = -this.len;
    const cab = new THREE.Group(); cab.add(at(box(5 + n * 2, .2, 4, '#C89B6A'), 0, -.1, -1)); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cab.add(at(cyl(.08, .1, 2.8, '#FFF8EE'), x * 2, 1.4, z * 1.4 - 1)); cab.add(at(cone(3.8, 1.5, '#2FA7A0', 4), 0, 3.5, -1));
    cab.add(at(cyl(.5, .5, .06, '#F5F0E0'), 0, .85, -.8)); cab.add(at(cyl(.05, .07, .85, '#7A5A3C'), 0, .42, -.8)); this.add(cab, 0, 0, z0 - 1.5); this.table = cab;
    this.add(palm(1.3), -5 - n, -.4, z0 - 2); this.add(palm(1.5), 5 + n, -.4, z0 - 1);
    this.buoys = []; for (let d = 10; d < this.len; d += 10) { this.add(buoy(d % 20 ? '#E8443A' : '#F5F0E0'), -3 - n, -.4, -d); this.add(buoy(d % 20 ? '#F5F0E0' : '#E8443A'), 3 + n, -.4, -d); }
    this.wobbly = []; if (this.tierIndex >= 1) for (let d = 7; d < this.len - 3; d += 9 - this.tierIndex) this.wobbly.push(d);
    this.gustT = this.tier.every * .6; this.telegraph = 0; this.gustDir = 1; this.streaks = [];
    this.sealine = cached('wstreak', () => new THREE.BoxGeometry(1.4, .02, .02)); for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(this.sealine, flat('#1A1420')); m.visible = false; this.add(m); this.streaks.push(m); }
    this.gary = makeGull(); this.gary.rig.play('fly'); this.gary.group.visible = false; this.add(this.gary.group); this.anim.push(this.gary); this.garyT = 12; this.garyS = null; this.leaderT = null;
  }
  placeCamera(snap) { const ls = this.lanes.filter(l => l.bal); if (!ls.length) return; let z = 0, x = 0; for (const l of ls) { z += l.bal.fz; x += l.bal.fx; } z /= ls.length; x /= ls.length; const spread = Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x); const d = this.game.rig.fitDistance(6.2, spread); this.game.rig.set(x, 3.2, z + d, x, 1.1, z - 2.5, snap); }
  start() {
    for (const l of this.lanes) {
      l.baseClip = 'carryTray'; l.doll.rig.play('carryTray', 0); l.steps = 0; l.lastFoot = null; l.lastStepT = -9; l.speed = 0; l.target = 0; l.prog = 0; l.lp = false; l.rp = false; l.glasses = []; l.delivered = false; l.deliv = 0; l.buoyAt = 0; l.rockT = 0; l.offX = 0; l.done = false; l.stumbles = 0; l.finishT = 0; l.sway = .03;
      if (!l.bal) continue;
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.3, .02, .3).setTranslation(0, .5, -.3).setMass(.04).setFriction(1).setCollisionGroups(G_PROP(l.id)), l.bal.body);
      const tray = new THREE.Group(); tray.add(box(.6, .04, .6, '#F5F0E0')); tray.position.set(0, 1.25, -.3); l.doll.lean.add(tray); l.trayM = tray;
      l.doll.setFace(Math.PI);
      this.placeGlasses(l, 5);
    }
  }
  placeGlasses(l, n) {
    const body = l.bal.body, b = body.translation(), q = new THREE.Quaternion().copy(body.rotation());
    const spots = [[0, -.06], [-.2, .06], [.2, .06], [-.15, -.2], [.15, -.2]]; // clear of the doll's own capsule
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(spots[i][0], .5 + .02 + .062, -.3 + spots[i][1]).applyQuaternion(q);
      const g = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(b.x + v.x, b.y + v.y, b.z + v.z).setLinearDamping(.1).setAngularDamping(.5).setCanSleep(false));
      this.world.createCollider(RAPIER.ColliderDesc.cylinder(.06, .05).setMass(.012).setFriction(.9).setRestitution(0).setCollisionGroups(G_PROP(l.id)), g);
      const m = new THREE.Group(); m.add(cyl(.055, .045, .12, ['#BDF2F2', '#F4A6C0', '#F7E04B', '#B9F26B', '#F5B896'][i % 5], 10)); this.group.add(m); l.glasses.push({ body: g, m, lost: false });
    }
  }
  removeGlass(l, g) { const i = l.glasses.indexOf(g); if (i >= 0) l.glasses.splice(i, 1); this.group.remove(g.m); this.world.removeRigidBody(g.body); }
  stepFoot(l, foot) {
    if (l.fallen || l.done) return;
    if (foot === l.lastFoot) { l.stumbles++; this.gust(l, (this.r() - .5) * 1.2, .5, .18); this.game.audio.sfx('clack', { f: 700 }); this.game.comic('STUMBLE', l.bal.fx, 1.8, l.bal.fz, '#FFF8EE', .55, .6); return; }
    l.lastFoot = foot; l.steps++; l.lastStepT = this.playT; l.target = .55 / .42;
    this.gust(l, (foot === 'L' ? -1 : 1) * .2, 0, .18);
    l.offX += l.bal.leanX * .25 * .55;
    l.doll.rig.play(foot === 'L' ? 'stepL' : 'stepR', .03, 'carryTray'); this.game.audio.sfx('foot', { high: foot === 'R' });
    for (const d of this.wobbly) if (Math.abs(l.prog - d) < .4) { this.gust(l, (this.r() - .5) * 1.4, (this.r() - .5) * .9, .25); this.game.audio.sfx('creak', { dur: .4 }); }
  }
  fixedPlay(dt) {
    this.gustT -= dt;
    if (this.gustT <= 1 && this.telegraph <= 0 && !this.gustFired) { this.gustDir = this.r() < .5 ? -1 : 1; this.telegraph = 1; this.gustFired = true; this.game.audio.sfx('wind', { dur: 1.5 }); if (!this.attract && this.barkT <= 0) this.bark('trudy', 'serviceGust'); }
    if (this.telegraph > 0) this.telegraph -= dt;
    if (this.gustT <= 0) { this.gustT = this.tier.every * (.85 + this.r() * .3); this.gustFired = false; for (const l of this.lanes) if (l.bal && !l.done) this.gust(l, this.gustDir * this.tier.gust, 0, .5); }
    if (this.tier.gary) { this.garyT -= dt; if (this.garyT <= 0 && !this.garyS) { this.garyT = 13; const l = this.lanes.find(q => q.bal && !q.done && q.glasses.length); if (l) { this.garyS = { l, t: 0 }; this.gary.rig.play('squawk', .05, 'fly'); this.game.audio.sfx('squawk'); } } }
    let allDone = true;
    for (const l of this.lanes) {
      if (!l.bal) continue;
      const I = l.in; const L = I.lf > .5, R = I.rf > .5; if (L && !l.lp) this.stepFoot(l, 'L'); if (R && !l.rp) this.stepFoot(l, 'R'); l.lp = L; l.rp = R;
      // Brace zone on the disc.
      l.brace = this.telegraph > 0 && !l.done ? { x: -this.gustDir * .2 * this.tier.gust * .9, z: 0 } : null;
      if (this.playT - l.lastStepT > .42 * 1.6) l.target = 0;
      l.speed += (l.target - l.speed) * (1 - Math.exp(-dt / .5));
      if (!l.fallen && !l.done) {
        l.prog += l.speed * dt;
        const fx = l.x + l.offX, fz = -l.prog; l.bal.moveFoot(fx, 0, fz);
        if (Math.abs(l.offX) > .8) this.goOverboard(l);
        for (; l.buoyAt + 10 <= l.prog; l.buoyAt += 10);
        if (l.prog >= this.len) { l.done = true; l.deliv = l.glasses.length; l.finishT = this.playT; l.target = 0; l.speed = 0; this.game.audio.sfx('bell'); this.game.comic('DELIVERED', fx, 2.2, fz, '#FFD23F', .8); if (l.kind === 'local') this.game.barkNow('trudy', 'serviceDone'); if (this.leaderT == null) this.leaderT = this.playT; }
      }
      if (!l.done) allDone = false;
      const tb = l.bal.body.translation();
      for (const g of [...l.glasses]) {
        const p = g.body.translation(); const dy = p.y - tb.y, dx = Math.hypot(p.x - tb.x, p.z - tb.z);
        if (!g.lost && (dy < -.1 || dx > .95)) { g.lost = true; this.game.audio.sfx('fruit'); if (l.kind === 'local') this.bark('trudy', 'serviceSpill'); this.game.rumble(l, .35, .12); }
        if (g.lost && (p.y < .1 || dx > 3)) { this.removeGlass(l, g); this.game.particles.burst(p.x, .1, p.z, 6, '#BDF2F2', 1.5, .05, .5, 1); }
      }
      this.tally(l);
    }
    if (this.garyS) { const s = this.garyS; s.t += dt; if (s.t > 1 && s.l.glasses.length && !s.took) { s.took = true; const g = s.l.glasses.find(q => !q.lost); if (g) { g.lost = true; const p = g.body.translation(); g.body.applyImpulse({ x: .012, y: .02, z: 0 }, true); this.game.comic('MINE', p.x, p.y + .5, p.z, '#FFF8EE', .55, .7); } } if (s.t > 2.4) { this.garyS = null; this.gary.group.visible = false; } }
    const clock = this.leaderT != null && this.lanes.length > 1 && this.playT - this.leaderT > 15;
    if (allDone || clock || this.playT > this.timeLimit) { for (const l of this.lanes) if (!l.done) { l.deliv = l.glasses.filter(g => !g.lost).length * (l.prog / this.len > .8 ? 1 : 0); this.tally(l); } this.finish(); }
  }
  goOverboard(l) {
    const p = l.bal.foot.translation(); this.game.audio.sfx('splash', { big: .8 }); this.game.particles.splash(p.x, 0, p.z, 1); this.game.comic('SPLOSH!', p.x, 1.6, p.z, '#BDF2F2'); if (l.kind === 'local') this.game.barkNow('trudy', 'serviceSplash'); l.falls++; if (l.kind === 'local') this.game.addFall();
    const keep = Math.max(0, l.glasses.filter(g => !g.lost).length - 1);
    for (const g of [...l.glasses]) this.removeGlass(l, g);
    l.prog = l.buoyAt; l.offX = 0; l.speed = 0; l.target = 0; l.bal.moveFoot(l.x, 0, -l.prog); l.bal.foot.setTranslation({ x: l.x, y: 0, z: -l.prog }, true); l.bal.fx = l.x; l.bal.fz = -l.prog; l.bal.reset();
    l.pendingGlass = keep; l.pendT = .05;
  }
  postPlay(dt) { for (const l of this.lanes) if (l.pendT > 0) { l.pendT -= dt; if (l.pendT <= 0) { this.placeGlasses(l, l.pendingGlass); } } for (const l of this.lanes) if (l.fallen) { for (const g of l.glasses) g.lost = true; } }
  tally(l) { const count = l.done ? l.deliv : l.glasses.filter(g => !g.lost).length; const timeBonus = l.done ? Math.max(0, 60 - (l.finishT - this.len * .8)) : 0; l.score = 100 * count + timeBonus; l.form = l.done ? Math.min(100, 100 * l.score / this.tier.par) : Math.min(100, (100 * l.score / this.tier.par) * (l.prog / this.len)); }
  onFall(l) { if (l.trayM) l.trayM.visible = false; }
  onRecover(l) { if (l.trayM) l.trayM.visible = true; l.doll.rig.play('carryTray', .1); l.pendingGlass = 0; const keep = Math.max(0, l.glasses.filter(g => !g.lost).length); for (const g of [...l.glasses]) this.removeGlass(l, g); l.pendingGlass = keep; l.pendT = .05; }
  frameLane(l) {
    if (!l.bal) return;
    for (const g of l.glasses) { const p = g.body.translation(), q = g.body.rotation(); g.m.position.set(p.x, p.y, p.z); g.m.quaternion.set(q.x, q.y, q.z, q.w); }
  }
  frame2(dt) {
    const l = this.localLanes()[0] || this.lanes[0]; if (l) { this.setNum(l.done ? l.deliv : l.glasses.filter(g => !g.lost).length, 'Glasses'); this.setTime(null); this.setMsg(l.done ? '' : `${Math.max(0, Math.ceil(this.len - l.prog))} m to the cabana`); }
    const on = this.telegraph > 0 || (this.gustT > this.tier.every - .6); const base = l?.bal ? l.bal.fz : 0;
    this.streaks.forEach((m, i) => { m.visible = on; if (on) { const sp = (this.t * 9 + i * 1.3) % 11 - 5.5; m.position.set(sp * this.gustDir * -1 + (l?.bal?.fx || 0), .5 + (i % 6) * .4, base - 1 - (i % 5) * 1.5); } });
    if (this.garyS) { const s = this.garyS, a = s.t / 2.4; this.gary.group.visible = true; const f = s.l.bal; this.gary.group.position.set(f.fx + 6 - a * 12, 1.6 + Math.abs(a - .42) * 8, f.fz + .3); this.gary.group.rotation.y = -Math.PI / 2; }
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l);
    l.stepT = (l.stepT || 0) - dt; l.lfT = (l.lfT || 0) - dt; l.rfT = (l.rfT || 0) - dt;
    if (l.stepT <= 0 && !l.done) { l.stepT = .42 * (1 + br.gauss() * br.s.cadence * .5); if (l.lastFoot === 'L') l.rfT = .05; else l.lfT = .05; }
    let gx = -l.offX * .8; const brace = this.telegraph > 0 || this.gustT > this.tier.every - .5 ? -this.gustDir * .2 * this.tier.gust : 0; gx += brace;
    if (this.opts.botMode === 'nobrace') gx = -l.offX * .8;
    const [x, z] = br.correct(dt, l, Math.max(-1, Math.min(1, gx)), 0, true, .55);
    return { x, z, lf: l.lfT > 0 ? 1 : 0, rf: l.rfT > 0 ? 1 : 0 };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: l.deliv, label: 'Glasses delivered', stats: `${l.steps} steps. Stumbles: ${l.stumbles}. Floor Exercises: ${l.falls}` }; }
  forceFinish() { for (const l of this.lanes) if (l.bal && !l.done) l.deliv = 0; this.finish(); }
  forceThing() { this.gustT = 1; }
}
