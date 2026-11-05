// CRACKMANIA input maps (PLAN §3.2) and the driver's controls (analog triggers, E4; keyboard steering ramps)
import { E } from './ctx.js';
const D = E.Input.DEFAULT;
const MOVES = { up: D.up, down: D.down, left: D.left, right: D.right, start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
export const RACE_INPUT = Object.assign({}, MOVES, {
  gas: ['ArrowUp', 'KeyW', 'Pad7', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'Pad6', 'Pad2'], respawn: ['Enter', 'Backspace', 'Pad1'], restart: ['Delete', 'KeyR', 'Pad3'],
  camera: ['KeyC', 'Pad5'], cam1: ['Digit1'], cam2: ['Digit2'], cam3: ['Digit3'], ghost: ['KeyG', 'Pad4'], horn: ['KeyH', 'Pad11']
});
export const MENU_INPUT = Object.assign({}, MOVES, { cancel: ['Escape', 'Backspace', 'Mouse2', 'Pad1'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], secondary: ['KeyY', 'KeyT', 'Pad3'], tertiary: ['KeyV', 'Pad2'], trigL: ['Minus', 'Pad6'], trigR: ['Equal', 'Pad7'] });
export const EDIT_INPUT = Object.assign({}, MOVES, {
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], place: ['Space', 'Enter', 'Mouse0', 'Pad0'], remove: ['Delete', 'Backspace', 'Mouse2', 'Pad2'],
  rotR: ['KeyR', 'Pad5'], rotL: ['Pad4'], levelUp: ['KeyE', 'PageUp', 'Pad7'], levelDown: ['KeyQ', 'PageDown', 'Pad6'], test: ['KeyT', 'Pad3'],
  undo: ['KeyZ', 'Pad10'], redo: ['KeyY', 'Pad11'], palL: ['Pad14', 'Comma'], palR: ['Pad15', 'Period'], catU: ['Pad12', 'Tab'], catD: ['Pad13'],
  cancel: ['Escape', 'Pad1'], pause: ['Escape', 'Pad9']
});
for (const k of ['up', 'down', 'left', 'right']) EDIT_INPUT[k] = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'] }[k];
export const REPLAY_INPUT = Object.assign({}, MOVES, { play: ['Space', 'Pad0'], camera: ['KeyC', 'Pad5'], restart: ['Home', 'Pad3'], slower: ['Minus', 'Pad6'], faster: ['Equal', 'Pad7'], save: ['KeyS', 'Pad2'] });
/** the driver's controls from an input: { steer (ramped on keys), gas, brake } (analog triggers on a pad) */
export class Driver {
  constructor(input) { this.input = input; this.steer = 0; }
  read(dt, sens = 1) {
    const I = this.input, mv = I.move(), padX = I.padMove ? I.padMove[0] : 0;
    let s;
    if (Math.abs(padX) > 0 || I.stickOn) s = Math.sign(mv[0]) * Math.pow(Math.abs(mv[0]), 1.3) * sens;
    else {
      const want = mv[0] > .1 ? 1 : mv[0] < -.1 ? -1 : 0, rate = want === 0 || Math.sign(want) !== Math.sign(this.steer) ? 1 / .08 : 1 / .12;
      s = E.approach(this.steer, want, rate * dt); s = Math.max(-1, Math.min(1, s));
    }
    this.steer = Math.max(-1, Math.min(1, s));
    const gas = I.analog ? I.analog('gas') : (I.down('gas') ? 1 : 0), brake = I.analog ? I.analog('brake') : (I.down('brake') ? 1 : 0);
    return { steer: this.steer, gas, brake };
  }
}
