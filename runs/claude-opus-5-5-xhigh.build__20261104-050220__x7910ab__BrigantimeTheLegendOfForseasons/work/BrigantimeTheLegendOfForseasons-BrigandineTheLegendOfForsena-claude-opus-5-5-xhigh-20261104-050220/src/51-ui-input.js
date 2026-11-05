// INPUT: the game's own preset (a DualSense in the standard mapping first; keys PC players expect; the mouse aims and
// clicks), held-button timing (hold □ / Space to end a turn), Shift+Tab, idle tracking for the attract mode, touch-only
// detection, and hot-seat routing (the UI reads the active seat's input, or every input when shared).

G.PRESET = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0', 'Mouse0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'],
  command: ['Space', 'Pad2'], info: ['KeyI', 'Pad3', 'Mouse1'], prev: ['BracketLeft', 'Pad4'], next: ['Tab', 'BracketRight', 'Pad5'],
  zoomOut: ['Minus', 'NumpadSubtract', 'Pad6'], zoomIn: ['Equal', 'NumpadAdd', 'Pad7'], danger: ['KeyT', 'Pad10'], turnL: ['KeyQ'], turnR: ['KeyE', 'Pad11'],
  view: ['KeyV'], pause: ['KeyP', 'Pad9'], start: ['Enter', 'Pad9'], help: ['F1'], create: ['Pad8']
};
G.CONTROL_NAMES = { command: 'Commands', info: 'Info', prev: 'Previous', next: 'Next', zoomOut: 'Zoom out', zoomIn: 'Zoom in', danger: 'Danger view', turnL: 'Turn left', turnR: 'Turn right', view: 'Battle view', help: 'How to Play', create: false };

const IN = G.In = {
  held: {}, holdFired: {}, idle: 0, lastPointer: null, touchOnly: false, sawKey: false, sawPad: false, seatInput: null
};
/** the input the UI reads now: the active seat's (hot-seat with its own pad), else player 1's */
G.inp = () => IN.seatInput || G.game.input;
/** every step: hold timers, idle time, touch-only state */
G.inputTick = (dt) => {
  const game = G.game, inputs = game.players || [game.input];
  let active = false;
  for (const inp of inputs) {
    if (inp.anyPressed && inp.anyPressed()) active = true;
    const m = inp.move ? inp.move() : [0, 0]; if (Math.hypot(m[0], m[1]) > .5) active = true;
  }
  const inp = game.input, p = inp.pointer ? inp.pointer() : null;
  // a mouse that really moves is the device in use: hover focuses menu items and the prompts show mouse buttons (the
  // engine marks the mouse only on a button press)
  // (measured from where it last counted, so a slow glide adds up)
  if (p) { if (!IN.lastPointer) IN.lastPointer = p.slice(); else if (Math.hypot(p[0] - IN.lastPointer[0], p[1] - IN.lastPointer[1]) > 4) { active = true; inp.lastDevice = 'mouse'; IN.lastPointer = p.slice(); } }
  if (inp.clicked && inp.clicked()) active = true;
  if (inp.zoom && inp.zoom() !== 1) active = true;
  if (active) IN.idle = 0; else IN.idle += dt;
  if (inp.lastDevice === 'keyboard' && active) IN.sawKey = true;
  if (inp.lastDevice === 'gamepad') IN.sawPad = true;
  if (IN.touchOnly && (IN.sawKey || IN.sawPad)) IN.touchOnly = false;
  for (const a of ['command', 'confirm', 'cancel']) {
    const i = G.inp(); IN.was = IN.was || {};
    if (i.down(a)) { IN.held[a] = (IN.held[a] || 0) + dt; IN.was[a] = IN.held[a]; } else { if (!i.released(a)) IN.was[a] = 0; IN.held[a] = 0; IN.holdFired[a] = false; }
  }
};
/** was a hold of `a` completed this step (held .6 s)? fires once per hold */
G.holdDone = (a, secs = .6) => { if (IN.held[a] >= secs && !IN.holdFired[a]) { IN.holdFired[a] = true; return true; } return false; };
/** how far through a hold of `a` (0..1) */
G.holdFrac = (a, secs = .6) => Math.min(1, (IN.held[a] || 0) / secs);
/** a tap of `a`: released before the hold completed */
G.tapped = (a, secs = .6) => { const i = G.inp(); return i.released(a) && ((IN.was && IN.was[a]) || 0) < secs; };
/** pressed, with Shift+Tab meaning prev */
G.pressed = (a) => {
  const i = G.inp(), shift = i.held && (i.held.has ? (i.held.has('ShiftLeft') || i.held.has('ShiftRight')) : false);
  if (a === 'prev') return i.pressed('prev') || (shift && i.pressed('next'));
  if (a === 'next') return i.pressed('next') && !shift;
  return i.pressed(a);
};
G.repeat = (a) => G.inp().repeat(a, .25, .08);
/** a touch-only device: a coarse pointer, no fine one, touch points, and no keys or pads seen */
G.detectTouchOnly = () => {
  if (G.forceTouchOnly) return (IN.touchOnly = true);
  try {
    const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(p => p && p.connected) : false;
    IN.touchOnly = !!(mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !pads);
  } catch (e) { IN.touchOnly = false; }
  return IN.touchOnly;
};
/** the device prompts follow ('gamepad' | 'keyboard' | 'mouse') */
G.device = () => { const d = G.inp().lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };
