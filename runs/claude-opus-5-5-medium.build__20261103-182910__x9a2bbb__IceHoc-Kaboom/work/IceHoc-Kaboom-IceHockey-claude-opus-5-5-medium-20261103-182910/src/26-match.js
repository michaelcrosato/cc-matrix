/* ---- Match: the game of hockey. Entities, phases (intro, faceoff, play, stoppage, goal, replay, period end, intermission,
 * overtime, shootout, fight, final), the clock, stats, three stars and objectives. Match.step(dt) runs one fixed step ---- */
const Match = (() => {
  const C = Rink.C;
  const DIFF = { Rookie: [.35, .06, -.03], Pro: [.55, .02, -.01], 'All-Star': [.75, 0, 0], Legend: [.95, -.02, .01] };
  const PERIOD_LEN = { '1:00': 60, '1:30': 90, '2:00': 120, '3:00': 180, '4:00': 240 };
  /** cfg: { home, away, arena, periods, len, ot, shootout, intros, replays, flood, difficulty, cheats, objectives, chapter, humans:
   *  [{ input, team, name, color, remote }], attract, practice, session, seed, showcase, boss } */
  function create(cfg) {
    const m = { cfg, t: 0, phase: 'none', phaseT: 0, period: 1, clock: cfg.len, score: [0, 0], shots: [0, 0], hits: [0, 0], fo: [0, 0], flip: 0,
      boom: [0, 0], kaboomT: [0, 0], kabooms: [0, 0], boost: [0, 0], sinBin: [], fight: null, fights: 0, lastFightClock: 1e9, items: [], hazards: [], stats: {}, goals: [],
      teams: [TEAMS[cfg.home], TEAMS[cfg.away]], arena: ARENAS[cfg.arena], humans: [], skaters: [], goalies: [], refs: [], objectives: [], tactic: [cfg.tactic || null, null],
      aiSkill: [0, 0], goalieOffset: [0, 0], cheats: Object.assign({}, cfg.cheats || {}), clips: [], ot: false, so: null, events: [], highlights: [] };
    M = m; m.attract = !!cfg.attract;
    Rigs.bigHeads = !!(cfg.cheats && cfg.cheats.bigheads) || (cfg.keepRigFlags ? Rigs.bigHeads : false); Rigs.retro = !!(cfg.cheats && cfg.cheats.retro) || (cfg.keepRigFlags ? Rigs.retro : false); if (cfg.cheats && cfg.cheats.glowpuck) Rigs.glow = true; else if (!cfg.keepRigFlags) Rigs.glow = false;
    m.huntBear = !!cfg.huntBear; m.challengy = !!(cfg.chapter === 3); m.boss = !!cfg.boss;
    RNG.reseed(cfg.seed || (Date.now() >>> 0));
    const diff = DIFF[cfg.difficulty || S().difficulty || 'Pro'] || DIFF.Pro, step = cfg.diffStep || 0;
    const keys = Object.keys(DIFF), di = clamp(keys.indexOf(cfg.difficulty || S().difficulty || 'Pro') + step, 0, 3), dr = DIFF[keys[di]];
    const humanTeams = new Set((cfg.humans || []).map(h => h.team));
    for (const t of [0, 1]) {
      const cpuSide = !humanTeams.has(t);
      m.aiSkill[t] = cpuSide ? dr[0] : diff[0];
      m.goalieOffset[t] = cpuSide ? dr[1] : diff[2];
    }
    if (cfg.aiSkill) m.aiSkill = cfg.aiSkill.slice();
    // the skaters and goalies
    [cfg.home, cfg.away].forEach((tid, team) => {
      const td = TEAMS[tid];
      td.skaters.forEach((d, k) => {
        let def = Object.assign({}, d);
        if (cfg.louLoose && tid === 'muskrats' && k === 2) def.fgt = Math.min(5, def.fgt + 1);
        if (cfg.louIce && tid === 'muskrats' && k === 2) def.pas = Math.min(5, def.pas + 1);
        const s = { id: 's' + (team * 3 + k), team, slot: k, def, x: C.x, y: C.y, z: 0, vx: 0, vy: 0, facing: team ? PI : 0, state: 'skate', stateT: 0, turbo: 1, turboIdle: 0,
          ctrl: 'cpu', items: {}, grudge: {}, cool: { pickup: 0, check: 0, deke: 0, poke: 0, chirp: 0, shot: 0, gloves: 0 }, shootHold: 0, charge: 0, winding: false, oneTimer: 0, receiving: 0,
          phaseA: RNG.sim() * 6, rig: Rigs.skater(def, tid, team === 0), name: def.nick || def.name, act: null, callT: 0, holdLob: 0, chirpT: 0, chirpText: '' };
        s.ai = AI.fresh(s); m.skaters.push(s);
        m.stats[s.id] = { goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, takeaways: 0, fightsWon: 0, turbo: 0, topShot: 0, points: 0 };
      });
      const gd = td.goalie, gl = { id: 'g' + team, team, def: gd, x: C.x, y: C.y, vy: 0, facing: 0, state: 'ready', stateT: 0, size: gd.size, rfx: gd.rfx, reb: gd.reb, rig: Rigs.goalie(gd, tid, team === 0), name: gd.nick || gd.name, track: null };
      if (gd.look && gd.look.boss) gl.bossScale = 1.35;
      m.goalies.push(gl); m.stats[gl.id] = { saves: 0, against: 0, goals: 0, assists: 0, shots: 0, hits: 0, bigHits: 0, fightsWon: 0 };
    });
    m.refs = [{ x: C.x, y: C.y - 30, rig: Rigs.referee(false), vx: 0, vy: 0, facing: PI / 2 }, { x: C.x - 120, y: C.y - 150, rig: Rigs.referee(true), vx: 0, vy: 0, facing: PI / 2 }];
    m.puck = { x: C.x, y: C.y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, prevTouch: null, touchT: 0, held: false, inNet: false, dead: false, onFire: false };
    m.byId = {}; for (const s of m.skaters) m.byId[s.id] = s; for (const g of m.goalies) m.byId[g.id] = g;
    m.teamOf = id => { const e = m.byId[id]; return e ? e.team : -1; };
    m.goal = side => goal(side); m.stoppage = (k, dot) => stoppage(k, dot);
    // the humans
    (cfg.humans || []).forEach((h, i) => {
      const s = m.skaters.find(x => x.team === h.team && x.ctrl === 'cpu' && (h.slot === undefined || x.slot === h.slot)) || m.skaters.find(x => x.team === h.team && x.ctrl === 'cpu');
      const hu = Object.assign({ i, s: null, aimT: -9, lastPt: null, lobT: 0, noAuto: !!cfg.practice }, h); m.humans.push(hu);
      if (s) { s.ctrl = 'human'; s.human = hu; hu.s = s; }
    });
    m.objectives = (cfg.objectives || []).map(o => Object.assign({ n: 0, done: false }, o));
    Rink.resetGlass(); Rink.clearScuff(1);
    Items.reset(m); Boom.reset(m); Replay.reset(); Hits.reset(); Fight.reset();
    m.map = Rink.mapFor(cfg.arena, TEAMS[cfg.home].logo);
    return m;
  }
  /* ---- events into stats, objectives and BOOM ---- */
  function wire() {
    Bus.on('*', e => {
      if (!M) return;
      for (const o of M.objectives) if (o.on === e.type && !o.done && (!o.where || o.where(e, M))) { o.n++; if (o.n >= (o.need || 1)) { o.done = true; Bus.emit('objective', { id: o.id, text: o.text }); } }
    });
    Bus.on('hit', e => { if (!M) return; const st = M.stats[e.by]; if (st) { st.hits++; if (e.big) st.bigHits++; } M.hits[M.teamOf(e.by)]++; });
    Bus.on('shot', e => { if (!M) return; const st = M.stats[e.by]; if (st) st.topShot = Math.max(st.topShot, e.speed); });
    Bus.on('fight_end', e => { if (!M || !e.winner) return; const st = M.stats[e.winner]; if (st) st.fightsWon++; });
  }
  const skaterOf = id => M && M.byId[id];
  /* ---- placing everyone for a faceoff at a dot ---- */
  function setupFaceoff(dot) {
    const p = M.puck; dot = dot || [C.x, C.y];
    Object.assign(p, { x: dot[0], y: dot[1], z: 22, vx: 0, vy: 0, vz: 0, owner: null, held: true, inNet: false, dead: false, onFire: false, passTo: null, shotBy: null, lastTouch: null });
    for (const t of [0, 1]) {
      const own = Skater.ownGoal(t), dir = -Rink.outDir(own.side);   // from own goal toward the center: the team's back is toward its own goal
      const list = M.skaters.filter(s => s.team === t && s.state !== 'bin' && !s.off);
      const center = list.find(s => s.slot === 0) || list[0];
      list.forEach(s => {
        let x, y;
        if (s === center) { x = dot[0] - dir * 9; y = dot[1]; }
        else if (s.slot === 1) { x = dot[0] - dir * 24; y = dot[1] + (t ? -1 : 1) * 40; }
        else { x = dot[0] - dir * 70; y = dot[1] + (t ? 1 : -1) * 30; }
        const k = Rink.sdf(x, y); if (k > -12) { const n = Rink.normal(x, y); x -= n[0] * (k + 12); y -= n[1] * (k + 12); }
        Object.assign(s, { x, y, vx: 0, vy: 0, facing: Math.atan2(dot[1] - y, dot[0] - x), state: s.state === 'bin' ? 'bin' : 'skate', stateT: 0, shootHold: 0, winding: false, charge: 0, oneTimer: 0, act: null });
        if (s === center) s.facing = dir > 0 ? 0 : PI;
      });
    }
    for (const g of M.goalies) { const og = Skater.ownGoal(g.team); g.x = og.x - Rink.outDir(og.side) * 8; g.y = C.y; g.state = 'ready'; g.track = null; }
    M.refs[0].x = dot[0]; M.refs[0].y = dot[1] - 14; M.refs[1].x = dot[0] + 60; M.refs[1].y = C.y - 170;
    M.foDot = dot; M.foDrop = .6 + RNG.sim() * .6; M.foWin = null; M.foPress = [null, null];
    setPhase('faceoff');
    if (M.huntBear !== undefined || true) Items.atStoppage();
  }
  function setPhase(ph, t = 0) { M.phase = ph; M.phaseT = t; Bus.emit('phase', { phase: ph }); }
  /* ---- the human's intent from their controller, keyboard and mouse ---- */
  function humanIntent(h, dt) {
    const I = h.input, s = h.s, it = { mx: 0, my: 0, turbo: false, shoot: false, lob: false, aim: null, press: {} };
    if (h.remote) return s ? Net.intentFor(h) : it;
    if (!I || !s) return it;
    const mv = I.move(), g = game.view && game.view.screenDirToGround ? game.view.screenDirToGround(mv[0], mv[1]) : mv;
    it.mx = g[0]; it.my = g[1]; it.stickY = mv[1];
    it.turbo = I.down('turbo'); it.shoot = I.down('shoot'); it.lob = I.down('lob');
    for (const a of ['pass', 'shoot', 'deke', 'lob', 'chirp', 'switch']) if (I.pressed(a)) it.press[a] = true;
    // aim: the mouse reticle (moved in the last 2 s) or the right stick
    const pt = I === game.input ? I.pointer() : null;
    if (pt && (!h.lastPt || Math.hypot(pt[0] - h.lastPt[0], pt[1] - h.lastPt[1]) > 1)) { h.aimT = M.t; h.lastPt = pt.slice(); }
    if (I.lastDevice === 'mouse' && M.t - h.aimT < 2 && game.mouseGround) { const w = game.mouseGround(); if (w) it.aim = [w[0] !== undefined ? w[0] : w.x, w[1] !== undefined ? w[1] : w.y]; }
    else if (I.padAim) { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); it.aim = [s.x + a[0] * 140, s.y + a[1] * 140]; }
    h.reticle = it.aim;
    return it;
  }
  const passIncoming = s => { const p = M.puck; if (p.owner || p.held) return false; if (p.passTo === s) return true; const d = Math.hypot(p.x - s.x, p.y - s.y), sp = Math.hypot(p.vx, p.vy); return d < 60 && sp > 80 && ((s.x - p.x) * p.vx + (s.y - p.y) * p.vy) / (d * sp || 1) > .9; };
  /* ---- turning an intent into actions ---- */
  function applyIntent(s, it, dt) {
    const p = M.puck, has = p.owner === s;
    s.holdTurbo = it.turbo; s.lastAim = it.aim;
    if (it.press.chirp && s.cool.chirp <= 0) chirp(s);
    if (s.human && (it.press.switch || (it.press.pass && !has && !(p.owner && p.owner.team === s.team)))) { if (switchSkater(s.human, it.press.switch)) return; }
    if (!Skater.free(s) || s.state === 'check') { s.shootHold = 0; s.winding = false; return; }
    if (M.phase !== 'play' && M.phase !== 'shootout') return;
    if (has) {
      if (s.twisterT > 0) return;
      if (Math.abs(it.stickY || 0) > .3) { s.stickMem = it.stickY; s.stickMemT = M.t; }   // the aim survives letting go of the stick as the shot fires
      if (it.press.pass) { Skater.pass(s, { aim: it.aim, to: it.passTo, dir: Math.hypot(it.mx, it.my) > .3 ? Math.atan2(it.my, it.mx) : undefined }); return; }
      if (it.press.lob) { Skater.pass(s, { aim: it.aim, to: it.passTo, saucer: true, dir: Math.hypot(it.mx, it.my) > .3 ? Math.atan2(it.my, it.mx) : undefined }); return; }
      if (it.press.deke) { Skater.deke(s, Math.hypot(it.mx, it.my) > .3 ? (U.angDiff(Math.atan2(it.my, it.mx), s.facing) > 0 ? 1 : -1) : 0); return; }
      if (it.shoot) {
        s.shootHold += dt;
        if (s.shootHold > .18) { s.winding = true; s.charge = Math.min(1, s.charge + dt / T.slapCharge * (M.kaboomT[s.team] > 0 ? 2 : 1)); }
      } else if (s.shootHold > 0) {
        const kind = s.winding ? 'slap' : 'wrist', ch = s.charge;
        Skater.shoot(s, kind, ch, { aim: it.aim, stickY: s.human ? (Math.abs(it.stickY || 0) > .3 ? it.stickY : M.t - (s.stickMemT || -9) < .3 ? s.stickMem : 0) : 0, turbo: it.turbo && s.turbo > 0 });
        if (kind === 'slap') Bus.emit('slap', { by: s.id, team: s.team, charge: ch });
      }
      return;
    }
    s.shootHold = 0; s.winding = false; s.charge = 0;
    // without the puck: one-timers, checks, pokes, calls for the pass, gloves
    if ((it.press.shoot || it.shoot) && passIncoming(s)) { s.oneTimer = .35; if (s.human && it.press.shoot) Bus.emit('onetimer_ready', { by: s.id }); }
    else if (it.press.shoot) Skater.check(s) && Bus.emit('check_start', { by: s.id });
    if (it.press.deke) Skater.poke(s);
    if (it.press.pass && p.owner && p.owner.team === s.team && p.owner.ctrl === 'cpu' && s.human) { s.callT = 1.2; Bus.emit('call', { by: s.id }); if (p.owner.ai) { p.owner.ai.t = Math.min(p.owner.ai.t, .05); } }
    // gloves: hold lob for 0.5 s near a rival with a grudge
    if (it.lob && !has) {
      s.holdLob += dt;
      if (s.holdLob > .5) { s.holdLob = -99; Fight.challenge(s); }
    } else if (!it.lob) s.holdLob = 0;
  }
  /** a human takes over another skater of their team: the one nearest the puck (or the next, with the switch button) */
  function switchSkater(h, cycle) {
    const cur = h.s, p = M.puck, free = M.skaters.filter(x => x.team === h.team && x !== cur && x.ctrl === 'cpu' && x.state !== 'bin' && !x.off);
    if (!free.length) return false;
    const pick = cycle ? free.sort((a, b) => a.slot - b.slot).find(x => x.slot > cur.slot) || free[0] : free.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!pick) return false;
    give(h, pick); A.sfx('tock'); return true;
  }
  function give(h, s) { if (h.s) { h.s.ctrl = 'cpu'; h.s.human = null; h.s.ai = AI.fresh(h.s); } h.s = s; s.ctrl = h.remote ? 'remote' : 'human'; s.human = h; }
  /** a lone human follows the play: a completed pass to a CPU teammate, or the defense when the puck is far away */
  function autoSwitch() {
    const p = M.puck;
    for (const h of M.humans) {
      const s = h.s; if (!s || h.noAuto) continue;
      const teamHumans = M.humans.filter(x => x.team === h.team).length;
      if (p.passTo && p.passTo.team === h.team && p.passTo.ctrl === 'cpu' && teamHumans === 1 && p.passFrom === s) { give(h, p.passTo); continue; }
      if (p.owner && p.owner.team === h.team && p.owner.ctrl === 'cpu' && teamHumans === 1 && p.owner.receivedFrom === s.id) { give(h, p.owner); continue; }
      if (!p.owner || p.owner.team === h.team || teamHumans > 1) continue;
      const li = s.lastIntent; if (li && Math.hypot(li.mx || 0, li.my || 0) > .3) { h.swT = 0; continue; }   // never swap skaters out from under a player who is steering
      if (!Skater.free(s)) { const alt = M.skaters.filter(x => x.team === h.team && x.ctrl === 'cpu' && Skater.free(x)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (alt) give(h, alt); continue; }
      const near = M.skaters.filter(x => x.team === h.team && x.ctrl === 'cpu' && Skater.free(x)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (near && Math.hypot(near.x - p.x, near.y - p.y) + 70 < Math.hypot(s.x - p.x, s.y - p.y) && (h.swT = (h.swT || 0) + 1) > 30) { give(h, near); h.swT = 0; }
    }
  }
  function chirp(s) {
    const foes = M.skaters.filter(o => o.team !== s.team && Math.hypot(o.x - s.x, o.y - s.y) < 120).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
    s.cool.chirp = 4; const line = U.pick(RNG.fx, TEXT.chirps); s.chirpT = 2.2; s.chirpText = line;
    const target = foes[0];
    if (target) { target.grudge[s.id] = Math.min(100, (target.grudge[s.id] || 0) + 15); if (target.ai && s.human && target.def.fgt >= 4) target.challengeBias = (target.challengeBias || 0) + .2; }
    Bus.emit('chirp', { by: s.id, team: s.team, target: target ? target.id : null, line });
  }
  /* ---- one skater's step: timers, intent, skating, states, rig ---- */
  function skaterStep(s, dt) {
    for (const k in s.cool) s.cool[k] = Math.max(0, s.cool[k] - dt);
    for (const k of ['hotsauce', 'tape', 'poutine', 'cocoa']) if (s.items[k] > 0) s.items[k] = Math.max(0, s.items[k] - dt);
    s.oneTimer = Math.max(0, s.oneTimer - dt); s.receiving = Math.max(0, s.receiving - dt); s.callT = Math.max(0, s.callT - dt); s.chirpT = Math.max(0, s.chirpT - dt);
    s.slowT = Math.max(0, (s.slowT || 0) - dt); s.stateT += dt;
    if (s.act) { s.act.t += dt; if (s.act.t > .45) s.act = null; }
    if (s.off) return;
    if (s.state === 'bin') { return; }
    if (s.state === 'fight') return;
    // timed states
    const st = s.state;
    if (st === 'check' && s.stateT > .3) s.state = 'skate';
    if (st === 'deke' && s.stateT > .45) { s.state = 'skate'; s.spin = false; }
    if (st === 'stun' && s.stateT > (s.stunT || .3)) s.state = 'skate';
    if (st === 'down' && s.stateT > (s.downT || 1.4)) { s.state = 'getup'; s.stateT = 0; }
    if (st === 'getup' && s.stateT > .5) s.state = 'skate';
    if (st === 'slip' && s.stateT > 1.2) { s.state = 'getup'; s.stateT = 0; }
    if (st === 'frozen' && s.stateT > 3) { s.state = 'skate'; Items.popOut(s); }
    if (st === 'buried' && s.stateT > 1.5) s.state = 'skate';
    if (st === 'celebrate' && s.stateT > 3) s.state = 'skate';
    if (s.twisterT > 0) { s.twisterT -= dt; s.spinA = (s.spinA || 0) + dt * 18; if (s.twisterT <= 0 && M.puck.owner === s) { const p = Skater.shoot(s, 'wrist', 0, {}); p.curl = (s.y > C.y ? -1 : 1) * 1.2; p.twister = true; } }
    // the intent
    let it;
    if (s.ctrl === 'cpu' || (M.attract && s.ctrl !== 'remote')) it = AI.intent(s, dt);
    else if (s.human) it = humanIntent(s.human, dt);
    else it = { mx: 0, my: 0, press: {} };
    if ((M.cheats.freezeAI && s.ctrl === 'cpu' && !M.attract) || s.dummy) it = { mx: 0, my: 0, press: {} };
    if (M.phase === 'play' || M.phase === 'shootout') applyIntent(s, it, dt);
    s.lastIntent = it;
    // turbo
    const inf = s.items.hotsauce > 0 || M.kaboomT[s.team] > 0 || (M.cheats.turbo && s.ctrl !== 'cpu') || (M.attract);
    const moving = Math.hypot(s.vx, s.vy) > 20, useT = it.turbo && moving && (s.turbo > 0 || inf);
    if (useT && !inf) { s.turbo = Math.max(0, s.turbo - T.turboDrain * dt); s.turboIdle = 0; M.stats[s.id].turbo += dt; }
    else { s.turboIdle += dt; if (s.turboIdle > .6) s.turbo = Math.min(1, s.turbo + T.turboRegen * dt); }
    if (s.items.cocoa > 0) s.turbo = 1;
    // skating
    const locked = ['down', 'getup', 'stun', 'slip', 'frozen', 'buried', 'celebrate'].includes(s.state) || M.phase === 'faceoff' || (M.phase !== 'play' && M.phase !== 'shootout' && M.phase !== 'goal' && M.phase !== 'stoppage');
    if (s.state === 'down' || s.state === 'slip') { const k = Math.exp(-dt * 2.2); s.vx *= k; s.vy *= k; }
    else if (locked) { const k = Math.exp(-dt * (M.phase === 'faceoff' ? 12 : 3)); s.vx *= k; s.vy *= k; if (M.phase === 'goal' && s.state === 'celebrate' && s.team === M.lastGoalTeam) { /* glide in celebration */ } }
    else if (s.state !== 'deke') {
      if (M.phase === 'goal' || M.phase === 'stoppage') { const k = Math.exp(-dt * 2); s.vx *= k; s.vy *= k; }
      else { const ev = Skater.skateStep(s, it.mx, it.my, useT, dt); if (ev === 'stop') { Bus.emit('stop', { by: s.id, x: s.x, y: s.y, side: s.stopSide }); Rink.scuffAt(s.x, s.y, .12); } }
    } else { const k = Math.exp(-dt * 1.5); s.vx *= k; s.vy *= k; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    const sp = Math.hypot(s.vx, s.vy);
    if (sp > 20) Rink.scuffAt(s.x, s.y, .0025 * sp / 132 * 2, M.kaboomT[s.team] > 0 ? .05 * dt * 60 : 0);
    // poke reach
    if (s.act && s.act.kind === 'poke' && !s.pokeHit && s.act.t > .1 && s.act.t < .3) {
      const p = M.puck, c = Math.cos(s.facing), n = Math.sin(s.facing), bx = s.x + c * 18, by = s.y + n * 18;
      if (p.owner && p.owner.team !== s.team && Math.hypot(p.x - bx, p.y - by) < 10) {
        s.pokeHit = true;
        const ok = !(p.owner.items.tape > 0) && RNG.sim() < .55 + .08 * (s.def.hnd - p.owner.def.hnd) + (p.owner.state === 'deke' && p.owner.stateT < .3 ? -.4 : 0);
        Bus.emit('poke', { by: s.id, ok, team: s.team, victim: p.owner.id });
        if (ok) { const o = p.owner; Skater.release(o, c * 110 + o.vx * .3, n * 110 + o.vy * .3, 0, 'poke'); p.lastTouch = s; M.stats[s.id].takeaways++; s.cool.pickup = 0; }
        else s.slowT = .3;
      }
    }
    // stride phase and the rig
    rigStep(s, dt);
  }
  function rigStep(s, dt) {
    const sp = Math.hypot(s.vx, s.vy), p = M.puck, has = p.owner === s;
    s.phaseA += dt * (sp / 22) * (s.holdTurbo ? 1.25 : 1);
    const hk = s.rig.hk || (s.rig.hk = { mode: 'skate' });
    hk.mode = s.state === 'fight' ? 'none' : 'skate'; hk.phase = s.phaseA; hk.speed = sp / 150; hk.turbo = s.holdTurbo && sp > 60; hk.stop = s.state === 'stop' ? 1 : 0; hk.stopSide = s.stopSide; hk.hand = s.def.hand || 1;
    hk.cross = Math.abs(s.turning || 0) > .5 && sp > 70 ? Math.sign(s.turning) : 0; hk.carry = has; hk.charge = s.charge; hk.saucer = s.act && s.act.saucer;
    hk.stick = s.winding ? 'wind' : s.act ? s.act.kind : s.state === 'check' ? 'check' : M.phase === 'faceoff' && Math.hypot(s.x - M.foDot[0], s.y - M.foDot[1]) < 14 ? 'faceoff' : s.state === 'celebrate' ? s.celebrate : 'idle';
    hk.t = s.act ? s.act.t : s.stateT;
    let down = 0, pose = null, expr = null, flip = 0;
    if (s.state === 'down') down = Math.min(1, s.stateT * 4);
    else if (s.state === 'getup') down = Math.max(0, 1 - s.stateT * 2);
    else if (s.state === 'slip') { down = Math.min(1, s.stateT * 6); flip = Math.min(.3, s.stateT); }
    if (s.state === 'celebrate') { pose = s.celebrate === 'pump' || s.celebrate === 'raised' ? 'cheer' : s.celebrate === 'slide' ? 'kneel' : null; expr = 'shout'; }
    if (s.state === 'stun') expr = 'wince';
    if (s.chirpT > 0) expr = 'shout';
    if (s.state === 'deke' && s.spin) s.spinA = (s.spinA || 0) + dt * 14;
    s.rig.spin = (s.state === 'deke' && s.spin) || s.twisterT > 0 ? (s.spinA || 0) % TAU : 0;
    if (s.state !== 'fight') s.rig.update(dt, { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, facing: s.facing, down, pose, expr, hurt: s.state === 'stun', flip: flip || undefined, lean: s.state === 'check' ? .3 : undefined });
  }
  /* ---- bodies: pushes, accidental hits, boards ---- */
  function bodies(dt) {
    const L = M.skaters.filter(s => !s.off && s.state !== 'bin' && s.state !== 'fight');
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = 14;
      if (d >= R || d < .01) continue;
      const nx = dx / d, ny = dy / d, ma = a.def.build === 'bulky' ? 1.35 : 1, mb = b.def.build === 'bulky' ? 1.35 : 1, over = R - d;
      a.x -= nx * over * mb / (ma + mb); a.y -= ny * over * mb / (ma + mb); b.x += nx * over * ma / (ma + mb); b.y += ny * over * ma / (ma + mb);
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv > 0) {
        if (a.team !== b.team && (a.state === 'check' || b.state === 'check')) Hits.contact(a.state === 'check' ? a : b, a.state === 'check' ? b : a, rv);
        else if (a.team !== b.team && rv > T.accidentalHit) Hits.contact(a, b, rv, true);
        const j2 = (1 + .3) * rv / (1 / ma + 1 / mb); a.vx -= j2 * nx / ma; a.vy -= j2 * ny / ma; b.vx += j2 * nx / mb; b.vy += j2 * ny / mb;
      }
    }
    for (const s of L) {
      // nets are solid
      for (const side of [0, 1]) { const gx = Rink.goalX(side), od = Rink.outDir(side), lx = (s.x - gx) * od; if (lx > -6 && lx < Rink.NETD + 6 && Math.abs(s.y - C.y) < Rink.MOUTH + 6) { if (lx < Rink.NETD / 2) { s.x = gx - od * 6; s.vx *= -.2; } else { s.x = gx + od * (Rink.NETD + 6); s.vx *= -.2; } } }
      // goalies are solid too
      for (const g of M.goalies) { const dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy); if (d < 14 && d > .01) { s.x = g.x + dx / d * 14; s.y = g.y + dy / d * 14; const vn = s.vx * dx / d + s.vy * dy / d; if (vn < 0) { s.vx -= vn * dx / d; s.vy -= vn * dy / d; } } }
      const vx0 = s.vx, vy0 = s.vy, hit = Rink.clamp(s, 7, M.arena.snowbank ? .2 : .3, .85);
      if (hit && hit.speedIn > 0) Hits.boards(s, hit.speedIn, hit.n, Math.hypot(vx0, vy0));
    }
  }
  /* ---- phases ---- */
  function goal(side) {
    const p = M.puck, team = (1 - side) ^ M.flip;   // the team attacking this side scores
    if (M.phase !== 'play' && M.phase !== 'shootout') return;
    const by = p.lastTouch && p.lastTouch.team === team ? p.lastTouch : p.prevTouch && p.prevTouch.team === team ? p.prevTouch : null;
    p.inNet = true; p.owner = null; p.netSide = side; p.vx *= .3; p.vy *= .3;
    const kindRaw = p.shotKind || 'wrist', kind = p.onFire ? 'kaboom' : by && by.state === 'deke' || (by && by.dekeAt && M.t - by.dekeAt < 1.2) ? 'deke' : p.kind === 'rebound' ? 'rebound' : p.kind === 'deflect' ? 'deflect' : kindRaw;
    if (M.phase === 'shootout') return Shootout.scored(team, by);
    M.score[team]++;
    const assists = []; if (by) { const a = M.events.filter(e => e.type === 'pass_complete' && e.to === by.id && M.t - e.t < 8 && e.team === team).slice(-2); for (const e of a.reverse()) if (!assists.includes(e.by) && e.by !== by.id) assists.push(e.by); }
    const ppg = M.sinBin.some(b => b.s.team !== team);
    if (by) { M.stats[by.id].goals++; for (const a of assists) M.stats[a].assists++; }
    M.stats['g' + (1 - team)].against++;
    const ev = { team, by: by ? by.id : null, name: by ? by.name : TEAMS[team === 0 ? M.cfg.home : M.cfg.away].short, assists, kind, ppg, side, period: M.period, clock: M.clock, onetimer: kind === 'onetimer' };
    M.goals.push(ev); M.lastGoalTeam = team; M.lastGoal = ev;
    Bus.emit('goal', ev);
    if (by && M.stats[by.id].goals === 3) Bus.emit('hat_trick', { by: by.id, team, name: by.name });
    if (by && M.stats[by.id].goals >= 1 && M.stats[by.id].assists >= 1 && M.stats[by.id].fightsWon >= 1 && !by.hoser) { by.hoser = true; Bus.emit('hoser_hat_trick', { by: by.id, team }); }
    if (M.kaboomT[1 - team] > 0) Boom.end(1 - team);
    // the scorer celebrates, mates converge
    for (const s of M.skaters) if (s.team === team && Skater.free(s)) { s.state = 'celebrate'; s.stateT = 0; s.celebrate = s === by ? (s.def.look && s.def.look.celebrate) || ['pump', 'rifle', 'guitar', 'slide', 'raised'][U.hashStr(s.id + M.goals.length) % 5] : 'raised'; }
    M.goalies[1 - team].state = 'ready';
    Replay.markGoal();
    setPhase('goal');
    if (M.ot && !M.cfg.session) M.suddenDeath = true;
  }
  function stoppage(kind, dot) {
    if (M.phase !== 'play') return;
    M.stopKind = kind; M.stopDot = dot || [C.x, C.y]; setPhase('stoppage'); Bus.emit('whistle', { kind });
  }
  function periodName(n) { return n > M.cfg.periods ? (M.so ? 'SHOOTOUT' : 'OVERTIME') : ['1ST', '2ND', '3RD', '4TH', '5TH'][n - 1] + ' PERIOD'; }
  function endPeriod() {
    setPhase('periodEnd'); Bus.emit('period_end', { n: M.period, home: M.score[0], away: M.score[1] });
  }
  function afterPeriod() {
    const last = M.period >= M.cfg.periods;
    if (M.ot || last) {
      const tied = M.score[0] === M.score[1];
      if (M.cfg.showcase && !M.so && !M.cfg.session) return Shootout.start(true);
      if (!tied) return final();
      if (!M.ot && M.cfg.ot) { M.ot = true; M.period++; M.clock = M.cfg.session ? 60 : 120; M.flip ^= 1; Bus.emit('ot_start', {}); for (const s of M.skaters) s.turbo = 1; return setupFaceoff([C.x, C.y]); }
      if (M.cfg.shootout && !M.cfg.session) return Shootout.start(false);
      return final();
    }
    // intermission: the Flood Wagon (offered), then the next period at the other end
    M.period++; M.clock = M.cfg.len; M.flip ^= 1;
    for (const s of M.skaters) s.turbo = 1;
    Bus.emit('intermission', { n: M.period - 1 });
    if (M.cfg.flood === false || M.attract || M.cfg.session || M.cfg.practice) { Rink.clearScuff(.9); Items.refreeze(); return setupFaceoff([C.x, C.y]); }
    setPhase('intermission');
  }
  function final() {
    if (M.phase === 'final') return;
    const w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    setPhase('final'); M.winner = w;
    for (const s of M.skaters) if (Skater.free(s) || s.state === 'skate') { s.state = 'celebrate'; s.stateT = -99; s.celebrate = s.team === w ? 'raised' : 'slump'; }
    for (const g of M.goalies) g.state = g.team === w ? 'celebrate' : 'ready';
    M.stars = threeStars();
    Bus.emit('final', { winner: w, score: M.score.slice() });
  }
  function threeStars() {
    const list = [];
    for (const s of M.skaters) { const st = M.stats[s.id]; list.push({ id: s.id, team: s.team, name: s.name, rig: s.rig, score: 3 * st.goals + 2 * st.assists + .5 * st.bigHits + 1.5 * st.fightsWon + .3 * st.shots + RNG.fx() * .01, line: st.goals + ' G  ' + st.assists + ' A  ' + st.hits + ' HITS', g: st.goals }); }
    for (const g of M.goalies) { const st = M.stats[g.id], sa = st.saves + st.against, pct = sa ? st.saves / sa : 1; list.push({ id: g.id, team: g.team, name: g.name, rig: g.rig, goalie: true, score: .12 * st.saves + 2 * (pct - .85) * 10, line: st.saves + ' SAVES  ' + (sa ? (pct).toFixed(3).replace(/^0/, '') : '1.000') + ' SV%', sv: st.saves }); }
    return list.sort((a, b) => b.score - a.score).slice(0, 3);
  }
  /* ---- the step ---- */
  function step(dt) {
    if (!M) return;
    M.t += dt; M.phaseT += dt;
    if (M.devPause) return;
    for (const h of M.humans) if (h.s && h.s.state === 'bin') { const alt = M.skaters.find(x => x.team === h.team && x.ctrl === 'cpu' && x.state !== 'bin'); if (alt) give(h, alt); }
    const ph = M.phase;
    if (ph === 'intro') { introStep(dt); return camAndRigs(dt); }
    if (ph === 'fight') { Fight.step(dt); M.skaters.forEach(s => { if (s.state !== 'fight') { s.vx *= .95; s.vy *= .95; s.x += s.vx * dt; s.y += s.vy * dt; rigStep(s, dt); } }); M.goalies.forEach(g => Goalie.update(g, dt)); refsStep(dt); Boom.step(dt); return camAndRigs(dt); }
    if (ph === 'replay') { Replay.step(dt); if (Replay.done()) { Replay.stop(); setupFaceoff([C.x, C.y]); } return; }
    if (ph === 'shootout') { Shootout.step(dt); }
    if (ph === 'faceoff') faceoffStep(dt);
    for (const s of M.skaters) skaterStep(s, dt);
    if (ph === 'play' || ph === 'shootout') { bodies(dt); Puck.step(dt); }
    else if (ph === 'goal' || ph === 'stoppage') { bodies(dt); Puck.step(dt); }
    else if (ph === 'faceoff') Puck.step(dt);
    for (const g of M.goalies) Goalie.update(g, dt);
    if (ph === 'play' || ph === 'shootout') { Hits.step(dt); Items.step(dt); }
    if (ph === 'play') Fight.watch(dt);
    Boom.step(dt);
    if (ph === 'play') {
      autoSwitch();
      if (M.puck.curl) { const p = M.puck, sp = Math.hypot(p.vx, p.vy); if (sp > 30 && !p.owner) { const k = p.curl * dt; const vx = p.vx; p.vx += -p.vy * k; p.vy += vx * k; p.curl *= Math.exp(-dt * 1.4); } else p.curl = 0; }
      if (!M.cfg.noClock) { M.clock -= dt; for (const b of M.sinBin) b.t -= dt; }
      binStep();
      if (M.clock <= 0) { M.clock = 0; endPeriod(); }
      Boss.step(dt);
      if (M.cfg.script) M.cfg.script(dt);
    }
    if (ph === 'goal' && M.cfg.practice) { if (M.phaseT > 1) { M.puck.inNet = false; M.puck.dead = false; for (const s of M.skaters) if (s.state === 'celebrate') s.state = 'skate'; setPhase('play'); } }
    else if (ph === 'stoppage' && M.cfg.practice) { if (M.phaseT > .8) { M.puck.held = false; M.puck.dead = false; for (const g of M.goalies) if (g.state === 'cover' || g.state === 'glove') g.state = 'ready'; setPhase('play'); } }
    else if (ph === 'goal') { if (M.phaseT > (M.cfg.session ? 2 : 2.8)) { if (M.suddenDeath) return final(); if (M.cfg.replays !== false && S().replays !== 'Off' && !M.attractNoReplay) { setPhase('replay'); Replay.playGoal(M.cfg.session ? 3 : 4); } else setupFaceoff([C.x, C.y]); } }
    else if (ph === 'stoppage' && M.phaseT > 1.6) { Items.atStoppage(); if (M.pendingReplay && S().replays !== 'Off' && !M.cfg.session && !M.attract) { M.pendingReplay = false; setPhase('replay'); Replay.playClip(); } else setupFaceoff(M.stopDot); }
    if (ph === 'periodEnd' && M.phaseT > 3) afterPeriod();
    if (ph === 'final' && M.phaseT > 4.5 && !M.finished) { M.finished = true; Bus.emit('match_over', { winner: M.winner }); }
    refsStep(dt);
    camAndRigs(dt);
    Replay.record();
  }
  function camAndRigs(dt) { Cam.update(dt); Crowd.step(dt); }
  function introStep(dt) {
    // lineup on the blue lines, a spotlight sweeping each player as the announcer calls them
    if (M.phaseT < dt * 1.5) {
      for (const t of [0, 1]) { const own = Skater.ownGoal(t), dir = -Rink.outDir(own.side); M.skaters.filter(s => s.team === t).forEach((s, k) => { s.x = C.x - dir * 108 + (RNG.fx() - .5) * 2; s.y = C.y - 60 + k * 60; s.vx = s.vy = 0; s.facing = PI / 2; s.state = 'skate'; }); }
      M.introI = -1; M.introT = 0;
    }
    M.introT -= dt;
    const order = M.skaters;
    if (M.introT <= 0) { M.introI++; M.introT = 1.1; const s = order[M.introI]; if (s) Bus.emit('intro', { by: s.id, team: s.team, name: s.name, num: s.def.num }); }
    for (const s of M.skaters) { s.facing = PI / 2; rigStep(s, dt); }
    for (const g of M.goalies) Goalie.update(g, dt);
    refsStep(dt);
    if (M.introI >= order.length || UI.anyPressed('confirm') || UI.anyPressed('start')) { game.players.forEach(p => p.consumeAll()); setupFaceoff([C.x, C.y]); Bus.emit('puck_drop_ready', {}); }
  }
  function faceoffStep(dt) {
    const p = M.puck, centers = [0, 1].map(t => M.skaters.filter(s => s.team === t && s.state !== 'bin' && !s.off).sort((a, b) => Math.hypot(a.x - M.foDot[0], a.y - M.foDot[1]) - Math.hypot(b.x - M.foDot[0], b.y - M.foDot[1]))[0]);
    if (M.phaseT < M.foDrop) {
      // a press before the drop is a mistimed swipe
      centers.forEach((c, t) => { if (c && c.human && (c.human.input && !c.human.remote ? c.human.input.pressed('pass') || c.human.input.pressed('shoot') : Net.pressedFor(c.human, 'pass'))) M.foPress[t] = -1; });
      return;
    }
    if (!M.dropped) { M.dropped = true; p.held = false; p.z = 14; p.vz = -40; Bus.emit('faceoff_drop', { x: p.x, y: p.y }); }
    const since = M.phaseT - M.foDrop;
    centers.forEach((c, t) => {
      if (!c || M.foPress[t] !== null && M.foPress[t] !== -1) return;
      if (c.ctrl === 'cpu' || M.attract) { const skill = c.ai ? c.ai.skill : .5; const r = lerp(.35, .1, skill) + (c.ai ? (U.hashStr(c.id + M.t.toFixed(1)) % 100) / 100 * .08 : 0); if (since >= r) M.foPress[t] = since; }
      else if (c.human) { const pr = c.human.remote ? Net.pressedFor(c.human, 'pass') || Net.pressedFor(c.human, 'shoot') : c.human.input.pressed('pass') || c.human.input.pressed('shoot'); if (pr) M.foPress[t] = M.foPress[t] === -1 ? since + .12 : since; }
    });
    const a = M.foPress[0], b = M.foPress[1], va = a !== null && a >= 0, vb = b !== null && b >= 0;
    let win = null;
    if (va && (!vb || a <= b)) win = 0; else if (vb) win = 1;
    if (win === null && since > .9) win = RNG.sim() < .5 ? 0 : 1;
    if (win !== null && !centers[win]) { p.held = false; p.z = 0; M.dropped = false; setPhase('play'); return; }
    if (win !== null) {
      const c = centers[win], own = Skater.ownGoal(win), back = -Rink.outDir(own.side) * -1;
      const mate = M.skaters.filter(s => s.team === win && s !== c && s.state !== 'bin' && !s.off).sort((x, y) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y.x - c.x, y.y - c.y))[0];
      const tx = mate ? mate.x : c.x + back * 40, ty = mate ? mate.y : c.y, ang = Math.atan2(ty - M.foDot[1], tx - M.foDot[0]);
      p.held = false; p.z = 0; p.vz = 0; p.x = M.foDot[0]; p.y = M.foDot[1]; p.vx = Math.cos(ang) * 150; p.vy = Math.sin(ang) * 150; p.lastTouch = c; p.touchT = M.t; p.passTo = mate || null; p.passFrom = c;
      if (c) { c.act = { kind: 'pass', t: 0 }; c.cool.pickup = .2; }
      M.fo[win]++; Bus.emit('faceoff_won', { team: win, by: c ? c.id : null });
      M.dropped = false; setPhase('play');
    }
  }
  function binStep() {
    for (let i = M.sinBin.length - 1; i >= 0; i--) {
      const b = M.sinBin[i];
      if (b.t <= 0) { M.sinBin.splice(i, 1); const s = b.s, own = Skater.ownGoal(s.team); s.state = 'skate'; s.x = C.x + (s.team ? 36 : -36); s.y = Rink.Y0 + 14; s.vx = 0; s.vy = 40; s.ai = AI.fresh(s); Bus.emit('sin_bin_end', { who: s.id, team: s.team }); }
    }
  }
  function refsStep(dt) {
    const p = M.puck, [r0, r1] = M.refs;
    if (M.phase === 'play') {
      const tx = clamp(p.x + (p.x > C.x ? -60 : 60), Rink.X0 + 40, Rink.X1 - 40), ty = clamp(p.y > C.y ? p.y - 80 : p.y + 80, Rink.Y0 + 20, Rink.Y1 - 20);
      for (const [r, x, y] of [[r0, tx, ty], [r1, clamp(C.x + (p.x - C.x) * .5, Rink.X0 + 60, Rink.X1 - 60), Rink.Y0 + 16]]) {
        const dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy), v = Math.min(110, d * 2); r.vx = d > 2 ? dx / d * v : 0; r.vy = d > 2 ? dy / d * v : 0; r.x += r.vx * dt; r.y += r.vy * dt;
        Rink.clamp(r, 7);
      }
    }
    for (const r of M.refs) {
      r.facing = U.approachAng(r.facing, Math.atan2(p.y - r.y, p.x - r.x), 6 * dt);
      if (r.down > 0) r.down -= dt;
      const arm = M.phase === 'faceoff' && r === r0 && M.phaseT < M.foDrop;
      r.rig.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx, vy: r.vy, facing: r.facing, pose: arm ? 'wave' : r.twirl > 0 ? 'cheer' : null, down: r.down > 0 ? Math.min(1, (1.6 - r.down) * 4) : 0 });
      if (r.twirl > 0) r.twirl -= dt;
    }
  }
  /* ---- the public API ---- */
  let lastCfg = null;
  function start(cfg) {
    lastCfg = cfg; Bus.clear(); create(cfg);
    for (const s of M.skaters) s.rig.update(0, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, facing: s.facing });
    if (cfg.intros !== false && S().intros !== false && !cfg.attract && !cfg.session && !cfg.practice) setPhase('intro'); else setupFaceoff([C.x, C.y]);
    if (cfg.practice) { M.puck.held = false; setPhase('play'); if (cfg.init) cfg.init(); }
    if (cfg.warp) M.pendingWarp = cfg.warp;
    Bus.emit('match_start', { home: cfg.home, away: cfg.away, arena: cfg.arena });
    return M;
  }
  function restart() { if (lastCfg && game.sceneName === 'match') { game.resume && game.resume(); game.go('match', Object.assign({}, lastCfg, { seed: (lastCfg.seed || 1) + 1 })); } else game.resume && game.resume(); }
  function showInfo() {
    if (!M) return;
    const lines = M.objectives.length ? M.objectives.map(o => (o.done ? '★ ' : '- ') + o.text + (o.need > 1 ? ' (' + o.n + '/' + o.need + ')' : '')) : [TEAMS[M.cfg.home].name + ' vs ' + TEAMS[M.cfg.away].name, ARENAS[M.cfg.arena].name, M.cfg.periods + ' periods of ' + U.mmss(M.cfg.len), 'Difficulty: ' + (M.cfg.difficulty || S().difficulty)];
    UI.toast(M.objectives.length ? 'OBJECTIVES' : 'THIS GAME', lines[0]); for (let i = 1; i < lines.length; i++) UI.toast('', lines[i]);
  }
  Bus.on('*', e => { if (M) { M.events.push(e); if (M.events.length > 300) M.events.shift(); } });
  wire();
  return { create, start, step, restart, showInfo, setupFaceoff, setPhase, goal, stoppage, final, endPeriod, afterPeriod, threeStars, periodName, skaterStep, rigStep, applyIntent, humanIntent, give, switchSkater, chirp, passIncoming, PERIOD_LEN, DIFF, get cfg() { return lastCfg; } };
})();
