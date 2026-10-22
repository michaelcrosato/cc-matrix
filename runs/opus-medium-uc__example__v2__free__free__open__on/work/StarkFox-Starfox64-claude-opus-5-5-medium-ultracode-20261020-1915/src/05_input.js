// ===== 05_input.js — controller-first input (Gamepad API + keyboard mapped to the pad model) =====
const Input = (() => {
  const keys = new Set();
  const keyEdges = new Set();
  const ACTIONS = ['fire', 'rapid', 'bomb', 'boost', 'brake', 'rollL', 'rollR', 'flip', 'pause', 'camera', 'confirm', 'back', 'up', 'down', 'left', 'right', 'tabL', 'tabR'];
  const cur = {}, prev = {};
  ACTIONS.forEach((a) => { cur[a] = false; prev[a] = false; });
  const st = {
    steerX: 0, steerY: 0, boostAmt: 0, brakeAmt: 0,
    lastDevice: 'kb', padName: '', padConnected: false, anyActivity: false, lastActivity: performance.now(),
    mouseActivity: false,
  };
  let rollTapL = -1, rollTapR = -1;
  let rollEvent = 0; // -1 left roll, +1 right roll (double tap)
  let navRepeat = { dir: '', t: 0 };
  let navEvent = '';
  let activePad = null;

  const KB = {
    fire: ['Space'], rapid: ['KeyJ'], bomb: ['KeyB', 'KeyK'], boost: ['ShiftLeft', 'ShiftRight'], brake: ['KeyC', 'KeyL'],
    rollL: ['KeyQ'], rollR: ['KeyE'], flip: ['KeyF', 'KeyU'], pause: ['Escape', 'KeyP'], camera: ['KeyV'],
    confirm: ['Enter', 'Space', 'NumpadEnter'], back: ['Escape', 'Backspace'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    tabL: ['PageUp', 'KeyZ'], tabR: ['PageDown', 'KeyX'],
  };
  // standard-mapping button indices (DualSense / DualShock / Xbox all report "standard")
  const PAD = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15, ps: 16 };

  let pendingActivity = false, pendingMouse = false;
  function activity(dev) {
    st.lastDevice = dev;
    pendingActivity = true;
    st.lastActivity = performance.now();
  }
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { e.preventDefault(); return; }
    keys.add(e.code); keyEdges.add(e.code);
    activity('kb');
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); });
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousedown', () => { activity('kb'); pendingMouse = true; });
  window.addEventListener('mousemove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) { st.lastActivity = performance.now(); pendingMouse = true; } });
  window.addEventListener('gamepadconnected', (e) => { st.padConnected = true; st.padName = e.gamepad.id; activity('pad'); Bus.emit('padchange', true); });
  window.addEventListener('gamepaddisconnected', () => {
    const any = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some((g) => g && g.connected);
    st.padConnected = any; Bus.emit('padchange', any);
  });

  const kbDown = (a) => KB[a].some((k) => keys.has(k));
  const dz = (v, d = 0.18) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));

  function poll(dt) {
    // activity flagged by DOM events since the last poll
    st.anyActivity = pendingActivity; pendingActivity = false;
    st.mouseActivity = pendingMouse; pendingMouse = false;
    Object.assign(prev, cur);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; if (p.mapping === 'standard') break; }
    activePad = gp;
    let px = 0, py = 0, pb = {}, l2 = 0, r2 = 0;
    if (gp) {
      st.padConnected = true; st.padName = gp.id;
      const b = (i) => (gp.buttons[i] ? gp.buttons[i].pressed || gp.buttons[i].value > 0.5 : false);
      const bv = (i) => (gp.buttons[i] ? gp.buttons[i].value : 0);
      let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      // radial deadzone
      const mag = Math.hypot(ax, ay);
      if (mag < 0.16) { ax = 0; ay = 0; } else { const k = Math.min(1, (mag - 0.16) / 0.84) / mag; ax *= k; ay *= k; }
      let dx = (b(PAD.right) ? 1 : 0) - (b(PAD.left) ? 1 : 0);
      let dy = (b(PAD.down) ? 1 : 0) - (b(PAD.up) ? 1 : 0);
      // Settings quick-fix for intermittently inverted pads: applies to all pad directional input.
      if (Settings.invertPadX) { ax = -ax; dx = -dx; }
      if (Settings.invertPadY) { ay = -ay; dy = -dy; }
      px = clamp(ax + dx, -1, 1); py = clamp(ay + dy, -1, 1);
      l2 = bv(PAD.l2); r2 = bv(PAD.r2);
      pb = {
        fire: b(PAD.cross) || b(PAD.r3), bomb: b(PAD.circle), boost: r2 > 0.25, brake: l2 > 0.25,
        rollL: b(PAD.l1), rollR: b(PAD.r1), flip: b(PAD.triangle), pause: b(PAD.options), camera: b(PAD.create),
        confirm: b(PAD.cross), back: b(PAD.circle),
        up: py < -0.5, down: py > 0.5, left: px < -0.5, right: px > 0.5,
        tabL: b(PAD.l1), tabR: b(PAD.r1), rapid: b(PAD.square),
      };
      const anyPad = gp.buttons.some((x) => x && x.pressed) || Math.abs(gp.axes[0] || 0) > 0.4 || Math.abs(gp.axes[1] || 0) > 0.4 || Math.abs(gp.axes[2] || 0) > 0.4 || Math.abs(gp.axes[3] || 0) > 0.4;
      if (anyPad) { activity('pad'); st.anyActivity = true; pendingActivity = false; }
    }
    for (const a of ACTIONS) cur[a] = !!pb[a] || kbDown(a);
    // steering: pad stick wins if moved, else keyboard
    const kx = (kbDown('right') ? 1 : 0) - (kbDown('left') ? 1 : 0);
    const ky = (kbDown('down') ? 1 : 0) - (kbDown('up') ? 1 : 0);
    st.steerX = Math.abs(px) > 0.01 ? px : kx;
    st.steerY = Math.abs(py) > 0.01 ? py : ky;
    if (kx && ky && !(Math.abs(px) > 0.01)) { st.steerX *= 0.7071; st.steerY *= 0.7071; }
    st.boostAmt = Math.max(r2, kbDown('boost') ? 1 : 0);
    st.brakeAmt = Math.max(l2, kbDown('brake') ? 1 : 0);

    // double-tap bank buttons → barrel roll
    const now = performance.now();
    rollEvent = 0;
    if (pressed('rollL')) { if (now - rollTapL < 320) { rollEvent = -1; rollTapL = -1; } else rollTapL = now; }
    if (pressed('rollR')) { if (now - rollTapR < 320) { rollEvent = 1; rollTapR = -1; } else rollTapR = now; }

    // menu navigation with auto-repeat
    navEvent = '';
    const dir = cur.up ? 'up' : cur.down ? 'down' : cur.left ? 'left' : cur.right ? 'right' : '';
    if (dir) {
      if (navRepeat.dir !== dir) { navRepeat = { dir, t: 0.38 }; navEvent = dir; }
      else { navRepeat.t -= dt; if (navRepeat.t <= 0) { navRepeat.t = 0.11; navEvent = dir; } }
    } else navRepeat.dir = '';
    keyEdges.clear();
  }
  const pressed = (a) => cur[a] && !prev[a];
  const released = (a) => !cur[a] && prev[a];
  const held = (a) => cur[a];

  function rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (!Settings.rumble || !activePad || !activePad.vibrationActuator) return;
    try { activePad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }); } catch (e) { /* unsupported */ }
  }
  function idleSeconds() { return (performance.now() - st.lastActivity) / 1000; }
  function resetIdle() { st.lastActivity = performance.now(); }

  return { st, poll, pressed, released, held, rumble, idleSeconds, resetIdle, get roll() { return rollEvent; }, get nav() { return navEvent; }, KB };
})();

