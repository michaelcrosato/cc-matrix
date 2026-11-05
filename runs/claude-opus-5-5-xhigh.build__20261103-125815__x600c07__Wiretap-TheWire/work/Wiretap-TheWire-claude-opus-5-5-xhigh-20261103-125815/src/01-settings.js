/* 01-settings: the game's own settings (beside the engine's Display/Sound/Comfort/Controller ones), difficulty numbers,
   and the gamepad axis-inversion wrapper (the ~10% of pads that report a stick backwards). */
const GAME_SETTINGS = [
  { key: 'glyphs', group: 'Game', label: 'Button symbols', options: [['playstation', 'PlayStation  ✕ ○ □ △'], ['xbox', 'Xbox  A B X Y']], value: 'playstation',
    help: 'The symbols prompts show for a controller', apply: (g, v) => { (g.players || [g.input]).forEach(p => { p.glyphs = v; }); if (typeof Prompts !== 'undefined') Prompts.dirty = true; } },
  { key: 'stickInvX', group: 'Game', label: 'Invert stick left/right', value: false, help: 'Flips the sticks for controllers that report them backwards.' },
  { key: 'stickInvY', group: 'Game', label: 'Invert stick up/down', value: false, help: 'Flips the sticks for controllers that report them backwards.' },
  { key: 'difficulty', group: 'Game', label: 'Case difficulty', options: [['detective', 'Detective'], ['rookie', 'Rookie'], ['murder', 'Murder Police']], value: 'detective',
    help: 'How fast the corner makes you, how long the minimization window is, how fast the Major loses patience' },
  { key: 'runMode', group: 'Game', label: 'Run', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'watchMode', group: 'Game', label: 'Watch (camera)', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'textSpeed', group: 'Game', label: 'Text speed', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast'], ['instant', 'Instant']], value: 'normal' },
  { key: 'voices', group: 'Game', label: 'Voice volume', type: 'slider', value: .8, min: 0, max: 1, step: .05 },
  { key: 'language', group: 'Game', label: 'Strong language', options: [['uncensored', 'Uncensored'], ['bleeped', 'Bleeped']], value: 'uncensored' },
  { key: 'hints', group: 'Game', label: 'Investigation hints', value: true, help: 'Rookie: key wire lines are marked. Lou or Hal hint after two failed tries' },
  { key: 'cones', group: 'Game', label: 'Show sight cones', value: true, help: 'Lookouts near you show what they can see' },
  { key: 'edgePeek', group: 'Game', label: 'Mouse edge peek', value: true, help: 'The camera looks ahead toward the mouse at the screen edge' }
];
const DIFF = {
  get k() { return (game && game.settings && game.settings.difficulty) || 'detective'; },
  get rise() { return { rookie: .7, detective: 1, murder: 1.35 }[this.k]; },
  get window() { return { rookie: 10, detective: 8, murder: 6 }[this.k]; },
  get brass() { return { rookie: .7, detective: 1, murder: 1.3 }[this.k]; },
  get lose() { return { rookie: 16, detective: 12, murder: 9 }[this.k]; }
};
const textCps = () => ({ normal: 45, slow: 28, fast: 80, instant: 2000 }[(game && game.settings.textSpeed) || 'normal']);

/** flip the sticks for every pad and every consumer (gameplay, engine menus, E.Shell, versus) before input reads them */
function installGamepadInversion(g) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const real = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    if (!p) return p; const ix = g.settings.stickInvX, iy = g.settings.stickInvY; if (!ix && !iy) return p;
    const a = Array.from(p.axes);
    if (ix) { a[0] = -a[0]; if (a.length > 2) a[2] = -a[2]; }
    if (iy) { a[1] = -a[1]; if (a.length > 3) a[3] = -a[3]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes: a,
      vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(real() || []).map(wrap) }); }
  catch (e) { g.fail('gamepad inversion', e); }
}
