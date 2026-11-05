// Game settings (PLAN §4.7) and the gamepad axis inversion wrapper (§4.4).
const GAME_ITEMS = [
  { key: 'padSymbols', label: 'Button symbols', type: 'select', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'stickInvX', label: 'Invert stick left / right', type: 'toggle', value: false },
  { key: 'stickInvY', label: 'Invert stick up / down', type: 'toggle', value: false },
  { key: 'difficulty', label: 'Case difficulty', type: 'select', options: ['Detective', 'Rookie', 'Murder Police'], value: 'Detective' },
  { key: 'textSpeed', label: 'Text speed', type: 'select', options: ['Normal', 'Slow', 'Fast', 'Instant'], value: 'Normal' },
  { key: 'hints', label: 'Investigation hints', type: 'toggle', value: true },
  { key: 'cones', label: 'Show sight cones', type: 'toggle', value: true },
];
const TEXT_CPS = { Normal: 45, Slow: 28, Fast: 80, Instant: 999 };

// Install before the first input tick: the sticks come through navigator.getGamepads with the chosen axes flipped.
function installGamepadInversion(game) {
  const real = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
  const wrap = p => {
    if (!p) return p;
    const s = game.settings || {};
    if (!s.stickInvX && !s.stickInvY) return p;
    const a = Array.from(p.axes);
    if (s.stickInvX) { a[0] = -a[0]; if (a.length > 2) a[2] = -a[2]; }
    if (s.stickInvY) { a[1] = -a[1]; if (a.length > 3) a[3] = -a[3]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons,
      axes: a, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(real() || []).map(wrap) });
  } catch (e) { game.fail('gamepad inversion', e); }
}

// Touch-only: a touch screen with no pad and no keyboard seen yet (PLAN §4.8).
function touchOnlyNow() {
  const mq = q => typeof matchMedia === 'function' && matchMedia(q).matches;
  const coarse = mq('(pointer: coarse)') && !mq('(any-pointer: fine)');
  const touchy = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const pad = typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(p => p && p.connected);
  return !!(coarse && touchy && !pad && !TOUCH.keyed);
}
const TOUCH = { keyed: false, padSeen: false };
