// One action table. Codes are what ctx.input sees after the boot-time pad remap.
export const PAD_BUTTONS = {
  0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2',
  8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight',
};

export const CONFIRM = ['PadCross', 'Enter', 'Space', 'KeyE'];
export const BACK = ['PadCircle', 'Escape', 'Backspace'];
export const PAUSE_KEYS = ['Escape', 'KeyP'];
export const BREATH = ['PadR2', 'PadCross', 'Space', 'MouseLeft'];
export const LEFT_FOOT = ['PadL1', 'PadL2', 'KeyF', 'ArrowLeft', 'MouseLeft'];
export const RIGHT_FOOT = ['PadR1', 'PadR2', 'KeyJ', 'ArrowRight', 'MouseRight'];
export const CONFIRM_PLAY = ['PadCross', 'Space', 'Enter', 'MouseLeft'];
export const TAB_LEFT = ['PadL1', 'KeyQ'];
export const TAB_RIGHT = ['PadR1', 'KeyE'];
export const MENU_UP = ['PadUp', 'ArrowUp', 'KeyW'];
export const MENU_DOWN = ['PadDown', 'ArrowDown', 'KeyS'];
export const MENU_LEFT = ['PadLeft', 'ArrowLeft', 'KeyA'];
export const MENU_RIGHT = ['PadRight', 'ArrowRight', 'KeyD'];
export const WAVE = ['PadTriangle', 'KeyV'];
export const SIT = ['PadSquare', 'KeyB'];
export const MORE_TIME = ['PadTriangle', 'KeyM'];

/** What each action's prompt shows on each device. Arrays draw as several glyphs. */
export const PROMPTS = {
  confirm: { ps: 'cross', xbox: 'a', key: 'Enter', mouse: 'mouseL' },
  back: { ps: 'circle', xbox: 'b', key: 'Esc', mouse: 'mouseR' },
  pause: { ps: 'options', xbox: 'menu', key: 'Esc', mouse: 'pauseIcon' },
  lean: { ps: 'stickL', xbox: 'stickL', key: ['W', 'A', 'S', 'D'], mouse: 'mouse' },
  move: { ps: 'dpad', xbox: 'dpad', key: ['W', 'S'], mouse: 'mouse' },
  breath: { ps: 'r2', xbox: 'rt', key: 'Space', mouse: 'mouseL' },
  stepL: { ps: 'l1', xbox: 'lb', key: 'F', mouse: 'mouseL' },
  stepR: { ps: 'r1', xbox: 'rb', key: 'J', mouse: 'mouseR' },
  tabs: { ps: ['l1', 'r1'], xbox: ['lb', 'rb'], key: ['Q', 'E'], mouse: 'wheel' },
  jump: { ps: 'cross', xbox: 'a', key: 'Space', mouse: 'mouseL' },
  wave: { ps: 'triangle', xbox: 'y', key: 'V', mouse: null },
  sit: { ps: 'square', xbox: 'x', key: 'B', mouse: null },
  more: { ps: 'triangle', xbox: 'y', key: 'M', mouse: null },
  adjust: { ps: 'dpad', xbox: 'dpad', key: ['A', 'D'], mouse: 'mouse' },
  hop: { ps: 'cross', xbox: 'a', key: 'Space', mouse: 'mouseL' },
};
