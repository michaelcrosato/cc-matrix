/* ---- MATCH: configuration, phases, intents, actions, movement, flow ---- */
const Match = (() => {
  let M = null;
  const SKILLS = AI.SK;
  const cur = () => M;
  function create(cfg) {
    cfg = Object.assign({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, periodLen: T.periodLen, ot: true, shootout: true, intros: false, humans: [], noBoom: false, seed: (Date.now() & 0xffffff), practice: null, tactic: [null, null] }, cfg);
    RNG.setSeed(cfg.seed); RNG.fx = E.rng(cfg.seed ^ 0x9e37);
    Bus.reset(); Rink.resetScuff(); for (const p of Rink.panels) { p.st = 0; p.shake = 0; }
    const hT = TEAM[cfg.home], aT = TEAM[cfg.away], diff = clamp(cfg.diff != null ? cfg.diff : ['Rookie', 'Pro', 'All-Star', 'Legend'].indexOf(S('difficulty')), 0, 3);
    const m = M = Sim.S_.m = { cfg, t: 0, teams: [hT, aT], arena: ARENAS[cfg.arena], diff, end: [0, 1], period: 1, periods: cfg.periods, clock: cfg.periodLen, phase: cfg.intros ? 'intro' : 'faceoff', pt: 0, score: [0, 0], boom: [0, 0], kaboom: [0, 0], tactic: cfg.tactic.slice(), skill: [SKILLS[diff], SKILLS[diff]], diffGoalie: [0, 0],
      sk: [], gl: [], ref: Sim.mkRef(), puck: Puck.mk(), items: [], holes: [], octos: [], stats: { shots: [0, 0], sog: [0, 0], hits: [0, 0], passes: [0, 0], faceoffs: [0, 0], kabooms: [0, 0], fights: 0, goals: [] }, goalPending: null, dekeBite: [0, 0], sinBin: [], fightCount: 0, fight: null, lastFight: -99, frozenBy: null,
      holdCover: false, ot: false, so: null, over: false, itemT: T.itemEvery * .6, replayReq: null, flip: false, hat: {}, feed: [], shatterCnt: 0, phaseNoPlay: false, humans: [], noPickup: false, intensity: 0, fo: null, scorer: null, mascot: null, shotClockT: 0 };
    if (cfg.story) m.skill[1] = SKILLS[Math.max(0, diff - (cfg.story.id === 1 ? 1 : 0))];
    if (diff === 3) m.diffGoalie = [-.02, .01]; else m.diffGoalie = [[ .06, -.03][0], -.03]; // CPU goalie offsets by difficulty
    m.diffGoalie = [[.06, .02, 0, -.02][diff], [.06, .02, 0, -.02][diff]]; // (applies to the CPU's goalies; humans' team gets the opposite)
    for (const side of [0, 1]) { const team = m.teams[side]; for (let i = 0; i < 3; i++) m.sk.push(Sim.mkSkater(m, side, i, team, side === 1)); m.gl.push(Sim.mkGoalie(m, side, team, side === 1)); }
    for (const g of m.gl) g.num = TEAM[g.team.id].goalie[2];
    for (const s of m.sk) { s.jersey = s.team[s.side ? 'away' : 'home'].cloth; if (cfg.retro) s.rig = Rigs.skater(s.def, s.side, s.team, s.side === 1, true); }
    m.hasHuman = [false, false];
    for (const h of cfg.humans) { m.hasHuman[h.side] = true; }
    if (m.hasHuman[0] && !m.hasHuman[1]) m.diffGoalie[0] = [-.03, -.01, 0, .01][diff]; else if (m.hasHuman[1] && !m.hasHuman[0]) m.diffGoalie[1] = [-.03, -.01, 0, .01][diff];
    if (cfg.story) { const tk = cfg.story.tacticKey && cfg.story.tacticKey[cfg.storyChoice || 0]; if (tk === 'finesse' || tk === 'grit' || tk === 'hunt') m.tactic[0] = tk; m.doris = null; m.dorisPick = tk; if (tk === 'lou') m.sk[2].rt.fgt = Math.min(6, m.sk[2].rt.fgt + 1); if (tk === 'lou2') m.sk[2].rt.pas++; }
    // assign humans
    m.humans = cfg.humans.map(h => ({ side: h.side, input: h.input, seat: h.seat != null ? h.seat : 0, remote: !!h.remote, sk: null, intent: Sim.blank(), lastPress: {}, cnt: [0, 0, 0, 0, 0, 0] }));
    for (const h of m.humans) { const mates = Sim.teamOf(m, h.side); const free = mates.find(s => s.ctrl.kind === 'cpu' && !s.chosen); if (!free) continue; h.sk = free; free.ctrl = { kind: h.remote ? 'remote' : 'human', input: h.input, seat: h.seat }; free.chosen = true; if (m.humans.length === 1 || true) free.human = h; }
    setupFaceoff(Rink.CX, Rink.CY, { center: true }); if (cfg.practice !== 'hold') m.pt = 0;
    m.ref.x = Rink.CX; m.ref.y = Rink.CY - 20;
    // thin ice patches
    m.thin = m.arena.hazard === 'thin' ? [[Rink.CX - 150, Rink.CY - 90, 40, 24], [Rink.CX + 40, Rink.CY + 70, 40, 24], [Rink.CX + 200, Rink.CY - 40, 40, 24]].map(a => ({ x: a[0], y: a[1], rx: a[2] / 2, ry: a[3] / 2, hp: 100, hole: false, re: 0 })) : [];
    if (m.arena.hazard === 'mascot') m.mascot = { x: Rink.CX, y: Rink.CY, a: 0, state: 'dance', down: 0, vx: 0, vy: 0, rig: Rigs.PEOPLE.pete(), heading: 0, hit: 0 };
    m.dropT = 0; Bus.emit('match_start', { m });
    return m;
  }
  const spot = (side, slot, dx, dy, dirw) => { // faceoff spots relative to the dot
    const own = Sim.attackDir(M, side) * -1; // toward own end
    if (slot === 0) return [dx + own * 11, dy];
    if (slot === 1) return [dx + own * 36, dy + (dy > Rink.CY ? -1 : 1) * 56 * (dy === Rink.CY ? -1 : 1) * (side ? -1 : 1)];
    return [dx + own * 70, dy + (side ? 1 : -1) * 26];
  };
  function setupFaceoff(dx, dy, o = {}) {
    const m = M, p = m.puck; Puck.release(m, p.owner); p.owner = null; p.x = dx; p.y = dy; p.z = 0; p.vx = p.vy = p.vz = 0; p.inNet = -1; p.out = false; p.frozen = false; p.shotBy = null; p.passTo = null; p.fire = false; m.noPickup = true; m.fo = { x: dx, y: dy, t: 0, drop: 1 + RNG.sim() * .6, dropped: false, winner: -1, press: [-1, -1], pressT: [99, 99] };
    m.frozenBy = null; for (const g of m.gl) { if (g.state === 'cover') g.state = 'ready'; if (g.state !== 'blasted') g.save = null; }
    for (const s of m.sk) { if (s.state === 'bin') continue; if (s.hasPuck) s.hasPuck = false; if (!['frozen', 'buried'].includes(s.state)) { s.state = 'skate'; s.st = 0; } s.vx = s.vy = 0; s.winding = false; s.plan = null; }
    for (const s of m.sk) { const sp = spot(s.side, s.slot, dx, dy); s.tx = clamp(sp[0], Rink.X0 + 20, Rink.X1 - 20); s.ty = clamp(sp[1], Rink.Y0 + 20, Rink.Y1 - 20); if (o.center || o.snap) { s.x = s.tx + Sim.attackDir(m, s.side) * -1 * 30; s.y = s.ty; s.heading = Sim.attackDir(m, s.side) > 0 ? 0 : PI; } }
    for (const g of m.gl) { g.x = Sim.ownGoalX(m, g.side) + Sim.attackDir(m, g.side) * 10; g.y = Rink.CY; g.heading = Sim.attackDir(m, g.side) > 0 ? 0 : PI; }
    m.ref.x = dx; m.ref.y = dy - 14;
  }
  const faceoffNow = (dx, dy, snap) => { M.phase = 'faceoff'; M.pt = 0; setupFaceoff(dx, dy, { snap }); Bus.emit('faceoff_set', { x: dx, y: dy }); };
  // ---------------- intents ----------------
  function humanIntent(m, h, dt) {
    const I = h.input, it = h.intent; if (!I) return;
    const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    it.mx = d[0]; it.my = d[1]; it.turbo = I.down('turbo');
    const pu = k => { if (I.pressed(k)) { it.press[k]++; } };
    for (const k of ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch']) pu(k);
    it.shootHeld = I.down('shoot'); it.lobHeld = I.down('lob');
    // aim: mouse (moved recently) or right stick
    it.aim = null;
    if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .4) { const ga = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); h.aimDir = ga; it.aim = { dx: ga[0], dy: ga[1], stick: true }; }
    else if (I.lastDevice === 'mouse' || I.aimSource === 'mouse') { const mg = game.mouseGround && game.mouseGround(); if (mg) { it.aim = { x: mg[0] !== undefined ? mg[0] : mg.x, y: mg[1] !== undefined ? mg[1] : mg.y, mouse: true }; h.mouse = it.aim; } }
    if (!it.aim && Math.hypot(it.mx, it.my) > .3) it.aim = { dx: it.mx, dy: it.my, stick: true, move: true };
    if (!it.aim) { const ang = h.sk ? h.sk.heading : 0; it.aim = { dx: Math.cos(ang), dy: Math.sin(ang), move: true }; }
  }
  function applyHuman(m, h) { const s = h.sk; if (!s) return; const it = s.intent, hi = h.intent; it.mx = hi.mx; it.my = hi.my; it.turbo = hi.turbo; it.aim = hi.aim; it.shootHeld = hi.shootHeld; it.lobHeld = hi.lobHeld; for (const k in hi.press) it.press[k] = hi.press[k]; }
  function switchTo(m, h, s2) { if (!s2 || s2 === h.sk || s2.ctrl.kind !== 'cpu' || ['bin'].includes(s2.state)) return; const old = h.sk; if (old) { old.ctrl = { kind: 'cpu', input: null, seat: null }; old.chosen = false; old.human = null; old.intent.shootHeld = false; } s2.ctrl = { kind: h.remote ? 'remote' : 'human', input: h.input, seat: h.seat }; s2.chosen = true; s2.human = h; h.sk = s2; Bus.emit('switch', { h, s: s2 }); }
  function autoSwitch(m) {
    for (const h of m.humans) {
      if (m.fight || m.cfg.noSwitch) continue; const s = h.sk; if (!s || s.state === 'bin') { const mates = Sim.teamOf(m, h.side).filter(x => x.ctrl.kind === 'cpu' && x.state !== 'bin'); if (mates.length) switchTo(m, h, mates[0]); continue; }
      if (h.input && h.intent.press.switch !== (h.lastPress.switch || 0)) { h.lastPress.switch = h.intent.press.switch; const mates = Sim.teamOf(m, h.side).filter(x => x.ctrl.kind === 'cpu' && x.state !== 'bin'); const p = m.puck; mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); switchTo(m, h, mates[0]); continue; }
      const o = m.puck.owner; if (o && o.side === h.side && o !== s && o.ctrl.kind === 'cpu' && m.puck.passTo === s) {}
      // auto-switch: a pass was received by a mate / a lone human to the one nearest the puck when not carrying
      const p = m.puck; if (m.humans.filter(x => x.side === h.side).length === 1 && !s.hasPuck && m.phase === 'play') {
        const mates = Sim.teamOf(m, h.side).filter(x => x.state !== 'bin'); const rec = mates.find(x => x.recvT > 0 && p.passTo === x); if (rec && rec !== s) { switchTo(m, h, rec); continue; }
        if (p.owner && p.owner.side === h.side && p.owner !== s && p.owner.ctrl.kind === 'cpu' && h.autoT !== true) { /* carrier is a CPU mate: stay (call for pass) */ }
        else if (!p.owner || p.owner.side !== h.side) { const best = mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (best !== s && best.ctrl.kind === 'cpu' && Math.hypot(best.x - p.x, best.y - p.y) + 40 < Math.hypot(s.x - p.x, s.y - p.y)) switchTo(m, h, best); }
        if (p.owner && p.owner.side === h.side && p.owner !== s && p.owner.ctrl.kind === 'cpu' && h.takeT === undefined) { }
      }
    }
  }
  // ---------------- targeting ----------------
  function passTarget(m, s) {
    const it = s.intent, mates = m.sk.filter(o => o.side === s.side && o !== s && o.state !== 'bin' && o.state !== 'down');
    if (it.aim && it.aim.mate) return { mate: it.aim.mate };
    if (it.aim && it.aim.mouse) { let best = null, bd = 80; for (const o of mates) { const d = Math.hypot(o.x - it.aim.x, o.y - it.aim.y); if (d < bd) { bd = d; best = o; } } return best ? { mate: best } : { x: it.aim.x, y: it.aim.y }; }
    const dx = it.aim && it.aim.dx != null ? it.aim.dx : Math.cos(s.heading), dy = it.aim && it.aim.dy != null ? it.aim.dy : Math.sin(s.heading), ang = Math.atan2(dy, dx);
    let best = null, bs = 1e9;
    for (const o of mates) { const a = Math.atan2(o.y - s.y, o.x - s.x), da = Math.abs(U.angDiff(ang, a)); if (da < 75 * PI / 180) { const sc = da * 100 + Math.hypot(o.x - s.x, o.y - s.y) * .1; if (sc < bs) { bs = sc; best = o; } } }
    if (!best) { for (const o of mates) { const ahead = (o.x - s.x) * Sim.attackDir(m, s.side); const sc = Math.hypot(o.x - s.x, o.y - s.y) - ahead * .5; if (sc < bs) { bs = sc; best = o; } } }
    return { mate: best };
  }
  // ---------------- actions ----------------
  const LOCK = ['down', 'getup', 'stun', 'bin', 'frozen', 'buried', 'slip', 'fight', 'celebrate'];
  function actions(m, s, dt) {
    const it = s.intent, P = it.press, lp = s.lastPress || (s.lastPress = { pass: 0, shoot: 0, deke: 0, lob: 0, chirp: 0, switch: 0 });
    const pr = k => { if (P[k] !== lp[k]) { lp[k] = P[k]; return true; } return false; };
    for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
    const locked = LOCK.includes(s.state) || m.phase === 'goal' || m.phaseNoPlay;
    const was = { pass: pr('pass'), shoot: pr('shoot'), deke: pr('deke'), lob: pr('lob'), chirp: pr('chirp'), sw: pr('switch') };
    s.recvT = Math.max(0, s.recvT - dt); s.oneTimerT = Math.max(0, s.oneTimerT - dt); s.swing = Math.max(0, s.swing - dt);
    if (locked) { s.winding = false; s.holdShoot = 0; s.charge = 0; s.shootWas = false; return; }
    if (m.fo && m.phase === 'faceoff') { if (was.pass || was.shoot) faceoffPress(m, s); return; }
    const free = s.state === 'skate' || s.state === 'stop' || s.state === 'wind' || s.state === 'pass' || s.state === 'shoot';
    if (was.chirp && s.cd.chirp <= 0) Hits.chirp(m, s);
    if (s.hasPuck) {
      if (was.pass && free) { const t = passTarget(m, s); Puck.pass(m, s, t.mate ? t.mate.x : t.x, t.mate ? t.mate.y : t.y, t.mate, false); }
      else if (was.lob && free) { const t = passTarget(m, s); Puck.pass(m, s, t.mate ? t.mate.x : t.x, t.mate ? t.mate.y : t.y, t.mate, true); }
      else if (was.deke && s.cd.deke <= 0 && free) Hits.deke(m, s);
      // shoot: hold to charge, release to fire
      if (it.shootHeld && free) { s.holdShoot += dt; s.shootWas = true; if (s.holdShoot > .18) { s.winding = true; s.state = 'wind'; const ct = T.slapCharge * (m.kaboom[s.side] > 0 ? .5 : 1); s.charge = clamp((s.holdShoot - .18) / ct, 0, 1); } }
      else if (s.shootWas) { s.shootWas = false; const type = s.holdShoot < .18 ? 'wrist' : 'slap'; const aim = shotAim(m, s); s.winding = false; if (s.state === 'wind') s.state = 'skate'; Puck.shoot(m, s, type, type === 'slap' ? s.charge : 0, aim); s.holdShoot = 0; s.charge = 0; }
      else { s.holdShoot = 0; s.winding = false; if (s.state === 'wind') s.state = 'skate'; }
    } else {
      if (s.shootWas) { s.shootWas = false; s.winding = false; if (s.state === 'wind') s.state = 'skate'; }
      s.winding = false; s.holdShoot = 0;
      const p = m.puck;
      if (was.shoot) {
        if (p.passTo === s && p.passT > 0 && Math.hypot(p.x - s.x, p.y - s.y) < 150) { s.oneTimerT = .35; Bus.emit('onetimer_arm', { s }); }
        else if (s.cd.check <= 0 && free) Hits.startCheck(m, s);
      }
      if (was.deke && s.cd.poke <= 0 && free) Hits.startPoke(m, s);
      if (was.pass && s.ctrl.kind === 'human') { const o = p.owner; if (o && o.side === s.side && o.ctrl.kind === 'cpu') { o.plan = { t: 'pass', to: s, at: m.t + .25 }; o.callFrom = s; s.callT = 1.2; Bus.emit('call_pass', { s }); } }
      if (s.recvT > 0 && it.shootHeld && p.passTo === s && Math.hypot(p.x - s.x, p.y - s.y) < 22) s.oneTimerT = .35;
    }
  }
  function shotAim(m, s) { const it = s.intent, a = it.aim; if (!a) return null; if (a.mouse) return { x: a.x, y: a.y }; if (a.stick && !a.move) { return { x: s.x + a.dx * 100, y: s.y + a.dy * 100, far: null }; } if (a.move) { const dir = Sim.attackDir(m, s.side); const up = a.dy * (dir > 0 ? 1 : 1); if (Math.abs(a.dy) > .5) return { far: Math.sign(a.dy) * 1 }; } return null; }
  function faceoffPress(m, s) { const fo = m.fo; if (!fo || s.slot !== 0) return; if (fo.press[s.side] < 0) { fo.press[s.side] = fo.dropped ? m.t - fo.dropAt : -1; if (!fo.dropped) { fo.early = fo.early || [false, false]; fo.early[s.side] = true; } } }
  return { create, cur, setupFaceoff, faceoffNow, humanIntent, applyHuman, switchTo, autoSwitch, actions, passTarget, shotAim, LOCK, get m() { return M; }, _set(v) { M = v; } };
})();
