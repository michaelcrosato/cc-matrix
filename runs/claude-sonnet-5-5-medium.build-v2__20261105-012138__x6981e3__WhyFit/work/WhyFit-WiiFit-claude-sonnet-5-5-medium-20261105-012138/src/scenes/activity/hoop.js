// Hoop Economics: circle the stick to keep hoops up. June throws extra hoops; flick toward her side to catch them.
import { LaneActivity } from './lane.js';
import { T } from '../../core/tunables.js';
import { SKILLS } from '../../core/drivers.js';
import { place } from '../../art/world.js';
import { panel, bar, disc, ring, line } from '../../ui/widgets.js';
import { say } from '../../ui/font.js';
import { BARKS, pick } from '../../data/lines.js';
import { THREE, toonMaterial, PALETTE } from '../../../pixel-engine.js';

const TAU = Math.PI * 2;
const SEG = [{ dir: 1, secs: 25, label: 'Anticlockwise' }, { dir: -1, secs: 25, label: 'Now the other way.' }, { dir: 0, secs: 10, label: 'Either way' }];
export class HoopActivity extends LaneActivity {
  get duration() { return 60; }
  goal() { return 'Circle the stick, or the mouse, to keep the hoop up. Catch June\'s throws with a flick.'; }
  controls() { return [['lean', 'Circle'], ['lean', 'Flick to catch']]; }
  async stageExtra(ctx) {
    for (const l of this.lanes) {
      l.st = { ang: 0, prevA: null, w: 0, L: 0.6, rot: 0, extra: 0, drop: 0, pick: 0, in: 0 };
      const h = place(ctx, 'hoop', [l.x, 1.0, 0.8], { scale: 1.5, palette: { ring: ['red', 'orange', 'lime', 'sky'][l.idx % 4] } }); l.hoop = h.object;
    }
    this.june = this.lanes.find((l) => l.name === 'June');
    this.throws = []; this.nextThrow = 9; this.junePos = null;
    ctx.particles.register('sparkle2', { count: [1, 2], life: [0.3, 0.6], speed: [0.5, 1], gravity: -1, size: [1, 1], colors: ['sand', 'white'] });
    this.coach.play('Idle');
  }
  resetLanes() { for (const l of this.lanes) l.st = { ang: 0, prevA: null, w: 0, L: 0.6, rot: 0, extra: 0, drop: 0, pick: 0, in: 0, hoopsExtra: 0 }; this.throws = []; this.nextThrow = 9; }
  seg(t) { let a = 0; for (const s of SEG) { if (t < a + s.secs) return { ...s, t: t - a }; a += s.secs; } return { ...SEG[2], t: 99 }; }
  tAt() { return this.phase === 'play' ? this.playT : this.phaseT; }
  band() { return [T.hoopLow * (this.hard ? this.A.hard.bandMul ?? 1 : 1), T.hoopHigh]; }
  botControl(l, inp, dt) {
    const sk = SKILLS[l.driver.skill]; if (!sk) { inp.x = inp.y = 0; return; }
    const seg = this.seg(this.tAt()), dir = seg.dir || 1, [lo, hi] = this.band();
    const base = { sloppy: 0.55, average: 1.2, good: 1.5, expert: 1.7 }[l.driver.skill] ?? 1.2;
    l.bot ??= { ang: 0, w: base, flick: 0, t: 0 };
    l.bot.t += dt;
    const wob = 1 + Math.sin(this.pt * 0.9 + l.idx * 2) * sk.err * 0.75;
    l.bot.ang += dir * base * wob * TAU * dt;
    inp.x = Math.cos(l.bot.ang) * 0.9; inp.y = Math.sin(l.bot.ang) * 0.9;
    // flick to catch
    const th = this.throws.find((h) => h.lane === l && !h.done);
    if (th && th.t > th.dur - 0.38 && th.t < th.dur - 0.02) { const ok = ((l.idx * 31 + Math.floor(th.born * 7)) % 100) / 100 < (1 - sk.err * 1.6); if (ok) { inp.x = th.side * 1; inp.y = 0; } }
  }
  laneStep(l, inp, dt) {
    const st = l.st, t = this.tAt(), seg = this.seg(t);
    const mag = Math.hypot(inp.x, inp.y);
    let w = 0;
    if (mag > 0.5) {
      const a = Math.atan2(inp.y, inp.x);
      if (st.prevA !== null) { let d = a - st.prevA; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; w = d / dt / TAU; }
      st.prevA = a;
    } else st.prevA = null;
    st.w += (w - st.w) * Math.min(1, dt / 0.25);
    const [lo, hi] = this.band();
    const spd = Math.abs(st.w), dirOk = seg.dir === 0 || Math.sign(st.w) === seg.dir;
    st.dirNow = Math.sign(st.w);
    if (st.pick > 0) { st.pick -= dt; st.L = Math.max(st.L, 0.3); }
    else if (spd >= lo && spd <= hi && dirOk) st.L = Math.min(1, st.L + T.hoopLiftRate * dt);
    else if (spd >= lo * 0.5 && !dirOk && spd > 0.3) st.L -= 0.5 * dt;
    else st.L -= 0.25 * dt;
    if (st.L <= 0 && st.pick <= 0) { st.L = 0; st.drop++; st.pick = 1.5; if (l.kind === 'local') this.bark('ounce', pick(BARKS.hoopDrop, this.app.rng('b'))); }
    const inBand = st.pick <= 0 && spd >= lo && spd <= hi && dirOk;
    st.inBand = inBand;
    if (inBand && this.phase === 'play') { st.rot += spd * dt * (1 + 0.5 * (st.hoopsExtra ?? 0)); }
    st.inT = inBand ? (st.inT ?? 0) + dt : 0;
    l.dot.x = inp.x * 0.5; l.dot.y = inp.y * 0.5;
    // thrown hoops: telegraphed, flicked to catch
    st.flick = Math.abs(inp.x) > 0.85 && Math.abs(inp.y) < 0.25 ? Math.sign(inp.x) : 0;
    l.score = st.rot;
  }
  /** Global throw scheduler (June winds up every ~9 s). */
  playFixed(dt, practice) {
    super.playFixed(dt, practice);
    const me = this.me, t = this.tAt();
    if (this.phase === 'play' && t >= this.nextThrow && !this.throws.some((h) => !h.done)) {
      for (const l of this.lanes) if (l.kind !== 'ghost' && l !== this.june) {
        if ((l.st.hoopsExtra ?? 0) >= 4) continue;
        this.throws.push({ lane: l, side: Math.sign(l.x + 0.01) || (this.throws.length % 2 ? 1 : -1), t: 0, dur: 1.5, born: t, done: false, caught: false, flickT: 0 });
      }
      if (this.throws.length) this.bark('june', 'Catch.', 1.4);
      this.nextThrow = t + 9;
    }
    for (const h of this.throws) {
      if (h.done) continue; h.t += dt;
      if (h.lane.st.flick === h.side && h.t > h.dur - 0.4) h.flickT += dt;
      if (h.t >= h.dur) { h.done = true; if (h.flickT >= 0.15) { h.caught = true; h.lane.st.hoopsExtra = (h.lane.st.hoopsExtra ?? 0) + 1; if (h.lane.kind === 'local') { this.app.sfx('combo'); this.bark('ounce', 'Caught. Another hoop. Congratulations. Why.', 2); } } }
    }
    if (this.throws.length > 12) this.throws = this.throws.filter((h) => !h.done);
  }
  scoreNow() { return this.me.st.rot ?? 0; }
  poseLane(l, dt) {
    const st = l.st; if (this.phase === 'intro' || this.phase === 'countdown') { l.avatar.play('Idle'); return; }
    l.avatar.play('Idle');
    st.vis = (st.vis ?? 0) + (st.w ?? 0) * TAU * dt;
    if (l.hoop) { l.hoop.position.set(l.x, 0.7 + st.L * 0.4, 0.8); l.hoop.rotation.set((1 - st.L) * 0.6, st.vis ?? 0, 0); l.hoop.position.x += Math.cos(st.vis ?? 0) * 0.08 * st.L; l.hoop.position.y -= st.pick > 0 ? 0.55 : 0; l.hoop.visible = true; }
    l.avatar.pelvis && (l.avatar.pelvis.position.x += Math.cos(st.vis ?? 0) * 0.06 * Math.min(1, Math.abs(st.w ?? 0)));
  }
  laneLabel(l) { return this.phase === 'play' ? `${Math.round(l.st.rot)} rot` : ''; }
  drawPlay(hud) {
    const w = hud.width, me = this.me, st = me.st, seg = this.seg(this.tAt());
    this.drawTags(hud);
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, w - 12, 12, `${Math.max(0, Math.ceil(60 - this.playT))}s`, { anchor: 'r', scale: 2, color: 'white' });
    say(hud, 12, 24, `${Math.round(st.rot)} rot`, { scale: 2, color: 'sand' });
    const d = this.dialFor(hud, me); this.drawDial(hud, me, 99, { hide: false });
    me.driver.dial && (me.driver.dial.x = d.cx, me.driver.dial.y = d.cy);
    // the band meter
    const [lo, hi] = this.band(), mw = 130, mx = Math.floor((w - mw) / 2), my = hud.height - 50;
    panel(hud, mx - 8, my - 22, mw + 16, 38, { shadow: false });
    say(hud, w / 2, my - 18, seg.label + (seg.dir > 0 ? ' (anticlockwise)' : seg.dir < 0 ? ' (clockwise)' : ''), { anchor: 'c', color: 'ink', shadow: false });
    hud.rect(mx, my - 2, mw, 6, 'mist'); hud.rect(mx + Math.round(lo / 3.5 * mw), my - 2, Math.round((hi - lo) / 3.5 * mw), 6, 'lime');
    const sp = Math.min(3.5, Math.abs(st.w ?? 0)); hud.rect(mx + Math.round(sp / 3.5 * mw) - 1, my - 5, 3, 12, 'ink');
    bar(hud, mx, my + 9, mw, 3, st.L, { fill: st.L < 0.3 ? 'red' : 'teal' });
    for (const h of this.throws) if (!h.done && h.lane === me) { const k = h.t / h.dur; const hx = Math.round(w / 2 + h.side * (80 - k * 40)); hud.rect(hx - 8, 60, 16, 3, 'sand'); say(hud, hx, 44, h.side < 0 ? '<' : '>', { anchor: 'c', color: 'sand', scale: 2 }); }
  }
}
