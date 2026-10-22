// ===================================================================
//  INPUT  -  Gamepad API first, keyboard / mouse mapped onto the same actions
// ===================================================================
const Input = {
  pad: null, device: 'kb', lastActivity: performance.now(), keyboardSeen: false,
  keys: new Set(), mouse: { x: 0, y: 0, buttons: 0, active: false },
  act: null, nav: { up: false, down: false, left: false, right: false, confirm: false, back: false },
  _prevBtn: [], _prevKeys: new Set(), _navHold: {}, _tap: { l: -9, r: -9 }, _mprev: 0,
  isPS: false,
};
const BTN = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };

function emptyAct() {
  return {
    move: { x: 0, y: 0 }, fire: false, fireDown: false, charge: false, chargeDown: false, chargeUp: false,
    bomb: false, boost: 0, brake: 0, bankL: false, bankR: false, rollL: false, rollR: false, maneuver: false,
    pause: false, any: false, uturnHeld: false,
  };
}
Input.act = emptyAct();

addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  Input.keys.add(e.code);
  Input.keyboardSeen = true;
  Input.device = 'kb';
  Input.lastActivity = performance.now();
  Snd.unlock();
});
addEventListener('keyup', (e) => { Input.keys.delete(e.code); });
addEventListener('blur', () => { Input.keys.clear(); });
addEventListener('mousemove', (e) => {
  Input.mouse.x = (e.clientX / innerWidth) * 2 - 1;
  Input.mouse.y = -((e.clientY / innerHeight) * 2 - 1);
  if (S.mouse && !Input.mouse.active) { Input.mouse.active = true; }
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) Input.lastActivity = performance.now();
});
addEventListener('mousedown', (e) => { Input.mouse.buttons |= 1 << e.button; Input.lastActivity = performance.now(); Input.device = 'kb'; Snd.unlock(); });
addEventListener('mouseup', (e) => { Input.mouse.buttons &= ~(1 << e.button); });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('touchstart', () => { Input.touchSeen = true; }, { passive: true });
addEventListener('gamepadconnected', (e) => { Input.lastActivity = performance.now(); Input.device = 'pad'; });

function applyDZ(x, y, dz) {
  const m = Math.hypot(x, y);
  if (m < dz || m < 1e-6) return [0, 0];
  const k = (m - dz) / (1 - dz) / m;
  return [clamp(x * k, -1, 1), clamp(y * k, -1, 1)];
}

Input.vibrate = function (strong, weak, ms) {
  if (!S.rumble || !Input.pad) return;
  const a = Input.pad.vibrationActuator;
  if (a && a.playEffect) {
    try { a.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }); } catch (e) { /* ignore */ }
  }
};

Input.touchOnly = function () {
  const fine = matchMedia('(any-pointer: fine)').matches;
  const touchy = (navigator.maxTouchPoints > 0 || Input.touchSeen) && matchMedia('(any-pointer: coarse)').matches;
  return touchy && !fine && !Input.pad && !Input.keyboardSeen;
};

