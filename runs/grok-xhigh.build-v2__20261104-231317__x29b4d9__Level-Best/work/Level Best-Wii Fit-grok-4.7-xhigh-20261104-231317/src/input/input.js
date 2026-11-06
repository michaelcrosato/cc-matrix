/** One player's hands. Stick, keys and pointer share one wish. Last device wins. */

const WEIGHT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function normCode(code) {
  const c = String(code || '');
  if (/^[a-z]$/.test(c)) return 'Key' + c.toUpperCase();
  if (/^[A-Z]$/.test(c)) return 'Key' + c;
  if (c === ' ') return 'Space';
  return c;
}

function emptyEdges() {
  return {
    confirm: false, back: false, pause: false, hop: false, flail: false, ask: false,
    up: false, down: false, left: false, right: false, recenter: false,
    plateA: false, plateD: false,
  };
}

export function createInput() {
  const keys = new Set();
  const latched = new Set();
  let pointer = { x: 0, y: 0, moved: false, buttons: 0, px: 0, py: 0 };
  let lastDevice = 'pad';
  let lastPointer = false;
  let padSource = () => [];
  let padIndex = 0;
  const wish = { x: 0, y: 0 };
  let feetL = 0;
  let feetR = 0;
  let rawL = 0;
  let rawR = 0;
  let lookX = 0;
  let lookY = 0;
  let zoom = 0;
  let stickMenu = 0;
  let prevStickX = 0;
  let prevStickY = 0;
  let createHeld = false;
  let breatheHeld = false;
  let bothMouse = false;
  let seenPointer = false;
  let travel = 0;
  const view = { w: 1920, h: 1080 };
  let rumble = true;

  function edgesOf() {
    return emptyEdges();
  }
  let edges = edgesOf();

  function markDevice(kind) {
    lastDevice = kind;
    lastPointer = kind === 'mouse';
  }

  function keyDown(code) {
    const c = normCode(code);
    if (keys.has(c)) return;
    keys.add(c);
    latched.add(c);
    markDevice(c.startsWith('Mouse') ? 'mouse' : 'key');
  }

  function keyUp(code) {
    keys.delete(normCode(code));
  }

  function pointerMove(x, y, buttons) {
    const dx = x - pointer.px;
    const dy = y - pointer.py;
    travel += Math.hypot(dx, dy);
    pointer.px = x;
    pointer.py = y;
    pointer.buttons = buttons ?? pointer.buttons;
    if (Math.hypot(dx, dy) >= 4) {
      seenPointer = true;
      markDevice('mouse');
    }
    const nx = (x - view.w / 2) / (view.h * 0.33);
    const ny = (y - view.h / 2) / (view.h * 0.33);
    const h = Math.hypot(nx, ny);
    const s = h > 1 ? 1 / h : 1;
    pointer.x = nx * s;
    pointer.y = -ny * s;
    pointer.moved = seenPointer;
  }

  function pointerButtons(buttons, x, y) {
    const prev = pointer.buttons;
    pointer.buttons = buttons;
    if (x != null) pointerMove(x, y, buttons);
    if ((buttons & 1) && !(prev & 1)) latched.add('MouseLeft');
    if ((buttons & 2) && !(prev & 2)) latched.add('MouseRight');
    if ((buttons & 4) && !(prev & 4)) latched.add('MouseMiddle');
    if (buttons) markDevice('mouse');
  }

  function weightKeyDown() {
    for (const k of WEIGHT_KEYS) if (keys.has(k)) return true;
    return false;
  }

  function keyVector() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    const h = Math.hypot(x, y);
    if (h > 1) { x /= h; y /= h; }
    return { x, y };
  }

  function readPad() {
    const list = padSource() || [];
    const pad = list[padIndex];
    if (!pad || pad.connected === false) return null;
    return pad;
  }

  function poll(dt, mode = 'menu') {
    edges = edgesOf();
    const pad = readPad();
    let stickX = 0;
    let stickY = 0;
    let stickActive = false;
    createHeld = false;
    if (pad && pad.mapping === 'standard') {
      stickX = pad.axes?.[0] || 0;
      stickY = pad.axes?.[1] || 0;
      const mag = Math.hypot(stickX, stickY);
      const delta = Math.hypot(stickX - prevStickX, stickY - prevStickY);
      prevStickX = stickX;
      prevStickY = stickY;
      if (mag > 0.25) {
        stickActive = true;
        // A parked stick must not steal the last device from a newer key.
        if (delta > 0.05) markDevice('pad');
      }
      if (mode === 'menu') {
        wish.x = stickX;
        wish.y = -stickY;
      }
      const btn = (i) => !!(pad.buttons?.[i]?.pressed);
      const val = (i) => Number(pad.buttons?.[i]?.value || (btn(i) ? 1 : 0));
      if (btn(0) || btn(1) || btn(2) || btn(3) || btn(9)) markDevice('pad');
      createHeld = btn(8);
      if (btn(9) && !createHeld) edges.pause = true;
      if (btn(0)) edges.confirm = true;
      if (btn(1)) edges.back = true;
      if (btn(2)) edges.flail = true;
      if (btn(3)) edges.ask = true;
      if (btn(12)) edges.up = true;
      if (btn(13)) edges.down = true;
      if (btn(14)) edges.left = true;
      if (btn(15)) edges.right = true;
      rawL = val(6);
      rawR = val(7);
      const ramp = dt / 0.12;
      feetL += Math.max(-ramp, Math.min(ramp, rawL - feetL));
      feetR += Math.max(-ramp, Math.min(ramp, rawR - feetR));
      if (btn(0)) edges.hop = true;
      lookX = pad.axes?.[2] || 0;
      lookY = pad.axes?.[3] || 0;
      if (mag > 0.55) {
        const dir = Math.abs(stickX) > Math.abs(stickY) ? (stickX > 0 ? 'right' : 'left') : (stickY > 0 ? 'down' : 'up');
        if (stickMenu !== dir) {
          edges[dir] = true;
          stickMenu = dir;
        }
      } else if (mag < 0.3) stickMenu = 0;
      if (rumble && pad.vibrationActuator && edges.flail) {
        try { pad.vibrationActuator.playEffect('dual-rumble', { duration: 80, strongMagnitude: 0.4, weakMagnitude: 0.6 }); } catch { /* ignore */ }
      }
    } else {
      prevStickX = 0;
      prevStickY = 0;
      rawL = keys.has('KeyQ') || (pointer.buttons & 1) ? 1 : 0;
      rawR = keys.has('KeyE') || (pointer.buttons & 2) ? 1 : 0;
    }

    const pressed = (c) => latched.has(c) || keys.has(c);
    if (pressed('Enter') || pressed('Space')) edges.confirm = true;
    if (pressed('Escape') || pressed('Backspace')) {
      edges.back = true;
      if (pressed('Escape')) edges.pause = true;
    }
    if (pressed('KeyF') || latched.has('MouseMiddle')) edges.flail = true;
    const both = (pointer.buttons & 1) && (pointer.buttons & 2);
    if (pressed('Space') || (both && !bothMouse)) edges.hop = true;
    bothMouse = both;
    if (pressed('KeyT')) edges.ask = true;
    if (pressed('KeyC')) edges.recenter = true;
    if (latched.has('KeyA')) edges.plateA = true;
    if (latched.has('KeyD')) edges.plateD = true;
    if (pressed('ArrowUp') || pressed('KeyW')) edges.up = true;
    if (pressed('ArrowDown') || pressed('KeyS')) edges.down = true;
    if (pressed('ArrowLeft') || pressed('KeyA')) edges.left = true;
    if (pressed('ArrowRight') || pressed('KeyD')) edges.right = true;
    if (latched.has('MouseLeft')) edges.confirm = true;
    if (latched.has('MouseRight') && mode === 'menu') edges.back = true;

    if (mode === 'menu') {
      const stickUp = stickMenu === 'up';
      const stickDown = stickMenu === 'down';
      const stickLeft = stickMenu === 'left';
      const stickRight = stickMenu === 'right';
      edges.up = latched.has('ArrowUp') || latched.has('KeyW') || stickUp;
      edges.down = latched.has('ArrowDown') || latched.has('KeyS') || stickDown;
      edges.left = latched.has('ArrowLeft') || latched.has('KeyA') || stickLeft;
      edges.right = latched.has('ArrowRight') || latched.has('KeyD') || stickRight;
      edges.confirm = latched.has('Enter') || latched.has('Space') || latched.has('MouseLeft');
      edges.back = latched.has('Escape') || latched.has('Backspace') || latched.has('MouseRight');
    }

    // Pad confirm is level-triggered above. Latch it so a held Cross confirms once.
    if (pad && pad.buttons?.[0]?.pressed) {
      if (!latched.has('__padCross')) {
        edges.confirm = true;
        latched.add('__padCross');
      } else if (mode === 'menu') edges.confirm = false;
    } else latched.delete('__padCross');
    if (pad && pad.buttons?.[1]?.pressed) {
      if (!latched.has('__padCircle')) { edges.back = true; latched.add('__padCircle'); }
      else if (mode === 'menu') edges.back = false;
    } else latched.delete('__padCircle');
    if (pad && pad.buttons?.[2]?.pressed) {
      if (!latched.has('__padSquare')) { edges.flail = true; latched.add('__padSquare'); }
      else edges.flail = false;
    } else latched.delete('__padSquare');
    if (pad && pad.buttons?.[9]?.pressed && !createHeld) {
      if (!latched.has('__padOpt')) { edges.pause = true; latched.add('__padOpt'); }
      else edges.pause = false;
    } else latched.delete('__padOpt');
    if (pad && pad.buttons?.[3]?.pressed) {
      if (!latched.has('__padTri')) { edges.ask = true; latched.add('__padTri'); }
      else edges.ask = false;
    } else latched.delete('__padTri');
    if (pad && pad.buttons?.[0]?.pressed) {
      if (!latched.has('__padHop')) { edges.hop = true; latched.add('__padHop'); }
      else if (mode !== 'move') edges.hop = false;
    } else latched.delete('__padHop');
    const dpad = [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']];
    for (const [idx, name] of dpad) {
      const mark = `__dpad${idx}`;
      if (pad && pad.buttons?.[idx]?.pressed) {
        if (!latched.has(mark)) {
          edges[name] = true;
          latched.add(mark);
        } else if (mode === 'menu') edges[name] = false;
      } else latched.delete(mark);
    }

    const source = weightSource(stickActive);
    if (mode === 'balance' || mode === 'move' || mode === 'air') {
      if (source === 'key' && mode === 'balance') {
        const v = keyVector();
        wish.x += v.x * 1.6 * dt;
        wish.y += v.y * 1.6 * dt;
      } else if (source === 'key') {
        const v = keyVector();
        wish.x = v.x;
        wish.y = v.y;
      } else if (source === 'mouse') {
        wish.x = pointer.x;
        wish.y = pointer.y;
      } else if (source === 'pad') {
        wish.x = stickX;
        wish.y = -stickY;
      }
      if (edges.recenter || latched.has('KeyC')) { wish.x = 0; wish.y = 0; }
      const h = Math.hypot(wish.x, wish.y);
      if (h > 1) { wish.x /= h; wish.y /= h; }
    }

    if (!pad || pad.mapping !== 'standard') {
      const ramp = dt / 0.12;
      feetL += Math.max(-ramp, Math.min(ramp, rawL - feetL));
      feetR += Math.max(-ramp, Math.min(ramp, rawR - feetR));
    }

    breatheHeld = keys.has('ShiftLeft') || keys.has('ShiftRight') || !!(pad && pad.buttons?.[5]?.pressed);
    latched.clear();
    // Keep pad latches that are not real keys. They live in `keys`? I cleared all latches including pad ones.
    // Pad latches were stored in `latched` and just got cleared. Re-add the held pad markers.
    if (pad && pad.buttons?.[0]?.pressed) latched.add('__padCross');
    if (pad && pad.buttons?.[0]?.pressed) latched.add('__padHop');
    if (pad && pad.buttons?.[1]?.pressed) latched.add('__padCircle');
    if (pad && pad.buttons?.[2]?.pressed) latched.add('__padSquare');
    if (pad && pad.buttons?.[3]?.pressed) latched.add('__padTri');
    if (pad && pad.buttons?.[9]?.pressed) latched.add('__padOpt');
    if (pad && pad.buttons?.[12]?.pressed) latched.add('__dpad12');
    if (pad && pad.buttons?.[13]?.pressed) latched.add('__dpad13');
    if (pad && pad.buttons?.[14]?.pressed) latched.add('__dpad14');
    if (pad && pad.buttons?.[15]?.pressed) latched.add('__dpad15');

    return {
      edges,
      wish: { x: wish.x, y: wish.y },
      feetL, feetR, breathe: breatheHeld,
      lookX, lookY, zoom,
      device: lastDevice,
      pointer: lastPointer,
      createHeld,
      padConnected: !!(pad && pad.connected !== false && pad.mapping === 'standard'),
      source,
    };
  }

  function weightSource(stickActive) {
    if (lastDevice === 'pad') return 'pad';
    if (weightKeyDown()) return 'key';
    if (pointer.moved && lastPointer) return 'mouse';
    if (stickActive) return 'pad';
    return lastDevice === 'mouse' ? 'mouse' : 'key';
  }

  function worldWish(yaw = 0) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return {
      x: wish.x * c + wish.y * s,
      z: wish.x * s - wish.y * c,
    };
  }

  function snapshot(yaw = 0) {
    const w = worldWish(yaw);
    return {
      wishX: w.x,
      wishZ: w.z,
      screenX: wish.x,
      screenY: wish.y,
      feetL: rawL,
      feetR: rawR,
      feetSmoothL: feetL,
      feetSmoothR: feetR,
      hop: edges.hop,
      flail: edges.flail,
      breathe: breatheHeld,
      use: edges.confirm,
      ask: edges.ask,
      device: lastDevice,
      plateA: edges.plateA,
      plateD: edges.plateD,
    };
  }

  return {
    keyDown, keyUp, pointerMove, pointerButtons,
    poll, snapshot, worldWish,
    setPadSource(fn) { padSource = fn; },
    setPadIndex(i) { padIndex = i; },
    setView(w, h) { view.w = w; view.h = h; },
    setRumble(on) { rumble = !!on; },
    get edges() { return edges; },
    get lastDevice() { return lastDevice; },
    get wish() { return wish; },
    setDevice(kind) { lastDevice = kind; },
    takeTravel() { const t = travel; travel = 0; return t; },
    consume() { const e = edges; edges = edgesOf(); return e; },
  };
}

/** Rotate a screen wish (x right, y up) into the world. */
export function screenWishToWorld(x, y, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + y * s, z: x * s - y * c };
}
