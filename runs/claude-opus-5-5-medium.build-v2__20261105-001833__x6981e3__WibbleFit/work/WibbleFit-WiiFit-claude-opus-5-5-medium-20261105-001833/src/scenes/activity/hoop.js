// 5.3 Hoop Economics. Circle the stick to keep hoops up.
import { App } from '../../app.js';
import { makeHoopMesh } from '../../art/avatar.js';
import { T } from '../../core/tunables.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { bar, disc, line, ring } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';
const TAU = Math.PI * 2;
export class HoopSim {
  t = 0; L = 0.5; speed = 0; last = null; rot = 0; score = 0; hoops = 1; mult = 1; dropped = 0; done = false; events = []; ang = 0; inBand = false; wrong = false; next = 9; throwAt = null; side = 0; caught = 0; flick = false;
  constructor(cfg, env, rng, { seconds = 60 } = {}) { this.cfg = cfg; this.env = env; this.rng = rng; this.seconds = seconds; this.dirA = seconds * (25 / 60); this.dirB = seconds * (50 / 60); this.throwRng = rng.fork ? rng.fork('throw') : rng; }
  dir() { return this.t < this.dirA ? 1 : this.t < this.dirB ? -1 : 0; }
  step(dt, u) {
    this.t += dt;
    if (this.t >= this.seconds) { this.done = true; return; }
    const low = this.cfg.low ?? T.hoopLow, high = this.cfg.high ?? T.hoopHigh;
    const mag = Math.hypot(u.x, u.y);
    if (mag > 0.5) {
      const a = Math.atan2(u.y, u.x);
      if (this.last !== null) { let d = a - this.last; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; const inst = d / TAU / dt; this.speed += (inst - this.speed) * Math.min(1, dt / 0.25); }
      this.last = a;
    } else { this.speed += (0 - this.speed) * Math.min(1, dt / 0.25); this.last = null; }
    const dir = this.dir(), s = dir === 0 ? Math.abs(this.speed) : this.speed * dir;
    this.inBand = s >= low && s <= high; this.wrong = s < -0.2;
    if (this.env.god) { this.inBand = true; this.wrong = false; this.speed = 1.6 * (dir || 1); }
    if (this.dropped > 0) {
      this.dropped -= dt;
      if (this.dropped <= 0) { this.L = 0.35; this.events.push('pickup'); }
    } else {
      this.L += (this.inBand ? T.hoopLiftRate : this.wrong ? -0.5 : -0.25) * dt;
      this.L = Math.min(1, this.L);
      if (this.L <= 0) { this.L = 0; this.dropped = 1.5; this.hoops = Math.max(1, this.hoops - 1); this.mult = 1 + 0.5 * (this.hoops - 1); this.events.push('drop'); }
      if (this.inBand) { const rev = Math.abs(this.speed) * dt; this.rot += rev; this.score += rev * this.mult; }
    }
    this.ang += this.speed * TAU * dt;
    // June throws a hoop every ~9 s; flick toward it in the last .4 s to catch it.
    if (this.throwAt === null && this.t >= this.next && this.hoops < 4 && this.t < this.seconds - 3) {
      this.side = this.throwRng.next() < 0.5 ? -1 : 1; this.throwAt = this.t + 1.5; this.events.push('throw');
    }
    if (this.throwAt !== null) {
      const left = this.throwAt - this.t;
      // A flick has to be held: circling past that side on its own doesn't count.
      this.flickT = left <= 0.5 && Math.abs(u.x) > 0.7 && Math.sign(u.x) === this.side ? (this.flickT ?? 0) + dt : 0;
      if (this.flickT >= 0.26 && left > -0.05) { this.flickT = 0; this.hoops++; this.mult = 1 + 0.5 * (this.hoops - 1); this.caught++; this.throwAt = null; this.next = this.t + 7.5 + this.throwRng.next() * 3; this.events.push('catch'); }
      else if (left <= -0.05) { this.throwAt = null; this.next = this.t + 7.5 + this.throwRng.next() * 3; this.events.push('miss'); }
    }
  }
  final() { return this.score; }
  result() { return { score: Math.round(this.score), stats: { rotations: Math.round(this.rot), caught: this.caught } }; }
  bot(driver, out, dt) {
    const sk = driver.skill;
    driver.a = (driver.a ?? 0) + TAU * sk.circle * (this.dir() || 1) * dt * (1 + Math.sin(this.t * 0.9) * (sk.name === 'sloppy' ? 0.5 : 0.1));
    out.x = Math.cos(driver.a) * 0.95; out.y = Math.sin(driver.a) * 0.95;
    if (this.throwAt !== null) {
      const left = this.throwAt - this.t;
      if (left <= 0.42 && left > -0.04) {
        if (driver.decided !== this.throwAt) { driver.decided = this.throwAt; driver.willCatch = driver.rng.next() < sk.catch; }
        if (driver.willCatch) { out.x = this.side; out.y = 0; }
      }
    }
  }
}
export const hoopView = {
  kind: 'hoop',
  enter(scene, lane) {
    lane.avatar.play('HoopStance');
    const ctx = scene.ctx; lane.hoops = [];
    for (let i = 0; i < 4; i++) { const h = makeHoopMesh(0.5 + i * 0.03, ['orange', 'cyan', 'lime', 'red'][i]); h.visible = false; ctx.scene.add(h); lane.hoops.push(h); }
    lane.thrown = makeHoopMesh(0.5, 'sand'); lane.thrown.visible = false; ctx.scene.add(lane.thrown);
    (scene.viewObjects ??= []).push(...lane.hoops, lane.thrown);
  },
  update(scene, lane, dt) {
    const s = lane.sim; if (!s) return;
    const a = lane.avatar, base = a.root.position, wob = s.dropped > 0 ? 0 : 1;
    const ang = s.ang;
    a.pelvisOff.x = Math.cos(ang) * 0.05 * wob; a.pelvisOff.z = Math.sin(ang) * 0.04 * wob;
    lane.hoops.forEach((h, i) => {
      h.visible = i < s.hoops && s.dropped <= 0;
      const y = 0.72 + i * 0.06 + (s.L - 0.5) * 0.3, off = 0.14 + i * 0.03;
      h.position.set(base.x + Math.cos(ang + i) * off, y, base.z + Math.sin(ang + i) * off);
      h.rotation.x = Math.sin(ang) * (0.22 - s.L * 0.16); h.rotation.z = Math.cos(ang) * (0.22 - s.L * 0.16);
    });
    if (s.dropped > 0) { const h = lane.hoops[0]; h.visible = true; h.position.set(base.x, 0.06, base.z); h.rotation.set(0, 0, 0); }
    if (s.throwAt !== null) {
      const left = s.throwAt - s.t, f = 1 - left / 1.5;
      lane.thrown.visible = true; lane.thrown.position.set(base.x + s.side * (2.6 - 2.6 * f), 0.8 + Math.sin(f * Math.PI) * 1.6, base.z); lane.thrown.rotation.z += dt * 4;
    } else lane.thrown.visible = false;
  },
  draw(scene, hud, lane, box, big) {
    const s = lane.sim; if (!s) return;
    const r = box.r;
    disc(hud, box.x, box.y, r + 2, 'ink'); disc(hud, box.x, box.y, r, 'white');
    ring(hud, box.x, box.y, r, s.inBand ? 'lime' : s.wrong ? 'red' : 'slate', 3);
    const a = s.ang; line(hud, box.x, box.y, box.x + Math.cos(a) * (r - 4), box.y - Math.sin(a) * (r - 4), s.inBand ? 'green' : 'orange', 2);
    disc(hud, box.x, box.y, Math.max(2, r / 10), 'ink');
    bar(hud, box.x - r, box.y + r + 5, r * 2, big ? 7 : 4, s.L, s.L < 0.25 ? 'red' : 'cyan');
    if (big) {
      const d = s.dir(); const txt = d > 0 ? 'Anticlockwise' : d < 0 ? 'The other way' : 'Either way';
      say(hud, box.x - txt.length * 3, box.y + r + 15, txt, { color: 'sand' });
    }
  },
  score: (s) => s.final(),
};
export class HoopScene extends ActivityScene {
  makeSim(ctx, lane) { return new HoopSim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`hoop-${lane.i}-${this.simN = (this.simN ?? 0) + 1}`)); }
  async buildStage(ctx) {
    await this.buildLanes(ctx, 'beach', { coach: false });
    for (const l of this.lanes) hoopView.enter(this, l);
    const { makeAvatar } = await import('../../art/avatar.js');
    const { CAST_LOOKS } = await import('../../data/classmates.js');
    this.june = await makeAvatar(ctx, CAST_LOOKS.june); this.june.setAt(-5.2, 0, -0.6, 0.9);
    this.whirr = ctx.audio.loop('hoopWhirr', { volume: 0 });
    ctx.particles.register('hoopspark', { count: [2, 3], life: [0.3, 0.6], speed: [1, 2], gravity: 2, size: [1, 1], colors: ['white', 'cyan', 'sand'] });
    this.sparkT = 0;
  }
  cardInfo() { return { goal: 'Circle to spin. Flick toward a thrown hoop to catch it.', prompts: [['lean', 'Circle, then flick']] }; }
  onPlayStart() { App.barkLine('Anticlockwise.', 'coach', 1.5); this.saidOther = false; }
  view(ctx, dt) {
    for (const l of this.lanes) hoopView.update(this, l, dt);
    const s = this.lanes[1].sim;
    this.june.update(dt);
    for (const e of s.events.splice(0)) {
      if (e === 'drop') { App.sfx('hoopDrop'); App.barkLine('You have dropped your hoop. I will not tell it.', 'ounce', 2); }
      if (e === 'catch') { App.sfx('hoopCatch'); App.barkLine('Another hoop. The market is responding.', 'ounce', 1.6); }
      if (e === 'throw') { this.june.play('Punch', { once: true }); App.barkLine('June: "Catch."', 'june', 1.2); }
    }
    if (!this.saidOther && s.dir() < 0 && this.phase === 'play') { this.saidOther = true; App.barkLine('Now the other way.', 'coach', 1.5); }
    if (this.whirr) this.whirr.set({ volume: this.phase === 'play' && s.inBand ? 0.5 : 0 });
    this.sparkT -= dt;
    if (s.inBand && this.sparkT <= 0 && this.phase === 'play') { this.sparkT = 0.2; ctx.particles.burst('hoopspark', [this.lanes[1].x, 1, 0.8]); }
  }
  drawPlay(ctx, hud) {
    const W = hud.width, s = this.lanes[1].sim;
    hoopView.draw(this, hud, this.lanes[1], { x: Math.round(W / 2), y: 52, r: 30 }, true);
    App.dialCenter.x = W / 2; App.dialCenter.y = 52;
    this.drawTopBar(hud, Math.round(s.score), `x${s.mult.toFixed(1)}  ${s.hoops} hoop${s.hoops > 1 ? 's' : ''}`);
    if (s.throwAt !== null) { const p = s.side < 0 ? '< Flick' : 'Flick >'; center(hud, 100, p, { scale: 2, color: s.throwAt - s.t <= 0.4 ? 'lime' : 'orange' }); }
    if (this.phase === 'play' && !App.attract) promptBar(hud, [['lean', 'Circle'], ['pause', 'Pause']]);
  }
}
