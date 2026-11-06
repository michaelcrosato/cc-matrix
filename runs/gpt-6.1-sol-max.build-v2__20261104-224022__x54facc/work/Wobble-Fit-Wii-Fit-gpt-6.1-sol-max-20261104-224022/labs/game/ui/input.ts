/** @file Native lean/foot maps plus a menu map that never captures the pointer. */
import { defineActionMap } from '../../../engine';
const walk = {
  forward: ['KeyW', 'ArrowUp', 'PadUp', 'PadLeftStickUp'],
  back: ['KeyS', 'ArrowDown', 'PadDown', 'PadLeftStickDown'],
  left: ['KeyA', 'ArrowLeft', 'PadLeft', 'PadLeftStickLeft'],
  right: ['KeyD', 'ArrowRight', 'PadRight', 'PadLeftStickRight'],
};
const feet = {
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
};
defineActionMap('actionMap:balance', {
  description: 'Lean, two feet, a gentle nudge.',
  actions: { ...walk, ...feet },
  values,
  lock: true,
});
defineActionMap('actionMap:gardenRetreat', {
  description: 'The visible pointer tilts the sand tray.',
  actions: { ...walk, ...feet },
  values,
  lock: false,
});
defineActionMap('actionMap:roamRetreat', {
  description: 'A walk round Little Fulcrum.',
  actions: {
    ...walk,
    use: ['KeyE', 'Enter', 'MouseLeft', 'PadSouth'],
    jump: ['Space', 'PadWest'],
    walk: ['ShiftLeft', 'ShiftRight'],
    plan: ['Tab', 'PadNorth'],
    wave: ['KeyC', 'PadEast'],
  },
  look: true,
  lock: true,
});
defineActionMap('actionMap:menuRetreat', {
  description: 'The menu leaves the pointer alone.',
  actions: { ...walk },
  lock: false,
});
