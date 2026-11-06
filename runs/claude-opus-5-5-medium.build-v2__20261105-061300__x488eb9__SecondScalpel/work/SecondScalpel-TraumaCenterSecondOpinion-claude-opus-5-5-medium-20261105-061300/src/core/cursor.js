// The cursor and the wheel: device to aim point, outside the sim. Where the game lives or dies on a pad.
(() => {
const G = (window.GAME ||= {}), { clamp, polyAt } = G, T = G.T;
const Cursor = G.Cursor = {
  emptyDevice: () => ({ stick: [0, 0], wheel: [0, 0], mouse: null, keys: [0, 0], nudge: [0, 0], fine: false, trig: 0, gift: false, consult: false, cancel: false, prev: false, next: false, num: 0, wheelHold: false, wheelDelta: [0, 0], shock: false, wheelPick: null }),
  create: (x = 213, y = 116) => ({ x, y, vx: 0, vy: 0, jx: 0, jy: 0, speedK: 1, fineT: 0 }),
  assistOf: S => clamp(S.assistTol + (S.doc === 'soko' ? .2 : 0), 0, 1),
  update(c, p, d, S, dt) { const A = Cursor.assistOf(S), fine = d.fine; c.fineT = fine ? c.fineT + dt : 0;
    if (d.mouse) { c.x = d.mouse[0]; c.y = d.mouse[1]; c.vx = c.vy = 0; }
    else { const L = Math.hypot(d.stick[0], d.stick[1]); let spd = L > 0 ? Math.pow(Math.min(1, L), T.stickCurve) * T.cursorSpeed * (c.speedK || 1) * (S.doc === 'vale' ? 1.15 : 1) : 0, tx = L > 0 ? d.stick[0] / L * spd : 0, ty = L > 0 ? d.stick[1] / L * spd : 0;
      const kl = Math.hypot(d.keys[0], d.keys[1]); if (kl > 0) { tx += d.keys[0] / kl * 200; ty += d.keys[1] / kl * 200; }
      tx += d.nudge[0] * 40; ty += d.nudge[1] * 40; if (fine) { tx *= T.fineFactor; ty *= T.fineFactor; }
      // magnet: slower near a valid target, and pulled on to it when the stick rests
      let best = null, bd = T.magnetR; if (!p.hold) for (const q of G.Op.targets(S, p.toolNext)) { const dd = Math.hypot(q.at[0] - c.x, q.at[1] - c.y); if (dd < bd) { bd = dd; best = q; } }
      if (best) { const k = 1 - .55 * A; tx *= k; ty *= k; }
      // guide-follow: across the line, the push counts for less
      if (p.hold && (p.hold.k === 'cut' || p.hold.k === 'stitch') && (tx || ty)) { const a = Cursor.holdDir(S, p); if (a !== null) { const ax = Math.cos(a), ay = Math.sin(a), al = tx * ax + ty * ay, ac = -tx * ay + ty * ax, kc = 1 - .8 * A; tx = ax * al - ay * ac * kc; ty = ay * al + ax * ac * kc; } }
      const r = Math.min(1, dt / .06); c.vx += (tx - c.vx) * r; c.vy += (ty - c.vy) * r; c.x += c.vx * dt; c.y += c.vy * dt;
      if (best && L < .15 && kl === 0 && bd > .3) { const pull = Math.min(bd, 90 * A * dt); c.x += (best.at[0] - c.x) / bd * pull; c.y += (best.at[1] - c.y) / bd * pull; } }
    c.x = clamp(c.x, -40, G.W0 + 40); c.y = clamp(c.y, -20, G.H0 + 20);
    // the tremor: Tremolo's aura shakes the aim point, not the cursor's place
    c.jx = c.jy = 0; const au = S.aura; if (au && !S.breath) { const dist = Math.hypot(au.x - c.x, au.y - c.y); if (dist < (au.r || 70)) { const J = 5 * au.amp * (fine ? .35 : 1), t = S.ht * 47; c.jx = Math.sin(t) * J; c.jy = Math.cos(t * 1.37) * J; } } },
  holdDir(S, p) { const o = G.getObj(S, p.hold.id); if (!o) return null; if (p.hold.k === 'cut') return polyAt(o.pts, o.prog + 3)[2]; const q = G.stPts(o, S, p.hold.i); return p.hold.flip ? Math.atan2(q[1] - q[3], q[0] - q[2]) : Math.atan2(q[3] - q[1], q[2] - q[0]); },
};
const Wheel = G.Wheel = {
  create: () => ({ sector: -1, stable: 0, show: 0, accX: 0, accY: 0, wasHold: false, flash: 0, hold: false }),
  // → the tool the hand should be going for
  update(w, cur, d, dt) { const TL = G.TOOLS, i = TL.indexOf(cur); let out = cur; if (w.show > 0) w.show -= dt; if (w.flash > 0) w.flash -= dt;
    if (d.wheelPick) out = d.wheelPick;
    const L = Math.hypot(d.wheel[0], d.wheel[1]);
    if (L > .6) { const a = Math.atan2(d.wheel[0], -d.wheel[1]), s = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; if (s !== w.sector) { w.sector = s; w.stable = 0; } w.stable += dt; w.show = .3; if (w.stable >= .08 && TL[s] !== cur) { out = TL[s]; w.flash = .2; } } else w.sector = -1;
    if (d.prev) { out = TL[(i + 7) % 8]; w.show = .6; w.flash = .2; }
    if (d.next) { out = TL[(i + 1) % 8]; w.show = .6; w.flash = .2; }
    if (d.num >= 1 && d.num <= 8) { out = TL[d.num - 1]; w.show = .4; w.flash = .2; }
    if (d.wheelHold) { if (!w.wasHold) { w.accX = w.accY = 0; } w.accX += d.wheelDelta[0]; w.accY += d.wheelDelta[1]; w.show = .3; w.hold = true; const la = Math.hypot(w.accX, w.accY); w.hover = la >= 10 ? ((Math.round(Math.atan2(w.accX, -w.accY) / (Math.PI / 4)) % 8) + 8) % 8 : -1; }
    else if (w.wasHold) { w.hold = false; if (w.hover >= 0 && TL[w.hover] !== cur) { out = TL[w.hover]; w.flash = .2; } w.hover = -1; }
    w.wasHold = d.wheelHold; return out; },
};
G.buildInput = (c, tool, d) => ({ x: c.x + c.jx, y: c.y + c.jy, tool, trig: d.trig, fine: d.fine, gift: d.gift, consult: d.consult, cancel: d.cancel, shock: d.shock });
})();
