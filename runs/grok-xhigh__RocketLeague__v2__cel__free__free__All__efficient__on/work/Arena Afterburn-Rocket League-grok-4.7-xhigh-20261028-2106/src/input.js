/** Gamepad (standard mapping) and keyboard produce the same action fields. */

export const ACTION_KEYS = [
  'throttle',
  'steer',
  'pitch',
  'yaw',
  'roll',
  'jump',
  'boost',
  'powerslide',
  'ballCam',
  'menu',
  'confirm',
  'back',
  'menuX',
  'menuY',
];

export function emptyActions() {
  return {
    throttle: 0,
    steer: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    jump: false,
    boost: false,
    powerslide: false,
    ballCam: false,
    menu: false,
    confirm: false,
    back: false,
    menuX: 0,
    menuY: 0,
  };
}

function dead(v) {
  return Math.abs(v) < 0.15 ? 0 : v;
}

function buttonDown(pad, index) {
  const b = pad.buttons && pad.buttons[index];
  if (!b) return false;
  if (typeof b === 'boolean') return b;
  return !!(b.pressed || (b.value ?? 0) > 0.5);
}

function triggerValue(pad, index) {
  const b = pad.buttons && pad.buttons[index];
  if (!b) return 0;
  if (typeof b === 'number') return b;
  return b.value ?? (b.pressed ? 1 : 0);
}

/**
 * PS5-compatible standard mapping.
 * invertH flips stick X (steer and yaw) only. invertV flips stick Y (throttle and pitch) only.
 */
export function mapGamepad(pad, settings = {}) {
  const a = emptyActions();
  const invH = settings.invertH ? -1 : 1;
  const invV = settings.invertV ? -1 : 1;
  const axes = pad.axes || [];
  const lx = dead(axes[0] || 0);
  const ly = dead(axes[1] || 0);
  const rx = dead(axes[2] || 0);
  const ry = dead(axes[3] || 0);
  a.steer = lx * invH;
  a.throttle = -ly * invV;
  a.yaw = rx * invH;
  a.pitch = -ry * invV;
  a.jump = buttonDown(pad, 0);
  a.boost = buttonDown(pad, 1) || triggerValue(pad, 7) > 0.55;
  a.powerslide = buttonDown(pad, 2) || buttonDown(pad, 6);
  a.ballCam = buttonDown(pad, 3);
  a.menu = buttonDown(pad, 9);
  a.confirm = buttonDown(pad, 0);
  a.back = buttonDown(pad, 1);
  if (buttonDown(pad, 5)) a.roll += 1;
  if (buttonDown(pad, 4)) a.roll -= 1;
  const trig = triggerValue(pad, 7) - triggerValue(pad, 6);
  if (Math.abs(trig) > Math.abs(a.throttle) && Math.abs(trig) > 0.1) a.throttle = trig;
  const up = buttonDown(pad, 12);
  const down = buttonDown(pad, 13);
  const left = buttonDown(pad, 14);
  const right = buttonDown(pad, 15);
  if (up || down) a.menuY = (down ? 1 : 0) - (up ? 1 : 0);
  else a.menuY = ly * invV > 0.5 ? 1 : ly * invV < -0.5 ? -1 : 0;
  if (left || right) a.menuX = (right ? 1 : 0) - (left ? 1 : 0);
  else a.menuX = lx * invH > 0.5 ? 1 : lx * invH < -0.5 ? -1 : 0;
  return a;
}

