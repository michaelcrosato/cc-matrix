// Holding Still. The whole game in miniature.
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { HOLD_LINES, POSES, RELEASE, SETTLE } from '../../data/poses.js';
import { BARKS } from '../../data/lines.js';
import { say, sayCentered } from '../../ui/widgets.js';
import { drawLaneDial, LaneEvent } from './events.js';
import { LaneActivity } from './lanes.js';
import { pavilionSet } from '../sets.js';

export class PoseEvent extends LaneEvent {
  kind = 'pose';

  constructor(scene, lanes, rng, opts) {
    super(scene, lanes, rng, opts);
    this.poseId = opts.pose;
    this.pose = POSES[opts.pose];
    this.hold = opts.hold ?? this.pose.hold;
    this.settle = opts.settle ?? SETTLE;
    this.release = opts.release ?? RELEASE;
    this.duration = this.settle + this.hold + this.release;
    this.ringBase = this.pose.ring * (this.hard.ring ?? 1);
    this.wanderPhase = rng.range(0, 6.28);
    this.ringX = 0;
  }

  get breathing() { return this.pose.breath > 0; }

  beginLane(l) {
    l.dot.reset();
    l.frozenClip = false;
    l.state = { in: 0, n: 0, breath: 0, s: 0.5, inside: false, streak: 0, wobbles: 0, clip: this.pose.clip };
    l.score = 0;
    l.avatar?.play(this.pose.clip, { fade: 0.5 });
  }

  ring() { return App.ringOf(this.ringBase) * (this.scene.ringBoost ?? 1); }

  wantIn(t) { const p = this.pose.breath; return ((t % p) / p) < 0.5; }
  breathLevel(t) { const p = this.pose.breath; const u = (t % p) / p; return u < 0.5 ? u * 2 : (1 - u) * 2; }

  tick(ctx, dt, t) {
    const tw = this.pose.twist;
    if (tw.wanderX) this.biasX = tw.wanderX * (this.hard.wander ?? 1) * Math.sin(t * (tw.wanderSpeed ?? 0.3) * 6.283 * 0.5 + this.wanderPhase);
  }

  stepLane(ctx, lane, inp, dt, t, scoring) {
    const tw = this.pose.twist;
    const m = lane.m;
    const u = this.hold > 0 ? Math.min(1, Math.max(0, (t - this.settle) / this.hold)) : 0;
    let noise = App.noiseScale();
    if (tw.noiseRamp) noise *= tw.noiseRamp[0] + (tw.noiseRamp[1] - tw.noiseRamp[0]) * u;
    m.noiseY = tw.noiseY ?? 1;
    m.inst = tw.inst ?? 1;
    m.bx = (this.biasX ?? 0) * T.dotAuthority; // a bias is stick lean, times authority
    const st = lane.state;
    if (this.breathing) {
      const match = inp.breath === this.wantIn(t) ? 1 : 0;
      st.s += (match - st.s) * Math.min(1, dt / 0.6);
      noise *= 1.25 - T.breathBonus * st.s;
    }
    if (tw.tremorAfter && t - this.settle > tw.tremorAfter) noise *= 1.35;
    m.noise = noise;
    lane.dot.step(dt, inp.x, inp.y, T, m);
    const ring = this.ring();
    if (App.dev.god && lane.isPlayer) lane.dot.clampTo(this.ringX, 0, ring * 0.9);
    if (this.scene.cheatRing && lane.isPlayer) lane.dot.clampTo(this.ringX, 0, ring * 0.9);
    const inside = Math.hypot(lane.dot.x - this.ringX, lane.dot.y) <= ring;
    const counts = scoring && t >= this.settle && t < this.settle + this.hold;
    if (inside !== st.inside) {
      st.inside = inside;
      if (lane.isPlayer && t >= this.settle) {
        if (inside) { App.sfx('ringIn', { volume: 0.7 }); this.scene.ringBark?.('in'); } else { st.wobbles++; App.sfx('ringOut', { volume: 0.5 }); this.scene.ringBark?.('out'); }
      }
    }
    st.streak = inside ? st.streak + dt : 0;
    if (counts) {
      st.n++;
      if (inside) st.in++;
      if (this.breathing) st.breath += st.s;
      lane.score = this.scoreOf(lane);
    }
  }

  botInput(lane, out, dt, t, brain) {
    brain.lean(out, lane.dot, this.ringX, 0, dt);
    if (this.breathing && brain.p) {
      const late = brain.play.react * 0.7;
      out.breath = this.wantIn(t - late);
      if (brain.play.miss > 0 && lane.rand() < brain.play.miss * 0.02) lane.state.slip = 0.8;
      if ((lane.state.slip ?? 0) > 0) { lane.state.slip -= dt; out.breath = !out.breath; }
    } else out.breath = false;
  }

  scoreOf(lane) {
    const st = lane.state;
    if (!st.n) return 0;
    const inRing = st.in / st.n;
    if (this.breathing) return 100 * (0.8 * inRing + 0.2 * (st.breath / st.n));
    return 100 * inRing;
  }

