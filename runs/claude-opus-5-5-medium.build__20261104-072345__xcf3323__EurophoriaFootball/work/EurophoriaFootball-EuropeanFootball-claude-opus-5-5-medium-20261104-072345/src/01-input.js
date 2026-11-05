/* 01-input: controllers that turn devices into Intents: HumanController (a pad, the keyboard or half of it, with mouse
 * aim), RemoteController (a hub client's input messages), ScriptController (tests, training dummies, the attract mode).
 * Also the Europhoria chord (L1 + R1 / Q + E within 120 ms), the mouse's buttons and touch-only detection. */
const BTN = ['pass', 'shoot', 'lob', 'through', 'skill', 'switch', 'dive'];
// the mouse: its buttons read by our own listeners, so a click never fires a pass from a gamepad session
EF.mouse = { down: [false, false, false], pressed: [false, false, false], released: [false, false, false], moved: -99, x: 0, y: 0, wheel: 0 };
EF.mouseFeed = (type, button = 0) => {
  const M = EF.mouse;
  if (type === 'down') { M.down[button] = true; M.pressed[button] = true; }
  if (type === 'up') { M.down[button] = false; M.released[button] = true; }
  if (type === 'move') M.moved = game.real;
};
EF.mouseEndStep = () => { const M = EF.mouse; M.pressed = [false, false, false]; M.released = [false, false, false]; };
if (!game.headless && typeof addEventListener === 'function') {
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.target && e.target.id === 'screen') EF.mouseFeed('down', e.button); });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse') EF.mouseFeed('up', e.button); });
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) EF.mouseFeed('move'); });
  addEventListener('contextmenu', e => { if (e.target && e.target.id === 'screen') e.preventDefault(); });
  addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
}
const bstate = (I, a) => ({ down: I.down(a), pressed: I.pressed(a), released: I.released(a) });
class HumanController {
  constructor(input) { this.I = input; this.mouseAim = false; this.chordT = { switch: -9, skill: -9 }; this.sprinting = false; this.used = {}; }
  get device() { return this.mouseAim ? 'mouse' : this.I.lastDevice; }
  /** this step's Intent for the footballer the slot holds */
  intent(m, sl) {
    const I = this.I, mv = I.move(), M = EF.mouse;
    const d = hyp(mv[0], mv[1]) > .05 ? game.view.screenDirToGround(mv[0], mv[1]) : [0, 0];
    const l = hyp(d[0], d[1]), ml = Math.min(1, hyp(mv[0], mv[1])), move = l > 1e-6 ? [d[0] / l * ml, d[1] / l * ml] : [0, 0];
    // mouse aim: on while the mouse moves over the canvas (player 1 only), off after 3 s still or when the stick moves
    if (I === game.input) {
      if (game.real - M.moved < .05) this.mouseAim = true;
      if (game.real - M.moved > 3 || (I.lastDevice === 'gamepad' && ml > .3)) this.mouseAim = false;
    }
    const it = { move, aim: null, aimPoint: null, sprint: I.down('sprint'), euphoria: false, target: null };
    for (const a of BTN) it[a === 'switch' ? 'sw' : a] = bstate(I, a);
    if (this.mouseAim) {
      const g = game.mouseGround && game.mouseGround();
      if (g && sl.f) { it.aimPoint = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y }; it.aim = [it.aimPoint.x - sl.f.body.x, it.aimPoint.y - sl.f.body.y]; }
      const mb = k => ({ down: M.down[k], pressed: M.pressed[k], released: M.released[k] });
      const or = (a, b) => ({ down: a.down || b.down, pressed: a.pressed || b.pressed, released: a.released || b.released });
      it.pass = or(it.pass, mb(0)); it.shoot = or(it.shoot, mb(2)); it.lob = or(it.lob, mb(1));
      // a click on a teammate: a pass to him (with the ball) or a switch to him (without)
      if (M.pressed[0] && it.aimPoint) {
        const t = m.side[sl.side].filter(p => !p.sentOff && p !== sl.f && hyp(p.body.x - it.aimPoint.x, p.body.y - it.aimPoint.y) < 14)[0];
        if (t) it.target = t.id;
      }
    }
    // the Europhoria chord: switch + skill within 120 ms, or its own key
    const now = game.real;
    if (I.pressed('switch')) this.chordT.switch = now;
    if (I.pressed('skill')) this.chordT.skill = now;
    const chord = Math.abs(this.chordT.switch - this.chordT.skill) < .12 && (I.pressed('switch') || I.pressed('skill'));
    it.euphoria = I.pressed('euphoria') || chord;
    if (chord) { it.sw = {}; it.skill = {}; }
    this.sprinting = it.sprint;
    for (const a of BTN) if (I.pressed(a)) this.used[a] = (this.used[a] || 0) + 1;
    return it;
  }
  peek(m, sl) { return this.intent(m, sl); }
  duelPressed() { return this.I.pressed('pass') || this.I.pressed('confirm') || EF.mouse.pressed[0]; }
  celebPick() { const I = this.I; return I.pressed('pass') ? 0 : I.pressed('shoot') ? 1 : I.pressed('lob') ? 2 : I.pressed('through') ? 3 : -1; }
}
EF.HumanController = HumanController;
/** a hub client's input: the newest message by sequence; presses from cumulative counters (a lost packet loses none) */
class RemoteController {
  constructor() { this.msg = null; this.last = [0, 0, 0, 0, 0, 0, 0, 0]; this.at = -9; this.pressed = {}; this.sprinting = false; this.duel = false; this.cel = -1; }
  feed(msg, now) {
    if (this.msg && msg.s <= this.msg.s) return;
    this.msg = msg; this.at = now;
    const keys = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive', 'euphoria'];
    (msg.c || []).forEach((c, i) => { if (c > this.last[i]) { this.pressed[keys[i]] = true; this.last[i] = c; } });
  }
  intent(m, sl) {
    const g = this.msg, fresh = g && game.real - this.at < .5;
    const it = { move: [0, 0], aim: null, aimPoint: null, sprint: false, euphoria: false, target: null };
    const held = fresh ? g.h : 0, bits = { sprint: 1, pass: 2, shoot: 4, lob: 8, through: 16, skill: 32, sw: 64, dive: 128 };
    if (fresh) { it.move = [g.m[0] / 100, g.m[1] / 100]; if (g.a) it.aim = [g.a[0] / 100, g.a[1] / 100]; }
    it.sprint = !!(held & 1); this.sprinting = it.sprint;
    for (const k of ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive']) {
      const down = !!(held & bits[k]), pr = !!this.pressed[k], was = !!(this.prevHeld & bits[k]);
      it[k] = { down: down || pr, pressed: pr, released: was && !down };
    }
    it.euphoria = !!this.pressed.euphoria;
    this.prevHeld = held; this.pressed = {};
    return it;
  }
  peek(m, sl) { return this.intent(m, sl); }
  duelPressed() { if (this.duel) { this.duel = false; return true; } return false; }
  celebPick() { const c = this.cel; this.cel = -1; return c; }
}
EF.RemoteController = RemoteController;
/** a scripted controller: fn(m, slot) returns an Intent (tests, training, the attract mode) */
class ScriptController {
  constructor(fn) { this.fn = fn; this.sprinting = false; }
  intent(m, sl) { const it = this.fn(m, sl) || NO_INTENT; this.sprinting = !!it.sprint; return it; }
  peek(m, sl) { return this.fn(m, sl, true) || NO_INTENT; }
  duelPressed(m, sl) { return !!(this.duelFn && this.duelFn(m, sl)); }
  celebPick() { return -1; }
}
EF.ScriptController = ScriptController;

/* ---- touch-only devices: no touch controls; the notice and the settings button ---- */
let touchOnlyNow = null;
EF.touchOnly = () => {
  if (touchOnlyNow !== null) return touchOnlyNow;
  if (LINK.touchonly) return (touchOnlyNow = true);
  try {
    const mm = typeof matchMedia === 'function' ? matchMedia : null;
    const coarse = mm && mm('(any-pointer: coarse)').matches, fine = mm && mm('(any-pointer: fine)').matches;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
    return (touchOnlyNow = !!(coarse && !fine && !pads));
  } catch (e) { return (touchOnlyNow = false); }
};
EF.clearTouchOnly = () => { touchOnlyNow = false; };
if (!game.headless && typeof addEventListener === 'function') {
  addEventListener('keydown', () => { if (touchOnlyNow) touchOnlyNow = false; });
  addEventListener('gamepadconnected', () => { touchOnlyNow = false; });
}
