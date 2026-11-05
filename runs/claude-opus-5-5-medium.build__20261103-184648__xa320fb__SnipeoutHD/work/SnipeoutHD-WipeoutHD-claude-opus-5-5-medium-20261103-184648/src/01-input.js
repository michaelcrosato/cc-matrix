// Input: the game's preset (keyboard native, DualSense standard mapping first), the mapping from a player's input to
// ShipControls (analog stick and triggers, ramped keys, double-tap side-shift, steer flicks for barrel rolls), virtual pads
(() => {
const SN = globalThis.SN;
SN.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  thrust: ['KeyW', 'Pad0'], fire: ['Space', 'Mouse0', 'Pad2'], absorb: ['ShiftLeft', 'Mouse2', 'Pad1'],
  brakeL: ['KeyQ', 'Pad6'], brakeR: ['KeyE', 'Pad7'], camera: ['KeyC', 'Pad3'], shiftL: ['KeyZ', 'Pad4'], shiftR: ['KeyX', 'Pad5'],
  brake: ['KeyS'], lookBack: ['KeyB', 'Pad11'], noseUp: ['ArrowDown', 'Pad13'], noseDown: ['ArrowUp', 'Pad12'], steerL: ['KeyA', 'ArrowLeft', 'Pad14'], steerR: ['KeyD', 'ArrowRight', 'Pad15'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], skip: ['Pad3', 'KeyC']
};
SN.CONTROL_NAMES = { thrust: 'Thrust', fire: 'Fire weapon', absorb: 'Absorb weapon', brakeL: 'Airbrake left', brakeR: 'Airbrake right', brake: 'Both airbrakes',
  shiftL: 'Side-shift / roll left', shiftR: 'Side-shift / roll right', camera: 'Camera', lookBack: 'Look back', noseUp: 'Nose up', noseDown: 'Nose down', steerL: 'Steer left', steerR: 'Steer right',
  tabL: false, tabR: false, skip: false };

const st = [0, 1, 2, 3].map(() => ({ lastQ: -9, lastE: -9, flickT: 0, flickSeq: [], prevFire: false, prevAbsorb: false }));
/** ShipControls from player i's input (keys, pad, mouse) merged with SN.vpad[i] */
SN.Input = {
  controls(i) {
    const game = SN.game, I = game && game.players[i] || game && game.input, vp = SN.vpad[i] || {}, s = st[i] || st[0];
    if (!I || SN.hubEnded) return { steer: 0, pitch: 0, thrust: 0 };
    const pm = I.padMove || [0, 0];
    let digital = (I.down('steerR') ? 1 : 0) - (I.down('steerL') ? 1 : 0);
    let steer = Math.abs(pm[0]) > 0 ? pm[0] : digital, analog = Math.abs(pm[0]) > 0;
    if (vp.steer !== undefined && vp.steer !== 0) { steer = vp.steer; analog = true; }
    let pitch = -(pm[1] || 0); if (!pitch) pitch = (I.down('noseDown') ? 1 : 0) - (I.down('noseUp') ? 1 : 0);
    if (vp.pitch) pitch = vp.pitch;
    const val = a => I.value ? I.value(a) : I.down(a) ? 1 : 0;
    const both = I.down('brake') ? 1 : 0;
    const c = {
      steer, pitch, analog,
      thrust: I.down('thrust') || vp.thrust ? 1 : 0,
      brakeL: Math.max(val('brakeL'), both, vp.brakeL || 0), brakeR: Math.max(val('brakeR'), both, vp.brakeR || 0),
      fire: I.down('fire') || vp.fire ? 1 : 0, firePressed: I.pressed('fire') || vp.firePressed ? 1 : 0, fireReleased: I.released('fire') || vp.fireReleased ? 1 : 0,
      absorb: I.pressed('absorb') || vp.absorb ? 1 : 0,
      shiftL: I.pressed('shiftL') || vp.shiftL ? 1 : 0, shiftR: I.pressed('shiftR') || vp.shiftR ? 1 : 0, flick: vp.flick || 0
    };
    // double-tap Q / E = side-shift
    const now = I.clock || 0;
    if (I.pressed('brakeL')) { if (now - s.lastQ < .25) c.shiftL = 1; s.lastQ = now; }
    if (I.pressed('brakeR')) { if (now - s.lastE < .25) c.shiftR = 1; s.lastE = now; }
    // a steer flick (full one way, then the other, within 0.4 s) = barrel roll
    const sgn = steer <= -.7 ? -1 : steer >= .7 ? 1 : 0;
    if (sgn && s.flickSeq[s.flickSeq.length - 1] !== sgn) { s.flickSeq.push(sgn); s.flickT = now; }
    if (now - s.flickT > .4) s.flickSeq.length = 0;
    if (s.flickSeq.length >= 2 && !c.flick) { c.flick = s.flickSeq[s.flickSeq.length - 1]; s.flickSeq.length = 0; }
    // one-shot virtual pad presses
    for (const k of ['firePressed', 'fireReleased', 'absorb', 'shiftL', 'shiftR', 'flick']) vp[k] = 0;
    return c;
  },
  reset() { for (const s of st) { s.lastQ = s.lastE = -9; s.flickSeq.length = 0; } for (const v of SN.vpad) for (const k in v) delete v[k]; }
};
})();
