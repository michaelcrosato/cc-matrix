import { EventBase } from './base.js';
import { M, G, geo, add } from '../art/materials.js';
import { post, planks, palm, umbrella, buoy, WOOD, WOOD_D, CREAM, SAND, RED, TEAL } from '../art/props.js';
import { Gull, Walrus } from '../art/cast.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';
import { cos } from '../core/rng.js';

const SPOTS = [[0.55, 1.22, 0.05], [0.28, 1.12, 0.06], [0, 1.1, 0.05], [-0.28, 1.08, 0.06], [-0.5, 1.03, 0.05], [0.8, 1.18, 0.02], [-0.72, 0.98, 0.02], [0.14, 1.16, -0.05], [-0.14, 1.12, -0.05], [0.42, 1.2, -0.05], [-0.38, 1.08, -0.05], [0.65, 1.2, -0.04]];

/** Hold a plank pose. Gulls land on you and push. Being covered in gulls is a win condition. */
export class Plank extends EventBase {
  static id = 'plank';
  constructor(spec) {
    super(spec);
    this.god = true; this.seaLevel = -1.2; this.customPose = true;
    this.next = 2.5; this.side = this.r() < 0.5 ? -1 : 1; this.gulls = []; this.inT = 0; this.outT = 0; this.flops = 0; this.flopT = 0; this.flails = 0;
    this.spotI = 0;
  }
  setupLane(lane) { lane.doll.rig.loop('plank'); lane.bal.moveFoot(lane.x, 0, 0); }
  buildSet() {
    const g = this.group;
    add(g, M(geo.box(70, 1, 22), SAND, 0, -0.5, -3));
    const beam = G('', 0, 0.42, 0);
    add(beam, M(geo.box(2.6, 0.16, 0.5), WOOD), post(0.36, 0.06, WOOD_D, -1.1, -0.42, 0), post(0.36, 0.06, WOOD_D, 1.1, -0.42, 0));
    g.add(beam);
    const pier = planks(40, 4, { top: 0.8, thick: 0.2 });
    pier.position.set(0, 2, -7);
    g.add(pier);
    for (let i = 0; i < 8; i++) add(g, post(3, 0.14, WOOD_D, -18 + i * 5, -0.2, -5.4), post(3, 0.14, WOOD_D, -18 + i * 5, -0.2, -8.6));
    const u = umbrella(RED); u.position.set(-6, 0, -3); g.add(u);
    const u2 = umbrella(TEAL); u2.position.set(6.5, 0, -2); g.add(u2);
    const p = palm(3.6); p.position.set(-9, 0, -5); g.add(p);
    const b = buoy(); b.position.set(9, 0.4, -5); g.add(b);
    this.walrus = new Walrus();
    this.walrus.root.position.set(3.6, 0, -1);
    this.walrus.root.rotation.y = -0.5;
    this.walrus.rig.loop('stand');
    g.add(this.walrus.root);
    // The doll lies along x, head to screen right.
    const lane = this.lanes[0];
    lane.doll.root.position.set(0, 0.55, 0);
    this.game.setBackdrop(-45, -120);
  }
  cameraShot(snap) { this.game.rig.shot(0, 1.7, 6.4, 0, 1, 0, { snap, rate: 4 }); }
  hudSetup(hud) { hud.setScore(0, 'Gulls'); }
  start() { this.next = 2.5; if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', 'plank_intro'), { auto: 3, top: true }); }
  addGull() {
    const c = this.cfg;
    const push = c.push[0] + this.r() * (c.push[1] - c.push[0]);
    if (this.r() > 0.7) this.side = -this.side;
    const gull = new Gull();
    const i = this.spotI++ % SPOTS.length;
    const s = SPOTS[i];
    const dir = this.side;
    const spot = [Math.abs(s[0]) * dir, s[1], s[2]];
    const from = [dir * 9 + cos(-1, 1), 5 + cos(0, 2), -3 + cos(-1, 1)];
    gull.root.position.set(...from);
    gull.root.rotation.y = -dir * 1.2;
    gull.rig.loop('fly');
    this.group.add(gull.root);
    this.gulls.push({ gull, push: push * dir, t: 0, dur: 1.2, from, spot, landed: false, leave: false });
    this.game.audio.sfx('squawk');
    this.bark('bolster', 'gull', 2.2, 8);
  }
  netPush() { let n = 0; for (const g of this.gulls) if (g.landed && !g.leave) n += g.push; return n; }
  scatter() {
    for (const g of this.gulls) if (!g.leave) { g.leave = true; g.t = 0; g.from = [g.gull.root.position.x, g.gull.root.position.y, g.gull.root.position.z]; g.spot = [Math.sign(g.push) * 12, 7, -6]; g.dur = 1.3; g.landed = false; g.gull.rig.loop('fly'); }
  }
  fixedEvent(dt) {
    const c = this.cfg, lane = this.lanes[0], b = lane.bal;
    b.sway = c.sway; b.tremor = 0.05;
    this.next -= dt;
    if (this.next <= 0 && this.t < c.time - 2 && this.flopT <= 0) { this.next = c.every; this.addGull(); }
    for (let i = this.gulls.length - 1; i >= 0; i--) {
      const g = this.gulls[i];
      g.t += dt;
      const k = Math.min(1, g.t / g.dur), e = k * k * (3 - 2 * k), r = g.gull.root;
      if (!g.landed) {
        r.position.set(g.from[0] + (g.spot[0] - g.from[0]) * e, g.from[1] + (g.spot[1] - g.from[1]) * e + (g.leave ? 0 : Math.sin(k * 3.14) * 0.5), g.from[2] + (g.spot[2] - g.from[2]) * e);
        if (k >= 1) {
          if (g.leave) { this.group.remove(r); this.gulls.splice(i, 1); continue; }
          g.landed = true; g.gull.rig.loop('stand'); g.gull.rig.once('land');
          this.game.audio.sfx('gullLand');
          this.game.input.rumble(0.05, 0.25, 90);
        }
      }
    }
    b.extX += this.netPush() * this.diff.dist;
    const r = Math.hypot(lane.dotX, lane.dotZ), inZone = r < c.zone;
    if (this.flopT > 0) {
      this.flopT -= dt;
      if (this.flopT <= 0) { lane.bal.recover(); this.game.audio.sfx('spring'); }
    } else if (inZone) { this.inT += dt; this.outT = 0; } else {
      this.outT += dt;
      if (this.outT > 2) {
        this.flopT = 1.6; this.outT = 0; this.flops++;
        lane.falls++;
        this.scatter();
        this.game.audio.sfx('fall'); this.game.comic.pop('FLOMP!', 0, 1.5, 0); this.game.rig.shake(0.07);
        this.game.onFloorExercise();
        this.game.input.rumble(0.8, 0.6, 280);
        if (lane.kind === 'local') this.bark('bolster', 'flop', 2.6, 1);
      }
    }
  }
  flailed(lane) {
    if (this.gulls.some((g) => !g.leave)) {
      this.flails++;
      this.scatter();
      this.game.audio.sfx('squawk');
      this.walrus.rig.once('salute');
      if (lane.kind === 'local') this.bark('bolster', 'shake_off', 2.6, 2);
    }
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    // Counter the net push. It takes K − G of stiffness to hold it still.
    const d0 = bot.data;
    d0.known = (d0.known || 0) + (this.netPush() - (d0.known || 0)) * (1 - Math.exp(-(1 / 120) / (bot.s.lag + 0.9)));
    const gx = (-d0.known / 3.3) * 0.75;
    const [x, z] = bot.steer(Math.max(-0.9, Math.min(0.9, gx)), 0);
    out.wishX = x; out.wishZ = z;
    bot.data.out = Math.hypot(lane.dotX, lane.dotZ) > this.cfg.zone ? (bot.data.out || 0) + 1 / 120 : 0;
    out.flail = bot.data.out > 1.2 && lane.bal.lean > 0.2 && lane.bal.flailCool <= 0;
  }
  hud() {
    const hud = this.game.hud;
    hud.setTime(this.cfg.time - this.t);
    hud.setScore(this.gulls.filter((g) => g.landed && !g.leave).length, 'Gulls');
    const lane = this.lanes[0];
    lane.discView.zone = { x: 0, z: 0, r: this.cfg.zone, on: Math.hypot(lane.dotX, lane.dotZ) < this.cfg.zone };
  }
  frameEvent(dt) {
    const lane = this.lanes[0], d = lane.doll, b = lane.bal;
    // Lying flat along x. The doll rocks with the core.
    d.root.position.set(0, this.flopT > 0 ? 0.3 : 0.6, 0);
    d.root.rotation.set(b.leanZ * 0.3, 0, Math.PI / 2 * 0 - b.leanX * 0.3);
    d.facing.rotation.set(0, 0, 0);
    d.facing.rotation.y = Math.PI / 2;
    d.facing.rotation.z = 0;
    d.facing.rotation.x = 0;
    d.joints.hips.rotation.x = Math.PI / 2 * 1;
    for (const g of this.gulls) {
      g.gull.update(dt);
      if (g.landed && !g.leave) { g.gull.root.position.y = g.spot[1] - 0.1 + (this.flopT > 0 ? -0.3 : 0) - b.leanX * 0.3 * g.spot[0]; }
    }
    if (this.walrus) this.walrus.update(dt);
  }
  isDone() { return this.t >= this.cfg.time; }
  laneResult() {
    const share = (100 * this.inT) / this.cfg.time;
    const on = this.gulls.filter((g) => g.landed && !g.leave).length;
    const raw = share + on * 0.5 - this.flails * 4;
    return { form: (100 * raw) / this.cfg.par, raw, big: Math.round(raw), stats: `${Math.round(share)}% in the zone · ${on} gulls still on you · ${this.flops} flops` };
  }
}
export { h, CREAM };