// Poll once per frame. Produces Input.act (gameplay) and Input.nav (menu edges, with hold-repeat).
Input.poll = function (dt) {
  const now = performance.now();
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null;
  for (const p of pads) { if (p && p.connected) { pad = p; break; } }
  Input.pad = pad;
  Input.isPS = !!(pad && /054c|dualsense|dualshock|wireless controller|playstation/i.test(pad.id));
  const b = (i) => (pad && pad.buttons[i] ? pad.buttons[i].pressed : false);
  const bv = (i) => (pad && pad.buttons[i] ? pad.buttons[i].value : 0);
  const K = (...codes) => codes.some((c) => Input.keys.has(c));
  const KP = (...codes) => codes.some((c) => Input.keys.has(c) && !Input._prevKeys.has(c));

  // pad activity detection
  let padActive = false;
  if (pad) {
    for (let i = 0; i < pad.buttons.length; i++) {
      const p = pad.buttons[i].pressed;
      if (p && !Input._prevBtn[i]) padActive = true;
    }
    for (let i = 0; i < Math.min(4, pad.axes.length); i++) if (Math.abs(pad.axes[i]) > 0.5) padActive = true;
  }
  if (padActive) { Input.device = 'pad'; Input.lastActivity = now; Snd.unlock(); }
  if (Input.keys.size && !Input._prevKeys.size) Input.lastActivity = now;

  // sticks
  let lx = 0, ly = 0, rx = 0, ry = 0;
  if (pad) {
    [lx, ly] = applyDZ(pad.axes[0] || 0, pad.axes[1] || 0, S.deadzone);
    [rx, ry] = applyDZ(pad.axes[2] || 0, pad.axes[3] || 0, S.deadzone);
    if (S.invH) { lx = -lx; rx = -rx; }
    if (S.invV) { ly = -ly; ry = -ry; }
  }
  let mx = lx, my = -ly;
  const kx = (K('KeyD', 'ArrowRight') ? 1 : 0) - (K('KeyA', 'ArrowLeft') ? 1 : 0);
  const ky = (K('KeyW', 'ArrowUp') ? 1 : 0) - (K('KeyS', 'ArrowDown') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / Math.max(1, l); my = ky / Math.max(1, l); }
  else if (S.mouse && Input.mouse.active && !pad) {
    const [a, c] = applyDZ(Input.mouse.x * 1.25, Input.mouse.y * 1.25, 0.08);
    mx = a; my = c;
  }
  // d-pad also steers
  const dpx = (b(BTN.right) ? 1 : 0) - (b(BTN.left) ? 1 : 0), dpy = (b(BTN.up) ? 1 : 0) - (b(BTN.down) ? 1 : 0);
  if (!mx && dpx) mx = dpx;
  if (!my && dpy) my = dpy;

  const a = emptyAct();
  a.move.x = clamp(mx, -1, 1); a.move.y = clamp(my, -1, 1);
  const mb = Input.mouse.buttons;
  a.fire = b(BTN.cross) || K('Space', 'KeyJ', 'KeyZ') || !!(mb & 1);
  a.charge = b(BTN.square) || K('KeyK', 'KeyX') || !!(mb & 4);
  a.bomb = false;
  const bombNow = b(BTN.circle) || K('KeyB', 'KeyL') || !!(mb & 2);
  const bombPrev = Input._prevBtn[BTN.circle] || ['KeyB', 'KeyL'].some((c) => Input._prevKeys.has(c)) || !!(Input._mprev & 2);
  a.bomb = bombNow && !bombPrev;
  a.fireDown = a.fire && !(Input._prevBtn[BTN.cross] || ['Space', 'KeyJ', 'KeyZ'].some((c) => Input._prevKeys.has(c)) || !!(Input._mprev & 1));
  const chPrev = Input._prevBtn[BTN.square] || ['KeyK', 'KeyX'].some((c) => Input._prevKeys.has(c)) || !!(Input._mprev & 4);
  a.chargeDown = a.charge && !chPrev;
  a.chargeUp = !a.charge && chPrev;
  a.boost = Math.max(bv(BTN.r2), K('ShiftLeft', 'ShiftRight') ? 1 : 0);
  a.brake = Math.max(bv(BTN.l2), K('KeyC', 'ControlLeft') ? 1 : 0);
  a.bankL = b(BTN.l1) || K('KeyQ');
  a.bankR = b(BTN.r1) || K('KeyE');
  const lPress = (b(BTN.l1) && !Input._prevBtn[BTN.l1]) || KP('KeyQ');
  const rPress = (b(BTN.r1) && !Input._prevBtn[BTN.r1]) || KP('KeyE');
  if (lPress) { if (now - Input._tap.l < 300) { a.rollL = true; Input._tap.l = -9; } else Input._tap.l = now; }
  if (rPress) { if (now - Input._tap.r < 300) { a.rollR = true; Input._tap.r = -9; } else Input._tap.r = now; }
  a.maneuver = (b(BTN.triangle) && !Input._prevBtn[BTN.triangle]) || KP('KeyF');
  a.uturnHeld = a.move.y < -0.55;
  a.pause = (b(BTN.options) && !Input._prevBtn[BTN.options]) || KP('Escape', 'KeyP');
  a.any = padActive || KP(...Array.from(Input.keys)) || (mb && !Input._mprev);
  Input.act = a;

  // menu navigation edges (stick + dpad + keys), with repeat
  const nv = { up: false, down: false, left: false, right: false, confirm: false, back: false };
  const raw = {
    up: b(BTN.up) || ly < -0.6 || K('ArrowUp', 'KeyW'),
    down: b(BTN.down) || ly > 0.6 || K('ArrowDown', 'KeyS'),
    left: b(BTN.left) || lx < -0.6 || K('ArrowLeft', 'KeyA'),
    right: b(BTN.right) || lx > 0.6 || K('ArrowRight', 'KeyD'),
  };
  for (const k of ['up', 'down', 'left', 'right']) {
    const h = Input._navHold[k] || (Input._navHold[k] = { on: false, t: 0, rep: 0 });
    if (raw[k]) {
      if (!h.on) { h.on = true; h.t = 0; h.rep = 0; nv[k] = true; }
      else { h.t += dt; if (h.t > 0.38) { h.rep += dt; if (h.rep > 0.11) { h.rep = 0; nv[k] = true; } } }
    } else h.on = false;
  }
  nv.confirm = (b(BTN.cross) && !Input._prevBtn[BTN.cross]) || KP('Enter', 'Space', 'NumpadEnter');
  nv.back = (b(BTN.circle) && !Input._prevBtn[BTN.circle]) || KP('Escape', 'Backspace');
  nv.options = (b(BTN.options) && !Input._prevBtn[BTN.options]) || KP('Enter');
  nv.tabL = (b(BTN.l1) && !Input._prevBtn[BTN.l1]) || KP('KeyQ');
  nv.tabR = (b(BTN.r1) && !Input._prevBtn[BTN.r1]) || KP('KeyE');
  Input.nav = nv;

  Input._prevBtn = pad ? pad.buttons.map((x) => x.pressed) : [];
  Input._prevKeys = new Set(Input.keys);
  Input._mprev = mb;
};

