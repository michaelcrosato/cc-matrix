/* 10-input: the action map (a DualSense first: R2 fires, L2 takes cover; the mouse aims like a light gun, left click
 * fires, right click or Space takes cover, the wheel switches), each player's aim (mouse absolute, pad and keys
 * relative, with the response curve, acceleration and aim assist), building the Sim's command from a device, and the
 * prompt labels that follow the device used last. Reads the engine's input; the Sim only ever sees commands. */
const PRESET = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'KeyJ', 'KeyZ', 'Pad7', 'Pad0'],
  cover: ['Mouse2', 'Space', 'KeyX', 'ShiftLeft', 'Pad6', 'Pad1'],
  next: ['WheelDown', 'KeyE', 'Pad5'],
  prev: ['WheelUp', 'KeyQ', 'Pad4'],
  reload: ['KeyR', 'Pad2'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  more: ['KeyM', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1']
};
TC.PRESET = PRESET;
const ACTION_NAMES = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher', more: false };
TC.ACTION_NAMES = ACTION_NAMES;

/** the label for an action on a player's last device (PlayStation glyphs by default; Xbox via Settings) */
function label(input, a, device) {
  const dev = device || input.lastDevice;
  if (dev === 'mouse' || dev === 'keyboard') {
    const m = input.map[a] || [], keys = m.filter(c => !c.startsWith('Pad') && !c.startsWith('Act:'));
    const c = dev === 'mouse' ? (keys.find(c => c.startsWith('Mouse') || c.startsWith('Wheel')) || keys[0]) : (keys.find(c => !c.startsWith('Mouse') && !c.startsWith('Wheel')) || keys[0]);
    return c ? input.codeLabel(c) : input.label(a, dev);
  }
  return input.label(a, dev === 'touch' ? 'gamepad' : dev);
}
TC.label = label;
/** which family of prompt to show: 'pad' or 'kbm' (before any input: both) */
function promptFamily(input) { return input.lastDevice === 'gamepad' ? 'pad' : 'kbm'; }
TC.promptFamily = promptFamily;

/* ---- aim state per player (presentation side; the Sim gets only aim [ax, ay]) ---- */
class Aim {
  constructor(input, idx) { this.input = input; this.idx = idx; this.ax = 0; this.ay = 0; this.hold = 0; this.lastMouse = null; this.src = 'mouse'; this.wasCover = false; }
  /** advance one step: rect = the player's viewport in screen pixels { x, y, w, h }; targets: [[ax, ay, r]] for assist */
  update(dt, rect, targets, inCover) {
    const I = this.input, A = rect.w / rect.h, tn = tune.player;
    const p = I.lastDevice === 'mouse' || I.aimSource === 'mouse' ? I.pointer() : null;
    let moved = false;
    if (p && this.idx === 0 && (!this.lastMouse || p[0] !== this.lastMouse[0] || p[1] !== this.lastMouse[1])) {
      this.lastMouse = [p[0], p[1]];
      this.ax = clamp((p[0] - (rect.x + rect.w / 2)) / (rect.h / 2), -A, A); this.ay = clamp(-(p[1] - (rect.y + rect.h / 2)) / (rect.h / 2), -1, 1);
      this.src = 'mouse'; return;
    }
    // pad: right stick, else left stick; keys: the moves (arrows / WASD)
    let sx = 0, sy = 0;
    if (I.padAim) { sx = I.padAim[0]; sy = I.padAim[1]; this.src = 'pad'; }
    else if (Math.hypot(I.padMove[0], I.padMove[1]) > 0) { sx = I.padMove[0]; sy = I.padMove[1]; this.src = 'pad'; }
    const km = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), kv = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0);
    if (!sx && !sy && (km || kv)) {
      const dpad = I.lastDevice === 'gamepad';
      this.ax = clamp(this.ax + km * dt * (dpad ? .5 : 1.2), -A, A); this.ay = clamp(this.ay - kv * dt * (dpad ? .5 : 1.2), -1, 1); this.src = dpad ? 'pad' : 'keys'; return;
    }
    const l = Math.hypot(sx, sy);
    if (l > 0) {
      moved = true; this.hold += dt;
      const k = Math.pow(l, 2.2) / l, acc = this.hold > .35 ? Math.min(1.5, 1 + (this.hold - .35) * 1.2) : 1;
      let sp = (tn.padSpeed || 1.6) * (TC.settingsPadSpeed || 1) * acc;
      // aim assist: friction near a target, magnetism while the stick moves
      const as = TC.assistLevel === undefined ? tn.assist : TC.assistLevel * tn.assist / .6;
      let near = null, nd = 1e9;
      for (const t of targets || []) { const d = Math.hypot(t[0] - this.ax, t[1] - this.ay) - t[2]; if (d < nd) { nd = d; near = t; } }
      if (near && nd < .07) sp *= 1 - .55 * as;
      this.ax = clamp(this.ax + sx * k * sp * dt, -A, A); this.ay = clamp(this.ay - sy * k * sp * dt, -1, 1);
      if (near && nd < .12 && l > .2) { const m = Math.min(1, as * 6 * dt); this.ax += (near[0] - this.ax) * m; this.ay += (near[1] - this.ay) * m; }
    } else this.hold = 0;
    void moved; void inCover;
  }
}
TC.Aim = Aim;

/** a player's command this step from their input and aim */
function commandFrom(input, aim) {
  const I = input, sel = I.pressed('w1') ? 1 : I.pressed('w2') ? 2 : I.pressed('w3') ? 3 : I.pressed('w4') ? 4 : 0;
  return { aim: [aim.ax, aim.ay], fireDown: I.down('fire'), firePressed: I.pressed('fire'), coverDown: I.down('cover'), coverPressed: I.pressed('cover'), next: I.pressed('next'), prev: I.pressed('prev'), select: sel, reload: I.pressed('reload') };
}
TC.commandFrom = commandFrom;
const NOCMD = Object.freeze({ aim: [0, 0], fireDown: false, firePressed: false, coverDown: false, coverPressed: false, next: false, prev: false, select: 0, reload: false });
TC.NOCMD = NOCMD;
