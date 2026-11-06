import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { Ragdoll } from '../physics/ragdoll.js';
import { M, G, geo, add } from '../art/materials.js';
import { CREAM, RED, TEAL, BLUE, buoy, palm } from '../art/props.js';
import { Gull } from '../art/cast.js';
import { Doll } from '../art/doll.js';
import { tun } from '../core/tuning.js';
import { cos } from '../core/rng.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const W = (2 * Math.PI) / 0.9, ZETA = 0.035, H = 0.75;
const BLOCKS = [RED, 0xF5B700, TEAL, CREAM, BLUE, RED, 0xF5B700, TEAL, CREAM];
const DEG = Math.PI / 180;
const norm = (a) => { a %= Math.PI * 2; if (a < 0) a += Math.PI * 2; return a; };

/** Pump, launch, spin. A clean entry earns Grace; a perfect belly flop earns Splash. */
export class Springboard extends EventBase {
  static id = 'springboard';
  constructor(spec) {
    super(spec);
    this.seaLevel = 0; this.god = true; this.customPose = true;
    this.towerH = this.cfg.tower;
    this.maxDives = this.cfg.dives || 3;
    this.gary = null; this.garyT = 2;
    this.done = false;
    this.endWord = 'Splash!';
  }
  laneX(i) { return (i - (this.laneSpecs.length - 1) / 2) * 5; }
  addGround() { /* Water, not floor: nothing to stand on below the board. */ }
  setupLane(lane) {
    const b = lane.bal;
    b.moveFoot(lane.x + 1.6, this.towerH, 0);
    b.foot.setTranslation({ x: lane.x + 1.6, y: this.towerH, z: 0 }, true);
    b.body.setTranslation({ x: lane.x + 1.6, y: this.towerH + H, z: 0 }, true);
    lane.dives = []; lane.dive = 0; lane.boardY = 0; lane.boardV = 0.4; lane.phase2 = 'pump'; lane.pumpT = 0; lane.air = 0; lane.angle = 0; lane.spin = 0; lane.last = null; lane.startY = 0; lane.topY = 0; lane.rec = []; lane.replayT = 0; lane.bestSplash = 0;
    lane.doll.face(Math.PI / 2);
    lane.doll.rig.loop('diveReady');
    lane.doll.flatFeet = false;
  }
  buildSet() {
    const g = this.group;
    const blocks = Math.ceil(this.towerH);
    for (const lane of this.lanes) {
      const t = G('', lane.x - 0.4, 0, 0);
      for (let i = 0; i < blocks; i++) add(t, M(geo.box(1.8, 1, 1.8), BLOCKS[i % BLOCKS.length], 0, i + 0.5 + (this.towerH - blocks), 0));
      for (let i = 0; i < blocks; i += 2) add(t, M(geo.box(0.05, 0.3, 0.3), CREAM, 0.91, i + 0.5 + (this.towerH - blocks), 0));
      g.add(t);
      lane.towerTop = this.towerH;
      const board = lane.board = G('', lane.x + 0.5, this.towerH + 0.04, 0);
      add(board, M(geo.box(1.8, 0.07, 0.6), CREAM, 0.9, 0, 0));
      g.add(board);
      add(g, M(geo.cyl(0.05, 0.05, 0.5, 8), 0x8A5A32, lane.x + 0.6, this.towerH - 0.22, 0));
    }
    const b = buoy(RED); b.position.set(9, 0, -7); g.add(b);
    const b2 = buoy(TEAL); b2.position.set(-7, 0, -8); g.add(b2);
    const p = palm(3.2); p.position.set(this.lanes[0].x - 1, this.towerH, -0.6); p.scale.setScalar(0.5); g.add(p);
    this.addTrudy(this.lanes[0].x - 1, this.towerH, 0.5, 0.5, 0.9);
    this.gull = new Gull();
    this.gull.rig.loop('fly');
    this.gull.root.position.set(-9, this.towerH + 2, -2);
    this.gull.root.rotation.y = Math.PI / 2;
    g.add(this.gull.root);
    this.game.setBackdrop(-70, -120);
    this.game.sea.setLevel(0);
  }
  cameraShot(snap, lift = 0, rate = 3) {
    const n = this.lanes.length;
    const d = this.game.rig.fitDistance(Math.max(13, this.towerH * 2.2), (n - 1) * 5 + 4);
    const x = n > 1 ? 1 : 2.4, y = this.towerH * 0.55 + lift;
    this.game.rig.shot(x, y + 1.2, d, x, y, 0, { snap, rate });
  }
  /** A long pump goes high: the camera rises with the highest diver and is back down for the splash. */
  followDive() {
    let top = null;
    for (const l of this.lanes) {
      if (l.kind === 'ghost' || l.phase2 !== 'air') continue;
      const p = l.bal.body.translation();
      if (!top || p.y > top.y) top = { y: p.y, vy: l.bal.body.linvel().y };
    }
    if (top) this.cameraShot(false, Math.max(0, top.y + top.vy * 0.15 - 1 - this.towerH * 0.55), 8);
    else this.cameraShot(false);
  }
  hudSetup(hud) {
    this.power = hud.addWidget(hud.meter('Bounce', '#F5B700'));
    this.diveTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, 'Dive 1 of 3'));
    hud.setScore(0, 'Best');
    hud.setDiscs([]);
  }
  start() { if (this.mode === 'solo') this.game.speech.say('trudy', line('trudy', 'dive_start'), { auto: 3.4, top: true }); }
  fixedEvent(dt) {
    this.flyGull(dt);
    for (const lane of this.lanes) {
      if (!lane.bal) continue;
      if (lane.phase2 === 'pump') this.pump(lane, dt);
      else if (lane.phase2 === 'air') this.air(lane, dt);
      else if (lane.phase2 === 'water') this.water(lane, dt);
      else if (lane.phase2 === 'finished') { /* watching */ }
    }
    if (this.lanes.every((l) => l.kind === 'ghost' || l.phase2 === 'finished')) this.done = true;
  }
  pump(lane, dt) {
    const i = lane.input, b = lane.bal;
    const pumping = (i.footL > 0.5 && i.footR > 0.5);
    const a = -W * W * lane.boardY - 2 * ZETA * W * lane.boardV - (pumping ? 8 * tun.boardGain : 0);
    lane.boardV += a * dt; lane.boardY += lane.boardV * dt;
    lane.pumpT += dt;
    // The spring runs free, so longer pumping keeps paying. Only what you see stops at .7 m.
    const shown = Math.max(-0.7, Math.min(0.7, lane.boardY));
    b.moveFoot(lane.x + 1.6, this.towerH + shown, 0);
    if (lane.board) lane.board.position.y = this.towerH + 0.04 + shown * 0.6;
    if (lane.board) lane.board.rotation.z = shown * 0.25;
    if (Math.floor(lane.pumpT / 0.45) !== Math.floor((lane.pumpT - dt) / 0.45)) this.game.audio.sfx('metronome', { vel: 0.4 });
    const timeLimit = this.mode === 'session' ? 7 : 16;
    if (i.launch || lane.pumpT > timeLimit) this.launch(lane);
  }
  launch(lane) {
    const b = lane.bal;
    const v = Math.max(3, lane.boardV);
    lane.launchV = v;
    b.release();
    b.body.setLinvel({ x: 2.2, y: v, z: 0 }, true);
    b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    lane.phase2 = 'air'; lane.air = 0; lane.angle = 0; lane.spin = 0; lane.startY = this.towerH; lane.topY = this.towerH; lane.rec = [];
    lane.doll.rig.loop('spread');
    this.game.audio.sfx('boing');
    if (lane.board) { lane.board.position.y = this.towerH + 0.04; lane.board.rotation.z = 0; }
    b.diveFree = true;
  }
  air(lane, dt) {
    const i = lane.input, b = lane.bal;
    lane.air += dt;
    const tuck = i.hop;
    // The stick sets a target spin; tuck multiplies it.
    const target = i.wishX * 3.4 * tun.airTorque * (tuck ? 1.8 : 1);
    lane.spin += (target - lane.spin) * (1 - Math.exp(-9 * dt));
    lane.angle += lane.spin * dt;
    b.body.setAngvel({ x: 0, y: 0, z: -lane.spin }, true);
    if (tuck) lane.doll.rig.loop('tuck', { fade: 0.08 }); else lane.doll.rig.loop(Math.abs(lane.spin) > 0.3 ? 'pike' : 'spread', { fade: 0.15 });
    const p = b.body.translation();
    lane.topY = Math.max(lane.topY, p.y - H);
    lane.rec.push({ x: p.x, y: p.y, a: lane.angle });
    if (lane.rec.length > 240) lane.rec.shift();
    if (p.y < 0.5) this.enter(lane);
  }
  /** Where the body lands: head or feet down within 12°, or front flat within 20°. */
  enter(lane) {
    const a = norm(lane.angle);
    const err = (t) => { const d = Math.abs(a - t); return Math.min(d, Math.PI * 2 - d) / DEG; };
    const feet = err(0), head = err(Math.PI), flop = err(Math.PI / 2);
    const clean = Math.min(feet, head);
    const height = lane.topY;
    const mult = 1 + (height - 5) / 10;
    const grace = clean <= 12 ? 100 * (1 - clean / 12) * mult : 0;
    const splash = flop <= 20 ? 100 * (1 - flop / 20) * mult : 0;
    const score = Math.max(grace, splash);
    const kind = grace >= splash && grace > 0 ? 'Grace' : splash > 0 ? 'Splash' : 'Technically a Dive';
    lane.dives.push({ score: Math.max(score, 8), kind, height });
    lane.last = kind;
    lane.dive++;
    lane.phase2 = 'water'; lane.waterT = 0;
    if (score > (lane.bestShown || 0) && kind !== 'Technically a Dive' && this.mode !== 'session') {
      // Keep the flight for the slow-motion side replay.
      lane.bestShown = score;
      lane.replay = { rec: lane.rec.slice(-90), t: 0, on: false, big: kind === 'Splash' };
    } else lane.replay = null;
    const b = lane.bal, p = b.body.translation();
    b.park();
    lane.doll.ragdolled = true;
    lane.doll.rig.update(0);
    lane.ragdoll = new Ragdoll(this.world, lane.doll, this.group, { x: 2, y: -6, z: 0 });
    lane.inWater = true;
    const fx = this.game.fx;
    if (kind === 'Splash') {
      fx.splash(p.x, 0, p.z, 3.2);
      for (let i = 0; i < 40; i++) fx.spawn(p.x + cos(-0.3, 0.3), 0, p.z + cos(-0.3, 0.3), cos(-0.8, 0.8), cos(5, 12), cos(-0.8, 0.8), cos(0.09, 0.22), 0xEFFBFB, 1.3);
      this.game.audio.sfx('splash', { big: 2.2 });
      this.game.comic.pop('SPLOSH!', p.x, 3, p.z, { size: 3.4 });
      this.game.rig.shake(0.16);
      if (this.gull && !this.gullHit) { this.gullHit = 1.5; this.game.audio.sfx('squawk'); }
    } else if (kind === 'Grace') {
      fx.splash(p.x, 0, p.z, 0.25);
      this.game.audio.sfx('splash', { big: 0.3 });
      this.game.comic.pop('...', p.x, 1.6, p.z, { size: 1.6 });
    } else {
      fx.splash(p.x, 0, p.z, 1);
      this.game.audio.sfx('splash', { big: 1 });
    }
    if (lane.kind === 'local') {
      this.game.input.rumble(kind === 'Splash' ? 1 : 0.4, 0.6, 300);
      this.game.hud.flash(kind, 1.2);
      this.game.speech.say('trudy', line('trudy', kind === 'Grace' ? 'dive_grace' : kind === 'Splash' ? 'dive_splash' : 'dive_other'), { auto: 2.6, top: true });
    }
  }
  water(lane, dt) {
    lane.waterT += dt;
    // A simple upward force below the surface.
    if (lane.ragdoll) {
      for (const k of Object.keys(lane.ragdoll.bodies)) {
        const body = lane.ragdoll.bodies[k], t = body.translation();
        body.resetForces(true);
        if (t.y < 0) { body.addForce({ x: 0, y: -t.y * 9 * body.mass() + 1.5 * body.mass() * tun.gravity * 0.9, z: 0 }, true); }
      }
      lane.ragdoll.sync();
    }
    let wait = this.mode === 'session' ? 1.6 : 2.6;
    const rp = lane.replay;
    if (rp && lane.kind !== 'ghost') {
      if (lane.waterT > 1.1 && !rp.on) this.startReplay(lane);
      if (rp.on) {
        rp.t += dt * 0.25 * 120;
        wait = 99;
        if (rp.t >= rp.rec.length) this.endReplay(lane);
      }
    }
    if (lane.waterT > wait) this.resetLane(lane);
  }
  /** A slow-motion side view of the best dive so far, at quarter speed. */
  startReplay(lane) {
    const rp = lane.replay;
    rp.on = true;
    rp.doll = new Doll({ shirt: lane.colour, hat: lane.hat });
    rp.doll.flatFeet = false;
    rp.doll.face(Math.PI / 2);
    rp.doll.rig.loop(rp.big ? 'spread' : 'diveReady', { fade: 0 });
    this.group.add(rp.doll.root);
    this.replaying = lane;
    this.game.hud.setNote('Replay', 3);
    this.game.audio.sfx('whoosh');
  }
  endReplay(lane) {
    const rp = lane.replay;
    const last = rp.rec[rp.rec.length - 1];
    if (rp.big) { this.game.fx.splash(last.x, 0, 0, 3.2); this.game.audio.sfx('splash', { big: 2.2 }); this.game.rig.shake(0.12); }
    this.group.remove(rp.doll.root);
    lane.replay = null;
    this.replaying = null;
    lane.waterT = 1.8;
    this.cameraShot(false);
  }
  resetLane(lane) {
    const b = lane.bal;
    lane.ragdoll.end(); lane.ragdoll = null;
    lane.doll.ragdolled = false; lane.inWater = false;
    b.air = false;
    b.fx = lane.x + 1.6; b.fy = this.towerH; b.fz = 0;
    b.foot.setTranslation({ x: b.fx, y: b.fy, z: 0 }, true);
    // Enable first, then rejoin: a joint made on a disabled body panics Rapier on the next dive.
    b.unpark();
    b.reattach();
    lane.boardY = 0; lane.boardV = 0.4; lane.pumpT = 0; lane.angle = 0;
    lane.doll.rig.loop('diveReady');
    if (lane.dive >= this.maxDives) lane.phase2 = 'finished'; else { lane.phase2 = 'pump'; this.game.audio.sfx('spring'); }
    if (lane.bot) lane.bot.data = {};
    if (lane.testBot) lane.testBot.data = {};
  }
  flyGull(dt) {
    const g = this.gull;
    if (this.gullHit > 0) {
      this.gullHit -= dt;
      g.root.position.y += (this.gullHit > 1.2 ? 8 : -6) * dt;
      g.root.rotation.z += dt * 10;
      if (this.gullHit <= 0) { g.root.position.set(-12, this.towerH + 3, -2); g.root.rotation.z = 0; }
      return;
    }
    g.root.position.x += dt * 2.2;
    if (g.root.position.x > 14) g.root.position.x = -14;
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    out.hopPressed = false; out.hop = false; out.launch = false; out.footL = 0; out.footR = 0; out.wishX = 0; out.wishZ = 0;
    const d = bot.data;
    if (lane.phase2 === 'pump') {
      // Squeeze as the board goes down, late by the bot's reaction. Being late is what costs height.
      d.wait = (d.wait ?? (2.5 + bot.r() * 1.5));
      const falling = lane.boardV < 0;
      if (falling !== d.falling) {
        d.falling = falling; d.flipT = lane.pumpT;
        d.late = Math.max(0, bot.s.lag * 0.5 + (bot.r() + bot.r() + bot.r() - 1.5) * 2 * bot.s.timing);
      }
      const since = lane.pumpT - d.flipT;
      const v = (falling ? since >= d.late : since < d.late) ? 1 : 0;
      out.footL = v; out.footR = v;
      if (lane.pumpT > d.wait && lane.boardV > 0.5 && lane.boardV > (d.prevV ?? 0)) d.armed = true;
      if (d.armed && lane.boardV < (d.prevV ?? 0)) { out.hopPressed = true; out.hop = true; out.launch = true; d.armed = false; }
      d.prevV = lane.boardV;
    } else if (lane.phase2 === 'air') {
      const vel = lane.spinAt ?? 0.5;
      const coast = 0.22;
      // Aim for a belly flop by default (a quarter turn) or a head first dive.
      // Half stick is too slow to get head first from a low tower, so a bot only tries what it can reach.
      if (d.goal === undefined) {
        const g = tun.gravity, drop = this.towerH + H - 0.5;
        const air = (lane.launchV + Math.sqrt(lane.launchV * lane.launchV + 2 * g * drop)) / g;
        const canDive = Math.PI / (vel * 3.4) + 0.05 < air;
        d.goal = lane.tryDive ?? (bot.r() < 0.15 && canDive) ? Math.PI : Math.PI / 2;
      }
      const goal = d.goal;
      if (d.aimErr === undefined) d.aimErr = (bot.r() + bot.r() + bot.r() - 1.5) * 2 * (lane.stopErr ?? { sharp: 0.1, average: 0.165, clumsy: 0.27 }[bot.skillName] ?? 0.19) * vel * 3.4;
      const rel = goal - lane.angle - coast * vel + d.aimErr;
      out.wishX = rel > 0.04 ? vel : 0;
    }
    if (out.wishX) out.wishX = Math.max(-1, Math.min(1, out.wishX));
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    const best = me.dives && me.dives.length ? Math.max(...me.dives.map((x) => x.score)) : 0;
    hud.setScore(Math.round(best), 'Best');
    hud.setTime(null);
    if (this.power) this.power.set(Math.max(0, Math.abs(me.boardV || 0)) / 8);
    const s = `Dive ${Math.min(this.maxDives, (me.dive || 0) + 1)} of ${this.maxDives}`;
    if (this.diveTag && this.diveTag.textContent !== s) this.diveTag.textContent = s;
  }
  frameEvent(dt) {
    if (this.gull) this.gull.update(dt);
    if (this.replaying && this.replaying.replay && this.replaying.replay.on) {
      const rp = this.replaying.replay;
      const i = Math.min(rp.rec.length - 1, Math.floor(rp.t)), r = rp.rec[i];
      rp.doll.root.position.set(r.x, r.y - H, 0);
      rp.doll.root.rotation.set(0, 0, -r.a);
      rp.doll.update(dt);
      this.game.rig.shot(r.x + 0.5, r.y + 0.3, 6.5, r.x, r.y, 0, { rate: 5 });
    } else this.followDive();
    for (const lane of this.lanes) {
      if (!lane.bal || lane.inWater) continue;
      const b = lane.bal, p = b.body.translation(), q = b.body.rotation();
      if (lane.phase2 === 'air') {
        lane.doll.root.position.set(p.x, p.y - H, p.z);
        lane.doll.root.quaternion.set(q.x, q.y, q.z, q.w);
      } else {
        lane.doll.root.position.set(b.fx, b.fy, b.fz);
        lane.doll.root.quaternion.set(0, 0, 0, 1);
      }
    }
  }
  isDone() { return this.done; }
  laneResult(lane) {
    const scores = (lane.dives || []).map((d) => d.score).sort((a, b) => b - a);
    const best2 = scores.slice(0, 2);
    const raw = best2.length ? best2.reduce((a, b) => a + b, 0) / 2 : 0;
    const kinds = (lane.dives || []).map((d) => d.kind).join(', ');
    return { form: (100 * raw) / this.cfg.par, raw, big: Math.round(raw), stats: kinds || 'No dives' };
  }
}
export { RAPIER, THREE };
