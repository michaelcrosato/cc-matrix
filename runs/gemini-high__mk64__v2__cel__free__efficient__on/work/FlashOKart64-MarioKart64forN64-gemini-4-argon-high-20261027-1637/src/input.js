// src/input.js
// 10-Foot Controller-First Input Manager (PS5 Gamepad API + 4-Player Keyboard + Invert Axes + Attract Timer)

export class InputManager {
  constructor(settings) {
    this.settings = settings;
    this.keys = new Set();
    this.justPressedKeys = new Set();
    this.lastInputTime = performance.now();
    this.anyInputJustHappened = false;

    this.prevPadButtons = [[], [], [], []];
    this.navCooldown = 0;
    this.touchOnlyDetected = false;

    this._initListeners();
  }

  _initListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.add(e.code);
      this.recordActivity();
      this.touchOnlyDetected = false;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.recordActivity();
    });

    window.addEventListener('mousedown', () => {
      this.recordActivity();
    });

    window.addEventListener('gamepadconnected', () => {
      this.recordActivity();
      this.touchOnlyDetected = false;
    });

    // Check initial touch-only environment
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isNoFine = window.matchMedia && !window.matchMedia('(any-pointer: fine)').matches;
    if (isCoarse && isNoFine && navigator.maxTouchPoints > 0) {
      this.touchOnlyDetected = true;
    }
  }

  recordActivity() {
    this.lastInputTime = performance.now();
    this.anyInputJustHappened = true;
  }

  getIdleSeconds() {
    return (performance.now() - this.lastInputTime) / 1000;
  }

  resetIdleTimer() {
    this.lastInputTime = performance.now();
    this.anyInputJustHappened = false;
  }

  getGamepads() {
    if (!navigator.getGamepads) return [];
    try {
      return Array.from(navigator.getGamepads()).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  poll(dt) {
    if (this.navCooldown > 0) this.navCooldown -= dt;
    const pads = this.getGamepads();
    for (let i = 0; i < pads.length && i < 4; i++) {
      const pad = pads[i];
      if (!pad) continue;
      for (let b = 0; b < pad.buttons.length; b++) {
        const pressed = pad.buttons[b]?.pressed || false;
        if (pressed && !this.prevPadButtons[i][b]) {
          this.recordActivity();
        }
      }
      if (Math.abs(pad.axes[0] || 0) > 0.25 || Math.abs(pad.axes[1] || 0) > 0.25) {
        this.recordActivity();
      }
    }
  }

  endFrame() {
    this.justPressedKeys.clear();
    this.anyInputJustHappened = false;
    const pads = this.getGamepads();
    for (let i = 0; i < 4; i++) {
      const pad = pads[i];
      this.prevPadButtons[i] = pad ? pad.buttons.map(b => !!b?.pressed) : [];
    }
  }

  isPadButtonJustPressed(padIndex, btnIndex) {
    const pads = this.getGamepads();
    const pad = pads[padIndex];
    if (!pad || !pad.buttons[btnIndex]) return false;
    return !!pad.buttons[btnIndex].pressed && !this.prevPadButtons[padIndex]?.[btnIndex];
  }

  // Returns menu navigation actions from any connected gamepad or keyboard
  getMenuAction() {
    let up = false, down = false, left = false, right = false;
    let confirm = false, back = false, options = false, settingsBtn = false;

    if (this.justPressedKeys.has('ArrowUp') || this.justPressedKeys.has('KeyW')) up = true;
    if (this.justPressedKeys.has('ArrowDown') || this.justPressedKeys.has('KeyS')) down = true;
    if (this.justPressedKeys.has('ArrowLeft') || this.justPressedKeys.has('KeyA')) left = true;
    if (this.justPressedKeys.has('ArrowRight') || this.justPressedKeys.has('KeyD')) right = true;
    if (this.justPressedKeys.has('Enter') || this.justPressedKeys.has('Space')) confirm = true;
    if (this.justPressedKeys.has('Escape') || this.justPressedKeys.has('Backspace')) back = true;
    if (this.justPressedKeys.has('KeyP') || this.justPressedKeys.has('Tab')) options = true;
    if (this.justPressedKeys.has('KeyO')) settingsBtn = true;

    const invX = this.settings.invertHorizontal ? -1 : 1;
    const invY = this.settings.invertVertical ? -1 : 1;

    const pads = this.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad) continue;
      if (this.isPadButtonJustPressed(i, 0)) confirm = true; // Cross / A
      if (this.isPadButtonJustPressed(i, 1)) back = true;    // Circle / B
      if (this.isPadButtonJustPressed(i, 3)) settingsBtn = true; // Triangle / Y
      if (this.isPadButtonJustPressed(i, 9)) options = true; // Options / Start

      if (this.isPadButtonJustPressed(i, 12)) { if (invY > 0) up = true; else down = true; }
      if (this.isPadButtonJustPressed(i, 13)) { if (invY > 0) down = true; else up = true; }
      if (this.isPadButtonJustPressed(i, 14)) { if (invX > 0) left = true; else right = true; }
      if (this.isPadButtonJustPressed(i, 15)) { if (invX > 0) right = true; else left = true; }

      if (this.navCooldown <= 0) {
        const ax0 = (pad.axes[0] || 0) * invX;
        const ax1 = (pad.axes[1] || 0) * invY;
        if (ax1 < -0.55) { up = true; this.navCooldown = 0.22; }
        else if (ax1 > 0.55) { down = true; this.navCooldown = 0.22; }
        if (ax0 < -0.55) { left = true; this.navCooldown = 0.22; }
        else if (ax0 > 0.55) { right = true; this.navCooldown = 0.22; }
      }
    }

    return { up, down, left, right, confirm, back, options, settingsBtn };
  }

  // Returns driving controls for playerIndex (0..3)
  getPlayerControls(playerIndex, totalHumanPlayers = 1) {
    let steer = 0; // -1 (left) to +1 (right)
    let accel = false;
    let brake = false;
    let driftHop = false;
    let driftJustPressed = false;
    let useItemJustPressed = false;

    const invX = this.settings.invertHorizontal ? -1 : 1;
    const invY = this.settings.invertVertical ? -1 : 1;

    // Gamepad input for this player slot
    const pads = this.getGamepads();
    const pad = pads[playerIndex];
    if (pad) {
      const rawX = (pad.axes[0] || 0) * invX;
      if (Math.abs(rawX) > 0.14) {
        steer = Math.max(-1, Math.min(1, rawX));
      }
      if (pad.buttons[14]?.pressed) steer = -1 * invX;
      if (pad.buttons[15]?.pressed) steer = 1 * invX;

      // Vertical axis can also accelerate/brake if pushed strongly, affected by invertVertical
      const rawY = (pad.axes[1] || 0) * invY;
      if (rawY < -0.75) accel = true;
      if (rawY > 0.75) brake = true;

      if (pad.buttons[0]?.pressed || pad.buttons[7]?.value > 0.3) accel = true;
      if (pad.buttons[1]?.pressed || pad.buttons[2]?.pressed) brake = true;
      if (pad.buttons[5]?.pressed) driftHop = true;
      if (this.isPadButtonJustPressed(playerIndex, 5)) driftJustPressed = true;
      if (
        this.isPadButtonJustPressed(playerIndex, 4) ||
        this.isPadButtonJustPressed(playerIndex, 6) ||
        this.isPadButtonJustPressed(playerIndex, 3)
      ) {
        useItemJustPressed = true;
      }
    }

    // Keyboard bindings per player
    if (playerIndex === 0) {
      const single = totalHumanPlayers === 1;
      if (this.keys.has('KeyW') || (single && this.keys.has('ArrowUp'))) accel = true;
      if (this.keys.has('KeyS') || (single && this.keys.has('ArrowDown'))) brake = true;
      if (this.keys.has('KeyA') || (single && this.keys.has('ArrowLeft'))) steer -= 1;
      if (this.keys.has('KeyD') || (single && this.keys.has('ArrowRight'))) steer += 1;
      if (this.keys.has('Space') || (single && this.keys.has('ShiftRight'))) driftHop = true;
      if (this.justPressedKeys.has('Space') || (single && this.justPressedKeys.has('ShiftRight'))) driftJustPressed = true;
      if (this.justPressedKeys.has('KeyE') || this.justPressedKeys.has('ShiftLeft') || (single && this.justPressedKeys.has('Enter'))) {
        useItemJustPressed = true;
      }
    } else if (playerIndex === 1) {
      if (this.keys.has('ArrowUp')) accel = true;
      if (this.keys.has('ArrowDown')) brake = true;
      if (this.keys.has('ArrowLeft')) steer -= 1;
      if (this.keys.has('ArrowRight')) steer += 1;
      if (this.keys.has('ShiftRight') || this.keys.has('Slash')) driftHop = true;
      if (this.justPressedKeys.has('ShiftRight') || this.justPressedKeys.has('Slash')) driftJustPressed = true;
      if (this.justPressedKeys.has('Enter') || this.justPressedKeys.has('Period')) useItemJustPressed = true;
    } else if (playerIndex === 2) {
      if (this.keys.has('KeyI')) accel = true;
      if (this.keys.has('KeyK')) brake = true;
      if (this.keys.has('KeyJ')) steer -= 1;
      if (this.keys.has('KeyL')) steer += 1;
      if (this.keys.has('KeyU')) driftHop = true;
      if (this.justPressedKeys.has('KeyU')) driftJustPressed = true;
      if (this.justPressedKeys.has('KeyO')) useItemJustPressed = true;
    } else if (playerIndex === 3) {
      if (this.keys.has('Numpad8')) accel = true;
      if (this.keys.has('Numpad5')) brake = true;
      if (this.keys.has('Numpad4')) steer -= 1;
      if (this.keys.has('Numpad6')) steer += 1;
      if (this.keys.has('Numpad0')) driftHop = true;
      if (this.justPressedKeys.has('Numpad0')) driftJustPressed = true;
      if (this.justPressedKeys.has('NumpadEnter') || this.justPressedKeys.has('NumpadAdd')) useItemJustPressed = true;
    }

    steer = Math.max(-1, Math.min(1, steer));
    return { steer, accel, brake, driftHop, driftJustPressed, useItemJustPressed };
  }
}
