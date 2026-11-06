// Coconut Header. Lean along the sand. Dennis runs a catapult. Dennis stops being fine.
import { ContactShadow, PALETTE, THREE, toonMaterial } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { makeAvatar } from '../../art/avatar.js';
import { place } from '../../art/props.js';
import { LOOKS } from '../../data/classmates.js';
import { HEADER } from '../../data/games.js';
import { sayCentered } from '../../ui/font.js';
import { LaneEvent, worldToArt } from './events.js';
import { LaneActivity, playerInfo, soloSpecs } from './lanes.js';
import { box, lagoonSet } from '../sets.js';

const IGNORE = { sloppy: 0.45, average: 0.26, good: 0.08, expert: 0.01 };
const POOL = { coconut: 5, flip: 3, pineapple: 1 };
const MODEL = { coconut: 'coconut', flip: 'flip-flop', pineapple: 'golden-pineapple' };
const DAZE_STARS = 3;
const DAZE_ORBIT = 0.36;
const DAZE_HEIGHT = 2;
// Dennis is at the catapult, so the classmates here are June and Marguerite. Their mats stand back and out:
// you have 2 m either way along the sand, and it must not run through them.
const CLASSMATE_PAIR = 2;
const SOLO_RANGE = 2;
const LANE_RANGE = 0.8;
const SOLO_XS = [-3.2, 0, 3.2];
const PLAYER_Z = 1.2;
const CLASSMATE_Z = -0.8;

export class HeaderEvent extends LaneEvent {
  kind = 'header';
  time = 0;
  next = 0.8;
  waves = [];

  constructor(scene, lanes, rng, opts) {
    super(scene, lanes, rng, opts);
    this.duration = opts.duration ?? 60;
    this.range = opts.range ?? (lanes.length === 1 ? SOLO_RANGE : LANE_RANGE);
    this.flipShare = this.hard.flipFlop ?? 0.25;
  }

  /** How far this lane may lean. Waves are stored as -1..1, so everyone gets the same throw on their own strip. */
  rangeOf(lane) { return lane.range ?? this.range; }
  landsAt(lane, w) { return w.at * this.rangeOf(lane); }

  gap(t) {
    const u = Math.min(1, t / this.duration);
    return (HEADER.startGap + (HEADER.endGap - HEADER.startGap) * u) * T.headerInterval * (this.hard.interval ?? 1);
  }

  beginLane(l) {
    l.state = { pos: 0, combo: 0, score: 0, daze: 0, heads: 0, hitT: 0, phase: l.rand() * 6, wave: 0, seen: 0 };
    l.score = 0;
    l.avatar?.play('Idle', { fade: 0.2 });
  }

  begin() {
    this.next = 0.8;
    this.waves.length = 0;
    this.rngPlay = this.rng.fork('waves');
    super.begin();
    for (const l of this.lanes) for (const o of l.objects ?? []) { o.mesh.visible = false; o.shadow.visible = false; o.busy = false; }
  }

  /** The same object waves for everyone, in lane-relative x. */
  tick(ctx, dt, t) {
    if (t >= this.next && t < this.duration - HEADER.flight) {
      const r = this.rngPlay.next();
      const type = r < 0.05 ? 'pineapple' : r < 0.05 + this.flipShare ? 'flip' : 'coconut';
      const at = this.rngPlay.range(-1, 1);
      this.waves.push({ t0: t, t1: t + HEADER.flight, type, at });
      this.next = t + this.gap(t);
      this.scene.onLaunch?.();
    }
  }

  stepLane(ctx, lane, inp, dt, t, scoring) {
    const st = lane.state;
    if (st.daze > 0) st.daze -= dt;
    else st.pos = Math.max(-this.rangeOf(lane), Math.min(this.rangeOf(lane), st.pos + HEADER.speed * inp.x * dt));
    while (st.wave < this.waves.length && this.waves[st.wave].t1 <= t) {
      const w = this.waves[st.wave];
      const hit = Math.abs(st.pos - this.landsAt(lane, w)) < HEADER.reach;
      if (hit) this.onHit(ctx, lane, w, scoring);
      else if (w.type !== 'flip') { st.combo = 0; }
      st.wave++;
    }
    lane.score = st.score;
  }