// any raw input at all (used to leave attract mode)
Input.anyRaw = function () {
  const pad = Input.pad;
  if (Input.keys.size) return true;
  if (Input.mouse.buttons) return true;
  if (pad) {
    if (pad.buttons.some((x) => x.pressed)) return true;
    for (let i = 0; i < Math.min(4, pad.axes.length); i++) if (Math.abs(pad.axes[i]) > 0.5) return true;
  }
  return false;
};

// glyph labels that follow the last used device
const GLYPH = {
  ps: { fire: '✕', charge: '□', bomb: '○', maneuver: '△', boost: 'R2', brake: 'L2', bank: 'L1 / R1', roll: 'L1/R1 ×2', pause: 'OPTIONS', confirm: '✕', back: '○', move: 'L-STICK', tab: 'L1 / R1' },
  kb: { fire: 'SPACE', charge: 'K', bomb: 'B', maneuver: 'F', boost: 'SHIFT', brake: 'C', bank: 'Q / E', roll: 'Q/E ×2', pause: 'ESC', confirm: 'ENTER', back: 'ESC', move: 'WASD', tab: 'Q / E' },
  xbox: { fire: 'A', charge: 'X', bomb: 'B', maneuver: 'Y', boost: 'RT', brake: 'LT', bank: 'LB / RB', roll: 'LB/RB ×2', pause: 'MENU', confirm: 'A', back: 'B', move: 'L-STICK', tab: 'LB / RB' },
};
function glyphSet() {
  let g = S.glyphs;
  if (g === 'auto') g = Input.device === 'pad' ? (Input.isPS || !Input.pad ? 'ps' : 'xbox') : 'kb';
  return GLYPH[g] || GLYPH.ps;
}
