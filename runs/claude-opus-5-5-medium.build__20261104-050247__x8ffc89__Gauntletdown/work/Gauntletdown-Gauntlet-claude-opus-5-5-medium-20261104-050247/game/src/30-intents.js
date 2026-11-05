/* 30-intents: what drives a hero. Local input (keyboard and mouse, gamepads), the network and the bot all produce the
 * same intent: { mx, my (ground direction), aim (angle or null), fire, kbFire, magic, plant, rise }. */

function groundDir(sx, sy) {
  const l = Math.hypot(sx, sy); if (l < .01) return [0, 0];
  const d = game.view.screenDirToGround(sx, sy), dl = Math.hypot(d[0], d[1]) || 1, k = Math.min(1, l) / dl;
  return [d[0] * k, d[1] * k];
}
function localIntent(h, inp) {
  const mv = inp.move(), [mx, my] = groundDir(mv[0], mv[1]);
  let aim = null, fire = inp.down('fire'), kbFire = false;
  const pa = inp.padAim, pl = pa ? Math.hypot(pa[0], pa[1]) : 0;
  if (pa && pl > .3) { const d = groundDir(pa[0], pa[1]); aim = Math.atan2(d[1], d[0]); if (S.stickFire && pl > .5) fire = true; }
  else if (inp === game.input && inp.aimSource === 'mouse' && inp.mouse && (inp.clock - (inp.mouse.t || -9) < 3 || inp.held.has('Mouse0'))) {
    const g = game.mouseGround(); if (g && isFinite(g[0]) && isFinite(g[1]) && Math.hypot(g[0] - h.x, g[1] - h.y) > 2) aim = Math.atan2(g[1] - h.y, g[0] - h.x);
  }
  if (fire && aim === null && !inp.held.has('Mouse0') && inp.lastDevice !== 'gamepad') kbFire = true;   // keyboard-only firing plants, as in the arcade
  if ((fire || aim !== null) && S.aimAssist !== 'off') aim = assist(h, aim === null ? h.face : aim, S.aimAssist === 'high' ? .28 : .14);
  return { mx, my, aim, fire, kbFire, magic: inp.pressed('magic'), plant: inp.down('plant'), rise: inp.pressed('fire') || inp.pressed('confirm') };
}
// aim assist: the nearest monster or generator within the cone and 200 units, in sight
function assist(h, a, cone) {
  let best = null, bs = 1e9;
  const cands = W.mons.filter(m => !m.dead && !(m.type === 'fryar' && m.vis < .5)).concat(W.gens.filter(g => !g.dead));
  for (const m of cands) {
    const d = Math.hypot(m.x - h.x, m.y - h.y); if (d > 200) continue;
    const da = Math.abs(E.angDiff(a, Math.atan2(m.y - h.y, m.x - h.x))); if (da > cone) continue;
    const s = da * 120 + d; if (s < bs && W.map.los(h.x, h.y, m.x, m.y)) { bs = s; best = m; }
  }
  return best ? Math.atan2(best.y - h.y, best.x - h.x) : a;
}
const IDLE_INTENT = { mx: 0, my: 0, aim: null, fire: false, kbFire: false, magic: false, plant: false, rise: false };
