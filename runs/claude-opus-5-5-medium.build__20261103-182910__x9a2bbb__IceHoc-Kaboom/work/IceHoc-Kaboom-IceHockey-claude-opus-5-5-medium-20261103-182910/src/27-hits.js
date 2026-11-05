/* ---- Hits: checks, impulses, knockdowns, the glass, grudges (PLAN 7.7) ---- */
const Hits = (() => {
  const mass = s => s.def.build === 'bulky' ? 1.35 : 1;
  function reset() {}
  /** a contact between a checking skater a and b at closing speed v (accidental: no check) */
  function contact(a, b, v, accidental) {
    if (accidental) { if (b.items.poutine > 0 || (M.cheats.god && b.ctrl !== 'cpu')) return; knock(b, a, v * .8, false); Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(v), big: true, team: a.team, accidental: true }); return; }
    if (a.hitDone && a.hitDone[b.id]) return; if (a.hitDone) a.hitDone[b.id] = 1;
    if (b.state === 'deke' && b.stateT < .3 && RNG.sim() < .7 + .04 * (b.def.hnd - 3)) { Bus.emit('deke_dodge', { by: b.id, victim: a.id }); return; }
    let imp = T.checkPower * (v + 60) * (mass(a) / mass(b)) * Skater.hitMul(a.def) * (a.holdTurbo && a.turbo > 0 ? 1.45 : 1) * (M.kaboomT[a.team] > 0 ? 2 : 1) * (a.items.poutine > 0 ? 1.6 : 1) * (M.tactic && M.tactic[a.team] === 'grit' ? 1.1 : 1);
    if (b.twisterT > 0) imp = Math.max(imp, T.knockdown + 10);
    if (a.items.poutine > 0) imp = Math.max(imp, T.knockdown + 5);
    const unstoppable = b.items.poutine > 0 || (M.cheats.god && b.ctrl !== 'cpu' && !M.attract);
    const p = M.puck, had = p.owner === b;
    const nx = (b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1), ny = (b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
    if (imp < 90 || unstoppable) {
      b.state = 'stun'; b.stateT = 0; b.stunT = .25; b.vx += nx * imp * .3; b.vy += ny * imp * .3;
      if (had && !unstoppable && !(b.items.tape > 0) && RNG.sim() < .5) loose(b, a, nx, ny);
      Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(imp), big: false, bump: true, team: a.team });
      grudge(b, a, 5);
    } else if (imp < T.knockdown) {
      b.state = 'stun'; b.stateT = 0; b.stunT = .5; b.vx += nx * imp * .5; b.vy += ny * imp * .5;
      if (had && !(b.items.tape > 0)) loose(b, a, nx, ny);
      Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(imp), big: false, team: a.team });
      grudge(b, a, 10);
    } else {
      if (had) loose(b, a, nx, ny);
      knock(b, a, imp, true);
      Bus.emit('hit', { by: a.id, victim: b.id, power: Math.round(imp), big: true, team: a.team, x: b.x, y: b.y });
      grudge(b, a, 35); for (const m of M.skaters) if (m.team === b.team && m !== b) grudge(m, a, 10);
      M.bigHitT = M.t; Replay.markClip('hit', imp);
      Items.hitOnIce(b, imp);
    }
    if (M.mascot && b === M.mascot) return;
  }
  function loose(b, a, nx, ny) { const p = M.puck; Skater.release(b, nx * 60 + b.vx * .5, ny * 60 + b.vy * .5, 0, 'loose'); p.lastTouch = a; p.touchT = M.t; M.stats[a.id].takeaways++; }
  function knock(b, a, imp, big) {
    b.state = 'down'; b.stateT = 0; b.downT = 1.4; b.shootHold = 0; b.winding = false;
    const nx = (b.x - a.x) / (Math.hypot(b.x - a.x, b.y - a.y) || 1), ny = (b.y - a.y) / (Math.hypot(b.x - a.x, b.y - a.y) || 1);
    b.vx = nx * imp * .8 + a.vx * .3; b.vy = ny * imp * .8 + a.vy * .3; b.knockV = imp * .8;
    Rink.scuffAt(b.x, b.y, .2);
    if (M.puck.owner === b) Skater.release(b, nx * 60, ny * 60, 0, 'loose');
  }
  function grudge(victim, by, n) { victim.grudge[by.id] = Math.min(100, (victim.grudge[by.id] || 0) + n); victim.grudgeT = M.t; }
  /** a body into the boards: rattle, crack or shatter the glass (snowbanks bury) */
  function boards(s, vin, n, sp) {
    if (vin > 120) Bus.emit('rattle', { x: s.x, y: s.y, by: s.id, speed: vin });
    const pan = Rink.panelAt(s.x, s.y);
    if (s.state !== 'down' && s.state !== 'stun') return;
    if (M.arena.snowbank) { if (s.state === 'down' && vin > T.glassCrack * .8) { s.state = 'buried'; s.stateT = 0; Bus.emit('buried', { victim: s.id, x: s.x, y: s.y }); } return; }
    s.rig.kick(-.4);
    if (vin > T.glassShatter || (pan.state === 'cracked' && vin > T.glassCrack)) breakPanel(pan, 'shattered', s);
    else if (vin > T.glassCrack && pan.state === 'ok') breakPanel(pan, 'cracked', s);
    if (vin > T.glassCrack) Replay.markClip('glass', vin + 60);
  }
  function breakPanel(pan, state, by) {
    if (!pan || pan.state === 'shattered' || M.arena.snowbank) return;
    if (state === 'cracked' && pan.state === 'cracked') state = 'shattered';
    pan.state = state; pan.shake = .5;
    Bus.emit('glass', { panel: pan.i, state, by: by ? by.id : null, team: by ? (M.teamOf(M.lastHitter || '') >= 0 ? M.teamOf(M.lastHitter) : 1 - by.team) : -1, x: pan.m[0], y: pan.m[1] });
  }
  Bus.on('hit', e => { if (M) M.lastHitter = e.by; });
  /** grudges cool off after 3 s of peace */
  function step(dt) { for (const s of M.skaters) if (M.t - (s.grudgeT || 0) > 8) for (const k in s.grudge) s.grudge[k] = Math.max(0, s.grudge[k] - 2 * dt); }
  return { reset, contact, boards, breakPanel, step, knock };
})();

