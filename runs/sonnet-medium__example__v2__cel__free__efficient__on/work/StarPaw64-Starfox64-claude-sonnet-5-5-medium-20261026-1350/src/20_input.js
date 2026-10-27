// ---------------------------------------------------------------- Input: Gamepad (primary), keyboard + mouse (mapped onto the same model)
const blankCtl = () => ({ mx: 0, my: 0, ax: 0, ay: 0, aimActive: false, fire: false, firePress: false, charge: false, chargeRel: false, boost: false, brake: false, rollL: false, rollR: false, bomb: false, advice: false, pause: false });
const Input = {
  pads: {}, kb: { id: 'kb', kind: 'kb', ctl: blankCtl() }, keys: {}, keysEdge: {}, events: [], lastKind: 'kb', activity: performance.now(), activityCount: 0,
  mouse: { x: 0.5, y: 0.5, moved: -99, left: false, right: false, leftEdge: false, rightEdge: false }, padSeen: false, touchOnly: false, rawAxes: {},
  note() { this.activity = performance.now(); this.activityCount++; },
  init() {
    const prevent = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
    addEventListener('keydown', (e) => {
      if (prevent.has(e.code) || e.code === 'ControlLeft') e.preventDefault();
      A.unlock(); this.note(); this.touchOnly = false; $('#touchblock').classList.add('hidden');
      if (!e.repeat) { this.keys[e.code] = true; this.keysEdge[e.code] = true; }
      if (this.lastKind !== 'kb') { this.lastKind = 'kb'; UI.refreshHints && UI.refreshHints(); }
      const m = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'ok', Space: 'ok', Escape: 'back', Backspace: 'back', KeyQ: 'tabL', BracketLeft: 'tabL', KeyE: 'tabR', BracketRight: 'tabR' }[e.code];
      if (m) this.events.push({ a: m, dev: 'kb', enter: e.code === 'Enter' });
      if (e.code === 'Escape' || e.code === 'KeyP') this.events.push({ a: 'pausekey', dev: 'kb' });
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    const mm = (e) => { const mx = e.clientX / innerWidth, my = e.clientY / innerHeight; if (Math.abs(mx - this.mouse.x) * innerWidth + Math.abs(my - this.mouse.y) * innerHeight > 3) { this.note(); this.mouse.moved = performance.now(); } this.mouse.x = mx; this.mouse.y = my; };
    addEventListener('mousemove', mm);
    addEventListener('mousedown', (e) => { A.unlock(); this.note(); mm(e); if (e.button === 0) { this.mouse.left = true; this.mouse.leftEdge = true; } if (e.button === 2) { this.mouse.right = true; this.mouse.rightEdge = true; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('gamepadconnected', (e) => { this.padSeen = true; this.touchOnly = false; $('#touchblock').classList.add('hidden'); UI.toast && UI.toast('Controller connected: ' + e.gamepad.id.replace(/\(.*?\)/g, '').trim().slice(0, 40)); });
    addEventListener('gamepaddisconnected', (e) => { delete this.pads['pad' + e.gamepad.index]; UI.toast && UI.toast('Controller disconnected'); });
    addEventListener('touchstart', () => { this.note(); }, { passive: true });
    this.touchOnly = !!(matchMedia('(pointer:coarse)').matches && !matchMedia('(any-pointer:fine)').matches && navigator.maxTouchPoints > 0);
  },
  stick(gp, ix, iy) {
    let x = gp.axes[ix] || 0, y = gp.axes[iy] || 0; const dz = Settings.deadzone, len = Math.hypot(x, y);
    if (len < dz) return [0, 0];
    const m = Math.pow((len - dz) / (1 - dz), 1.25) / len; x *= m; y *= m;
    if (Settings.invH) x = -x; if (Settings.invV) y = -y;
    return [x, y];
  },
  // read all devices; produces this.events for the menu layer and per-device ctl for gameplay
  poll(dt) {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (!gp || !gp.connected) continue;
      const id = 'pad' + gp.index; let d = this.pads[id];
      if (!d) { d = this.pads[id] = { id, kind: 'pad', gp, prev: [], ctl: blankCtl(), rep: {}, index: gp.index }; this.padSeen = true; }
      d.gp = gp; const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.45)), cur = [];
      for (let i = 0; i < 17; i++) cur[i] = b(i);
      const ed = (i) => cur[i] && !d.prev[i];
      const [lx, ly] = this.stick(gp, 0, 1), [rx, ry] = this.stick(gp, 2, 3);
      this.rawAxes[id] = { lx, ly, rx, ry };
      const any = cur.some((v, i) => v && !d.prev[i]) || Math.hypot(lx, ly) > 0.6;
      if (any) { this.note(); A.unlock(); if (this.lastKind !== 'pad') { this.lastKind = 'pad'; UI.refreshHints && UI.refreshHints(); } this.lastPadId = id; this.touchOnly = false; $('#touchblock').classList.add('hidden'); }
      // menu directions with auto-repeat
      const dirs = { up: cur[12] || ly < -0.6, down: cur[13] || ly > 0.6, left: cur[14] || lx < -0.6, right: cur[15] || lx > 0.6 };
      for (const k in dirs) {
        if (dirs[k]) {
          if (d.rep[k] === undefined) { this.events.push({ a: k, dev: id }); d.rep[k] = 0.38; }
          else { d.rep[k] -= dt; if (d.rep[k] <= 0) { this.events.push({ a: k, dev: id }); d.rep[k] = 0.1; } }
        }
        else d.rep[k] = undefined;
      }
      if (ed(0)) this.events.push({ a: 'ok', dev: id }); if (ed(1)) this.events.push({ a: 'back', dev: id });
      if (ed(9)) { this.events.push({ a: 'start', dev: id }); this.events.push({ a: 'pausekey', dev: id }); }
      if (ed(4)) this.events.push({ a: 'tabL', dev: id }); if (ed(5)) this.events.push({ a: 'tabR', dev: id });
      const c = d.ctl; c.mx = lx; c.my = -ly; c.ax = rx; c.ay = -ry; c.aimActive = Math.hypot(rx, ry) > 0.05;
      const f = cur[0]; c.firePress = f && !d.prev[0]; c.fire = f;
      const ch = cur[2]; c.chargeRel = !ch && d.prev[2]; c.charge = ch;
      c.boost = cur[7]; c.brake = cur[6]; c.rollL = ed(4); c.rollR = ed(5); c.bomb = ed(3); c.advice = ed(1); c.pause = ed(9);
      d.prev = cur;
    }
    // keyboard + mouse
    const k = (c) => !!this.keys[c], e = (c) => !!this.keysEdge[c], c = this.kb.ctl, ms = this.mouse;
    c.mx = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0); c.my = (k('KeyW') ? 1 : 0) - (k('KeyS') ? 1 : 0);
    const dm = Math.hypot(c.mx, c.my); if (dm > 1) { c.mx /= dm; c.my /= dm; }
    let ax = (k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0), ay = (k('ArrowUp') ? 1 : 0) - (k('ArrowDown') ? 1 : 0);
    c.aimActive = ax !== 0 || ay !== 0;
    if (!c.aimActive && performance.now() - ms.moved < 2500) { ax = clamp((ms.x - 0.5) * 2.2, -1, 1); ay = clamp(-(ms.y - 0.5) * 2.2, -1, 1); c.aimActive = true; c.mouseAim = true; } else c.mouseAim = false;
    c.ax = ax; c.ay = ay;
    c.fire = k('Space') || ms.left; c.firePress = e('Space') || ms.leftEdge;
    c.charge = k('KeyX'); c.chargeRel = false; if (this._kx && !c.charge) c.chargeRel = true; this._kx = c.charge;
    c.boost = k('ShiftLeft') || k('ShiftRight'); c.brake = k('ControlLeft') || k('KeyZ');
    c.rollL = e('KeyQ'); c.rollR = e('KeyE'); c.bomb = e('KeyF') || ms.rightEdge; c.advice = e('KeyR'); c.pause = e('Escape') || e('KeyP');
    this.keysEdge = {}; ms.leftEdge = false; ms.rightEdge = false;
  },
  drain() { const ev = this.events; this.events = []; return ev; },
  ctl(devId) { return devId === 'kb' ? this.kb.ctl : (this.pads[devId] ? this.pads[devId].ctl : blankCtl()); },
  padList() { return Object.keys(this.pads); },
  rumble(devId, strong, weak, ms) {
    if (!Settings.rumble) return; const d = this.pads[devId]; if (!d || !d.gp) return;
    try { const a = d.gp.vibrationActuator; if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (er) { /* unsupported */ }
  },
  // human-readable name of an action for the current device kind
  label(action, kind = this.lastKind) {
    const pad = { ok: ['✕', 'x'], back: ['○', 'o'], start: ['OPT', ''], fire: ['✕', 'x'], charge: ['□', 's'], bomb: ['△', 't'], advice: ['○', 'o'], boost: ['R2', ''], brake: ['L2', ''], rollL: ['L1', ''], rollR: ['R1', ''], move: ['L-Stick', ''], aim: ['R-Stick', ''], tabL: ['L1', ''], tabR: ['R1', ''], pause: ['OPT', ''], nav: ['D-Pad', ''] };
    const kb = { ok: ['Enter', ''], back: ['Esc', ''], start: ['Enter', ''], fire: ['Space', ''], charge: ['X', ''], bomb: ['F', ''], advice: ['R', ''], boost: ['Shift', ''], brake: ['Ctrl', ''], rollL: ['Q', ''], rollR: ['E', ''], move: ['WASD', ''], aim: ['Arrows', ''], tabL: ['Q', ''], tabR: ['E', ''], pause: ['Esc', ''], nav: ['↑↓←→', ''] };
    const [t, cls] = (kind === 'pad' ? pad : kb)[action] || [action, '']; return `<span class="glyph ${cls}">${t}</span>`;
  },
};
