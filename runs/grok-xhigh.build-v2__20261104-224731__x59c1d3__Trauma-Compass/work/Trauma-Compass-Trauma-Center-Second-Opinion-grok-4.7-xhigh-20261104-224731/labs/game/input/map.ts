/**
 * @file The surgeon's bindings. Menus use the engine's system actions. Gameplay is this map, and the pads are also
 * read directly so a second controller cannot steal the first.
 */
import { defineActionMap } from '../../../engine';

defineActionMap('actionMap:surgeon', {
  description: 'Harbor Light. The left stick or the mouse aims. R2 or the click uses the tool. Keys 1 to 8 pick one.',
  aimWith: 'none',
  lock: false,
  move: ['north', 'south', 'west', 'east'],
  actions: {
    north: ['KeyW', 'ArrowUp'],
    south: ['KeyS', 'ArrowDown'],
    west: ['KeyA', 'ArrowLeft'],
    east: ['KeyD', 'ArrowRight'],
    use: ['Enter', 'MouseLeft', 'PadSouth', 'PadRightTrigger'],
    gift: ['Space', 'PadNorth'],
    syringe: ['KeyF', 'PadWest'],
    drop: ['KeyR', 'PadEast'],
    sitePrev: ['KeyQ', 'PadLeft'],
    siteNext: ['KeyE', 'PadRight'],
    hint: ['KeyH', 'PadUp'],
    swap: ['Tab', 'PadRightStick'],
    precision: ['ShiftLeft', 'ShiftRight', 'PadLeftTrigger'],
    radial: ['MouseRight'],
    toolPrev: ['WheelDown', 'PadLeftShoulder'],
    toolNext: ['WheelUp', 'PadRightShoulder'],
    tool1: ['Digit1'],
    tool2: ['Digit2'],
    tool3: ['Digit3'],
    tool4: ['Digit4'],
    tool5: ['Digit5'],
    tool6: ['Digit6'],
    tool7: ['Digit7'],
    tool8: ['Digit8'],
  },
});

/** The action map id passed to the engine. */
export const SURGEON_MAP = 'actionMap:surgeon';
