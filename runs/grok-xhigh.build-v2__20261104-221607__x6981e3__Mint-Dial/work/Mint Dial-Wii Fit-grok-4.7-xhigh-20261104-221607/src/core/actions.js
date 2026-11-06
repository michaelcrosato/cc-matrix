/** One map. Menus and prompts read it. Gameplay still goes through the drivers. */
export const ACTIONS = {
  confirm: { pad: 'PadCross', keys: ['Enter', 'Space', 'KeyE'], mouse: 'MouseLeft', verb: 'Confirm' },
  back: { pad: 'PadCircle', keys: ['Escape', 'Backspace'], mouse: 'MouseRight', verb: 'Back' },
  pause: { pad: 'PadOptions', keys: ['KeyP', 'Escape'], verb: 'Pause' },
  up: { pad: 'PadUp', keys: ['ArrowUp', 'KeyW'] },
  down: { pad: 'PadDown', keys: ['ArrowDown', 'KeyS'] },
  left: { pad: 'PadLeft', keys: ['ArrowLeft', 'KeyA'] },
  right: { pad: 'PadRight', keys: ['ArrowRight', 'KeyD'] },
  tabPrev: { pad: 'PadL1', keys: ['KeyQ'] },
  tabNext: { pad: 'PadR1', keys: ['KeyE'] },
  breath: { pad: 'PadR2', keys: ['Space'], mouse: 'MouseLeft' },
  stepL: { pad: 'PadL1', keys: ['KeyF'] },
  stepR: { pad: 'PadR1', keys: ['KeyJ'] },
};

export const GAMEPAD_BUTTONS = {
  0: 'PadCross',
  1: 'PadCircle',
  2: 'PadSquare',
  3: 'PadTriangle',
  4: 'PadL1',
  5: 'PadR1',
  6: 'PadL2',
  7: 'PadR2',
  8: 'PadCreate',
  9: 'PadOptions',
  10: 'PadL3',
  11: 'PadR3',
  12: 'PadUp',
  13: 'PadDown',
  14: 'PadLeft',
  15: 'PadRight',
};

export function promptFor(kind, glyphs, verb) {
  if (kind === 'mouse') return `Click ${verb}`;
  if (kind === 'keyboard') return `Enter ${verb}`;
  if (glyphs === 'xbox') return `A ${verb}`;
  return `Cross ${verb}`;
}

export function glyphKind(deviceKind, glyphs) {
  if (deviceKind === 'mouse') return 'mouse';
  if (deviceKind === 'keyboard') return 'key';
  return glyphs === 'xbox' ? 'xbox' : 'playstation';
}
