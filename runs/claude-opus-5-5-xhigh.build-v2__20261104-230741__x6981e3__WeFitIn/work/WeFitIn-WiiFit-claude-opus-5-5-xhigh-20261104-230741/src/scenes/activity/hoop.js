// Hoop Economics: circle the stick to keep the hoops up. June throws you more.
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { place } from '../../art/props.js';
import { HOOP_THROW } from '../../data/hoop.js';
import { drawDial, line, ring as ringLine } from '../../ui/widgets.js';
import { say, sayCentered, sayRight } from '../../ui/font.js';
import { LaneEvent, worldToArt } from './events.js';
import { LaneActivity } from './lanes.js';
import { beachSet } from '../sets.js';

const TAU = Math.PI * 2;
const wrapPi = (a) => ((a + Math.PI * 3) % TAU) - Math.PI;
const BOT_RATE = { sloppy: 0.85, average: 1.0, good: 1.6, expert: 2.0 };
const BOT_CATCH = { sloppy: 0.05, average: 0.12, good: 0.7, expert: 0.95 };

export class HoopEvent extends LaneEvent {
  kind = 'hoop';

  constructor(scene, lanes, rng, opts) {
    super(scene, lanes, rng, opts);
    this.duration = opts.duration ?? 60;
    this.segments = opts.duration ? [[opts.duration * 0.45, 1], [opts.duration * 0.45, -1], [opts.duration * 0.1, 0]] : [[25, 1], [25, -1], [10, 0]];
    this.throws = [];
    let t = HOOP_THROW.first;
    while (t < this.duration - 3) {
      this.throws.push({ t, side: rng.chance(0.5) ? 1 : -1 });
      t += rng.range(HOOP_THROW.gap - 1.5, HOOP_THROW.gap + 1.5);
    }
  }

  dirAt(t) {
    let acc = 0;
    for (const [len, d] of this.segments) { acc += len; if (t < acc) return d; }
    return 0;
  }

  band() {
    const k = this.hard.band ?? 1;
    const mid = (T.hoopLow + T.hoopHigh) / 2, half = ((T.hoopHigh - T.hoopLow) / 2) * k;
    return [mid - half, mid + half];
  }

  beginLane(l) {
    l.state = {
      a: 0, lastA: null, w: 0, lift: 0.5, hoops: 1, down: 0, angle: 0, score: 0, inBand: false, wrongWay: false, catches: 0, thrown: 0, rot: 0,
      throwI: 0, flicked: false, botA: l.rand() * TAU, phase: l.rand() * 6, flickT: 0, plannedCatch: false,
    };
    l.score = 0;
    for (const h of l.hoopMeshes ?? []) h.visible = false;
    l.avatar?.play('Idle', { fade: 0.3 });
  }

  stepLane(ctx, lane, inp, dt, t, scoring) {
    const st = lane.state;
    const mag = Math.hypot(inp.x, inp.y);
    let raw = 0;
    if (mag > 0.5) {
      const a = Math.atan2(inp.y, inp.x);
      if (st.lastA !== null) raw = (wrapPi(a - st.lastA) / dt) / TAU;
      st.lastA = a;
    } else st.lastA = null;
    st.w += (raw - st.w) * Math.min(1, dt / 0.25);
    const dir = this.dirAt(t);
    const speed = Math.abs(st.w);
    const way = dir === 0 ? Math.sign(st.w) || 1 : dir;
    const [low, high] = this.band();
    const right = st.w * way > 0;
    st.inBand = right && speed >= low && speed <= high;
    st.wrongWay = !right && speed > 0.3;
    if (st.down > 0) {
      // Picking it up. For 1.5 s you have no hoop and a comment.
      st.down -= dt;
      if (st.down <= 0) { st.lift = 0.4; }
    } else {
      const rate = T.hoopLiftRate * (this.hard.lift ?? 1);
      st.lift += (st.inBand ? rate : st.wrongWay ? -0.5 : -0.25) * dt;
      st.lift = Math.min(1, st.lift);
      if (st.lift <= 0) {
        st.lift = 0;
        st.down = 1.5;
        st.hoops = 1;
        if (lane.isLocal) { App.sfx('hoopDrop'); this.scene.hoopDropped?.(); }
      }
      if (st.inBand) {
        st.rot += speed * dt;
        if (scoring) st.score += speed * dt * (1 + 0.5 * (st.hoops - 1));
        if (lane.isLocal && Math.floor(st.rot * 2) !== Math.floor((st.rot - speed * dt) * 2)) this.ctx.particles.burst('hoopSpark', [lane.x, 0.9, lane.z]);
      }
    }
    st.angle += st.w * TAU * dt;
    lane.score = st.score;
    this.stepThrows(lane, inp, t);
  }

