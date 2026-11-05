/* Touch-only devices (PLAN §7.21): no touch controls. A device with touch, no fine pointer, no gamepad and no key
 * pressed yet sees "Controller or keyboard required" and a big SETTINGS button on the title; the attract mode still
 * runs. A key press or a connected pad switches to normal play at once. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
const W_ = typeof window !== 'undefined' ? window : {};
let keySeen = false, padSeen = false, forced = null;
const detect = () => {
  if (forced !== null) return forced;
  if (keySeen || padSeen || OB.env.headless) return false;
  const N = W_.navigator || {}, touch = (N.maxTouchPoints > 0) || ('ontouchstart' in W_), fine = W_.matchMedia ? W_.matchMedia('(any-pointer: fine)').matches : true;
  let pads = 0; try { pads = Array.from(N.getGamepads ? N.getGamepads() : []).filter(Boolean).length; } catch (e) { pads = 0; }
  return !!(touch && !fine && !pads);
};
if (W_.addEventListener) { W_.addEventListener('keydown', () => { keySeen = true; }, { capture: true }); W_.addEventListener('gamepadconnected', () => { padSeen = true; }); }
OB.Touch = {
  flash: 0, btn: null,
  only() { return detect(); },
  force(v) { forced = v; },
  settingsHit(ck) { const b = this.btn; return b && ck && ck[0] >= b[0] && ck[0] < b[0] + b[2] && ck[1] >= b[1] && ck[1] < b[1] + b[3]; },
  update(dt, scene) {
    this.flash = Math.max(0, this.flash - dt * 2);
    const I = OB.game.input, ck = I.clicked && I.clicked();
    if (ck) { if (this.settingsHit(ck)) { OB.Sound.play('ok'); OB.game.menu('settings'); } else { this.flash = 1; OB.Sound.play('error'); } }
  },
  drawNotice(g, W, H, t, dim) {
    const w = 300, h = 96, x = W / 2 - w / 2, y = H * .5 - 20;
    OB.UI.panel(g, x, y, w, h, { alpha: dim ? .75 : .95, border: this.flash > 0 && Math.floor(t * 10) % 2 ? '#ff6a5a' : C.border });
    T(g, 'Controller or keyboard required', W / 2, y + 8, C.sun, { align: 'center', scale: 1 });
    // a pad and a keyboard
    const px0 = W / 2 - 70, py0 = y + 24; px.rect(g, px0, py0 + 4, 40, 18, '#e8e0f0'); px.disc(g, px0 + 4, py0 + 13, 9, '#e8e0f0'); px.disc(g, px0 + 36, py0 + 13, 9, '#e8e0f0'); px.rect(g, px0 + 6, py0 + 11, 7, 2, '#3a3458'); px.rect(g, px0 + 8, py0 + 9, 2, 7, '#3a3458'); for (const [a, b] of [[30, 10], [34, 14], [26, 14], [30, 18]]) px.disc(g, px0 + a, py0 + b, 1.5, '#3a3458');
    const kx = W / 2 + 20, ky = y + 26; px.rect(g, kx, ky, 56, 22, '#e8e0f0'); for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) px.rect(g, kx + 3 + c * 6.5, ky + 3 + r * 6, 5, 4, '#a8a0c0');
    const b = this.btn = [W / 2 - 60, y + 58, 120, 28]; E.ui.box(g, b[0], b[1], b[2], b[3], { bg: ['#ff7a9a', '#c83a7a'], border: '#fff4c0' }); T(g, 'SETTINGS', W / 2, b[1] + 8, '#ffffff', { align: 'center', scale: 2 });
  }
};
})();
