// People, as far as a script can be one: they see late, press real keys, hold a real stick, move a real mouse.
// Nothing here touches autopilot or an activity's botInput: only the input layer, as a player's hands do.
import { App } from '../lib.mjs';

const PAD_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };

/** A standard-mapping pad, through navigator.getGamepads: the boot-time remap and deadzone all run. */
export const stubPad = { id: 'Stub', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
export function installPad() {
  Object.defineProperty(globalThis.navigator, 'getGamepads', { value: () => [stubPad, null, null, null], configurable: true });
}
const PAD_INDEX = { PadCross: 0, PadCircle: 1, PadSquare: 2, PadTriangle: 3, PadL1: 4, PadR1: 5, PadL2: 6, PadR2: 7, PadOptions: 9 };

/** The three devices, behind one small interface: lean(x, y) and press / hold by role. */
export function makeHands(engine, device) {
  const input = engine.input;
  const held = new Set();
  const setCode = (code, on) => {
    if (code in PAD_INDEX) { stubPad.buttons[PAD_INDEX[code]].pressed = on; stubPad.buttons[PAD_INDEX[code]].value = on ? 1 : 0; } else input.setKey(code, on);
  };
  const setHeld = (code, on) => { if (on && !held.has(code)) { setCode(code, true); held.add(code); } else if (!on && held.has(code)) { setCode(code, false); held.delete(code); } };
  let tapQueue = [];
  const tap = (code) => { setCode(code, true); tapQueue.push(code); };
  const release = () => { for (const c of tapQueue) setCode(c, false); tapQueue = []; };
  const ROLES = {
    keyboard: { stepL: 'KeyF', stepR: 'KeyJ', confirm: 'Space', breath: 'Space' },
    pad: { stepL: 'PadL1', stepR: 'PadR1', confirm: 'PadCross', breath: 'PadR2' },
    mouse: { stepL: 'MouseLeft', stepR: 'MouseRight', confirm: 'MouseLeft', breath: 'MouseLeft' },
  }[device];
  const hands = {
    device,
    /** Lean toward (x, y), each -1..1. Keys can only be on or off: Shift gives half. */
    lean(x, y, dial) {
      if (device === 'keyboard') {
        const mag = Math.hypot(x, y);
        setHeld('ShiftLeft', mag > 0.12 && mag < 0.55);
        setHeld(PAD_KEYS.right, x > 0.12); setHeld(PAD_KEYS.left, x < -0.12);
        setHeld(PAD_KEYS.up, y > 0.12); setHeld(PAD_KEYS.down, y < -0.12);
      } else if (device === 'pad') {
        stubPad.axes[0] = x; stubPad.axes[1] = -y;
      } else {
        const hud = engine.hud;
        const r = App.T.mouseLeanRadius;
        const c = dial ?? { x: hud.width / 2, y: hud.height / 2 };
        const ax = c.x + x * r, ay = c.y - y * r;
        input.setPointer((ax / hud.width) * 2 - 1, 1 - (ay / hud.height) * 2, false);
      }
    },
    hold(role, on) {
      if (device === 'mouse' && ROLES[role] === 'MouseLeft') { input.setButtons(on ? 1 : 0); return; }
      setHeld(ROLES[role], on);
    },
    press(role) {
      if (device === 'mouse') { input.setButtons(role === 'stepR' ? 2 : 1); tapQueue.push('__mouse'); return; }
      tap(ROLES[role]);
    },
    endFrame() {
      if (tapQueue.includes('__mouse')) input.setButtons(0);
      tapQueue = tapQueue.filter((c) => c !== '__mouse');
      release();
    },
    letGo() { for (const c of [...held]) setHeld(c, false); stubPad.axes[0] = 0; stubPad.axes[1] = 0; if (device === 'mouse') input.setButtons(0); release(); },
    /** Say which device this person is using, the way the game would notice. */
    announce() {
      if (device === 'mouse') { input.setPointer(0.01, 0.01, false); engine.step(1); input.setPointer(0, 0, false); engine.step(1); App.device.last = 'mouse'; App.device.lastDesk = 'mouse'; }
      if (device === 'pad') App.device.last = 'pad';
      if (device === 'keyboard') { App.device.last = 'keyboard'; App.device.lastDesk = 'keyboard'; }
    },
  };
  return hands;
}

/** Sees the Dot late, overshoots a bit, gets better with skill: the plan's human-like controller. */
export class Eyes {
  constructor({ tau = 0.22, kp = 1.5, kd = 0.55 } = {}) { this.n = Math.round(tau * 60); this.kp = kp; this.kd = kd; this.h = []; }
  /** Call once a frame. Returns the lean to apply toward a target. */
  lean(dot, tx = 0, ty = 0) {
    this.h.push([dot.x, dot.y, dot.vx, dot.vy]);
    if (this.h.length > this.n + 1) this.h.shift();
    const [x, y, vx, vy] = this.h[0];
    let ux = -this.kp * (x - tx) - this.kd * vx, uy = -this.kp * (y - ty) - this.kd * vy;
    const d = Math.hypot(ux, uy);
    if (d > 1) { ux /= d; uy /= d; }
    return [ux, uy];
  }
}

const TAU = Math.PI * 2;

/** How a person plays each activity: what they can see on screen, and their hands. Called once a frame. */
export const PLAYS = {
  poses(scene, hands, eyes) {
    const lane = scene.playerLane, ev = scene.event, t = scene.eventT ?? 0;
    const [x, y] = eyes.lean(lane.dot, ev.ringX, 0);
    hands.lean(x, y, lane.dial);
    if (ev.breathing) hands.hold('breath', ev.wantIn(t - 0.15));
  },
  longstand(scene, hands, eyes) {
    const [x, y] = eyes.lean(scene.dot, 0, 0);
    hands.lean(x, y, scene.dial);
  },
  reps(scene, hands) {
    const lane = scene.playerLane, ev = scene.event, t = scene.eventT ?? 0;
    const rep = Math.max(0, ev.repAt(t));
    const target = ev.targetAt(t + 0.14);
    const r = lane.state.r;
    if (hands.device === 'keyboard') {
      // Keys are rate control: push while the marker is ahead of you, let go when you're with it.
      const diff = ev.targetAt(t + 0.08) - r;
      const v = diff > 0.03 ? 1 : diff < -0.03 ? -1 : 0;
      if (ev.data.input === 'down') hands.lean(0, -v, lane.dial);
      else if (ev.data.input === 'up') hands.lean(0, v, lane.dial);
      else hands.lean(v * ev.side(rep), 0, lane.dial);
      return;
    }
    if (ev.data.input === 'down') hands.lean(0, -target, lane.dial);
    else if (ev.data.input === 'up') hands.lean(0, target, lane.dial);
    else hands.lean(target * ev.side(rep), 0, lane.dial);
  },
  hoop(scene, hands, eyes, st) {
    const lane = scene.playerLane, ev = scene.event, t = scene.eventT ?? 0;
    const dir = ev.dirAt(t) || 1;
    const rate = hands.device === 'keyboard' ? 1.3 : 1.6;
    st.a = (st.a ?? 0) + dir * rate * TAU * (1 / 60);
    let x = Math.cos(st.a), y = Math.sin(st.a);
    if (hands.device === 'keyboard') {
      // Rolling the keys: W, then D, then S, then A, one at a time, as fingers do.
      const q = Math.round(((st.a % TAU) + TAU) / (TAU / 4)) % 4;
      x = [1, 0, -1, 0][q]; y = [0, 1, 0, -1][q];
    }
    const th = ev.throws[lane.state.throwI];
    if (th && t >= th.t - 0.33 && t <= th.t && lane.state.hoops < 3) { x = th.side; y = 0; }
    hands.lean(x, y, lane.dial);
  },
  step(scene, hands, eyes, st) {
    const ev = scene.event;
    const now = scene.beatClock();
    st.i = st.i ?? 0;
    while (st.i < ev.notes.length && ev.notes[st.i].t + 0.02 <= now) {
      if (now - ev.notes[st.i].t < 0.1) hands.press(ev.notes[st.i].foot === 'L' ? 'stepL' : 'stepR');
      st.i++;
      if (hands.device === 'mouse') break; // one button at a time on a mouse
    }
  },
  header(scene, hands) {
    const lane = scene.playerLane, ev = scene.event, s = lane.state, t = scene.eventT ?? 0;
    let target = s.pos;
    for (let i = s.wave; i < ev.waves.length; i++) {
      const w = ev.waves[i];
      if (t - w.t0 < 0.22) break;
      const x = ev.landsAt(lane, w);
      if (w.type === 'flip') { if (Math.abs(s.pos - x) < 0.6 && w.t1 - t < 0.6) { target = x + (s.pos >= x ? 0.75 : -0.75); break; } continue; }
      target = x;
      break;
    }
    const v = Math.max(-1, Math.min(1, (target - s.pos) * 3));
    hands.lean(Math.abs(v) < 0.08 ? 0 : v, 0, lane.dial);
  },
  slackline(scene, hands, eyes) {
    const [x] = eyes.lean(scene.dot, 0, 0);
    hands.lean(x, Math.abs(scene.dot.x) < 0.4 ? 1 : 0, scene.dial);
  },
  tray(scene, hands, eyes, st) {
    const live = scene.vits.filter((v) => !v.done && v.wait <= 0);
    let v = st.v && live.includes(st.v) ? st.v : null;
    let cup = null, best = Infinity;
    for (const c of live) {
      if (v && c !== v) continue;
      const p = c.body.translation();
      for (const k of scene.cups) { if (k.color !== c.color) continue; const d = Math.hypot(k.x - p.x, k.z - p.z); if (d < best) { best = d; st.v = c; cup = k; } }
    }
    v = st.v;
    if (!v || !cup) { hands.lean(0, 0); return; }
    const p = v.body.translation(), vel = v.body.linvel();
    if (hands.device === 'keyboard') {
      // Keys can't make a small tilt, so a person holds Shift for half lean and rolls it through the maze
      // cell by cell, one key at a time, letting go when it runs too fast.
      const near = scene.nextCell(p.x, p.z, cup, 0);
      const dx = near.x - p.x, dz = near.z - p.z;
      if (Math.hypot(vel.x, vel.z) > 1.4) { hands.lean(0, 0); return; }
      if (Math.abs(dx) >= Math.abs(dz)) hands.lean(Math.sign(dx) * 0.5, 0);
      else hands.lean(0, -Math.sign(dz) * 0.5);
      return;
    }
    const way = scene.nextCell(p.x, p.z, cup);
    let ux = (way.x - p.x) * 0.5 - vel.x * 0.42, uy = -(way.z - p.z) * 0.5 + vel.z * 0.42;
    const d = Math.hypot(ux, uy);
    if (d > 0.62) { ux *= 0.62 / d; uy *= 0.62 / d; }
    hands.lean(ux, uy);
  },
  pier(scene, hands, eyes, st) {
    const stage = scene.stage2;
    if (stage === 'runup') {
      const [x, y] = eyes.lean(scene.dot, 0, -0.6);
      hands.lean(x, y, scene.dial);
      if (scene.st >= 4.97 && st.pressed !== scene.attempt) { st.pressed = scene.attempt; hands.press('confirm'); }
    } else if (stage === 'flight') {
      const [x, y] = eyes.lean(scene.dot, 0, 0);
      hands.lean(x, y, scene.dial);
      if (scene.flight - scene.st < 0.3 && st.canned !== scene.attempt) { st.canned = scene.attempt; hands.press('confirm'); }
    } else hands.lean(0, 0, scene.dial);
  },
  jog(scene, hands, eyes, st) {
    st.next = st.next ?? 0;
    if (scene.time >= st.next) {
      st.foot = st.foot === 'stepL' ? 'stepR' : 'stepL';
      hands.press(st.foot);
      st.next = scene.time + 1 / scene.targetCadence;
    }
    const u = scene.dist / scene.length;
    let want = 0;
    const next = scene.cups.find((c) => !c.taken && c.u > u && (c.u - u) * scene.length < 14);
    if (next) want = next.x;
    for (const o of scene.obs) { const d = (o.u - u) * scene.length; if (d > 0 && d < 5 && Math.abs(want - o.x) < 0.7) want = o.x + (o.x > 0 ? -1.2 : 1.2); }
    const w = Math.max(-1, Math.min(1, (want - scene.x) * 3));
    const n = scene.normalAt(u);
    const { right, forward } = scene.ctx.camera.groundBasis();
    const close = Math.abs(want - scene.x) < 0.15;
    hands.lean(close ? 0 : w * (n.x * right.x + n.z * right.z), close ? 0 : w * (n.x * forward.x + n.z * forward.z));
  },
};
