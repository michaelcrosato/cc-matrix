// Pads are read raw, once a frame at the end of update: quantised, and sent through input.send so the engine's recordings replay them.
export const BTN = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };
const q = (v) => Math.round(v * 255) / 255;
export function readPads() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
  let list; try { list = navigator.getGamepads(); } catch { return []; }
  const out = [];
  for (const p of list ?? []) {
    if (!p || !p.connected || (p.mapping && p.mapping !== 'standard')) continue;
    out.push({ i: p.index, axes: [0, 1, 2, 3].map((k) => q(p.axes[k] ?? 0)), buttons: Array.from({ length: 16 }, (_, k) => q(p.buttons[k]?.value ?? (p.buttons[k]?.pressed ? 1 : 0))), real: p });
  }
  return out;
}
export const padsKey = (pads) => pads.map((p) => `${p.axes.join(',')}|${p.buttons.join(',')}`).join(';');
export function rumble(index, strong = 0.3, weak = 0.2, ms = 90) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  try { const p = navigator.getGamepads()[index]; p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch { /* a pad without rumble */ }
}
