// The bot: plays a battle from its state alone (no peeking at the rules), for the attract mode and the scripted
// playthrough. It moves the crosshair to the most urgent target (a shot that is closing first, then the nearest),
// holds fire while the crosshair is on it, throws a grenade at a cluster, and reloads when the magazine runs low.
(() => {
'use strict';
const WP = globalThis.WP;

WP.bot = (b, dt, seat = b.p) => {
  const p = seat;
  let best = null, bestScore = Infinity;
  const empty = p.mag <= 0 && p.spares <= 0;
  // in co-op each seat takes a different target, so the seats spread across the wave
  const taken = b.players.filter(o => o !== p && o.targetId !== undefined).map(o => o.targetId);
  for (const e of b.ents) {
    if (!b.targetable(e)) continue;
    if (!['soldier', 'vehicle', 'boat', 'air', 'boss', 'rocket', 'pickup', 'crate'].includes(e.kind)) continue;
    const R = b.rect(e);
    if (!R) continue;
    // a shot about to land is the most urgent; then the nearest; a rocket is shot out of the air before it lands
    // with no ammo at all, the only useful targets are the pickups that bring some back
    if (empty && e.kind !== 'pickup') continue;
    const urgency = (e.tg > 0 ? -400 * e.tg : 0) + (e.kind === 'rocket' ? -200 : 0) + e.z * 0.5;
    if (taken.includes(e.id) && b.players.length > 1) continue;
    if (urgency < bestScore) { bestScore = urgency; best = { e, R }; }
  }
  let tx = p.cx, ty = p.cy;
  if (best) {
    const R = best.R;
    tx = (R.x0 + R.x1) / 2;
    ty = best.e.kind === 'boss' ? R.headY : (R.y0 + R.y1) / 2 + (R.y1 - R.y0) * 0.08;
  } else {
    tx = WP.W / 2; ty = 110;
  }
  p.targetId = best ? best.e.id : undefined;
  const dx = tx - p.cx, dy = ty - p.cy, dist = Math.hypot(dx, dy);
  const step = 460 * dt;
  const f = dist > step ? step / dist : 1;
  const aim = [p.cx + dx * f, p.cy + dy * f];
  const on = best && dist < 6;
  const cluster = b.ents.filter(e => (e.tg > 0.2) && !e.dead).length;
  const input = { aim, fire: !!(on && p.mag > 0), grenade: false, reload: false };
  if (!on && p.mag > 0 && best && dist < 22 && (p.cool <= 0)) input.fire = true;
  if (cluster >= 2 && p.grenades > 0 && p.gcool <= 0) input.grenade = true;
  if (p.mag <= 3 && p.spares > 0 && p.reload <= 0) input.reload = true;
  if (p.mag <= 0 && p.spares <= 0 && p.grenades > 0 && p.gcool <= 0) input.grenade = true;
  return input;
};
})();
