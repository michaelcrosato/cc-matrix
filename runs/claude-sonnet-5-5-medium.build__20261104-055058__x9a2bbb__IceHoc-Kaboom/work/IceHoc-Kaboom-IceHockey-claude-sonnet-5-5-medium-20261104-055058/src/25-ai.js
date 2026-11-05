/* ---- TEAM AI ---- */
const AI = (() => {
  const SK = [.35, .55, .75, .95];
  const unit = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  function arrive(s, tx, ty, it, slow = 14) {
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d < 3) { it.mx = 0; it.my = 0; return d; }
    let [ux, uy] = unit(dx, dy), k = clamp(d / slow, 0, 1);
    // stay off the boards unless chasing
    const sdv = Rink.sd(s.x, s.y); if (sdv > -14) { const n = Rink.normalAt(s.x, s.y); ux -= n[0] * .8; uy -= n[1] * .8; [ux, uy] = unit(ux, uy); }
    it.mx = ux * k; it.my = uy * k; return d;
  }
  function avoid(m, s, it, strength) {
    for (const o of m.sk) { if (o === s || o.state === 'bin') continue; const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy); const r = o.side === s.side ? 34 : (s.hasPuck ? 34 : 0); if (d < r && d > .1) { it.mx += dx / d * (1 - d / r) * strength; it.my += dy / d * (1 - d / r) * strength; } }
    const l = Math.hypot(it.mx, it.my); if (l > 1) { it.mx /= l; it.my /= l; }
  }
  const laneBlockers = (m, s, tx, ty) => m.sk.filter(o => o.side !== s.side && o.state !== 'bin' && U.segDist(o.x, o.y, s.x, s.y, tx, ty) < 12).length;
  function think(m, s, dt) {
    const it = s.intent, p = m.puck, side = s.side, dir = Sim.attackDir(m, side), gx = Sim.oppGoalX(m, side), ownX = Sim.ownGoalX(m, side);
    const skill = clamp((m.skill[side] + (s.rt.hnd - 3) * .02) * T.aiSkillMul, .2, 1);
    s.skill = skill; it.turbo = false; it.aim = null;
    s.aiT -= dt; const rethink = s.aiT <= 0; if (rethink) s.aiT = lerp(.3, .12, skill) * (.8 + RNG.sim() * .4);
    const mates = m.sk.filter(o => o.side === side && o !== s && o.state !== 'bin'), foes = m.sk.filter(o => o.side !== side && o.state !== 'bin');
    const carrier = p.owner, mine = carrier && carrier.side === side;
    if (s.hasPuck) {
      // carrier
      const d = Math.hypot(gx - s.x, Rink.CY - s.y), ang = Math.abs(Math.atan2(s.y - Rink.CY, Math.abs(gx - s.x)));
      if (rethink) {
        const pressured = foes.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 26 && ((o.x - s.x) * dir > -4));
        s.plan = null;
        const inZone = d < 240 && ang < PI / 2.6 && (gx - s.x) * dir > 0;
        const bestMate = mates.map(o => ({ o, gain: Math.hypot(gx - s.x, Rink.CY - s.y) - Math.hypot(gx - o.x, Rink.CY - o.y), blk: laneBlockers(m, s, o.x, o.y), d: Math.hypot(o.x - s.x, o.y - s.y) })).filter(c => c.blk === 0 && c.d > 40 && c.d < 280).sort((a, b) => b.gain - a.gain)[0];
        const oneTimerPass = bestMate && bestMate.o.role !== 'D' && Math.hypot(gx - bestMate.o.x, Rink.CY - bestMate.o.y) < 130 && d < 200 && RNG.sim() < .22;
        const far = d < 330 && (gx - s.x) * dir > 0 && ang < PI / 2.2 && laneBlockers(m, s, gx, Rink.CY) === 0 && RNG.sim() < .35;
        if ((inZone && laneBlockers(m, s, gx, Rink.CY) <= 1 && !oneTimerPass) || far) s.plan = { t: 'shoot', hold: d > 130 ? .3 + RNG.sim() * .45 : 0, at: m.t + (0.1 + (1 - skill) * .25) };
        else if (bestMate && (pressured || (bestMate.gain > 80 && RNG.sim() < .3) || oneTimerPass)) s.plan = { t: 'pass', to: bestMate.o, at: m.t + .1 + (1 - skill) * .25 };
        else if (foes.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 30 && (o.x - s.x) * dir > 0) && s.cd.deke <= 0 && RNG.sim() < .4 * s.rt.hnd / 3 * skill) s.plan = { t: 'deke', at: m.t + .05 };
        else if (pressured && !bestMate && d < 300 && (gx - s.x) * dir > 0) s.plan = { t: 'shoot', hold: 0, at: m.t + .15 };
        s.aiGoal = [gx - dir * 40, Rink.CY + (Math.abs(s.y - Rink.CY) < 60 ? (s.y < Rink.CY ? -1 : 1) * 36 : 0) * 0];
        // slalom around nearest defender
        const nd = foes.filter(o => (o.x - s.x) * dir > 0).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
        if (nd && Math.hypot(nd.x - s.x, nd.y - s.y) < 60) s.aiGoal = [gx - dir * 60, nd.y > s.y ? Math.min(s.y, Rink.CY) - 40 : Math.max(s.y, Rink.CY) + 40].map((v, i) => i ? clamp(v, Rink.Y0 + 30, Rink.Y1 - 30) : v);
      }
      if (s.aiGoal) arrive(s, s.aiGoal[0], s.aiGoal[1], it, 10);
      avoid(m, s, it, 1.4);
      it.turbo = foes.every(o => Math.hypot(o.x - s.x, o.y - s.y) > 60) && s.turbo > .2;
      if (s.def[1] === 'STERLING' && !s.twist && d < 260 && (gx - s.x) * dir > 0 && (s.twistCd || 0) <= 0 && RNG.sim() < dt * .8) { s.twist = .6; s.twistCd = 5; s.glow = '#ffd36a'; s.spin = .45; Sim.emit('twister', { s }); }
      s.twistCd = Math.max(0, (s.twistCd || 0) - dt); if (s.twist > 0) { s.twist -= dt; it.mx *= .3; it.my *= .3; if (s.twist <= 0) { s.twist = 0; s.glow = null; s.plan = { t: 'shoot', hold: 0, at: m.t, twister: true }; } }
      const pl = s.plan;
      if (pl && m.t >= pl.at) {
        if (pl.t === 'shoot') { if (!pl.started) { pl.started = m.t; it.shootHeld = true; } const heldT = m.t - pl.started; if (heldT >= pl.hold) { it.shootHeld = false; it.shootUp = true; s.plan = null; } else it.shootHeld = true; }
        else if (pl.t === 'pass') { it.aim = { x: pl.to.x, y: pl.to.y, mate: pl.to }; it.press.pass++; s.plan = null; }
        else if (pl.t === 'deke') { it.press.deke++; s.plan = null; }
      } else if (!pl) { it.shootHeld = false; }
      if (it.shootHeld && s.plan) { it.mx *= .6; it.my *= .6; }
    } else {
      it.shootHeld = false;
      const dist = o => Math.hypot(o.x - p.x, o.y - p.y);
      const px_ = p.x + p.vx * .25, py_ = p.y + p.vy * .25;
      let tx = ownX + dir * 90, ty = Rink.CY, chase = false;
      if (!carrier) { // loose puck: closest per team chases
        const ranks = m.sk.filter(o => o.side === side && o.state !== 'bin').sort((a, b) => Math.hypot(a.x - px_, a.y - py_) - Math.hypot(b.x - px_, b.y - py_));
        if (ranks[0] === s || (ranks[1] === s && Math.hypot(s.x - px_, s.y - py_) < 40)) { chase = true; tx = px_; ty = py_; it.turbo = s.turbo > .3; }
        else if (p.x * 0 + (px_ - Rink.CX) * dir > 0) { tx = px_ - dir * 90; ty = Rink.CY + (s.slot === 1 ? -60 : s.slot === 0 ? 50 : 0); }
        else { tx = ownX + dir * 100; ty = Rink.CY + (s.slot - 1) * 40; }
      } else if (mine) {
        const c = carrier; const front = c.x + dir * 70;
        if (s.role === 'D') { tx = clamp(Rink.CX + dir * 108 - dir * 10, Rink.X0 + 60, Rink.X1 - 60); if ((c.x - Rink.CX) * dir > 108) tx = c.x - dir * 90; ty = Rink.CY + (c.y > Rink.CY ? -1 : 1) * 70; }
        else { const slot = Math.abs(gx - c.x) < 220; tx = slot ? gx - dir * (50 + s.slot * 30) : c.x + dir * 70; ty = slot ? Rink.CY + (s.slot === 1 ? -1 : 1) * (c.y > Rink.CY ? -1 : 1) * 40 + (c.y > Rink.CY ? -30 : 30) : clamp(c.y + (c.y > Rink.CY ? -1 : 1) * 80, Rink.Y0 + 40, Rink.Y1 - 40); }
        if (s.callT > 0) { s.callT -= dt; }
      } else { // defend
        const ranks = m.sk.filter(o => o.side === side && o.state !== 'bin').sort((a, b) => Math.hypot(a.x - carrier.x, a.y - carrier.y) - Math.hypot(b.x - carrier.x, b.y - carrier.y));
        if (ranks[0] === s) { chase = true; tx = carrier.x + carrier.vx * .3; ty = carrier.y + carrier.vy * .3; it.turbo = s.turbo > .3 && Math.hypot(s.x - tx, s.y - ty) > 40;
          const dd = Math.hypot(carrier.x - s.x, carrier.y - s.y);
          s.aiCd = Math.max(0, (s.aiCd || 0) - dt); if (dd < 44 && s.cd.check <= 0 && s.cd.poke <= 0 && s.aiCd <= 0 && RNG.sim() < dt * 3) { if (s.rt.hit >= 3 && RNG.sim() < T.aiAggro * (.6 + skill * .5) + .2) { it.press.shoot++; s.aiCd = 1.2; } else if (dd < 30) { it.press.deke++; s.aiCd = .8; } } }
        else { const tgt = foes.filter(o => o !== carrier).sort((a, b) => Math.hypot(a.x - gx * 0 - ownX, a.y - Rink.CY) - Math.hypot(b.x - ownX, b.y - Rink.CY))[0];
          tx = lerp(ownX + dir * 70, carrier.x, .35); ty = lerp(Rink.CY, carrier.y, .4); if (tgt && s.slot !== 2) { tx = lerp(tx, tgt.x - dir * 20, .5); ty = lerp(ty, tgt.y, .5); } }
      }
      if (m.mascot && m.tactic[0] === 'hunt' && s.side === 0 && s.slot === 1 && !chase && m.mascot.down <= 0) { tx = m.mascot.x; ty = m.mascot.y; if (Math.hypot(s.x - tx, s.y - ty) < 36 && s.cd.check <= 0 && RNG.sim() < dt * 4) it.press.shoot++; }
      // item greed
      if (!chase && T.aiItemGreed > 0 && m.items.length) { const it2 = m.items.filter(i => Math.hypot(i.x - s.x, i.y - s.y) < T.aiItemGreed).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0]; if (it2 && !(mine && s.role === 'C')) { tx = it2.x; ty = it2.y; } }
      tx = clamp(tx, Rink.X0 + 16, Rink.X1 - 16); ty = clamp(ty, Rink.Y0 + 16, Rink.Y1 - 16);
      arrive(s, tx, ty, it, chase ? 6 : 16); avoid(m, s, it, chase ? .3 : 1);
      // one-timer: a pass is on its way to me near the net
      if (s.recvT > 0 && p.passTo === s && Math.hypot(gx - s.x, Rink.CY - s.y) < 150 && Math.hypot(p.x - s.x, p.y - s.y) < 40 && RNG.sim() < .1 + skill * .1) { it.press.shoot++; s.oneTimerT = .35; }
    }
  }
  function park(m, s, tx, ty) { const it = s.intent; it.turbo = false; it.shootHeld = false; arrive(s, tx, ty, it, 18); }
  return { think, park, arrive, SK };
})();
