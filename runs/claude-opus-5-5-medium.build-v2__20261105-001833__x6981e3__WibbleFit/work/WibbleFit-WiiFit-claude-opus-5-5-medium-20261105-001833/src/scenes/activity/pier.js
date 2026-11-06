// 5.9 Pier Jump. Side-on. Three attempts. Three judges with paddles.
import { RippleField } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar } from '../../art/avatar.js';
import { box, place, sea, sky } from '../../art/stage.js';
import { Dot } from '../../core/dot.js';
import { T } from '../../core/tunables.js';
import { BARKS } from '../../data/lines.js';
import { CAST_LOOKS } from '../../data/classmates.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { bar, dial } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';
const RUN = 5, LIP_AT = 5, WIN = 0.25;
export class PierSim {
  attempt = 0; t = 0; part = 'run'; speed = 6; p = 0; pressAt = null; flightT = 0; ringT = 0; cannon = false; distance = 0; best = 0; style = 0; bestStyle = 0; score = 0; done = false; events = []; scores = []; ringR = 0.45; flightLen = 3.5; waitT = 0;
  constructor(cfg, env, rng) { this.cfg = cfg; this.env = env; this.rng = rng; this.dot = new Dot(() => rng.next()); }
  winW() { return WIN * (this.cfg.window ?? 1); }
  step(dt, u) {
    this.t += dt; const d = this.dot;
    const pressed = u.confirm;
    if (this.part === 'run') {
      d.step(dt, u.x, u.y, T, { noise: this.env.noiseMul });
      if (this.env.god) { d.y = -0.6; d.x = 0; }
      if (d.y >= -0.8 && d.y <= -0.4) this.speed = Math.min(14, this.speed + (8 / (RUN * 0.8)) * dt);
      if (pressed && this.pressAt === null && this.t >= LIP_AT - this.winW()) { this.pressAt = this.t; }
      if (this.env.god && this.pressAt === null && this.t >= LIP_AT) this.pressAt = LIP_AT;
      if (this.t >= LIP_AT + this.winW() || this.pressAt !== null && this.t >= LIP_AT) {
        this.p = this.pressAt === null ? 0 : Math.max(0, 1 - Math.abs(this.pressAt - LIP_AT) / this.winW());
        this.part = 'flight'; this.flightT = 0; this.ringT = 0; this.cannon = false; this.flightLen = 3 + this.p;
        d.x = 0; d.y = 0; d.vx = 0; d.vy = 0;
        this.events.push({ kind: 'lip', p: this.p });
      }
    } else if (this.part === 'flight') {
      this.flightT += dt;
      d.step(dt, u.x, u.y, T, { inst: 3 / T.dotInstability, noise: this.env.noiseMul });
      if (this.env.god) { d.x *= 0.5; d.y *= 0.5; }
      if (d.dist() <= this.ringR * this.env.ringMul / T.ringScale * T.ringScale) this.ringT += dt;
      const left = this.flightLen - this.flightT;
      if (pressed && left <= 0.5 && !this.cannon) { this.cannon = true; this.events.push({ kind: 'cannon' }); }
      if (this.env.god && left <= 0.3) this.cannon = true;
      if (left <= 0) {
        const ring = this.ringT / this.flightLen;
        this.distance = this.speed * (0.8 + 0.6 * this.p) * (0.6 + 0.4 * ring) * T.pierBoost;
        this.style = (this.cannon ? 30 : 0) + Math.round(40 * ring) + Math.round(30 * this.p);
        if (this.distance > this.best) { this.best = this.distance; this.bestStyle = this.style; }
        this.scores.push(this.distance);
        this.part = 'splash'; this.waitT = 2.8;
        this.events.push({ kind: 'splash', distance: this.distance, cannon: this.cannon, style: this.style });
      }
    } else if (this.part === 'splash') {
      this.waitT -= dt;
      if (this.waitT <= 0) {
        this.attempt++;
        if (this.attempt >= 3) { this.done = true; return; }
        this.part = 'run'; this.t = 0; this.speed = 6; this.pressAt = null; d.x = 0; d.y = 0; d.vx = 0; d.vy = 0;
        this.events.push({ kind: 'again' });
      }
    }
    this.score = this.best;
  }
  final() { return this.best; }
  result() { return { score: +this.best.toFixed(1), stats: { style: this.bestStyle } }; }
  bot(driver, out, dt) {
    const sk = driver.skill;
    const ty = this.part === 'run' ? -0.6 : 0;
    driver.brain.lean(this.dot, 0, ty, dt, out);
    if (this.part === 'run') {
      if (driver.pressWhen === undefined || driver.pressAttempt !== this.attempt) { driver.pressAttempt = this.attempt; driver.pressWhen = LIP_AT + (driver.rng.next() - 0.5) * sk.jitter * 3; }
      if (this.t >= driver.pressWhen && this.pressAt === null) out.confirm = true;
    } else if (this.part === 'flight' && this.flightLen - this.flightT <= 0.3 && driver.rng.next() < sk.hit) out.confirm = true;
  }
}
const JUDGES = [['marguerite', -4], ['june', -2.4], ['dennis', -0.8]];
export class PierScene extends ActivityScene {
  cameraConfig() { return { preset: 'side', zoom: 0.9 }; }
  makeSim(ctx) { return new PierSim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`pier-${this.simN = (this.simN ?? 0) + 1}`)); }
  async buildStage(ctx) {
    sky(ctx);
    ctx.physics.addStaticBox({ position: [0, -3, 0], halfExtents: [60, 0.5, 20] });
    this.water = sea(ctx, 220, 40, -0.32, 20, -4);
    this.ripples = new RippleField({ size: [48, 20], cells: [120, 50], center: [36, 0] });
    this.ripW = sea(ctx, 48, 20, -0.25, 36, 0, this.ripples);
    box(ctx, -26, -0.1, 0, 30, 1.2, 20, 'sand', { shadow: false });
    place(ctx, 'pier', -2, 0.1, 0, { turn: 90, params: { len: 26 } });
    box(ctx, -15, 1.4, -3, 0.3, 3, 0.3, 'white'); box(ctx, -15, 3, -3, 2.6, 0.5, 0.1, 'orange');
    place(ctx, 'palm', -22, 0.4, -3); place(ctx, 'kettlebell-volcano', 30, -0.4, -30, { scale: 0.45 });
    place(ctx, 'foam-roller-hill', -32, -0.4, -26, { scale: 0.5 });
    box(ctx, 7, 0.55, -2.9, 6.4, 1.3, 2.4, 'orange');
    place(ctx, 'judge-table', 7, 1.2, -2.1, { scale: 0.9 });
    this.judges = [];
    for (let i = 0; i < 3; i++) {
      const [who] = JUDGES[i];
      const a = await makeAvatar(ctx, CAST_LOOKS[who]); a.setAt(5.6 + i * 1.4, 1.2, -2.9, 0); a.groundY = 1.2;
      const paddle = place(ctx, 'judge-paddle', 5.6 + i * 1.4, -9, -2.2, { actors: true });
      this.judges.push({ a, paddle: paddle.object, who, raised: 0 });
    }
    const avatar = await makeAvatar(ctx, this.playerLook());
    this.playerLane = 0;
    this.lanes.push({ i: 0, who: 'player', avatar, driver: this.localDriver(ctx), name: 'You' });
    this.lanes[0].sim = this.makeSim(ctx);
    ctx.particles.register('splash', { count: [80, 120], life: [0.6, 1.3], speed: [4, 9], gravity: 12, size: [1, 3], colors: ['white', 'cyan', 'sky'], spread: 50, direction: [0, 1, 0], radius: 0.8, max: 400 });
    this.px = -14; this.py = 1.25;
  }
  cardInfo() { return { goal: 'Run up tucked low. Press at the lip. Stay in the ring. Press before the splash.', prompts: [['lean', 'Lean: tuck, then balance'], ['press', 'Jump, then cannonball']] }; }
  view(ctx, dt) {
    const s = this.lanes[0].sim, a = this.lanes[0].avatar;
    if (s.part === 'run') {
      const f = Math.min(1, s.t / LIP_AT);
      this.px = -14 + (11 - (-14)) * f; this.py = 1.25;
      a.play(s.dot.y <= -0.4 ? 'Tuck' : 'Run');
      a.groundY = 1.2;
    } else if (s.part === 'flight') {
      const f = s.flightT / s.flightLen, D = s.speed * (0.8 + 0.6 * s.p) * (0.6 + 0.4 * (s.ringT / Math.max(0.1, s.flightT))) * T.pierBoost;
      this.px = 11 + D * 0.55 * f; this.py = 1.25 + Math.sin(f * Math.PI) * (2.6 + s.p * 1.6) - f * 1.2;
      a.play(s.cannon ? 'Cannonball' : 'SkyFlail');
      a.groundY = -0.2;
    } else if (s.part === 'splash') { this.py = Math.max(-1.6, this.py - dt * 3.5); }
    a.root.position.set(this.px, this.py, 0); a.root.rotation.y = Math.PI / 2;
    a.lean.x = s.dot.x; a.lean.y = s.dot.y;
    this.target.set(Math.max(-6, this.px * 0.7 + 2), 3, 0);
    for (const j of this.judges) { j.a.update(dt); if (j.raised > 0) { j.raised -= dt; j.paddle.position.y = 3; } else { j.paddle.position.y = -9; } }
    for (const e of s.events.splice(0)) {
      if (e.kind === 'lip') { App.sfx(e.p > 0.7 ? 'go' : 'countdown'); App.barkLine(e.p > 0.8 ? 'A clean take-off. I am as surprised as you.' : e.p > 0 ? 'You left the pier. Near enough.' : 'You missed the lip. You went anyway. Brave.', 'ounce', 1.6); }
      if (e.kind === 'cannon') { App.sfx('hop'); a.sq.kick(-3); }
      if (e.kind === 'splash') {
        App.sfx('splash', { volume: e.cannon ? 1 : 0.6 }); ctx.engine.hitstop(0.1); ctx.engine.timeScale = 0.25; this.slow = 0.8 * 0.25;
        ctx.particles.burst('splash', [this.px, 0, 0], { count: e.cannon ? 130 : 60 }); ctx.engine.shake.add(e.cannon ? 0.6 : 0.3); this.ripples.splash(this.px, 0, e.cannon ? 2 : 1, e.cannon ? 1 : 0.5);
        if (!App.settings.reduceFlashes) ctx.engine.screen.shockwave(this.v.set(this.px, 0, 0), { radius: 0.3 });
        for (const j of this.judges) { j.a.play('PaddleRaise', { once: true }); j.raised = 2.4; App.sfx('paddle', { pitch: 3 }); }
        this.lastSplash = e;
      }
      if (e.kind === 'again') { this.px = -14; a.play('Run'); for (const j of this.judges) j.a.play('Idle'); if (!App.bark) App.barkLine(this.cosmetic.pick(BARKS.streak), 'ounce', 1.6); }
    }
    if (this.slow > 0) { this.slow -= dt; if (this.slow <= 0 && !App.top()) ctx.engine.timeScale = App.devTimeScale; }
    this.water.update(ctx.time); this.ripW.update(ctx.time); this.ripples.step(dt);
    a.update(dt);
  }
  updateAvatars() {}
  drawPlay(ctx, hud) {
    const s = this.lanes[0].sim, W = hud.width;
    App.dialCenter.x = W / 2; App.dialCenter.y = 56;
    if (s.part === 'run') {
      dial(hud, W / 2, 56, 34, { x: s.dot.x, y: s.dot.y, hideRing: true, target: { x: 0, y: -0.6, r: 0.24 } });
      center(hud, 96, s.dot.y <= -0.4 && s.dot.y >= -0.8 ? 'Tucked. Speed up.' : 'Lean down to tuck.', { color: 'white' });
      bar(hud, W / 2 - 70, 108, 140, 8, (s.speed - 6) / 8, 'lime');
      const lf = Math.max(0, LIP_AT - s.t);
      if (lf < 0.6) center(hud, 122, 'Press!', { scale: 2, color: 'lime' });
    } else if (s.part === 'flight') {
      dial(hud, W / 2, 56, 34, { ringR: s.ringR, x: s.dot.x, y: s.dot.y, inside: s.dot.dist() <= s.ringR });
      if (s.flightLen - s.flightT <= 0.5) center(hud, 98, s.cannon ? 'Tucked!' : 'Press!', { scale: 2, color: 'lime' });
    } else if (s.part === 'splash' && this.lastSplash) {
      center(hud, 54, `${this.lastSplash.distance.toFixed(1)} m`, { scale: 3, color: 'sand' });
      center(hud, 82, `Style ${this.lastSplash.style}`, { color: 'cyan' });
    }
    this.drawTopBar(hud, `${s.best.toFixed(1)} m`, `Jump ${Math.min(3, s.attempt + 1)} of 3`);
    if ((this.phase === 'play' || this.phase === 'practice') && !App.attract) promptBar(hud, [['lean', 'Lean'], ['press', s.part === 'flight' ? 'Cannonball' : 'Jump'], ['pause', 'Pause']]);
    void say;
  }
}
