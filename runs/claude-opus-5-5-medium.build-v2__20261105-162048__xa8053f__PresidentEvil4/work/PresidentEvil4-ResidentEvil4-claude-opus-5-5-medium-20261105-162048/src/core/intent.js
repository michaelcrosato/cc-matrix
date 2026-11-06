// The player reads an Intent, never ctx.input. Human, bot and network all fill the same object.
export const PAD_BUTTONS = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
export const BIND = {
  aim: ['PadL2', 'MouseRight'], fire: ['PadR2', 'MouseLeft'], knife: ['PadR1', 'KeyV'], action: ['PadCross', 'KeyE'], run: ['PadCircle', 'ShiftLeft', 'ShiftRight'], turn: ['KeyQ'], reload: ['PadSquare', 'KeyR'],
  case: ['PadTriangle', 'Tab', 'KeyI'], pause: ['PadOptions', 'Escape', 'KeyP'], map: ['KeyM'], next: ['PadUp'], prev: ['PadDown'], heal: ['PadLeft', 'KeyH'], command: ['PadRight', 'KeyC'], throw: ['PadL1', 'KeyG'], shoulder: ['PadR3', 'KeyT'], dodge: ['PadCircle', 'Space'],
  confirm: ['PadCross', 'Enter', 'Space'], back: ['PadCircle', 'Escape'], tabPrev: ['PadL1', 'KeyQ'], tabNext: ['PadR1', 'KeyE'], secondary: ['PadSquare', 'KeyR'], tertiary: ['PadTriangle', 'KeyT'], arrange: ['PadR1', 'KeyF'],
  up: ['PadUp', 'ArrowUp', 'KeyW'], down: ['PadDown', 'ArrowDown', 'KeyS'], left: ['PadLeft', 'ArrowLeft', 'KeyA'], right: ['PadRight', 'ArrowRight', 'KeyD'],
};
export const newIntent = () => ({ moveX: 0, moveY: 0, lookX: 0, lookY: 0, absYaw: null, absPitch: null, aim: false, fire: false, firePressed: false, reload: false, knife: false, action: false, run: false, heal: false, command: false, throw: false, turn: false, next: false, prev: false, slot: -1, shoulder: false, dodge: false, actionHeld: false });
export class HumanIntent {
  constructor() { this.i = newIntent(); this.createHeld = false; this.circleAt = -9; }
  /** Called each fixed step. Presses via consumePress so none is lost. */
  fixed(ctx) {
    const I = ctx.input, i = this.i, m = I.moveAxis();
    i.moveX = m.x; i.moveY = m.y;
    i.aim = I.anyDown(BIND.aim);
    const firing = i.aim ? I.anyDown(BIND.fire) : I.isDown('PadR2');
    i.firePressed = i.aim ? I.consumeAny(BIND.fire) : false;
    i.fire = firing;
    i.knife = I.consumeAny(BIND.knife) || (!i.aim && I.consumePress('MouseLeft'));
    i.actionHeld = I.anyDown(BIND.action);
    i.action = I.consumeAny(BIND.action);
    i.run = I.anyDown(BIND.run);
    i.dodge = I.consumeAny(BIND.dodge);
    i.reload = I.consumeAny(BIND.reload);
    i.heal = I.consumeAny(BIND.heal);
    i.command = I.consumeAny(BIND.command);
    i.throw = I.consumeAny(BIND.throw);
    i.shoulder = I.consumeAny(BIND.shoulder);
    i.next = I.consumeAny(BIND.next); i.prev = I.consumeAny(BIND.prev);
    // Quick turn: tap Circle with the stick back, or Q.
    i.turn = I.consumeAny(BIND.turn) || (i.dodge && m.y < -0.5);
    for (let k = 1; k <= 4; k++) if (I.consumePress(`Digit${k}`)) i.slot = k - 1;
    return i;
  }
}
export class BotIntent { constructor() { this.i = newIntent(); } fixed() { return this.i; } }
export class NetIntent { constructor() { this.i = newIntent(); } fixed() { return this.i; } }