  stepThrows(lane, inp, t) {
    const st = lane.state;
    const th = this.throws[st.throwI];
    if (!th) return;
    if (t >= th.t - HOOP_THROW.telegraph && !st.announced) { st.announced = true; if (lane.isLocal) App.sfx('gust', { volume: 0.3 }); }
    if (t >= th.t - HOOP_THROW.window && t <= th.t && Math.abs(inp.x) > 0.7 && Math.sign(inp.x) === th.side && st.down <= 0) {
      if (st.hoops < 4) st.hoops++;
      st.catches++;
      st.caught = t;
      if (lane.isLocal) { App.sfx('hoopCatch'); this.ctx.particles.burst('confetti', [lane.x, 1.2, lane.z], { count: 12 }); }
      st.throwI++; st.announced = false;
      return;
    }
    if (t > th.t) { st.throwI++; st.announced = false; }
  }

  botInput(lane, out, dt, t, brain) {
    out.x = out.y = 0;
    if (!brain.p) return;
    const st = lane.state;
    const dir = this.dirAt(t) || 1;
    const base = BOT_RATE[brain.skill] ?? 1.5;
    const rate = base + Math.sin(t * 0.7 + st.phase) * brain.play.wander * 1.2;
    // Sloppy circlers stop to think.
    const slack = brain.skill === 'sloppy' && Math.sin(t * 0.45 + st.phase) > 0.25;
    if (!slack) st.botA += dir * rate * TAU * dt;
    out.x = Math.cos(st.botA);
    out.y = Math.sin(st.botA);
    if (slack) { out.x *= 0.3; out.y *= 0.3; }
    const th = this.throws[st.throwI];
    if (th && t >= th.t - HOOP_THROW.window + 0.03 && t <= th.t) {
      if (st.planFor !== st.throwI) { st.planFor = st.throwI; st.planned = lane.rand() < (BOT_CATCH[brain.skill] ?? 0) && st.hoops < 4; }
      if (st.planned) { out.x = th.side; out.y = 0; }
    }
  }

  scoreOf(lane) { return lane.state.score; }
  normalized(lane) { return Math.min(1000, Math.round((lane.state.score / 130) * 1000)); }
  ghostPos(lane) { return [lane.inp.x, lane.inp.y]; }

  visual(ctx, dt, t) {
    for (const lane of this.lanes) {
      if (!lane.avatar || lane.gone) continue;
      if (lane.ghost) { this.ghostVisual(lane, dt); this.hoopVisual(lane, t, true); continue; }
      const st = lane.state;
      if (!lane.frozenClip) lane.avatar.play(st.down > 0 ? 'Slump' : 'Idle', { fade: 0.25 });
      lane.avatar.update(dt);
      const c = st.down > 0 ? 0 : Math.min(1, Math.abs(st.w)) * 0.75;
      lane.avatar.lean(Math.cos(st.angle) * c, Math.sin(st.angle) * c, 0, t);
      this.hoopVisual(lane, t, false);
    }
  }

