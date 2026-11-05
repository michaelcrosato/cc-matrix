/* OutBloom — touch-only devices: no touch controls (the game is for a controller or a keyboard). A device is touch-only
 * when it has touch, no fine pointer, no gamepad connected and no key pressed yet; a gamepad or any key clears that at
 * once. The title shows a large "Controller or keyboard required" panel with a pad and a keyboard drawn on it and a big
 * SETTINGS button (a tap opens the settings). The attract mode still runs; taps don't end it. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px } = E;
const game = OB.game, UI = OB.UI, C = UI.COL;
const T = OB.Touch = { touchOnly: false, btn: null };
const detect = () => {
  if (OB.env.headless && !OB.env.fakeTouch) return false;
  const W = typeof window !== 'undefined' ? window : {}, N = typeof navigator !== 'undefined' ? navigator : {};
  const touch = (N.maxTouchPoints > 0) || ('ontouchstart' in W), fine = W.matchMedia ? W.matchMedia('(any-pointer: fine)').matches : true;
  let pad = false; try { pad = Array.from(N.getGamepads ? N.getGamepads() : []).some(Boolean); } catch (e) { pad = false; }
  return (touch && !fine && !pad && !OB.env.keySeen) || !!OB.env.fakeTouch;
};
T.refresh = () => { T.touchOnly = detect(); OB.env.touchOnly = T.touchOnly; game.input.touchEnabled = false; return T.touchOnly; };
T.blocked = () => T.touchOnly;
T.settingsHit = c => { const b = T.btn; return !!(b && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]); };
T.drawNotice = (g, W, H, t, dim) => {
  const w = 300, h = 110, x = Math.round(W / 2 - w / 2), y = Math.round(H * .5 - 20);
  const a = g.globalAlpha; if (dim) g.globalAlpha = .75;
  UI.panel(g, x, y, w, h, { border: C.sun }); UI.text(g, 'Controller or keyboard required', W / 2, y + 8, { align: 'center', color: C.sun });
  // a pad and a keyboard
  px.rect(g, x + 30, y + 28, 60, 26, '#3a3a4a'); px.disc(g, x + 30, y + 41, 13, '#3a3a4a'); px.disc(g, x + 90, y + 41, 13, '#3a3a4a'); px.rect(g, x + 26, y + 39, 10, 3, '#8a8a9a'); px.rect(g, x + 29, y + 36, 3, 10, '#8a8a9a'); OB.Art.icon(g, 'cross', x + 84, y + 40); OB.Art.icon(g, 'triangle', x + 84, y + 28);
  px.rect(g, x + 150, y + 28, 110, 30, '#e8e4f0'); for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) px.rect(g, x + 154 + k * 10 + r * 3, y + 31 + r * 8, 8, 6, '#a8a0b8');
  UI.text(g, 'Plug in a controller or press a key to play.', W / 2, y + 64, { align: 'center' });
  T.btn = [W / 2 - 60, y + 78, 120, 24]; UI.panel(g, T.btn[0], T.btn[1], T.btn[2], T.btn[3], { bg: ['#5a2a7a', '#8a3a8a'], border: C.sun }); UI.text(g, 'SETTINGS', W / 2, y + 85, { align: 'center', color: C.sun, scale: 1 });
  g.globalAlpha = a;
};
if (typeof addEventListener === 'function' && !OB.env.headless) {
  addEventListener('keydown', () => { OB.env.keySeen = true; if (T.touchOnly) T.refresh(); }, { capture: true });
  addEventListener('gamepadconnected', () => { if (T.touchOnly) T.refresh(); });
}
T.refresh();
})();
