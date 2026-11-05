// Input: the mash meter, intents (what a pilot asks its athlete to do each step), the human pilot with fresh presses
// and mash assist, the autoplayer (bot intents through the real input path), idle detection, touch-only devices and
// the hub's Create + Options guard.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, { clamp } = E;

// ---------------------------------------------------------------------------------------------------------------
// Mash: alternations per second (a press of the other button than the last one); same-button presses count .25
// ---------------------------------------------------------------------------------------------------------------
class Mash {
  constructor() { this.reset(); }
  reset() { this.rate = 0; this.smooth = 0; this.last = null; this.same = 0; this.acc = 0; this.count = 0; this.n = 0; this.flip = 0; }
  update(dt, L, R, assist, held) {
    let n = 0;
    if (assist === 'hold' && held) { this.acc += dt * O.G.mashHoldRate * O.G.mashRateMax; while (this.acc >= 1) { this.acc -= 1; n += 1; this.flip ^= 1; } this.same = 0; }
    else {
      for (const p of [L && 'L', R && 'R']) {
        if (!p) continue;
        if (assist === 'one' || this.last === null || p !== this.last) { n += 1; this.same = 0; this.last = assist === 'one' ? (this.last === 'L' ? 'R' : 'L') : p; this.flip ^= 1; }
        else { n += .25; this.same++; }
      }
    }
    this.n = n; this.count += n;
    const tau = .5; if (dt > 0) this.rate = this.rate * Math.exp(-dt / tau) + n / tau;
    this.smooth += (this.rate - this.smooth) * Math.min(1, dt * 7);
  }
  power() { const G = O.G; return Math.pow(clamp((this.smooth - G.mashRateMin) / (G.mashRateMax - G.mashRateMin), 0, 1), G.mashCurve); }
}
O.Mash = Mash;

// ---------------------------------------------------------------------------------------------------------------
// Intents. { L, R, A, T, X, U, D, Lf, Rt: pressed this step; Lh, Rh, Ad, Xd: held (fresh: pressed inside the phase);
// Au, Xu: released; mv: [x, y] the stick; aim: [x, y] screen pointer or null; click: pointer pressed }
// ---------------------------------------------------------------------------------------------------------------
O.blankIntent = () => ({ L: false, R: false, A: false, T: false, X: false, U: false, D: false, Lf: false, Rt: false, Lh: false, Rh: false, Ad: false, Xd: false, Au: false, Xu: false, mv: [0, 0], aim: null });
const HELD = { mashL: 'Lh', mashR: 'Rh', action: 'Ad', alt: 'Xd' };
O.freshState = () => ({ mashL: false, mashR: false, action: false, alt: false });
O.humanIntent = (inp, fresh) => {
  const I = O.blankIntent();
  I.L = inp.pressed('mashL'); I.R = inp.pressed('mashR'); I.A = inp.pressed('action'); I.T = inp.pressed('turbo'); I.X = inp.pressed('alt');
  I.U = inp.pressed('up'); I.D = inp.pressed('down'); I.Lf = inp.pressed('left'); I.Rt = inp.pressed('right');
  for (const a in HELD) {
    const was = fresh[a]; if (inp.pressed(a)) fresh[a] = true;
    const down = inp.down(a) || inp.pressed(a);
    I[HELD[a]] = fresh[a] && down;
    if (a === 'action') I.Au = inp.released(a) && was;
    if (a === 'alt') I.Xu = inp.released(a) && was;
    if (!down) fresh[a] = false;
  }
  const m = inp.move(); I.mv = [m[0], m[1]];
  const p = inp.pointer && inp.pointer(); I.aim = p && inp.lastDevice === 'mouse' ? p : null;
  return I;
};
// a bot's mash: presses alternate at hz (with the athlete's own phase), returns { L, R }
O.botMash = (st, hz, dt) => {
  st.mp = (st.mp || 0) + hz * dt; const out = { L: false, R: false };
  if (st.mp >= 1) { st.mp -= 1; st.ml = !st.ml; if (st.ml) out.L = true; else out.R = true; }
  return out;
};

