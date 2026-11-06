// 5.6 Slackline. X is balance, forward is progress. Walking is less stable, so stopping is a choice.
import { PALETTE, RippleField, THREE, toonMaterial } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar } from '../../art/avatar.js';
import { box, place, sea, sky } from '../../art/stage.js';
import { Dot } from '../../core/dot.js';
import { T } from '../../core/tunables.js';
import { BARKS } from '../../data/lines.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { bar, dial } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';
const { BoxGeometry, Mesh, Vector3 } = THREE;
export const SLACK_LENGTH = 30, SLACK_LIMIT = 75;
export class SlackSim {
  t = 0; z = 0; falls = 0; done = false; finished = false; fallT = 0; next = 6; gust = 0; gustDir = 0; warn = 0; warnDir = 0; events = []; walking = false; kevin = false; checkpoint = 0; score = 0;
  constructor(cfg, env, rng) { this.cfg = cfg; this.env = env; this.rng = rng; this.dot = new Dot(() => rng.next()); }
  step(dt, u) {
    this.t += dt;
    if (this.t >= SLACK_LIMIT) { this.done = true; return; }
    if (this.fallT > 0) {
      this.fallT -= dt;
      if (this.fallT <= 0) { this.z = this.checkpoint; this.dot.x = 0; this.dot.vx = 0; this.dot.ux = 0; this.gust = 0; this.warn = 0; this.next = this.z + 6; this.events.push('back'); }
      return;
    }
    this.checkpoint = this.z >= 20 ? 20 : this.z >= 10 ? 10 : 0;
    this.walking = u.y > 0.3;
    if (this.walking) this.z += 1.1 * dt;
    if (this.z >= this.next && this.warn <= 0 && this.gust <= 0) { this.warn = 1.5; this.warnDir = this.rng.next() < 0.5 ? -1 : 1; this.next += 6; this.events.push('warn'); }
    if (this.warn > 0) { this.warn -= dt; if (this.warn <= 0) { this.gust = 1; this.gustDir = this.warnDir; this.events.push('gust'); } }
    if (this.gust > 0) this.gust -= dt;
    this.kevin = this.z >= 18 && this.z < 24;
    if (this.kevin && !this.kevinSaid) { this.kevinSaid = true; this.events.push('kevin'); }
    const instE = (this.walking ? T.slackWalkInst * (this.cfg.walkInst ?? 1) : 1.2) / T.dotInstability;
    const m = { inst: instE, noise: 1.25 * this.env.noiseMul, bx: (this.gust > 0 ? this.gustDir * T.gustForce : 0) + (this.kevin ? 0.2 : 0) };
    this.dot.step(dt, u.x, 0, T, m);
    this.dot.y = 0; this.dot.vy = 0;
    if (this.env.god) this.dot.x = Math.max(-0.6, Math.min(0.6, this.dot.x));
    if (Math.abs(this.dot.x) > 1) { this.falls++; this.fallT = 1.2; this.events.push('fall'); }
    if (this.z >= SLACK_LENGTH) { this.finished = true; this.done = true; this.events.push('finish'); }
    this.score = this.compute();
  }
  compute() { return this.finished ? Math.max(0, Math.round(1000 - 60 * this.falls - 8 * (this.t - 27))) : Math.round((this.z / SLACK_LENGTH) * 300); }
  result() {
    const stars = !this.finished ? 0 : this.falls === 0 && this.t < 32 ? 3 : this.falls <= 1 && this.t < 45 ? 2 : 1;
    return { score: this.compute(), stars, stats: { falls: this.falls, seconds: Math.round(this.t) } };
  }
  bot(driver, out, dt) {
    const d = this.dot;
    driver.brain.lean({ x: d.x, y: 0, vx: d.vx, vy: 0 }, 0, 0, dt, out);
    out.y = Math.abs(d.x) < 0.45 && driver.skill.err < 1.2 ? 1 : driver.skill.err >= 1.2 ? (Math.abs(d.x) < 0.3 ? 1 : 0) : 0;
    out.x = Math.max(-1, Math.min(1, out.x));
  }
}
export class SlacklineScene extends ActivityScene {
  cameraConfig() { return { preset: 'fixed', position: [0, 2.1, 5], target: [0, 2.2, -4], fov: 42 }; }
  makeSim(ctx, lane) { return new SlackSim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`slack-${this.simN = (this.simN ?? 0) + 1}`)); }
  async buildStage(ctx) {
    sky(ctx);
    ctx.physics.addStaticBox({ position: [0, -3, -15], halfExtents: [20, 0.5, 40] });
    this.ripples = new RippleField({ size: [30, 48], cells: [75, 120], center: [0, -15] });
    this.water = sea(ctx, 160, 160, -0.32, 0, -30);
    this.ripW = sea(ctx, 30, 48, -0.25, 0, -15, this.ripples);
    place(ctx, 'slack-anchor', 0, -0.2, 2.2); place(ctx, 'slack-anchor', 0, -0.2, -SLACK_LENGTH - 1.5);
    box(ctx, 0, -0.1, 7, 14, 0.4, 9, 'sand', { shadow: false });
    box(ctx, 0, -0.1, -SLACK_LENGTH - 5, 18, 0.4, 7, 'sand', { shadow: false });
    place(ctx, 'palm', -5, 0, -SLACK_LENGTH - 4); place(ctx, 'palm', 4.5, 0, -SLACK_LENGTH - 5, { turn: 70 });
    place(ctx, 'kettlebell-volcano', -22, -1, -66, { scale: 1.2 }); place(ctx, 'foam-roller-hill', 24, -1, -58, { scale: 1.1 });
    for (const z of [10, 20]) { box(ctx, 1.4, 0.4, -z, 0.3, 1.4, 0.3, 'orange'); box(ctx, 1.75, 0.9, -z, 0.5, 0.3, 0.06, 'lime'); box(ctx, -1.4, 0.4, -z, 0.3, 1.4, 0.3, 'orange'); }
    // Flags: they telegraph the wind.
    this.flags = [];
    for (let z = 6; z < SLACK_LENGTH; z += 6) { box(ctx, -1.9, 1, -z, 0.14, 2.6, 0.14, 'white'); const f = new Mesh(new BoxGeometry(0.9, 0.5, 0.05), toonMaterial(PALETTE.red)); f.position.set(-1.45, 2.1, -z); ctx.scene.add(f); this.flags.push(f); }
    const mat = toonMaterial(PALETTE.orange);
    this.segs = Array.from({ length: 24 }, () => { const m = new Mesh(new BoxGeometry(0.1, 0.1, 1), mat); ctx.scene.add(m); return m; });
    const avatar = await makeAvatar(ctx, this.playerLook());
    avatar.play('Balance');
    this.playerLane = 0;
    this.lanes.push({ i: 0, x: 0, z: 0, who: 'player', avatar, driver: this.localDriver(ctx), name: 'You' });
    this.lanes[0].sim = this.makeSim(ctx, this.lanes[0]);
    this.kevinB = place(ctx, 'kevin', 0, -9, 0, { actors: true, scale: 0.9 });
    ctx.particles.register('splash', { count: [40, 60], life: [0.5, 1.1], speed: [3, 6], gravity: 12, size: [1, 3], colors: ['white', 'cyan', 'sky'], spread: 55, direction: [0, 1, 0], radius: 0.5 });
    ctx.particles.register('gustline', { count: [1, 2], life: [0.4, 0.7], speed: [8, 12], direction: [1, 0, 0], spread: 8, size: [1, 1], colors: ['white', 'mist'] });
    this.gl = new Vector3();
  }
  cardInfo() { return { goal: 'Push forward to walk. Balance left and right. Cross.', prompts: [['lean', 'Forward: walk. Sideways: balance']] }; }
  view(ctx, dt) {
    const s = this.lanes[0].sim, a = this.lanes[0].avatar;
    const sag = (z, x = 0) => 2.1 - 0.5 * Math.exp(-((z - s.z) ** 2) / 7);
    const y = sag(s.z);
    const falling = s.fallT > 0;
    if (!falling) {
      a.root.position.set(s.dot.x * 0.3, y + 0.04, -s.z);
      a.root.rotation.y = Math.PI;
      a.lean.x = -s.dot.x; a.lean.y = 0; a.trem = Math.abs(s.dot.x) > 0.6 ? 1 : 0;
      a.play(Math.abs(s.dot.x) > 0.8 ? 'Flail' : s.walking ? 'Walk' : 'Balance', { speed: 0.5 });
      if (ctx.engine.timeScale !== App.devTimeScale && !App.top()) ctx.engine.timeScale = App.devTimeScale;
    } else {
      const f = 1.2 - s.fallT;
      a.root.position.y = Math.max(-1, y - 2.2 * f * f * 2);
      a.root.position.x += s.dot.x * dt * 0.4;
      a.play('SkyFlail');
      if (!this.splashed && a.root.position.y < 0) { this.splashed = true; App.sfx('splash'); ctx.particles.burst('splash', [a.root.position.x, 0, a.root.position.z]); ctx.engine.shake.add(0.2); this.ripples.splash(a.root.position.x, a.root.position.z, 1, 0.5); }
    }
    a.groundY = -0.2;
    // Sag the line under your feet.
    this.segs.forEach((m, i) => {
      const z0 = (i / 24) * (SLACK_LENGTH + 2) - 1, z1 = ((i + 1) / 24) * (SLACK_LENGTH + 2) - 1, y0 = sag(z0), y1 = sag(z1);
      m.position.set(0, (y0 + y1) / 2, -(z0 + z1) / 2); m.scale.z = Math.hypot(z1 - z0, y1 - y0) + 0.02; m.rotation.x = Math.atan2(y1 - y0, z1 - z0);
    });
    // Camera low behind you.
    const c = ctx.camera.camera; c.position.set(s.dot.x * 0.2, 3.1, -s.z + 5.6); c.lookAt(0, 2.5, -s.z - 6); this.target.set(0, 2, -s.z);
    for (const f of this.flags) { f.scale.x = s.warn > 0 ? 1.2 : 0.8; f.position.x = -1.45 + (s.warn > 0 ? s.warnDir * 0.0 : 0); f.rotation.y = s.warn > 0 ? (s.warnDir > 0 ? 0 : Math.PI) : Math.sin(ctx.time * 3 + f.position.z) * 0.3; }
    for (const e of s.events.splice(0)) {
      if (e === 'warn' && !App.bark) App.barkLine(s.warnDir > 0 ? 'Wind from the left. It is rude.' : 'Wind from the right. It is rude.', 'coach', 1.4);
      if (e === 'gust') App.sfx('gust');
      if (e === 'fall') { ctx.engine.timeScale = 0.35; this.splashed = false; App.barkLine(this.cosmetic.pick(BARKS.fall), 'ounce', 2); }
      if (e === 'kevin') { App.sfx('squawk'); App.barkLine('Kevin has landed on you. He is staff.', 'ounce', 2.2); }
      if (e === 'finish') { App.sfx('fanfare'); a.play('Victory', { once: true }); }
    }
    if (s.warn > 0 || s.gust > 0) { this.gl.set(this.cosmetic.range(-5, 5), this.cosmetic.range(1, 3), -s.z - this.cosmetic.range(1, 8)); ctx.particles.burst('gustline', this.gl, { direction: [s.warnDir || s.gustDir, 0, 0] }); }
    const k = this.kevinB.object;
    if (s.kevin && !falling) { k.position.set(a.root.position.x, y + 1.64, -s.z); k.rotation.y = Math.PI; } else if (!s.kevin) k.position.y = -9;
    this.water?.update(ctx.time); this.ripW?.update(ctx.time); this.ripples.step(dt);
  }
  drawPlay(ctx, hud) {
    const s = this.lanes[0].sim, W = hud.width;
    App.dialCenter.x = W / 2; App.dialCenter.y = 72;
    dial(hud, W / 2, 72, 26, { ringR: 1, x: s.dot.x, y: 0, inside: Math.abs(s.dot.x) < 0.45 });
    bar(hud, 12, 34, W - 24, 6, s.z / SLACK_LENGTH, 'lime');
    for (const m of [10, 20]) hud.rect(12 + (m / SLACK_LENGTH) * (W - 24), 32, 2, 10, 'sand');
    this.drawTopBar(hud, `${s.z.toFixed(1)} m`, `${Math.max(0, Math.ceil(SLACK_LIMIT - s.t))} s  Falls ${s.falls}`);
    if (s.warn > 0) say(hud, s.warnDir > 0 ? W / 2 + 40 : W / 2 - 40 - 96, 66, s.warnDir > 0 ? 'Wind >>>' : '<<< Wind', { scale: 2, color: 'orange' });
    if ((this.phase === 'play' || this.phase === 'practice') && !App.attract) promptBar(hud, [['lean', s.walking ? 'Walking' : 'Forward to walk'], ['pause', 'Pause']]);
    void say;
  }
}
