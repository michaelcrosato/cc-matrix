/* ---- Boss: the Kaboom Cup's set pieces (Gilded Boost, Doris's organ); deke_beat detection ---- */
const Boss = (() => {
  function step(dt) {
    // a deke that leaves a defender behind within 1 s
    for (const s of M.skaters) {
      if (!s.dekeAt || M.t - s.dekeAt > 1 || !s.dekeVs || !s.dekeVs.length || M.puck.owner !== s) continue;
      const g = Skater.attackGoal(s.team), dir = -Rink.outDir(g.side);
      for (const id of s.dekeVs) { const o = M.byId[id]; if (o && (o.x - s.x) * dir > 12) { Bus.emit('deke_beat', { by: s.id, victim: o.id, team: s.team, name: s.name, vname: o.name }); s.dekeVs = []; break; } }
    }
    for (const t of [0, 1]) if (M.boost[t] > 0 && M.boost[t] < 99) M.boost[t] = Math.max(0, M.boost[t] - dt);
    if (!M.cfg.boss) return;
    const gTeam = M.cfg.home === 'grizzlies' ? 0 : 1, mTeam = 1 - gTeam;
    if (M.period >= 3 && !M.boostOn) { M.boostOn = true; M.boost[gTeam] = 99; Bus.emit('boost_start', { team: gTeam }); }
    const early = M.cfg.doris !== 'late';
    if (!M.organDone && ((early && M.period === 2 && M.clock < M.cfg.len - 3) || (!early && M.period === 3 && M.clock < 60))) {
      M.organDone = true; M.boost[mTeam] = 20; Boom.add(mTeam, early ? 30 : 45); Bus.emit('organ_boost', { team: mTeam, late: !early });
    }
  }
  return { step };
})();

