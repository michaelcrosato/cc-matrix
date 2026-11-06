/** Gameplay asks for actions. Devices stay apart: Pad* codes never match keys. */
export const ACTIONS = {
  fire: { pad: ['PadR2'], key: ['MouseLeft'] },
  aim: { pad: ['PadL2'], key: ['MouseRight'] },
  use: { pad: ['PadSquare'], key: ['KeyE'] },
  reload: { pad: ['PadSquare'], key: ['KeyR'] },
  jump: { pad: ['PadCross'], key: ['Space'] },
  crouch: { pad: ['PadCircle'], key: ['KeyC'] },
  sprint: { pad: ['PadL3'], key: ['ShiftLeft'] },
  melee: { pad: ['PadR3'], key: ['KeyF'] },
  next: { pad: ['PadTriangle'], key: ['Digit1', 'Digit2', 'Digit3', 'Digit4'] },
  throw: { pad: ['PadR1'], key: ['KeyG'] },
  heal: { pad: ['PadL1'], key: ['KeyQ'] },
  map: { pad: ['PadUp'], key: ['KeyM', 'Tab'] },
  tablet: { pad: ['PadDown'], key: ['KeyH'] },
  tracker: { pad: ['PadLeft'], key: ['KeyT'] },
  mono: { pad: ['PadRight'], key: ['KeyV'] },
  pause: { pad: ['PadOptions'], key: ['Escape'] },
  ledger: { pad: ['PadCreate'], key: ['KeyJ'] },
  confirm: { pad: ['PadCross'], key: ['Enter', 'Space'] },
  back: { pad: ['PadCircle'], key: ['Escape'] },
  left: { pad: ['PadLeft'], key: ['ArrowLeft', 'KeyA'] },
  right: { pad: ['PadRight'], key: ['ArrowRight', 'KeyD'] },
  up: { pad: ['PadUp'], key: ['ArrowUp', 'KeyW'] },
  down: { pad: ['PadDown'], key: ['ArrowDown', 'KeyS'] },
};

export function codes(action) {
  const a = ACTIONS[action];
  return a ? [...a.pad, ...a.key] : [];
}

export function consumeAction(input, action) {
  const a = ACTIONS[action];
  if (!a) return false;
  return input.consumeAny(a.pad) || input.consumeAny(a.key);
}

export function pressedAction(input, action) {
  const a = ACTIONS[action];
  if (!a) return false;
  return a.pad.some((c) => input.wasPressed(c)) || a.key.some((c) => input.wasPressed(c));
}

export function heldAction(input, action) {
  const a = ACTIONS[action];
  if (!a) return false;
  return input.anyDown(a.pad) || input.anyDown(a.key);
}
