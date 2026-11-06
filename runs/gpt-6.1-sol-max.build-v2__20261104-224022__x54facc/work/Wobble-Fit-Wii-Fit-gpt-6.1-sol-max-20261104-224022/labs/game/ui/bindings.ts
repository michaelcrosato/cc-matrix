/** @file Rebinding preserves mouse, breath and pad codes; prompts and local seats read the same native bindings. */
import type { GameEngine, ScreenApp } from './context';
import type { SeatInput } from './seat-input';
import { KEY_LABELS } from './glyphs';
export function syncBindings(input: GameEngine['input'], seats: SeatInput): void {
  if (!input) return;
  const bindings = input.bindingsFor('actionMap:balance');
  KEY_LABELS.left = bindings.label('footl', 'keyboard');
  KEY_LABELS.right = bindings.label('footr', 'keyboard');
  seats.setCodes(bindings.codes('footl'), bindings.codes('footr'));
}
export async function rebindFeet(a: ScreenApp): Promise<void> {
  const input = a.engine?.input;
  if (!input) return;
  a.ui.capturing = true;
  try {
    for (const [action, label] of [
      ['footl', 'left'],
      ['footr', 'right'],
    ] as const) {
      for (;;) {
        const heading = a.ui.root.querySelector('h1');
        if (heading) heading.textContent = `Press a key for ${label} foot.`;
        const code = await input.listen('keyboard');
        if (!code) return;
        if (code === 'Space') {
          if (heading) heading.textContent = 'Space stays with both feet. Choose another key.';
          continue;
        }
        const bindings = input.bindingsFor('actionMap:balance'),
          old = bindings.codes(action).find((c) => !c.startsWith('Pad') && !c.startsWith('Mouse') && c !== 'Space');
        const result = bindings.rebind(action, code, { replace: old });
        if (!result.ok) {
          if (heading) heading.textContent = result.message;
          continue;
        }
        const garden = input.bindingsFor('actionMap:gardenRetreat'),
          oldGarden = garden.codes(action).find((c) => !c.startsWith('Pad') && !c.startsWith('Mouse') && c !== 'Space');
        garden.rebind(action, code, { replace: oldGarden });
        break;
      }
    }
  } finally {
    a.ui.capturing = false;
    a.syncBindings();
    a.show('controls');
  }
}
export function resetFeet(a: ScreenApp): void {
  for (const map of ['actionMap:balance', 'actionMap:gardenRetreat']) {
    a.engine?.input?.bindingsFor(map).reset('footl');
    a.engine?.input?.bindingsFor(map).reset('footr');
  }
  a.syncBindings();
  a.show('controls');
}
