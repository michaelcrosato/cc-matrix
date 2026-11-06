// One action table: every button the game reads, by action.
export const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
export const ACTIONS = {
  confirm: ['PadCross', 'Enter', 'Space', 'KeyE'],
  menuConfirm: ['PadCross', 'Enter', 'Space'],
  back: ['PadCircle', 'Escape', 'Backspace', 'MouseRight'],
  pause: ['PadOptions', 'Escape', 'KeyP'],
  breath: ['PadR2', 'PadCross', 'Space', 'MouseLeft'],
  stepL: ['PadL1', 'PadL2', 'KeyF', 'ArrowLeft', 'MouseLeft'],
  stepR: ['PadR1', 'PadR2', 'KeyJ', 'ArrowRight', 'MouseRight'],
  tabL: ['PadL1', 'KeyQ'],
  tabR: ['PadR1', 'KeyE'],
  up: ['PadUp', 'ArrowUp', 'KeyW'],
  down: ['PadDown', 'ArrowDown', 'KeyS'],
  left: ['PadLeft', 'ArrowLeft', 'KeyA'],
  right: ['PadRight', 'ArrowRight', 'KeyD'],
  jump: ['PadCross', 'Space'],
  wave: ['PadTriangle', 'KeyV'],
  sit: ['PadSquare', 'KeyB'],
  alt: ['PadSquare', 'KeyR'],
  more: ['PadTriangle', 'KeyM'],
};
