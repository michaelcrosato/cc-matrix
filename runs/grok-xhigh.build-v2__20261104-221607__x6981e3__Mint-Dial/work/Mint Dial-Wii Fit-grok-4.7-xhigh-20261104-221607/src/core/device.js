const KEYS = ['Enter', 'Space', 'Escape', 'Backspace', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyF', 'KeyJ', 'KeyP', 'KeyM', 'KeyV', 'KeyB', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
const PADS = ['PadCross', 'PadCircle', 'PadSquare', 'PadTriangle', 'PadL1', 'PadR1', 'PadL2', 'PadR2', 'PadOptions', 'PadCreate', 'PadUp', 'PadDown', 'PadLeft', 'PadRight'];

/** Last device that did something. Prompts follow it. */
export class Device {
  constructor() {
    this.kind = 'keyboard';
  }
  update(ctx) {
    const input = ctx.input;
    const pad = input.padAxis || { x: 0, y: 0 };
    if (Math.hypot(pad.x, pad.y) > 0.3) this.kind = 'pad';
    for (const code of PADS) if (input.wasPressed(code)) this.kind = 'pad';
    const moved = Math.hypot(input.mouseDelta?.x || 0, input.mouseDelta?.y || 0);
    if (moved > 2 || input.wheel || input.wasPressed('MouseLeft') || input.wasPressed('MouseRight') || input.wasPressed('MouseMiddle')) this.kind = 'mouse';
    for (const code of KEYS) if (input.wasPressed(code)) this.kind = 'keyboard';
    return this.kind;
  }
}

export function detectTouchOnly() {
  if (typeof matchMedia !== 'function') return false;
  let coarse = false;
  try {
    coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
  } catch {
    coarse = false;
  }
  if (!coarse) return false;
  try {
    const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    if (Array.from(list || []).some((p) => p && p.connected)) return false;
  } catch {
    /* no pads */
  }
  return true;
}
