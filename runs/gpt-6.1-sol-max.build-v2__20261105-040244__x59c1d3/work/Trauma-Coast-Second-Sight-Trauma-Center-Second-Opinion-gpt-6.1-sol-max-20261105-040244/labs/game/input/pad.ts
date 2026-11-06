/** @file Standard gamepad values resolved through the same saved action bindings as keyboard input. */
import type { Input } from '../../../engine';
const buttons: Record<string, number> = {
  PadSouth: 0,
  PadEast: 1,
  PadWest: 2,
  PadNorth: 3,
  PadLeftShoulder: 4,
  PadRightShoulder: 5,
  PadLeftTrigger: 6,
  PadRightTrigger: 7,
  PadSelect: 8,
  PadStart: 9,
  PadLeftStick: 10,
  PadRightStick: 11,
  PadUp: 12,
  PadDown: 13,
  PadLeft: 14,
  PadRight: 15,
};
export function padValue(pad: Gamepad, code: string): number {
  if (code in buttons) return pad.buttons[buttons[code]]?.value ?? 0;
  const axis: Record<string, [number, number]> = {
    PadLeftStickLeft: [0, -1],
    PadLeftStickRight: [0, 1],
    PadLeftStickUp: [1, -1],
    PadLeftStickDown: [1, 1],
    PadRightStickLeft: [2, -1],
    PadRightStickRight: [2, 1],
    PadRightStickUp: [3, -1],
    PadRightStickDown: [3, 1],
  };
  const a = axis[code];
  return a ? Math.max(0, (pad.axes[a[0]] ?? 0) * a[1]) : 0;
}
export function padAction(pad: Gamepad, input: Input | undefined, name: string, fallback: string[]): number {
  const codes = input?.bindingsFor('actionMap:surgeon').codes(name) ?? fallback;
  return Math.max(0, ...codes.filter((c) => c.startsWith('Pad')).map((c) => padValue(pad, c)));
}
