import * as THREE from 'three/webgpu';
import { Fn, uniform, length, sin, mix, positionWorld, time, vec2, smoothstep, vec3, step, float } from 'three/tsl';
import { EventBase, lerp } from './base.js';
import { sphere, box, at, cyl, cone, torus, palm, tree, mesh, cached, rock } from '../art/props.js';
import { makeHeron } from '../art/heron.js';
import { makeGull } from '../art/gull.js';
import { PU } from '../render/palette.js';
const CREATURES = ['Dragonfly', 'Frog', 'Koi', 'Turtle', 'Ms. Stillwater'];
export class StillWater extends EventBase {
  static id = 'stillWater'; static title = 'Still Water'; static discipline = 'Stillness'; static instructor = 'stillwater'; static place = 'The Lily Pond'; static music = 'stillness'; static diagram = 'ring';
  static sentence = 'Sit on a lily pad. Stay in the calm zone. Creatures come if you are boring enough.';
  static can = 'You can stifle a sneeze with Flail, when you hear it coming.'; static cant = "You can't fall in this one. You can only be disappointing.";
  static verbs = [['lean', 'Lean'], ['breath', 'Breathe'], ['flail', 'Stifle']];
  static tiers = [{ zone: .15, sway: [.07, .18], tremor: .05, sneezes: 2 }, { zone: .12, sway: [.1, .22], tremor: .05, sneezes: 3 }, { zone: .1, sway: [.12, .26], tremor: .05, sneezes: 4 }];
  buildSet() {
    this.usesBreath = true; this.noFall = true; this.timeLimit = 60; this.flailOk = true;
    this.uRipple = uniform(0);
    const m = new THREE.MeshBasicNodeMaterial();
    const rip = this.uRipple;
    m.colorNode = Fn(() => {
      const d = length(positionWorld.xz.sub(vec2(0, 0)));
      const w = sin(d.mul(6).sub(time.mul(2.2))).mul(.5).add(.5);
      const rings = step(float(.78).sub(rip.mul(.5)), w).mul(smoothstep(float(2).add(rip.mul(10)), float(.5), d).mul(rip.mul(.92).add(.08)));
      const base = mix(vec3(.25, .55, .5), PU.seaHi, sin(positionWorld.x.mul(.8).add(time.mul(.2))).mul(sin(positionWorld.z.mul(.7))).mul(.14).add(.12));
      return mix(base, vec3(1, 1, .95), rings);
    })();
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 56), m); pond.rotation.x = -Math.PI / 2; pond.position.y = .02; this.add(pond);
    const bank = torus(9.5, .9, '#9CC97A'); bank.rotation.x = Math.PI / 2; this.add(bank, 0, -.2, 0);
    const pad = cyl(.95, .9, .07, '#4FB56A', 28); this.add(pad, 0, .03, 0); this.pad = pad;
    for (let i = 0; i < 12; i++) { const a = i * 2.3 + .4, d = 3 + (i % 4) * 1.2; const p = cyl(.45 + (i % 3) * .15, .4, .04, i % 2 ? '#4FB56A' : '#67C47D', 16); this.add(p, Math.cos(a) * d, .04, Math.sin(a) * d); if (i % 3 === 0) { const f = sphere(.13, '#F4A6C0', 1, .7, 1); this.add(f, Math.cos(a) * d, .14, Math.sin(a) * d); } }
    for (let i = 0; i < 8; i++) { const a = i * .8; this.add(at(cyl(.03, .04, 1.4, '#6FA84F', 6), Math.cos(a) * 9.1, .6, Math.sin(a) * 9.1 - .2)); }
    this.add(palm(1.5), -9, 0, -7); this.add(tree(1.4), 8.6, 0, -6); this.add(rock(.8), 6, .1, -7);
    // Creatures
    const fly = new THREE.Group(); fly.add(at(sphere(.03, '#2FA7A0', 1, 1, 2.6), 0, 0, 0)); for (const s of [-1, 1]) { const w = sphere(.06, '#BDF2F2', 1.5, .1, .5); fly.add(at(w, s * .08, .01, 0)); } this.dragonfly = fly; fly.visible = false; this.add(fly);
    const frog = new THREE.Group(); frog.add(sphere(.12, '#5BB04D', 1.1, .8, 1.2)); for (const s of [-1, 1]) frog.add(at(sphere(.04, '#1A1420'), s * .07, .09, .08)); this.frog = frog; frog.visible = false; this.add(frog);
    const koi = new THREE.Group(); koi.add(sphere(.16, '#F58A2E', .6, .4, 1.5)); koi.add(at(sphere(.06, '#FFF8EE', 1, .6, 1), 0, .05, .08)); const tail = cone(.09, .2, '#F58A2E', 4); tail.rotation.x = -1.57; koi.add(at(tail, 0, 0, -.28)); this.koi = koi; koi.visible = false; this.add(koi);
    const turtle = new THREE.Group(); turtle.add(sphere(.22, '#4F8A5B', 1, .55, 1.15)); turtle.add(at(sphere(.07, '#8DBA76'), 0, .02, .28)); this.turtle = turtle; turtle.visible = false; this.add(turtle, -1.4, .06, .4);
    this.heron = makeHeron(); this.heron.group.scale.setScalar(1.1); this.add(this.heron.group, -5.5, .03, -3.5); this.heron.group.rotation.y = .9; this.anim.push(this.heron); this.heronT = 0;
    this.sneezeAt = []; const n = this.tier.sneezes; for (let i = 0; i < n; i++) this.sneezeAt.push(10 + (i + .2 + this.r() * .6) * (46 / n)); this.sneezeState = null;
    this.whisperT = 8; this.reached = 0;
  }
  placeCamera(snap) { this.game.rig.set(0, 5.4, 6.8, 0, .55, 0, snap); }
  start() { for (const l of this.lanes) { l.calm = 0; l.inT = 0; l.totalT = 0; l.baseClip = 'sit'; l.doll.rig.play('sit', 0); l.customPose = true; l.zone = { x: 0, z: 0, r: this.tier.zone }; l.sway = this.tier.sway[0]; l.tremor = this.tier.tremor; l.peak = 0; l.motion = 0; } }
  fixedPlay(dt) {
    const a = this.playT / this.timeLimit; const l = this.lanes[0];
    for (const la of this.lanes) la.sway = lerp(this.tier.sway[0], this.tier.sway[1], a);
    if (this.sneezeAt.length && this.playT > this.sneezeAt[0] && !this.sneezeState) { this.sneezeAt.shift(); this.sneezeState = { left: 1.2 }; this.setMsg('Ah... ah...'); this.game.audio.speak('kevin', 'Ah... ah...'); for (const la of this.lanes) la.stifled = false; }
    if (this.sneezeState) {
      this.sneezeState.left -= dt;
      for (const la of this.lanes) if (la.in.flail) la.stifled = true;
      if (this.sneezeState.left <= 0) { this.setMsg(''); for (const la of this.lanes) if (!la.stifled && la.bal) { const ang = this.r() * 6.283; this.gust(la, Math.cos(ang) * 2.2, Math.sin(ang) * 2.2, .3); this.game.audio.sfx('sneeze'); this.game.comic('ACHOO!', la.x, 1.6, 0, '#FFF8EE', .9); } this.sneezeState = null; }
    }
    this.whisperT -= dt; if (this.whisperT <= 0 && !this.attract) { this.whisperT = 13; if (this.r() < .5) this.game.barkNow('trudy', 'whisper'); else this.game.barkNow('stillwater', 'pond'); }
    for (const la of this.lanes) {
      if (!la.bal) continue;
      const d = Math.hypot(la.bal.cobX, la.bal.cobZ), inz = d <= la.zone.r; la.totalT += dt; if (inz) la.inT += dt;
      const was = la.calm; la.calm = Math.max(0, Math.min(1, la.calm + (inz ? dt / 30 : -dt / 8) * (la.breathSync ? 1.25 : 1))); la.peak = Math.max(la.peak, la.calm);
      la.form = 100 * ((la.inT / Math.max(.01, this.timeLimit)) + la.calm) / 2;
      if (la.kind === 'local') for (let k = 1; k <= 5; k++) { const th = k * .2; if (was < th && la.calm >= th) { this.game.audio.sfx('marble', { r: k * .1 }); this.game.ui.toast(`${CREATURES[k - 1]} has arrived.`); this.bark('stillwater', k === 5 ? 'pat' : 'creature'); } if (was >= th && la.calm < th && k === 1) { this.bark('stillwater', 'scatter'); } }
      const w = la.bal.body.angvel(); la.motion += (Math.min(1, Math.hypot(w.x, w.z) * 1.2) - la.motion) * .03;
    }
    if (this.playT >= this.timeLimit) this.finish();
  }
  frameLane(l, dt) {
    if (!l.bal) return;
    const lx = l.bal.leanX * .55, lz = l.bal.leanZ * .55;
    l.doll.group.position.set(0, .07, 0); l.doll.setLean(lx, lz);
    l.doll.inner.position.y = -.27;
    if (this.pad) this.pad.rotation.set(lz * .3, 0, -lx * .3);
    if (l.id !== 0) return;
    this.uRipple.value = l.motion;
    const c = l.calm, t = this.t;
    this.dragonfly.visible = c >= .2; if (c >= .2) { this.dragonfly.position.set(Math.sin(lx) * 1.3, 1.17, .3 + Math.sin(lz) * 1.3); this.dragonfly.rotation.y = Math.sin(t) * .3; }
    this.frog.visible = c >= .4; if (c >= .4) this.frog.position.set(Math.sin(lx) * 1.4, 1.42, Math.sin(lz) * 1.4);
    this.koi.visible = c >= .6; if (c >= .6) { this.koi.position.set(Math.cos(t * .6) * 2.2, .1, Math.sin(t * .6) * 2.2); this.koi.rotation.y = -t * .6; }
    this.turtle.visible = c >= .8;
    const wantH = c >= 1 ? 1 : 0; this.heronT += (wantH - this.heronT) * .01;
    this.heron.group.position.set(lerp(-5.5, -1.1, this.heronT), .03, lerp(-3.5, -.6, this.heronT));
    if (wantH && this.heronT > .9 && this.heron.rig.currentName !== 'pat') this.heron.rig.play('pat', .3);
  }
  frame2() { const l = this.localLanes()[0] || this.lanes[0]; if (l) { this.setNum(`${Math.round(l.calm * 100)}%`, 'Calm'); this.setTime(this.timeLimit - this.playT); } }
  botInput(i, t, skill, dt) { const l = this.lanes[i], br = this.botBrain(l); const [x, z] = br.correct(dt, l, 0, 0); return { x, z, breath: (this.t % 8) < 4, flail: !!this.sneezeState && this.sneezeState.left < .9 && this.sneezeState.left > .8 }; }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: `${Math.round(l.peak * 100)}%`, label: 'Peak calm', stats: `Time in the zone: ${Math.round(100 * l.inT / Math.max(1, l.totalT))}%` }; }
  forceThing() { this.sneezeState = { left: 1.2 }; this.setMsg('Ah... ah...'); for (const la of this.lanes) la.stifled = false; }
}
