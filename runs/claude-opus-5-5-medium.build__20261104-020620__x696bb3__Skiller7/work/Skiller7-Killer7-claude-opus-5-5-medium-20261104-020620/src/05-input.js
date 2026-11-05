/* SKILLER7 — input: the action map (§6.1), the intent layer (one place turns devices into intents; the bot writes the
 * same intents), last-device tracking, the idle timer for attract mode, touch-only detection. */
const INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  move: ['KeyW', 'ArrowUp', 'Pad0'], turn: ['KeyS', 'ArrowDown', 'Pad1'],
  interact: ['KeyE', 'KeyF', 'Pad3'], heal: ['KeyH', 'Pad2'], ring: ['Tab', 'Pad4'], skill: ['KeyQ', 'Pad5'],
  aim: ['Mouse2', 'Pad6'], fire: ['Mouse0', 'Pad7'], scan: ['Space', 'Mouse1', 'Pad4'], reload: ['KeyR', 'Pad2'], map: ['KeyM', 'Pad8'],
  p1: ['Digit1'], p2: ['Digit2'], p3: ['Digit3'], p4: ['Digit4'], p5: ['Digit5'], p6: ['Digit6'], p7: ['Digit7']
};
const CONTROL_NAMES = { move: 'Move (hold)', turn: 'Quick turn / hockey stop', interact: 'Check / interact', heal: 'Heal (hold)', ring: 'Featherbed ring (hold)',
  skill: 'Skill', aim: 'Aim', fire: 'Fire', scan: 'Scan (while aiming)', reload: 'Reload (while aiming)', map: 'Map',
  p1: 'Persona 1', p2: 'Persona 2', p3: 'Persona 3', p4: 'Persona 4', p5: 'Persona 5', p6: 'Persona 6', p7: 'Persona 7' };
S7.INPUT = INPUT;

/** an empty intent frame */
const blankIntent = () => ({ move: false, turn: false, left: false, right: false, stick: [0, 0], interact: false, heal: false, ring: false, ringPressed: false, ringReleased: false,
  skill: false, skillDown: false, aim: false, fire: false, firePressed: false, scan: false, reload: false, map: false, pick: 0, confirm: false, cancel: false,
  lookYaw: 0, lookPitch: 0, pointer: null, click: null, branch: -1, interactId: null, any: false, up: false, down: false, pickChoice: -1, interactHeld: false, ringSel: null, clickGo: false });

/* mouse deltas from pointer lock (the presenter adds them each step from world.camera.takeMouse) */
S7.mouse = { dx: 0, dy: 0, locked: false };
const padRamp = { t: 0, k: 0 };
let aimToggled = false, lastAimDown = false;

