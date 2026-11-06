/**
 * @file Menu input read straight from the devices, once per drawn frame. The engine's `input.pressed` holds a press only for
 * the last sample, and a frame can run several sim steps, each with its own sample, so a menu reading it at 30 frames a
 * second would lose every other press. Same keys and pad buttons as the engine's system layer.
 */
const KEYS: Readonly<Record<string, string>> = {
  Enter: 'uiAccept', NumpadEnter: 'uiAccept', Space: 'uiAccept', Escape: 'uiCancel', Backspace: 'uiCancel',
  ArrowUp: 'uiUp', ArrowDown: 'uiDown', ArrowLeft: 'uiLeft', ArrowRight: 'uiRight',
  KeyW: 'uiUp', KeyS: 'uiDown', KeyA: 'uiLeft', KeyD: 'uiRight',
}; // prettier-ignore
const BUTTONS: Readonly<Record<number, string>> = {
  0: 'uiAccept',
  1: 'uiCancel',
  12: 'uiUp',
  13: 'uiDown',
  14: 'uiLeft',
  15: 'uiRight',
};

export interface Nav {
  frame(): void;
  pressed(action: string): boolean;
  held(action: string): boolean;
}

export function createNav(): Nav {
  const tapped = new Set<string>();
  const down = new Set<string>();
  let now = new Set<string>();
  let heldNow = new Set<string>();
  let padWas = new Set<string>();
  addEventListener('keydown', (event) => {
    const action = KEYS[event.code];
    if (!action || event.repeat) return;
    tapped.add(action);
    down.add(action);
  });
  addEventListener('keyup', (event) => {
    const action = KEYS[event.code];
    if (action) down.delete(action);
  });
  return {
    frame() {
      const pad = new Set<string>();
      for (const one of navigator.getGamepads?.() ?? []) {
        if (!one) continue;
        for (const [i, action] of Object.entries(BUTTONS)) if (one.buttons[Number(i)]?.pressed) pad.add(action);
        const [x = 0, y = 0] = one.axes;
        if (y < -0.5) pad.add('uiUp');
        if (y > 0.5) pad.add('uiDown');
        if (x < -0.5) pad.add('uiLeft');
        if (x > 0.5) pad.add('uiRight');
      }
      now = new Set([...tapped, ...[...pad].filter((action) => !padWas.has(action))]);
      heldNow = new Set([...down, ...pad]);
      padWas = pad;
      tapped.clear();
    },
    pressed: (action) => now.has(action),
    held: (action) => heldNow.has(action),
  };
}
