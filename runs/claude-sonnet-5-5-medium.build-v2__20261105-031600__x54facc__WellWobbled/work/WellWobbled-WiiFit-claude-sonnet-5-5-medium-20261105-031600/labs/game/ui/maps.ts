/**
 * @file The action maps: `actionMap:balance` (every activity: lean, two feet, gentle, act), `actionMap:garden` (the same with the
 * pointer free), `actionMap:roam` (walk, look, use, hop, programme, wave) and `actionMap:menu` (no lock, for front-end
 * screens, so a click behind a menu never takes the pointer). Page-side.
 * @example
 * import './ui/maps'; // then engine.input.use('actionMap:balance')
 */
import { defineActionMap } from '../../../engine';

const walk = {
  forward: ['KeyW', 'ArrowUp', 'PadUp', 'PadLeftStickUp'],
  back: ['KeyS', 'ArrowDown', 'PadDown', 'PadLeftStickDown'],
  left: ['KeyA', 'ArrowLeft', 'PadLeft', 'PadLeftStickLeft'],
  right: ['KeyD', 'ArrowRight', 'PadRight', 'PadLeftStickRight'],
};
const balance = {
  ...walk,
  footl: ['KeyQ', 'MouseLeft', 'PadLeftTrigger', 'PadLeftShoulder', 'Space'],
  footr: ['KeyE', 'MouseRight', 'PadRightTrigger', 'PadRightShoulder', 'Space'],
  gentle: ['ShiftLeft', 'ShiftRight'],
  act: ['KeyF', 'Enter', 'PadSouth', 'PadEast', 'PadWest', 'PadNorth'],
};
const values = {
  'game:r': 'right',
  'game:l': 'left',
  'game:f': 'forward',
  'game:b': 'back',
  'game:fl': 'footl',
  'game:fr': 'footr',
  'game:gentle': 'gentle',
  'game:act': 'act',
};
defineActionMap('actionMap:balance', {
  description: 'The lean, the two feet, gentle and act, in every activity.',
  actions: balance,
  values,
  lock: true,
} as never);
defineActionMap('actionMap:garden', {
  description: 'The balance map with the pointer free: its place on the tray tilts it.',
  actions: balance,
  values,
  lock: false,
} as never);
defineActionMap('actionMap:menu', {
  description: 'Front-end screens: the pointer stays free.',
  actions: { ...walk, act: ['Enter'] },
  lock: false,
} as never);
defineActionMap('actionMap:roam', {
  description: 'Walking the island.',
  values: { 'game:use': 'use', 'game:plan': 'plan', 'game:wave': 'wave' },
  actions: {
    ...walk,
    jump: ['Space', 'PadWest'],
    use: ['KeyE', 'Enter', 'MouseLeft', 'PadSouth'],
    walk: ['ShiftLeft', 'ShiftRight'],
    plan: ['Tab', 'PadNorth'],
    wave: ['KeyC', 'PadEast'],
  },
  move: ['forward', 'back', 'left', 'right'],
  look: true,
  lock: false,
} as never);