const KEYBOARDS = [
  {
    throttlePlus: 'KeyW',
    throttleMinus: 'KeyS',
    steerMinus: 'KeyA',
    steerPlus: 'KeyD',
    pitchPlus: 'KeyR',
    pitchMinus: 'KeyF',
    yawMinus: 'KeyZ',
    yawPlus: 'KeyX',
    rollMinus: 'KeyQ',
    rollPlus: 'KeyE',
    jump: 'Space',
    boost: 'ShiftLeft',
    powerslide: 'ControlLeft',
    ballCam: 'KeyC',
    menu: 'Escape',
    confirm: 'Enter',
    back: 'Backspace',
  },
  {
    throttlePlus: 'ArrowUp',
    throttleMinus: 'ArrowDown',
    steerMinus: 'ArrowLeft',
    steerPlus: 'ArrowRight',
    pitchPlus: 'Home',
    pitchMinus: 'End',
    yawMinus: 'Delete',
    yawPlus: 'PageDown',
    rollMinus: 'Insert',
    rollPlus: 'PageUp',
    jump: 'ShiftRight',
    boost: 'ControlRight',
    powerslide: 'Slash',
    ballCam: 'Period',
    menu: 'Escape',
    confirm: 'Enter',
    back: 'Backspace',
  },
  {
    throttlePlus: 'KeyI',
    throttleMinus: 'KeyK',
    steerMinus: 'KeyJ',
    steerPlus: 'KeyL',
    pitchPlus: 'KeyY',
    pitchMinus: 'KeyH',
    yawMinus: 'Semicolon',
    yawPlus: 'Quote',
    rollMinus: 'BracketLeft',
    rollPlus: 'BracketRight',
    jump: 'KeyU',
    boost: 'KeyO',
    powerslide: 'KeyP',
    ballCam: 'KeyM',
    menu: 'Escape',
    confirm: 'Enter',
    back: 'Backspace',
  },
  {
    throttlePlus: 'Numpad8',
    throttleMinus: 'Numpad5',
    steerMinus: 'Numpad4',
    steerPlus: 'Numpad6',
    pitchPlus: 'Numpad7',
    pitchMinus: 'Numpad9',
    yawMinus: 'Numpad1',
    yawPlus: 'Numpad3',
    rollMinus: 'NumpadDivide',
    rollPlus: 'NumpadMultiply',
    jump: 'Numpad0',
    boost: 'NumpadAdd',
    powerslide: 'NumpadSubtract',
    ballCam: 'NumpadDecimal',
    menu: 'Escape',
    confirm: 'NumpadEnter',
    back: 'Backspace',
  },
];

export function keyboardLayout(slot) {
  return KEYBOARDS[Math.max(0, Math.min(KEYBOARDS.length - 1, slot))];
}

export function mapKeyboard(keys, slot = 0) {
  const a = emptyActions();
  const layout = keyboardLayout(slot);
  const down = (code) => (keys instanceof Set ? keys.has(code) : !!keys[code]);
  if (down(layout.throttlePlus)) a.throttle += 1;
  if (down(layout.throttleMinus)) a.throttle -= 1;
  if (down(layout.steerPlus)) a.steer += 1;
  if (down(layout.steerMinus)) a.steer -= 1;
  if (down(layout.pitchPlus)) a.pitch += 1;
  if (down(layout.pitchMinus)) a.pitch -= 1;
  if (down(layout.yawPlus)) a.yaw += 1;
  if (down(layout.yawMinus)) a.yaw -= 1;
  if (down(layout.rollPlus)) a.roll += 1;
  if (down(layout.rollMinus)) a.roll -= 1;
  a.jump = down(layout.jump);
  a.boost = down(layout.boost);
  a.powerslide = down(layout.powerslide);
  a.ballCam = down(layout.ballCam);
  a.menu = down(layout.menu);
  a.confirm = down(layout.confirm) || down(layout.jump);
  a.back = down(layout.back) || down(layout.menu);
  a.menuY = (down(layout.throttleMinus) ? 1 : 0) - (down(layout.throttlePlus) ? 1 : 0);
  a.menuX = (down(layout.steerPlus) ? 1 : 0) - (down(layout.steerMinus) ? 1 : 0);
  a.throttle = Math.max(-1, Math.min(1, a.throttle));
  a.steer = Math.max(-1, Math.min(1, a.steer));
  a.pitch = Math.max(-1, Math.min(1, a.pitch));
  a.yaw = Math.max(-1, Math.min(1, a.yaw));
  a.roll = Math.max(-1, Math.min(1, a.roll));
  return a;
}

/** Mouse deltas use the same yaw and pitch fields as the right stick. */
export function mergeMouse(actions, dx, dy, buttons = {}) {
  const a = { ...actions };
  a.yaw = Math.max(-1, Math.min(1, a.yaw + dx / 28));
  a.pitch = Math.max(-1, Math.min(1, a.pitch + -dy / 28));
  if (buttons.left) a.jump = true;
  if (buttons.right) a.boost = true;
  if (buttons.middle) a.powerslide = true;
  return a;
}
