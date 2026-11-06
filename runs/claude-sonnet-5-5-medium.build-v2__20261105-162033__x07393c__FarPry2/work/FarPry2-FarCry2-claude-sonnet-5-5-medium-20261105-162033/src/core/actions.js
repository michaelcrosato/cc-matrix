// Actions, not keys. Each action lists pad codes (Pad*) and keyboard/mouse codes. Gameplay asks for actions.
export const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2',
  8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
export const ACTIONS = {
  fire: { pad: ['PadR2'], kb: ['MouseLeft'] },
  aim: { pad: ['PadL2'], kb: ['MouseRight'] },
  use: { pad: ['PadSquare'], kb: ['KeyE'] },
  reload: { pad: ['PadSquare'], kb: ['KeyR'] },
  jump: { pad: ['PadCross'], kb: ['Space'] },
  crouch: { pad: ['PadCircle'], kb: ['KeyC'] },
  sprint: { pad: ['PadL3'], kb: ['ShiftLeft', 'ShiftRight'] },
  melee: { pad: ['PadR3'], kb: ['KeyF'] },
  weapon: { pad: ['PadTriangle'], kb: ['KeyZ'] },
  throw: { pad: ['PadR1'], kb: ['KeyG'] },
  syrette: { pad: ['PadL1'], kb: ['KeyQ'] },
  map: { pad: ['PadUp'], kb: ['KeyM', 'Tab'] },
  tablet: { pad: ['PadDown'], kb: ['KeyH'] },
  tracker: { pad: ['PadLeft'], kb: ['KeyT'] },
  monocular: { pad: ['PadRight'], kb: ['KeyV'] },
  pause: { pad: ['PadOptions'], kb: ['Escape'] },
  ledger: { pad: ['PadCreate'], kb: ['KeyJ'] },
  handbrake: { pad: ['PadCross'], kb: ['Space'] },
  exitCar: { pad: ['PadSquare'], kb: ['KeyE'] },
  swapGun: { pad: ['PadTriangle'], kb: ['KeyF'] },
  chase: { pad: ['PadR3'], kb: ['KeyC'] },
  confirm: { pad: ['PadCross'], kb: ['Enter', 'Space'] },
  back: { pad: ['PadCircle'], kb: ['Escape', 'Backspace'] },
  up: { pad: ['PadUp'], kb: ['ArrowUp', 'KeyW'] },
  down: { pad: ['PadDown'], kb: ['ArrowDown', 'KeyS'] },
  left: { pad: ['PadLeft'], kb: ['ArrowLeft', 'KeyA'] },
  right: { pad: ['PadRight'], kb: ['ArrowRight', 'KeyD'] },
  tabPrev: { pad: ['PadL1'], kb: ['KeyQ'] },
  tabNext: { pad: ['PadR1'], kb: ['KeyE'] },
  reset: { pad: ['PadSquare'], kb: ['KeyR'] },
  skip: { pad: ['PadCross'], kb: ['Enter', 'Space'] },
};
const all = (k) => [...new Set(Object.values(ACTIONS).flatMap((a) => a[k]))];
export const ALL_PAD = all('pad');
export const ALL_KB = all('kb');
export const codes = (name) => [...ACTIONS[name].pad, ...ACTIONS[name].kb];
/** was the action pressed this frame (render-loop use) */
export const pressed = (input, name) => input.wasPressed(...codes(name));
/** consume a press (fixed-step use) */
export const consume = (input, name) => input.consumeAny(codes(name));
export const held = (input, name) => input.anyDown(codes(name));
