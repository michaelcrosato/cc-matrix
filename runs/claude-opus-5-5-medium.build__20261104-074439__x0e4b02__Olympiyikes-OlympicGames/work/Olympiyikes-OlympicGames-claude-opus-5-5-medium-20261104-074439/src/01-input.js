/* OLYMPIYIKES! — input: intents, the mash meter, bots' mashing, the autoplayer, idle and touch-only detection, the hub guard. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, G = O.G, clamp = E.clamp;

/* ---- the Mash meter (§5.4): counts alternations; rate = smoothed alternations per second ---- */
class Mash {
  constructor() { this.reset(); }
  reset() { this.rate = 0; this.last = null; this.same = 0; this.ev = []; this.t = 0; this.flip = 0; this.holdAcc = 0; }
  /** a press of side 'L' or 'R'; assist 'one' makes any press the alternation */
  press(side, assist) {
    if (assist === 'one') side = this.last === 'L' ? 'R' : 'L';
    if (side !== this.last) { this.ev.push([this.t, 1]); this.same = 0; } else { this.ev.push([this.t, .25]); this.same++; }
    this.last = side; this.flip = 1;
  }
  update(dt, held, assist) {
    this.t += dt; this.flip = Math.max(0, this.flip - dt * 6);
    if (assist === 'hold' && held) { this.holdAcc += dt * G.mashRateMax * G.mashHoldRate; while (this.holdAcc >= 1) { this.holdAcc--; this.press(this.last === 'L' ? 'R' : 'L'); } }
    while (this.ev.length && this.ev[0][0] < this.t - .5) this.ev.shift();
    let n = 0; for (const e of this.ev) n += e[1];
    const raw = n / .5, k = Math.min(1, dt / (raw > this.rate ? .12 : .25));
    this.rate += (raw - this.rate) * k;
  }
  power() { return Math.pow(clamp((this.rate - G.mashRateMin) / (G.mashRateMax - G.mashRateMin), 0, 1), .75); }
}
O.Mash = Mash;

/** a bot's mash presses at a rate (Hz): fills an intent's L / R */
O.botMash = (a, rate, dt, I) => {
  a._bm = (a._bm || 0) + dt * rate;
  if (a._bm >= 1) { a._bm -= 1; a._bs = !a._bs; if (a._bs) I.L = true; else I.R = true; }
  return I;
};
O.blankIntent = () => ({ L: false, R: false, A: false, T: false, Au: false, Lh: false, Rh: false, Ad: false, X: false, Xp: false, mv: [0, 0], ptr: null, click: null, up: false, down: false, left: false, right: false, Lr: false, Rr: false });

/** a human's intent from one player's input: fresh presses only (held buttons from before the phase never count) */
O.humanIntent = (a, inp) => {
  const I = O.blankIntent(), arm = a._arm || (a._arm = {});
  for (const [act, k] of [['mashL', 'L'], ['mashR', 'R'], ['action', 'A'], ['alt', 'Xp']]) if (inp.pressed(act)) { arm[act] = true; I[k] = true; }
  I.T = inp.pressed('turbo');
  I.Lh = inp.down('mashL') && !!arm.mashL; I.Rh = inp.down('mashR') && !!arm.mashR;
  I.Ad = inp.down('action') && !!arm.action; I.Au = inp.released('action') && !!arm.action;
  I.Lr = inp.released('mashL') && !!arm.mashL; I.Rr = inp.released('mashR') && !!arm.mashR;
  I.X = inp.down('alt') && !!arm.alt;
  const m = inp._autoMv || inp.move(); I.mv = [m[0], m[1]];
  I.up = inp.pressed('up'); I.down = inp.pressed('down'); I.left = inp.pressed('left'); I.right = inp.pressed('right');
  if (inp.lastDevice === 'mouse' || inp.lastDevice === 'keyboard') I.ptr = inp.pointer ? inp.pointer() : null;
  I.mouse = inp.lastDevice === 'mouse';
  I.click = inp.clicked ? inp.clicked() : null;
  return I;
};
O.armReset = a => { a._arm = {}; };

/* ---- the AutoPlayer: drives a human's input from the bot's intent (dev Autopilot, the playthrough test) ---- */
O.AutoPlayer = {
  drive(inp, I) {
    const held = inp._autoHeld || (inp._autoHeld = {});
    const hold = (act, on) => { if (!!held[act] !== !!on) { held[act] = !!on; inp.hold(act, !!on); } };
    if (I.L) inp.tap('mashL'); if (I.R) inp.tap('mashR');
    if (I.A && !I.Ad) inp.tap('action');
    if (I.T) inp.tap('turbo');
    if (I.Xp && !I.X) inp.tap('alt');
    hold('action', I.Ad); hold('mashL', I.Lh); hold('mashR', I.Rh); hold('alt', I.X);
    const mv = I.mv || [0, 0]; inp._autoMv = [mv[0], mv[1]];   // the stick's analog value (keys stand in for the d-pad below)
    hold('left', mv[0] < -.35); hold('right', mv[0] > .35); hold('up', mv[1] < -.35); hold('down', mv[1] > .35);
    if (I.left) inp.tap('left'); if (I.right) inp.tap('right'); if (I.up) inp.tap('up'); if (I.down) inp.tap('down');
  },
  release(inp) { inp._autoMv = null; const held = inp._autoHeld || {}; for (const k in held) if (held[k]) inp.hold(k, false); inp._autoHeld = {}; }
};

/* ---- activity: idle clock for attract, touch-only detection, the hub's Create + Options guard ---- */
O.activity = { last: 0, keySeen: false, padSeen: false };
let lastMouse = null;
E.HOOKS.input.push((g) => {
  let active = false;
  for (const I of g.players || [g.input]) {
    if (I.anyPressed && I.anyPressed()) active = true;
    if (I.held && (I.held.size || I.held.length)) { active = true; if (I.lastDevice === 'keyboard') O.activity.keySeen = true; }
    if (I.lastDevice === 'gamepad' && (I.anyPressed() || Math.hypot(I.padMove[0], I.padMove[1]) > .3)) { active = true; O.activity.padSeen = true; }
    if (I.mouse && I.mouse.t !== undefined) { if (lastMouse !== null && I.mouse.t !== lastMouse) active = true; lastMouse = I.mouse.t; }
    if (I.clicked && I.clicked()) active = true;
  }
  if (active) O.activity.last = g.real;
  // the hub's Create + Options: Options does nothing while Create (pad button 8) is held
  if (O.inHub) { const I = g.input; if (I.padPrev && I.padPrev[8]) { I.suppress('pause'); } }
});
O.idleFor = () => game.real - O.activity.last;

/* touch-only: a coarse pointer, no fine one, touch points, and no key or pad seen this visit */
O.touchOnly = () => {
  if (O.forceTouchOnly !== undefined) return O.forceTouchOnly;
  if (O.activity.keySeen || O.activity.padSeen) return false;
  try {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0;
  } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  try {
    addEventListener('keydown', () => { O.activity.keySeen = true; }, { capture: true });
    addEventListener('gamepadconnected', () => { O.activity.padSeen = true; });
  } catch (e) { /* headless stand-ins */ }
}

/* ---- the idle tracker: 10 s on a menu screen starts the attract mode ---- */
O.Idle = {
  tick(dt, scene) {
    if (O.inHub || (game.shell && game.shell.screen) || game.paused) { O.activity.last = game.real; return; }
    if (O.idleFor() >= 10 && O.Attract && !O.Attract.on) O.Attract.start();
  }
};
})();
