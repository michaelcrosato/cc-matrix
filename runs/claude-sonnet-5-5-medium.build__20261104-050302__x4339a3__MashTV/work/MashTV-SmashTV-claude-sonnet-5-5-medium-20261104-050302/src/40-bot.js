// MASH TV: the bot. A potential field: repelled by enemies, foe bullets and hazards; attracted to pickups and the chosen exit; aims with lead and always fires.
MT.botRoute = {};   // room id -> exit direction; otherwise the first listed exit
MT.bot = {
  think(w, c) {
    const out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: 'bot' }; const o = c.botOpts || {};
    if (c.state !== 'alive' && c.state !== 'walkin') return out;
    let mx = 0, my = 0;
    const live = w.enemies.filter(e => e.alive && !e.hidden); const counted = live.filter(e => e.count !== false);
    // --- repel enemies
    for (const e of live) {
      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1; const danger = (e.kind === 'brute' || e.kind === 'tank' || e.kind === 'snake' ? 1.6 : e.kind === 'mime' ? 1.4 : e.kind === 'crate' || e.kind === 'lock' || e.kind === 'segment' ? 0 : 1);
      const R = (e.kind === 'mime' ? 50 : e.kind === 'brute' ? 90 : 62) * (danger ? 1 : 0); if (d < R) { const k = (R - d) / R * danger * 2.2; mx += dx / d * k; my += dy / d * k; }
    }
    // --- bullets (predicted)
    let threat = null, tmin = 1e9;
    for (const b of w.fShots.list) { if (b.dead) continue; const px = b.x + b.vx * .3, py = b.y + b.vy * .3; const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy); if (d < 40) { const k = (40 - d) / 40 * 1.8; mx += dx / (d || 1) * k; my += dy / (d || 1) * k; }
      const rx = c.x - b.x, ry = c.y - b.y, sp = Math.hypot(b.vx, b.vy) || 1, t = (rx * b.vx + ry * b.vy) / (sp * sp); if (t > 0 && t < .3) { const cx = b.x + b.vx * t - c.x, cy = b.y + b.vy * t - c.y; if (Math.hypot(cx, cy) < b.r + 9 && t < tmin) { tmin = t; threat = b; } } }
    for (const l of w.lobs) { if (l.kind === 'tomato' || l.kind === 'tot') { const d = Math.hypot(c.x - l.tx, c.y - l.ty); if (d < 24) { mx += (c.x - l.tx) / (d || 1) * 1.5; my += (c.y - l.ty) / (d || 1) * 1.5; } } }
    for (const h of w.hazards) if (h.kind === 'pyro') for (const v of h.vents) if (v.state !== 'off') { const d = Math.hypot(c.x - v.x, c.y - v.y); if (d < 30) { mx += (c.x - v.x) / (d || 1) * 2.4; my += (c.y - v.y) / (d || 1) * 2.4; } }
    if (w.boss && !w.boss.hidden) { const b = w.boss, d = Math.hypot(c.x - b.x, c.y - b.y); const R = (b.contactR || 0) + 40; if (b.contactR && d < R) { mx += (c.x - b.x) / (d || 1) * 2; my += (c.y - b.y) / (d || 1) * 2; } if (b.kind === 'mashy' && b.sub === 'tele') { const px2 = c.x - b.x, py2 = c.y - b.y; mx += -Math.sin(b.ca) * Math.sign(px2 * -Math.sin(b.ca) + py2 * Math.cos(b.ca)) * 1.2; my += Math.cos(b.ca) * Math.sign(px2 * -Math.sin(b.ca) + py2 * Math.cos(b.ca)) * 1.2; } }
    // --- attraction
    let best = null, bv = 0;
    for (const p of w.pickups) { if (p.caged && !w.keyCage.open) continue; const d = Math.hypot(p.x - c.x, p.y - c.y); if (d > 200) continue; const val = { key: 9, cap: 6, bomb: 4, life: 5, prize: 4, case: 3, bar: 2.5, stack: 2, bill: 1.2, statue: 20 }[p.kind] || 1; const sc = val / (d + 20); if (sc > bv) { bv = sc; best = p; } }
    if (best && !(o.noPickups)) { const dx = best.x - c.x, dy = best.y - c.y, d = Math.hypot(dx, dy) || 1; const k = Math.min(1.6, 1.0 + (best.kind === 'key' ? 1 : 0)); mx += dx / d * k; my += dy / d * k; }
    // exit
    if (w.phase === 'exit' || (w.phase === 'clear' && w.rm.boss && false)) {
      let dn = o.route && o.route[w.rm.id] || MT.botRoute[w.rm.id] || Object.keys(w.rm.exits)[0]; if (!w.rm.exits[dn]) dn = Object.keys(w.rm.exits)[0];
      if (dn) { const D = MT.DOORS[dn], dx = D.x - c.x, dy = D.y - c.y, d = Math.hypot(dx, dy) || 1; const pickupLeft = w.pickups.some(p => (p.cash || p.kind === 'key' || p.kind === 'cap') && Math.hypot(p.x - c.x, p.y - c.y) < 120) && w.phaseT < 10; mx += dx / d * (pickupLeft ? .5 : 2.5); my += dy / d * (pickupLeft ? .5 : 2.5); }
    } else if (!best || bv < .005) { const dx = MT.CX - c.x, dy = MT.CY - c.y, d = Math.hypot(dx, dy) || 1; if (d > 30) { mx += dx / d * .35; my += dy / d * .35; } }
    // walls
    const wm = 26; if (c.x < 16 + wm && !(w.phase === 'exit')) mx += (16 + wm - c.x) / wm * 1.2; if (c.x > 352 - wm) mx -= (c.x - 352 + wm) / wm * 1.2; if (c.y < 16 + wm) my += (16 + wm - c.y) / wm * 1.2; if (c.y > 224 - wm) my -= (c.y - 224 + wm) / wm * 1.2;
    if (c.state === 'walkin') { out.move = [0, 0]; }
    const ml = Math.hypot(mx, my); if (ml > .05) { out.move = [mx / ml * Math.min(1, ml), my / ml * Math.min(1, ml)]; }
    // --- aim at the best target
    let tgt = null, td = 1e9;
    const near = counted.filter(e => !e.entering || true); const pool = counted.length ? counted : live.filter(e => e.kind !== 'mime' || Math.hypot(e.x - c.x, e.y - c.y) > 40);
    for (const e of pool) { if (e.invuln) continue; const d = Math.hypot(e.x - c.x, e.y - c.y) - (e.kind === 'crate' || e.kind === 'lock' ? 20 : 0); if (d < td) { td = d; tgt = e; } }
    let bt = null; if (w.boss && !w.boss.hidden && (w.phase === 'boss' || w.phase === 'bossIntro')) {
      let bs = -1; for (const t of w.boss.hitParts()) { const d = Math.hypot(t.x - c.x, t.y - c.y); const pri = (t.part.main ? 1 : 3) * (t.part.tv ? 1.5 : 1) * (w.boss.armorOf(t.part) < .5 ? .2 : 1); const s = pri / (d + 30); if (s > bs) { bs = s; bt = t; } }
    }
    const T = (bt && (!tgt || td > 60)) ? bt : tgt;
    if (T) { const d = Math.hypot(T.x - c.x, T.y - c.y), lead = d / (MT.T.bulletSpeed || 330); const vx = T.vx || 0, vy = T.vy || 0; out.aim = Math.atan2(T.y + vy * lead - c.y, T.x + vx * lead - c.x); out.fire = true; }
    else { out.aim = c.aim; out.fire = false; }
    if (c.wpn === 'popcorn') out.fire = out.fire && td < 140;
    // --- actions
    if (threat && tmin < .25 && c.slideCd <= 0 && !o.noSlide) { out.slide = true; const px = -threat.vy, py = threat.vx, l = Math.hypot(px, py) || 1; out.move = [px / l, py / l]; if (c.x < 40 || c.x > 328) out.move = [-px / l, -py / l]; }
    const close = live.filter(e => e.count !== false && Math.hypot(e.x - c.x, e.y - c.y) < 120).length;
    if ((close >= 25 || (o.bombBoss && w.boss && w.phase === 'boss' && w.time % 20 < .05)) && (c.bombs > 0 || w.cheats.infBombs)) out.bomb = true;
    else if (c.hp >= c.maxHp && c.boatCd <= 0 && c.slideT <= 0 && !threat) { const c60 = live.filter(e => e.count !== false && Math.hypot(e.x - c.x, e.y - c.y) < 60).length; if (c60 >= 3 && !o.noBoat) out.showboat = true; }
    if (o.forceBoat && c.boatCd <= 0) out.showboat = true;
    return out;
  }
};
MT.addBot = function (look) {
  const run = MT.run, w = MT.worldNow; if (!run) return null; const slot = [0, 1, 2, 3].find(s => !run.cs.some(c => c.slot === s)); if (slot === undefined) return null;
  const c = MT.newContestant(slot, { look: look === undefined ? slot : look, kind: 'bot', input: null }); c.nextLife = MT.EXTRA_LIVES[0]; run.cs.push(c); c.state = 'alive'; if (w) { w.respawn(c); c.hp = c.maxHp; if (!w.cs.includes(c)) w.cs.push(c); } return c;
};
