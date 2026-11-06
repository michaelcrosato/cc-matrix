// The cursor: where the game lives or dies on a pad (section 5.3). Runs outside the sim, one per local player.
(() => {
const G = (window.GAME ||= {}), T = G.T, Op = G.Op, { clamp, hyp } = G.OpHelpers;
const Cursor = G.Cursor = {};
Cursor.make = (x = 213, y = 116) => ({ x, y, vx: 0, vy: 0, jx: 0, jy: 0, ex: x, ey: y, fineT: 0, loupe: false, mode: 'pad' });
// dev: { ax, ay (stick, -1..1), fine (0/1), mouse: [x,y] | null, kx, ky (keyboard), nx, ny (d-pad nudge), assist, speedMul }
Cursor.update = (c, dev, S, p, dt) => {
  const assist = clamp(T('assist') + (S ? G.DIFF[S.diff].assist : 0) + (dev.assistAdd || 0), 0, 1), sm = (dev.speedMul || 1);
  let tx = 0, ty = 0; const fine = dev.fine ? T('fine') : 1;
  c.fineT = dev.fine ? c.fineT + dt : 0; c.loupe = c.fineT > .15;
  const doc = S && S.doc === 'vale' && G.Op.def(S).consult ? 1.15 : 1;
  const mag = hyp(dev.ax || 0, dev.ay || 0);
  if (dev.mouse) { c.vx = (dev.mouse[0] - c.x) / dt; c.vy = (dev.mouse[1] - c.y) / dt; c.x = dev.mouse[0]; c.y = dev.mouse[1]; c.mode = 'mouse'; }
  else {
    const kmag = hyp(dev.kx || 0, dev.ky || 0);
    if (mag > 0) { const sp = Math.pow(Math.min(1, mag), T('curve')) * T('cursorSpeed') * fine * sm * doc; tx = dev.ax / mag * sp; ty = dev.ay / mag * sp; }
    else if (kmag > 0) { tx = dev.kx / kmag * 200 * fine * sm; ty = dev.ky / kmag * 200 * fine * sm; }
    else if (dev.nx || dev.ny) { tx = (dev.nx || 0) * 40; ty = (dev.ny || 0) * 40; }
    let magnetPull = null;
    const gd0 = S && p ? Op.guide(S, p) : null;
    if (S && p && T('magnet') > 0 && !gd0) { const R = T('magnet') * (dev.fine ? .8 : 1); let best = null, bd = R; for (const t of Op.targets(S, p.tool)) { const d = hyp(t.x - c.x, t.y - c.y); if (d < bd) { bd = d; best = t; } } if (best) { const k = 1 - .55 * assist; tx *= k; ty *= k; if (mag < .12 && !dev.nx) magnetPull = best; } }
    // guide-follow: scale the part of the push across the guide
    const gd = S && p ? Op.guide(S, p) : null;
    if (gd && (mag > 0 || dev.kx || dev.ky) && assist > 0) { const nr = G.geo.polyNear(gd, c.x, c.y), seg = gd[Math.min(gd.length - 1, nr.i + 1)], a = gd[nr.i], tdx = seg[0] - a[0], tdy = seg[1] - a[1], tl = hyp(tdx, tdy) || 1, ux = tdx / tl, uy = tdy / tl, al = tx * ux + ty * uy, cr = -tx * uy + ty * ux, kk = 1 - .8 * assist; tx = ux * al + (-uy) * cr * kk; ty = uy * al + ux * cr * kk; // pull toward the line, too
      const toward = (nr.d > .5) ? .0 : 0; c.x += (nr.x - c.x) * Math.min(1, dt * 6 * assist) * (mag > .05 ? 1 : 0); c.y += (nr.y - c.y) * Math.min(1, dt * 6 * assist) * (mag > .05 ? 1 : 0); }
    const ramp = Math.min(1, dt / .06); c.vx += (tx - c.vx) * ramp; c.vy += (ty - c.vy) * ramp;
    if (magnetPull) { const dx = magnetPull.x - c.x, dy = magnetPull.y - c.y, d = hyp(dx, dy) || 1, sp = Math.min(90 * assist, d / dt); c.vx = dx / d * sp; c.vy = dy / d * sp; }
    c.x += c.vx * dt; c.y += c.vy * dt; c.mode = 'pad';
  }
  c.x = clamp(c.x, 6, 420); c.y = clamp(c.y, 6, 234);
  // Tremolo's aura shakes the aim point
  c.jx = c.jy = 0;
  if (S) for (const o of S.objs) if (o.type === 'tremolo' && !o.done && hyp(o.x - c.x, o.y - c.y) < 70 && !S.lb) { const k = 5 * o.amp * (dev.fine ? .35 : 1); c.jx = Math.sin(S.rt * 61.7) * k; c.jy = Math.cos(S.rt * 53.1) * k; }
  c.ex = c.x + c.jx; c.ey = c.y + c.jy;
};
// Mouse: assist only widens tolerances (applied through T('assist') in the tools).
})();