  tier(combo) {
    for (const [at, mult] of HEADER.tiers) if (combo >= at) return mult;
    return 1;
  }

  onHit(ctx, lane, w, scoring) {
    const st = lane.state;
    const at = [lane.x + this.landsAt(lane, w), 1.65, lane.z];
    if (w.type === 'flip') {
      if (scoring) st.score = Math.max(0, st.score + HEADER.flip);
      st.combo = 0;
      st.daze = HEADER.daze;
      if (lane.isLocal) { App.sfx('flipFlopThwap'); this.scene.onThwap?.(); ctx.particles.burst('puff', at); }
      lane.avatar?.play('Daze', { fade: 0.08 });
      lane.dazeUntil = HEADER.daze;
      return;
    }
    const value = w.type === 'pineapple' ? HEADER.pineapple : HEADER.coconut * this.tier(st.combo);
    if (scoring) st.score += value;
    if (w.type === 'coconut') st.combo++;
    st.heads++;
    st.hitT = 0.3;
    lane.avatar?.play('HeaderNod', { once: true, fade: 0.03, then: () => lane.avatar?.play('Idle', { fade: 0.1 }) });
    if (lane.isLocal) {
      App.sfx(w.type === 'pineapple' ? 'pineapple' : 'coconutBonk', { pitch: Math.min(12, st.combo * 0.3) });
      if (!App.dev.autopilot && !this.scene.attractMode) ctx.engine.hitstop(0.05);
      ctx.particles.burst('bonk', at);
      this.scene.onHeaded?.(lane, st, value);
      if ([5, 10, 20].includes(st.combo)) { App.sfx('combo'); ctx.particles.burst('confetti', at); }
    }
  }

  botInput(lane, out, dt, t, brain) {
    out.x = out.y = 0;
    if (!brain.p) return;
    const st = lane.state;
    const play = brain.play;
    let target = st.pos;
    // Whatever lands next decides: head it, or step out from under it.
    for (let i = st.wave; i < this.waves.length; i++) {
      const w = this.waves[i];
      if (t - w.t0 < play.react) break;
      const x = this.landsAt(lane, w);
      if (w.type === 'flip') {
        if (Math.abs(st.pos - x) < HEADER.reach + 0.12 && w.t1 - t < 0.7) {
          const away = st.pos >= x ? 1 : -1;
          const side = Math.abs(x + away * (HEADER.reach + 0.3)) <= this.rangeOf(lane) ? away : -away;
          target = x + side * (HEADER.reach + 0.3);
          break;
        }
        continue;
      }
      // Attention wanders: some coconuts simply go unnoticed.
      const key = `seen${i}`;
      if (st[key] === undefined) st[key] = lane.rand() < (IGNORE[brain.skill] ?? 0);
      if (st[key]) continue;
      target = x + Math.sin(t * 2 + st.phase) * play.wander;
      break;
    }
    out.x = Math.max(-1, Math.min(1, (target - st.pos) * 3.5)) * play.speed;
  }

  scoreOf(lane) { return lane.state.score; }
  normalized(lane) { return Math.min(1000, Math.round((lane.state.score / 900) * 1000)); }
  ghostPos(lane) { return [lane.state.pos ?? 0, 0]; }

  visual(ctx, dt, t) {
    for (const lane of this.lanes) {
      if (!lane.avatar || lane.gone) continue;
      if (lane.ghost) {
        this.ghostVisual(lane, dt);
        lane.avatar.root.position.x = lane.x + lane.driver.x;
        continue;
      }
      const st = lane.state;
      if (st.daze <= 0 && lane.dazeUntil) { lane.dazeUntil = 0; if (!lane.frozenClip) lane.avatar.play('Idle', { fade: 0.15 }); }
      lane.avatar.root.position.x = lane.x + st.pos;
      lane.avatar.update(dt);
      lane.avatar.lean(lane.inp.x * 0.8, 0, 0, t);
      // Each header squashes the head, not the person.
      if (st.hitT > 0) st.hitT -= dt;
      const k = Math.max(0, st.hitT / 0.3);
      lane.avatar.head?.scale.set(1 + 0.22 * k, 1 - 0.28 * k, 1 + 0.22 * k);
      this.dazeStars(lane, st, t);
      this.objects(ctx, lane, t);
    }
  }

