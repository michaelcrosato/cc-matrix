/* ---- PUCK + GOALIES ---- */
const Puck = (() => {
  const R = 1.6;
  const mk = () => ({ x: Rink.CX, y: Rink.CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, prev: null, inNet: -1, out: false, fire: false, shotBy: null, shotType: '', shotSpeed: 0, onGoal: false, passTo: null, passT: 0, age: 0, touches: [], bulge: [0, 0], frozen: false });
  const blade = s => Rigs.stickPoint(s);
  function release(m, s) { if (!s) return; s.hasPuck = false; s.pickCool = .25; if (m.puck.owner === s) m.puck.owner = null; }
  function take(m, s) {
    const p = m.puck; if (p.owner) { p.owner.hasPuck = false; }
    const wasPass = p.passTo === s; p.owner = s; s.hasPuck = true; p.vx = s.vx; p.vy = s.vy; p.vz = 0; p.z = 0;
    if (p.last && p.last !== s) { p.prev = p.last; }
    if (p.last && p.last.side !== s.side) { s.stats.takeaways++; Sim.emit('takeaway', { s }); }
    else if (wasPass && p.last && p.last.side === s.side) { Sim.addBoom(m, s.side, 2); Sim.emit('pass_complete', { s, from: p.last }); m.stats.passes[s.side]++; }
    p.last = s; p.passTo = null; p.onGoal = false; p.fire = false;
    const t = p.touches; if (!t.length || t[t.length - 1] !== s) { t.push(s); if (t.length > 4) t.shift(); }
    s.touchT = m.t; s.recvT = 0; p.passT = 0;
    if (s.oneTimerT > 0) { s.oneTimerT = 0; shoot(m, s, 'onetimer', .85, null); }
  }
  function pass(m, s, tx, ty, mate, saucer) {
    const p = m.puck; if (p.owner !== s) return false;
    const d0 = Math.hypot(tx - s.x, ty - s.y); let spd = clamp(220 + .9 * d0, T.passMin, T.passMax) * (.9 + .033 * s.rt.pas) * (saucer ? .8 : 1);
    let ax = tx, ay = ty;
    if (mate) { for (let i = 0; i < 2; i++) { const tf = Math.hypot(ax - s.x, ay - s.y) / spd; ax = mate.x + mate.vx * tf * .9; ay = mate.y + mate.vy * tf * .9; } ax = clamp(ax, Rink.X0 + 20, Rink.X1 - 20); ay = clamp(ay, Rink.Y0 + 14, Rink.Y1 - 14); }
    let a = Math.atan2(ay - s.y, ax - s.x) + (RNG.sim() - .5) * 2 * .06 * (1.3 - .1 * s.rt.pas);
    release(m, s); const bp = blade(s); p.x = bp[0]; p.y = bp[1]; p.z = 0;
    if (saucer) { const d = Math.hypot(ax - s.x, ay - s.y), tf = d / (spd * .85); p.vx = Math.cos(a) * d / tf; p.vy = Math.sin(a) * d / tf; p.vz = 700 * tf / 2 + 0; p.vz = (T.saucerApex > 0 ? Math.sqrt(2 * 700 * T.saucerApex) : 120); p.vx = Math.cos(a) * d / (2 * p.vz / 700); p.vy = Math.sin(a) * d / (2 * p.vz / 700); }
    else { p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd; p.vz = 0; }
    p.last = s; p.passTo = mate || null; p.passT = 2; p.saucer = !!saucer; s.state = 'pass'; s.st = .25; s.swing = .2; s.heading = a;
    if (mate) { mate.recvT = 1.2; }
    Sim.emit('pass', { s, mate, saucer }); return true;
  }
  function shoot(m, s, type, charge, aim) {
    const p = m.puck; if (p.owner !== s) return false;
    const sht = s.rt.sht, mulS = .85 + .05 * sht, kab = m.kaboom[s.side] > 0 && charge >= .95 && type === 'slap';
    let spd, sig, lift;
    const lum = s.items.lumber > 0;
    if (type === 'wrist') { spd = T.wristSpeed * mulS; sig = 5 * (1.3 - .1 * sht); lift = 2 + RNG.sim() * 8; }
    else if (type === 'onetimer') { spd = (T.slapBase + T.slapGain * .85) * mulS * T.oneTimerBonus; sig = 7 * (1.3 - .1 * sht) * .5; lift = 3 + RNG.sim() * 8; }
    else { spd = (T.slapBase + T.slapGain * charge) * mulS; sig = 7 * (1.3 - .1 * sht) * (1.4 - .4 * charge); lift = 4 + RNG.sim() * 14; }
    if (s.turboOn) spd *= 1.12; if (lum) { spd *= 1.3; sig = 0; s.lumberShots--; if (s.lumberShots <= 0) s.items.lumber = 0; }
    if (m.cfg.drill === 3) sig *= .25;
    if (kab) { spd = 760; sig = 0; type = 'kaboom'; }
    spd = Math.min(spd, 760);
    // aim point
    const gx = Sim.oppGoalX(m, s.side), gdir = Sim.attackDir(m, s.side), gy = Rink.CY, gk = m.gl[1 - s.side];
    let tx = gx + gdir * 6, ty;
    if (aim && aim.x != null) { // line through the aim hits the goal plane
      const dx = aim.x - s.x, dy = aim.y - s.y; if (dx * gdir > 8) { const t = (gx - s.x) / dx; ty = clamp(s.y + dy * t, gy - 13, gy + 13); } else ty = null;
      if (ty == null && aim.far != null) ty = gy + aim.far * 12;
    } else if (aim && aim.far != null) ty = gy + aim.far * 12;
    if (ty == null) { const open = gk.y > gy ? -1 : 1; ty = gy + open * 9 + (RNG.sim() - .5) * 4; if (Math.abs(s.y - gy) > 70) ty = gy + (s.y > gy ? -1 : 1) * 8; }
    const a0 = Math.atan2(ty - s.y, tx - s.x), a = a0 + (RNG.sim() - .5) * 2 * sig * PI / 180;
    release(m, s); const bp = blade(s); p.x = bp[0]; p.y = bp[1]; p.z = 0;
    p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd;
    const top = type === 'slap' && gk.state !== 'ready' && gk.state !== 'shuffle' && charge > .6;
    const dist = Math.max(8, Math.hypot(tx - s.x, ty - s.y)), tt = dist / spd, zt = kab ? 8 : top ? 14 + RNG.sim() * 3 : lift;
    p.vz = kab ? 0 : clamp((zt + 350 * tt * tt) / tt, 0, 230) * (dist < 30 ? .4 : 1);
    p.twister = !!(s.def[1] === 'STERLING' && s.plan && s.plan.twister);
    p.last = s; p.passTo = null; p.shotBy = s; p.shotType = type; p.shotSpeed = spd; p.fire = kab; p.onGoal = Math.abs(ty - gy) < Rink.GHALF + 1; p.shotT = m.t;
    s.state = 'shoot'; s.st = .3; s.swing = .3; s.heading = a0; s.stats.shots++; m.stats.shots[s.side]++; s.stats.topShot = Math.max(s.stats.topShot, spd);
    if (p.onGoal) { m.stats.sog[s.side]++; Sim.addBoom(m, s.side, 4); Bus.emit('shot_on_goal', { s, kind: type }); }
    Sim.emit('shot', { s, kind: type, spd, kab, aim0: a0 }); return true;
  }
  function netConfine(m, p, e) { // keep a scored puck in the net box
    const gx = Rink.goalLineX(e), d = e === 0 ? -1 : 1, bx = gx + d * Rink.NETD;
    const lo = Math.min(gx, bx) + R, hi = Math.max(gx, bx) - R;
    if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx) * .2; } if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx) * .2; }
    p.y = clamp(p.y, Rink.CY - Rink.GHALF + R, Rink.CY + Rink.GHALF - R); p.vy *= .5;
  }
  function step(m, dt) {
    const p = m.puck; p.age += dt; p.passT = Math.max(0, p.passT - dt);
    p.bulge[0] = Math.max(0, p.bulge[0] - dt * 14); p.bulge[1] = Math.max(0, p.bulge[1] - dt * 14);
    if (p.frozen) return;
    if (p.owner) {
      const o = p.owner, bp = blade(o), k = Math.min(1, 30 * dt), sp = Math.hypot(o.vx, o.vy), weave = sp < 80 ? Math.sin(m.t * 9) * 3 * (1 - sp / 80) : 0;
      const side = [-Math.sin(o.heading) * weave, Math.cos(o.heading) * weave];
      p.x += (bp[0] + side[0] - p.x) * k; p.y += (bp[1] + side[1] - p.y) * k; p.z = 0; p.vx = o.vx; p.vy = o.vy; p.vz = 0;
      if (p.inNet >= 0) p.inNet = -1;
      return;
    }
    const N = 4, h = dt / N;
    for (let i = 0; i < N; i++) {
      const px_ = p.x, py_ = p.y; let sp = Math.hypot(p.vx, p.vy);
      if (p.z <= .01 && p.vz <= 0) { const f = (T.puckFriction + T.puckDrag * sp) * h; sp = Math.max(0, sp - f); const k = sp / (Math.hypot(p.vx, p.vy) || 1); p.vx *= k; p.vy *= k; }
      if (p.z > 0 || p.vz > 0) { p.vz -= 700 * h; p.z += p.vz * h; if (p.z <= 0) { p.z = 0; if (p.vz < -60) { p.vx *= .9; p.vy *= .9; Sim.emit('puck_land', {}); } p.vz = Math.abs(p.vz) > 40 ? -p.vz * .3 : 0; } }
      sp = Math.hypot(p.vx, p.vy); if (sp > 760) { p.vx *= 760 / sp; p.vy *= 760 / sp; }
      p.x += p.vx * h; p.y += p.vy * h;
      if (p.inNet >= 0) { netConfine(m, p, p.inNet); continue; }
      // goal / posts / net walls
      for (const e of [0, 1]) {
        const gx = Rink.goalLineX(e), d = e === 0 ? -1 : 1, bx = gx + d * Rink.NETD;
        const crossed = (px_ - gx) * d <= 0 && (p.x - gx) * d > 0;
        if (crossed) {
          const t = (gx - px_) / ((p.x - px_) || 1), yy = py_ + (p.y - py_) * t, zz = p.z;
          if (Math.abs(yy - Rink.CY) < Rink.GHALF - R * .6 && zz < 20 - R) { p.inNet = e; p.bulge[e] = 6; Sim.emit('goal_line', { end: e }); const defSide = m.end[0] === e ? 0 : 1; m.goalPending = { side: 1 - defSide, shooter: p.shotBy, fire: p.fire, type: p.shotType, spd: p.shotSpeed }; p.x = gx + d * 1; p.vx *= .3; p.vy *= .3; continue; }
          if (Math.abs(yy - Rink.CY) < Rink.GHALF + 2 && zz >= 18 && zz < 23) { p.vz = -Math.abs(p.vz) * .8; p.z = 18; p.vx = -p.vx * .8; p.x = gx - d * 1; Sim.emit('post', { bar: true, spd: sp }); }
        }
        for (const sy of [-1, 1]) { const pxx = gx, pyy = Rink.CY + sy * Rink.GHALF, dd = Math.hypot(p.x - pxx, p.y - pyy); if (dd < 1.5 + R && p.z < 21) { const nx = (p.x - pxx) / (dd || 1), ny = (p.y - pyy) / (dd || 1), vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= 1.82 * vn * nx; p.vy -= 1.82 * vn * ny; p.x = pxx + nx * (1.5 + R + .1); p.y = pyy + ny * (1.5 + R + .1); if (Math.hypot(p.vx, p.vy) > 70) Sim.emit('post', { spd: sp, shot: p.shotBy && p.last === p.shotBy }); } } }
        // net side/back walls (from outside)
        if (Math.min(gx, bx) - R < p.x && p.x < Math.max(gx, bx) + R && Math.abs(p.y - Rink.CY) < Rink.GHALF + R) {
          const inside = Math.abs(p.y - Rink.CY) < Rink.GHALF - R && (p.x - gx) * d > 0;
          if (!inside && p.z < 20) { // hit net side
            if (Math.abs(py_ - Rink.CY) >= Rink.GHALF) { p.y = Rink.CY + Math.sign(py_ - Rink.CY) * (Rink.GHALF + R); p.vy = -p.vy * .2; p.vx *= .8; Sim.emit('net_touch', {}); }
            else if ((px_ - bx) * d >= 0) { p.x = bx + d * R; p.vx = -p.vx * .2; Sim.emit('net_touch', {}); }
          }
        }
      }
      // boards and glass
      const dB = Rink.sd(p.x, p.y);
      if (dB > -R) {
        const n = Rink.normalAt(p.x, p.y), vn = p.vx * n[0] + p.vy * n[1];
        if (p.z < Rink.BOARD) { if (vn > 0) { const vt = [p.vx - vn * n[0], p.vy - vn * n[1]]; p.vx = vt[0] * .92 - vn * T.boardBounce * n[0]; p.vy = vt[1] * .92 - vn * T.boardBounce * n[1]; if (vn > 100) Sim.emit('boards', { vn, x: p.x, y: p.y }); } p.x -= n[0] * (dB + R); p.y -= n[1] * (dB + R); }
        else {
          const pn = Rink.panelAt(p.x, p.y), gh = Rink.BOARD + (Math.abs(n[0]) > .5 ? 40 : 28);
          if (pn.st === 2 || p.z >= gh) { p.out = true; Sim.emit('puck_out', { glass: pn.st === 2 }); }
          else { if (vn > 0) { const vt = [p.vx - vn * n[0], p.vy - vn * n[1]]; p.vx = vt[0] * .9 - vn * .5 * n[0]; p.vy = vt[1] * .9 - vn * .5 * n[1]; if (vn > 80) Sim.emit('glass_ping', { vn }); } p.x -= n[0] * (dB + R); p.y -= n[1] * (dB + R); }
        }
      }
      // goalies and bodies
      for (const g of m.gl) Goalie.puckCheck(m, g, px_, py_);
      if (p.z < 12) for (const s of m.sk) {
        if (s.state === 'bin' || s.state === 'frozen' || s.state === 'buried' || s.hasPuck) continue;
        const dd = Math.hypot(p.x - s.x, p.y - s.y), sp2 = Math.hypot(p.vx, p.vy);
        if (dd < 7 + R && sp2 > 120 && !(p.last === s && p.age < .3) && (p.shotBy ? p.shotBy.side !== s.side : true) && !(p.passTo === s)) {
          const nx = (p.x - s.x) / (dd || 1), ny = (p.y - s.y) / (dd || 1), vn = p.vx * nx + p.vy * ny;
          if (vn < 0) { p.vx -= 1.35 * vn * nx; p.vy -= 1.35 * vn * ny; p.x = s.x + nx * (7 + R + .1); p.y = s.y + ny * (7 + R + .1);
            if (p.shotBy && p.shotBy.side !== s.side && sp2 > 150) { Sim.emit('block', { s, shooter: p.shotBy }); p.shotBy = null; p.onGoal = false; } else Sim.emit('body_hit', {}); }
        }
      }
      if (p.out) break;
    }
    pickups(m, dt);
  }
  function eligible(s) { return s.pickCool <= 0 && !['down', 'getup', 'stun', 'bin', 'frozen', 'buried', 'slip', 'celebrate', 'fight', 'wind'].includes(s.state); }
  function pickups(m, dt) {
    const p = m.puck; if (p.z > 6 || p.inNet >= 0 || m.noPickup) return;
    const cands = [];
    for (const s of m.sk) {
      if (!eligible(s)) continue;
      const bp = blade(s), db = Math.hypot(p.x - bp[0], p.y - bp[1]), dc = Math.hypot(p.x - s.x, p.y - s.y);
      const rad = T.pickupRadius * (.85 + .05 * s.rt.hnd) * (s.items.tape > 0 ? 1.3 : 1);
      if (db < rad || dc < 10) cands.push([Math.min(db, dc), s]);
    }
    if (!cands.length) return;
    cands.sort((a, b) => a[0] - b[0]);
    let pick = cands[0][1];
    if (cands.length > 1 && cands[1][1].side !== pick.side) { // puck battle
      if ((m.battleT = (m.battleT || 0) + dt) > .2) { m.battleT = 0; const sc = x => x.rt.hnd + x.rt.hit / 2 + RNG.sim() * 3; pick = sc(cands[0][1]) >= sc(cands[1][1]) ? cands[0][1] : cands[1][1]; Sim.emit('battle', {}); }
      else if (!p.owner) return;
    }
    if (p.owner) { // stealing from a carrier by poke or check is handled in Hits; contact alone doesn't take it
      return;
    }
    const rel = Math.hypot(p.vx - pick.vx, p.vy - pick.vy);
    if (rel < 300 || p.passTo === pick) { take(m, pick); }
    else { const chance = clamp(1.3 - rel / 450 + .08 * (pick.rt.hnd - 3), .1, 1); if (RNG.sim() < chance) take(m, pick); else { p.vx *= .5; p.vy *= .5; pick.pickCool = .2; Sim.emit('deflect', {}); } }
  }
  return { mk, step, pass, shoot, take, release, blade, R };
})();

