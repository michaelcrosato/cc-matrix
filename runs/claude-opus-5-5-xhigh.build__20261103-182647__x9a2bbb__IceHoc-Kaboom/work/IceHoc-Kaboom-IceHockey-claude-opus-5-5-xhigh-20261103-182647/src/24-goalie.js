/* ---- GOALIE (7.6): positioning on an arc that cuts the angle, a physical save solver (reaction delay, lateral speed,
 * save shapes that must be in the puck's path), glove freezes, pad and blocker rebounds, butterflies, stacks, poke checks,
 * the KABOOM blast, The Vault's armour, and a manual goalie for the shootout ---- */
const Goalie = (() => {
  function make(m, team, def, home) {
    const g = { id: 100 + team, team, def, x: 0, y: Rink.C.y, z: 0, vx: 0, vy: 0, facing: 0, state: 'ready', stateT: 0, gw: 1, react: 0, tY: Rink.C.y, threat: null, size: 1,
      stats: { saves: 0, sa: 0 }, bitT: 0, vaultHits: 0, cracked: false, manual: false, ph: 0, idleT: 0, rig: null, pokeCD: 0 };
    g.rig = Rigs.goalie(def, home, { size: def.size || 1.3, classic: m.cheats.retro, bigHead: m.cheats.bigHeads });
    return g;
  }
  const net = (m, g) => m.defNet(g.team);
  const out = (m, g) => -Rink.intoNet(net(m, g));   // the direction from its goal line into the rink
  const glovesSide = (m, g) => -out(m, g);         // the catching glove is on its left: -y for the west goalie (facing +x)
  /** the save shapes' scale: size rating, the tuning, Brick Pads, The Vault */
  const scale = (m, g) => (.9 + .033 * g.def.r[1]) * T.goalieReach * (g.bricks > 0 ? 1.35 : 1) * (g.def.boss ? (g.cracked ? 1.08 : 1.22) : 1) * (m.cheats.noGoalies && g.cpu ? .01 : 1);
  function reaction(m, g, threat) {
    let r = T.goalieReact - .015 * (g.def.r[0] - 3) + m.goalieOffset(g.team);
    if (threat.screened) r += .08;
    if (m.puck.twister && g.cpu !== false) r *= 1.25;   // the Golden Twister's curl: read late
    if (g.bitT > 0) r += .12 * (g.def.boss ? 1.5 : 1);
    if (m.kaboom[g.team] > 0) r -= .03;
    return Math.max(.02, r);
  }
  /** where a moving puck will cross the goalie's plane, if it will within 1 s inside the mouth (with a margin) */
  function predict(m, g, pk) {
    const gx = Rink.goalX(net(m, g)), d = out(m, g), plane = g.x;
    const vxIn = -pk.vx * d; if (vxIn < 20) return null;
    const t = (pk.x - plane) * d / vxIn; if (t < 0 || t > 1) return null;
    const tg = (pk.x - gx) * d / vxIn;
    const yc = pk.y + pk.vy * t, zc = Math.max(0, pk.z + pk.vz * t - 210 * t * t), yg = pk.y + pk.vy * tg, zg = pk.z + pk.vz * tg - 210 * tg * tg;
    if (Math.abs(yg - Rink.C.y) > Rink.MOUTH + 6 || zg > Rink.BAR + 4) return null;
    return { yc, zc, t, onNet: Math.abs(yg - Rink.C.y) < Rink.MOUTH && zg < Rink.BAR };
  }
  function update(m, g, dt) {
    g.stateT -= dt; g.bitT = Math.max(0, g.bitT - dt); g.bricks = Math.max(0, (g.bricks || 0) - dt); g.pokeCD = Math.max(0, g.pokeCD - dt); g.idleT += dt;
    const n = net(m, g), gx = Rink.goalX(n), d = out(m, g), pk = m.puck, C = Rink.C;
    if (g.offIce) { g.x = Rink.C.x + (g.team ? 200 : -200); g.y = Rink.Y0 - 40; pose(m, g, dt); return; }
    g.facing = d > 0 ? 0 : PI;
    if (g.state === 'blasted') { g.x = approach(g.x, gx - d * 6, 60 * dt); if (g.stateT <= 0) { g.state = 'ready'; } pose(m, g, dt); return; }
    if (['butterfly', 'glove', 'blocker', 'stack', 'poke', 'down'].includes(g.state) && g.stateT <= 0) g.state = 'ready';
    if (g.state === 'cover' && m.phase === 'play') g.state = 'ready';
    if (m.phase === 'goal' || m.phase === 'final' || m.phase === 'replay') { if (m.phase === 'final' && m.winner === g.team) g.state = 'celebrate'; pose(m, g, dt); return; }
    // where to stand: the arc in front of the goal, cutting the angle to the puck
    // the goalie tracks the puck with a lag (quicker with better reflexes): a cross-crease pass can beat him across
    // a deke makes him bite: while bitten he keeps reading the fake (his tracking holds)
    const rx = pk.owner ? pk.owner.x : pk.x, ry = pk.owner ? pk.owner.y : pk.y, kTr = g.bitT > 0 ? 0 : 1 - Math.exp(-(5 + g.def.r[0] * (g.def.boss ? 1.3 : 1)) * dt);
    if (g.trX === undefined || Math.hypot(rx - g.trX, ry - g.trY) > 300) { g.trX = rx; g.trY = ry; } else { g.trX += (rx - g.trX) * kTr; g.trY += (ry - g.trY) * kTr; }
    const px0 = g.trX, py0 = g.trY;
    const ux = (px0 - gx) * d, dist = Math.hypot(px0 - gx, py0 - C.y);
    let tx, ty;
    if (g.manual) { const it = g.intent || { mx: 0, my: 0 }; tx = g.x + it.mx * 60 * d * 0; ty = clamp(g.y + it.my * 180 * dt * 0, C.y - 20, C.y + 20); g.tY = clamp(g.tY + it.my * 140 * dt, C.y - 18, C.y + 18); g.tOut = clamp((g.tOut || 12) + it.mx * d * 60 * dt, 6, 30); tx = gx + d * g.tOut; ty = g.tY; }
    else if (ux < 2) { ty = C.y + Math.sign(py0 - C.y || 1) * 12; tx = gx + d * 4; }
    else {
      const r = clamp(lerp(10, 26, (dist - 60) / 260), 10, 26), a = Math.atan2(py0 - C.y, (px0 - gx));
      tx = gx + Math.cos(a) * r; ty = C.y + Math.sin(a) * r * .8;
      ty = clamp(ty, C.y - 15, C.y + 15);
    }
    // the save solver: a threat on net (a shot, pass or deflection) after the reaction delay moves it to the crossing
    const th = !pk.owner && pk.inNet < 0 && (m.phase === 'play' || m.phase === 'shootout') ? predict(m, g, pk) : null;
    if (th && !g.manual) {
      const key = (pk.shot ? 's' + pk.shot.t : 'p' + (pk.passT || 0)) + ':' + Math.round(pk.vx) + ':' + Math.round(pk.vy);
      if (!g.threat || g.threat.key !== key) {
        const shotKey = pk.shot ? pk.shot.t : null, same = g.threat && g.threat.shotKey === shotKey && shotKey !== null;
        g.threat = { key, at: m.t, screened: screened(m, g, pk), shotKey, counted: same ? g.threat.counted : false };
        g.react = reaction(m, g, g.threat);
        if (pk.shot && th.onNet && !g.threat.counted) { g.stats.sa++; g.threat.counted = true; }
      }
      if (m.t - g.threat.at >= g.react) {
        ty = clamp(th.yc, C.y - 22, C.y + 22);
        const dy = th.yc - g.y, sc = scale(m, g);
        if (g.state === 'ready' || g.state === 'shuffle') {
          if (Math.abs(dy) > 12 * sc && th.t < .2) { g.state = 'stack'; g.stateT = 1; g.side = Math.sign(dy) * d; }
          else if (th.zc < 9) { g.state = 'butterfly'; g.stateT = .7; }
          else if (Math.abs(dy) > 5) { g.state = Math.sign(dy) === glovesSide(m, g) ? 'glove' : 'blocker'; g.stateT = .45; g.reachY = dy; }
        }
      }
    } else if (!th) g.threat = null;
    // the poke check: a carrier close in front
    if (!g.manual && pk.owner && pk.owner.team !== g.team && g.pokeCD <= 0 && ux > 0 && Math.hypot(pk.owner.x - g.x, pk.owner.y - g.y) < 22) {
      g.pokeCD = 1;
      if (RNG.sim() < .4 * (g.def.r[0] / 3) * (pk.owner.items.tape > 0 ? 0 : 1)) { g.state = 'poke'; g.stateT = .35; Puck.loose(m, pk); pk.vx = d * 160 + (RNG.sim() - .5) * 120; pk.vy = (RNG.sim() - .5) * 200; pk.last = null; Bus.emit('poke', { by: g.id, ok: true, goalie: true }); }
    }
    // move: lateral speed with T-pushes, slower in the butterfly
    const lat = T.goalieLateral * (.85 + .05 * g.def.r[0]) * (g.def.boss && !g.cracked ? .8 : 1) * (g.state === 'butterfly' ? .55 : g.state === 'stack' ? .2 : 1);
    const far = Math.abs(ty - g.y) > 8, sp = far ? Math.max(lat, 230 * (g.state === 'ready' ? 1 : .4)) : lat;
    g.vy = clamp((ty - g.y) * 14, -sp, sp); g.vx = clamp((tx - g.x) * 8, -lat * .6, lat * .6);
    g.y += g.vy * dt; g.x += g.vx * dt;
    if ((g.x - gx) * d < 1) g.x = gx + d * 1;
    g.state = g.state === 'ready' && Math.abs(g.vy) > 30 ? 'shuffle' : g.state === 'shuffle' && Math.abs(g.vy) <= 30 ? 'ready' : g.state;
    pose(m, g, dt);
  }
  function screened(m, g, pk) {
    if (!pk.shot) return false;
    for (const s of m.skaters) { if (s.id === pk.shot.by) continue; const q = U.segPt(s.x, s.y, pk.shot.x, pk.shot.y, g.x, g.y); if (q.d < 14 && q.u > .3 && q.u < .97) return true; }
    return false;
  }
  /** the puck crossing the goalie's plane this substep: inside the current save shape is a save */
  function collide(m, g, pk, ox, oy, oz) {
    if (g.offIce || ['blasted', 'celebrate'].includes(g.state) || (m.cheats.noGoalies && g.cpu)) return false;
    const d = out(m, g), a = (ox - g.x) * d, b = (pk.x - g.x) * d;
    if (!(b < a && a >= -1 && b < 2)) return false;
    const t = a - b > 1e-6 ? clamp(a / (a - b), 0, 1) : 1, yc = oy + (pk.y - oy) * t, zc = oz + (pk.z - oz) * t, dy = yc - g.y, sc = scale(m, g) * (g.def.size ? g.def.size / 1.3 : 1) * (g.def.boss && g.cracked ? 1.4 / 1.75 : 1);
    if (b > 3) return false;
    const st = g.state;
    let hit = null;
    const stand = Math.abs(dy) < 8 * sc && zc < 22 * sc;
    if (st === 'butterfly' || st === 'cover' || st === 'poke') hit = (Math.abs(dy) < 14 * sc && zc < 10) ? 'pad' : (Math.abs(dy) < 6 * sc && zc < 20 * sc) ? 'body' : null;
    else if (st === 'glove' || st === 'blocker') { const ry = Math.sign(g.reachY || 1) * 11 * sc; hit = Math.hypot(dy - ry, zc - 15) < 5.5 * sc ? st : stand ? 'body' : null; }
    else if (st === 'stack') hit = (Math.sign(dy) === Math.sign(g.side * d) || Math.abs(dy) < 6) && Math.abs(dy) < 18 * sc && zc < 8 ? 'pad' : null;
    else hit = stand ? (zc > 12 ? (Math.sign(dy) === glovesSide(m, g) ? 'glove' : 'blocker') : 'pad') : null;
    if (!hit) return false;
    const speed = Math.hypot(pk.vx, pk.vy);
    // KABOOM: the blast
    if (pk.onFire) {
      if (g.def.boss && !g.cracked) {
        g.vaultHits++; pk.onFire = false;
        if (g.vaultHits >= 2) { g.cracked = true; g.def = Object.assign({}, g.def, { r: [g.def.r[0] - 1, g.def.r[1], g.def.r[2]] }); g.rig.o.size = 1.4; Bus.emit('vault_cracked', { goalie: g.id }); }
        else Bus.emit('vault_locked', { goalie: g.id });
        g.state = 'down'; g.stateT = .5; pk.vx = -pk.vx * .25; pk.vy *= .25; pk.vz = 40;
        saveStats(m, g, 'blast-held', false); return true;
      }
      g.state = 'blasted'; g.stateT = 1.2; Bus.emit('blast', { goalie: g.id, x: g.x, y: g.y });
      pk.onFire = false;
      if (RNG.sim() < T.kaboomBlast) { pk.vx *= .8; pk.vy *= .8; return false; }
      pk.vx = d * 20; pk.vy = 0; pk.vz = 0; saveStats(m, g, 'blast', false); return true;
    }
    g.x += 0; pk.x = g.x + d * 2.5; pk.y = yc; pk.z = Math.max(0, zc);
    const freezeK = .06 * (g.def.r[2] - 3);
    if ((hit === 'glove' && RNG.sim() < T.gloveCatch + freezeK) || ((hit === 'pad' || hit === 'body') && st === 'butterfly' && RNG.sim() < .4 + freezeK) || (speed < 140 && RNG.sim() < .7)) {
      pk.vx = pk.vy = pk.vz = 0; g.state = 'cover'; saveStats(m, g, hit, true); Match.freeze(g); return true;
    }
    // a rebound: away from the net, into the slot or the corners
    const ang = (d > 0 ? 0 : PI) + (RNG.sim() - .5) * 1.75, rs = Math.max(90, speed * T.reboundSpeed);
    pk.vx = Math.cos(ang) * rs; pk.vy = Math.sin(ang) * rs; pk.vz = hit === 'blocker' || hit === 'glove' ? 60 : 20; pk.rebound = m.t; pk.last = null; pk.shot = null;
    saveStats(m, g, hit, false); return true;
  }
  function saveStats(m, g, kind, freeze) {
    const shot = m.puck.shot;
    if (g.threat && g.threat.counted && !g.threat.saved) { g.threat.saved = true; g.stats.saves++; }
    Bus.emit('save', { goalie: g.id, team: g.team, kind, freeze, shooter: shot ? shot.by : -1 });
  }
  /** the rig: stances, saves, the blast, celebrations, idle post taps */
  function pose(m, g, dt) {
    const rig = g.rig, hk = rig.hk, st = g.state;
    hk.mode = 'goalie'; hk.ph = (g.ph += dt * Math.abs(g.vy) / 8);
    hk.gst = st === 'shuffle' ? 'shuffle' : st === 'butterfly' || st === 'cover' || st === 'poke' ? 'butterfly' : st === 'stack' ? 'stack' : st === 'blasted' ? 'blasted' : 'ready';
    hk.gw = st === 'ready' || st === 'shuffle' ? 1 : Math.min(1, (hk.gw || 0) + dt * 12);
    hk.side = g.side || 1; hk.crouch = st === 'ready' ? .55 + Math.sin(m.t * 3) * .04 : .7;
    hk.stick = hk.stick || {}; hk.stick.act = st === 'poke' ? 'gpoke' : 'gready'; hk.stick.u = st === 'poke' ? 1 - g.stateT / .35 : 0;
    hk.glove = st === 'glove' ? [3, -Math.min(10, Math.abs(g.reachY || 8)) * 1, 1.4] : st === 'blocker' ? [4.4, -4.6, -1] : [4.4, -4.6, -1];
    const down = st === 'blasted' ? Math.min(1, (1.2 - g.stateT) * 3) : st === 'down' ? .5 : 0;
    rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.facing + (st === 'blasted' ? PI : 0), down, pose: st === 'celebrate' ? 'cheer' : null, expr: st === 'celebrate' ? 'shout' : null, flip: st === 'blasted' ? clamp((1.2 - g.stateT) / 1.2, 0, 1) : 0 });
    if (st === 'blocker') { const J = rig.J, o = rig.o, hand = E.V3.add(J.shC, [3, 9, 1]); const [el, h2] = E.ik3(J.shR, hand, o.armUpper, o.armLower, [-1, .8, -.3]); J.elbowR = el; J.handR = h2; }
  }
  return { make, update, collide, predict, scale, net, out };
})();
