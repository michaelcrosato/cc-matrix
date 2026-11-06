// Coconut Header: lean along the sand, head the coconuts, dodge the flip-flops. Dennis runs the catapult.
import { LaneActivity } from './lane.js';
import { T } from '../../core/tunables.js';
import { SKILLS } from '../../core/drivers.js';
import { place } from '../../art/world.js';
import { say } from '../../ui/font.js';
import { BARKS, pick } from '../../data/lines.js';
import { THREE, toonMaterial, PALETTE, buildModel } from '../../../pixel-engine.js';
import { MODELS } from '../../art/models.js';

const FALL = 1.4, HEAD_Y = 1.45;
export class HeaderActivity extends LaneActivity {
  get duration() { return 60; }
  goal() { return 'Lean left and right to head the coconuts. Dodge the flip-flops. The golden one is thirty.'; }
  controls() { return [['lean', 'Move along the sand']]; }
  get span() { return this.n <= 3 ? 2 : 0.8; }
  async stageExtra(ctx) {
    this.pattern = ctx.random.fork('header'); this.objs = []; this.nextAt = 1; this.cat = place(ctx, 'catapult', [-4.7, 0, -1.2], { scale: 1.1 });
    this.pool = [];
    for (const l of this.lanes) l.st = { x: 0, combo: 0, best: 0, pts: 0, daze: 0, hits: 0, flip: 0, hit: 0 };
    ctx.particles.register('stars', { count: [3, 5], life: [0.5, 0.9], speed: [0.5, 1.2], gravity: -0.5, size: [1, 1], colors: ['sand', 'white'] });
    this.coach.play('Idle');
  }
  resetLanes() { for (const l of this.lanes) l.st = { x: 0, combo: 0, best: 0, pts: 0, daze: 0, hits: 0, flip: 0, hit: 0 }; for (const o of this.objs ?? []) o.mesh && (o.mesh.visible = false); this.objs = []; this.nextAt = 1; }
  interval(t) { const k = Math.min(1, t / 60); return (1.3 + (0.7 - 1.3) * k) * T.headerInterval * (this.hard ? this.A.hard.intervalMul ?? 1 : 1); }
  tAt() { return this.phase === 'play' ? this.playT : this.phaseT; }
  mk(kind) {
    const id = kind === 'c' ? 'coconut' : kind === 'f' ? 'flip-flop' : 'golden-pineapple';
    const m = buildModel(id, { catalog: MODELS }).object; m.scale.setScalar(kind === 'f' ? 1.6 : 1.5); this.ctx.scene.add(m);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 10), toonMaterial(PALETTE.navy)); this.ctx.scene.add(sh);
    return { mesh: m, shadow: sh };
  }
  botControl(l, inp, dt) {
    const sk = SKILLS[l.driver.skill]; if (!sk) { inp.x = 0; return; }
    const lag = sk.tau * 1.2;
    const cands = this.objs.filter((o) => !o.done && o.kind !== 'f' && o.t < FALL - 0.05).sort((a, b) => (FALL - a.t) - (FALL - b.t));
    const nxt = cands[0], threats = this.objs.filter((o) => !o.done && o.kind === 'f' && o.t < FALL);
    let tx = l.st.x;
    if (nxt) { const miss = Math.sin(nxt.t0 * 12.9 + l.idx) * sk.err * 1.0; tx = Math.max(-this.span, Math.min(this.span, nxt.rel * this.span + miss)); }
    for (const th of threats) if (Math.abs(th.rel * this.span - tx) < 0.55) tx += th.rel > 0 ? -0.8 : 0.8;
    const err = tx - l.st.x; const seen = (this.pt * 1.0 - lag) >= 0;
    inp.x = Math.max(-1, Math.min(1, err * (l.driver.skill === 'sloppy' ? 1.2 : 3))); inp.y = 0;
    if (l.driver.skill === 'sloppy' && Math.sin(this.pt * 0.8 + l.idx) > 0.4) inp.x *= 0.2;
  }
  laneStep(l, inp, dt) {
    const st = l.st; st.daze = Math.max(0, st.daze - dt);
    if (st.daze <= 0) st.x = Math.max(-this.span, Math.min(this.span, st.x + inp.x * 4.5 * dt * (this.n <= 3 ? 1 : 0.45)));
    l.dot.x = st.x / this.span * 0.5; l.dot.y = 0;
    l.score = st.pts;
  }
  playFixed(dt, practice) {
    super.playFixed(dt, practice);
    const t = this.tAt();
    if (t >= this.nextAt) {
      const r = this.pattern.range(0, 1), kind = r < 0.7 ? 'c' : r < 0.95 ? 'f' : 'g';
      const rel = this.pattern.range(-1, 1);
      const o = this.pool.pop() ?? this.mk(kind);
      if (o.kind !== kind) { this.ctx.scene.remove(o.mesh, o.shadow); const n2 = this.mk(kind); o.mesh = n2.mesh; o.shadow = n2.shadow; }
      Object.assign(o, { kind, rel, t: 0, t0: t, done: false, hit: new Set() });
      o.mesh.visible = o.shadow.visible = true; this.objs.push(o);
      this.nextAt = t + this.interval(t);
    }
    for (const o of this.objs) {
      if (o.done) continue; o.t += dt;
      if (o.t >= FALL) {
        o.done = true; o.mesh.visible = false; o.shadow.visible = false;
        for (const l of this.lanes) {
          if (l.kind === 'ghost' || l.left) continue;
          const ox = l.x + o.rel * this.span, hit = Math.abs(ox - (l.x + l.st.x)) < 0.4;
          const st = l.st;
          if (!hit) { if (o.kind === 'c') { st.combo = st.combo; } continue; }
          if (o.kind === 'f') { st.pts = Math.max(0, st.pts - 10); st.combo = 0; st.daze = 0.6; st.flip++; if (l.kind === 'local') { this.app.sfx('thwap'); this.bark('ounce', pick(BARKS.daze, this.app.rng('b')), 1.8); this.ctx.engine.hitstop(0.05); } }
          else {
            st.combo++; st.hits++; st.best = Math.max(st.best, st.combo);
            const tier = st.combo >= 20 ? 4 : st.combo >= 10 ? 3 : st.combo >= 5 ? 2 : 1;
            st.pts += o.kind === 'g' ? 30 : 10 * tier; st.nod = 0.25;
            if (l.kind === 'local') { this.app.sfx('bonk', { pitch: tier * 2 }); this.ctx.engine.hitstop(0.05); this.ctx.particles.burst('stars', [l.x + l.st.x, 1.9, 0.8]); if (st.combo === 5 || st.combo === 10 || st.combo === 20) { this.app.sfx('combo'); this.ctx.particles.burst('confetti', [l.x, 2, 0.8]); } if (o.kind === 'g') this.bark('ounce', pick(BARKS.golden, this.app.rng('b')), 2.2); }
          }
        }
      }
    }
    this.objs = this.objs.filter((o) => { if (o.done) { this.pool.push(o); return false; } return true; });
  }
  scoreNow() { return this.me.st.pts ?? 0; }
  poseLane(l, dt) {
    const st = l.st, x = l.x + st.x;
    l.avatar.root.position.x = x;
    if (this.phase === 'intro' || this.phase === 'countdown') { l.avatar.play('Idle'); return; }
    if (st.daze > 0) l.avatar.play('Daze', { fade: 0.05 }); else if (st.nod > 0) { st.nod -= dt; l.avatar.play('Nod', { restart: false, fade: 0.05 }); } else l.avatar.play(Math.abs(l.inp.x) > 0.25 ? 'Walk' : 'Idle', { fade: 0.1, timeScale: 1.4 });
    if (l.inp.x) l.avatar.root.rotation.y = Math.sign(l.inp.x) * 0.9; else l.avatar.root.rotation.y = 0;
  }
  extraFrame() {
    for (const o of this.objs) {
      if (o.done) continue; const k = o.t / FALL;
      const l = this.me; const x = l.x + o.rel * this.span, y = HEAD_Y + (1 - k) * (1 - k) * 4.5;
      o.mesh.position.set(x, y, 0.8); o.mesh.rotation.z += 0.12; o.shadow.position.set(x, 0.03, 0.8); const s = 0.4 + k * 0.7; o.shadow.scale.set(s, 1, s);
    }
  }
  laneLabel(l) { return this.phase === 'play' ? `${Math.round(l.st.pts)}` : ''; }
  drawPlay(hud) {
    const w = hud.width, st = this.me.st;
    this.drawTags(hud);
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, w - 12, 12, `${Math.max(0, Math.ceil(60 - this.playT))}s`, { anchor: 'r', scale: 2, color: 'white' });
    say(hud, 12, 24, `${Math.round(st.pts)}`, { scale: 3, color: 'sand' });
    const tier = st.combo >= 20 ? 4 : st.combo >= 10 ? 3 : st.combo >= 5 ? 2 : 1;
    say(hud, w / 2, 20, `Combo ${st.combo}  x${tier}`, { anchor: 'c', scale: 2, color: tier > 1 ? 'orange' : 'white' });
  }
}
