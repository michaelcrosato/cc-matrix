// ---------------------------------------------------------------- the bot: a potential-field contestant (attract mode, tests, the dev bot partner)
MT.bot = {
  intent(c, W, o = {}) {
    const it = MT.NOINTENT(); if (!W) return it;
    if (c.state === 'out') { it.start = o.cont !== false; return it; }
    if (c.state !== 'play') return it;
    c._bot = c._bot || { t: 0, wander: MT.Rr(0, 6.28, 'ai'), boatT: 0 }; const B = c._bot; B.t += W.lastDt;
    let fx = 0, fy = 0;
    // repelled by foes, bullets and hazards
    let near60 = 0, near120 = 0, best = null, bd = 1e9;
    for (const e of W.enemies) {
      if (e.dead || e.A.harmless) continue;
      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (d < 60 && e.counted) near60++; if (d < 120 && e.counted) near120++;
      if (!e.entering && !e.leap && (e.counted || e.kind === 'crate' || e.kind === 'lock' || e.kind === 'seg' || e.kind === 'mime') && d < bd) { bd = d; best = e; }
      const rr = e.kind === 'mime' ? 60 : e.A.big ? 90 : 70;
      if (d < rr && e.A.contact !== 0 || e.kind === 'mime' && d < 50) { const k = (rr - d) / rr * (e.kind === 'brute' && e.state === 'charge' ? 4 : 1.6); fx += dx / d * k; fy += dy / d * k; }
    }
    let danger = false;
    for (const b of W.fShots.list) {
      if (b.dead) continue;
      const tx = b.grav ? b.tx : b.x + b.vx * .3, ty = b.grav ? b.ty : b.y + b.vy * .3; if (tx === undefined) continue;
      const dx = c.x - tx, dy = c.y - ty, d = Math.hypot(dx, dy) || 1;
      if (d < 36) { const k = (36 - d) / 36 * 2.2; fx += dx / d * k; fy += dy / d * k; }
      if (!b.grav) { const rx = b.x - c.x, ry = b.y - c.y, vv = b.vx * b.vx + b.vy * b.vy || 1, tt = -(rx * b.vx + ry * b.vy) / vv; if (tt > 0 && tt < .25) { const mx = rx + b.vx * tt, my = ry + b.vy * tt; if (mx * mx + my * my < 100) danger = true; } }
    }
    const vt = W.arena.hazards.vents; if (vt) for (const v of vt.list) if (v.fire > 0 || v.tele > 0) { const dx = c.x - v.x, dy = c.y - v.y, d = Math.hypot(dx, dy) || 1; if (d < 30) { fx += dx / d * 2.5; fy += dy / d * 2.5; } }
    for (const s of W.arena.splats) { const d = MT.dist(c, s); if (d < 18) { fx += (c.x - s.x) / (d || 1); fy += (c.y - s.y) / (d || 1); } }
    if (W.boss && !W.boss.dead) { const bx = W.boss.x, by = W.boss.y, d = Math.hypot(c.x - bx, c.y - by) || 1; if (d < 90) { fx += (c.x - bx) / d * 2; fy += (c.y - by) / d * 2; } if (W.boss.mic) { const m = W.boss.mic, dm = Math.hypot(c.x - m.x, c.y - m.y) || 1; if (dm < 50) { fx += (c.x - m.x) / dm * 3; fy += (c.y - m.y) / dm * 3; } } }
    // attracted to pickups, the room centre, the chosen exit
    let pk = null, pd = 1e9;
    for (const p of W.pickups) { if (p.dead || p.z > 20) continue; const d = MT.dist(c, p) / (p.kind === 'key' || p.kind === 'cap' || p.kind === 'statue' ? 3 : p.kind === 'prize' ? 2 : 1); if (d < pd) { pd = d; pk = p; } }
    if (pk && pd < 160) { const d = MT.dist(c, pk) || 1; fx += (pk.x - c.x) / d * 1.2; fy += (pk.y - c.y) / d * 1.2; }
    const cxp = AR.cx + Math.cos(B.wander + B.t * .4) * 40, cyp = AR.cy + 30 + Math.sin(B.wander + B.t * .5) * 30;
    { const d = Math.hypot(cxp - c.x, cyp - c.y) || 1; const k = Math.min(1, d / 120) * .7; fx += (cxp - c.x) / d * k; fy += (cyp - c.y) / d * k; }
    if (W.phase === 'exit' || W.phase === 'leaving') {
      const dir = this.pickExit(W, o);
      if (dir) { const P = AR.doors[dir]; const tx = P.x - P.nx * 30, ty = P.y - P.ny * 30; const d = Math.hypot(tx - c.x, ty - c.y) || 1; const pull = (pk && pd < 40) ? 1 : 3; fx = (tx - c.x) / d * pull + fx * .2; fy = (ty - c.y) / d * pull + fy * .2; }
    }
    const L = Math.hypot(fx, fy); if (L > .05) it.move = [fx / Math.max(1, L), fy / Math.max(1, L)];
    // aim: the nearest foe or a boss part, leading it
    let tgt = best && { x: best.x + (best.vx || 0) * .15, y: best.y + (best.vy || 0) * .15 };
    if (W.boss && W.boss.introDone && !W.boss.dead && !W.boss.away) {
      const ps = W.boss.parts.filter(p => W.boss.hittable(p)); let pbest = null, pdist = 1e9;
      const pri = p => (p.armor && (typeof p.armor === 'function' ? p.armor.call(W.boss) : p.armor) < .3 ? 400 : 0);
      for (const p of ps) { const [x, y] = W.boss.partPos(p), d = Math.hypot(x - c.x, y - c.y) + pri(p); if (d < pdist) { pdist = d; pbest = [x, y]; } }
      if (pbest && (!tgt || pdist < bd + 40)) tgt = { x: pbest[0], y: pbest[1] };
    }
    if (tgt) { it.aim = Math.atan2(tgt.y - c.y, tgt.x - c.x); it.fire = true; } else { it.aim = c.aim; it.fire = false; }
    if (danger && c.slideCd <= 0 && MT.R('ai') < .6) it.slide = true;
    const bombAt = o.bombAt || 25;
    if (c.bombs > 0 && near120 >= bombAt && !o.noBomb) it.bomb = true;
    if (o.boat !== false && near60 >= 3 && c.hp >= MT.maxHp() && !danger && c.boatCd <= 0 && near60 < 8) it.showboat = true;
    return it;
  },
  pickExit(W, o) {
    const doors = Object.keys(W.arena.doors).filter(d => W.arena.doors[d].state === 'exit'); if (!doors.length) return null;
    if (o.route) { const want = o.route.find(id => doors.some(d => W.arena.doors[d].dest === id)); if (want) return doors.find(d => W.arena.doors[d].dest === want); }
    if (o.exit && doors.includes(o.exit)) return o.exit;
    return doors.find(d => d === 'N') || doors[0];
  }
};
