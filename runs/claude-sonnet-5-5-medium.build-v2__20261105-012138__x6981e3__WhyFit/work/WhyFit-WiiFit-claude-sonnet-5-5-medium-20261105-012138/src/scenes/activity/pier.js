// Pier Jump: tuck to build speed, press at the lip, steady the Dot in flight, cannonball for style. Three attempts, three judges.
import { SoloActivity } from './solo.js';
import { T } from '../../core/tunables.js';
import { SKILLS } from '../../core/drivers.js';
import { place, makeSea, slab } from '../../art/world.js';
import { makeAvatar, NPC_LOOKS } from '../../art/avatar.js';
import { say } from '../../ui/font.js';
import { panel, disc, ring } from '../../ui/widgets.js';
import { THREE, applySky, skyAt, toonMaterial, PALETTE } from '../../../pixel-engine.js';

const RUN = 5, FLIGHT = 3.5, SPLASH = 2.2, JUDGE = 2.2, PIER_L = 40, TOP = 2.3;
export class PierActivity extends SoloActivity {
  get duration() { return 120; }
  goal() { return 'Hold the Dot low to build speed. Press at the lip. Steady yourself in the air. Three jumps.'; }
  controls() { return [['lean', 'Tuck: lean down'], ['jump', 'Jump at the lip / cannonball']]; }
  async stage(ctx) {
    applySky(ctx.engine, skyAt(14));
    this.water = makeSea(ctx, [20, 0.2, 0], [160, 60], { ripples: true });
    place(ctx, 'pier', [-PIER_L / 2 - 5, TOP - 0.7, 0], { scale: 1 }); const deck = slab(ctx, [PIER_L + 10, 0.3, 3], [-PIER_L / 2, TOP - 0.15, 0], 'sand'); ctx.scene.add(deck);
    for (let x = -PIER_L; x <= 0; x += 4) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, TOP + 1, 0.4), toonMaterial(PALETTE.plum)); p.position.set(x, TOP / 2 - 0.5, -1.2); ctx.scene.add(p); }
    this.judges = [];
    for (let i = 0; i < 3; i++) { const a = await makeAvatar(ctx, NPC_LOOKS.judge); a.setPos(14 + i * 4, 0.3, -3.5, 0); a.addTo(ctx.scene); a.play('Idle'); this.judges.push({ a, n: 0, up: 0 }); }
    for (let i = 0; i < 3; i++) slab(ctx, [3, 0.4, 3], [14 + i * 4, 0, -3.5], 'white');
    ctx.particles.register('splash', { count: [14, 22], life: [0.5, 1], speed: [2, 6], gravity: 12, size: [1, 2], colors: ['white', 'cyan', 'sky'] });
    this.app.music('lagoon');
    this.cannon = false; this.attempts = []; this.reset();
  }
  reset() { Object.assign(this, { att: 0, st: 'run', stT: 0, speed: 6, p: 0, dist: 0, ringIn: 0, ringN: 0, pressed: false, x: -PIER_L, y: TOP, best: 0, style: 0, shownDist: 0, slow: 0, pressT: null }); this.dot.reset(); this.attempts = []; }
  resetPlay() { this.reset(); }
  botControl(inp, dt) {
    const sk = SKILLS[this.driver.skill]; const d = this.driver; d.tx = 0; d.ty = this.st === 'run' ? -0.6 : 0; d.read(inp, this.ctx, dt, this.pt);
    if (!sk) return;
    const errS = { sloppy: 0.3, average: 0.15, good: 0.07, expert: 0.03 }[this.driver.skill] ?? 0.1;
    const when = RUN + Math.sin(this.att * 5.1 + 1) * errS * (this.driver.skill === 'sloppy' ? 1.4 : 1);
    if (this.st === 'run' && !this.botPressed && this.stT >= when) { inp.confirm = true; this.botPressed = true; }
    if (this.st === 'flight' && !this.botCannon && this.stT > FLIGHT - 0.4 && this.driver.skill !== 'sloppy') { inp.confirm = true; this.botCannon = true; }
  }
  inZone() { return this.dot.y >= -0.8 && this.dot.y <= -0.4; }
  playFixed(dt) {
    const inp = this.read(dt, this.pt);
    this.stT += dt;
    const ringR = this.app.ring(0.45) * (this.cheat ? 2 : 1);
    if (this.st === 'run') {
      this.dot.step(dt, inp.x, inp.y, T, { noise: this.app.noise() * 0.8 });
      if (this.inZone()) this.speed = Math.min(14, this.speed + 2.4 * dt); else this.speed = Math.max(6, this.speed - 1.2 * dt);
      this.x = -PIER_L * (1 - Math.min(1, this.stT / RUN));
      if (inp.confirm && !this.pressed && this.stT > 3) { this.pressed = true; this.pressT = this.stT; }
      if (this.stT >= RUN + 0.25 || (this.pressed && this.stT >= RUN)) this.startFlight();
    } else if (this.st === 'flight') {
      this.dot.step(dt, inp.x, inp.y, T, { inst: 3 / T.dotInstability * 0.6, noise: this.app.noise() });
      this.ringN += dt; if (Math.hypot(this.dot.x, this.dot.y) <= ringR) this.ringIn += dt;
      if (inp.confirm && this.stT > FLIGHT - 0.5 && !this.cannon) { this.cannon = true; this.style++; this.app.sfx('whistle'); }
      const s = Math.min(1, this.stT / FLIGHT);
      this.x = this.dist * s; this.y = TOP * (1 - s) + 4 * 2.6 * s * (1 - s);
      if (this.stT >= FLIGHT) this.splash();
    } else if (this.st === 'splash') {
      if (this.stT >= SPLASH) { this.st = 'judge'; this.stT = 0; this.judgeUp(); }
    } else if (this.st === 'judge') {
      if (this.stT >= JUDGE) { this.att++; if (this.att >= 3) { this.endEarly(); } else { this.nextAttempt(); } }
    }
  }
  startFlight() {
    const p = this.pressT == null ? 0 : Math.max(0, 1 - Math.abs(this.pressT - RUN) / 0.25);
    this.p = p; this.ringIn = 0; this.ringN = 0; this.cannon = false;
    this.pre = { speed: this.speed, p };
    this.st = 'flight'; this.stT = 0; this.dot.reset(); this.app.sfx('whoosh');
    this.dist = 0; // set at the end from the ring fraction; fly toward a provisional distance
    this.provisional = this.speed * (0.8 + 0.6 * p) * (0.6 + 0.4 * 0.7) * T.pierBoost;
    this.dist = this.provisional;
  }
  splash() {
    const frac = this.ringN ? this.ringIn / this.ringN : 0;
    const D = this.pre.speed * (0.8 + 0.6 * this.pre.p) * (0.6 + 0.4 * frac) * T.pierBoost;
    this.dist = D; this.shownDist = D; this.attempts.push(+D.toFixed(1)); this.best = Math.max(this.best, D);
    this.st = 'splash'; this.stT = 0; this.x = D; this.y = 0;
    const calm = this.app.settings.reduceFlashes; this.ctx.engine.hitstop(0.1); this.ctx.engine.shake.add(calm ? 0.15 : 0.5); this.app.sfx('splash'); this.ctx.particles.burst('splash', [D, 0.4, 0], { count: 40 }); this.water.rf?.splash(Math.min(D, 38), 0, 1.2, 0.8);
    if (!calm) this.ctx.engine.screen.shockwave?.([D, 0.4, 0], { radius: 0.4 });
    this.ctx.engine.timeScale = 0.25; this.slowT = 0.8; this.ctx.tweens.call(0.8, () => { this.ctx.engine.timeScale = 1; });
  }
  judgeUp() {
    this.judges.forEach((j, i) => { j.n = Math.max(1, Math.min(10, Math.round(this.shownDist / 4 + (this.cannon ? 1 : 0) + (i - 1) * 0.5))); j.up = 2; j.a.play('Paddle'); });
  }
  nextAttempt() {
    this.st = 'run'; this.stT = 0; this.speed = 6; this.pressed = false; this.pressT = null; this.cannon = false; this.botPressed = false; this.botCannon = false; this.dot.reset(); this.x = -PIER_L; this.y = TOP;
    this.judges.forEach((j) => { j.up = 0; j.a.play('Idle'); });
    this.bark('coach', ['Again. The water has been waiting.', 'Last one. For real. Not like the reps.'][this.att - 1] ?? 'Go.', 2.5);
  }
  scoreNow() { return +this.best.toFixed(1); }
  finalResult() { if (this.forcedStars != null) { const f = this.forcedStars; return { score: f === 0 ? 4 : this.A.stars[f - 1], stars: f, seconds: 40 }; } const s = this.scoreNow(); return { score: s, stars: this.A.stars.filter((t) => s >= t * T.starThresholdScale).length, seconds: 36 }; }
  frameTick(ctx, dt) {
    this.water.update(ctx.time); this.water.rf?.step(dt);
    const a = this.av, x = this.x, y = this.y;
    if (this.st === 'run') { a.play('Run', { timeScale: 0.7 + this.speed / 14, fade: 0.1 }); a.setPos(x, TOP, 0, Math.PI / 2); }
    else if (this.st === 'flight') { a.play(this.cannon ? 'Cannon' : 'Tuck', { fade: 0.1 }); a.setPos(x, y, 0, Math.PI / 2); a.root.rotation.z = this.cannon ? 0 : 0; }
    else { a.play('Idle'); a.root.visible = this.st !== 'splash' || this.stT < 0.1; a.setPos(this.x, 0, 0, Math.PI / 2); if (this.st === 'judge') a.root.visible = false; }
    if (this.st === 'run') a.root.visible = true;
    a.update(dt); this.judges.forEach((j) => { j.a.update(dt); });
    this.cam([x - 3 + 8, 3.1, 15], [x + 5, 1.8, 0], 40);
  }
  drawPlay(hud) {
    const w = hud.width;
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, 12, 24, `Jump ${Math.min(3, this.att + 1)} / 3`, { scale: 2, color: 'sand' });
    say(hud, w - 12, 12, `Best ${this.best.toFixed(1)} m`, { anchor: 'r', scale: 2, color: 'white' });
    if (this.st === 'run') {
      const d = { cx: Math.floor(w / 2), cy: 56, r: 40 }, sc = d.r / 1.3;
      this.driver.dial && (this.driver.dial.x = d.cx, this.driver.dial.y = d.cy);
      disc(hud, d.cx, d.cy, d.r, 'night'); ring(hud, d.cx, d.cy, d.r, 'slate', 2);
      hud.rect(d.cx - Math.round(d.r * 0.7), d.cy + Math.round(0.4 * sc), Math.round(d.r * 1.4), Math.round(0.4 * sc), this.inZone() ? 'lime' : 'navy');
      const px = Math.round(d.cx + this.dot.x * sc), py = Math.round(d.cy - this.dot.y * sc); disc(hud, px, py, 4, 'ink'); disc(hud, px, py, 3, this.inZone() ? 'lime' : 'sand');
      say(hud, d.cx, d.cy + d.r + 4, `Speed ${this.speed.toFixed(1)} m/s`, { anchor: 'c', color: 'white' });
      const k = Math.max(0, Math.min(1, (this.stT - 3.6) / 1.8)); const lipX = Math.floor(w / 2) - 60;
      hud.rect(lipX, hud.height - 60, 120, 6, 'mist'); hud.rect(lipX + 60 - 12, hud.height - 62, 24, 10, 'lime'); hud.rect(lipX + Math.round(120 * Math.min(1, this.stT / (RUN + 0.5))), hud.height - 64, 3, 14, 'ink');
      say(hud, w / 2, hud.height - 80, 'Press at the lip', { anchor: 'c', color: 'white' });
    } else if (this.st === 'flight') {
      const d = { cx: Math.floor(w / 2), cy: 56, r: 40 }, sc = d.r / 1.3;
      this.driver.dial && (this.driver.dial.x = d.cx, this.driver.dial.y = d.cy);
      disc(hud, d.cx, d.cy, d.r, 'night'); ring(hud, d.cx, d.cy, d.r, 'slate', 2);
      const inside = Math.hypot(this.dot.x, this.dot.y) <= this.app.ring(0.45);
      ring(hud, d.cx, d.cy, Math.round(this.app.ring(0.45) * sc), inside ? 'lime' : 'red', 2);
      const px = Math.round(d.cx + this.dot.x * sc), py = Math.round(d.cy - this.dot.y * sc); disc(hud, px, py, 4, 'ink'); disc(hud, px, py, 3, inside ? 'lime' : 'sand');
      if (this.stT > FLIGHT - 0.5) say(hud, w / 2, hud.height - 70, 'Cannonball!', { anchor: 'c', scale: 2, color: 'orange' });
      say(hud, d.cx, d.cy + d.r + 4, `Power ${Math.round(this.p * 100)}%`, { anchor: 'c', color: 'white' });
    } else if (this.st === 'splash' || this.st === 'judge') {
      say(hud, w / 2, 40, `${this.shownDist.toFixed(1)} m`, { anchor: 'c', scale: 4, color: 'white', shadow: 'navy' });
      if (this.st === 'judge') this.judges.forEach((j, i) => { const [x, y] = this.projJudge(hud, i); panel(hud, x - 12, y - 14, 24, 20, { shadow: false }); say(hud, x, y - 9, String(j.n), { anchor: 'c', scale: 2, color: 'ink', shadow: false }); });
    }
  }
  projJudge(hud, i) { const v = new THREE.Vector3(14 + i * 4, 3.4, -3.5).project(this.ctx.camera.camera); return [Math.round((v.x + 1) / 2 * hud.width), Math.round((1 - v.y) / 2 * hud.height)]; }
  extraState() { return { act: this.actId, att: this.att, st: this.st, best: +this.best.toFixed(1), attempts: this.attempts, result: this.result }; }
}
