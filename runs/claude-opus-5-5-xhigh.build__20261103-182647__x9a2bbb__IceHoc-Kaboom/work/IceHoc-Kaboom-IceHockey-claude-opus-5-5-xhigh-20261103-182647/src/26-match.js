/* ---- MATCH (7.14): one game of hockey. It owns the entities and runs the fixed-order step (5.4): intents, phase logic,
 * actions and skating, bodies, the puck, the goalies, hits, items, BOOM / sin bin timers, the clock; then the consumers.
 * Phases: intro, faceoff, play, stoppage, goal, replay, periodEnd, intermission, fight, shootout, final. Every mode is a
 * Match config: the Cup Run's games, exhibitions, drills, the attract reel and online sessions ---- */
const Match = (() => {
  const DIFF = { rookie: { skill: .35, cpuG: .06, humG: -.03 }, pro: { skill: .55, cpuG: .02, humG: -.01 }, allstar: { skill: .75, cpuG: 0, humG: 0 }, legend: { skill: .95, cpuG: -.02, humG: .01 } };
  const DIFF_ORDER = ['rookie', 'pro', 'allstar', 'legend'];
  let m = null;
  const blankStats = () => ({ goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, takeaways: 0, fightsWon: 0, turbo: 0, topShot: 0, passes: 0, blocks: 0, items: 0, pim: 0, onetimers: 0 });
  /** a new match from a config (see the header); returns its state */
  function create(cfg) {
    cfg = Object.assign({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, periodLen: +S('periodLen') || 120, ot: 'sudden', otLen: 120, shootout: true, intros: S('intros') !== false, replays: S('replays') || 'auto',
      flood: S('flood') || 'ask', difficulty: S('difficulty') || 'pro', cheats: {}, objectives: [], humans: [], mode: 'exhibition', seed: (Date.now() % 1e9) | 0, rules: {}, tactic: {}, events: [] }, cfg);
    const rules = Object.assign({ fights: true, items: true, hazards: true, boom: true, clock: true }, cfg.rules);
    RNG.seed(cfg.seed);
    const arena = ARENAS[cfg.arena], cheats = Object.assign({}, cfg.cheats);
    const st = {
      cfg, rules, arena, cheats, t: 0, phase: 'intro', phaseT: 0, period: 1, clock: cfg.periodLen, ot: false, so: null, winner: -1, hitstop: 0,
      teams: [], skaters: [], goalies: [], puck: Puck.make(), items: [], extras: [], refs: [], ice: [], humans: [], fights: 0, lastFightClock: null, fight: null, invite: null,
      boom: [0, 0], kaboom: [0, 0], itemT: T.itemEvery * .6, dropT: 20, faceoff: null, events: [], obj: {}, objDone: {}, goals: [], replayClip: null, hilites: [], glassFix: 0, intro: null,
      stats: { faceoffs: [0, 0] }, lastBigHitBy: null, boostOn: false, organOn: 0, sessionCap: cfg.otCap || 0, ended: false
    };
    m = st;
    [cfg.home, cfg.away].forEach((id, t) => {
      const def = TEAMS[id], home = t === 0;
      const team = { t, id, def, home, score: 0, shots: 0, hits: 0, kabooms: 0, faceoffs: 0, skaters: [], goalie: null, tactic: cfg.tactic[t] || null, huntBear: cfg.huntBear === t, human: false, roles: {}, ppGoals: 0 };
      def.players.forEach((d0, i) => {
        let d = d0; if (cfg.mods && cfg.mods[d0.key]) d = Object.assign({}, d0, { r: d0.r.map((v, k) => clamp(v + (cfg.mods[d0.key][k] || 0), 1, 6)) });
        const s = { id: t * 3 + i, team: t, slot: i, def: d, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, state: 'skate', stateT: 0, turbo: 1, turboOn: false, rest: 0, stopT: 0, hand: d.hand === 'L' ? -1 : 1,
          pickupCD: 0, items: {}, grudge: {}, stats: blankStats(), intent: AI.blankIntent(), ai: { thinkT: RNG.sim() * .2, role: 'home' }, ctrl: { kind: 'cpu' }, charge: 0, shootHeld: 0, charging: false, phase: RNG.sim() * 6 };
        s.rig = Rigs.skater(d, home, { classic: cheats.retro, bigHead: cheats.bigHeads }); s.hairColor = s.rig.C.hair; s.helmetColor = s.rig.hkGear.helmet;
        team.skaters.push(s); st.skaters.push(s);
      });
      const g = Goalie.make(st, t, def.goalie, home); g.cpu = true; team.goalie = g; st.goalies.push(g);
      st.teams.push(team);
    });
    // the officials, the bench spares, the coaches
    const ref = { kind: 'ref', id: 300, x: Rink.C.x, y: Rink.C.y + 40, vx: 0, vy: 0, body: true, down: 0, rig: Rigs.referee({ classic: cheats.retro }), facing: -PI / 2, arm: 0 };
    const lines = { kind: 'ref', id: 301, x: Rink.C.x + 120, y: Rink.Y0 + 30, vx: 0, vy: 0, body: true, down: 0, rig: Rigs.referee({ classic: cheats.retro, skin: '#a87050' }), facing: PI / 2, arm: 0, linesman: true };
    st.refs = [ref, lines];
    Items.setupIce(st); Items.setupExtras(st);
    st.extras.push(...st.refs);
    st.bench = [0, 1].map(t => ({ spares: [0, 1].map(i => Rigs.spare(st.teams[t].id, t === 0, i + t * 2)), coach: t === 0 && st.teams[0].id === 'muskrats' ? Rigs.cast('marge') : t === 1 && st.teams[1].id === 'grizzlies' ? Rigs.cast('glitterman') : Rigs.cast(t ? 'gus' : 'gus') }));
    // the humans: each on their own skater, the center first
    for (const h of cfg.humans) addHuman(st, h);
    Rink.resetPanels(); Rink.clearIce();
    for (const n of Rink.NETS) { n.bulge = 0; n.bv = 0; n.light = 0; n.tip = 0; }
    // objectives
    for (const o of cfg.objectives) { st.obj[o.id] = 0; }
    Object.assign(st, api(st));
    return st;
  }
  function addHuman(st, h) {
    const team = st.teams[h.team]; team.human = true;
    const free = team.skaters.filter(s => s.ctrl.kind === 'cpu'), s = free.find(q => q.def.pos === 'C') || free[0]; if (!s) return null;
    const hu = Object.assign({ id: st.humans.length, kind: 'local', name: h.name || 'P' + (st.humans.length + 1), color: h.color || E.PLAYER_COLORS[st.humans.length] || '#ffd36a' }, h, { skater: s, switchT: 0 });
    s.ctrl = { kind: hu.kind === 'remote' ? 'remote' : 'human', input: hu.input, human: hu };
    st.humans.push(hu); return hu;
  }
  /** the per-match helpers (bound to the state) */
  function api(st) {
    return {
      defNet: t => (t + (st.period - 1)) % 2, attackNet: t => 1 - ((t + (st.period - 1)) % 2), attackDir: t => (1 - ((t + (st.period - 1)) % 2)) ? 1 : -1,
      goalieAt: n => st.goalies.find(g => ((g.team + (st.period - 1)) % 2) === n),
      byId: id => st.skaters.find(s => s.id === id) || st.goalies.find(g => g.id === id) || st.extras.find(e => e.id === id) || null,
      aiSkill: t => { const k = t === 0 ? T.aiSkillHome : T.aiSkillAway; if (k >= 0) return k; let sk = DIFF[st.cfg.difficulty].skill; if (st.cfg.cpuStep && !st.teams[t].human) sk = DIFF[DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(st.cfg.difficulty) + st.cfg.cpuStep)]].skill; if (st.teams[t].human && st.humans.filter(h => h.team === t).length === 1 && st.humans.length > 1 && st.humans.filter(h => h.team !== t).length > 1) sk += .15; if (st.cfg.difficulty === 'rookie' && !st.teams[t].human && st.teams[t].score - st.teams[1 - t].score >= 3) sk -= .1; return clamp(sk + (st.cfg.aiBonus ? st.cfg.aiBonus[t] || 0 : 0), 0, 1); },
      aiErr: t => lerp(1.6, .7, st.aiSkill(t)),
      goalieOffset: t => { const D = DIFF[st.cfg.difficulty]; return st.teams[t].human ? D.humG : D.cpuG + (st.cfg.cpuStep && !st.teams[t].human ? .02 : 0); },
      clockTotal: () => (st.period - 1) * st.cfg.periodLen + (st.cfg.periodLen - st.clock),
      setPhase: (p, t = 0) => { st.phase = p; st.phaseT = t; Bus.emit('phase', { phase: p, period: st.period }); },
      stoppage: (why, dot) => stoppage(st, why, dot),
      replayOk: () => st.cfg.replays !== 'off' && Replay.startGoal(st)
    };
  }

  /* ---- intents: humans from their input, CPUs from the AI, remote players from the network ---- */
  const lastMouse = { x: 0, y: 0, t: -9 };
  function humanIntent(st, s, I) {
    const it = s.intent, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    it.mx = d[0]; it.my = d[1]; it.face = null; it.back = false;
    it.aim = null;
    if (I === game.input) { const ms = I.mouse && I.mouse.active && I.screenPoint ? I.screenPoint(I.mouse.cx, I.mouse.cy) : null; if (ms && (Math.abs(ms[0] - lastMouse.x) > 2 || Math.abs(ms[1] - lastMouse.y) > 2)) { lastMouse.x = ms[0]; lastMouse.y = ms[1]; lastMouse.t = game.real; } }
    if (I.lastDevice === 'mouse' && game.real - lastMouse.t < 2 && I === game.input) { const w = Cam.mouseWorld(); if (w) it.aim = w; }
    else if (I.padAim) { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); if (Math.hypot(a[0], a[1]) > .3) it.aim = [s.x + a[0] * 160, s.y + a[1] * 160]; }
    it.held.shoot = I.down('shoot'); it.held.lob = I.down('lob'); it.held.turbo = I.down('turbo');
    const p = it.press; p.pass = I.pressed('pass'); p.shoot = I.pressed('shoot'); p.deke = I.pressed('deke'); p.lob = I.pressed('lob'); p.chirp = I.pressed('chirp'); p.switch = I.pressed('switch');
    if (I.pressed('camera')) Cam.cycle();
  }
  /** who a human holds: switch on demand, to a pass's receiver, and (a lone human on defense) to the one nearest the puck */
  function control(st, dt) {
    if (st.cfg.noSwitch) return;
    for (const hu of st.humans) {
      hu.switchT = Math.max(0, hu.switchT - dt);
      const s = hu.skater, team = st.teams[hu.team], pk = st.puck;
      const cpuMates = team.skaters.filter(o => o.ctrl.kind === 'cpu' && o.state !== 'bin' && o.state !== 'frozen' && o.state !== 'fight');
      if (!cpuMates.length) continue;
      const nearest = () => cpuMates.slice().sort((a, b) => U.dist(a, pk) - U.dist(b, pk))[0];
      let to = null;
      const wantSwitch = s.intent.press.switch || (s.intent.press.pass && pk.owner !== s && !(pk.owner && pk.owner.team === s.team));
      if (wantSwitch) to = nearest();
      else if (pk.passTo && pk.passTo.team === hu.team && pk.passTo.ctrl.kind === 'cpu' && pk.passFrom === s) to = pk.passTo;
      else if (s.state === 'bin' || s.state === 'frozen') to = nearest();
      else if (!st.cfg.noAutoSwitch && hu.switchT <= 0 && pk.owner !== s && !(pk.owner && pk.owner.team === hu.team) && st.phase === 'play' && s.state !== 'fight') {
        const n = nearest(); if (n && U.dist(n, pk) + 50 < U.dist(s, pk) && U.dist(s, pk) > 70) to = n;
      }
      if (pk.owner && pk.owner.team === hu.team && pk.owner.ctrl.kind === 'cpu' && st.phase === 'play' && hu.switchT <= 0 && !wantSwitch && st.cfg.followCarrier) to = pk.owner;
      if (to && to !== s) swap(st, hu, to);
    }
  }
  function swap(st, hu, to) {
    const s = hu.skater; to.ctrl = s.ctrl; s.ctrl = { kind: 'cpu' }; s.ai.thinkT = 0; hu.skater = to; hu.switchT = .6;
    to.intent.held.shoot = false; to.charging = false;
    Bus.emit('switch', { human: hu.id, to: to.id });
  }

  /* ---- phases ---- */
  function placeFaceoff(st, dotKey) {
    const [dx, dy] = Rink.DOTS[dotKey] || Rink.DOTS.center, pk = st.puck;
    Object.assign(pk, Puck.make(), { x: dx, y: dy, z: 22 });
    for (const team of st.teams) {
      const dir = st.attackDir(team.t), list = team.skaters.filter(s => s.state !== 'bin');
      const c = list.find(s => s.def.pos === 'C') || list[0], rest = list.filter(s => s !== c), side = dy < Rink.C.y ? 1 : -1;
      const spots = [[dx - dir * 11, dy], [dx - dir * 26, dy + side * 38], [dx - dir * 82, dy - side * 10]];
      const order = [c, ...rest.sort((a, b) => (a.def.pos === 'D') - (b.def.pos === 'D'))];
      order.forEach((s, i) => { const p = spots[i] || spots[2]; const w = Rink.wall(p[0], p[1]); let x = p[0], y = p[1]; if (w.d < 14) { x += w.nx * (14 - w.d); y += w.ny * (14 - w.d); } s.x = x; s.y = y; s.vx = s.vy = 0; s.facing = dir > 0 ? 0 : PI; s.stopT = 0; if (s.state !== 'fight' && s.state !== 'bin') Skater.setState(s, i === 0 ? 'faceoff' : 'skate'); s.charging = false; s.charge = 0; s.items.tape = s.items.tape || 0; });
      team.center = c;
      // a lone human takes the center for the draw
      const hu = st.humans.find(h => h.team === team.t);
      if (hu && st.humans.filter(h => h.team === team.t).length === 1 && hu.skater !== c && c.ctrl.kind === 'cpu') swap(st, hu, c);
    }
    for (const g of st.goalies) { const n = st.defNet(g.team), gx = Rink.goalX(n); g.x = gx - Rink.intoNet(n) * 12; g.y = Rink.C.y; g.state = 'ready'; g.threat = null; }
    const ref = st.refs[0]; ref.x = dx; ref.y = dy + 16; ref.facing = -PI / 2; ref.down = 0;
    const ln = st.refs[1]; ln.x = clamp(dx + 120, Rink.X0 + 60, Rink.X1 - 60); ln.y = Rink.Y0 + 24;
    st.faceoff = { dot: dotKey, t: 0, drop: .6 + RNG.sim() * .6, pressed: [null, null], early: [false, false], dropped: false, cpuT: [0, 1].map(t => lerp(.32, .07, st.aiSkill(t)) + RNG.sim() * .12), done: false };
    st.setPhase('faceoff');
    Bus.emit('faceoff', { dot: dotKey });
  }
  function faceoffStep(st, dt) {
    const F = st.faceoff, pk = st.puck; F.t += dt;
    for (const team of st.teams) {
      const c = team.center; if (!c) continue; const t = team.t;
      const pressed = c.ctrl.kind === 'cpu' ? (F.dropped && F.t - F.drop >= F.cpuT[t]) : (c.intent.press.pass || c.intent.press.shoot);
      if (pressed && F.pressed[t] === null) { if (!F.dropped) F.early[t] = true; else F.pressed[t] = F.t - F.drop; }
    }
    if (!F.dropped && F.t >= F.drop) { F.dropped = true; pk.z = 6; pk.vz = -40; Bus.emit('faceoff_drop', {}); }
    if (F.dropped) {
      const ok = t => F.pressed[t] !== null && !F.early[t];
      const a = ok(0) ? F.pressed[0] : 9, b = ok(1) ? F.pressed[1] : 9, late = F.t - F.drop > .8;
      if (a < 9 || b < 9 || late) {
        let w = a < b ? 0 : b < a ? 1 : RNG.sim() < .5 ? 0 : 1; if (a === 9 && b === 9) w = RNG.sim() < .5 ? 0 : 1;
        const winner = st.teams[w], c = winner.center, mate = winner.skaters.filter(s => s !== c && s.state !== 'bin').sort((p, q) => (p.x - q.x) * st.attackDir(w))[0] || c;
        winner.faceoffs++; st.stats.faceoffs[w]++;
        Object.assign(pk, { z: 0, vz: 0, owner: null, last: c });
        const ang = Math.atan2(mate.y - pk.y, mate.x - pk.x); pk.vx = Math.cos(ang) * 190; pk.vy = Math.sin(ang) * 190; pk.passTo = mate; pk.passFrom = c; pk.passKind = 'pass'; pk.passT = st.t;
        for (const team of st.teams) if (team.center && team.center.state === 'faceoff') { Skater.setState(team.center, 'skate'); team.center.pickupCD = .2; }
        Bus.emit('faceoff_won', { team: w, by: c.id });
        st.setPhase('play');
      }
    }
  }
  function stoppage(st, why, dot) {
    if (st.phase === 'final' || st.phase === 'stoppage') return;
    st.stopWhy = why; st.stopDot = dot || 'center';
    Puck.loose(st, st.puck);
    st.setPhase('stoppage');
    // the referee collects the octopi; the hats are swept; techs fix the glass
    const oct = st.items.filter(i => i.kind === 'octopus'); if (oct.length) Bus.emit('octopus_cleared', { n: oct.length });
    st.items = st.items.filter(i => i.kind !== 'octopus' && i.kind !== 'hat');
    for (const p of Rink.panels) if (p.state === 'shattered') { p.fixT = 1.5; }
    Bus.emit('stoppage', { why, dot: st.stopDot });
    Replay.atStoppage(st);
  }
  function freeze(g) { if (!m) return; const side = g.y < Rink.C.y ? 'n' : 's', n = m.defNet(g.team); stoppage(m, 'freeze', (n ? 'e' : 'w') + side); }

  /* ---- goals ---- */
  function goal(net, pk) {
    const st = m; if (!st || st.phase !== 'play' && st.phase !== 'shootout') return;
    const team = st.teams.findIndex((tm, t) => st.attackNet(t) === net), g = st.goalieAt(net);
    // Lemmy talks to his posts: one goal in five near a post rings off it instead
    if (g && g.def.trait === 'posts' && Math.abs(Math.abs(pk.y - Rink.C.y) - Rink.MOUTH) < 4 && RNG.sim() < .2) {
      pk.inNet = -1; pk.vx = -pk.vx * .7; pk.x = Rink.goalX(net) - Rink.intoNet(net) * 3; Bus.emit('post', { by: pk.last ? pk.last.id : -1, bar: false, net, x: pk.x, y: pk.y, pipes: true }); return;
    }
    if (st.phase === 'shootout') { soGoal(st, team); return; }
    const touches = (pk.touches || []).filter(s => s.team === team);
    let scorer = pk.last && pk.last.team === team ? pk.last : touches[touches.length - 1] || null;
    const assists = touches.filter(s => s !== scorer).slice(-2).reverse();
    const kind = pk.shot && pk.shot.by === (scorer && scorer.id) ? pk.shot.kind : pk.onFire ? 'kaboom' : pk.last && pk.last.team !== team ? 'own' : 'scramble';
    const ppg = SinBin.short(st) === 1 - team;
    st.teams[team].score++;
    if (scorer) scorer.stats.goals++; for (const a of assists) a.stats.assists++;
    if (ppg) st.teams[team].ppGoals++;
    if (g) g.stats.ga = (g.stats.ga || 0) + 1;
    st.goals.push({ team, by: scorer ? scorer.id : -1, assists: assists.map(a => a.id), kind, period: st.period, clock: st.clock, ppg });
    Rink.NETS[net].light = 3; if (kind === 'kaboom') Rink.NETS[net].tip = 1;
    st.scoredBy = team; st.lastGoal = st.goals[st.goals.length - 1];
    Bus.emit('goal', { team, by: scorer ? scorer.id : -1, assists: assists.map(a => a.id), kind, ppg, net, x: pk.x, y: pk.y, ot: st.ot, speed: pk.shot ? pk.shot.speed : 0 });
    if (scorer && scorer.stats.goals === 3) Bus.emit('hat_trick', { by: scorer.id, team });
    for (const s of [scorer, ...assists]) hoserCheck(s);
    // the celebration
    for (const s of st.teams[team].skaters) if (s.state !== 'bin') { Skater.setState(s, 'celebrate', 3); s.celeb = s === scorer ? s.def.celeb || 'pump' : 'pump'; const a = U.angTo(s, scorer || pk); s.celebDir = s === scorer ? [Math.cos(s.facing), Math.sin(s.facing)] : [Math.cos(a), Math.sin(a)]; }
    st.setPhase('goal');
    if (st.ot) st.otWin = team;
  }

  /** the Hoser Hat Trick: one player with a goal, an assist and a fight win in one game (checked on goals and fights) */
  function hoserCheck(s) { if (s && s.stats && s.stats.goals >= 1 && s.stats.assists >= 1 && s.stats.fightsWon >= 1 && !s.hoser) { s.hoser = true; Bus.emit('hoser_hat_trick', { by: s.id, team: s.team }); } }
  /* ---- the shootout (3 rounds each, then sudden death) ---- */
  function soStart(st) {
    st.so = { round: 1, turn: 0, marks: [[], []], shooters: [0, 0], att: null, done: false };
    st.setPhase('so_card', 2.2); Bus.emit('shootout_start', {});
  }
  function soSetup(st) {
    const S2 = st.so, t = S2.turn, team = st.teams[t], sh = team.skaters[S2.shooters[t] % team.skaters.length]; S2.shooters[t]++;
    const dir = st.attackDir(t);
    for (const s of st.skaters) { s.vx = s.vy = 0; Skater.setState(s, 'skate'); s.x = Rink.C.x + (s.team ? 60 : -60) + s.slot * 18; s.y = Rink.Y0 + 12; s.facing = PI / 2; s.offIce = true; }
    sh.offIce = false; sh.x = Rink.C.x - dir * 20; sh.y = Rink.C.y; sh.facing = dir > 0 ? 0 : PI; sh.ai.plan = null; sh.ai.deked = false; sh.ai.shootT = 0;
    Object.assign(st.puck, Puck.make()); Puck.setOwner(st, st.puck, sh, 'so');
    const g = st.goalieAt(st.attackNet(t)); g.manual = !!st.humans.find(h => h.team === g.team) && !st.humans.find(h => h.team === t && false); g.tY = Rink.C.y; g.tOut = 12; g.state = 'ready';
    const n = st.attackNet(t); g.x = Rink.goalX(n) - Rink.intoNet(n) * 12; g.y = Rink.C.y;
    // the human shoots for their team (the skaters rotate)
    for (const hu of st.humans) if (hu.team === t && hu.skater !== sh) { const was = hu.skater; sh.ctrl = was.ctrl; was.ctrl = { kind: 'cpu' }; hu.skater = sh; }
    S2.att = { shooter: sh.id, team: t, t: 0, res: null, goalie: g.id };
    st.setPhase('shootout');
    Bus.emit('shootout_attempt_start', { by: sh.id, team: t });
  }
  function soStep(st, dt) {
    const S2 = st.so, A2 = S2.att, pk = st.puck, sh = st.byId(A2.shooter), dir = st.attackDir(A2.team), g = st.byId(A2.goalie);
    A2.t += dt;
    if (sh.ctrl.kind === 'cpu') AI.shooter(st, sh, dt);
    if (g.manual) { const hu = st.humans.find(h => h.team === g.team); if (hu && hu.input) { const I = hu.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]); g.intent = { mx: d[0], my: d[1] };
      if (I.pressed('pass') && g.state === 'ready') { g.state = 'butterfly'; g.stateT = .7; } if (I.pressed('shoot') && g.state === 'ready') { g.state = 'poke'; g.stateT = .35; if (pk.owner && Math.hypot(pk.owner.x - g.x, pk.owner.y - g.y) < 26) { Puck.loose(st, pk); pk.vx = -dir * 150; pk.vy = (RNG.sim() - .5) * 100; Bus.emit('poke', { by: g.id, ok: true, goalie: true }); } }
      if (I.pressed('deke') && g.state === 'ready') { g.state = 'stack'; g.stateT = 1; g.side = (d[1] >= 0 ? 1 : -1) * Rink.intoNet(st.attackNet(A2.team)) * -1; } } }
    const done = res => { if (A2.res) return; A2.res = res; S2.marks[A2.team].push(res === 'goal'); Bus.emit('shootout_attempt', { by: sh.id, team: A2.team, ok: res === 'goal', res }); st.setPhase('so_result', 1.6); };
    if (A2.res) return;
    if (A2.t > 8) return done('time');
    if (!pk.owner && pk.inNet < 0) {
      if (pk.vx * dir < -20 && A2.t > .8 && !pk.shot) return done('lost');
      if (Math.hypot(pk.vx, pk.vy) < 25 && A2.t > 1.5 && (!pk.shot || st.t - pk.shot.t > .6)) return done('save');
      if (pk.shot && st.t - pk.shot.t > 1.6) return done('miss');
    }
    if (pk.out) return done('miss');
  }
  function soGoal(st, team) { const A2 = st.so.att; if (!A2 || A2.res) return; A2.res = 'goal'; st.so.marks[team].push(true); st.teams[team].soGoals = (st.teams[team].soGoals || 0) + 1; Bus.emit('shootout_attempt', { by: A2.shooter, team, ok: true, res: 'goal' }); Bus.emit('goal', { team, by: A2.shooter, assists: [], kind: 'shootout', so: true, net: st.attackNet(team), x: st.puck.x, y: st.puck.y }); Rink.NETS[st.attackNet(team)].light = 2; st.setPhase('so_result', 2.2); }
  /** after each attempt: decided, or the next shooter */
  function soNext(st) {
    const S2 = st.so, a = S2.marks[0].filter(Boolean).length, b = S2.marks[1].filter(Boolean).length, na = S2.marks[0].length, nb = S2.marks[1].length;
    const left = (n) => Math.max(0, 3 - n);
    let w = -1;
    if (na <= 3 && nb <= 3) { if (a > b + left(nb)) w = 0; else if (b > a + left(na)) w = 1; else if (na === 3 && nb === 3 && a !== b) w = a > b ? 0 : 1; }
    else if (na === nb && a !== b) w = a > b ? 0 : 1;
    if (w >= 0) { S2.winner = w; S2.done = true; Bus.emit('shootout_end', { team: w, a, b }); for (const s of st.skaters) s.offIce = false; for (const g of st.goalies) g.manual = false; endGame(st, st.cfg.showcase && st.teams[0].score !== st.teams[1].score ? (st.teams[0].score > st.teams[1].score ? 0 : 1) : w, true); return; }
    S2.turn = 1 - S2.turn; if (S2.turn === 0) S2.round++;
    soSetup(st);
  }

  /* ---- periods, overtime, the final ---- */
  function periodEnd(st) {
    Bus.emit('period_end', { n: st.period, ot: st.ot });
    st.setPhase('periodEnd', 3);
    for (const s of st.skaters) if (s.state !== 'bin') { s.charging = false; }
  }
  function afterPeriod(st) {
    const tied = st.teams[0].score === st.teams[1].score;
    if (st.ot) { if (st.cfg.shootout && tied) return soStart(st); return endGame(st, tied ? -1 : st.teams[0].score > st.teams[1].score ? 0 : 1); }
    if (st.period < st.cfg.periods) { st.setPhase('intermission'); Bus.emit('intermission', { n: st.period }); return; }
    if (tied && st.cfg.ot !== 'none') { st.ot = true; st.period++; st.clock = st.cfg.otCap || st.cfg.otLen; resetIce(st); Bus.emit('ot_start', {}); placeFaceoff(st, 'center'); return; }
    if (st.cfg.showcase) return soStart(st);
    if (tied && st.cfg.shootout) return soStart(st);
    endGame(st, tied ? -1 : st.teams[0].score > st.teams[1].score ? 0 : 1);
  }
  /** the next period after the intermission (the scene calls it): ends switch, the clock resets */
  function nextPeriod(st) {
    st.period++; st.clock = st.cfg.periodLen; resetIce(st);
    for (const s of st.skaters) { s.turbo = 1; if (s.state !== 'bin') Skater.setState(s, 'skate'); }
    Bus.emit('period_start', { n: st.period });
    placeFaceoff(st, 'center');
  }
  function resetIce(st) { for (const p of st.ice || []) if (p.hole > 0) { p.hole = 0; p.hp = 60; } }
  function endGame(st, winner, fromSO) {
    if (st.phase === 'final' && st.ended) return;
    st.winner = winner; st.ended = true; st.setPhase('final', 4);
    for (const s of st.skaters) if (s.state !== 'bin') Skater.setState(s, winner === s.team ? 'celebrate' : 'skate', 99), s.celeb = 'pump';
    st.stars = threeStars(st);
    Bus.emit('final', { winner, score: [st.teams[0].score, st.teams[1].score], so: !!fromSO });
  }
  /** three stars: 3 G + 2 A + 0.5 big hits + 1.5 fights won + 0.3 shots; goalies 0.12 saves + 2 (save% - .85) 10 */
  function threeStars(st) {
    const list = st.skaters.map(s => ({ who: s, kind: 's', v: 3 * s.stats.goals + 2 * s.stats.assists + .5 * s.stats.bigHits + 1.5 * s.stats.fightsWon + .3 * s.stats.shots }))
      .concat(st.goalies.map(g => ({ who: g, kind: 'g', v: .12 * g.stats.saves + 2 * ((g.stats.saves + (g.stats.ga || 0) ? g.stats.saves / (g.stats.saves + (g.stats.ga || 0)) : .9) - .85) * 10 })));
    return list.sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.who.id);
  }

  /* ---- the step (5.4) ---- */
  function step(dt) {
    const st = m; if (!st) return;
    if (st.devPause && !Dev.live) return;
    if (Replay.on) {   // a replay plays: the world waits (any player's confirm or pass skips it)
      const skip = st.humans.some(h => h.kind === 'local' && h.input && (h.input.pressed('confirm') || h.input.pressed('pass')));
      Replay.step(st, dt, skip); if (!Replay.on && st.phase === 'replay') placeFaceoff(st, 'center');
      st.t += dt; return;
    }
    st.t += dt; st.phaseT -= dt;
    if (st.hitstop > 0) { st.hitstop -= dt; return; }
    // 1. intents
    for (const s of st.skaters) {
      if (s.ctrl.kind === 'human') humanIntent(st, s, s.ctrl.input);
      else if (s.ctrl.kind === 'remote') Net.intentFor(st, s);
      else if (st.phase !== 'shootout') AI.step(st, s, dt);
    }
    if (st.phase === 'play') { AI.roles(st, 0); AI.roles(st, 1); control(st, dt); }
    // 2. phase logic
    const ph = st.phase;
    if (ph === 'intro') { if (st.phaseT <= 0 || (st.intro && st.intro.skip)) placeFaceoff(st, 'center'); }
    else if (ph === 'faceoff') faceoffStep(st, dt);
    else if (ph === 'stoppage' && st.phaseT <= -1.5) placeFaceoff(st, st.stopDot);
    else if (ph === 'goal' && st.phaseT <= -3) { if (st.ot) { endGame(st, st.otWin); } else if (st.replayOk()) st.setPhase('replay'); else placeFaceoff(st, 'center'); }
    else if (ph === 'replay' && Replay.done()) placeFaceoff(st, 'center');
    else if (ph === 'periodEnd' && st.phaseT <= 0) afterPeriod(st);
    else if (ph === 'so_card' && st.phaseT <= 0) soSetup(st);
    else if (ph === 'so_result' && st.phaseT <= 0) soNext(st);
    else if (ph === 'shootout') soStep(st, dt);
    if (st.phase === 'fight') Fight.step(st, dt);
    if (st.puck.out && st.phase === 'play' && !st.noPuck) { st.puck.out = false; stoppage(st, 'out', Rink.nearestDot(st.puck.x, st.puck.y, true)); }
    // 3-4. actions and skating, bodies, boards
    for (const s of st.skaters) { if (s.offIce) continue; Skater.step(st, s, dt); }
    if (st.phase !== 'fight') Hits.contacts(st, dt);
    for (const s of st.skaters) { if (s.offIce || s.state === 'bin') continue; Hits.boards(st, s); Rink.netPush(s, 7); }
    // 5-6. the puck and the goalies
    Puck.step(st, dt);
    for (const g of st.goalies) Goalie.update(st, g, dt);
    // 7-9. items, hazards, BOOM, the sin bin, fights watched, grudges
    Items.step(st, dt); Items.extrasStep(st, dt); Boom.step(st, dt); SinBin.step(st, dt); Fight.watch(st, dt); Grudge.step(st, dt);
    refsStep(st, dt);
    for (const p of Rink.panels) { p.shake = Math.max(0, p.shake - dt * 2); if (p.fixT > 0 && st.phase !== 'play') { p.fixT -= dt; if (p.fixT <= 0) { p.state = 'ok'; Bus.emit('glass_fixed', { panel: p.i }); } } }
    for (const n of Rink.NETS) { n.bv += (-18 * n.bulge - 3 * n.bv) * dt; n.bulge += n.bv * dt * 4; n.light = Math.max(0, n.light - dt); n.tip = Math.max(0, n.tip - dt * .5); }
    // the boss's scripted moments and the story's timed events
    for (const ev of st.cfg.events || []) if (!ev.done && st.period >= ev.period && (ev.clock === undefined || st.clock <= ev.clock) && (st.phase === 'play' || st.phase === 'faceoff')) { ev.done = true; Story.matchEvent(st, ev); }
    if (st.organOn > 0) { st.organOn -= dt; if (st.organOn <= 0) for (const s of st.teams[0].skaters) s.boost = st.boostOn && st.teams[0].id === 'grizzlies' ? 1.1 : 1; }
    // 10. the clock
    if (st.phase === 'play' && st.rules.clock) {
      st.clock -= dt;
      if (st.clock <= 0) { st.clock = 0; if (st.ot && st.cfg.otCap) { endGame(st, st.teams[0].score === st.teams[1].score ? -1 : st.teams[0].score > st.teams[1].score ? 0 : 1); } else periodEnd(st); }
    }
    // 12-14. consumers, the replay recorder, the rigs
    for (const s of st.skaters) Skater.pose(st, s, dt);
    for (const b of st.bench) { for (const r of b.spares) { r.hk.stick = { act: 'idle' }; r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: 'kneel' }); } if (b.coach) b.coach.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: PI / 2, pose: st.phase === 'goal' ? 'cheer' : Math.floor(st.t / 4) % 3 === 0 ? 'hips' : Math.floor(st.t / 4) % 3 === 1 ? 'wave' : null }); }
    Replay.record(st);
  }
  function refsStep(st, dt) {
    const pk = st.puck;
    for (const r of st.refs) {
      if (r.down > 0) { r.down -= dt; r.x += r.vx * dt; r.y += r.vy * dt; r.vx *= Math.exp(-2 * dt); r.vy *= Math.exp(-2 * dt); }
      else if (st.phase === 'play' || st.phase === 'stoppage') {
        const tx = r.linesman ? clamp(pk.x + 140, Rink.X0 + 80, Rink.X1 - 80) : clamp(pk.x - 90 * Math.sign(pk.x - Rink.C.x || 1), Rink.X0 + 80, Rink.X1 - 80), ty = r.linesman ? Rink.Y0 + 26 : Rink.Y1 - 30;
        const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy), sp = Math.min(150, d * 2); r.vx = d > 2 ? dx / d * sp : 0; r.vy = d > 2 ? dy / d * sp : 0; r.x += r.vx * dt; r.y += r.vy * dt; if (sp > 10) r.facing = E.approachAng(r.facing, Math.atan2(r.vy, r.vx), 8 * dt);
      } else if (st.phase === 'fight' && st.fight) { const F = st.fight, a = r.linesman ? 1 : -1; r.x = approach(r.x, F.x + a * 34, 80 * dt); r.y = approach(r.y, F.y + 18, 80 * dt); r.facing = U.angTo(r, F); }
      Rink.clampBody(r, 7);
      const hk = r.rig.hk, sp = Math.hypot(r.vx, r.vy); hk.ph = (hk.ph || 0) + dt * sp / 22; hk.push = clamp(sp / 90, 0, 1); hk.crouch = st.phase === 'faceoff' && !r.linesman ? .35 : .15;
      r.arm = st.phase === 'faceoff' && !r.linesman && st.faceoff && !st.faceoff.dropped ? 1 : Math.max(0, r.arm - dt * 4);
      r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: 0, vy: 0, facing: r.facing, down: r.down > 0 ? Math.min(1, (3 - r.down) * 3) : 0, pose: st.octoTwirl > 0 && !r.linesman ? 'cheer' : null });
      if (r.arm > 0) { const J = r.rig.J, o = r.rig.o, hand = E.V3.add(J.shC, [1.5, 1.5, o.armUpper + o.armLower - 1.5]); const [el, h2] = E.ik3(J.shR, E.V3.lerp(J.handR, hand, r.arm), o.armUpper, o.armLower, [-1, .7, -.2]); J.elbowR = el; J.handR = h2; }
    }
    st.octoTwirl = Math.max(0, (st.octoTwirl || 0) - dt);
  }

  /* ---- the pause menu's items ---- */
  function showInfo() {
    if (!m) { game.note('NO GAME ON'); return; }
    const c = m.cfg, lines = [];
    lines.push(TEAMS[c.home].name + ' vs ' + TEAMS[c.away].name + ' at ' + m.arena.name);
    if (c.objectives.length) for (const o of c.objectives) lines.push((m.objDone[o.id] ? '★ ' : '☆ ') + o.text);
    else lines.push(c.periods + ' periods of ' + U.mmss(c.periodLen) + ', difficulty ' + c.difficulty.toUpperCase());
    if (game.shell && game.shell.toast) game.shell.toast('OBJECTIVES & INFO', lines.join('\n'), 6); else game.note(lines[0]);
  }
  function restart() { if (!m) return; const cfg = Object.assign({}, m.cfg, { seed: (m.cfg.seed + 1) | 0, events: (m.cfg.events || []).map(e => Object.assign({}, e, { done: false })) }); game.resume && game.resume(); game.go(m.cfg.mode === 'drill' ? 'practice' : 'match', m.cfg.mode === 'drill' ? { drill: m.cfg.drill } : { cfg }, { fade: 'wipe' }); }
  return { hoserCheck, create, step, goal, freeze, stoppage, placeFaceoff, nextPeriod, endGame, threeStars, showInfo, restart, swap, addHuman, soStart, humanIntent, DIFF, DIFF_ORDER,
    get m() { return m; }, set m(v) { m = v; }, blankStats, afterPeriod };
})();

