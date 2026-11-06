// Actions, not keys. All gameplay asks for an action; this table is the only place that knows codes.
export const PAD_BUTTONS = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
export const ACTIONS = {
  fire: { pad: 'PadR2', kbm: ['MouseLeft'], verb: 'FIRE' },
  aim: { pad: 'PadL2', kbm: ['MouseRight'], verb: 'AIM' },
  use: { pad: 'PadSquare', kbm: ['KeyE'], verb: 'USE' },
  reload: { pad: 'PadSquare', kbm: ['KeyR'], verb: 'RELOAD' },
  jump: { pad: 'PadCross', kbm: ['Space'], verb: 'JUMP' },
  crouch: { pad: 'PadCircle', kbm: ['KeyC'], verb: 'CROUCH' },
  sprint: { pad: 'PadL3', kbm: ['ShiftLeft', 'ShiftRight'], verb: 'SPRINT' },
  melee: { pad: 'PadR3', kbm: ['KeyF'], verb: 'MELEE' },
  next: { pad: 'PadTriangle', kbm: [], verb: 'NEXT WEAPON' },
  throw: { pad: 'PadR1', kbm: ['KeyG'], verb: 'THROW' },
  heal: { pad: 'PadL1', kbm: ['KeyQ'], verb: 'SYRETTE' },
  map: { pad: 'PadUp', kbm: ['KeyM', 'Tab'], verb: 'MAP' },
  tablet: { pad: 'PadDown', kbm: ['KeyH'], verb: 'TABLET' },
  tracker: { pad: 'PadLeft', kbm: ['KeyT'], verb: 'TRACKER' },
  monocular: { pad: 'PadRight', kbm: ['KeyV'], verb: 'MONOCULAR' },
  pause: { pad: 'PadOptions', kbm: ['Escape'], verb: 'PAUSE' },
  ledger: { pad: 'PadCreate', kbm: ['KeyJ'], verb: 'LEDGER' },
  walk: { pad: null, kbm: ['CapsLock'], verb: 'WALK' },
  // In a vehicle
  gas: { pad: 'PadR2', kbm: ['KeyW', 'ArrowUp'], verb: 'GAS' },
  brake: { pad: 'PadL2', kbm: ['KeyS', 'ArrowDown'], verb: 'BRAKE' },
  handbrake: { pad: 'PadCross', kbm: ['Space'], verb: 'HANDBRAKE' },
  exit: { pad: 'PadSquare', kbm: ['KeyE'], verb: 'GET OUT' },
  swap: { pad: 'PadTriangle', kbm: ['KeyF'], verb: 'SWAP TO GUN' },
  chase: { pad: 'PadR3', kbm: ['KeyC'], verb: 'CHASE CAMERA' },
  // On the map
  mark: { pad: 'PadSquare', kbm: ['MouseLeft'], verb: 'SET WAYPOINT' },
  zoom: { pad: 'PadTriangle', kbm: ['KeyZ'], verb: 'ZOOM' },
  // A second choice beside a syrette
  finish: { pad: 'PadTriangle', kbm: ['KeyF'], verb: 'FINISH IT' },
  // Menus
  up: { pad: 'PadUp', kbm: ['ArrowUp', 'KeyW'], verb: 'UP' },
  down: { pad: 'PadDown', kbm: ['ArrowDown', 'KeyS'], verb: 'DOWN' },
  left: { pad: 'PadLeft', kbm: ['ArrowLeft', 'KeyA'], verb: 'LEFT' },
  right: { pad: 'PadRight', kbm: ['ArrowRight', 'KeyD'], verb: 'RIGHT' },
  confirm: { pad: 'PadCross', kbm: ['Enter', 'Space'], verb: 'OK' },
  back: { pad: 'PadCircle', kbm: ['Escape'], verb: 'BACK' },
  tabL: { pad: 'PadL1', kbm: ['KeyQ'], verb: 'PREV' },
  tabR: { pad: 'PadR1', kbm: ['KeyE'], verb: 'NEXT' },
  resetOne: { pad: 'PadSquare', kbm: ['KeyR'], verb: 'RESET' },
};
const codes = {};
for (const [k, a] of Object.entries(ACTIONS)) codes[k] = a.pad ? [a.pad, ...a.kbm] : [...a.kbm];
export const CODES = codes;
export const held = (input, a) => input.anyDown(codes[a]);
export const pressedFixed = (input, a) => input.consumeAny(codes[a]);
export const pressed = (input, a) => input.wasPressed(...codes[a]);
export const ALL_CODES = [...new Set(Object.values(codes).flat())];
export const PREVENT = ['Tab', 'CapsLock', 'KeyM', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1'];