  /** The .6 s daze: stars round the head. */
  dazeStars(lane, st, t) {
    const dazed = st.daze > 0 && t < this.duration;
    (lane.stars ?? []).forEach((m, i) => {
      m.visible = dazed;
      if (!dazed) return;
      const a = t * 7 + (i / DAZE_STARS) * Math.PI * 2;
      m.position.set(lane.x + st.pos + Math.cos(a) * DAZE_ORBIT, DAZE_HEIGHT, lane.z + Math.sin(a) * DAZE_ORBIT);
      m.rotation.y = a;
    });
  }

  objects(ctx, lane, t) {
    if (!lane.objects) return;
    const st = lane.state;
    for (const o of lane.objects) { o.mesh.visible = false; o.shadow.visible = false; }
    const used = {};
    for (let i = st.wave; i < this.waves.length; i++) {
      const w = this.waves[i];
      const u = (t - w.t0) / (w.t1 - w.t0);
      if (u < 0 || u >= 1) continue;
      used[w.type] = (used[w.type] ?? 0);
      const o = lane.pool[w.type][used[w.type]++];
      if (!o) continue;
      const lands = this.landsAt(lane, w), x = lane.x + lands, z = lane.z;
      const y = 1.7 + (1 - u) * (1 - u) * 0.8 + Math.sin(u * Math.PI) * (this.apex ?? 2.9);
      const zFrom = this.launchZ ?? -7;
      o.mesh.visible = true;
      o.mesh.position.set(x * Math.min(1, u * 1.6) + (lane.launchX ?? 0) * (1 - Math.min(1, u * 1.6)), y, zFrom + (z - zFrom) * u);
      o.mesh.rotation.x = t * 7;
      o.mesh.rotation.z = t * 5;
      o.shadow.visible = true;
      o.shadow.place(x, 0.02, z, Math.max(0, (1 - u) * 1.2));
    }
  }

  draw(ctx) {
    const { hud } = ctx;
    for (const lane of this.lanes) {
      if (!lane.isLocal || lane.gone) continue;
      const st = lane.state;
      const small = this.lanes.length >= 4;
      if (small) {
        const p = worldToArt(ctx, lane.x + st.pos, 2.2, lane.z);
        lane.dial = { x: p.x, y: p.y };
        sayCentered(hud, p.x, Math.max(28, p.y - 20), `${st.score}`, { color: 'sand', name: 'head-score' });
        if (st.combo >= 5) sayCentered(hud, p.x, Math.max(38, p.y - 10), `x${this.tier(st.combo)}`, { color: 'lime', name: 'head-combo' });
      } else {
        lane.dial = { x: hud.width / 2, y: hud.height / 2 };
        if (st.combo >= 5) sayCentered(hud, hud.width / 2, 26, `x${this.tier(st.combo)}  ${st.combo} in a row`, { scale: 2, color: 'lime', name: 'head-combo' });
      }
    }
  }
}

export async function buildHeaderProps(ctx, lane) {
  lane.objects = [];
  lane.pool = {};
  lane.stars = [];
  for (let i = 0; i < DAZE_STARS; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), toonMaterial(PALETTE.sand));
    star.visible = false;
    ctx.scene.add(star);
    lane.stars.push(star);
  }
  for (const [type, n] of Object.entries(POOL)) {
    lane.pool[type] = [];
    for (let i = 0; i < n; i++) {
      const mesh = place(ctx, MODEL[type], { actor: true, shadow: false }).object;
      const shadow = new ContactShadow(type === 'pineapple' ? 0.34 : 0.26);
      ctx.scene.add(shadow);
      mesh.visible = false;
      const o = { mesh, shadow };
      lane.pool[type].push(o);
      lane.objects.push(o);
    }
  }
}

export class HeaderActivity extends LaneActivity {
  makeEvent(lanes, rng, hard) {
    this.playerLane.range = SOLO_RANGE;
    return new HeaderEvent(this, lanes, rng, { hard, range: LANE_RANGE });
  }
  laneOptions() { return { mat: null, z: PLAYER_Z, xs: SOLO_XS }; }
  laneSpecs(rand) { return soloSpecs(playerInfo(), rand, CLASSMATE_PAIR); }

