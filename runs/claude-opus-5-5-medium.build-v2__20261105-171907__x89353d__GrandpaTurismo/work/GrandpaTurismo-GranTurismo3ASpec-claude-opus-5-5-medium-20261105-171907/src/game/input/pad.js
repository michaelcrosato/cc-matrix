// Reads every pad in the standard mapping once a frame, quantised, and sends changes through the engine's command queue so recordings replay them.
const q = (v) => Math.round(v * 255) / 255;
let last = '';
export function pollPads(input) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  let raw; try { raw = navigator.getGamepads(); } catch { return; }
  const pads = [];
  for (const p of raw ?? []) { if (!p || p.connected === false) continue; pads.push({ i: p.index, b: Array.from(p.buttons, (b) => q(b.value ?? (b.pressed ? 1 : 0))), a: Array.from(p.axes, q) }); }
  const key = JSON.stringify(pads);
  if (key !== last) { last = key; input.send({ pads }); }
}
export function rumble(index, strong, weak, ms) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  try { const p = navigator.getGamepads()?.[index]; p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {}); } catch { /* a pad without rumble */ }
}
