/**
 * @file The action maps: `balance` for every activity (the lean, the two feet, and anything else, which Still Pond punishes),
 * `wtPointer` the same with the pointer free for Sand Garden, `roam` for the island, `wtMenu` for front-end screens with
 * `lock: false`, or a click behind a menu would capture the pointer.
 */
import type { defineActionMap as Define } from '../../../engine';

export function registerMaps(defineActionMap: typeof Define): void {
  const lean = {
    forward: ['KeyW', 'ArrowUp', 'PadUp', 'PadLeftStickUp'],
    back: ['KeyS', 'ArrowDown', 'PadDown', 'PadLeftStickDown'],
    left: ['KeyA', 'ArrowLeft', 'PadLeft', 'PadLeftStickLeft'],
    right: ['KeyD', 'ArrowRight', 'PadRight', 'PadLeftStickRight'],
  };
  const balanceActions = {
    ...lean,
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
    description: 'The lean, the two feet, and anything else, which Still Pond punishes.',
    actions: balanceActions,
    values,
    lock: true,
  } as never);
  defineActionMap('actionMap:wtPointer', {
    description: 'The balance map with the pointer free, for Sand Garden.',
    actions: balanceActions,
    values,
    lock: false,
  } as never);
  defineActionMap('actionMap:roam', {
    description: 'Walking the island.',
    actions: {
      ...lean,
      jump: ['Space', 'PadWest'],
      use: ['KeyE', 'Enter', 'MouseLeft', 'PadSouth'],
      walk: ['ShiftLeft', 'ShiftRight'],
      plan: ['Tab', 'PadNorth'],
      wave: ['KeyC', 'PadEast'],
    },
    lock: true,
  } as never);
  defineActionMap('actionMap:wtMenu', {
    description: 'Front-end screens: the system layer does the work.',
    actions: lean,
    lock: false,
  } as never);
}