  hoopVisual(lane, t, ghost) {
    const meshes = lane.hoopMeshes;
    if (!meshes) return;
    const st = lane.state;
    const n = ghost ? 1 : (st.down > 0 ? 0 : st.hoops);
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      m.visible = i < n;
      if (!m.visible) continue;
      const lift = ghost ? 0.8 : st.lift;
      const a = (ghost ? t * 8 : st.angle) + i * 1.3;
      const r = 0.1 + (1 - lift) * 0.18;
      m.position.set(lane.x + Math.cos(a) * r, 0.25 + 0.72 * lift + i * 0.1, lane.z + Math.sin(a) * r);
      m.rotation.x = Math.sin(a) * (0.32 - lift * 0.2);
      m.rotation.z = Math.cos(a) * (0.32 - lift * 0.2);
    }
  }

  draw(ctx, t) {
    const { hud } = ctx;
    for (const lane of this.lanes) {
      if (!lane.isLocal || lane.gone) continue;
      const st = lane.state;
      const small = this.lanes.length >= 4;
      let x, y, r;
      if (small) { const p = worldToArt(ctx, lane.x, 2.2, lane.z); x = Math.max(38, Math.min(hud.width - 52, p.x)); y = Math.max(50, p.y - 24); r = 24; } else { x = Math.round(hud.width / 2); y = 56; r = 44; }
      lane.dial = { x, y };
      const dir = this.dirAt(t);
      drawDial(hud, { x, y, r, dot: null, ringR: 0.9, fade: 1, inside: st.inBand, brighten: st.inBand ? 1 : 0 });
      // The stick, on the circle, and which way to go.
      const inp = lane.inp;
      const s = r / 1.2 * 0.9;
      const dx = x + inp.x * s, dy = y - inp.y * s;
      ringLine(hud, dx, dy, 3, 2, st.inBand ? 'lime' : 'red');
      if (dir !== 0) {
        const steps = 5;
        for (let i = 0; i < steps; i++) {
          const a = t * 2.4 * dir + (i / steps) * TAU;
          hud.rect(Math.round(x + Math.cos(a) * r * 0.42) - 1, Math.round(y - Math.sin(a) * r * 0.42) - 1, 2, 2, i === 0 ? 'orange' : 'mist');
        }
      }
      // The lift: a bar beside the dial, because the sky under it belongs to your head.
      const bw = small ? 5 : 8, bh = r * 2, bx = x + r + 5;
      hud.rect(bx - 1, y - r - 1, bw + 2, bh + 2, 'ink');
      hud.rect(bx, y - r, bw, bh, 'white');
      const lh = Math.round(bh * st.lift);
      hud.rect(bx, y + r - lh, bw, lh, st.inBand ? 'lime' : 'cyan');
      // June's throw has the sky while it's coming; the direction comes back after.
      const incoming = this.throws[st.throwI];
      const throwing = incoming && t >= incoming.t - HOOP_THROW.telegraph && t <= incoming.t;
      if (!small && !throwing) {
        const label = dir === 1 ? 'Anticlockwise.' : dir === -1 ? 'Now the other way.' : 'Either way.';
        sayRight(hud, x - r - 8, y - 4, label, { color: 'white', name: 'hoop-way' });
      }
      const mouse = App.device.last === 'mouse' && lane.driver.kind !== 'pad' && !App.dev.autopilot ? App.device.pointerArt(ctx) : null;
      if (mouse) line(hud, x, y, mouse.x, mouse.y, 'mist', 1);
      // June's throw.
      const th = this.throws[st.throwI];
      if (th && t >= th.t - HOOP_THROW.telegraph && t <= th.t) {
        const u = 1 - (th.t - t) / HOOP_THROW.telegraph;
        const late = t >= th.t - HOOP_THROW.window;
        const fx = x + th.side * (r + 34 + (1 - u) * 44);
        ringLine(hud, fx, y + 18, 9, 3, late ? 'lime' : 'red');
        sayCentered(hud, x + th.side * (r + 34), y + 32, late ? 'Catch!' : 'June!', { color: late ? 'lime' : 'sand', name: 'catch' });
        // A landing shadow, near your lane.
        const p = worldToArt(ctx, lane.x + th.side * 0.9, 0.05, lane.z);
        hud.rect(Math.round(p.x) - 8, Math.round(p.y) - 1, 16, 3, late ? 'lime' : 'slate');
      }
      if (st.hoops > 1 && !small) say(hud, bx + bw + 5, y - 8, `x${1 + 0.5 * (st.hoops - 1)}`, { scale: 2, color: 'sand', name: 'hoop-mult' });
    }
  }
}

