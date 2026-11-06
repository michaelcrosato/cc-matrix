// The player reads one Intent per fixed step, from HumanIntent, BotIntent or NetIntent, never from
// ctx.input. That rule is what makes attract mode, the playthrough test and co-op cheap.
import { TUNING, CAM } from '../data/tuning.js';

export const PAD_BUTTONS = {
  0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2',
  8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight',
};

export const KEYS = {
  action: ['PadCross', 'KeyE'],
  run: ['PadCircle', 'ShiftLeft', 'ShiftRight'],
  turn: ['KeyQ'],
  dodge: ['PadCircle', 'Space'],
  reload: ['PadSquare', 'KeyR'],
  case: ['PadTriangle', 'Tab', 'KeyI'],
  pause: ['PadOptions', 'Escape', 'KeyP'],
  map: ['KeyM'],
  nextWeapon: ['PadUp'],
  prevWeapon: ['PadDown'],
  heal: ['PadLeft', 'KeyH'],
  command: ['PadRight', 'KeyC'],
  throw: ['PadL1', 'KeyG'],
  swap: ['PadR3', 'KeyT'],
  aim: ['PadL2', 'MouseRight'],
  fire: ['PadR2', 'MouseLeft'],
  knife: ['PadR1', 'KeyV'],
};

export class Intent {
  moveX = 0; moveY = 0; // stick space: x right, y forward; length 0..1
  lookYaw = 0; lookPitch = 0; // radians to add this frame
  aim = false; fire = false; firePressed = false; reload = false; knife = false;
  action = false; actionHeld = false; run = false; turn = false; heal = false; command = false;
  throw = false; swap = false; nextWeapon = false; prevWeapon = false; slot = -1;
  dodge = false; dodgeHeld = false;
  /** Bot only: aim straight at these angles (no stick maths). */
  setYaw = null; setPitch = null;

  clearPresses() {
    this.firePressed = this.reload = this.knife = this.action = this.turn = this.heal = false;
    this.command = this.throw = this.swap = this.nextWeapon = this.prevWeapon = this.dodge = false;
    this.slot = -1;
  }
}

/** Reads the real input devices into an Intent. */
export class HumanIntent {
  intent = new Intent();
  backHeld = 0;
  circleHeldFor = 0;
  circleTapBack = false;

  /** Fixed step: held buttons with isDown, presses with consumePress. */
  fixed(ctx, dt, device) {
    const { input } = ctx;
    const i = this.intent;
    const axis = input.moveAxis();
    i.moveX = axis.x; i.moveY = axis.y;
    i.aim = input.anyDown(KEYS.aim);
    const padFire = input.isDown('PadR2');
    const mouseLeft = input.isDown('MouseLeft');
    i.fire = i.aim && (padFire || mouseLeft);
    if (input.consumePress('PadR2')) i.firePressed = i.aim;
    if (input.consumePress('MouseLeft')) {
      if (i.aim) i.firePressed = true;
      else if (!this.clickIsForDialogue?.()) i.knife = true;
    }
    if (input.consumeAny(KEYS.knife)) i.knife = true;
    if (input.consumeAny(KEYS.action)) i.action = true;
    i.actionHeld = input.anyDown(KEYS.action);
    if (input.consumeAny(KEYS.reload)) i.reload = true;
    if (input.consumeAny(KEYS.heal)) i.heal = true;
    if (input.consumeAny(KEYS.command)) i.command = true;
    if (input.consumeAny(KEYS.throw)) i.throw = true;
    if (input.consumeAny(KEYS.swap)) i.swap = true;
    if (input.consumeAny(KEYS.nextWeapon)) i.nextWeapon = true;
    if (input.consumeAny(KEYS.prevWeapon)) i.prevWeapon = true;
    for (let n = 0; n < 4; n++) if (input.consumePress(`Digit${n + 1}`)) i.slot = n;
    if (input.consumeAny(KEYS.turn)) i.turn = true;
    if (input.consumeAny(KEYS.dodge)) i.dodge = true;
    i.dodgeHeld = input.anyDown(KEYS.dodge);
    // Circle: hold to run, or tap with the stick pulled back to turn round.
    const circle = input.isDown('PadCircle');
    if (circle) {
      if (this.circleHeldFor === 0 && axis.y < -0.5) this.circleTapBack = true;
      this.circleHeldFor += dt;
    } else {
      if (this.circleTapBack && this.circleHeldFor > 0 && this.circleHeldFor < 0.25) i.turn = true;
      this.circleHeldFor = 0;
      this.circleTapBack = false;
    }
    i.run = (circle && !this.circleTapBack) || input.isDown('ShiftLeft', 'ShiftRight');
  }

  /** Render frame: look comes from the accumulated pointer delta (the pad's right stick feeds it too). */
  frame(ctx, dt, device, settings, aiming, assist) {
    const { input } = ctx;
    const i = this.intent;
    const invert = settings.invertY ? -1 : 1;
    if (device.kind === 'pad') {
      if (dt <= 0) { i.lookYaw = 0; i.lookPitch = 0; return i; }
      const speed = input.gamepadLookSpeed * dt;
      const vx = input.mouseDelta.x / speed;
      const vy = input.mouseDelta.y / speed;
      const curve = (v) => Math.sign(v) * Math.abs(v) ** 1.8;
      const rate = (aiming ? TUNING.padAimSpeed : CAM.padExploreYaw) * settings.padAim * (assist ?? 1);
      i.lookYaw = -curve(vx) * rate * dt;
      i.lookPitch = -curve(vy) * rate * CAM.pitchScale * dt * invert;
    } else {
      const rate = (aiming ? TUNING.mouseAimSpeed : CAM.mouseExplore) * settings.mouseAim;
      i.lookYaw = -input.mouseDelta.x * rate;
      i.lookPitch = -input.mouseDelta.y * rate * invert;
    }
    return i;
  }
}
