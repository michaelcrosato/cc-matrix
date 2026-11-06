// Slackline: X is balance, forward is progress. Walking is less stable; stopping to recover is a real choice.
import { SoloActivity } from './solo.js';
import { T } from '../../core/tunables.js';
import { place, makeSea, slab } from '../../art/world.js';
import { makeAvatar, NPC_LOOKS } from '../../art/avatar.js';
import { say } from '../../ui/font.js';
import { panel } from '../../ui/widgets.js';
import { BARKS, pick } from '../../data/lines.js';
import { THREE, toonMaterial, PALETTE, buildModel, applySky, skyAt } from '../../../pixel-engine.js';
import { MODELS } from '../../art/models.js';
import { Dot } from '../../core/dot.js';

const LEN = 30, LIMIT = 75, Y = 1.7;
export class SlackActivity extends SoloActivity {
  get duration() { return LIMIT; }
  goal() { return 'Walk the line. Push forward to walk. The line sways, so lean against it. Thirty metres.'; }
  controls() { return [['lean', 'Left / right: balance. Up: walk']]; }
  howto() { return this.goal() + ' Falling is allowed. Splash is mandatory.'; }
  async stage(ctx) {
    applySky(ctx.engine, skyAt(10));
    this.water = makeSea(ctx, [0, 0.3, -12], [120, 80]);
    slab(ctx, [30, 1, 12], [0, -0.3, 8], 'sand');
    place(ctx, 'slack-anchor', [0, 0, 0.4], { scale: 0.9 }); place(ctx, 'slack-anchor', [0, 0, -LEN - 0.6], { scale: 0.9 });
    for (let i = -1; i <= 1; i += 2) place(ctx, 'palm', [i * 7, 0, -6 - i * 2], { params: { h: 4.5 } });
    this.seg = []; const mat = toonMaterial(PALETTE.white), mat2 = toonMaterial(PALETTE.red);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1), i % 2 ? mat : mat2); ctx.scene.add(m); this.seg.push(m); }
    this.flags = []; for (let k = 1; k <= 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.5), toonMaterial(PALETTE.orange)); f.position.set(2.2 * (k % 2 ? 1 : -1), 2.4, -k * 6); ctx.scene.add(f); this.flags.push(f); }
    this.kev = buildModel('kevin', { catalog: MODELS }).object; this.kev.scale.setScalar(0.6); this.kev.visible = false; ctx.scene.add(this.kev);
    this.coach2 = await makeAvatar(ctx, NPC_LOOKS.coach); this.coach2.setPos(2.6, 0.2, 2.2, -0.6); this.coach2.addTo(ctx.scene); this.coach2.play('Idle');
    this.gr = ctx.random.fork('gust');
    this.av.armsOut = true;
    ctx.particles.register('splash', { count: [14, 22], life: [0.5, 1], speed: [2, 6], gravity: 12, size: [1, 2], colors: ['white', 'cyan', 'sky'] });
    this.app.music('lagoon');
    this.reset();
  }
  reset() {
    Object.assign(this, { prog: 0, falls: 0, ck: 0, fallT: 0, finished: false, gust: null, gustsDone: new Set(), gustSign: [1, -1, 1, -1], walkT: 0, kevinOn: false });
    this.dot.reset();
  }
  resetPlay() { this.reset(); }
  inst() { return this.hard ? this.A.hard.instMul ?? 1 : 1; }
  botControl(inp, dt) {
    const d = this.driver; d.tx = 0; d.ty = 0; d.read(inp, this.ctx, dt, this.pt);
    const sn = d.seen(this.pt, 0.2);
    inp.y = Math.abs(sn.x) < 0.45 && Math.abs(sn.vx) < 0.8 ? 0.8 : 0;
  }
  playFixed(dt, practice) {
    const inp = this.read(dt, this.pt);
    if (this.fallT > 0) { this.fallT -= dt / (this.ctx.engine.timeScale || 1) * (this.ctx.engine.timeScale || 1); if (this.fallT <= 0) { this.ctx.engine.timeScale = 1; this.respawn(); } return; }
    const walking = inp.y > 0.3 && !this.finished;
    const m = { noise: 1.25 * this.app.noise(), inst: (walking ? T.slackWalkInst : 1.2) * this.inst() / T.dotInstability };
    // gust telegraph and push
    const idx = Math.floor((this.prog + 1.7) / 6);
    if (idx >= 1 && idx <= 4 && !this.gustsDone.has(idx) && !this.gust) { this.gust = { k: idx, t: 0, sign: this.gustSign[idx - 1] }; this.gustsDone.add(idx); this.app.sfx('gust', { volume: 0.7 }); }
    if (this.gust) { this.gust.t += dt; if (this.gust.t >= 1.5 && this.gust.t < 2.5) m.bx = this.gust.sign * T.gustForce; if (this.gust.t >= 2.5) this.gust = null; }
    if (this.prog >= 18 && this.prog < 24) { if (!this.kevinOn) { this.kevinOn = true; this.app.sfx('squawk'); this.bark('ounce', 'Kevin has landed on your head. He is staff.', 3); } m.bx = (m.bx ?? 0) + 0.12; } else this.kevinOn = false;
    this.dot.step(dt, inp.x, 0, T, m); this.dot.y = 0; this.dot.vy = 0;
    if (walking) { this.prog = Math.min(LEN, this.prog + 1.1 * dt); this.walkT += dt; }
    if (Math.abs(this.dot.x) > 1 && !this.finished) { this.fall(); return; }
    if (this.prog >= LEN && !this.finished) { this.finished = true; this.finishT = this.playT; this.app.sfx('fanfare'); this.setPhase('outro'); }
  }
  fall() {
    this.falls++; this.fallT = 1.2; this.ctx.engine.timeScale = 0.3; this.fallX = this.dot.x; this.app.sfx('splash'); this.ctx.particles.burst('splash', [this.fallX, 0.4, -this.prog]);
    this.bark('ounce', pick(BARKS.fall, this.app.rng('b')), 2);
    this.fell = true; this.av.play('Fall', { fade: 0.05 });
    this.fallT = 1.2 * 0.3;
  }
  respawn() { this.prog = Math.floor(this.prog / 10) * 10; this.dot.reset(); this.fell = false; for (const k of [...this.gustsDone]) if (k * 6 > this.prog + 1) this.gustsDone.delete(k); this.gust = null; this.av.play('Tiptoe'); }
  scoreNow() { const t = this.finished ? this.finishT : this.playT; return Math.round(1000 - 60 * this.falls - 8 * (t - 27)); }
  finalResult() {
    if (this.forcedStars != null) return { score: [0, 700, 880, 980][this.forcedStars], stars: this.forcedStars, seconds: Math.max(20, this.playT) };
    const t = this.finished ? this.finishT : LIMIT, score = this.finished ? this.scoreNow() : Math.max(0, Math.round(100 * this.prog / LEN)) - 100 + 0;
    const stars = !this.finished ? 0 : this.falls === 0 && t < 32 ? 3 : this.falls <= 1 && t < 45 ? 2 : 1;
    return { score: this.finished ? score : 0, stars, seconds: Math.min(t, LIMIT) };
  }
  frameTick(ctx, dt) {
    const t = this.t, z = -this.prog, x = this.dot.x;
    // line with a sag under the feet
    for (let i = 0; i < this.seg.length; i++) {
      const z0 = -(i / this.seg.length) * LEN, z1 = -((i + 1) / this.seg.length) * LEN, ym = (zz) => Y - 0.12 * Math.exp(-Math.pow((zz - z) / 2.2, 2)) - 0.25 * Math.sin(Math.PI * (-zz) / LEN);
      const a = ym(z0), b = ym(z1), m = this.seg[i];
      m.position.set(0, (a + b) / 2, (z0 + z1) / 2); m.scale.z = Math.abs(z1 - z0) + 0.02; m.rotation.x = Math.atan2(a - b, z0 - z1) * -1;
    }
    const fy = this.fell ? Math.max(0.1, Y - (1.2 - this.fallT) * 3) : Y - 0.12 - 0.25 * Math.sin(Math.PI * this.prog / LEN) + 0.05;
    this.av.setPos(this.fell ? this.fallX : x * 0.4, this.fell ? Math.max(0, fy - 1.7) : fy - 0.0, z, Math.PI);
    this.av.root.position.y = this.fell ? Math.max(0.1, fy - 1.5) : fy;
    if (!this.fell) this.av.play(this.inp.y > 0.3 ? 'Tiptoe' : 'Idle', { fade: 0.15 });
    this.av.setLean(this.dot.x, 0, Math.max(0, (Math.abs(this.dot.x) - 0.6) / 0.4), Math.max(0, (Math.abs(this.dot.x) - 0.85) / 0.15));
    this.av.update(dt);
    this.coach2.update(dt); this.water.update(ctx.time);
    this.kev.visible = this.kevinOn; if (this.kevinOn) this.kev.position.set(this.av.root.position.x, this.av.root.position.y + 1.85, z);
    for (const [i, f] of this.flags.entries()) f.rotation.y = this.gust && this.gust.k === i + 1 ? Math.sin(this.t * 25) * 0.6 : Math.sin(this.t * 3 + i) * 0.1;
    this.cam([x * 0.2, Y + 0.45, z + 4.4], [0, Y + 0.2, z - 6], 40);
  }
  drawPlay(hud) {
    const w = hud.width, t = this.finished ? this.finishT : this.playT;
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, 12, 24, `${this.prog.toFixed(1)} m`, { scale: 2, color: 'sand' });
    say(hud, w - 12, 12, `${Math.max(0, Math.ceil(LIMIT - t))}s`, { anchor: 'r', scale: 2, color: 'white' });
    say(hud, w - 12, 30, `Falls ${this.falls}`, { anchor: 'r', color: this.falls ? 'orange' : 'white' });
    // balance bar: x position
    const bw = 140, bx = Math.floor((w - bw) / 2), by = 34;
    panel(hud, bx - 6, by - 8, bw + 12, 24, { shadow: false });
    hud.rect(bx, by, bw, 6, 'mist'); hud.rect(bx + bw / 4, by - 3, 1, 12, 'orange'); hud.rect(bx + bw * 3 / 4, by - 3, 1, 12, 'orange');
    hud.rect(bx + Math.round((this.dot.x * 0.5 + 0.5) * bw) - 3, by - 3, 6, 12, Math.abs(this.dot.x) > 0.75 ? 'red' : 'ink');
    if (this.gust && this.gust.t < 1.6) say(hud, w / 2 + (this.gust.sign > 0 ? 60 : -60), 62, this.gust.sign > 0 ? 'Wind >>>' : '<<< Wind', { anchor: 'c', scale: 2, color: 'sky' });
    // progress strip
    hud.rect(12, hud.height - 56, w - 24, 3, 'navy'); hud.rect(12, hud.height - 56, Math.round((w - 24) * this.prog / LEN), 3, 'lime');
  }
  extraState() { return { act: this.actId, prog: +this.prog.toFixed(1), falls: this.falls, finished: this.finished, result: this.result }; }
}