  visual(ctx, dt, t) {
    const ring = this.ring();
    for (const lane of this.lanes) {
      if (!lane.avatar || lane.gone) continue;
      if (lane.ghost) { this.ghostVisual(lane, dt); continue; }
      const d = Math.hypot(lane.dot.x - this.ringX, lane.dot.y);
      const far = d > ring + 0.5;
      if (!lane.frozenClip) lane.avatar.play(far ? 'Teeter' : this.pose.clip, { fade: 0.3 });
      lane.avatar.update(dt);
      const tremble = d > ring ? Math.min(1.5, (d - ring) * 3) : 0;
      lane.avatar.lean(lane.dot.x, lane.dot.y, tremble, t);
    }
  }

  draw(ctx, t) {
    const { hud } = ctx;
    const local = this.lanes.filter((l) => l.isLocal && !l.gone);
    const ring = this.ring();
    for (const lane of local) {
      const st = lane.state;
      const before = t < this.settle;
      const dial = drawLaneDial(ctx, this, lane, ring, { ringX: this.ringX, inside: st.inside, brighten: Math.min(1, st.streak / 4) });
      if (this.breathing) {
        const w = 8, h = dial.r * 2;
        const bx = dial.x + dial.r + 6;
        const lvl = this.breathLevel(t);
        hud.rect(bx - 1, dial.y - dial.r - 1, w + 2, h + 2, 'ink');
        hud.rect(bx, dial.y - dial.r, w, h, 'white');
        hud.rect(bx, dial.y + dial.r - Math.round(h * lvl), w, Math.round(h * lvl), this.wantIn(t) ? 'sky' : 'cyan');
        if (lane.isLocal && this.lanes.length < 4) say(hud, bx + w + 3, dial.y - 4, this.wantIn(t) ? 'In...' : 'Out...', { color: inpMatch(lane, this, t) ? 'lime' : 'white', name: 'breath' });
      }
      if (before && this.lanes.length < 4) sayCentered(hud, dial.x, dial.y + dial.r + 5, 'Settle.', { color: 'white', name: 'settle' });
    }
  }
}

function inpMatch(lane, ev, t) { return lane.inp.breath === ev.wantIn(t); }

export class PoseActivity extends LaneActivity {
  makeEvent(lanes, rng, hard) { return new PoseEvent(this, lanes, rng, { pose: this.def.pose, hard, hold: this.args.hold }); }

  async dress(ctx) {
    this.set = pavilionSet(ctx);
    await this.addCoach(ctx, { at: [3.5, 0.36, -1.5], yaw: -0.45, clip: this.def.pose ? POSES[this.def.pose].clip : 'CoachStand', dais: true });
    await this.addKevin(ctx, [-3.6, this.set.railY, this.set.railZ]);
    this.nextMote = 0;
    this.barkT = 0;
    this.pushIn = 0;
  }

  ringBark(kind) {
    if (this.t < this.barkT || this.attractMode) return;
    this.barkT = this.t + 6;
    const list = kind === 'in' ? BARKS.ringIn : BARKS.ringOut;
    App.say('ounce', this.cosmetic.pick(list));
  }

  playVisual(ctx, dt) {
    if (this.t > this.nextMote) {
      this.nextMote = this.t + 0.28;
      ctx.particles.burst('zen', [this.cosmetic.range(-6, 6), this.cosmetic.range(0.6, 3.6), this.cosmetic.range(-2, 2)]);
    }
    const you = this.playerLane;
    if (you && this.phase === 'play') {
      this.pushIn += ((you.state.inside ? 1 : 0) - this.pushIn) * Math.min(1, dt * 0.25);
      this.camPush = this.pushIn * 0.9;
      if (you.state.streak > 10 && !this.saidStreak) { this.saidStreak = true; App.say('ounce', this.cosmetic.pick(BARKS.streak)); }
      this.coachT = (this.coachT ?? 7) - dt;
      if (this.coachT <= 0 && !this.bark.active && !this.attractMode) {
        this.coachT = 11 + this.cosmetic.next() * 6;
        App.say('coach', this.cosmetic.pick([...HOLD_LINES, ...BARKS.coachRandom]));
      }
    }
  }

  result() {
    return { ...super.result(), wobbles: this.playerLane?.state.wobbles ?? 0 };
  }

  /** Coach demonstrates: she points at you first, then simply does it. */
  onEnter(phase) {
    if (!this.coach || !this.def.pose) return;
    if (phase === 'intro') this.coach.play('Point', { fade: 0.2 });
    if (phase === 'practice' || phase === 'countdown') this.coach.play(POSES[this.def.pose].clip, { fade: 0.7 });
  }

  fingerprint() {
    const l = this.playerLane;
    return l ? `${l.state.in}|${l.state.n}|${l.dot.x.toFixed(6)}|${l.dot.y.toFixed(6)}` : '';
  }

  overlayDot() {
    const l = this.playerLane;
    return l ? `${l.dot.x.toFixed(2)},${l.dot.y.toFixed(2)} ring ${this.event.ring().toFixed(2)}` : '-';
  }
}

