/* INPUT (section 2): the HumanController turns one player's device into an Intent for the footballer he holds: the
 * stick (screen direction turned to the ground), the buttons, the Europhoria chord (switch + skill within 120 ms),
 * mouse aim (a reticle on the pitch; clicks pass, shoot, lob, switch). Also touch-only detection (section 6.33). */
const ACT_KEYS = ['pass', 'shoot', 'lob', 'through', 'skill', 'switch', 'dive'];
class HumanController {
  constructor(m, slot) { this.m = m; this.slot = slot; this.raw = null; this.lastT = -1; this.pend = null; this.mouseT = -9; this.lastPtr = null; this.mouse = false; this.held = {}; }
  get input() { return this.slot.input; }
  /** the device read once a step: { move, aim, aimPoint, sprint, buttons..., euphoria, target } */
  read() {
    const m = this.m; if (this.lastT === m.t && this.raw) return this.raw;
    this.lastT = m.t;
    const I = this.input, it = EF.Intent.make();
    if (!I || EF.blockInput) { this.raw = it; return it; }
    const mv = I.move(), k = Math.min(1, Math.hypot(mv[0], mv[1]));
    if (k > .05) { const d = game.view.screenDirToGround(mv[0], mv[1]); it.move = [d[0] * k, d[1] * k]; }
    it.sprint = I.down('sprint');
    const B = a => ({ down: I.down(a), pressed: I.pressed(a), released: I.released(a) });
    it.pass = B('pass'); it.shoot = B('shoot'); it.lob = B('lob'); it.through = B('through'); it.skill = B('skill'); it.sw = B('switch'); it.dive = B('dive');
    it.euphoria = I.pressed('euphoria');
    // the chord: switch and skill within 120 ms make Europhoria; alone, each waits that long, then acts
    const now = game.real || m.t;
    if (it.sw.pressed || it.skill.pressed) {
      const which = it.sw.pressed ? 'sw' : 'skill', other = which === 'sw' ? 'skill' : 'sw';
      if ((it.sw.pressed && it.skill.pressed) || (this.pend && this.pend.a === other && now - this.pend.t < .12)) { it.euphoria = true; this.pend = null; it.sw.pressed = it.skill.pressed = false; }
      else { this.pend = { a: which, t: now }; it[which].pressed = false; }
    }
    if (this.pend && now - this.pend.t >= .12) { it[this.pend.a].pressed = true; this.pend = null; }
    // mouse aim: on while the mouse moves over the canvas in play; off after 3 s still, or when a stick is used
    const ptr = I.pointer && I.pointer();
    if (ptr && (!this.lastPtr || Math.abs(ptr[0] - this.lastPtr[0]) + Math.abs(ptr[1] - this.lastPtr[1]) > 1)) { this.mouseT = now; this.mouse = true; }
    this.lastPtr = ptr ? ptr.slice() : null;
    if (this.mouse && (now - this.mouseT > 3 || I.lastDevice === 'gamepad')) this.mouse = false;
    if (this.mouse && this.slot.n === 0) {
      const g = game.mouseGround && game.mouseGround();
      if (g) {
        it.aimPoint = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y };
        const f = this.slot.fb;
        if (f) { const d = H.norm(it.aimPoint.x - f.body.x, it.aimPoint.y - f.body.y); it.aim = d; }
        // a click on a teammate: pass to him (with the ball) or switch to him (without)
        const mp = I.pressed('mpass'), ms = I.down('mshoot'), mr = I.released('mshoot'), ml = I.pressed('mlob');
        if (mp || ml) {
          const mate = m.side[this.slot.side].filter(q => q !== f && !q.sentOff).sort((a, b) => H.d(a.body, it.aimPoint) - H.d(b.body, it.aimPoint))[0];
          if (mate && H.d(mate.body, it.aimPoint) < 22) it.target = mate;
          if (mp) it.pass.pressed = true; if (ml) it.lob.pressed = true;
          if (mp && f && !f.hasBall() && it.target) { m.giveTo(this.slot, it.target); it.pass.pressed = false; }
        }
        if (ms) it.shoot.down = true; if (mr) it.shoot.released = true;
        if (I.pressed('mshoot')) it.shoot.pressed = true;
      }
    }
    // celebration picks and the Save Duel use the face buttons: kept as they are
    this.raw = it; return it;
  }
  /** what a set piece, a keeper's distribution, the Save Duel or a celebration reads: presses this step */
  peek() { const r = this.read(); return { move: r.move, pass: r.pass.pressed, shoot: r.shoot.pressed, lob: r.lob.pressed, through: r.through.pressed, skill: r.skill.pressed, sw: r.sw.pressed, dive: r.dive.pressed, shootDown: r.shoot.down, cel: -1, aimPoint: r.aimPoint }; }
  intent(f, dt) {
    const it = this.read(), m = this.m;
    if (m.lastKick && m.lastKick.human === this.slot && m.lastKick.curlT > 0) m.lastKick.aftertouch(it.move, dt);
    if (f !== this.slot.fb) return m.brains[f.side].intent(f, dt);
    return it;
  }
}
EF.HumanController = HumanController;

/* ---- touch-only devices: no touch controls; a notice and the settings button (section 6.33) ---- */
EF.touchState = { forced: EF.link.touchonly, cleared: false };
EF.touchOnly = () => {
  const T = EF.touchState; if (T.cleared) return false; if (T.forced) return true;
  try {
    const coarse = matchMedia('(any-pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
    return coarse && !fine && !pads;
  } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { EF.touchState.cleared = true; EF.touchState.forced = false; }, { capture: true });
  addEventListener('gamepadconnected', () => { EF.touchState.cleared = true; EF.touchState.forced = false; });
}
