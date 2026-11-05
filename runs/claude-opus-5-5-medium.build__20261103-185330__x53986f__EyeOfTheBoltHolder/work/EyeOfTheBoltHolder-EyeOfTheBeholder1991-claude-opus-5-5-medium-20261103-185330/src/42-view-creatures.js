/* VIEW: the pen-drawn creatures (Bloat Leech, Rat Knot, Brass Spider, Lidless Hound, the Gazer's eye and the
 * Bolt-Holder) animated from their sim state and a local clock, and the first-person weapon swings. */
B.drawCreature = (pen, mon, v, t) => {
  const MD = B.MONSTERS[mon.type], dead = mon.hp <= 0, sink = dead ? Math.max(0, mon.deadT - 1.2) * 10 : 0;
  const wind = mon.wind > 0 ? 1 - mon.wind / (mon.windMax || 1) : 0, strike = v.atkT > 0 ? v.atkT / .45 : 0, fl = mon.flash > 0;
  const p = pen.at(v.x, v.y, v.z - sink, v.facing, 1); p.flash = fl;
  const T = v.t, asleep = mon.status.asleep > 0;
  switch (mon.type) {
    case 'leech': {   // five balls along a sine on the floor, a ring mouth; it lunges on the strike
      const lunge = strike > 0 ? Math.sin(strike * PI) * 6 : -wind * 3;
      for (let k = 0; k < 5; k++) { const x = 6 - k * 4 + lunge * (1 - k / 5), y = Math.sin(T * 3 + k) * (dead ? 0 : 2), r = 4 - k * .35; p.ball(x, y, r * .8, r, r, r * .8, k % 2 ? '#b89a9a' : '#a88a8a').ball(x, y, r * 1.4, r * .7, r * .7, .3, '#7a5a5a'); }
      for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; p.ball(9 + lunge, Math.cos(a) * 2, 3 + Math.sin(a) * 2, .7, .7, .7, '#5a3a3a'); }
      p.ball(9.4 + lunge, 0, 3, 1.4, 1.4, 1.4, '#2a0a0a'); if (!dead) p.glow(7 + lunge, -1.6, 5, .5, '#ffffff');
      break;
    }
    case 'ratknot': {   // six rats in a wobbling ring, tails knotted in the middle
      const spin = T * .5;
      for (let k = 0; k < 6; k++) {
        const a = spin + k / 6 * PI * 2, wob = Math.sin(T * 7 + k) * 1.2 + (strike > 0 ? Math.sin(strike * PI) * 4 : -wind * 2), x = Math.cos(a) * (8 + wob), y = Math.sin(a) * (8 + wob);
        p.ball(x, y, 3, 3.6, 2.6, 2.6, '#6a5a50').ball(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 3.6, 1.8, 1.6, 1.6, '#7a6a5a');
        p.cone(x + Math.cos(a) * 3, y + Math.sin(a) * 3 + 1, 5, x + Math.cos(a) * 3, y + Math.sin(a) * 3 + 1.4, 7, .8, '#9a8a7a');
        if (!dead) p.glow(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6, 4, .4, '#ff6a4a');
        p.tube(x, y, 2, 0, 0, 2 + (k % 2), .5, '#c8a8a0'); for (let r = 1; r < 4; r++) p.ball(x * (1 - r / 4), y * (1 - r / 4), 2.2, .7, .7, .5, '#a88880');
      }
      p.ball(0, 0, 2.5, 2.4, 2.4, 2, '#b89a90'); break;
    }
    case 'spider': {   // abdomen and head, eight legs stepping in a tetrapod gait, four red eyes
      const lift = dead ? -2 : 0, body = dead ? 3 : 9 + Math.sin(T * 8) * .3, lunge = strike > 0 ? Math.sin(strike * PI) * 5 : -wind * 2;
      p.ball(-5 + lunge, 0, body + 1, 7, 6, 5.4, '#b8923a').ball(3 + lunge, 0, body, 4.5, 4, 3.6, '#c8a24a');
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const ph = T * 9 + k * PI / 2 + (s > 0 ? PI : 0), up = Math.max(0, Math.sin(ph)) * 3 * (v.walk || .3), bx = 2 - k * 2.6 + lunge, by = s * 3;
        const kx = bx + (k - 1.5) * 2.4, ky = s * 9, kz = body + 5 + up, fx = bx + (k - 1.5) * 4, fy = s * 15, fz = lift + (dead ? 0 : up * .5);
        p.tube(bx, by, body, kx, ky, kz, .7, '#8a6a2a').ball(kx, ky, kz, 1, 1, 1, '#c8a24a').tube(kx, ky, kz, fx, fy, fz, .55, '#9a7a3a').cone(fx, fy, fz + 1.2, fx, fy, fz - .4, .5, '#5a4220');
      }
      for (const s2 of [-1, 1]) p.cone(7 + lunge, s2 * 1.4, body - 1.5, 9 + lunge + (strike > 0 ? 1.5 : 0), s2 * .8, body - 4, .7, '#e8e0c8');
      for (let k = 0; k < 3; k++) p.ball(-5 + lunge - k * 2.5, 0, body + 5.6 - k * .6, 2.2 - k * .4, 3.6 - k * .6, .6, '#8a6a2a');
      if (!dead) for (let k = 0; k < 4; k++) p.glow(6.5 + lunge, -1.6 + (k % 2) * 3.2, body + 1 + (k >> 1) * 1.4, .55, wind > 0 ? '#ff2a1a' : '#e84a2a');
      break;
    }
    case 'hound': {   // pale, eyeless, a long jaw; runs, leaps at the strike
      const run = (v.walk || 0) > .3 ? 1 : 0, gait = Math.sin(T * 14) * run, leap = strike > 0 ? Math.sin(strike * PI) * 6 : 0, crouch = -wind * 2;
      const z = (dead ? 3 : 11) + leap + crouch, c = '#c8b8b0', dk = '#9a8a82';
      p.ball(0, 0, z, 9, 4.2, 4.6, c).ball(9, 0, z + 3 + leap * .3, 4.2, 3.4, 3.6, c).box(13.5, 0, z + 2 + leap * .3, 6, 2.6, 2, dk).box(13.5, 0, z + .4 + (strike > 0 ? -1.4 : 0), 5.5, 2.4, 1.2, dk);
      for (const [lx, s] of [[6, 1], [6, -1], [-6, 1], [-6, -1]]) { const ph = gait * (lx > 0 ? s : -s); p.tube(lx, s * 2.6, z - 2, lx + ph * 3, s * 3, dead ? 1 : 0, 1.1, dk); }
      p.tube(-9, 0, z + 1, -15, 0, z + 4 + Math.sin(T * 6) * 2, .8, dk);
      for (let k = 0; k < 4; k++) for (const s2 of [-1, 1]) p.bar(-3 + k * 2.4, s2 * 4, z + 1.5, -3.6 + k * 2.4, s2 * 3.6, z - 2.6, .5, .3, '#b0a098');
      for (let k = 0; k < 6; k++) p.cone(-6 + k * 2.6, 0, z + 3.6, -6.6 + k * 2.6, 0, z + 6 + Math.sin(T * 5 + k) * .5, .8, '#a89890');
      if (!dead && mon.aware) for (let k = 0; k < 4; k++) p.box(15.5, (k - 1.5) * .7, z - .2, .6, .3, 1.4, '#f0e8e0');
      break;
    }
    case 'gazer': {   // the orb is a card; the iris, lids and fins are drawn over it, the pupil on the party
      const z = 0, glowK = mon.wind > 0 ? wind : 0;
      p.ball(3.2, 0, 4 + z, 1.4, 2.6, 2.6, '#3a8a6a').ball(4.2, 0, 4, .6, 1.2, 1.2 + glowK, '#0a0a0a');
      const blink = Math.sin(T * 1.3 + mon.uid) > .97 ? 1 : 0;
      p.slab(2.6, -3, 6.2 - blink * 2, 2.6, 3, 6.2 - blink * 2, 1, 0, 0, 2, .8, '#c8802a').slab(2.6, -3, 1.8 + blink * 2, 2.6, 3, 1.8 + blink * 2, 1, 0, 0, 2, .8, '#c8802a');
      for (let k = 0; k < 3; k++) { const a = k / 3 * PI * 2 + T; p.cone(-2, Math.cos(a) * 2, 4 + Math.sin(a) * 2, -6, Math.cos(a) * 4, 4 + Math.sin(a) * 4, 1, '#e8a040'); }
      if (glowK > 0) p.glow(4.6, 0, 4, 1 + glowK * 2, '#ffd36a');
      break;
    }
    case 'boltholder': B.drawBoltHolder(p, mon, v, T); break;
    default: break;
  }
  pen.flash = false;
};
/** the Bolt-Holder: an amber eye in a cage of seven iron bolts; lids blink and narrow; lightning arcs between bolt heads */
B.drawBoltHolder = (p, mon, v, T) => {
  const b = mon.boss, dead = mon.hp <= 0, out = b.locks.filter(Boolean).length * 2, k = dead ? Math.min(1, mon.deadT) : 0;
  const tele = b.tele, narrow = tele && tele.kind === 'gaze' ? 1 - tele.t / tele.max : 0, charge = tele && tele.kind === 'chain' ? 1 - tele.t / tele.max : 0;
  const z = 18 + Math.sin(T * 1.6) * 3 - k * 14, P = B.S.party;
  const look = Math.atan2(mid(P.cy) - v.y, mid(P.cx) - v.x) - v.facing;
  p.ball(0, 0, z, 14, 14, 14, b.phase === 3 ? '#e8b8a8' : '#e8e0c8');
  for (let i = 0; i < 6; i++) { const a = i * 1.1; p.bar(Math.cos(a) * 8, Math.sin(a) * 8, z + Math.sin(a * 2) * 6, Math.cos(a) * 13, Math.sin(a) * 13, z + Math.sin(a * 2) * 9, .5, .3, '#c84a3a'); }
  const ix = Math.cos(look) * 12, iy = Math.sin(look) * 12;
  p.ball(ix, iy, z, 3, 7, 7, '#e8a030').ball(ix * 1.12, iy * 1.12, z, 1.6, 3.5 + (dead ? 3 : charge * 1.5) - narrow * 2, 3.5 + charge * 1.5 - narrow * 1.6, '#100806');
  const lid = (Math.sin(T * .9) > .985 ? 1 : 0) * 9 + narrow * 7;
  p.slab(-2, -15, z + 14 - lid, 15, 0, z + 14 - lid * .6, 0, 1, 0, 30, 2.2, '#8a6a4a').slab(-2, -15, z - 14 + lid, 15, 0, z - 14 + lid * .6, 0, 1, 0, 30, 2.2, '#8a6a4a');
  // seven bolts radiating; two slide out per Great Lock (the keystone, the seventh, never moves)
  const heads = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * PI * 2 + .3, el = Math.sin(i * 2.1) * .5, slid = i < out ? 16 : 0, r0 = 12 + slid + k * 30 * (i % 2 ? 1 : -1) * 0, r1 = r0 + 22;
    const ca = Math.cos(a) * Math.cos(el), sa = Math.sin(a) * Math.cos(el), se = Math.sin(el);
    p.tube(ca * r0, sa * r0, z + se * r0, ca * r1, sa * r1, z + se * r1, 1.3, '#4a4e58').box(ca * r1, sa * r1, z + se * r1, 5, 5, 3, '#6a707a');
    heads.push([ca * r1, sa * r1, z + se * r1]);
  }
  if (!dead) for (let i = 0; i < 7; i++) if (Math.sin(T * 13 + i * 2.7) > .4 - charge) { const a = heads[i], c = heads[(i + 1) % 7], mx = (a[0] + c[0]) / 2 + Math.sin(T * 50 + i) * 4, my = (a[1] + c[1]) / 2, mz = (a[2] + c[2]) / 2 + Math.cos(T * 40 + i) * 4; p.bar(a[0], a[1], a[2], mx, my, mz, .7, .4, '#9af4ff').bar(mx, my, mz, c[0], c[1], c[2], .7, .4, '#9af4ff'); }
  if (b.phase === 3 && !dead) for (let i = 0; i < 4; i++) p.bar(ix * .7, iy * .7 + (i - 1.5) * 3, z + 6, ix * .9, iy * .9 + (i - 1.5) * 4, z - 4, .4, .3, '#3a0a08');
  if (charge > 0) p.glow(ix * 1.2, iy * 1.2, z, 2 + charge * 5, '#6ae8ff');
  p.halo(0, 0, z, 20, dead ? [.12, .12, .12] : [.18, .11, .03]);
};
/** the first-person weapon: drawn in the eye's frame (x ahead, y right, z up) on the striker's side */
B.drawSwing = (op, s) => {
  const u = clamp(s.t / s.dur, 0, 1), side = s.side ? 1 : -1, e = Math.sin(u * PI);
  op.at(0, 0, 0, 0, 1);
  switch (s.family) {
    case 'crossbow': case 'bow': {
      const kick = u < .2 ? u / .2 : 1 - (u - .2) / .8, x = 14 - kick * 2, y = side * 5, z = -6 + e * 1.5;
      op.box(x, y, z, 12, 2, 1.6, '#6a4a2a').bar(x + 5, y - 5, z, x + 5, y + 5, z, 1, 1, s.family === 'bow' ? '#a07a4a' : '#5a4a3a');
      if (u < .3) op.bar(x + 5, y, z + .6, x + 18, y, z + .6, .4, .4, '#c8c8d0'); break;
    }
    case 'sling': { const a = u * PI * 4; op.tube(12, side * 6, -8, 12 + Math.cos(a) * 3, side * 6 + Math.sin(a) * 3, -2, .3, '#8a6a4a'); break; }
    case 'throw': { const x = 8 + u * 20, z = -8 + e * 8; op.box(x, side * (6 - u * 5), z, 3, 1.4, 1.4, '#c8c8d0'); break; }
    case 'punch': { const x = 8 + e * 8; op.ball(x, side * 4, -6, 2.2, 2, 2, '#e0b090'); break; }
    case 'spear': { const x = 6 + e * 14; op.bar(x - 14, side * 5, -6, x + 4, side * 2, -4, 1, 1, '#8a6a4a').box(x + 5, side * 2, -4, 4, 1, 1, '#c8c8d0'); break; }
    case 'cast': { const x = 11 + e * 3; op.ball(x, side * 5, -6, 2, 1.8, 1.8, '#e0b090').glow(x + 2, side * 5, -4, 1.4 + e * 2.5, s.color || '#d8b0ff'); break; }
    default: {   // blades, axes and clubs: a diagonal sweep across the striker's side
      const a0 = 1.2, a1 = -.9, a = lerp(a0, a1, clamp((u - .1) / .5, 0, 1)), y = side * (4 + Math.sin(a) * 5), z = Math.cos(a) * 5 - 3;
      const hx = 20, tx = hx + 12 * Math.cos(a * .5), ty = y * 1.4 - side * Math.sin(a) * 9, tz = z + Math.cos(a) * 9;
      const col = s.family === 'axe' ? '#e0e0f0' : s.family === 'blunt' ? '#c8c8d8' : '#ffffff';
      op.ball(hx - 1, y * 1.4, z - 1, 1.3, 1.3, 1.3, '#ffd0a8').box(hx, y * 1.4, z, 1, 3.4, 1, '#ffd060').bar(hx, y * 1.4, z, tx, ty, tz, s.family === 'blade' ? 1 : .8, .4, s.family === 'blade' ? col : '#c8925a');
      if (s.family !== 'blade') op.box(tx, ty, tz, 3, 3, 3.2, col);
      break;
    }
  }
};
