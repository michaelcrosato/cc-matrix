// 5.5 Coconut Header. Lean along the sand. Dennis runs a catapult.
import { ContactShadow } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar } from '../../art/avatar.js';
import { place } from '../../art/stage.js';
import { T } from '../../core/tunables.js';
import { CAST_LOOKS } from '../../data/classmates.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { ActivityScene } from './base.js';
const FLY = 1.4;
export class HeaderSim {
  t = 0; x = 0; score = 0; combo = 0; best = 0; done = false; next = 0.6; objs = []; events = []; daze = 0; hits = 0; flips = 0; head = 0;
  constructor(cfg, env, rng, { width = 2, seconds = 60 } = {}) { this.cfg = cfg; this.env = env; this.rng = rng; this.width = width; this.seconds = seconds; }
  tier() { return this.combo >= 20 ? 4 : this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1; }
  step(dt, u) {
    this.t += dt;
    if (this.t >= this.seconds) { this.done = true; return; }
    this.daze = Math.max(0, this.daze - dt);
    if (this.daze <= 0) this.x = Math.max(-this.width, Math.min(this.width, this.x + 4.5 * (this.width < 2 ? this.width / 2 + 0.2 : 1) * u.x * dt));
    if (this.t >= this.next) {
      const u2 = Math.min(1, this.t / this.seconds);
      this.next = this.t + (1.3 - 0.6 * u2) * T.headerInterval * (this.cfg.interval ?? 1);
      const r = this.rng.next();
      const kind = r < 0.7 ? 'coconut' : r < 0.95 ? 'flipflop' : 'pineapple';
      this.objs.push({ kind, x: (this.rng.next() * 2 - 1) * this.width, t0: this.t, done: false, id: Math.floor(this.t * 1000) });
      this.events.push({ kind: 'launch' });
    }
    this.head = Math.max(0, this.head - dt);
    for (const o of this.objs) {
      if (o.done) continue;
      if (this.t - o.t0 >= FLY) {
        o.done = true; const hitR = 0.55 * (this.width < 2 ? 0.8 : 1);
        const near = Math.abs(o.x - this.x) < hitR || (this.env.god && o.kind !== 'flipflop');
        if (near && o.kind === 'coconut') { this.combo++; this.best = Math.max(this.best, this.combo); const pts = 10 * this.tier(); this.score += pts; this.hits++; this.head = 0.3; this.events.push({ kind: 'bonk', x: o.x, pts, o }); }
        else if (near && o.kind === 'pineapple') { this.score += 30; this.combo++; this.head = 0.3; this.events.push({ kind: 'pine', x: o.x, o }); }
        else if (near && o.kind === 'flipflop') { this.score = Math.max(0, this.score - 10); this.combo = 0; this.daze = 0.6; this.flips++; this.events.push({ kind: 'thwap', x: o.x, o }); }
        else if (o.kind === 'coconut') { this.events.push({ kind: 'missed', x: o.x, o }); o.missed = true; }
      }
    }
    if (this.objs.length > 12) this.objs = this.objs.filter((o) => !o.done || this.t - o.t0 < 2.5);
  }
  final() { return this.score; }
  result() { return { score: Math.round(this.score), stats: { headers: this.hits, combo: this.best, flipflops: this.flips } }; }
  bot(driver, out) {
    const sk = driver.skill;
    let best = null, bestT = Infinity;
    for (const o of this.objs) { if (o.done || o.kind === 'flipflop') continue; const left = o.t0 + FLY - this.t; if (left < bestT && left > 0) { bestT = left; best = o; } }
    const hazard = this.objs.find((o) => !o.done && o.kind === 'flipflop' && o.t0 + FLY - this.t < 0.45 && Math.abs(o.x - this.x) < 0.65);
    if (driver.aimFor !== best?.id) { driver.aimFor = best?.id; driver.aimErr = (driver.rng.next() - 0.5) * (1.2 - sk.head) * 1.4; driver.ignore = driver.rng.next() > sk.head; }
    let tx = best && !driver.ignore ? best.x + driver.aimErr : this.x;
    if (hazard && sk.head > 0.5) tx = hazard.x + (hazard.x > 0 ? -1 : 1);
    const d = tx - this.x; out.x = Math.max(-1, Math.min(1, d * 3.5));
  }
}
export const headerView = {
  kind: 'header',
  enter(scene, lane) {
    lane.avatar.play('Idle'); lane.objs = new Map(); lane.pool = { coconut: [], flipflop: [], pineapple: [] };
    const ctx = scene.ctx;
    const scale = lane.small ? 0.75 : 1;
    const models = { coconut: 'coconut', flipflop: 'flip-flop', pineapple: 'golden-pineapple' };
    for (const k of Object.keys(lane.pool)) for (let i = 0; i < 6; i++) { const b = place(ctx, models[k], 0, -9, 0, { scale, actors: true }); lane.pool[k].push({ obj: b.object, used: null }); }
    lane.shadows = [];
    for (let i = 0; i < 18; i++) { const s = scene.makeShadow(ctx); s.visible = false; lane.shadows.push(s); }
  },
  update(scene, lane, dt) {
    const s = lane.sim; if (!s) return;
    const a = lane.avatar;
    a.root.position.x = lane.x + s.x;
    a.lean.x = Math.max(-1, Math.min(1, (s.x - (lane.px ?? s.x)) * 15)); lane.px = s.x;
    if (s.daze > 0) a.play('Daze'); else if (a.current === 'Daze') a.play('Idle');
    for (const p of Object.values(lane.pool)) for (const q of p) { q.obj.visible = false; }
    let si = 0; const pools = { coconut: 0, flipflop: 0, pineapple: 0 };
    for (const o of s.objs) {
      const age = s.t - o.t0, f = age / FLY;
      if (o.done && !o.missed && !o.bounced) { o.bounced = true; }
      if (f > 1.7) continue;
      const pl = lane.pool[o.kind][pools[o.kind]++]; if (!pl) continue;
      const lx = lane.x + o.x, startZ = -7;
      let y, z;
      if (f <= 1) { y = 1.75 + Math.sin(f * Math.PI) * 3.6; z = startZ + (lane.z - startZ) * f; }
      else if (o.missed || o.kind === 'flipflop') { const g = (f - 1) * FLY; y = Math.max(0.1, 1.75 - 6 * g - 8 * g * g); z = lane.z + g * 2; }
      else { const g = f - 1; y = 1.75 + g * 3; z = lane.z - g * 9; } // It flies back at Dennis.
      pl.obj.visible = true; pl.obj.position.set(lx, y, z); pl.obj.rotation.x = age * 6;
      if (f <= 1 && si < lane.shadows.length) { const sh = lane.shadows[si++]; sh.visible = true; sh.position.set(lx, 0.03, lane.z); const sc = 0.5 + f * 0.8; sh.scale.set(sc, 1, sc); }
    }
    for (; si < lane.shadows.length; si++) lane.shadows[si].visible = false;
    for (const e of s.events) if (e.kind === 'bonk' || e.kind === 'pine') { a.play('HeaderNod', { once: true, speed: 1.4, fade: 0.04 }); a.sq.kick(-3); }
    if (lane !== scene.lanes[scene.playerLane]) s.events.length = 0;
    if (a.current === 'HeaderNod' && a.action('HeaderNod').time >= a.action('HeaderNod').getClip().duration - 0.02) a.play('Idle');
  },
  draw(scene, hud, lane, box, big) {
    const s = lane.sim; if (!s) return;
    if (!big) { say(hud, box.x - 12, box.y - 4, String(Math.round(s.score)), { scale: 1, color: 'sand' }); if (s.combo >= 5) say(hud, box.x - 8, box.y + 6, `x${s.tier()}`, { color: 'lime' }); }
  },
  score: (s) => s.final(),
};
export class HeaderScene extends ActivityScene {
  makeSim(ctx, lane) { return new HeaderSim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`head-${lane.solo ? 'solo' : lane.i}-${this.simN = (this.simN ?? 0) + 1}`), { width: lane.who === 'player' ? 2 : 0.8 }); }
  cameraConfig() { return { preset: 'fixed', position: [0, 2.6, 8.8], target: [0, 1.45, 0], fov: 32 }; }
  makeShadow(ctx) { return makeBlob(ctx); }
  async buildStage(ctx) {
    await this.buildLanes(ctx, 'lagoon', { coach: false, mats: false });
    // Solo: you get the whole sand. Classmates stay on their own narrow lanes at the edge.
    const [a, me, b] = this.lanes;
    a.x = -3.3; b.x = 3.3; a.avatar.setAt(-3.3, 0, 0.8); b.avatar.setAt(3.3, 0, 0.8);
    for (const l of this.lanes) headerView.enter(this, l);
    this.dennis = await makeAvatar(ctx, CAST_LOOKS.dennis); this.dennis.setAt(0, 0, -7);
    this.catapult = place(ctx, 'catapult', 1.4, 0, -7, { actors: true });
    a.avatar.root.visible = true;
    ctx.particles.register('coco', { count: [6, 9], life: [0.25, 0.5], speed: [2, 4], gravity: 10, size: [1, 2], colors: ['white', 'sand', 'plum'] });
    ctx.particles.register('sweat', { count: [3, 5], life: [0.3, 0.5], speed: [1.5, 3], gravity: 8, size: [1, 1], colors: ['cyan', 'white'] });
    void me;
  }
  cardInfo() { return { goal: 'Head the coconuts. Dodge the flip-flops.', prompts: [['lean', 'Lean left, right']] }; }
  view(ctx, dt) {
    const l = this.lanes[1], s = l.sim;
    const evs = s.events.slice();
    for (const q of this.lanes) headerView.update(this, q, dt);
    s.events.length = 0;
    for (const e of evs) {
      if (e.kind === 'bonk') { App.sfx('bonk', { pitch: Math.min(12, s.tier() * 2) }); ctx.engine.hitstop(0.05); ctx.particles.burst('coco', [l.x + e.x, 1.8, l.z]); this.dennisHit = 0.5; if (s.combo === 5 || s.combo === 10 || s.combo === 20) App.sfx('combo'); }
      if (e.kind === 'pine') { App.sfx('pineapple'); ctx.particles.burst('sparkle', [l.x + e.x, 1.8, l.z], { count: 18, colors: ['sand', 'white'] }); }
      if (e.kind === 'thwap') { App.sfx('thwap'); ctx.engine.shake.add(0.25); if (!App.bark) App.barkLine('A flip-flop. It was not personal. It was Dennis.', 'ounce', 1.8); }
      if (e.kind === 'launch') { App.sfx('catapult'); this.catT = 0.25; }
    }
    this.dennis.update(dt);
    if (this.dennisHit > 0) { this.dennisHit -= dt; if (this.dennis.current !== 'Hurt') this.dennis.play('Hurt', { once: true, fade: 0.05 }); }
    else if (this.dennis.current === 'Hurt') this.dennis.play('Idle');
    const arm = this.catapult.object.getObjectByName('arm');
    if (arm) { this.catT = Math.max(0, (this.catT ?? 0) - dt); arm.rotation.x = this.catT > 0 ? -1.2 : 0; }
  }
  drawPlay(ctx, hud) {
    const s = this.lanes[1].sim;
    App.dialCenter.x = hud.width / 2; App.dialCenter.y = hud.height / 2;
    this.drawTopBar(hud, Math.round(s.score), s.combo >= 5 ? `Combo x${s.tier()}` : `${Math.max(0, Math.ceil(s.seconds - s.t))} s`);
    if ((this.phase === 'play' || this.phase === 'practice') && !App.attract) promptBar(hud, [['lean', 'Lean'], ['pause', 'Pause']]);
    void center;
  }
}
export function makeBlob(ctx) { const s = new ContactShadow(0.35); ctx.scene.add(s); return s; }
