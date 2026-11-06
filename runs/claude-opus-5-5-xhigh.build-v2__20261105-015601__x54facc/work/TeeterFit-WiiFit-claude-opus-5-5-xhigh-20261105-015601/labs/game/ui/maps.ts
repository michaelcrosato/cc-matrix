/**
 * @file The action maps (PLAN.md section 4): `balance` for every activity, `balanceFree` with the pointer left visible,
 * `roam` for the island, `front` for menus. Pause and the menu's keys are the engine's system layer.
 *
 * Game code, a page's.
 *
 * @example
 * // engine.input.use('actionMap:roam');
 */
import { defineActionMap } from '../../../engine';

/** The walk block every map shares: world-space move from keys and the left stick. */
const WALK = {
  forward: ['KeyW', 'ArrowUp', 'PadUp', 'PadLeftStickUp'],
  back: ['KeyS', 'ArrowDown', 'PadDown', 'PadLeftStickDown'],
  left: ['KeyA', 'ArrowLeft', 'PadLeft', 'PadLeftStickLeft'],
  right: ['KeyD', 'ArrowRight', 'PadRight', 'PadLeftStickRight'],
};

/** The feet and the rest, for balancing. */
const BALANCE_ACTIONS = {
  ...WALK,
  footl: ['KeyQ', 'MouseLeft', 'PadLeftTrigger', 'PadLeftShoulder', 'Space'],
  footr: ['KeyE', 'MouseRight', 'PadRightTrigger', 'PadRightShoulder', 'Space'],
  gentle: ['ShiftLeft', 'ShiftRight'],
  act: ['KeyF', 'Enter', 'PadSouth', 'PadEast', 'PadWest', 'PadNorth'],
};

/** The values the sim reads raw. */
const BALANCE_VALUES = {
  'game:r': 'right',
  'game:l': 'left',
  'game:f': 'forward',
  'game:b': 'back',
  'game:fl': 'footl',
  'game:fr': 'footr',
};

defineActionMap('actionMap:balance', {
  description: 'The lean, the two feet, and anything else, which still pond punishes.',
  actions: BALANCE_ACTIONS,
  values: BALANCE_VALUES,
  lock: true,
});

defineActionMap('actionMap:balanceFree', {
  description: 'The same, with the pointer visible: Sand Garden reads where it is.',
  actions: BALANCE_ACTIONS,
  values: BALANCE_VALUES,
  lock: false,
});

defineActionMap('actionMap:roam', {
  description: 'Walking the island: move, hop, talk, the Programme, wave.',
  actions: {
    ...WALK,
    jump: ['Space', 'PadWest'],
    use: ['KeyE', 'Enter', 'MouseLeft', 'PadSouth'],
    walk: ['ShiftLeft', 'ShiftRight'],
    plan: ['Tab', 'PadNorth'],
    wave: ['KeyC', 'PadEast'],
  },
  lock: true,
});

defineActionMap('actionMap:front', {
  description: 'Front-end screens: nothing reaches play; a click takes no pointer.',
  actions: {
    ...WALK,
    pageL: ['PadLeftShoulder', 'KeyQ'],
    pageR: ['PadRightShoulder', 'KeyE'],
    plan: ['Tab', 'PadNorth'],
  },
  lock: false,
});
