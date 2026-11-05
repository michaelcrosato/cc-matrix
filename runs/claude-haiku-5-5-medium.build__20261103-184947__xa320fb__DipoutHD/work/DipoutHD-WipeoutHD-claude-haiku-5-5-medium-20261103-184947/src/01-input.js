// Dipout HD: the player's controls. Keyboard and mouse use PC racing keys; a standard-mapping pad uses analog
// sticks and triggers read straight from the Gamepad API. Browser-only pieces take the engine's input object.
(() => {
  const SN = globalThis.SN;
  const DEAD = 0.18;
  const dz = (v) => (Math.abs(v) < DEAD ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - DEAD) / (1 - DEAD)));

  // Keep edge-triggered presses per player between frames.
  SN.makeControlState = () => ({ prevFire: false, prevAbsorb: false, prevCam: false, prevShL: false, prevShR: false });

  // game: the engine's Game (for held codes). pad: a Gamepad or null. st: the state from makeControlState.
  SN.readControls = (game, pad, st) => {
    const held = game && game.input && game.input.held ? game.input.held : new Set();
    const k = (...codes) => codes.some((c) => held.has(c));
    const btn = (i) => (pad && pad.buttons[i] ? pad.buttons[i].value : 0);
    const bp = (i) => (pad && pad.buttons[i] ? pad.buttons[i].pressed : false);
    const ax = (i) => (pad && pad.axes[i] !== undefined ? dz(pad.axes[i]) : 0);
    const dpad = (i) => bp(i) ? 1 : 0;

    const steer = Math.max(-1, Math.min(1, (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0) + ax(0) + dpad(15) - dpad(14)));
    const pitch = Math.max(-1, Math.min(1, (k('ArrowDown') ? 1 : 0) - (k('ArrowUp') ? 1 : 0) + ax(1) + dpad(13) - dpad(12)));
    const thrust = k('KeyW') || bp(0) || btn(7) > 0.5 ? 1 : 0;
    const bothKey = k('KeyS') ? 1 : 0;
    const brakeL = Math.max(k('KeyQ') ? 1 : 0, btn(6), bothKey);
    const brakeR = Math.max(k('KeyE') ? 1 : 0, btn(7), bothKey);
    const fireNow = k('Space', 'Mouse0') || bp(2);
    const absorbNow = k('ShiftLeft', 'ShiftRight', 'Mouse2') || bp(1);
    const camNow = k('KeyC') || bp(3);
    const shLNow = k('KeyZ') || bp(4), shRNow = k('KeyX') || bp(5);
    const c = {
      steer, pitch, thrust, brakeL, brakeR,
      shiftLPressed: shLNow && !st.prevShL, shiftRPressed: shRNow && !st.prevShR,
      fire: fireNow, firePressed: fireNow && !st.prevFire, fireReleased: !fireNow && st.prevFire,
      absorb: absorbNow && !st.prevAbsorb,
      lookBack: k('KeyB') || bp(11),
      camPressed: camNow && !st.prevCam,
    };
    st.prevFire = fireNow; st.prevAbsorb = absorbNow; st.prevCam = camNow; st.prevShL = shLNow; st.prevShR = shRNow;
    return c;
  };
})();
