// One action table: logical action -> pad / keyboard / mouse codes. The pad button map is remapped once at boot.
export const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
export const ACTIONS = {
  confirm: ['PadCross', 'Enter', 'Space', 'KeyE'],
  back: ['PadCircle', 'Escape', 'Backspace'],
  pause: ['PadOptions', 'Escape', 'KeyP'],
  tabL: ['PadL1', 'KeyQ'],
  tabR: ['PadR1', 'KeyE'],
  up: ['PadUp', 'ArrowUp', 'KeyW'],
  down: ['PadDown', 'ArrowDown', 'KeyS'],
  left: ['PadLeft', 'ArrowLeft', 'KeyA'],
  right: ['PadRight', 'ArrowRight', 'KeyD'],
  breath: ['PadR2', 'PadCross', 'Space', 'MouseLeft'],
  footL: ['PadL1', 'PadL2', 'KeyF', 'ArrowLeft', 'MouseLeft'],
  footR: ['PadR1', 'PadR2', 'KeyJ', 'ArrowRight', 'MouseRight'],
  jump: ['PadCross', 'Space'], wave: ['PadTriangle', 'KeyV'], sit: ['PadSquare', 'KeyB'],
  half: ['ShiftLeft', 'ShiftRight'],
  triangle: ['PadTriangle', 'KeyM'],
};
export const PAD_CODES = Object.values(PAD_MAP);
export const isPadCode = (c) => c.startsWith('Pad');
export function pressed(input, action) { return ACTIONS[action].some((c) => input.wasPressed(c)); }
export function held(input, action) { return ACTIONS[action].some((c) => input.isDown(c)); }
export function consume(input, action) { return input.consumeAny(ACTIONS[action]); }