/* ---- Shootout: three rounds each, then sudden death; a manual goalie for a defending human (PLAN 7.14) ---- */
const Shootout = (() => {
  const C = Rink.C;
  function start(showcase) {
    M.so = { showcase: !!showcase, round: 0, team: 0, results: [[], []], t: 0, state: 'pause', pause: 1.5, shooter: null, n: [0, 0], winner: null };
    M.period = M.cfg.periods + (M.ot ? 2 : 1);
    Match.setPhase('shootout'); Bus.emit('shootout_start', { showcase: !!showcase });
    for (const s of M.skaters) { s.off = true; s.x = C.x + (s.team ? 60 : -60) + s.slot * 16; s.y = Rink.Y0 - 10; }
  }
  function setup() {
    const so = M.so, t = so.team, list = M.skaters.filter(s => s.team === t), shooter = list[so.n[t] % list.length];
    so.n[t]++; so.shooter = shooter; so.t = 0; so.state = 'go'; so.shot = false;
    for (const s of M.skaters) { s.off = s !== shooter; if (s.off) { s.x = C.x + (s.team ? 60 : -60) + s.slot * 16; s.y = Rink.Y0 - 10; s.vx = s.vy = 0; } }
    const g = Skater.attackGoal(t), dir = -Rink.outDir(g.side);
    Object.assign(shooter, { x: C.x + dir * 10, y: C.y, vx: 0, vy: 0, facing: dir > 0 ? PI : 0, state: 'skate', shootHold: 0, winding: false, charge: 0, ai: AI.fresh(shooter) });
    shooter.facing = Math.atan2(0, g.x - shooter.x);
    // a human on the shooting team takes the shooter
    const hs = M.humans.find(h => h.team === t); if (hs) Match.give(hs, shooter); else if (shooter.human) { shooter.ctrl = 'cpu'; }
    const p = M.puck; Object.assign(p, { x: shooter.x, y: shooter.y, z: 0, vx: 0, vy: 0, vz: 0, held: false, inNet: false, dead: false, onFire: false, owner: null, lastTouch: null });
    Puck.take(shooter, p);
    const gl = M.goalies[1 - t]; gl.x = g.x + dir * 8; gl.y = C.y; gl.state = 'ready'; gl.track = null;
    const hd = M.humans.find(h => h.team === 1 - t && !M.attract);
    gl.manual = !!hd; gl.human = hd || null; gl.mx = gl.x; gl.my = gl.y;
    for (const g2 of M.goalies) if (g2 !== gl) { g2.manual = false; }
    so.startX = shooter.x; so.dir = dir;
  }
  function step(dt) {
    const so = M.so; if (!so) return;
    if (so.state === 'pause') { so.pause -= dt; if (so.pause <= 0) { if (so.winner !== null) return finish(); setup(); } return; }
    if (so.state !== 'go') return;
    so.t += dt;
    const gl = M.goalies[1 - so.team];
    if (gl.manual && gl.human) manual(gl, dt);
    const p = M.puck, s = so.shooter, g = Skater.attackGoal(so.team);
    if (!p.owner && p.lastTouch === s) so.shot = true;
    const behind = (p.x - g.x) * -so.dir > 2;
    const stopped = so.shot && !p.owner && Math.hypot(p.vx, p.vy) < 20;
    if (so.t > 8 || (so.shot && (p.held || stopped || behind)) ) result(false);
  }
  function manual(gl, dt) {
    const h = gl.human, g = Skater.ownGoal(gl.team), into = -Rink.outDir(g.side);
    let mx = 0, my = 0, pr = a => false;
    if (h.remote) { const m = Net.moveFor(h); mx = m[0]; my = m[1]; pr = a => Net.pressedFor(h, a); }
    else { const m = h.input.move(); mx = m[0]; my = m[1]; pr = a => h.input.pressed(a); }
    gl.mx = clamp(g.x + into * (8 + (mx * into > 0 ? 14 : 0) * Math.abs(mx)), g.x + into * 4, g.x + into * 30);
    gl.my = clamp(gl.y + my * 150 * dt, C.y - 22, C.y + 22);
    if (pr('pass')) { gl.state = 'butterfly'; gl.stateT = 0; }
    if (pr('shoot')) { gl.state = 'poke'; gl.stateT = 0; const p = M.puck; if (p.owner && Math.hypot(p.owner.x - gl.x, p.owner.y - gl.y) < 26) { Skater.release(p.owner, into * 120, 0, 0, 'poke'); Bus.emit('poke', { by: gl.id, ok: true, goalie: true }); } }
    if (pr('deke')) { gl.state = 'stack'; gl.stateT = 0; gl.y = clamp(gl.y + (my >= 0 ? 10 : -10), C.y - 22, C.y + 22); }
  }
  function scored(team, by) { const so = M.so; if (!so || so.state !== 'go') return; M.puck.inNet = true; result(true); }
  function result(ok) {
    const so = M.so; so.state = 'pause'; so.pause = 1.8;
    so.results[so.team].push(ok);
    Bus.emit('shootout_attempt', { by: so.shooter.id, team: so.team, ok, name: so.shooter.name });
    if (ok) Bus.emit('so_goal', { team: so.team, by: so.shooter.id });
    // decided?
    const [a, b] = so.results, ga = a.filter(Boolean).length, gb = b.filter(Boolean).length, ra = 3 - a.length, rb = 3 - b.length;
    if (a.length <= 3 && b.length <= 3) {
      if (ga > gb + Math.max(0, rb)) so.winner = 0; else if (gb > ga + Math.max(0, ra)) so.winner = 1;
      else if (a.length === 3 && b.length === 3 && ga !== gb) so.winner = ga > gb ? 0 : 1;
    } else if (a.length === b.length && ga !== gb) so.winner = ga > gb ? 0 : 1;
    if (so.winner === null) so.team = a.length > b.length ? 1 : a.length < b.length ? 0 : 0;
    if (so.winner === null && a.length === b.length) so.round++;
    if (so.winner === null && Math.min(a.length, b.length) >= 12) so.winner = ga >= gb ? 0 : 1;
  }
  function finish() {
    const so = M.so; Bus.emit('shootout_end', { team: so.winner, showcase: so.showcase });
    for (const s of M.skaters) s.off = false;
    for (const g of M.goalies) g.manual = false;
    if (!so.showcase || M.score[0] === M.score[1]) { M.score[so.winner]++; M.soWin = so.winner; }
    else M.showcaseWin = so.winner;
    M.phase = 'play'; Match.final();
  }
  return { start, step, scored, setup };
})();