  async dress(ctx) {
    this.set = lagoonSet(ctx);
    // Where you may lean: a strip of beach towel, 4 m of it.
    box(ctx, 5, 0.03, 1.5, [0, 0.015, 1.2], 'white', { cast: false });
    box(ctx, 5, 0.04, 0.16, [0, 0.02, 0.5], 'cyan', { cast: false });
    box(ctx, 5, 0.04, 0.16, [0, 0.02, 1.9], 'cyan', { cast: false });
    this.catapult = place(ctx, 'catapult', { at: [0, 0, -7], yaw: 180, scale: 1.2 });
    this.arm = this.catapult.object.getObjectByName('arm');
    this.dennis = await makeAvatar(ctx, LOOKS.dennis, { at: [2.4, 0, -7], yaw: -0.6, clip: 'Idle' });
    this.spare = place(ctx, 'coconut', { at: [1.6, 0, -6.2], scale: 1.1 });
    this.armT = 0;
    this.dennisHits = 0;
  }

  async afterLanes(ctx) {
    this.event.launchZ = -7;
    for (const lane of this.lanes) {
      if (lane.isPlayer) continue;
      lane.z = CLASSMATE_Z;
      lane.avatar.root.position.z = CLASSMATE_Z;
      lane.avatar.root.position.y = 0.05;
      lane.mat = place(ctx, 'yoga-mat', { at: [lane.x, 0, CLASSMATE_Z], palette: { mat: lane.matColor }, shadow: false });
    }
    for (const lane of this.lanes) await buildHeaderProps(ctx, lane);
    for (const o of this.playerLane.objects) o.mesh.scale.setScalar(1.2);
    // A ball that goes back the other way, at Dennis.
    this.returning = [];
    for (let i = 0; i < 4; i++) { const m = place(ctx, 'coconut', { actor: true, shadow: false }).object; m.visible = false; this.returning.push({ m, u: 1 }); }
  }

  onLaunch() { this.armT = 0.35; App.sfx('catapult', { volume: 0.6 }); }

  onThwap() { if (this.t > (this.remarkT ?? 0)) { this.remarkT = this.t + 5; App.say('ounce', this.cosmetic.pick(['That one had a strap. They have straps.', 'Flip-flop. I did mention.', 'Please only head the round ones.'])); } }

  onHeaded(lane, st) {
    const free = this.returning.find((r) => r.u >= 1);
    if (free && st.combo >= 3) { free.u = 0; free.x = lane.x + st.pos; free.m.visible = true; }
  }

  playVisual(ctx, dt) {
    this.armT = Math.max(0, this.armT - dt);
    if (this.arm) this.arm.rotation.x = this.armT > 0 ? -1.2 * (this.armT / 0.35) : 0.2;
    for (const r of this.returning ?? []) {
      if (r.u >= 1) continue;
      r.u = Math.min(1, r.u + dt / 0.9);
      r.m.position.set(r.x + (2.4 - r.x) * r.u, 1.7 + Math.sin(r.u * Math.PI) * 2.4, 1.2 + (-7 - 1.2) * r.u);
      r.m.rotation.x += dt * 12;
      if (r.u >= 1) {
        r.m.visible = false;
        this.dennisHits++;
        App.sfx('coconutBonk', { volume: 0.5, pitch: -3 });
        ctx.particles.burst('bonk', [2.4, 1.7, -7]);
        this.dennis.play(this.dennisHits % 5 === 0 ? 'Fall' : 'Hurt', { once: true, fade: 0.05, then: () => this.dennis.play('Idle', { fade: 0.3 }) });
      }
    }
    this.dennis?.update(dt);
  }

  drawGameHud(ctx) {
    super.drawGameHud(ctx);
  }

  scoreText() { return `${this.playerLane.state.score}`; }
  fingerprint() { const l = this.playerLane; return l ? `${l.state.score}|${l.state.pos.toFixed(5)}` : ''; }
  overlayDot() { const l = this.playerLane; return l ? `x ${l.state.pos.toFixed(2)} combo ${l.state.combo}` : '-'; }
}

