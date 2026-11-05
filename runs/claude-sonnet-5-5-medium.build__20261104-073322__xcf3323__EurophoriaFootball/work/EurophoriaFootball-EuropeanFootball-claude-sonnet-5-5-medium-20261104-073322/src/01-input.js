/* ============ 01-input: human controllers, mouse aim, the europhoria chord, touch-only detection ============ */
EF.HumanController = class HumanController {
  constructor(input, idx = 0) { this.input = input; this.idx = idx; this.lp = [0, 0]; this.mt = -99; this.swT = -9; this.skT = -9; this.chord = 0; this.mouseOn = false; }
  stick() { const m = this.input.move(); const d = game.view.screenDirToGround(m[0], m[1]); return d; }
  anyFace() { const I = this.input; return I.pressed('pass') || I.pressed('shoot') || I.pressed('lob') || I.pressed('through'); }
  read(f, M) {
    const I = this.input, it = EF.Intent(), now = M ? M.t : 0, B = (a) => ({ down: I.down(a), pressed: I.pressed(a), released: I.released(a), held: 0 });
    const m = I.move(), d = game.view.screenDirToGround(m[0], m[1]); it.move = [d[0], d[1]];
    it.sprint = I.down('sprint');
    for (const a of ['pass', 'shoot', 'lob', 'through', 'skill', 'dive']) it[a] = B(a);
    it.sw = B('switch');
    // mouse aim: on while the pointer moves, off after 3 s or when the stick is used
    let p = null; try { p = I.pointer && I.pointer(); } catch (e) { p = null; }
    if (p && (p[0] !== this.lp[0] || p[1] !== this.lp[1])) { this.lp = [p[0], p[1]]; if (I.lastDevice === 'mouse') this.mt = performance.now(); }
    if (Math.hypot(m[0], m[1]) > .3) this.mt = -99;
    this.mouseOn = performance.now() - this.mt < 3000 && I.lastDevice !== 'gamepad';
    if (this.mouseOn && this.idx === 0) { const g = game.mouseGround(); if (g) { it.aimPoint = { x: g[0], y: g[1] }; } }
    // the europhoria chord: L1 + R1 (switch + skill) within 120 ms, or the key
    if (I.pressed('switch')) this.swT = now; if (I.pressed('skill')) this.skT = now;
    if (I.pressed('euphoria') || ((I.pressed('switch') || I.pressed('skill')) && I.down('switch') && I.down('skill') && Math.abs(this.swT - this.skT) < .12)) { it.euphoria = true; if (!I.pressed('euphoria')) { it.skill.pressed = false; it.sw.pressed = false; } }
    return it;
  }
};
/** a controller that replays a script: for tests and the attract mode (cheats freely) */
EF.ScriptController = class { constructor(fn) { this.fn = fn; } read(f, M) { return this.fn(f, M) || EF.Intent(); } stick() { return [0, 0]; } anyFace() { return false; } };
EF.touchOnly = () => {
  if (EF.query.touchonly === '1') return true; if (EF.touchCleared) return false;
  try { const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches; const pads = (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []); return coarse && !fine && !pads.length; } catch (e) { return false; }
};
if (typeof addEventListener === 'function') { addEventListener('keydown', () => { EF.touchCleared = true; }); addEventListener('gamepadconnected', () => { EF.touchCleared = true; }); }
