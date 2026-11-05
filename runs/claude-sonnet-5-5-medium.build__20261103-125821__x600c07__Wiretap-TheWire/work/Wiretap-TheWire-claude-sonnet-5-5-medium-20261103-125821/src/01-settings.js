// 01-settings: the Game group of settings, and the gamepad axis-inversion wrapper (the ~10% inverted-input issue)
const GAME_SETTINGS = [
  { key: 'padSymbols', group: 'Game', label: 'Button symbols', type: 'select', options: [['playstation', 'PlayStation  ✕ ○ □ △'], ['xbox', 'Xbox  A B X Y']], value: 'playstation', apply: (g, v) => { g.input.glyphs = v; g.players && g.players.forEach(p => { p.glyphs = v; }); } },
  { key: 'stickInvX', group: 'Game', label: 'Invert stick left/right', type: 'toggle', value: false, help: 'Flips the sticks for controllers that report them backwards.' },
  { key: 'stickInvY', group: 'Game', label: 'Invert stick up/down', type: 'toggle', value: false, help: 'Flips the sticks for controllers that report them backwards.' },
  { key: 'difficulty', group: 'Game', label: 'Case difficulty', type: 'select', options: [['rookie', 'Rookie'], ['detective', 'Detective'], ['murder', 'Murder Police']], value: 'detective' },
  { key: 'runMode', group: 'Game', label: 'Run', type: 'select', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'watchMode', group: 'Game', label: 'Watch', type: 'select', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'textSpeed', group: 'Game', label: 'Text speed', type: 'select', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast'], ['instant', 'Instant']], value: 'normal' },
  { key: 'language', group: 'Game', label: 'Strong language', type: 'select', options: [['uncensored', 'Uncensored'], ['bleeped', 'Bleeped']], value: 'uncensored' },
  { key: 'hints', group: 'Game', label: 'Investigation hints', type: 'toggle', value: true },
  { key: 'cones', group: 'Game', label: 'Show sight cones', type: 'toggle', value: true },
  { key: 'edgePeek', group: 'Game', label: 'Mouse edge peek', type: 'toggle', value: true }
];
const DIFF = { rookie: { susp: .7, mini: 10, brass: .7, tail: 16 }, detective: { susp: 1, mini: 8, brass: 1, tail: 12 }, murder: { susp: 1.35, mini: 6, brass: 1.3, tail: 9 } };
const diff = () => DIFF[(game.settings && game.settings.difficulty) || 'detective'] || DIFF.detective;
// One wrapper flips both sticks for every consumer (gameplay, engine menus, Shell): installed before the first tick.
function installGamepadInversion(game) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const real = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    if (!p) return p;
    const ix = game.settings.stickInvX, iy = game.settings.stickInvY;
    if (!ix && !iy) return p;
    const a = Array.from(p.axes);
    if (ix) { a[0] = -a[0]; if (a.length > 2) a[2] = -a[2]; }
    if (iy) { a[1] = -a[1]; if (a.length > 3) a[3] = -a[3]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes: a, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(real() || []).map(wrap) }); } catch (e) { game.fail('gamepad inversion', e); }
}
