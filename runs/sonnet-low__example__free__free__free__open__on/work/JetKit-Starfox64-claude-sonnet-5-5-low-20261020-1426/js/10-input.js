// ---------- input: gamepad first, keyboard/mouse mapped onto the same model ----------
const Input = (() => {
  const keys = new Set(), prevAct = {}, I = { device: 'kb', activity: false, pad: false, mx: 0, my: 0, act: {}, pressed: {}, nav: { x: 0, y: 0 }, navPressed: { up: 0, down: 0, left: 0, right: 0 }, mouseDown: [false, false, false] };
  let mouseMoved = 0, lastMouse = null, navHold = { up: 0, down: 0, left: 0, right: 0 }, ai = null, padPrev = [];
  addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    keys.add(e.code); I.activity = true; I.device = 'kb'; I.touchOnly = false;
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('mousedown', e => { I.mouseDown[e.button] = true; I.activity = true; I.device = 'kb'; });
  addEventListener('mouseup', e => { I.mouseDown[e.button] = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousemove', e => {
    if (lastMouse) mouseMoved += Math.abs(e.clientX - lastMouse[0]) + Math.abs(e.clientY - lastMouse[1]);
    lastMouse = [e.clientX, e.clientY]; if (mouseMoved > 60) { I.activity = true; mouseMoved = 0; }
  });
  addEventListener('wheel', () => { I.activity = true; });
  addEventListener('gamepadconnected', () => { I.pad = true; });
  const dz = (v, d) => Math.abs(v) < d ? 0 : Math.sign(v) * (Math.abs(v) - d) / (1 - d);
  const K = (...c) => c.some(x => keys.has(x));
  I.setAI = a => { ai = a; };
  I.poll = function () {
    let ax = 0, ay = 0, pa = {}, sx = 0, sy = 0, dx = 0, dy = 0;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const g of gps) if (g && g.connected) { gp = g; break; }
    I.pad = !!gp;
    if (gp) {
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      let rx = gp.axes[0] || 0, ry = gp.axes[1] || 0;
      const raw = Math.max(Math.abs(rx), Math.abs(ry), Math.abs(gp.axes[2] || 0), Math.abs(gp.axes[3] || 0));
      sx = rx; sy = ry;
      let anyBtn = false; for (let i = 0; i < gp.buttons.length; i++) { const p = b(i); if (p && !padPrev[i]) anyBtn = true; padPrev[i] = p; }
      if (anyBtn || raw > 0.6) { I.activity = true; I.device = 'pad'; }
      dx = (b(15) ? 1 : 0) - (b(14) ? 1 : 0); dy = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
      pa = { roll_l: b(4), roll_r: b(5), boost: b(7), brake: b(6), flip: b(3), pause: b(9), ok: b(0), back: b(1) };
      pa.fire = b(0); pa.charge = b(2); pa.bomb = b(1);
      // gameplay stick uses left stick; apply the inversion toggles here (hardware glitch workaround)
      let gx = dz(rx, Settings.dead), gy = dz(ry, Settings.dead);
      if (Settings.invertX) gx = -gx; if (Settings.invertY) gy = -gy;
      ax = gx + dx; ay = gy + dy;
    }
    const kx = (K('KeyD', 'ArrowRight') ? 1 : 0) - (K('KeyA', 'ArrowLeft') ? 1 : 0);
    const ky = (K('KeyS', 'ArrowDown') ? 1 : 0) - (K('KeyW', 'ArrowUp') ? 1 : 0);
    const ka = { fire: K('Space', 'KeyJ') || I.mouseDown[0], bomb: K('KeyK', 'KeyB') || I.mouseDown[2], roll_l: K('KeyQ'), roll_r: K('KeyE'), boost: K('ShiftLeft', 'ShiftRight'), brake: K('ControlLeft', 'ControlRight', 'KeyC'), flip: K('KeyU', 'KeyF'), charge: K('KeyL', 'KeyX') || I.mouseDown[1], pause: K('Escape', 'KeyP'), ok: K('Enter'), back: K('Backspace', 'Escape') };
    const act = {};
    for (const k in ka) act[k] = !!(ka[k] || pa[k]);
    // gameplay axes (screen-down positive)
    let mx = clamp(ax + kx, -1, 1), my = clamp(ay + ky, -1, 1);
    if (ai) { const r = ai(); mx = r.mx; my = r.my; for (const k in r.act) act[k] = r.act[k]; }
    I.mx = mx; I.my = my; I.act = act;
    I.pressed = {}; for (const k in act) { I.pressed[k] = act[k] && !prevAct[k]; prevAct[k] = act[k]; }
    // menu navigation with auto-repeat (uses raw stick direction; not inverted)
    const nx = clamp(dx + kx + (Math.abs(sx) > .55 ? Math.sign(sx) : 0), -1, 1), ny = clamp(dy + ky + (Math.abs(sy) > .55 ? Math.sign(sy) : 0), -1, 1);
    const now = performance.now(), dirs = { up: ny < 0, down: ny > 0, left: nx < 0, right: nx > 0 };
    for (const d in dirs) {
      I.navPressed[d] = 0;
      if (!dirs[d]) { navHold[d] = 0; continue; }
      if (navHold[d] === 0) { I.navPressed[d] = 1; navHold[d] = now + 380; } else if (now > navHold[d]) { I.navPressed[d] = 1; navHold[d] = now + 120; }
    }
    return I;
  };
  I.consumeActivity = () => { const a = I.activity; I.activity = false; return a; };
  return I;
})();