const Goalie = (() => {
  const diffOff = m => [.06, .02, 0, -.02][m.diff] || 0;
  const scale = g => (.9 + .033 * g.size) * (g.itemBig > 0 ? 1.35 : 1) * (g.boss ? (g.bossCracked ? 1.4 : 1.75) / 1.3 : 1);
  function home(m, g) { return { x: Sim.ownGoalX(m, g.side), dir: Sim.attackDir(m, g.side) }; }
  function predict(m, g) { // where the puck will cross the goal line within 1 s
    const p = m.puck, gx = Sim.ownGoalX(m, g.side), d = m.end[g.side] === 0 ? -1 : 1; if (p.owner || p.inNet >= 0 || p.vx * d <= 20) return null;
    const t = (gx - p.x) / p.vx; if (t < 0 || t > 1) return null;
    const yc = p.y + p.vy * t, zc = Math.max(0, p.z + p.vz * t - 350 * t * t); if (Math.abs(yc - Rink.CY) > 30) return null; return { yc, zc, t };
  }
  function step(m, g, dt) {
    const p = m.puck, hm = home(m, g), skill = m.diffGoalie[g.side];
    g.st += dt; g.blastT = Math.max(0, g.blastT - dt); g.itemBig = Math.max(0, g.itemBig - dt); g.bulge = Math.max(0, g.bulge - dt * 8);
    const lat = T.goalieLateral * (.85 + .05 * g.rfx) * (m.kaboom[g.side] > 0 ? 1.1 : 1) * (g.boss && !g.bossCracked ? .9 : 1);
    if (g.state === 'blasted') { g.x += g.blastV * dt; g.blastV *= .94; g.rig.pose = 'down'; if (g.blastT <= 0) { g.state = 'ready'; g.st = 0; } return; }
    if (g.state === 'cover') { if (g.st > 1.6 && !m.holdCover) { g.state = 'ready'; } return; }
    if (g.state === 'stack' && g.st > 1) { g.state = 'ready'; }
    // positioning
    let ty, depth = 10, px_ = p.x, py_ = p.y;
    if (g.manual) { const mi = g.manual; ty = clamp(g.y + mi.mx * 160 * dt * 0, Rink.CY - 30, Rink.CY + 30); g.y = clamp(g.y + mi.my * lat * dt, Rink.CY - 26, Rink.CY + 26); g.x = hm.x + hm.dir * clamp(g.depthM = clamp((g.depthM || 10) + mi.mx * hm.dir * 80 * dt, 6, 28), 6, 28); }
    else {
      const dpuck = Math.hypot(px_ - hm.x, py_ - Rink.CY);
      const behind = (px_ - hm.x) * hm.dir < 0;
      depth = behind ? 6 : clamp(26 - dpuck / 14, 10, 26);
      const a = Math.atan2(py_ - Rink.CY, (px_ - hm.x) * hm.dir);
      ty = behind ? Rink.CY + Math.sign(py_ - Rink.CY) * 14 : Rink.CY + clamp(Math.sin(a) * depth * 1.15, -18, 18);
      // save solver
      const pr = predict(m, g);
      if (pr && !g.save) {
        let react = T.goalieReact - .015 * (g.rfx - 3) + diffOff(m) + skill;
        const scr = m.sk.some(s => s.side !== g.side && Math.hypot(s.x - px_, s.y - py_) < 40 && U.segDist(s.x, s.y, p.x, p.y, hm.x, pr.yc) < 14); if (scr) react += .08;
        if (m.dekeBite[g.side] > 0) react += .12 * (g.boss && !g.bossCracked ? 1.5 : 1);
        if (m.kaboom[g.side] > 0) react -= .03;
        g.save = { yc: pr.yc, zc: pr.zc, tc: pr.t, at: m.t + react, type: pr.zc < 9 ? 'butterfly' : pr.zc > 10 ? ((pr.yc - Rink.CY) * g.hand * hm.dir >= 0 ? 'glove' : 'blocker') : 'stand', t0: m.t };
        if (Math.abs(pr.yc - g.y) > 14 * scale(g) && pr.t < .2) g.save.type = 'stack';
      }
      if (g.save) {
        if (m.t >= g.save.at) { ty = g.save.yc; g.state = g.save.type === 'butterfly' ? 'butterfly' : g.save.type === 'glove' ? 'glove' : g.save.type === 'blocker' ? 'blocker' : g.save.type === 'stack' ? 'stack' : 'ready'; if (g.state === 'stack' && g.st === 0) g.st = 0; }
        if (m.t > g.save.t0 + 1.4) g.save = null;
      } else if (g.state !== 'ready' && g.state !== 'stack' && g.st > .5) g.state = 'ready';
      // poke
      if (p.owner && p.owner.side !== g.side && !g.pokeCd && Math.hypot(p.owner.x - g.x, p.owner.y - g.y) < 22 && (p.owner.x - g.x) * hm.dir > 0 && RNG.sim() < .4 * (.85 + .05 * g.rfx) * dt * 3) { g.pokeCd = 1.2; g.state = 'poke'; g.st = 0; Puck.release(m, p.owner); p.vx = hm.dir * 80; p.vy = (RNG.sim() - .5) * 120; Sim.emit('goalie_poke', { g }); }
      g.pokeCd = Math.max(0, (g.pokeCd || 0) - dt);
      if (g.state === 'poke' && g.st > .4) g.state = 'ready';
      const burst = g.save && m.t >= g.save.at ? 230 : lat;
      g.y += clamp(ty - g.y, -burst * dt, burst * dt); g.y = clamp(g.y, Rink.CY - 24, Rink.CY + 24);
      g.x += clamp(hm.x + hm.dir * depth - g.x, -60 * dt, 60 * dt);
    }
    g.heading = Math.atan2(py_ - g.y, px_ - g.x);
  }
  /** called each puck substep: the puck crossed the goalie's plane? */
  function puckCheck(m, g, ox, oy) {
    const p = m.puck; if (p.owner || g.state === 'blasted' || g.state === 'cover' || p.inNet >= 0) return;
    const d = m.end[g.side] === 0 ? -1 : 1; // direction toward the goal line = the shot direction
    if (p.vx * d <= 0) return;
    const crossed = (ox - g.x) * d < 0 && (p.x - g.x) * d >= 0; if (!crossed) return;
    const k = scale(g), dy = p.y - g.y, z = p.z, sp = Math.hypot(p.vx, p.vy);
    if (!p.shotBy && !p.passTo && sp < 100) return;
    let saved = false, glove = false, kind = 'pad';
    const st = g.state;
    if (Math.abs(dy) < 6.5 * k && z < 22 * k) saved = true;
    if (!saved && st === 'butterfly' && ((Math.abs(dy) < 11 * k && z < 10 * k) || (Math.abs(dy) < 5 * k && z < 20 * k))) saved = true;
    if (!saved && (st === 'glove' || st === 'blocker') && z > 9 && z < 22 * k && Math.abs(dy) < 12 * k) { saved = true; glove = st === 'glove'; kind = glove ? 'glove' : 'blocker'; }
    if (!saved && st === 'stack' && Math.abs(dy) < 18 * k && z < 8) saved = true;
    if (!saved) return;
    if (p.twister && RNG.sim() < .25) return;
    // Talks to Posts: Lemmy's quirk
    if (g.trait === 'Talks to Posts' && Math.abs(Math.abs(p.y - Rink.CY) - Rink.GHALF) < 4 && RNG.sim() < .2) { return; }
    // kaboom blast
    if (p.fire && p.shotBy) {
      if (g.boss && !g.bossCracked) { g.kaboomHits++; Sim.emit('vault_locked', { n: g.kaboomHits }); if (g.kaboomHits >= 2) { g.bossCracked = true; Sim.emit('vault_cracked', {}); } p.vx = -p.vx * .3; p.vy = (RNG.sim() - .5) * 200; p.fire = false; g.state = 'ready'; g.stun = .6; return; }
      g.state = 'blasted'; g.blastT = 1.2; g.st = 0; g.blastV = -d * -1 * 0; g.blastV = d * 160; Sim.emit('blast', { g, shooter: p.shotBy });
      if (RNG.sim() < T.kaboomBlast) { p.vx *= .8; p.fire = true; return; } p.vx = 0; p.vy = 0; p.fire = false; return;
    }
    g.saves++; g.shots++; p.shotBy && (p.onGoal = false); g.state = glove ? 'glove' : g.state; g.st = 0; g.bulge = 1;
    const sh = p.shotBy; Sim.addBoom(m, g.side, 5);
    const frz = glove ? T.gloveCatch + .06 * (g.reb - 3) : st === 'butterfly' ? .4 + .06 * (g.reb - 3) : 0;
    if (RNG.sim() < frz) { p.x = g.x; p.y = g.y; p.vx = p.vy = p.vz = 0; p.frozen = true; g.state = 'cover'; g.st = 0; m.frozenBy = g; Sim.emit('save', { g, shooter: sh, kind, froze: true }); return; }
    const away = d * -1, ang = (RNG.sim() - .5) * 2 * (50 * PI / 180); p.vx = Math.cos(ang) * sp * .35 * away; p.vy = Math.sin(ang) * sp * .35 + (dy > 0 ? 40 : -40); p.vz = 30; p.x = g.x - d * 3; p.last = null; p.shotBy = null; p.passTo = null;
    Sim.emit('save', { g, shooter: sh, kind, froze: false });
  }
  return { step, puckCheck, scale, predict };
})();