/* ---- Boom: one BOOM meter per team; at 100, KABOOM mode (PLAN 7.10) ---- */
const Boom = (() => {
  const GAIN = { bighit: 18, check: 6, crack: 8, shatter: 15, fightWin: 45, fightLoss: 5, goal: 20, shotOnGoal: 4, save: 5, pass: 2, onetimer: 6, deke: 6, chirp: 3, boombox: 40, mascot: 10, flood: 30, organ: 30, turtleGain: 10, turtleLoss: -10, draw: 10 };
  function reset(m) { m.boom = [0, 0]; m.kaboomT = [0, 0]; }
  function add(team, n, why) {
    if (!M || team < 0 || team > 1) return;
    if (M.kaboomT[team] > 0 && n > 0) return;
    const k = n > 0 ? T.boomGain * (M.tactic && M.tactic[team] === 'grit' ? 1.15 : 1) : 1;
    M.boom[team] = clamp(M.boom[team] + n * k, 0, 100);
    if (M.boom[team] >= 100) start(team);
  }
  function start(team) {
    if (M.kaboomT[team] > 0) return;
    M.boom[team] = 0; M.kaboomT[team] = T.kaboomTime; M.kabooms[team]++;
    for (const s of M.skaters) if (s.team === team) s.turbo = 1;
    Bus.emit('kaboom_start', { team, gilded: TEAMS[team === 0 ? M.cfg.home : M.cfg.away].id === 'grizzlies' });
    Replay.markClip('kaboom', 300);
  }
  function end(team) { if (M.kaboomT[team] <= 0) return; M.kaboomT[team] = 0; Bus.emit('kaboom_end', { team }); }
  function step(dt) {
    for (const t of [0, 1]) if (M.kaboomT[t] > 0 && M.phase === 'play') { M.kaboomT[t] -= dt; if (M.kaboomT[t] <= 0) { M.kaboomT[t] = 1e-9; end(t); } }
    if (M.cheats.alwaysKaboom) for (const h of M.humans) if (M.kaboomT[h.team] <= 0 && M.phase === 'play') start(h.team);
  }
  Bus.on('hit', e => { if (M) add(e.team, e.big ? GAIN.bighit : e.bump ? 0 : GAIN.check); });
  Bus.on('glass', e => { if (M && e.team >= 0) add(e.team, e.state === 'shattered' ? GAIN.shatter : GAIN.crack); });
  Bus.on('goal', e => { if (M) add(e.team, GAIN.goal + (e.kind === 'onetimer' ? GAIN.onetimer : 0)); });
  Bus.on('shot', e => { if (M && e.onGoal) add(e.team, GAIN.shotOnGoal); });
  Bus.on('save', e => { if (M) add(e.team, GAIN.save); });
  Bus.on('pass_complete', e => { if (M) add(e.team, GAIN.pass); });
  Bus.on('deke_beat', e => { if (M) add(e.team, GAIN.deke); });
  Bus.on('chirp', e => { if (M) add(e.team, GAIN.chirp); });
  Bus.on('mascot_down', e => { if (M) add(e.team, GAIN.mascot); });
  Bus.on('fight_end', e => { if (!M) return; if (e.draw) { add(0, GAIN.draw); add(1, GAIN.draw); } else { add(e.winnerTeam, GAIN.fightWin); add(1 - e.winnerTeam, GAIN.fightLoss); } });
  Bus.on('turtle', e => { if (!M) return; add(e.team, GAIN.turtleLoss); add(1 - e.team, GAIN.turtleGain); });
  return { add, start, end, step, reset, GAIN };
})();
