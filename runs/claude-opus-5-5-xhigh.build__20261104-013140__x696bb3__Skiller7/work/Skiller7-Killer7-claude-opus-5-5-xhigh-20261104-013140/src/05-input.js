/* INPUT: the Skiller7 preset (every action rebindable on the standard Controls screen), the intent layer (devices →
 * intents; the bot makes the same intents), last-device tracking for prompts, the idle timer for attract mode, and the
 * touch-only check. Gamepad codes follow the standard mapping: Pad0 ✕/A, Pad1 ○/B, Pad2 □/X, Pad3 △/Y, Pad4 L1, Pad5 R1,
 * Pad6 L2, Pad7 R2, Pad8 Create/View, Pad9 Options/Menu, Pad12-15 the d-pad. */
const INPUT = S7.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  move: ['KeyW', 'ArrowUp', 'Pad0'],
  turn: ['KeyS', 'ArrowDown', 'Pad1'],
  interact: ['KeyE', 'KeyF', 'Pad3'],
  heal: ['KeyH', 'Pad2'],
  ring: ['Tab', 'Pad4'],
  skill: ['KeyQ', 'Pad5'],
  aim: ['Mouse2', 'Pad6'],
  fire: ['Mouse0', 'Pad7'],
  scan: ['Space', 'Mouse1', 'Pad4'],
  reload: ['KeyR', 'Pad2'],
  map: ['KeyM', 'Pad8'],
  pageL: ['KeyQ', 'Pad4'], pageR: ['KeyE', 'Pad5'],
  reset1: ['Backspace', 'Pad3'], resetPage: ['Delete', 'Pad2'],
  p1: ['Digit1', 'Numpad1'], p2: ['Digit2', 'Numpad2'], p3: ['Digit3', 'Numpad3'], p4: ['Digit4', 'Numpad4'], p5: ['Digit5', 'Numpad5'], p6: ['Digit6', 'Numpad6'], p7: ['Digit7', 'Numpad7'],
  d0: ['Digit0', 'Numpad0'], d8: ['Digit8', 'Numpad8'], d9: ['Digit9', 'Numpad9']
};
/** names on the Controls screen (false hides one from rebinding) */
S7.CONTROL_NAMES = {
  move: 'Move (hold) / tuck', turn: 'Quick turn / hockey stop', interact: 'Check / interact', heal: 'Drink Red (hold)',
  ring: 'Featherbed ring (hold)', skill: 'Skill', aim: 'Aim', fire: 'Fire', scan: 'Scan', reload: 'Reload', map: 'Map',
  pageL: false, pageR: false, reset1: false, resetPage: false, p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false, d0: false, d8: false, d9: false
};

/* ---- touch-only devices (§6.5): a coarse pointer, no fine one, touch points, no pad and no key yet ---- */
S7.touchOnly = () => {
  if (!HAS_DOM || typeof matchMedia !== 'function') return false;
  if (S7.Input && (S7.Input.sawKey || S7.Input.sawPad)) return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  return coarse && !fine && (navigator.maxTouchPoints || 0) > 0;
};

S7.Input = {
  sawKey: false, sawPad: false, idle: 0, lastReal: 0, wheel: 0, flickT: 0, flickArmed: true, aimToggled: false,
  /** hooked once at start: DOM listeners for the idle timer (wheel, mouse moves) and the "seen a key or pad" flags */
  init(game) {
    this.game = game;
    if (!HAS_DOM) return;
    this.wall = typeof performance !== 'undefined';   // in a page the idle timer is real time (a slow frame doesn't stretch it)
    this.lastAt = this.wall ? performance.now() : 0;
    const bump = () => { this.idle = 0; if (this.wall) this.lastAt = performance.now(); };
    addEventListener('keydown', e => { this.sawKey = true; bump(); if (S7.onAnyInput) S7.onAnyInput('key', e); }, true);
    addEventListener('pointerdown', e => { bump(); if (S7.onAnyInput) S7.onAnyInput(e.pointerType === 'touch' ? 'touch' : 'mouse', e); }, true);
    addEventListener('wheel', e => { bump(); this.wheel += Math.sign(e.deltaY); if (S7.onAnyInput) S7.onAnyInput('wheel', e); }, { passive: true, capture: true });
    let mx = null, my = null;
    addEventListener('mousemove', e => {
      if (mx !== null && Math.hypot(e.clientX - mx, e.clientY - my) > 6) { bump(); if (S7.onAnyInput) S7.onAnyInput('move', e); mx = e.clientX; my = e.clientY; }
      if (mx === null) { mx = e.clientX; my = e.clientY; }
    }, true);
    addEventListener('touchstart', e => { bump(); if (S7.onAnyInput) S7.onAnyInput('touch', e); }, { passive: true, capture: true });
    addEventListener('gamepadconnected', () => { this.sawPad = true; });
  },
  /** each step: the idle timer (any action, stick or pad button resets it) */
  tick(dt) {
    const I = this.game.input;
    if (this.wall) this.idle = (performance.now() - this.lastAt) / 1000; else this.idle += dt;
    const pm = I.padMove || [0, 0], pa = I.padAim;
    if (I.anyPressed() || Math.hypot(pm[0], pm[1]) > .3 || (pa && Math.hypot(pa[0], pa[1]) > .3)) { this.idle = 0; if (this.wall) this.lastAt = performance.now(); if (I.lastDevice === 'gamepad') this.sawPad = true; }
    if (I.lastDevice === 'gamepad') this.sawPad = true;
  },
  reset() { this.idle = 0; if (this.wall) this.lastAt = performance.now(); },
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; },
  /** the device prompts follow: 'gamepad' or 'kbm' */
  family() { const d = this.game && this.game.input.lastDevice; return d === 'gamepad' ? 'gamepad' : 'kbm'; }
};

