/**
 * @file The balance map. Lean is the stick and the keys. The feet are triggers, Q and E, and the mouse buttons.
 * Space breathes. It is not the act button. The pointer stays free on menus.
 */
import { defineActionMap } from '../../../engine';

defineActionMap('actionMap:retreat', {
  description: 'Lean with the left stick, WASD or the arrows. The feet are L2 and R2, Q and E, or the mouse buttons.',
  lock: false,
  actions: {
    forward: ['KeyW', 'ArrowUp', 'PadLeftStickUp'],
    back: ['KeyS', 'ArrowDown', 'PadLeftStickDown'],
    left: ['KeyA', 'ArrowLeft', 'PadLeftStickLeft'],
    right: ['KeyD', 'ArrowRight', 'PadLeftStickRight'],
    footl: ['KeyQ', 'PadLeftTrigger', 'MouseLeft'],
    footr: ['KeyE', 'PadRightTrigger', 'MouseRight'],
    breathe: ['Space'],
    act: ['KeyF', 'Enter', 'NumpadEnter', 'PadSouth'],
    gentle: ['ShiftLeft', 'PadLeftShoulder'],
  },
  move: ['forward', 'back', 'left', 'right'],
  values: {
    'game:f': 'forward',
    'game:b': 'back',
    'game:l': 'left',
    'game:r': 'right',
    'game:fl': 'footl',
    'game:fr': 'footr',
    'game:g': 'gentle',
  },
});