// Button glyphs: PlayStation-style for pads, keycaps for keyboard. Follows last used device.
const Glyph = (() => {
  const PS = {
    fire: ['✕', 'ps-x'], confirm: ['✕', 'ps-x'], bomb: ['○', 'ps-o'], back: ['○', 'ps-o'], flip: ['△', 'ps-t'], rapid: ['□', 'ps-s'],
    rollL: ['L1', 'ps-sh'], rollR: ['R1', 'ps-sh'], roll: ['L1/R1', 'ps-sh'], boost: ['R2', 'ps-sh'], brake: ['L2', 'ps-sh'],
    pause: ['OPTIONS', 'ps-opt'], tabL: ['L1', 'ps-sh'], tabR: ['R1', 'ps-sh'], camera: ['CREATE', 'ps-opt'], steer: ['L', 'ps-stick'], nav: ['✥', 'ps-stick'], tabs: ['L1 R1', 'ps-sh'],
  };
  const KBN = {
    fire: 'Space', confirm: 'Enter', bomb: 'B', back: 'Esc', flip: 'F', rollL: 'Q', rollR: 'E', roll: 'Q/E', boost: 'Shift', brake: 'C',
    pause: 'Esc', tabL: 'Z', tabR: 'X', camera: 'V', steer: 'WASD', nav: '↑↓', tabs: 'Z X', rapid: 'J',
  };
  function html(action, dev = Input.st.lastDevice) {
    if (dev === 'pad') { const [t, c] = PS[action] || [action, 'ps-sh']; return `<span class="glyph ${c}">${t}</span>`; }
    return `<span class="glyph key">${KBN[action] || action}</span>`;
  }
  return { html };
})();
