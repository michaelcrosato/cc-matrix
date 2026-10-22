// Input layer: keyboard + standard gamepad (PS5 mapping) unified into one "actions" snapshot.
// Gamepad axes can be intermittently inverted on some setups, so invertX / invertY are user toggles.

const DEADZONE = 0.18;

const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  fire: ['KeyJ', 'Space'],
  bomb: ['KeyK', 'ShiftLeft', 'ShiftRight'],
  barrel: ['KeyL', 'KeyE'],
  boost: ['KeyI', 'KeyQ'],
  brake: ['KeyO', 'KeyF'],
  uturn: ['KeyU', 'KeyC'],
  lock: ['KeyH', 'ControlLeft'],
  pause: ['Escape', 'KeyP', 'Enter'],
  confirm: ['Enter', 'Space', 'KeyJ'],
  back: ['Escape', 'Backspace', 'KeyX'],
  camera: ['KeyV', 'Tab'],
};

// Standard mapping indices: 0 cross, 1 circle, 2 square, 3 triangle, 4/5 L1/R1, 6/7 L2/R2,
// 8 share, 9 options, 10 L3, 11 R3, 12-15 dpad.
const PAD_MAP = {
  confirm: [0],
  back: [1],
  fire: [0],
  bomb: [2],
  barrel: [4, 5],
  boost: [7],
  brake: [6],
  uturn: [3],
  lock: [1],
  pause: [9],
  camera: [8],
  dpadLeft: [14],
  dpadRight: [15],
  dpadUp: [12],
  dpadDown: [13],
};

const keys = new Set();
const pressedThisFrame = new Set();
const prevPad = {};
const padPressed = new Set();

const settings = {
  invertX: false,
  invertY: false,
  sensitivity: 1.0,
  showHints: true,
  subtitles: true,
  screenShake: true,
  ...loadSettings(),
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('starfowl64.settings');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveSettings() {
  try {
    localStorage.setItem('starfowl64.settings', JSON.stringify({
      invertX: settings.invertX,
      invertY: settings.invertY,
      sensitivity: settings.sensitivity,
      showHints: settings.showHints,
      subtitles: settings.subtitles,
      screenShake: settings.screenShake,
    }));
  } catch (e) { /* storage unavailable: settings live for this session only */ }
}

// Mouse movement and clicks count as activity for the idle/attract timer, but are not game controls.
let mouseActivity = false;

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (!keys.has(e.code)) pressedThisFrame.add(e.code);
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousedown', () => { mouseActivity = true; });
  window.addEventListener('mousemove', () => { mouseActivity = true; });
  window.addEventListener('wheel', () => { mouseActivity = true; });
}

function keyDown(action) {
  return KEYMAP[action].some((k) => keys.has(k));
}

function keyPressed(action) {
  return KEYMAP[action].some((k) => pressedThisFrame.has(k));
}

function padButton(indices) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    for (const i of indices) {
      if (pad.buttons[i] && pad.buttons[i].pressed) return true;
    }
  }
  return false;
}

function padAxis(axisIndex) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let best = 0;
  for (const pad of pads) {
    if (!pad) continue;
    const v = pad.axes[axisIndex] || 0;
    if (Math.abs(v) > Math.abs(best)) best = v;
  }
  if (Math.abs(best) < DEADZONE) return 0;
  const scaled = (Math.abs(best) - DEADZONE) / (1 - DEADZONE);
  return Math.sign(best) * scaled;
}

function padPressedThisFrame(indices) {
  const id = indices.join(',');
  const down = padButton(indices);
  const was = prevPad[id] || false;
  prevPad[id] = down;
  return down && !was;
}

// Snapshot of the current frame. Call once per frame, then read the fields.
export function readInput() {
  // Browser stick axes: left is negative, up is negative. Normalise so +x = right, +y = up.
  // Mouse activity is consumed here so the idle timer sees each movement once.
  const mouseNow = mouseActivity;
  mouseActivity = false;
  // User invert toggles apply to the stick only, so keyboard and d-pad keep their meaning.
  const stickX = settings.invertX ? -padAxis(0) : padAxis(0);
  const stickY = settings.invertY ? padAxis(1) : -padAxis(1);
  const kx = (keyDown('right') ? 1 : 0) - (keyDown('left') ? 1 : 0);
  const ky = (keyDown('up') ? 1 : 0) - (keyDown('down') ? 1 : 0);

  let x = Math.abs(stickX) > Math.abs(kx) ? stickX : kx;
  let y = Math.abs(stickY) > Math.abs(ky) ? stickY : ky;
  if (padButton(PAD_MAP.dpadLeft)) x = -1;
  if (padButton(PAD_MAP.dpadRight)) x = 1;
  if (padButton(PAD_MAP.dpadUp)) y = 1;
  if (padButton(PAD_MAP.dpadDown)) y = -1;


  // Both sources are evaluated every frame so the pad's edge memory never goes stale.
  const pressedNow = (name, padIdx) => {
    const k = keyPressed(name);
    const p = padPressedThisFrame(padIdx);
    return k || p;
  };

  return {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y)),
    fire: keyDown('fire') || padButton(PAD_MAP.fire),
    bomb: keyDown('bomb') || padButton(PAD_MAP.bomb),
    barrel: keyDown('barrel') || padButton(PAD_MAP.barrel),
    boost: keyDown('boost') || padButton(PAD_MAP.boost),
    brake: keyDown('brake') || padButton(PAD_MAP.brake),
    uturn: keyDown('uturn') || padButton(PAD_MAP.uturn),
    lock: keyDown('lock') || padButton(PAD_MAP.lock),
    camera: keyDown('camera') || padButton(PAD_MAP.camera),
    pausePressed: pressedNow('pause', PAD_MAP.pause),
    confirmPressed: pressedNow('confirm', PAD_MAP.confirm),
    backPressed: pressedNow('back', PAD_MAP.back),
    upPressed: pressedNow('up', PAD_MAP.dpadUp),
    downPressed: pressedNow('down', PAD_MAP.dpadDown),
    leftPressed: pressedNow('left', PAD_MAP.dpadLeft),
    rightPressed: pressedNow('right', PAD_MAP.dpadRight),
    anyPressed: pressedThisFrame.size > 0 || padAnyPressed(),
    // Anything held or moved this frame: used to reset the idle timer and leave attract mode.
    anyActive: keys.size > 0 || padAnyPressed() || Math.abs(x) > 0 || Math.abs(y) > 0 || mouseNow,
  };
}

function padAnyPressed() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    for (const b of pad.buttons) if (b.pressed) return true;
  }
  return false;
}

// Call at the end of each frame so "pressed this frame" edges reset.
export function endInputFrame() {
  pressedThisFrame.clear();
}

export function hasGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return Array.from(pads).some(Boolean);
}

export { settings };
