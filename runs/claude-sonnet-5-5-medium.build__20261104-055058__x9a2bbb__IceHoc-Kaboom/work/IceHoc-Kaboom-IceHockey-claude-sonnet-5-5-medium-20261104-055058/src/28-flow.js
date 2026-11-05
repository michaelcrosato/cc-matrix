/* ---- FLOW: the fixed step of a match, phases, goals, periods ---- */
const Flow = (() => {
  const CELEB = ['fist', 'snipe', 'knee', 'guitar', 'glass'];
  function cpuAndHumans(m, dt) {
    for (const h of m.humans) if (!h.remote) Match.humanIntent(m, h, dt);
    Match.autoSwitch(m);
    for (const h of m.humans) { if (h.sk) { Match.applyHuman(m, h); if (m.cfg.autoHuman && (m.phase === 'play' || (m.phase === 'faceoff' && m.fo && m.fo.dropped))) AI.think(m, h.sk, dt); } }
    for (const s of m.sk) if (s.ctrl.kind === 'cpu' && !m.cfg.freezeAI) {
      if (m.phase === 'play' || (m.phase === 'faceoff' && m.fo && m.fo.dropped)) AI.think(m, s, dt);
      else if (m.phase === 'faceoff') AI.park(m, s, s.tx, s.ty);
      else if (m.phase === 'goal') parkGoal(m, s);
      else if (m.phase === 'fight') parkFight(m, s);
      else if (m.phase === 'stoppage' || m.phase === 'periodEnd' || m.phase === 'final') parkIdle(m, s);
    }
  }
  function parkGoal(m, s) { const sc = m.scorer; if (s === sc) { s.intent.mx = s.intent.my = 0; return; } if (sc && s.side === sc.side) AI.park(m, s, sc.x - Math.cos(sc.heading) * 14 + (s.slot - 1) * 16, sc.y + (s.slot - 1) * 14); else { const it = s.intent; it.mx = it.my = 0; } }
  function parkFight(m, s) { const f = m.fight; if (!f || s === f.a || s === f.b) return; const a = Math.atan2(s.y - f.cy, s.x - f.cx), tx = f.cx + Math.cos(a) * 52, ty = f.cy + Math.sin(a) * 40; AI.park(m, s, tx, ty); }
  function parkIdle(m, s) { const it = s.intent; it.mx *= .9; it.my *= .9; if (Math.hypot(s.vx, s.vy) < 6) { it.mx = it.my = 0; } }
  // ----------- movement -----------
  function move(m, dt) {
    const sk = m.sk;
    for (const s of sk) {
      s.pickCool = Math.max(0, s.pickCool - dt); s.hitT = Math.max(0, s.hitT - dt); s.flipT = Math.max(0, s.flipT - dt); s.spin = Math.max(0, (s.spin || 0) - dt);
      if (s.dekeBeat) { s.dekeBeat.t -= dt; if (s.dekeBeat.t <= 0) s.dekeBeat = null; }
      if (s.state === 'bin') { s.bin -= dt; s.x = (s.side ? Rink.CX + 36 : Rink.CX - 36); s.y = Rink.Y0 - 20; s.vx = s.vy = 0; if (s.bin <= 0) { s.state = 'skate'; s.st = 0; s.x = s.side ? Rink.CX + 40 : Rink.CX - 40; s.y = Rink.Y0 + 10; m.sinBin = m.sinBin.filter(x => x !== s); Sim.emit('bin_out', { s }); } continue; }
      if (s.state !== 'fight' && s.state !== 'celebrate') s.st -= dt;
      let it = s.intent, extra = { infiniteTurbo: s.items.hotsauce > 0 || m.kaboom[s.side] > 0 || m.cfg.infTurbo && s.ctrl.kind === 'human', speedMul: (m.tactic[s.side] === 'finesse' ? 1.04 : 1) * (s.items.cocoa > 0 ? 1.2 : 1) * (m.cfg.story && m.cfg.story.id === 5 && s.side === 1 && m.period >= 3 && m.boostOn ? 1.1 : 1) * (m.doris && m.doris.t > 0 && s.side === 0 ? m.doris.mul : 1) };
      if (s.hasPuck) {} s.turboOn = false;
      switch (s.state) {
        case 'pass': case 'shoot': if (s.st <= 0) s.state = 'skate'; break;
        case 'check': if (s.st <= 0) s.state = 'skate'; else { extra.turnMul = .35; } break;
        case 'deke': if (s.st <= 0) s.state = 'skate'; else extra.noStop = true; break;
        case 'poke': if (s.st <= 0) { s.state = 'skate'; s.pokeDone = false; } else { extra.speedMul *= .85; } break;
        case 'stun': if (s.st <= 0) s.state = 'skate'; else extra.speedMul *= .4; break;
        case 'down': it = { mx: 0, my: 0, turbo: false }; { const sp = Math.hypot(s.vx, s.vy); const k = Math.max(0, sp - 220 * dt) / (sp || 1); s.vx *= k; s.vy *= k; } if (s.st <= 0) { s.state = 'getup'; s.st = .5; } break;
        case 'getup': it = { mx: 0, my: 0, turbo: false }; s.vx *= .9; s.vy *= .9; if (s.st <= 0) s.state = 'skate'; break;
        case 'slip': it = { mx: 0, my: 0, turbo: false }; if (s.st <= 0) { s.state = 'getup'; s.st = .5; } break;
        case 'frozen': s.vx = s.vy = 0; if (s.st <= 0) { s.state = 'skate'; s.y -= 30; } break;
        case 'buried': s.vx = s.vy = 0; if (s.st <= 0) s.state = 'skate'; break;
        case 'fight': case 'celebrate': it = { mx: 0, my: 0, turbo: false }; { const sp = Math.hypot(s.vx, s.vy), k = Math.max(0, sp - 160 * dt) / (sp || 1); s.vx *= k; s.vy *= k; } break;
        case 'wind': break;
      }
      if (s.state === 'down' || s.state === 'getup' || s.state === 'slip' || s.state === 'frozen' || s.state === 'buried' || s.state === 'fight' || s.state === 'celebrate') { s.x += s.vx * dt; s.y += s.vy * dt; if (s.state !== 'frozen' && s.state !== 'buried') s.turbo = Math.min(1, s.turbo + dt * .1); }
      else {
        const ev = Skating.skateStep(s, it, dt, extra);
        if (ev.includes('stop')) Sim.emit('stop', { s });
        if (s.state === 'check') { /* hold heading toward lunge */ }
        s.x += s.vx * dt; s.y += s.vy * dt;
      }
      const sp = Math.hypot(s.vx, s.vy); Rink.addScuff(s.x, s.y, .0025 * sp / 132 * 60 * dt, m.kaboom[s.side] > 0 ? .05 * dt * 60 : 0);
      if (s.state === 'stop') Rink.addScuff(s.x, s.y, .12 * dt * 12);
      if (m.kaboom[s.side] > 0 && sp > 60 && RNG.fx() < .3) Sim.emit('kaboom_skate', { s });
    }
    // skater-skater pushes
    for (let i = 0; i < sk.length; i++) for (let j = i + 1; j < sk.length; j++) {
      const a = sk[i], b = sk[j]; if (a.state === 'bin' || b.state === 'bin' || a.state === 'fight' && b.state === 'fight') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = 14; if (d >= md || d < .01) continue;
      const nx = dx / d, ny = dy / d, ov = md - d, ma = a.mass, mb = b.mass, tot = ma + mb;
      a.x -= nx * ov * mb / tot; a.y -= ny * ov * mb / tot; b.x += nx * ov * ma / tot; b.y += ny * ov * ma / tot;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) { const j2 = -(1.3) * vn / (1 / ma + 1 / mb); a.vx -= j2 / ma * nx; a.vy -= j2 / ma * ny; b.vx += j2 / mb * nx; b.vy += j2 / mb * ny;
        if (-vn > T.accidentalHit && a.side !== b.side && a.state !== 'check' && b.state !== 'check') { for (const [x, y] of [[a, b], [b, a]]) if (['skate', 'stop'].includes(x.state) && Math.hypot(x.vx, x.vy) < 120 && RNG.sim() < .7) { x.state = 'stun'; x.st = .5; } Sim.emit('accident', { a, b }); } }
    }
    for (const s of sk) {
      if (s.state === 'bin') continue;
      const cb = Rink.clampBody(s, 7);
      if (cb) { const vn = s.vx * cb.n[0] + s.vy * cb.n[1]; if (vn > 0) { const snow = m.arena.id === 'pond'; Hits.boardHit(m, s, vn, cb.n); s.vx -= (1 + (snow ? .3 : .3)) * vn * cb.n[0]; s.vy -= (1 + .3) * vn * cb.n[1]; const tx = -cb.n[1], ty = cb.n[0], vt = s.vx * tx + s.vy * ty; s.vx -= vt * .15 * tx; s.vy -= vt * .15 * ty;
          if (snow && s.hitT > 0 && vn > T.glassCrack * .6 && s.state === 'down') { s.state = 'buried'; s.st = 1.5; Sim.emit('buried', { s }); }
          if (s.rig && vn > 100) s.rig.kick && s.rig.kick(-.4); } }
      // nets and posts
      for (const e of [0, 1]) { const gx = Rink.goalLineX(e), d = e === 0 ? -1 : 1, lo = Math.min(gx, gx + d * (Rink.NETD + 4)) - 6, hi = Math.max(gx, gx + d * (Rink.NETD + 4)) + 6; if (s.x > lo && s.x < hi && Math.abs(s.y - Rink.CY) < Rink.GHALF + 7) { const toFront = (s.x - gx) * -d; if (toFront > -2 || (s.x - gx) * d < 4) { s.x = gx - d * 8; s.vx *= .3; } else { s.x = gx + d * (Rink.NETD + 11); s.vx *= .3; } } }
      for (const g of m.gl) { const dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy), md = 7 + 8; if (d < md && d > .01) { s.x += dx / d * (md - d); s.y += dy / d * (md - d); } }
      if (s.state === 'down' && s.hitT > 0 && m.thin.length) Items.breakIceAt(m, s.x, s.y, s.hitBig ? 100 : 50);
    }
    // referee drifts away from play
    const r = m.ref, p = m.puck, tx = p.x - Math.sign(p.x - Rink.CX) * 40 + 0, ty = Rink.CY - 50 * Math.sign(p.y - Rink.CY || 1);
    if (m.phase === 'faceoff' && m.fo) { r.x += (m.fo.x - r.x) * .1; r.y += (m.fo.y - 14 - r.y) * .1; }
    else { r.x += clamp(tx - r.x, -60 * dt, 60 * dt); r.y += clamp(ty - r.y, -60 * dt, 60 * dt); }
    for (const s of sk) { const d = Math.hypot(s.x - r.x, s.y - r.y); if (d < 12 && Math.hypot(s.vx, s.vy) > 120 && r.down <= 0) { r.down = 2; Sim.emit('ref_down', { s }); } } r.down = Math.max(0, r.down - dt);
    const rsp = Math.hypot(r.x - (r.px || r.x), r.y - (r.py || r.y)) / dt; r.vx = (r.x - (r.px || r.x)) / dt; r.vy = (r.y - (r.py || r.y)) / dt; r.px = r.x; r.py = r.y; if (rsp > 5) r.heading = Math.atan2(r.vy, r.vx);
  }
  function animate(m, dt) {
    for (const s of m.sk) {
      const rg = s.rig, st = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, facing: s.heading + (s.spin > 0 ? (1 - s.spin / .45) * TAU : 0) };
      switch (s.state) {
        case 'down': st.down = .9; st.flip = s.flipT > 0 ? 1 - s.flipT / .8 : undefined; break;
        case 'getup': st.pose = 'kneel'; break;
        case 'slip': st.down = .9; st.flip = .5; break;
        case 'check': st.attack = E.move('bash', clamp(1 - s.st / .3, 0, 1)); st.sprint = true; break;
        case 'poke': st.attack = E.move('thrust', clamp(1 - s.st / .35, 0, 1)); break;
        case 'shoot': case 'pass': st.attack = E.move('backslash', clamp(1 - s.st / .3, 0, 1)); break;
        case 'wind': st.crouch = .3; st.attack = E.move('overhead', .3); break;
        case 'stun': st.pose = 'wave'; st.hurt = true; break;
        case 'stop': st.crouch = .5; break;
        case 'celebrate': st.pose = 'cheer'; st.expr = 'shout'; break;
        case 'fight': { const a = s.fightAct; st.stance = 'guard'; st.expr = 'angry'; if (s.duck) st.crouch = .6; if (a && a.kind === 'jab') st.attack = E.move('jab', s.fightU); else if (a && a.kind === 'hay') st.attack = E.move('haymaker', s.fightU); else if (a && a.kind === 'yank') st.attack = E.move('cross', s.fightU); if (s.stagger > 0) st.hurt = true; const f = m.fight; if (f && f.winner) { const w = f.winner === s; if (w) st.pose = 'cheer'; else if (f.winner !== 'draw') st.down = .9; } break; }
        case 'frozen': st.vx = st.vy = 0; break;
        default: st.sprint = s.turboOn;
      }
      if (s.state === 'skate' && s.hasPuck && Math.hypot(s.vx, s.vy) < 20) st.stance = 'ready';
      if (m.phase === 'final' && !s.hideFinal) { const w = m.score[0] === m.score[1] ? -1 : m.score[0] > m.score[1] ? 0 : 1; if (s.side === w) { st.pose = 'cheer'; } else if (w >= 0) st.pose = 'kneel'; }
      rg._lean = ['skate', 'stop', 'wind', 'shoot', 'pass'].includes(s.state) ? clamp(Math.hypot(s.vx, s.vy) / 132, 0, 1.4) * (s.turboOn ? 1.3 : 1) * .6 : 0;
      rg._skid = s.state === 'stop' ? 1 : 0;
      s.rigState = st; rg.update(dt, st);
    }
    for (const g of m.gl) {
      const st = { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.heading };
      if (g.state === 'butterfly' || g.state === 'stack') { st.crouch = 1; } else if (g.state === 'glove') { st.pose = 'wave'; } else if (g.state === 'blasted') st.down = .9; else if (g.state === 'cover') st.crouch = .8; else st.crouch = .35 + (Math.sin(m.t * 2) * .05);
      const winner = m.phase === 'final' && ((m.score[0] > m.score[1] ? 0 : 1) === g.side); if (winner) st.pose = 'cheer';
      g.rig._flare = g.state === 'butterfly' || g.state === 'stack' ? 1 : 0;
      g.rig.update(dt, st);
    }
    const r = m.ref; r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx || 0, vy: r.vy || 0, facing: r.heading, down: r.down > 0 ? .9 : 0, pose: m.phase === 'goal' ? 'wave' : undefined });
    if (m.mascot) { const pe = m.mascot; pe.rig.update(dt, { x: pe.x, y: pe.y, z: 0, vx: Math.cos(pe.heading) * 40, vy: Math.sin(pe.heading) * 40, facing: pe.heading, down: pe.down > 0 ? .9 : 0, pose: pe.state === 'dance' ? undefined : undefined }); }
  }
  // ----------- the step -----------
  function step(m, dt) {
    dt *= T.gameSpeed; m.t += dt; m.pt += dt;
    if (m.cfg.remoteClient) return;
    if (m.holdSim) { animate(m, dt); return; }
    const ph = m.phase;
    if (m.phase === 'replay') { Replay.step(m, dt); return; }
    if (m.phase === 'flood') { Flood.step(m, dt); Flow.floodAnimate && 0; animate(m, dt); return; }
    if (m.phase === 'shootout') { shootoutStep(m, dt); return; }
    if (m.pendingChallenge) Fight.stepPending(m, dt);
    cpuAndHumans(m, dt);
    // actions
    for (const s of m.sk) if (s.state !== 'bin') Match.actions(m, s, dt);
    if (m.phase === 'fight') Fight.step(m, dt);
    // faceoff
    if (m.phase === 'faceoff') stepFaceoff(m, dt);
    const live = m.phase === 'play' || m.phase === 'faceoff' || m.phase === 'goal' || m.phase === 'stoppage' || m.phase === 'periodEnd' || m.phase === 'fight' || m.phase === 'final' || m.phase === 'intro';
    if (live) move(m, dt);
    if (m.phase === 'play' || m.phase === 'goal' || m.phase === 'fight' || m.phase === 'faceoff') { Puck.step(m, dt); for (const g of m.gl) { if (m.cfg.noGoalie) { g.x = Rink.X0 - 100; g.y = Rink.Y0 - 100; g.state = 'ready'; } else Goalie.step(m, g, dt); } }
    if (m.phase === 'play' || m.phase === 'fight') { if (m.phase === 'play') Hits.stepChecks(m); Items.step(m, dt); }
    if (m.phase === 'play') Fight.stepChallenges(m, dt);
    for (const side of [0, 1]) m.dekeBite[side] = Math.max(0, m.dekeBite[side] - dt);
    // deke beat detection
    for (const s of m.sk) if (s.dekeBeat && s.dekeBeat.from) { for (const id of s.dekeBeat.from) { const o = m.sk.find(x => x.id === id); if (o && Math.hypot(o.x - s.x, o.y - s.y) > 55 && !s.dekeBeat.done) { s.dekeBeat.done = true; Sim.addBoom(m, s.side, 6); Sim.emit('deke_beat', { s, from: o }); } } }
    Boom.step(m, dt);
    // clock + flow
    if (m.phase === 'play') {
      m.clock -= dt; Ch5.tick(m, dt);
      if (m.puck.out) { m.puck.out = false; stoppage(m, 'out'); }
      else if (m.puck.frozen) { stoppage(m, 'frozen'); }
      else if (m.goalPending) onGoal(m);
      else if (m.clock <= 0) periodEnd(m);
    } else if (m.phase === 'goal' || m.phase === 'faceoff') { if (m.goalPending && m.phase !== 'goal') { m.goalPending = null; } }
    switch (m.phase) {
      case 'intro': if (m.pt > (m.cfg.introLen || 4.2)) { faceoffStart(m); } break;
      case 'goal': stepGoal(m, dt); break;
      case 'stoppage': if (m.pt > 1.6) { if (m.after) { const f = m.after; m.after = null; f(); } else { const d = Rink.nearestDot(m.puck.x, m.puck.y, true); Match.faceoffNow(d[0], d[1]); } } break;
      case 'periodEnd': if (m.pt > 3) afterPeriod(m); break;
      case 'final': if (m.pt > 4.5 && !m.over) { m.over = true; Bus.emit('match_over', { m }); } break;
    }
    // sin bin power-play bookkeeping
    for (const s of m.sk) if (s.state === 'bin' && m.phase !== 'play' && m.phase !== 'faceoff') { /* timer only runs in play */ }
    animate(m, dt);
    Replay.record(m, dt);
    Bus.emit('step', { m, dt });
  }
  function shootoutStep(m, dt) {
    for (const h of m.humans) if (!h.remote) Match.humanIntent(m, h, dt);
    Match.autoSwitch(m); for (const h of m.humans) { if (h.sk && !h.goalieMode) Match.applyHuman(m, h); }
    const so = m.so; if (so && so.shooter && so.shooter.ctrl.kind === 'cpu' && so.state === 'live') AI.think(m, so.shooter, dt);
    else if (so && so.shooter && so.state === 'setup') { so.shooter.intent.mx = so.shooter.intent.my = 0; }
    for (const s of m.sk) { if (s.parked) { s.intent.mx = s.intent.my = 0; s.vx = s.vy = 0; } else if (so && so.state !== 'live' && so.state !== 'setup') { s.intent.mx *= .9; s.intent.my *= .9; } }
    if (so && so.state === 'setup') { for (const s of m.sk) if (!s.parked) { s.intent.mx = s.intent.my = 0; s.vx *= .8; s.vy *= .8; } }
    for (const s of m.sk) if (!s.parked && s.state !== 'bin') { if (!(so && so.state === 'setup')) Match.actions(m, s, dt); }
    const parkedPos = m.sk.filter(s => s.parked).map(s => [s, s.x, s.y]);
    move(m, dt); for (const [s, x, y] of parkedPos) { s.x = x; s.y = y; s.vx = s.vy = 0; }
    Puck.step(m, dt); for (const g of m.gl) Goalie.step(m, g, dt); if (so && so.state === 'live') Hits.stepChecks(m);
    Shootout.step(m, dt); Boom.step(m, dt); animate(m, dt); Replay.record(m, dt); Bus.emit('step', { m, dt });
  }
  function stepFaceoff(m, dt) {
    const fo = m.fo; if (!fo) return; fo.t += dt;
    if (!fo.dropped && fo.t >= fo.drop) { fo.dropped = true; fo.dropAt = m.t; m.puck.vz = 60; m.puck.z = 1; Sim.emit('faceoff_drop', {}); }
    if (fo.dropped && !fo.resolved && m.t - fo.dropAt > .22) {
      fo.resolved = true; const cs = [m.sk.find(s => s.side === 0 && s.slot === 0), m.sk.find(s => s.side === 1 && s.slot === 0)];
      const score = [0, 0]; for (const i of [0, 1]) { const c = cs[i]; let tt = fo.press[i]; if (fo.early && fo.early[i]) tt = 9; if (c.ctrl.kind === 'cpu') tt = lerp(.3, .1, c.skill) + RNG.sim() * .12; else if (tt < 0) tt = 9; score[i] = -tt + (c.rt.hnd - 3) * .015 + RNG.sim() * .02; }
      const w = score[0] >= score[1] ? 0 : 1; fo.winner = w; m.stats.faceoffs[w]++; const wc = cs[w], dir = Sim.attackDir(m, w);
      m.noPickup = false; m.puck.vz = 0; m.puck.z = 0; m.puck.vx = -dir * 110 + (RNG.sim() - .5) * 20; m.puck.vy = (RNG.sim() - .5) * 60;
      const mate = m.sk.find(s => s.side === w && s.slot === 2); if (mate && RNG.sim() < .6) { m.puck.vx = -dir * 130; m.puck.vy = (mate.y - m.puck.y) * .8; }
      m.phase = 'play'; m.pt = 0; Sim.emit('faceoff_win', { s: wc, side: w });
    }
  }
  function faceoffStart(m) { Match.faceoffNow(Rink.CX, Rink.CY, true); m.phase = 'faceoff'; }
  function stoppage(m, why) { m.phase = 'stoppage'; m.pt = 0; Sim.emit('whistle', { why }); if (m.cfg.drill) { m.after = () => Drills.respawn(m); return; } if (why === 'frozen') { const g = m.frozenBy; if (g) m.after = () => { const d = Rink.nearestDot(g.x, g.y, true); Match.faceoffNow(d[0], d[1]); }; } }
  // ----------- goals -----------
  function onGoal(m) {
    const gp = m.goalPending; m.goalPending = null; const side = gp.side, p = m.puck;
    m.score[side]++;
    let sc = gp.shooter && gp.shooter.side === side ? gp.shooter : null;
    const mine = p.touches.filter(t => t.side === side); if (!sc) sc = mine[mine.length - 1] || m.sk.find(s => s.side === side);
    const asst = []; for (let i = mine.length - 1; i >= 0 && asst.length < 2; i--) if (mine[i] !== sc && !asst.includes(mine[i]) && (i < mine.length - 1 || mine[i] !== sc)) { if (mine[i] !== sc) asst.push(mine[i]); }
    const pp = m.sinBin.some(s => s.side !== side) && !m.sinBin.some(s => s.side === side);
    sc.stats.goals++; asst.forEach(a => a.stats.assists++);
    const rec = { side, scorer: sc, assists: asst, period: m.period, clock: m.clock, shot: gp.type, fire: gp.fire, pp, deke: sc.dekeBeat != null || gp.type === 'deke', vault: m.gl[1 - side].boss };
    m.stats.goals.push(rec); m.scorer = sc; Sim.addBoom(m, side, 20); m.kaboom[1 - side] = 0;
    for (const h of m.humans) { /* nothing */ }
    m.phase = 'goal'; m.pt = 0; m.noPickup = true; p.owner = null; m.phaseNoPlay = true;
    sc.state = 'celebrate'; sc.st = 99; sc.celeb = CELEB[(RNG.fx() * CELEB.length) | 0]; sc.celebT = 0;
    if (sc.stats.goals === 3) { sc.stats.hat++; Sim.emit('hat_trick', { s: sc }); }
    Sim.emit('goal', rec);
    if (m.arena.hazard && m.arena.hazard.startsWith('octopus') && (m.arena.hazard === 'octopus' || RNG.sim() < .15)) m.octos.push({ x: Rink.CX + (RNG.sim() - .5) * 200, y: Rink.CY + (RNG.sim() - .5) * 120, t: 20, rat: false });
    if (m.arena.hazard === 'octopus' && RNG.sim() < .5) m.octos.push({ x: Rink.CX + (RNG.sim() - .5) * 300, y: Rink.CY + (RNG.sim() - .5) * 140, t: 10, rat: true, vx: 40, vy: 30 });
    m.replayReq = { goal: rec };
  }
  function stepGoal(m, dt) {
    const sc = m.scorer; if (sc) sc.celebT += dt;
    if (!m.replayDone && m.pt > 2.6 && m.cfg.replays !== false && S('replays') !== 'Off' && !m.cfg.noReplay && Replay.canPlay(m)) { m.replayDone = true; Replay.start(m, 'goal'); return; }
    if (m.pt > (m.cfg.goalLen || 3.8)) { m.replayDone = false; m.phaseNoPlay = false; if (sc && sc.state === 'celebrate') { sc.state = 'skate'; sc.st = 0; } afterGoal(m); }
  }
  function afterGoal(m) {
    if (m.cfg.drill) return Drills.respawn(m);
    for (const s of m.sk) if (s.state === 'celebrate') { s.state = 'skate'; }
    Rink.panels.forEach(p => { if (p.st === 2 && RNG.sim() < 1) p.st = 0; });
    if (m.ot && !m.so) { return finalize(m); }
    if (m.cfg.maxGoals && Math.max(...m.score) >= m.cfg.maxGoals) return finalize(m);
    Match.faceoffNow(Rink.CX, Rink.CY, false);
  }
  // ----------- periods -----------
  function periodEnd(m) {
    Sim.emit('horn_period', { period: m.period });
    if (m.ot) { m.phase = 'periodEnd'; m.pt = 0; m.noPickup = true; return; }
    m.phase = 'periodEnd'; m.pt = 0; m.phaseNoPlay = true;
  }
  function afterPeriod(m) {
    m.phaseNoPlay = false; Rink.panels.forEach(p => { if (p.st === 2) p.st = 0; });
    if (m.ot) { if (m.cfg.shootout && !m.cfg.session) return Shootout.begin(m); return finalize(m); }
    if (m.period < m.periods) { const next = () => { m.period++; m.clock = m.cfg.periodLen; m.end = [m.end[1], m.end[0]]; for (const g of m.gl) { /* positions reset in faceoff */ } m.boom = m.boom.map(x => x); Match.faceoffNow(Rink.CX, Rink.CY, true); if (m.cfg.story && m.cfg.story.id === 5) Bus.emit('period_start', { m, period: m.period }); }; if (Flood.wanted(m)) { m.phase = 'flood'; m.pt = 0; Flood.begin(m, next); } else next(); return; }
    if (m.cfg.showcase && m.score[0] !== m.score[1] && !m.showcaseDone) { m.showcaseDone = true; m.bonusSO = true; return Shootout.begin(m); }
    if (m.score[0] === m.score[1]) {
      if (m.cfg.ot) { m.ot = true; m.period = m.periods + 1; m.clock = m.cfg.session ? 60 : 120; m.end = [m.end[1], m.end[0]]; Bus.emit('overtime', {}); Match.faceoffNow(Rink.CX, Rink.CY, true); return; }
      if (m.cfg.shootout) return Shootout.begin(m);
    }
    finalize(m);
  }
  function finalize(m) { m.phase = 'final'; m.pt = 0; m.phaseNoPlay = true; m.puck.owner = null; Sim.emit('final', { score: m.score.slice() }); }
  // ----------- pause menu helpers -----------
  function showInfo() { const m = Match.cur(); if (!m) return; const lines = m.cfg.story ? m.cfg.story.objectives.map(o => (Objectives.done(o.id) ? '★ ' : '- ') + o.text).join('\n') : m.teams[0].name + ' vs ' + m.teams[1].name + '\n' + m.arena.name; try { game.note(lines.split('\n').join('  |  ')); } catch (e) {} }
  function restart() { const cfg = Match.cur() && Match.cur().cfg; if (cfg && Scenes.restartMatch) Scenes.restartMatch(); }
  return { step, move, animate, onGoal, showInfo, restart, finalize, stoppage, parkGoal };
})();
