// 5.8 Island Jog. A rail run around the whole island. Alternate left and right.
import { THREE, Trail } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar } from '../../art/avatar.js';
import { buildIsland, JOG_POINTS } from '../../art/island.js';
import { place } from '../../art/stage.js';
import { T } from '../../core/tunables.js';
import { CAST_LOOKS } from '../../data/classmates.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { bar } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';
const { CatmullRomCurve3, Vector3 } = THREE;
export function makePath() {
  const curve = new CatmullRomCurve3(JOG_POINTS.map(([x, z]) => new Vector3(x, 0, z)), true, 'catmullrom', 0.5);
  curve.arcLengthDivisions = 800;
  return { curve, length: curve.getLength() };
}
export class JogSim {
  s = 0; t = 0; lat = 0; cad = 0; speed = 0; side = null; stumble = 0; stitch = 0; over = 0; inBandT = 0; cups = 0; done = false; events = []; lastStep = -9; coachS = 4; limit = 120; score = 0;
  constructor(cfg, env, rng, length) {
    this.cfg = cfg; this.env = env; this.rng = rng; this.length = length;
    this.cupList = Array.from({ length: 18 }, (_, i) => ({ s: ((i + 1) / 19) * length, lat: (rng.next() * 2 - 1) * 1.2, got: false }));
    this.hazards = Array.from({ length: 12 }, (_, i) => ({ s: ((i + 0.5) / 12) * length + rng.next() * 3, lat: (rng.next() * 2 - 1) * 1.2, kind: ['sprinkler', 'picnic', 'dennis', 'kevin'][i % 4], hit: false }));
  }
  get target() { return 3 * (this.cfg.speed ?? 1); }
  band() { const c = T.jogTargetCadence * (this.cfg.speed ?? 1); return [c * 0.8, c * 1.2]; }
  step(dt, u) {
    this.t += dt;
    if (u.stepL || u.stepR) {
      const f = u.stepL ? 'L' : 'R';
      if (f === this.side) { this.stumble = 0.5; this.events.push('stumble'); }
      else { const dtStep = this.t - this.lastStep; if (dtStep > 0.02) { const inst = 1 / dtStep; this.cad += (inst - this.cad) * 0.45; } this.lastStep = this.t; this.events.push('foot'); }
      this.side = f;
    }
    if (this.t - this.lastStep > 0.6) this.cad = Math.max(0, this.cad - 4 * dt);
    if (this.env.god) { this.cad = T.jogTargetCadence * (this.cfg.speed ?? 1); this.stumble = 0; this.stitch = 0; }
    const [low, high] = this.band();
    if (this.cad > high) { this.over += dt; if (this.over > 2 && this.stitch <= 0) { this.stitch = 3; this.over = 0; this.events.push('stitch'); } } else this.over = 0;
    const mul = this.stitch > 0 ? 0.5 : 1;
    this.stitch = Math.max(0, this.stitch - dt);
    this.stumble = Math.max(0, this.stumble - dt);
    const tgt = this.stumble > 0 ? 0 : this.target * (this.cad / (T.jogTargetCadence * (this.cfg.speed ?? 1))) * mul;
    this.speed += (Math.min(tgt, this.target * 1.25) - this.speed) * Math.min(1, dt * 5);
    this.s += this.speed * dt;
    if (this.cad >= low && this.cad <= high && this.stumble <= 0) this.inBandT += dt;
    this.lat = Math.max(-1.5, Math.min(1.5, this.lat + u.x * 3 * dt));
    // Coach paces you at exactly target speed; more than 12 m behind, she waits.
    if (this.coachS - this.s < 12) this.coachS += this.target * dt;
    for (const c of this.cupList) if (!c.got && Math.abs(c.s - this.s) < 0.9 && Math.abs(c.lat - this.lat) < 0.8) { c.got = true; this.cups++; this.events.push('cup'); }
    for (const h of this.hazards) if (!h.hit && Math.abs(h.s - this.s) < 0.7 && Math.abs(h.lat - this.lat) < 0.55 && !this.env.god) { h.hit = true; this.stumble = 0.5; this.events.push(`hit:${h.kind}`); }
    this.score = this.compute();
    if (this.s >= this.length || this.t >= this.limit) this.done = true;
  }
  compute() { const dur = Math.max(this.length / this.target, this.t); return 70 * Math.min(1, this.inBandT / dur) * (1 / 1) + 30 * (this.cups / 18); }
  final() { return this.compute(); }
  result() { return { score: Math.round(this.compute()), stats: { cups: this.cups, seconds: Math.round(this.t) } }; }
  bot(driver, out) {
    const sk = driver.skill;
    if (driver.nextStep === undefined) driver.nextStep = this.t + 0.3;
    if (this.t >= driver.nextStep) {
      const c = T.jogTargetCadence * (this.cfg.speed ?? 1);
      const bad = driver.rng.next() < sk.mistake * 0.2;
      const foot = (this.side === 'L') !== bad ? 'R' : 'L';
      if (foot === 'L') out.stepL = true; else out.stepR = true;
      driver.nextStep = this.t + (1 / c) * (1 + (driver.rng.next() - 0.5) * sk.jitter * 6) * (sk.name === 'sloppy' ? 1.35 : 1);
    }
    let tl = 0, best = 12;
    for (const cu of this.cupList) { const d = cu.s - this.s; if (!cu.got && d > 0.3 && d < best) { best = d; tl = cu.lat; } }
    for (const h of this.hazards) { const d = h.s - this.s; if (!h.hit && d > 0 && d < 5 && Math.abs(h.lat - tl) < 0.6) tl = h.lat > 0 ? h.lat - 0.9 : h.lat + 0.9; }
    out.x = Math.max(-1, Math.min(1, (tl - this.lat) * 2.5 * (sk.hit)));
  }
}
export class JogScene extends ActivityScene {
  cameraConfig() { return { preset: 'iso', zoom: 1.4 }; }
  makeSim(ctx, lane) { return new JogSim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`jog-${this.simN = (this.simN ?? 0) + 1}`), this.path.length); }
  async buildStage(ctx) {
    this.path = makePath();
    this.world = await buildIsland(ctx, { jog: true });
    const avatar = await makeAvatar(ctx, this.playerLook());
    this.playerLane = 0;
    this.lanes.push({ i: 0, who: 'player', avatar, driver: this.localDriver(ctx), name: 'You' });
    const sim = this.lanes[0].sim = this.makeSim(ctx, this.lanes[0]);
    this.coach = await makeAvatar(ctx, CAST_LOOKS.coach); this.coach.play('Sit');
    this.scooter = place(ctx, 'mobility-scooter', 0, 0, 0, { actors: true });
    this.trail = new Trail({ width: 0.3, life: 0.6, points: 32, color: 0x73eff7, tail: 0xf4f4f4 }); ctx.scene.add(this.trail);
    this.cupObjs = sim.cupList.map((c) => { const b = place(ctx, 'water-cup', 0, 0, 0); this.putOn(b.object, c.s, c.lat); return b.object; });
    this.hazObjs = sim.hazards.map((h) => {
      const id = { sprinkler: 'sprinkler', picnic: 'picnic', dennis: null, kevin: 'kevin' }[h.kind];
      if (id) { const b = place(ctx, id, 0, 0, 0); this.putOn(b.object, h.s, h.lat); return b.object; }
      return null;
    });
    this.dennisA = await makeAvatar(ctx, CAST_LOOKS.dennis);
    const dh = sim.hazards.find((h) => h.kind === 'dennis'); this.putOn(this.dennisA.root, dh.s, dh.lat); this.dennisA.play('Daze');
    ctx.particles.register('sweat', { count: [2, 4], life: [0.25, 0.45], speed: [1, 2.5], gravity: 8, size: [1, 1], colors: ['cyan', 'white'] });
    this.p = new Vector3(); this.tan = new Vector3();
  }
  putOn(obj, s, lat) {
    const u = Math.min(0.9999, Math.max(0, (s % this.path.length) / this.path.length));
    const p = this.path.curve.getPointAt(u), t = this.path.curve.getTangentAt(u);
    obj.position.set(p.x + t.z * lat, 0.02, p.z - t.x * lat); obj.rotation.y = Math.atan2(t.x, t.z);
    return { p, t };
  }
  cardInfo() { return { goal: 'Alternate your feet. Keep up with the scooter. Take the water.', prompts: [['feet', 'Left, right'], ['lean', 'Move across the path']] }; }
  onResetSims(ctx) { const s = this.lanes[0].sim; this.cupObjs.forEach((o, i) => { o.visible = true; this.putOn(o, s.cupList[i].s, s.cupList[i].lat); }); }
  view(ctx, dt) {
    const s = this.lanes[0].sim, a = this.lanes[0].avatar;
    const { p } = this.putOn(a.root, s.s, s.lat);
    a.root.position.y = 0;
    this.target.set(a.root.position.x, 1, a.root.position.z);
    if (s.speed > 0.2) a.play('Jog', { speed: Math.max(0.3, s.speed / 3) }); else a.play(s.stumble > 0 ? 'Daze' : 'Idle');
    this.putOn(this.scooter.object, s.coachS, 0); this.coach.root.position.copy(this.scooter.object.position); this.coach.root.position.y = 0.32; this.coach.root.rotation.y = this.scooter.object.rotation.y;
    s.cupList.forEach((c, i) => { if (c.got) this.cupObjs[i].visible = false; });
    this.coach.update(dt); this.dennisA.update(dt);
    this.trail.push(this.v.set(a.root.position.x, 0.25, a.root.position.z), ctx.time); this.trail.update(ctx.time, ctx.camera.camera);
    this.world.update(ctx, dt);
    for (const e of s.events.splice(0)) {
      if (e === 'foot') App.sfx('repTick', { volume: 0.4 });
      if (e === 'cup') { App.sfx('jarDrip'); ctx.particles.burst('sparkle', [a.root.position.x, 1, a.root.position.z], { count: 6, colors: ['cyan', 'white'] }); }
      if (e === 'stumble') { App.sfx('wobble'); ctx.particles.burst('dust', [a.root.position.x, 0.1, a.root.position.z]); }
      if (e === 'stitch') App.barkLine('That is a stitch. You were told. I was going to tell you.', 'ounce', 2.4);
      if (e.startsWith('hit:')) { App.sfx('thwap'); App.barkLine({ 'hit:sprinkler': 'A sprinkler. It was not hiding.', 'hit:picnic': 'That was someone\'s lunch.', 'hit:dennis': 'Dennis: "It\'s fine. It\'s just the one leg."', 'hit:kevin': 'Kevin would like a word. He has only the one.' }[e], e === 'hit:dennis' ? 'dennis' : 'ounce', 2); ctx.engine.shake.add(0.2); }
    }
    void p;
  }
  drawPlay(ctx, hud) {
    const s = this.lanes[0].sim, W = hud.width, [low, high] = s.band();
    App.dialCenter.x = W / 2; App.dialCenter.y = hud.height / 2;
    this.drawTopBar(hud, Math.round(s.score), `Cups ${s.cups}/18`);
    const gx = W / 2 - 70, gy = 28, gw = 140, mx = 5.5;
    bar(hud, gx, gy, gw, 9, 0, 'lime');
    hud.rect(gx + (low / mx) * gw, gy + 1, ((high - low) / mx) * gw, 7, 'green');
    hud.rect(gx + (Math.min(mx, s.cad) / mx) * gw - 1, gy - 1, 3, 11, s.cad > high ? 'red' : 'white');
    center(hud, gy + 12, s.stitch > 0 ? 'Stitch.' : s.stumble > 0 ? 'Stumble.' : s.coachS - s.s >= 12 ? 'She is waiting.' : 'Pace', { color: s.stitch > 0 ? 'red' : 'white' });
    bar(hud, 12, hud.height - 26, W - 24, 5, s.s / s.length, 'lime');
    if ((this.phase === 'play' || this.phase === 'practice') && !App.attract) promptBar(hud, [['feet', 'Left, right'], ['lean', 'Move'], ['pause', 'Pause']]);
    void say;
  }
}