/** a prompt's label for an action on the device used last ('✕', 'A', 'W', 'Right click'...) */
S7.label = (act) => {
  const I = S7.game.input;
  if (I.lastDevice === 'touch') return I.label(act, 'keyboard');
  return I.label(act);
};

/** read the devices into this step's intents (play scene). mouseDelta comes from the presenter's pointer lock (3D
 *  camera capture) and is [0, 0] headless */
S7.readIntents = (game, ui) => {
  const I = game.input, pm = I.padMove || [0, 0], pa = I.padAim || null, st = S7.Input;
  const dev = I.lastDevice;
  const intents = {
    device: dev === 'gamepad' ? 'gamepad' : dev === 'mouse' ? 'mouse' : 'keyboard',
    move: I.down('move') || pm[1] < -.5,
    stick: [pm[0], pm[1]],
    turnP: I.pressed('turn'),
    leftP: I.pressed('left'), rightP: I.pressed('right'), upP: I.pressed('up'), downP: I.pressed('down'),
    interactP: I.pressed('interact'), interactD: I.down('interact'),
    healD: I.down('heal'),
    ringD: I.down('ring'), ringP: I.pressed('ring'), ringR: I.released('ring'),
    pick: null,
    skillP: I.pressed('skill'), skillD: I.down('skill'),
    aimD: I.down('aim'), aimP: I.pressed('aim'),
    fireD: I.down('fire'), fireP: I.pressed('fire'),
    scanP: I.pressed('scan'), reloadP: I.pressed('reload'), mapP: I.pressed('map'),
    confirmP: I.pressed('confirm'), cancelP: I.pressed('cancel'),
    lookStick: pa ? [pa[0], pa[1]] : [0, 0],
    mouse: S7.mouseDelta ? S7.mouseDelta() : [0, 0],
    pointer: I.pointer ? I.pointer() : null,
    clicked: I.clicked ? I.clicked() : null,
    branchPick: null, spotPick: null, ringPick: null
  };
  for (let k = 1; k <= 7; k++) if (I.pressed('p' + k)) intents.pick = k - 1;
  // a quick flick of the left stick down is a quick turn (§6.1)
  if (pm[1] > .85 && st.flickArmed) { if (st.flickT < .14) intents.turnP = true; st.flickArmed = false; }
  if (Math.hypot(pm[0], pm[1]) < .3) { st.flickArmed = true; st.flickT = 0; } else st.flickT += game.dt || 1 / 120;
  // the mouse in the world: hover/click on markers (filled by the HUD from its last projection)
  if (ui && ui.worldPick) ui.worldPick(intents);
  return intents;
};
/** the empty intents (cutscenes, the bot's base) */
S7.noIntents = () => ({ device: 'keyboard', move: false, stick: [0, 0], turnP: false, leftP: false, rightP: false, upP: false, downP: false, interactP: false, interactD: false, healD: false, ringD: false, ringP: false, ringR: false, pick: null, skillP: false, skillD: false, aimD: false, aimP: false, fireD: false, fireP: false, scanP: false, reloadP: false, mapP: false, confirmP: false, cancelP: false, lookStick: [0, 0], mouse: [0, 0], pointer: null, clicked: null, branchPick: null, spotPick: null, ringPick: null, lookAbs: null });