// ---------------------------------------------------------------------------------------------------------------
// The autoplayer: drives a human athlete through its real input (taps and holds) from the event's bot intents
// ---------------------------------------------------------------------------------------------------------------
O.AutoPlayer = {
  feed(inp, I, held) {
    if (I.L && !I.Lh) inp.tap('mashL'); if (I.R && !I.Rh) inp.tap('mashR'); if (I.A && !I.Ad && !held.action) inp.tap('action'); if (I.T) inp.tap('turbo'); if (I.X && !I.Xd && !held.alt) inp.tap('alt');
    if (I.U) inp.tap('up'); if (I.D) inp.tap('down'); if (I.Lf) inp.tap('left'); if (I.Rt) inp.tap('right');
    for (const [k, a] of [['Lh', 'mashL'], ['Rh', 'mashR'], ['Ad', 'action'], ['Xd', 'alt']]) { const on = !!I[k]; if (on !== !!held[a]) { inp.hold(a, on); held[a] = on; } }
    const mv = I.mv || [0, 0];
    for (const [a, on] of [['left', mv[0] < -.3], ['right', mv[0] > .3], ['up', mv[1] < -.3], ['down', mv[1] > .3]]) if (on !== !!held[a]) { inp.hold(a, on); held[a] = on; }
  },
  release(inp, held) { for (const a in held) if (held[a]) { inp.hold(a, false); held[a] = false; } }
};

// ---------------------------------------------------------------------------------------------------------------
// Idle: 10 s without input on the title or a main-menu screen starts the attract mode
// ---------------------------------------------------------------------------------------------------------------
O.Idle = {
  t: 0, seen: false,
  reset() { this.t = 0; },
  poke() { this.t = 0; this.seen = true; },
  active() { return game.players.some(p => p.anyPressed() || Math.hypot(...p.move()) > .3 || (p.clicked && p.clicked())); },
  tick(rdt, scene) {
    if (this.active()) { this.t = 0; return; }
    if (game.shell && game.shell.screen) { this.t = 0; return; }
    if (game.paused) return;
    this.t += rdt;
    if (this.t >= 10 && O.Attract && !O.inHub) { this.t = 0; O.Attract.begin(scene); }
  }
};

// ---------------------------------------------------------------------------------------------------------------
// Touch-only devices: no touch controls; "Controller or keyboard required" and a settings button
// ---------------------------------------------------------------------------------------------------------------
O.touchOnly = false;
if (!O.headless) {
  const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  O.touchOnly = mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && (navigator.maxTouchPoints || 0) > 0;
  const unlock = () => { if (O.touchOnly) { O.touchOnly = false; } };
  addEventListener('keydown', e => { O.Idle.poke(); unlock(); O.lastKeyT = performance.now(); if (O.Attract && O.Attract.on && O.Attract.exitOn) O.Attract.exitOn('key'); }, { capture: true });
  addEventListener('gamepadconnected', () => { unlock(); O.Idle.poke(); });
  let lx = null, ly = null;
  addEventListener('pointermove', e => { if (lx === null || Math.hypot(e.clientX - lx, e.clientY - ly) > 4) { if (lx !== null) { O.Idle.poke(); if (O.Attract && O.Attract.on && O.Attract.exitOn && e.pointerType === 'mouse') O.Attract.exitOn('mouse'); } lx = e.clientX; ly = e.clientY; } }, { capture: true });
  addEventListener('pointerdown', e => { O.Idle.poke(); if (O.Attract && O.Attract.on && O.Attract.exitOn) O.Attract.exitOn(e.pointerType === 'touch' ? 'touch' : 'mouse'); }, { capture: true });
  addEventListener('wheel', () => O.Idle.poke(), { capture: true, passive: true });
}

// ---------------------------------------------------------------------------------------------------------------
// Each step, before the engine reads input for its menus: gamepad activity counts as input; in an AI Hub session
// Options is the hub's while Create (button 8) is held
// ---------------------------------------------------------------------------------------------------------------
E.HOOKS.input.push((g) => {
  let pads = []; try { pads = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []; } catch (e) { pads = []; }
  let create = false, active = false;
  for (const p of pads) {
    if (!p || p.connected === false) continue;
    if (p.buttons[8] && p.buttons[8].pressed) create = true;
    if (p.buttons.some(b => b && b.pressed) || p.axes.some(a => Math.abs(a) > .35)) active = true;
  }
  if (active) { O.Idle.poke(); if (O.touchOnly) O.touchOnly = false; if (O.Attract && O.Attract.on && O.Attract.exitOn) O.Attract.exitOn('pad'); }
  if (O.inHub && create) for (const p of g.players) p.suppress('pause');
  if (O.Hub && O.Hub.ended) for (const p of g.players) { p.suppress('pause'); }
  if (O.Attract && O.Attract.on) for (const p of g.players) p.suppress('pause');
});
})();