/* ---- OBJECTIVES (7.14): declarative counters per chapter, checked live; a star toast when one is met ---- */
const Objectives = (() => {
  const WIN = { id: 'win', text: 'Win the game', on: 'final', where: (e, m) => e.winner === 0 && m.teams[0].human, need: 1 };
  /** the objective kinds a chapter names: [id, text, event, predicate, need] */
  const KINDS = {
    win: WIN,
    onetimer: { id: 'onetimer', text: 'Score a one-timer', on: 'goal', where: (e, m) => e.team === 0 && e.kind === 'onetimer', need: 1 },
    bighits3: { id: 'bighits3', text: 'Land 3 big hits', on: 'hit', where: (e, m) => e.big && e.team === 0, need: 3 },
    breakice: { id: 'breakice', text: 'Break the ice under a Lumberjack', on: 'thin_ice_break', where: (e, m) => e.victimTeam === 1, need: 1 },
    kaboom: { id: 'kaboom', text: 'Trigger KABOOM', on: 'kaboom_start', where: (e, m) => e.team === 0, need: 1 },
    fights2: { id: 'fights2', text: 'Win 2 fights', on: 'fight_end', where: (e, m) => !e.draw && m.byId(e.winner) && m.byId(e.winner).team === 0, need: 2 },
    ppg: { id: 'ppg', text: 'Score a power-play goal', on: 'goal', where: (e, m) => e.team === 0 && e.ppg, need: 1 },
    kaboomgoal: { id: 'kaboomgoal', text: 'Score a KABOOM goal', on: 'goal', where: (e, m) => e.team === 0 && e.kind === 'kaboom', need: 1 },
    pete: { id: 'pete', text: 'Knock down Polar Pete', on: 'mascot_down', where: (e, m) => e.team === 0, need: 1 },
    vaultdeke: { id: 'vaultdeke', text: 'Beat The Vault with a deke goal', on: 'goal', where: (e, m) => e.team === 0 && (e.kind === 'deke' || Objectives.dekeGoal(m, e)), need: 1 },
    hattrick: { id: 'hattrick', text: 'One player scores a hat trick', on: 'hat_trick', where: (e, m) => e.team === 0, need: 1 }
  };
  const list = ids => ids.map(id => KINDS[id]);
  /** a deke goal: the scorer deked within 1.2 s before the shot */
  const dekeGoal = (m, e) => { const s = m.byId(e.by); return !!(s && s.dekeAt !== undefined && m.t - s.dekeAt < 1.6); };
  let wired = false;
  function wire() {
    if (wired) return; wired = true;
    Bus.sim('*', e => {
      const m = Match.m; if (!m || !m.cfg.objectives.length) return;
      for (const o of m.cfg.objectives) if (!m.objDone[o.id] && o.on === e.type) { let ok = false; try { ok = o.where(e, m); } catch (err) { ok = false; } if (ok) { m.obj[o.id] = (m.obj[o.id] || 0) + 1; if (m.obj[o.id] >= o.need) { m.objDone[o.id] = true; Bus.emit('objective', { id: o.id, text: o.text }); } } }
    });
  }
  return { KINDS, list, wire, dekeGoal };
})();
