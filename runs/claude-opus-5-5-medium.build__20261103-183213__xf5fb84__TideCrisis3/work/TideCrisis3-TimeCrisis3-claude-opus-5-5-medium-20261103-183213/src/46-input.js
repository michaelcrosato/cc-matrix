// 46-input: the action preset (DualSense standard mapping; keyboard and mouse as a PC shooter expects), each
// player's aim in view units (mouse: absolute, exactly under the pointer like a light gun; pad: a response curve,
// acceleration and aim assist with friction and magnetism; keys: a constant speed), cover hold or toggle, and the
// Command each player gives the Sim. Prompts always come from input.label(). Reads: Sim (20), settings.

const DI = E.Input.DEFAULT;
const TC_INPUT = {
  up: DI.up, down: DI.down, left: DI.left, right: DI.right, start: DI.start, pause: DI.pause, confirm: DI.confirm, cancel: DI.cancel,
  fire: ['Mouse0', 'KeyZ', 'KeyJ', 'Pad7', 'Pad0'],
  cover: ['Mouse2', 'Space', 'KeyX', 'ShiftLeft', 'Pad6', 'Pad1'],
  next: ['KeyE', 'WheelDown', 'Pad5'], prev: ['KeyQ', 'WheelUp', 'Pad4'],
  reload: ['KeyR', 'Pad2'], more: ['KeyM', 'Pad3'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  tab: ['Tab', 'Pad4'], tabR: ['Pad5'], reset: ['Backspace', 'Pad2']
};
TC.INPUT = TC_INPUT;
TC.CONTROL_NAMES = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', more: 'More time (AI Hub card)', w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher', tab: false, tabR: false, reset: false };

class Aimer {
  constructor(input, i) { this.input = input; this.i = i; this.aim = [0, 0]; this.held = 0; this.coverOn = false; this.lastPtr = null; this.mouseOwned = i === 0; this.skipT = 0; this.dev = 'keyboard'; }
  // vp: the player's viewport { x, y, w, h } in screen pixels; targets: projected [ax, ay, r] (view units)
  build(dt, sim, vp, targets, set = {}) {
    const I = this.input, p = sim.players[this.i], aspect = vp.w / vp.h; if (p) p.aspect = aspect;
    this.dev = I.lastDevice;
    // mouse (player 1 only): exactly under the pointer
    const ptr = this.mouseOwned && I.pointer ? I.pointer() : null;
    if (ptr && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') && (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1] || I.lastDevice === 'mouse')) {
      if (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1]) { this.aim = [(ptr[0] - (vp.x + vp.w / 2)) / (vp.h / 2), -(ptr[1] - (vp.y + vp.h / 2)) / (vp.h / 2)]; this.src = 'mouse'; }
      this.lastPtr = ptr.slice();
    }
    // pad: the right stick (or the left), a response curve, acceleration, assist
    const st = I.padAim || (Math.hypot(I.padMove[0], I.padMove[1]) > .05 ? I.padMove : null);
    if (st && I.lastDevice === 'gamepad') {
      const m = Math.hypot(st[0], st[1]), curve = Math.pow(Math.min(1, m), 2.2) / (m || 1);
      this.held = m > .5 ? this.held + dt : 0; const acc = 1 + Math.min(.5, Math.max(0, this.held - .35) * 1.2);
      let sp = tune.player.padSpeed * (set.padSpeed || 1) * acc;
      const assist = set.aimAssist === undefined ? tune.player.assist : set.aimAssist;
      let near = null, nd = 1e9;
      for (const t of targets) { const d = Math.hypot(t[0] - this.aim[0], t[1] - this.aim[1]) - t[2]; if (d < nd) { nd = d; near = t; } }
      if (near && nd < .07) sp *= 1 - .55 * assist;
      this.aim[0] += st[0] * curve * sp * dt; this.aim[1] -= st[1] * curve * sp * dt;
      if (near && nd < .12 && m > .2) { const k = Math.min(1, assist * 6 * dt); this.aim[0] += (near[0] - this.aim[0]) * k; this.aim[1] += (near[1] - this.aim[1]) * k; }
      this.src = 'pad';
    }
    // keys: a constant speed (also the d-pad nudge)
    const kx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), ky = (I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0);
    if ((kx || ky) && !st) { this.aim[0] += kx * 1.2 * dt; this.aim[1] += ky * 1.2 * dt; }
    this.aim[0] = clamp(this.aim[0], -aspect, aspect); this.aim[1] = clamp(this.aim[1], -1, 1);
    // cover: hold or toggle
    const toggle = set.coverMode === 'Toggle';
    if (toggle) { if (I.pressed('cover')) this.coverOn = !this.coverOn; } else this.coverOn = I.down('cover');
    if (sim.phase !== 'action') this.coverOn = toggle ? false : this.coverOn;
    // cutscene: confirm advances, held 0.6 s skips
    const adv = I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked() && this.i === 0);
    this.skipT = (I.down('confirm') || I.down('fire')) ? this.skipT + dt : 0;
    const sel = I.pressed('w1') ? 1 : I.pressed('w2') ? 2 : I.pressed('w3') ? 3 : I.pressed('w4') ? 4 : 0;
    return { aim: this.aim.slice(), fireDown: I.down('fire'), fireP: I.pressed('fire'), cover: this.coverOn, next: I.pressed('next'), prev: I.pressed('prev'), sel, reload: I.pressed('reload') || I.down('reload'), advance: adv, skip: this.skipT >= .6, autoFire: set.autoFire !== false };
  }
}
TC.Aimer = Aimer;

// targets for the aim assist (and the bot): projected view-unit points of what can be shot, never civilians
TC.assistTargets = (sim, i) => {
  const cs = sim.camSetupFor(i), out = [];
  const add = (p, r) => { const v = projectVU(cs, p); if (v) out.push([v[0], v[1], r / (v[2] * cs.t)]); };
  for (const e of sim.enemies) if (!e.dead && e.vols && e.up > .5) for (const v of e.vols) { if (v.part === 'head') add(v.c, v.r); else if (v.part === 'body' && !v.cap) add(v.c, v.r); else if (v.part === 'body') add(vlerp(v.a, v.b, .5), v.r + 3); }
  for (const pr of sim.projectiles) if (pr.shootable && pr.team === 'enemy') add(pr.pos, pr.r);
  for (const ob of sim.objects) if (!ob.dead && (ob.K.bonus || ob.K.objective)) add(ob.pos, ob.r);
  if (sim.boss) for (const pt of sim.boss.parts) if (pt.alive && pt.pos && !pt.hidden && !pt.armor) add(pt.pos, pt.r);
  return out;
};

// a prompt label for an action on the device the player used last (keyboard and mouse share one family)
TC.label = (input, action, dev) => { const d = dev || input.lastDevice; const l = input.label(action, d === 'touch' ? 'keyboard' : d); return l || '?'; };
