// A touch-only device: no touch controls, the required line and the settings button.
import { settingsScreen } from './screens/pause.js';
export function touchGateScreen(g) {
  return { id: 'touch-gate', top: 150, dim: false, back: null, footer: false, items: [{ label: 'SETTINGS', action: () => g.ui.push(settingsScreen(g)) }], draw() { g.drawTitle(true); const h = g.ctx.hud; h.text(0, 118, 'CONTROLLER OR KEYBOARD REQUIRED', { anchor: 'top', color: 'white' }); } };
}
