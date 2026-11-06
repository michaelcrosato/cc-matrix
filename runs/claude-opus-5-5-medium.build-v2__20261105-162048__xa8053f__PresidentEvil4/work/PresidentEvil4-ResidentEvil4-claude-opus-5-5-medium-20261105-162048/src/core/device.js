// Which input was used last. Prompts follow it at once. A pad connecting never steals the glyphs until used.
export const device = { last: 'keyboard', moved: 0, padSeen: false, keySeen: false, touchOnly: false };
let attached = false;
export function attachDevice() {
  if (attached || typeof window === 'undefined') return; attached = true;
  window.addEventListener('keydown', () => { device.last = 'keyboard'; device.keySeen = true; device.moved++; }, true);
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { device.last = 'keyboard'; device.moved++; } }, true);
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { device.last = 'keyboard'; device.moved++; } }, true);
  window.addEventListener('wheel', () => { device.last = 'keyboard'; device.moved++; }, true);
  device.touchOnly = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches;
}
export function pollPads() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
  let used = false;
  for (const p of navigator.getGamepads() || []) {
    if (!p) continue; device.padSeen = true;
    if (p.buttons.some((b) => b.pressed || b.value > 0.3) || p.axes.some((a) => Math.abs(a) > 0.25)) used = true;
  }
  if (used) { device.last = 'pad'; device.moved++; }
  return used;
}
export function rumble(strong = 0.5, weak = 0.3, ms = 120) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  try { for (const p of navigator.getGamepads() || []) p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {}); } catch { /* a stub or an old pad */ }
}
