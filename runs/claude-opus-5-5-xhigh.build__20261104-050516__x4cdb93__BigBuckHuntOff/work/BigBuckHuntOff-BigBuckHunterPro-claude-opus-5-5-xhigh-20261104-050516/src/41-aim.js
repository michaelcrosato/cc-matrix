// 41-aim: each player's reticle: the mouse moves it absolutely; a stick or the keys give it a velocity on a response
// curve with a short ramp, the right stick adds fine aim, the scope slows it, and aim assist (pads and keys only, never
// the mouse; never toward a doe or a protected critter) adds friction over a legal target.
const ASSIST = { off: 1, light: .65, strong: .45 };
function aimUpdate(p, dt, H) {
  if (p.bot) return;
  const I = p.input, W = H.W || 480, Ht = H.H || 270, dev = I.lastDevice, scoped = p.scope.up;
  if (p.n === 1 && dev === 'mouse' && !G.touchOnly) {
    const m = I.pointer(); if (m) { p.rx = clamp(m[0], 0, W - 1); p.ry = clamp(m[1], 0, Ht - 1); }
    p.vx = p.vy = 0; p.ramp = 0; p.device = 'mouse'; return;
  }
  p.device = dev === 'gamepad' ? 'gamepad' : 'keyboard';
  const mv = I.move(), mag = Math.min(1, Math.hypot(mv[0], mv[1]));
  p.ramp = mag > .05 ? Math.min(1, (p.ramp || 0) + dt / .15) : 0;
  const assistSet = G.hunt && G.hunt.diff && G.hunt.diff.assist ? G.hunt.diff.assist : (G.game.settings.assist || 'light');
  let speed = T('reticleSpeed') * (G.game.settings.reticle || 1) * Math.pow(mag, 1.7) * (.35 + .65 * p.ramp) * (scoped ? .45 : 1);
  // aim assist: friction near a legal target; strong pulls toward its vitals while the stick moves toward them
  let pull = null;
  if (assistSet !== 'off' && H.lens) {
    const fr = assistSet === 'strong' ? .45 : Math.min(ASSIST.light, T('assist') < 1 ? T('assist') : 1), q = [0, 0, 0, 0];
    for (const a of H.actors) {
      if (!a.alive || !a.target || a.protected || !a.visible) continue;
      const z = a.zones(), h = z.find(v => v.id === 'heart') || z[0]; if (!h || !H.lens.project(h.a[0], h.a[1], h.a[2], q)) continue;
      const R = Math.max(4, (a.rig.length || 10) * q[2] * .55), d = Math.hypot(q[0] - p.rx, q[1] - p.ry);
      if (d < R + 8) { speed *= fr; pull = q.slice(0, 2); break; }
    }
  }
  if (mag > .05) {
    p.vx = mv[0] / mag * speed; p.vy = mv[1] / mag * speed;
    if (pull && assistSet === 'strong') { const dx = pull[0] - p.rx, dy = pull[1] - p.ry, L = Math.hypot(dx, dy); if (L > .5 && (dx * mv[0] + dy * mv[1]) > 0) { p.rx += dx * Math.min(1, .25 * dt * 4); p.ry += dy * Math.min(1, .25 * dt * 4); } }
  } else { p.vx = p.vy = 0; }
  const fine = I.padAim; if (fine && p.device === 'gamepad') { p.vx += fine[0] * T('reticleSpeed') * .3 * (scoped ? .45 : 1); p.vy += fine[1] * T('reticleSpeed') * .3 * (scoped ? .45 : 1); }
  p.rx = clamp(p.rx + p.vx * dt, 0, W - 1); p.ry = clamp(p.ry + p.vy * dt, 0, Ht - 1);
}