export class HoopActivity extends LaneActivity {
  makeEvent(lanes, rng, hard) { return new HoopEvent(this, lanes, rng, { hard }); }

  async dress(ctx) {
    this.set = beachSet(ctx);
    await this.addCoach(ctx, { at: [3.6, 0, -1], yaw: -0.5, clip: 'Watch' });
    this.lastRemark = -10;
  }

  afterLanes(ctx) {
    for (const lane of this.lanes) lane.hoopMeshes = [0, 1, 2, 3].map((i) => {
      const m = place(ctx, 'hoop', { palette: { hoop: ['red', 'sky', 'lime', 'sand'][i] }, actor: true, shadow: false }).object;
      m.visible = false;
      return m;
    });
    this.whirr = ctx.audio.loop('hoopWhirr', { volume: 0 });
    this.flying = place(ctx, 'hoop', { palette: { hoop: 'orange' }, actor: true, shadow: false }).object;
    this.flying.visible = false;
    this.june = this.lanes.find((l) => l.who === 'june') ?? this.lanes.find((l) => l.who) ?? null;
  }

  hoopDropped() {
    if (this.t - this.lastRemark < 6) return;
    this.lastRemark = this.t;
    App.say('ounce', this.cosmetic.pick(['The hoop has left you. It left a note.', 'Pick it up. Everyone is watching. No one is helping.', 'The hoop has been downgraded.']));
  }

  playVisual() {
    const lane = this.playerLane;
    const st = lane?.state;
    this.whirr?.set({ volume: st && st.inBand ? 0.6 : 0, pitch: st ? Math.min(6, Math.abs(st.w) * 2) : 0 });
    // June winds up on one side; the hoop arcs over to land beside you.
    const t = this.eventT ?? 0;
    const th = st && this.phase === 'play' ? this.event.throws[st.throwI] : null;
    const live = th && t >= th.t - HOOP_THROW.telegraph && t <= th.t;
    this.flying.visible = !!live;
    if (live) {
      const u = 1 - (th.t - t) / HOOP_THROW.telegraph;
      const fromX = this.june ? this.june.x : lane.x - th.side * 2.2;
      const toX = lane.x + th.side * 0.9;
      this.flying.position.set(fromX + (toX - fromX) * u, 1.1 + Math.sin(u * Math.PI) * 1.5, lane.z + (1 - u) * 0.2);
      this.flying.rotation.x = u * 7;
    }
    if (this.june?.avatar && !this.june.gone) {
      if (live && !this.juneWinding) { this.juneWinding = true; this.june.frozenClip = true; this.june.avatar.play('Point', { fade: 0.15 }); }
      if (!live && this.juneWinding) { this.juneWinding = false; this.june.frozenClip = false; }
    }
  }

  scoreText() { return `${Math.floor(this.playerLane.state.score)}`; }
  fingerprint() { const l = this.playerLane; return l ? `${l.state.score.toFixed(5)}|${l.state.lift.toFixed(5)}` : ''; }
  overlayDot() { const l = this.playerLane; return l ? `w ${l.state.w.toFixed(2)} lift ${l.state.lift.toFixed(2)} x${l.state.hoops}` : '-'; }
}
