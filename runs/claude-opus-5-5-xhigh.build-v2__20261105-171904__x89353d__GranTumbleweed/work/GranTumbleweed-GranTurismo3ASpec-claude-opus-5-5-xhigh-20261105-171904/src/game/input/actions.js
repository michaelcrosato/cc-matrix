// Turns keys, mouse and latched pad state into actions. Tracks the last device (for prompts) and idle time (for attract mode).
import { BTN, padsKey, readPads, rumble } from './pad.js';
const MENU_BUTTONS = { confirm: BTN.cross, back: BTN.circle, alt: BTN.square, info: BTN.triangle, tabL: BTN.l1, tabR: BTN.r1, pause: BTN.options };
const KEYS = { confirm: ['Enter'], back: ['Escape', 'Backspace'], alt: ['KeyT'], info: ['KeyI'], tabL: ['KeyQ'], tabR: ['KeyE', 'Tab'], pause: ['Escape'] };
const PRESSED = Object.keys(MENU_BUTTONS);
export class Actions {
  constructor() {
    this.pads = []; this.prevButtons = []; this.frame = -1; this.lastDevice = 'key'; this.idle = 0; this.padKey = ''; this.pressedNow = new Set(); this.injected = []; this.moveTimer = { x: 0, y: 0 }; this.moveDir = { x: 0, y: 0 }; this.mx = 0; this.my = 0; this.lastPointer = null; this.driver = [mkDriver(), mkDriver()]; this.couch = false; this.touchSeen = false; this.anyInput = false; this.padEverSeen = false; this.keySeen = false; this.vibration = true; this.steerCurve = 1.4; this.mouseSteer = false; this.enabled = true; this.movedThisFrame = { x: 0, y: 0 }; this.lastPadSent = ''; this.clicked = false; this.rclicked = false; this.create = false; this.mouseIdle = 0;
  }
  // Once per frame, from whichever hook runs first (engine fact 8).
  latch(ctx) {
    const f = ctx.engine.frame;
    if (f === this.frame) return;
    this.frame = f;
    const input = ctx.input, dt = this.lastDt ?? 1 / 60;
    for (const cmd of input.commands) if (cmd && cmd.pads) { this.pads = cmd.pads; }
    this.anyInput = false; this.pressedNow.clear(); this.movedThisFrame.x = 0; this.movedThisFrame.y = 0;
    // Keyboard
    let keyPressed = false;
    for (const a of PRESSED) if (KEYS[a].some((k) => input.wasPressed(k))) { this.pressedNow.add(a); keyPressed = true; }
    if (input.wasPressed('Tab')) { this.pressedNow.add('tabR'); keyPressed = true; }
    const keyDown = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyQ', 'KeyE', 'Enter', 'Escape', 'KeyC', 'KeyB', 'KeyR', 'ShiftLeft', 'ControlLeft', 'KeyI', 'KeyT', 'Backspace', 'Tab'].some((k) => input.isDown(k));
    const anyPress = (input.queuedPresses?.length ?? 0) > 0 || keyPressed;
    if (keyDown || anyPress) { this.lastDevice = this.lastDevice === 'mouse' && !keyDown && !keyPressed ? 'mouse' : 'key'; this.anyInput = true; this.keySeen = true; }
    // Mouse
    const p = input.pointer, wheel = input.wheel ?? 0;
    this.clicked = input.wasPressed('MouseLeft'); this.rclicked = input.wasPressed('MouseRight');
    const touchNow = input.wasPressed?.('Touch');
    if (touchNow) { this.touchSeen = true; this.anyInput = true; this.clicked = true; }
    if (this.lastPointer) {
      const dx = Math.abs(p.x - this.lastPointer.x) * 240, dy = Math.abs(p.y - this.lastPointer.y) * 135;
      if (dx + dy > 3 && !touchNow) { this.anyInput = true; this.lastDevice = 'mouse'; this.mouseIdle = 0; this.lastPointer = { x: p.x, y: p.y }; }
    } else this.lastPointer = { x: p.x, y: p.y };
    if (this.clicked || this.rclicked || wheel) { this.anyInput = true; if (!touchNow) { this.lastDevice = 'mouse'; this.mouseIdle = 0; } }
    this.mouseIdle += dt;
    this.wheel = wheel;
    // Pads
    const prev = this.prevButtons;
    this.create = false;
    for (const pad of this.pads) {
      const pb = prev[pad.i] ?? [];
      if (pad.buttons[BTN.create] > 0.5) this.create = true;
      for (let b = 0; b < pad.buttons.length; b++) {
        const on = pad.buttons[b] > 0.5, was = (pb[b] ?? 0) > 0.5;
        if (on && !was) {
          this.anyInput = true; this.lastDevice = 'pad'; this.padEverSeen = true;
          for (const a of PRESSED) if (MENU_BUTTONS[a] === b) { if (a === 'pause' && this.create) continue; this.pressedNow.add(a); }
        }
      }
      const moved = Math.abs(pad.axes[0]) > 0.2 || Math.abs(pad.axes[1]) > 0.2 || Math.abs(pad.axes[2]) > 0.2 || Math.abs(pad.axes[3]) > 0.2 || pad.buttons[BTN.l2] > 0.2 || pad.buttons[BTN.r2] > 0.2;
      if (moved) { this.anyInput = true; this.lastDevice = 'pad'; this.padEverSeen = true; }
      prev[pad.i] = pad.buttons;
    }
    for (const a of this.injected) { if (a === 'moveX+' || a === 'moveX-') this.movedThisFrame.x = a === 'moveX+' ? 1 : -1; else if (a === 'moveY+' || a === 'moveY-') this.movedThisFrame.y = a === 'moveY+' ? 1 : -1; else this.pressedNow.add(a); this.anyInput = true; }
    this.injected.length = 0;
    this.updateMoves(input, dt);
    if (this.anyInput) this.idle = 0; else this.idle += dt;
  }
  setDt(dt) { this.lastDt = dt; }
  // Menu movement with repeat: first repeat at 0.35 s, then every 0.09 s.
  updateMoves(input, dt) {
    let x = 0, y = 0;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) x = 1; if (input.isDown('ArrowLeft') || input.isDown('KeyA')) x = -1;
    if (input.isDown('ArrowDown') || input.isDown('KeyS')) y = 1; if (input.isDown('ArrowUp') || input.isDown('KeyW')) y = -1;
    // A tap shorter than a frame still counts: a slow machine may never see the key held.
    if (!x && input.wasPressed?.('ArrowRight', 'KeyD')) this.movedThisFrame.x = 1; else if (!x && input.wasPressed?.('ArrowLeft', 'KeyA')) this.movedThisFrame.x = -1;
    if (!y && input.wasPressed?.('ArrowDown', 'KeyS')) this.movedThisFrame.y = 1; else if (!y && input.wasPressed?.('ArrowUp', 'KeyW')) this.movedThisFrame.y = -1;
    for (const pad of this.pads) {
      if (pad.axes[0] > 0.5 || pad.buttons[BTN.right] > 0.5) x = 1; else if (pad.axes[0] < -0.5 || pad.buttons[BTN.left] > 0.5) x = -1;
      if (pad.axes[1] > 0.5 || pad.buttons[BTN.down] > 0.5) y = 1; else if (pad.axes[1] < -0.5 || pad.buttons[BTN.up] > 0.5) y = -1;
    }
    for (const [ax, v] of [['x', x], ['y', y]]) {
      if (v !== this.moveDir[ax]) { this.moveDir[ax] = v; this.moveTimer[ax] = 0.35; if (v) this.movedThisFrame[ax] = v; }
      else if (v) { this.moveTimer[ax] -= dt; if (this.moveTimer[ax] <= 0) { this.moveTimer[ax] = 0.09; this.movedThisFrame[ax] = v; } }
    }
  }
  pressed(a) { return this.pressedNow.has(a); }
  moveX() { return this.movedThisFrame.x; }
  moveY() { return this.movedThisFrame.y; }
  inject(a) { this.injected.push(a); }
  // At the end of update: read pads and hand them to the engine, so they arrive (and replay) next frame.
  send(ctx) {
    const pads = readPads();
    const key = padsKey(pads);
    if (key !== this.lastPadSent) { this.lastPadSent = key; ctx.input.send({ pads: pads.map(({ i, axes, buttons }) => ({ i, axes, buttons })) }); }
    if (pads.length) { if (!this.padEverSeen && pads.some((p) => p.buttons.some((b) => b > 0.5))) this.padEverSeen = true; if (typeof this.hasPad === 'undefined' || !this.hasPad) this.hasPad = true; } else this.hasPad = false;
    if (ctx.audio && !ctx.audio.unlocked && pads.some((p) => p.buttons.some((b) => b > 0.5))) ctx.audio.unlock();
  }
  rumble(player, strong, weak, ms) { if (!this.vibration) return; const pad = this.pads[player]; if (pad) rumble(pad.i, strong, weak, ms); }
  // Which physical inputs does this player use?
  padFor(player) {
    if (this.couch) { if (this.pads.length >= 2) return this.pads[player]; if (this.pads.length === 1) return player === 0 ? this.pads[0] : null; return null; }
    if (player === 0) return this.pads[0] ?? null;
    return null;
  }
  keysFor(player) { // returns a key map, or null when this player uses a pad only
    if (!this.couch) return player === 0 ? KEYS_SOLO : null;
    if (this.pads.length >= 2) return null;
    if (this.pads.length === 1) return player === 1 ? KEYS_SOLO : null;
    return player === 0 ? KEYS_P1 : KEYS_P2;
  }
  // The driver's controls, filtered. Call once per frame per player.
  drive(ctx, player, dt) {
    const input = ctx.input, d = this.driver[player], pad = this.padFor(player), k = this.keysFor(player);
    let kSteer = 0, kThrottle = 0, kBrake = 0, analogSteer = null, anaThrottle = null, anaBrake = null, hand = false, up = false, down = false, cam = false, back = false, recover = false, lookX = 0, lookY = 0;
    if (k) {
      if (k.left.some((c) => input.isDown(c))) kSteer -= 1; if (k.right.some((c) => input.isDown(c))) kSteer += 1;
      if (k.throttle.some((c) => input.isDown(c))) kThrottle = 1; if (k.brake.some((c) => input.isDown(c))) kBrake = 1;
      hand = k.hand.some((c) => input.isDown(c)); up = k.up.some((c) => input.wasPressed(c)); down = k.down.some((c) => input.wasPressed(c));
      cam = k.cam.some((c) => input.wasPressed(c)); back = k.back.some((c) => input.isDown(c)); recover = k.recover.some((c) => input.isDown(c));
    }
    if (pad) {
      const pb = d.prevB ?? [], B = (b) => pad.buttons[b] > 0.5, P = (b) => pad.buttons[b] > 0.5 && !((pb[b] ?? 0) > 0.5);
      const ax = pad.axes[0], dead = 0.08;
      if (Math.abs(ax) > 0.02 || pad.buttons[BTN.left] > 0.5 || pad.buttons[BTN.right] > 0.5) { const a = Math.abs(ax) > dead ? (Math.abs(ax) - dead) / (1 - dead) : 0; analogSteer = Math.sign(ax) * Math.pow(a, this.steerCurve); if (pad.buttons[BTN.left] > 0.5) analogSteer = -1; if (pad.buttons[BTN.right] > 0.5) analogSteer = 1; }
      const rt = pad.buttons[BTN.r2], lt = pad.buttons[BTN.l2];
      anaThrottle = rt; anaBrake = lt;
      // A trigger that reports only 0 or 1 gets the keyboard ramp.
      d.digitalT = (rt === 0 || rt === 1) && (d.digitalT ?? true) ; d.digitalB = (lt === 0 || lt === 1) && (d.digitalB ?? true);
      hand = hand || B(BTN.square); up = up || P(BTN.r1); down = down || P(BTN.l1);
      const tri = B(BTN.triangle); if (tri) { d.triHold += dt; } else { if (d.triHold > 0 && d.triHold < 0.4) cam = true; d.triHold = 0; }
      recover = recover || d.triHold >= 0.4; back = back || B(BTN.circle); lookX = Math.abs(pad.axes[2]) > 0.12 ? pad.axes[2] : 0; lookY = Math.abs(pad.axes[3]) > 0.12 ? -pad.axes[3] : 0;
      d.prevB = pad.buttons;
    }
    // Mouse steering, optional.
    const mouseOn = this.mouseSteer && player === 0 && this.lastDevice === 'mouse';
    if (mouseOn) { analogSteer = Math.max(-1, Math.min(1, input.pointer.x * 1.6)); anaThrottle = input.isDown('MouseLeft') ? 1 : 0; anaBrake = input.isDown('MouseRight') ? 1 : 0; }
    else if (player === 0 && input.isDown('MouseRight')) { d.lookX = Math.max(-1, Math.min(1, (d.lookX ?? 0) + (input.mouseDelta.x ?? 0) * 0.006)); lookX = d.lookX; lookY = 0; } else d.lookX = 0;
    // Filters: keyboard steering goes toward +-1 at 3.2 per second and returns at 6.
    if (analogSteer !== null && !kSteer) d.steer = analogSteer;
    else { const to = kSteer, rate = to === 0 || (d.steer !== 0 && Math.sign(to) !== Math.sign(d.steer)) ? 6 : 3.2; d.steer += Math.max(-rate * dt, Math.min(rate * dt, to - d.steer)); }
    // Throttle and brake: keys ramp over 0.1 s; analog follows the pedal.
    const ramp = (cur, to) => cur + Math.max(-dt / 0.1, Math.min(dt / 0.1, to - cur));
    const tTo = Math.max(kThrottle, anaThrottle ?? 0), bTo = Math.max(kBrake, anaBrake ?? 0), digT = kThrottle || (pad && d.digitalT), digB = kBrake || (pad && d.digitalB);
    d.throttle = digT ? ramp(d.throttle, tTo) : tTo; d.brake = digB ? ramp(d.brake, bTo) : bTo;
    d.handbrake = hand; d.up = up; d.down = down; d.cam = cam; d.lookBack = back; d.recover = recover; d.lookX2 = lookX; d.lookY2 = lookY;
    return d;
  }
  resetDriver() { for (const d of this.driver) { d.steer = 0; d.throttle = 0; d.brake = 0; d.triHold = 0; } }
  state() { return { lastDevice: this.lastDevice, idle: this.idle, pads: this.pads.length }; }
}
const mkDriver = () => ({ steer: 0, throttle: 0, brake: 0, handbrake: false, up: false, down: false, cam: false, lookBack: false, recover: false, triHold: 0, lookX2: 0, lookY2: 0, digitalT: true, digitalB: true });
const KEYS_SOLO = { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], hand: ['Space'], up: ['KeyE', 'ShiftLeft'], down: ['KeyQ', 'ControlLeft'], cam: ['KeyC'], back: ['KeyB'], recover: ['KeyR'] };
const KEYS_P1 = { left: ['KeyA'], right: ['KeyD'], throttle: ['KeyW'], brake: ['KeyS'], hand: ['Space'], up: ['KeyE'], down: ['KeyQ'], cam: ['KeyC'], back: ['KeyB'], recover: ['KeyR'] };
const KEYS_P2 = { left: ['ArrowLeft'], right: ['ArrowRight'], throttle: ['ArrowUp'], brake: ['ArrowDown'], hand: ['Enter'], up: ['Period'], down: ['Comma'], cam: ['Slash'], back: ['ShiftRight'], recover: ['Backslash'] };
export { KEYS_SOLO, KEYS_P1, KEYS_P2 };
