// SNIPEOUT HD: input. The game's preset (controller first: a DualSense in the standard mapping; the keys PC racers
// expect), the mapping from a player's input to ShipControls (analog stick and triggers, ramped keys, double-tap
// side-shift, the steer flick for a barrel roll), and the virtual pad the bots, autopilot and attract drive through.
(() => {
const E = My3D2dge, SN = globalThis.SN;
// the order matters: on a shared keyboard (versus) each half takes the actions in turn (F G H R T Y V B / . / , L ; ' K M)
SN.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  thrust: ['KeyW', 'Pad0'], fire: ['Space', 'Mouse0', 'Pad2'], absorb: ['ShiftLeft', 'Mouse2', 'Pad1'],
  brakeL: ['KeyQ', 'Pad6'], brakeR: ['KeyE', 'Pad7'], camera: ['KeyC', 'Pad3'], shiftL: ['KeyZ', 'Pad4'], shiftR: ['KeyX', 'Pad5'],
  brake: ['KeyS'], lookBack: ['KeyB', 'Pad11'],
  // menus: tabs and pages (L1 / R1, Q / E); more (△ / Tab)
  tabL: ['KeyQ', 'PageUp', 'Pad4'], tabR: ['KeyE', 'PageDown', 'Pad5'], more: ['Tab', 'KeyM', 'Pad3']
};
SN.CONTROL_NAMES = { thrust: 'Thrust', fire: 'Fire weapon', absorb: 'Absorb weapon', brakeL: 'Airbrake left', brakeR: 'Airbrake right', brake: 'Both airbrakes',
  shiftL: 'Side-shift / roll left', shiftR: 'Side-shift / roll right', camera: 'Camera', lookBack: 'Look back', tabL: 'Previous tab', tabR: 'Next tab', more: 'More / skip' };

/** virtual pads, one per player: bots, autopilot and the attract mode write analog values here */
SN.vpad = [0, 1, 2, 3].map(() => ({ on: false, steer: 0, pitch: 0, thrust: 0, brakeL: 0, brakeR: 0, fire: false, absorb: false, shiftL: false, shiftR: false }));

/** the mouse wheel (menus page with it): notches since the last read */
SN.wheel = { acc: 0, take() { const a = this.acc; this.acc = 0; return a; } };
if (SN.browser) addEventListener('wheel', e => { SN.wheel.acc += Math.sign(e.deltaY); }, { passive: true });

const isAxis = c => c.startsWith('PadAxis');
/** an action's codes held now that are not the stick's and not shared with another action (W is thrust, not pitch) */
function heldOnly(I, a, not) {
  const m = I.map[a]; if (!m) return false;
  const skip = new Set(); for (const b of not) for (const c of (I.map[b] || [])) skip.add(c);
  for (const c of m) if (!isAxis(c) && !skip.has(c) && !c.startsWith('Act:') && I.held.has(c)) return true;
  return I.held.has('Act:' + a);
}

/** a player's controls as the ship reads them, one per step: new SN.Controls(input, i) then read(dt) */
class Controls {
  constructor(input, i = 0) { this.I = input; this.i = i; this.ks = 0; this.tapT = { brakeL: -9, brakeR: -9 }; this.t = 0; this.fl = { side: 0, t: -9 }; this.out = SN.Controls.blank(); }
  static blank() { return { steer: 0, pitch: 0, thrust: 0, brakeL: 0, brakeR: 0, fire: false, firePressed: false, fireReleased: false, absorb: false, shiftL: false, shiftR: false, flick: 0, camera: false, lookBack: false }; }
  read(dt) {
    const I = this.I, o = this.out, vp = SN.vpad[this.i]; this.t += dt;
    const pm = I.padMove || [0, 0];
    // steer: the stick straight through; keys ramp at 6/s toward full lock so they feel analog
    const kl = heldOnly(I, 'left', []), kr = heldOnly(I, 'right', []), kt = (kr ? 1 : 0) - (kl ? 1 : 0);
    if (kt) this.ks = E.approach(this.ks, kt, 6 * dt * (Math.sign(this.ks) !== kt && this.ks ? 2 : 1)); else this.ks = E.approach(this.ks, 0, 10 * dt);
    let steer = Math.abs(pm[0]) > 0 ? pm[0] : this.ks;
    // pitch: stick up = nose down; keys: the up / down codes that are not thrust or brake (the arrows, the d-pad)
    const pu = heldOnly(I, 'up', ['thrust']), pd = heldOnly(I, 'down', ['brake']);
    let pitch = Math.abs(pm[1]) > 0 ? -pm[1] : (pu ? 1 : 0) - (pd ? 1 : 0);
    let thrust = I.down('thrust') ? 1 : 0;
    const both = I.map.brake && I.down('brake') ? 1 : 0;
    let brakeL = Math.max(I.value('brakeL'), both), brakeR = Math.max(I.value('brakeR'), both);
    let fire = I.down('fire'), firePressed = I.pressed('fire'), fireReleased = I.released('fire');
    let absorb = I.pressed('absorb'), shiftL = I.pressed('shiftL'), shiftR = I.pressed('shiftR');
    // a double tap of an airbrake key is a side-shift that way (keyboard)
    for (const [b, side] of [['brakeL', -1], ['brakeR', 1]]) if (I.pressed(b) && I.lastDevice !== 'gamepad') {
      if (this.t - this.tapT[b] < .25) { if (side < 0) shiftL = true; else shiftR = true; this.tapT[b] = -9; } else this.tapT[b] = this.t;
    }
    if (vp.on) {   // a bot or the attract: its analog values; its edge presses come through input.tap or the vpad's flags
      steer = vp.steer; pitch = vp.pitch; thrust = vp.thrust; brakeL = vp.brakeL; brakeR = vp.brakeR;
      if (vp.fire) { firePressed = firePressed || !this._vf; fire = true; } else if (this._vf) fireReleased = true;
      this._vf = vp.fire; absorb = absorb || vp.absorb; shiftL = shiftL || vp.shiftL; shiftR = shiftR || vp.shiftR;
      vp.absorb = vp.shiftL = vp.shiftR = false;
    }
    steer = E.clamp(steer, -1, 1); pitch = E.clamp(pitch, -1, 1);
    // the flick: full lock one way then the other within .4 s (a barrel roll in the air)
    let flick = 0; const side = steer <= -.7 ? -1 : steer >= .7 ? 1 : 0;
    if (side && side !== this.fl.side) { if (this.fl.side && this.t - this.fl.t < .4) flick = side; this.fl.side = side; this.fl.t = this.t; }
    Object.assign(o, { steer, pitch, thrust, brakeL: E.clamp(brakeL, 0, 1), brakeR: E.clamp(brakeR, 0, 1), fire, firePressed, fireReleased, absorb, shiftL, shiftR, flick,
      camera: I.pressed('camera'), lookBack: I.down('lookBack') });
    return o;
  }
}
SN.Controls = Controls;

/** what a player last touched, for prompts: 'gamepad' | 'keyboard' | 'mouse' | 'touch' */
SN.device = (I = E.current && E.current.input) => I ? I.lastDevice : 'keyboard';
/** is this a touch-only device? (no fine pointer, touch points, no pad, no key yet) */
SN.touchOnly = () => {
  if (!SN.browser) return !!SN._fakeTouchOnly;
  if (SN._sawKey || SN._sawPad) return false;
  try { const fine = matchMedia('(any-pointer: fine)').matches; const pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(Boolean) : []; return !fine && navigator.maxTouchPoints > 0 && !pads.length; } catch (e) { return false; }
};
if (SN.browser) { addEventListener('keydown', () => { SN._sawKey = true; }, true); addEventListener('gamepadconnected', () => { SN._sawPad = true; }); }
})();
