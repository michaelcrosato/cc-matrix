// An Intent is what the player wants this step. Humans, bots and network copies all produce one; gameplay never reads ctx.input directly.
import { device } from './device.js';
import { settings } from './settings.js';
import { TUNING } from '../data/tuning.js';

export const KEYS = {
  aim: ['PadL2', 'MouseRight'], fire: ['PadR2', 'MouseLeft'], knife: ['PadR1', 'KeyV'], action: ['PadCross', 'KeyE'], run: ['PadCircle', 'ShiftLeft', 'ShiftRight'],
  reload: ['PadSquare', 'KeyR'], heal: ['PadLeft', 'KeyH'], command: ['PadRight', 'KeyC'], grenade: ['PadL1', 'KeyG'], shoulder: ['PadR3', 'KeyT'],
  weaponUp: ['PadUp'], weaponDown: ['PadDown'], dodge: ['PadCircle', 'Space'], quick: ['KeyQ'],
};
export function newIntent() {
  return { mx: 0, my: 0, lookX: 0, lookY: 0, aim: false, fire: false, firePressed: false, reload: false, knife: false, action: false, actionPressed: false, run: false,
    heal: false, command: false, grenade: false, shoulder: false, weaponDelta: 0, weaponSlot: 0, grenadeSwap: false, quick: false, dodge: false, qteAction: false, qteDodge: false, lockClick: false };
}
export const mouseLock = { required: false };

export class HumanIntent {
  constructor() { this.cur = newIntent(); this.sens = { yawE: 2.2, yawA: 1.1 }; }
  /** In fixedUpdate: held buttons and queued presses. */
  fixed(ctx) {
    const i = ctx.input, c = this.cur;
    const ax = i.moveAxis();
    c.mx = ax.x; c.my = ax.y;
    const locked = !mouseLock.required || i.pointerLocked || device.kind === 'pad';
    const mouse = (code) => (locked ? code : '');
    c.aim = i.isDown('PadL2') || (locked && i.isDown('MouseRight'));
    c.fire = i.isDown('PadR2') || (locked && i.isDown('MouseLeft'));
    const left = locked && i.consumePress('MouseLeft');
    const r2 = i.consumePress('PadR2');
    c.firePressed = c.aim && (left || r2);
    c.knife = i.consumePress('PadR1', 'KeyV') || (!c.aim && left);
    c.actionPressed = i.consumePress('PadCross', 'KeyE');
    c.action = i.isDown('PadCross', 'KeyE');
    c.run = i.isDown('PadCircle', 'ShiftLeft', 'ShiftRight');
    c.reload = i.consumePress('PadSquare', 'KeyR');
    c.heal = i.consumePress('PadLeft', 'KeyH');
    c.command = i.consumePress('PadRight', 'KeyC');
    c.grenade = i.consumePress('PadL1', 'KeyG');
    c.shoulder = i.consumePress('PadR3', 'KeyT');
    c.quick = i.consumePress('KeyQ');
    c.dodge = i.consumePress('PadCircle', 'Space');
    c.qteAction = c.actionPressed; c.qteDodge = c.dodge;
    c.weaponDelta = (i.consumePress('PadUp') ? 1 : 0) - (i.consumePress('PadDown') ? 1 : 0);
    c.weaponSlot = 0;
    for (let n = 1; n <= 4; n++) if (i.consumePress('Digit' + n)) c.weaponSlot = n;
    return c;
  }
  /** In update: camera look from the mouse or the right stick. Returns { dyaw, dpitch } in radians. */
  look(ctx, dt, aiming, assistScale = 1) {
    const i = ctx.input, d = i.mouseDelta;
    let dx = d.x, dy = d.y;
    if (!dx && !dy) return { dyaw: 0, dpitch: 0 };
    const inv = settings.invertY ? -1 : 1;
    if (device.kind === 'pad') {
      // recover the stick: the engine feeds it as pixels at gamepadLookSpeed
      const k = i.gamepadLookSpeed * Math.max(dt, 1e-3);
      const vx = dx / k, vy = dy / k;
      const curve = (v) => Math.sign(v) * Math.pow(Math.min(1, Math.abs(v)), 1.8);
      const sp = (aiming ? this.sens.yawA : this.sens.yawE) * settings.padAim * TUNING.padAimSpeed * assistScale;
      return { dyaw: -curve(vx) * sp * dt, dpitch: -curve(vy) * sp * 0.6 * dt * inv };
    }
    const s = (aiming ? 0.0016 : 0.0026) * settings.mouseAim * TUNING.mouseAimSpeed;
    return { dyaw: -dx * s, dpitch: -dy * s * inv };
  }
}
