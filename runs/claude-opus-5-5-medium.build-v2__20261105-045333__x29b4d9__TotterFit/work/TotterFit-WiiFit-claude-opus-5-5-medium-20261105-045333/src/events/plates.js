import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { RAPIER, G_PROP } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { cyl, box, at, sphere, cone, torus, bunting, tree, toon, plate as plateMesh, mesh, cached } from '../art/props.js';
import { makeWalrus } from '../art/walrus.js';
import { el, txt } from '../ui/ui.js';
const BANDS = { L: [3.5, 5, '#3B82F6', .42, 'Large'], M: [6.5, 8, '#22C55E', .32, 'Medium'], S: [9.5, 11, '#E8443A', .23, 'Small'] };
const inBand = (k, w) => { const b = BANDS[k], mid = (b[0] + b[1]) / 2, half = (b[1] - b[0]) / 2 * T.plateBand; return Math.abs(w - mid) <= half; };
export class Plates extends EventBase {
  static id = 'plates'; static title = 'Plate Spinners'; static discipline = 'Cardio'; static instructor = 'bolster'; static place = 'The Circus Green'; static music = 'cardio'; static couch = true; static session = true; static diagram = 'circle';
  static sentence = 'Circle the stick to drive the hoop. Large plates want slow, small plates want fast.';
  static can = 'You can change speed to save another plate. It takes a moment.'; static cant = "You can't fall in this one. Only the plates can.";
  static verbs = [['circle', 'Circle']];
  static tiers = [{ plates: 'LMS', decay: .11 }, { plates: 'LMMS', decay: .13 }, { plates: 'LLMMSS', decay: .16 }];
  static sessionConfig = { tier: 0, time: 50 };
  buildSet() {
    this.noFall = true; this.timeLimit = this.opts.time || 60; this.flailOk = false; this.showDisc = true;
    this.add(cyl(11, 11.2, .6, '#7CC568', 40), 0, -.3, 0); this.add(cyl(4.5, 4.5, .02, '#FFF2C2', 40), 0, .012, 0);
    const tent = cone(3, 2, '#E8443A', 10); this.add(tent, -9, 4.2, -9); this.add(at(cyl(3, 3, 3.2, '#FFF8EE', 10), -9, 1.6, -9)); this.add(tree(1.4), 7.5, 0, -6); this.add(bunting(-6, 4.2, -5.2, 6.5, 4.2, -5.2, 18));
    this.walrus = makeWalrus(); this.add(this.walrus.group, 4.5, 0, -3.1); this.walrus.group.rotation.y = -.7; this.anim.push(this.walrus);
    this.shards = [];
  }
  placeCamera(snap) { const spread = this.lanes.length ? Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x) : 0; const d = this.game.rig.fitDistance(9, spread); this.game.rig.set(0, 5.3, d, 0, 1, -.3, snap); }
  setupHud2() { this.gaugeRow = el('div', 'gaugeRow'); this.hudEl.appendChild(this.gaugeRow); const l = this.lanes[0]; this.gauges = (l?.plates || []).map(p => { const a = el('div', 'arc'); a.innerHTML = `<svg viewBox="-55 -55 110 70" width="100%"><path d="M-44 8 A44 44 0 0 1 44 8" fill="none" stroke="#1A1420" stroke-width="16"/><path class="v" d="M-44 8 A44 44 0 0 1 44 8" fill="none" stroke="${BANDS[p.kind][2]}" stroke-width="10" pathLength="100" stroke-dasharray="70 100"/></svg>`; const lb = txt('div', 'gaugeTag', BANDS[p.kind][4]); a.appendChild(lb); this.gaugeRow.appendChild(a); return { v: a.querySelector('.v'), lb }; }); }
  start() {
    const kinds = this.tier.plates;
    for (const l of this.lanes) {
      l.w = 0; l.hoop = 0; l.phase = 0; l.lastAng = null; l.keyW = 0; l.lastTap = -9; l.lastKey = null; l.alive = 0; l.total = 0; l.crashes = 0; l.baseClip = 'hipCircle'; l.doll.rig.scrub('hipCircle', 0, 0); l.botPh = 0; l.botW = 0; l.sway = .02; l.bandGoal = null;
      const hoop = torus(.42, .035, '#F5B700'); hoop.rotation.x = Math.PI / 2; hoop.position.y = .72; l.doll.group.add(hoop); l.hoopM = hoop;
      const ringM = torus(.54, .03, '#FFF8EE'); ringM.rotation.x = Math.PI / 2; ringM.position.y = .03; l.doll.group.add(ringM); l.ringM = ringM;
      l.plates = [...kinds].map((k, i) => {
        const n = kinds.length; const a = -Math.PI * .85 + (i + .5) / n * Math.PI * .7 * 2 / 1.4 * .7 * 2; const R = this.lanes.length > 1 ? 1.2 : 2.6, x = l.x + Math.cos(a) * R, z = Math.sin(a) * R - .4;
        const pole = cyl(.03, .05, 1.9, '#FFF8EE'); pole.position.set(x, .95, z); this.group.add(pole);
        const grp = new THREE.Group(); grp.position.set(x, 1.95, z); const pm = plateMesh(BANDS[k][3], BANDS[k][2]); grp.add(pm); this.group.add(grp);
        return { kind: k, energy: .7, x, z, grp, pm, dead: 0, spin: 0 };
      });
    }
  }
  fixedPlay(dt) {
    const gain = .45 * T.plateGain, decay = this.tier.decay * T.plateDecay;
    for (const l of this.lanes) {
      if (l.kind === 'ghost') continue;
      const I = l.in; const usingKeys = I.dev === 'kbm' && (I.tapA || I.tapD || (this.t - l.lastTap < 1.2));
      if (I.tapA || I.tapD) { const k = I.tapA ? 'a' : 'd'; if (k !== l.lastKey) { const gap = this.t - l.lastTap; if (gap > .03 && gap < 1.4) l.keyW = Math.PI / gap; l.lastKey = k; l.lastTap = this.t; } }
      let target;
      if (usingKeys) { target = l.keyW; if (this.t - l.lastTap > .9) target = 0; }
      else {
        const m = Math.hypot(I.x, I.z);
        if (m > .5) { const a = Math.atan2(I.z, I.x); if (l.lastAng != null) { let d = a - l.lastAng; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; l.w += (Math.abs(d) / dt - l.w) * (1 - Math.exp(-dt / .12)); } l.lastAng = a; target = l.w; }
        else { l.w *= Math.exp(-3 * dt); l.lastAng = null; target = l.w; }
      }
      l.hoop += (target - l.hoop) * (1 - Math.exp(-dt / .5)); l.phase += l.hoop * dt;
      for (const p of l.plates) {
        l.total += dt;
        if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.energy = .7; p.grp.visible = true; this.game.audio.sfx('spring'); } continue; }
        l.alive += dt;
        const inb = inBand(p.kind, l.hoop); p.inBand = inb;
        p.energy += (inb ? gain - decay * 0 : -decay) * dt; p.energy = Math.min(1, p.energy);
        if (p.energy <= 0) this.smash(l, p);
      }
      l.score = l.total ? l.alive / l.total : 0;
      l.form = Math.max(0, 200 * l.score - 100);
    }
    if (this.playT >= this.timeLimit) this.finish();
  }
  smash(l, p) {
    p.dead = 6; p.grp.visible = false; l.crashes++; this.game.audio.sfx('crash'); this.game.comic('CRASH!', p.x, 2.2, p.z, '#FFD23F', .8); this.game.rumble(l, .6, .2);
    if (l.kind === 'local' && this.barkT <= 0) this.bark('bolster', 'plates');
    for (let i = 0; i < 6; i++) {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, 1.95, p.z).setLinvel((this.r() - .5) * 4, 1 + this.r() * 3, (this.r() - .5) * 4).setAngvel({ x: this.r() * 8, y: this.r() * 8, z: this.r() * 8 }));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.1, .02, .1).setMass(.02).setRestitution(.3).setCollisionGroups(G_PROP(l.id)), body);
      const m = box(.2, .04, .2, BANDS[p.kind][2]); this.group.add(m); this.shards.push({ body, m, left: 2.2 });
    }
  }
  postPlay(dt) { for (let i = this.shards.length - 1; i >= 0; i--) { const s = this.shards[i]; s.left -= dt; const q = s.body.rotation(), t = s.body.translation(); s.m.position.set(t.x, t.y, t.z); s.m.quaternion.set(q.x, q.y, q.z, q.w); if (s.left <= 0) { this.group.remove(s.m); this.world.removeRigidBody(s.body); this.shards.splice(i, 1); } } }
  frameLane(l, dt) {
    if (l.kind === 'ghost') return;
    l.doll.rig.scrub('hipCircle', (l.phase / 6.283) % 1, 0); if (l.hoopM) { l.hoopM.position.x = Math.cos(l.phase) * .12; l.hoopM.position.z = Math.sin(l.phase) * .12; }
    let band = null; for (const k in BANDS) if (inBand(k, l.hoop)) band = k; if (l.ringM) l.ringM.material = toon(band ? BANDS[band][2] : '#FFF8EE');
    for (const p of l.plates) {
      if (p.dead > 0) continue; const w = (1 - p.energy) * .6; p.spin += (3 + p.energy * 18) * dt; p.grp.rotation.y = p.spin; p.grp.rotation.x = Math.sin(this.t * 7 + p.x) * w; p.grp.rotation.z = Math.cos(this.t * 7 + p.x) * w;
    }
  }
  frame2(dt) { const l = this.localLanes()[0] || this.lanes[0]; if (!l) return; this.humT = (this.humT || 0) - dt; if (this.humT <= 0 && l.hoop > 1) { this.humT = .22; this.game.audio.sfx('plateHum', { f: 120 + l.hoop * 28 }); } this.setNum(`${Math.round(l.score * 100)}%`, 'Alive'); this.setTime(this.timeLimit - this.playT); if (this.gauges) l.plates.forEach((p, i) => { const g = this.gauges[i]; if (g) g.v.setAttribute('stroke-dasharray', `${(p.dead > 0 ? 0 : p.energy) * 100} 100`); }); }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); const s = br.s;
    l.botT = (l.botT || 0) - dt;
    if (l.botT <= 0) { l.botT = s.lag + .1;
      // Stay on the plate being fed until it is healthy, then go to the lowest one.
      if (!l.botPlate || l.botPlate.dead > 0 || l.botPlate.energy > .85) { let low = null; for (const p of l.plates) if (p.dead <= 0 && (!low || p.energy < low.energy)) low = p; l.botPlate = low; }
      if (l.botPlate) { const b = BANDS[l.botPlate.kind]; l.botGoal = (b[0] + b[1]) / 2; } }
    // Exactly the plan's skill table: the hand's speed wanders by the skill's speed error, and reaction lag sets how late it changes plate.
    l.botW += ((l.botGoal || 0) - l.botW) * (1 - Math.exp(-dt / .15)); const w = l.botW + Math.sin(this.t * 2.1) * s.speedErr;
    l.botPh += Math.max(.1, w) * dt;
    return { x: Math.cos(l.botPh) * .9, z: Math.sin(l.botPh) * .9 };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: `${Math.round(l.score * 100)}%`, label: 'Plates alive', stats: `Crashes: ${l.crashes}` }; }
  forceThing() { for (const l of this.lanes) { const p = l.plates?.find(q => q.dead <= 0); if (p) this.smash(l, p); } }
  onDispose() {}
}