/** read the human devices into intents (once a step, in play) */
function readHumanIntent(dt) {
  const I = S7.game.input, st = S7.game.settings || {}, o = blankIntent(), ax = I.move();
  o.move = I.down('move') || ax[1] < -.55;
  o.turn = I.pressed('turn');
  o.left = I.pressed('left'); o.right = I.pressed('right'); o.up = I.pressed('up'); o.down = I.pressed('down');
  o.stick = [ax[0], ax[1]];
  o.interact = I.pressed('interact'); o.interactHeld = I.down('interact'); o.heal = I.down('heal'); o.ring = I.down('ring'); o.ringPressed = I.pressed('ring'); o.ringReleased = I.released('ring');
  o.skill = I.pressed('skill'); o.skillDown = I.down('skill');
  const aimDown = I.down('aim');
  if (st.aimToggle === 'Toggle') { if (aimDown && !lastAimDown) aimToggled = !aimToggled; o.aim = aimToggled; } else { o.aim = aimDown; aimToggled = false; }
  lastAimDown = aimDown;
  o.fire = I.down('fire'); o.firePressed = I.pressed('fire'); o.scan = I.pressed('scan'); o.reload = I.pressed('reload'); o.map = I.pressed('map');
  o.confirm = I.pressed('confirm'); o.cancel = I.pressed('cancel');
  for (let k = 1; k <= 7; k++) if (I.pressed('p' + k)) o.pick = k;
  // the look: the right stick (a curve, a ramp after a held push), else the left stick at 60%, and the mouse
  let pa = I.padAim || null;
  if (!pa && S7.sim && S7.sim.aiming() && Math.hypot(ax[0], ax[1]) > .2 && I.lastDevice === 'gamepad') pa = [ax[0] * .6, ax[1] * .6];
  if (pa) {
    const m = Math.hypot(pa[0], pa[1]);
    if (m > .9) padRamp.t += dt; else padRamp.t = 0;
    padRamp.k = padRamp.t > .35 ? Math.min(1, padRamp.k + dt / .3) : Math.max(0, padRamp.k - dt * 4);
    const cx = Math.sign(pa[0]) * Math.pow(Math.abs(pa[0]), 1.8), cy = Math.sign(pa[1]) * Math.pow(Math.abs(pa[1]), 1.8), sens = (st.padSens || 1) * T.padSens * (1 + .6 * padRamp.k);
    o.lookYaw += cx * 160 * sens * dt; o.lookPitch -= cy * 110 * sens * dt * (st.invertAimY || I.invertAimY ? -1 : 1);
    o.padLook = true;
  } else { padRamp.t = 0; padRamp.k = 0; }
  if (S7.mouse.dx || S7.mouse.dy) {
    const k = st.mouseSens || .12;
    o.lookYaw += S7.mouse.dx * k; o.lookPitch -= S7.mouse.dy * k * (st.invertAimY ? -1 : 1);
    S7.mouse.dx = S7.mouse.dy = 0;
  }
  o.pointer = I.pointer ? I.pointer() : null; o.click = I.clicked ? I.clicked() : null;
  o.mouseDown0 = I.held && I.held.has ? I.held.has('Mouse0') : false;
  o.any = I.anyPressed();
  return o;
}

/* ---- the idle timer (real seconds without input, for attract mode) and the device in use ---- */
const IDLE = { t: 0, last: null };
S7.idle = IDLE;
function idleTick(rdt) {
  // real seconds in the page (a slow frame still counts its time); steps in Node
  if (typeof performance !== 'undefined' && typeof document !== 'undefined' && !S7.game.headless) { const now = performance.now(); rdt = IDLE.lastNow ? Math.min(.25, (now - IDLE.lastNow) / 1000) : 0; IDLE.lastNow = now; }
  const I = S7.game.input, p = I.pointer ? I.pointer() : null, mv = I.move(), pa = I.padAim;
  let active = I.anyPressed() || Math.hypot(mv[0], mv[1]) > .3 || (pa && Math.hypot(pa[0], pa[1]) > .3) || (I.held && I.held.size > 0);
  if (p && IDLE.last && Math.hypot(p[0] - IDLE.last[0], p[1] - IDLE.last[1]) > 3) active = true;
  if (p) IDLE.last = p.slice();
  if (IDLE.wheel || IDLE.tap) { active = true; IDLE.wheel = false; IDLE.tap = false; }
  if (active) IDLE.t = 0; else IDLE.t += rdt;
  return active;
}
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  addEventListener('wheel', () => { IDLE.wheel = true; }, { passive: true });
  addEventListener('keydown', e => { S7.keyUsed = true; IDLE.tap = true; if (!e.repeat) (S7.keyTaps || (S7.keyTaps = new Set())).add(e.code); }, true);
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') S7.touchUsed = true; IDLE.tap = true; }, true);
  addEventListener('touchstart', () => { IDLE.tap = true; }, { capture: true, passive: true });
}

/** touch-only: a coarse pointer, no fine one, touch points, no gamepad, no key pressed yet (§6.5) */
S7.touchOnly = () => {
  if (typeof matchMedia !== 'function' || typeof navigator === 'undefined') return false;
  if (S7.keyUsed) return false;
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(Boolean) : [];
  if (pads.length) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0;
};
/** the prompt chip for an action: the glyph on a pad, the key on a keyboard */
S7.label = (a, dev) => {
  const I = S7.game.input; let l = I.label(a, dev);
  if (!l || l === 'none') l = '?';
  return l;
};
