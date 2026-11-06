import { toolFromStick, WHEEL } from './glyphs.js';

const DEAD = 0.12;

function emptyFrame() {
  return { source: 'stick', x: 0, y: 0, use: 0, tool: null, steady: false, alt: false, syringe: false, special: false, siteDelta: 0, swap: false };
}

export function createInput(game) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, dx: 0, dy: 0, down: false, button: 0, clicked: null, hover: null, moved: 0 };
  let device = 'keyboard';
  let seenPad = false;
  const prevPad = [null, null, null, null];
  let wheelPick = 'gel';

  const codeOf = (e) => (e.code || e.key || '').toString();
  const keyOf = (e) => (e.key || '').toString();

  function markKey(e) {
    device = 'keyboard';
    const names = [codeOf(e), keyOf(e), keyOf(e).toLowerCase()];
    if (e.type === 'keydown') names.forEach((n) => n && keys.add(n));
    else names.forEach((n) => keys.delete(n));
  }

  window.addEventListener('keydown', (e) => {
    markKey(e);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) || e.code === 'Space') e.preventDefault();
    game.onKey?.(e);
  });
  window.addEventListener('keyup', markKey);

  window.addEventListener('pointermove', (e) => {
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved += Math.hypot(dx, dy);
    if (pointer.moved > 4) {
      device = 'mouse';
      pointer.moved = 4;
      game.onPointer?.();
    }
    const item = e.target?.closest?.('[data-item]');
    pointer.hover = item ? item.dataset.item : null;
    if (pointer.hover) game.onHover?.(pointer.hover);
  });
  window.addEventListener('pointerdown', (e) => {
    device = 'mouse';
    pointer.down = true;
    pointer.button = e.button;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    game.audio?.resume?.();
    game.onPointer?.();
  });
  window.addEventListener('pointerup', (e) => {
    pointer.down = false;
    const item = e.target?.closest?.('[data-item]');
    if (item) {
      pointer.clicked = item.dataset.item;
      game.onActivate?.(item.dataset.item);
    }
    const tool = e.target?.closest?.('[data-tool]');
    if (tool) game.onTool?.(tool.dataset.tool);
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => {
    if (game.screen === 'Operation') {
      const dir = e.deltaY > 0 ? 1 : -1;
      const i = WHEEL.indexOf(wheelPick);
      wheelPick = WHEEL[(i + dir + WHEEL.length) % WHEEL.length];
      game.onTool?.(wheelPick);
    }
  }, { passive: true });

  function down(...names) {
    return names.some((n) => keys.has(n));
  }

  function readPad(index) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[index];
    if (!pad || pad.mapping !== 'standard') return null;
    const b = (i) => pad.buttons[i] || { pressed: false, value: 0 };
    const axes = pad.axes || [0, 0, 0, 0];
    const active = b(0).pressed || b(1).pressed || b(7).value > 0.1 || Math.hypot(axes[2] || 0, axes[3] || 0) > DEAD || Math.hypot(axes[0] || 0, axes[1] || 0) > DEAD;
    if (active) {
      device = 'pad';
      seenPad = true;
    }
    return { pad, b, axes };
  }

  function frameFromPad(index, settings) {
    const got = readPad(index);
    if (!got) return null;
    const { b, axes } = got;
    const swap = !!settings.swapSticks;
    const aimX = swap ? axes[0] : axes[2];
    const aimY = swap ? axes[1] : axes[3];
    const toolX = swap ? axes[2] : axes[0];
    const toolY = swap ? axes[3] : axes[1];
    const frame = emptyFrame();
    frame.source = 'stick';
    frame.x = aimX || 0;
    frame.y = -(aimY || 0);
    frame.use = Math.max(b(7).value || 0, b(0).pressed ? 1 : 0);
    frame.steady = b(6).pressed || b(6).value > 0.4;
    frame.alt = b(1).pressed;
    frame.syringe = b(2).pressed || b(14).pressed;
    frame.special = b(3).pressed || b(12).pressed;
    frame.swap = b(15).pressed;
    if (b(4).pressed) frame.siteDelta = -1;
    if (b(5).pressed) frame.siteDelta = 1;
    const picked = toolFromStick(toolX || 0, -(toolY || 0), wheelPick);
    if (Math.hypot(toolX || 0, toolY || 0) > 0.6) {
      wheelPick = picked;
      frame.tool = picked;
    }
    const prev = prevPad[index] || {};
    const up = b(12).pressed || (axes[1] || 0) < -0.55;
    const down = b(13).pressed || (axes[1] || 0) > 0.55;
    const edges = {
      confirm: b(0).pressed && !prev.confirm,
      back: b(1).pressed && !prev.back,
      pause: b(9).pressed && !prev.pause && !b(8).pressed,
      special: b(3).pressed && !prev.special,
      pageLeft: b(4).pressed && !prev.l1,
      pageRight: b(5).pressed && !prev.r1,
      up: up && !prev.up,
      down: down && !prev.down,
      create: b(8).pressed,
      more: (b(3).pressed && !prev.special),
    };
    prevPad[index] = {
      confirm: b(0).pressed, back: b(1).pressed, pause: b(9).pressed, special: b(3).pressed,
      l1: b(4).pressed, r1: b(5).pressed, up, down,
    };
    if (settings.rumble && got.pad.vibrationActuator && b(7).value > 0.8) {
      try { got.pad.vibrationActuator.playEffect('dual-rumble', { duration: 40, strongMagnitude: 0.2, weakMagnitude: 0.3 }); } catch { /* actuator missing */ }
    }
    return { frame, edges };
  }

  function keyboardFrame(settings) {
    const frame = emptyFrame();
    const mouseAim = device === 'mouse' && game.view?.pointerToField;
    if (mouseAim && game.screen === 'Operation') {
      const p = game.view.pointerToField(pointer.x, pointer.y);
      frame.source = 'abs';
      frame.x = p.x;
      frame.y = p.y;
      frame.use = pointer.down && pointer.button === 0 ? 1 : 0;
      frame.alt = pointer.button === 2 && pointer.down;
    } else {
      let x = 0;
      let y = 0;
      if (down('KeyA', 'a', 'ArrowLeft')) x -= 1;
      if (down('KeyD', 'd', 'ArrowRight')) x += 1;
      if (down('KeyW', 'w', 'ArrowUp')) y += 1;
      if (down('KeyS', 's', 'ArrowDown')) y -= 1;
      frame.source = 'stick';
      frame.x = x;
      frame.y = y;
      frame.use = down('KeyJ', 'j', 'Enter') ? 1 : 0;
    }
    frame.steady = down('ShiftLeft', 'ShiftRight', 'Shift');
    frame.syringe = down('KeyF', 'f');
    frame.special = down('Space', ' ');
    frame.swap = down('KeyR', 'r');
    if (down('KeyQ', 'q')) frame.siteDelta = -1;
    if (down('KeyE', 'e')) frame.siteDelta = 1;
    for (let i = 0; i < 8; i++) {
      if (down(`Digit${i + 1}`, String(i + 1))) {
        wheelPick = WHEEL[i];
        frame.tool = WHEEL[i];
      }
    }
    if (down('KeyC', 'c')) {
      frame.source = 'abs';
      frame.x = -1.05;
      frame.y = 0.62;
    }
    void settings;
    return frame;
  }

  function menuEdges() {
    return {
      up: down('ArrowUp', 'KeyW', 'w'),
      down: down('ArrowDown', 'KeyS', 's'),
      left: down('ArrowLeft', 'KeyA', 'a'),
      right: down('ArrowRight', 'KeyD', 'd'),
      confirm: down('Enter', 'Space', ' '),
      back: down('Escape', 'Backspace'),
      skip: down('Tab'),
      pageLeft: down('KeyQ', 'q'),
      pageRight: down('KeyE', 'e'),
    };
  }

  let menuLatch = {};
  function risingMenu() {
    const now = menuEdges();
    const edge = {};
    for (const k of Object.keys(now)) edge[k] = now[k] && !menuLatch[k];
    menuLatch = now;
    return edge;
  }

  function poll() {
    const settings = game.settings || {};
    const seats = [];
    const pad0 = frameFromPad(0, settings);
    for (let i = 0; i < 4; i++) {
      const got = i === 0 ? pad0 : frameFromPad(i, settings);
      if (got && (i > 0 || device === 'pad')) seats.push({ index: i, ...got });
    }
    if (device !== 'pad') {
      const frame = keyboardFrame(settings);
      if (seats[0]?.index === 0 && device === 'pad') {
        /* pad owns seat 0 */
      } else {
        seats.unshift({ index: 0, frame, edges: {} });
      }
    }
    const set = device === 'pad' ? (settings.glyphs === 'xbox' ? 'xbox' : 'playstation') : (device === 'mouse' ? 'mouse' : 'keyboard');
    document.documentElement.dataset.promptSet = set;
    const held = menuEdges();
    return { device, promptSet: set, seenPad, seats, menu: risingMenu(), held, hover: pointer.hover, clicked: pointer.clicked };
  }

  function takeClick() {
    const id = pointer.clicked;
    pointer.clicked = null;
    return id;
  }

  return {
    poll, takeClick, WHEEL,
    get device() { return device; },
    get seenPad() { return seenPad; },
    get promptSet() {
      return device === 'pad' ? ((game.settings?.glyphs === 'xbox') ? 'xbox' : 'playstation') : (device === 'mouse' ? 'mouse' : 'keyboard');
    },
    notePad() { seenPad = true; device = 'pad'; },
  };
}
