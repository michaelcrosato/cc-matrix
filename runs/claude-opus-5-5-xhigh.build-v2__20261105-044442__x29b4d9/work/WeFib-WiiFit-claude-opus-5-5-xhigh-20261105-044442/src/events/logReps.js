import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { groups } from '../physics/world.js';
import { M, G, geo, add } from '../art/materials.js';
import { post, crate, WOOD_D, WOOD, RED, TEAL, CREAM, tree } from '../art/props.js';
import { Walrus } from '../art/cast.js';
import { tun } from '../core/tuning.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const TEMPO = { down: 2, pause: 0.5, up: 2, rest: 0.5 };
const REP = TEMPO.down + TEMPO.pause + TEMPO.up + TEMPO.rest;
const DEG = Math.PI / 180;

/** A log on your shoulders, a tempo ribbon, and a walrus who can't count. */
export class LogReps extends EventBase {
  static id = 'logReps';
  constructor(spec) {
    super(spec);
    this.balanceParams = { margin: 0.8, ankleMax: 6 };
    this.seaLevel = -3;
    this.rep = 0; this.repT = 0; this.repLen = REP;
    this.totalReps = this.cfg.reps + (this.cfg.noBonus ? 0 : 2);
    this.bonusFrom = this.cfg.noBonus ? 99 : this.cfg.reps;
    this.total = this.totalReps * REP;
    this.finished = false; this.saidLast = false;
  }
  setupLane(lane) {
    lane.depth = 0; lane.bandT = 0; lane.zoneT = 0; lane.repN = 0; lane.score = 0; lane.maxScore = 0; lane.offset = 0; lane.logFall = 0; lane.logLost = false; lane.lastRepScore = 0;
    lane.logBody = null;
    const log = lane.logMesh = G('log', 0, 1.18, -0.08);
    add(log, M(geo.cyl(0.11, 0.11, 2.3, 14), 0x9A6E3E, 0, 0, 0, { rot: [0, 0, Math.PI / 2] }), M(geo.cyl(0.115, 0.115, 0.02, 14), 0xE4C491, 1.15, 0, 0, { rot: [0, 0, Math.PI / 2], shadow: false }), M(geo.cyl(0.115, 0.115, 0.02, 14), 0xE4C491, -1.15, 0, 0, { rot: [0, 0, Math.PI / 2], shadow: false }));
    lane.doll.root.add(log);
    lane.doll.rig.scrub('squat', 0, { fade: 0 });
    lane.bandHW = 0.16;
  }
  buildSet() {
    const g = this.group, n = this.lanes.length, w = Math.max(12, n * 3.2 + 8);
    add(g, M(geo.box(w + 12, 1, 14), 0xE6CDA0, 0, -0.5, -1));
    for (let i = 0; i < 8; i++) add(g, M(geo.box(w + 12, 0.01, 0.1), 0xD2B684, 0, 0.005, -7 + i * 2));
    add(g, post(3, 0.16, WOOD_D, -w / 2 + 0.5, 0, -4), post(3, 0.16, WOOD_D, w / 2 - 0.5, 0, -4), M(geo.cyl(0.13, 0.13, w, 12), WOOD, 0, 2.9, -4, { rot: [0, 0, Math.PI / 2] }));
    for (let i = 0; i < 4; i++) add(g, M(geo.cyl(0.22, 0.22, 2.6, 12), WOOD_D, -w / 2 + 1.8 + (i % 2) * 0.1, 0.22 + (i > 1 ? 0.38 : 0), -2.6 - (i % 2) * 0.45, { rot: [0, 0, Math.PI / 2] }));
    const c = crate(1); c.position.set(w / 2 - 1.2, 0, -2); g.add(c);
    this.addWatchers([[w / 2 - 2.6, 0, -3, -0.4], [w / 2 - 3.8, 0, -3.3, -0.2], [1.6, 0, -3.6, 0.1]]);
    for (const [x, z] of [[-w / 2 - 1.5, -5.5], [w / 2 + 1, -6], [2, -8]]) { const t = tree(2.6, 1.3); t.position.set(x, 0, z); g.add(t); }
    this.walrus = new Walrus();
    this.walrus.root.position.set(this.lanes[0].x - 2.3, 0, -0.6);
    this.walrus.root.rotation.y = 0.45;
    g.add(this.walrus.root);
    this.walrus.rig.loop('bounce');
    this.game.setBackdrop(60, -130);
  }
  cameraShot(snap) {
    const n = this.lanes.length, d = this.game.rig.fitDistance(7.6, (n - 1) * 3.2 + 3);
    const px = n > 1 ? 0 : -1.5;
    this.game.rig.shot(px, 2, d, n > 1 ? 0 : -0.7, 1.05, 0, { snap, rate: 4 });
    this.inputYaw = n > 1 ? 0 : Math.atan2(px + 0.7, d);
  }
  hudSetup(hud) {
    const wrap = h('div.tag', { style: 'position:relative;width:9rem;height:38rem;padding:0;overflow:hidden' });
    this.bandEl = h('div', { style: 'position:absolute;left:0;right:0;background:#9BE08F;border-top:.4rem solid #2F8F46;border-bottom:.4rem solid #2F8F46' });
    this.depthEl = h('div', { style: 'position:absolute;left:0;right:0;height:1rem;background:#1A1420' });
    wrap.append(this.bandEl, this.depthEl);
    this.ribbon = hud.addWidget(wrap, true);
    hud.setScore(0, 'Rep');
  }
  start() { if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', 'intro'), { auto: 3, top: true }); }
  tempoAt(t) {
    // Where the ribbon is, 0 up to 1 down, at this time into a rep.
    const k = tun.repTempo;
    const down = TEMPO.down / k, pause = TEMPO.pause / k, up = TEMPO.up / k;
    if (t < down) return t / down;
    if (t < down + pause) return 1;
    if (t < down + pause + up) return 1 - (t - down - pause) / up;
    return 0;
  }
  get repLength() { return REP / tun.repTempo; }
  fixedEvent(dt) {
    const c = this.cfg;
    this.repT += dt;
    const fat = Math.min(1, this.rep / Math.max(1, this.totalReps - 1));
    const sway = this.ramp(c.sway[0], c.sway[1], fat), tremor = this.ramp(c.tremor[0], c.tremor[1], fat);
    const target = this.tempoAt(this.repT);
    const hw = this.ramp(c.band[0], c.band[1], fat);
    this.target = target; this.bandHW = hw;
    const shake = this.ramp(0.015, 0.07, fat) * Math.sin(this.t * 19);
    for (const lane of this.lanes) {
      if (!lane.bal) continue;
      const b = lane.bal, i = lane.input;
      b.sway = sway; b.tremor = tremor;
      if (i.device === 'kbm' && lane.kind === 'local') {
        const both = i.footL > 0.5 && i.footR > 0.5;
        lane.depth = Math.max(0, Math.min(1, lane.depth + (both ? 1 : -1) * (dt / (TEMPO.down / tun.repTempo))));
        // Keys are on or off: when you are doing what the ribbon is doing, depth closes on it, so a late press can recover.
        const ribbonDown = this.repT < (TEMPO.down + TEMPO.pause) / tun.repTempo;
        if (both === ribbonDown) lane.depth += (target - lane.depth) * (1 - Math.exp(-1.6 * dt));
      } else lane.depth = (i.footL + i.footR) / 2;
      const measured = lane.depth + shake;
      // The log is a rule, not a contact: a number that grows with sideways lean.
      if (!lane.logLost && !lane.fallen) {
        const deg = b.leanX / DEG;
        if (Math.abs(deg) > 6) lane.offset += 0.05 * (Math.abs(deg) - 6) * Math.sign(deg) * dt;
        else lane.offset += -Math.sign(lane.offset) * Math.min(Math.abs(lane.offset), 0.03 * dt);
        b.extX += 0.06 * 9.81 * lane.offset;
        if (Math.abs(lane.offset) >= 0.5) this.dropLog(lane);
      }
      if (!lane.fallen && !lane.logLost) {
        if (Math.abs(measured - target) < hw) lane.bandT += dt;
        if (Math.hypot(lane.dotX, lane.dotZ) < c.zone) lane.zoneT += dt;
      }
      if (lane.logMesh && !lane.logLost) lane.logMesh.position.x = lane.offset;
      lane.lean = Math.abs(b.leanX);
      if (lane.kind === 'local' && fat > 0.3 && this.t % 2 < dt) this.game.input.rumble(0.1 + fat * 0.3, 0.1 + fat * 0.2, 180);
      if (lane.kind === 'local' && b.lean > 0.38) this.bark('bolster', 'near', 2, 5);
    }
    if (this.repT >= this.repLength) this.endRep();
    for (const lane of this.lanes) if (lane.logBody) this.updateFallingLog(lane, dt);
  }
  endRep() {
    const len = this.repLength;
    const worth = this.rep >= this.bonusFrom ? 2 : 1;
    for (const lane of this.lanes) {
      if (!lane.bal) continue;
      const s = (lane.bandT / len) * (0.5 + 0.5 * (lane.zoneT / len));
      lane.score += s * worth; lane.maxScore += worth;
      lane.lastRepScore = s;
      lane.bandT = 0; lane.zoneT = 0; lane.repN++;
    }
    this.rep++; this.repT = 0;
    this.game.audio.sfx('thud', { pitch: 150 });
    const solo = this.mode === 'solo';
    if (this.rep === this.bonusFrom - 1 && solo) this.game.speech.say('bolster', "That's the last one!", { auto: 2.2, top: true });
    else if (this.rep === this.bonusFrom && solo) { this.game.speech.say('bolster', "...THIS one's the last one. I've lied to you and I'd do it again.", { auto: 3, top: true }); this.game.hud.setNote('Two bonus reps. Worth double.', 2.6); this.walrus.rig.once('inhale'); }
    else if (solo && this.rep < this.bonusFrom - 1) this.game.speech.say('bolster', line('bolster', 'rep', { n: this.rep }), { auto: 2.2, top: true });
    if (this.rep >= this.totalReps) this.finished = true;
    this.walrus.rig.once(this.rep % 2 ? 'clap' : 'bounce');
  }
  dropLog(lane) {
    lane.logLost = true;
    lane.logMesh.visible = false;
    const b = lane.bal.body.translation();
    const off = lane.offset;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(b.x + off, b.y + 0.5, b.z).setCanSleep(false));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.15, 0.11, 0.11).setMass(0.1).setFriction(0.7).setCollisionGroups(groups.prop(lane.id)), body);
    lane.logBody = body;
    const m = G();
    add(m, M(geo.cyl(0.11, 0.11, 2.3, 14), 0x9A6E3E, 0, 0, 0, { rot: [0, 0, Math.PI / 2] }));
    this.group.add(m);
    lane.logFree = m;
    lane.logFall = 1.6;
    lane.offset = 0;
    this.game.audio.sfx('clack');
    this.walrus.rig.once('catch');
    if (lane.kind === 'local') this.bark('bolster', 'log_drop', 2.4, 2);
  }
  updateFallingLog(lane, dt) {
    lane.logFall -= dt;
    if (lane.logFall <= 0) {
      this.world.removeRigidBody(lane.logBody);
      lane.logBody = null;
      this.group.remove(lane.logFree);
      lane.logFree = null;
      lane.logLost = false;
      lane.logMesh.visible = true;
      lane.logMesh.position.x = 0;
    }
  }
  onFall(lane) { if (lane.kind === 'local') this.bark('bolster', 'fall', 2.6, 3); lane.bandT = 0; lane.zoneT = 0; }
  flailed(lane) { if (lane.kind === 'local') this.bark('bolster', 'flail', 2, 6); }
  botInput(lane, t, bot) {
    const out = lane.input;
    const [x, z] = bot.steer(0, 0, true);
    out.wishX = x; out.wishZ = z;
    // Follow the ribbon, a moment late, with a tracking error.
    const err = { sharp: 0.05, average: 0.12, clumsy: 0.2 }[bot.skillName] ?? 0.12;
    const tt = Math.max(0, this.repT - bot.s.delay * 0.25);
    const v = Math.max(0, Math.min(1, this.tempoAt(tt) + err * Math.sin(bot.t * 3.1 + bot.ph)));
    out.footL = v; out.footR = v;
    out.flail = !lane.fallen && lane.bal.lean > 0.6 && lane.bal.flailCool <= 0;
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    const shown = this.rep < this.bonusFrom ? `${Math.min(this.rep + 1, this.cfg.reps)}/${this.cfg.reps}` : `${this.cfg.reps}+${this.rep - this.bonusFrom + 1}`;
    hud.setScore(shown, 'Rep');
    hud.setTime(null);
    if (this.bandEl) {
      const tg = this.target ?? 0, hw = this.bandHW ?? 0.16;
      this.bandEl.style.top = `${Math.max(0, (tg - hw) * 100)}%`;
      this.bandEl.style.height = `${hw * 200}%`;
      this.depthEl.style.top = `calc(${(me.depth || 0) * 100}% - .5rem)`;
    }
    for (const lane of this.lanes) lane.discView.zone = { x: 0, z: 0, r: this.cfg.zone, on: Math.hypot(lane.dotX, lane.dotZ) < this.cfg.zone };
  }
  frameEvent(dt) {
    for (const lane of this.lanes) {
      if (lane.doll && !lane.fallen && lane.kind !== 'ghost') {
        lane.doll.rig.scrub('squat', lane.depth || 0);
        if (lane.logMesh) lane.logMesh.position.y = 1.18 - (lane.depth || 0) * 0.27;
      }
      if (lane.logBody && lane.logFree) { const p = lane.logBody.translation(), q = lane.logBody.rotation(); lane.logFree.position.set(p.x, p.y, p.z); lane.logFree.quaternion.set(q.x, q.y, q.z, q.w); }
    }
    if (this.walrus) this.walrus.update(dt);
  }
  isDone() { return this.finished; }
  laneResult(lane) {
    const form = lane.maxScore ? (100 * lane.score) / lane.maxScore : 0;
    return { form, raw: lane.score, big: Math.round(form), stats: `${lane.repN} reps · ${lane.falls} floor exercises` };
  }
}
export { THREE, TEAL, CREAM, RED };
