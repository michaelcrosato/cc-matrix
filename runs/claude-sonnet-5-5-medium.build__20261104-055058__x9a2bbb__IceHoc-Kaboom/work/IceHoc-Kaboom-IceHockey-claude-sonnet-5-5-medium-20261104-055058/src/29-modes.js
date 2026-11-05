/* ---- REPLAY ---- */
const Replay = (() => {
  const BUF = 8 * 60; let frames = [], tick = 0, clips = [];
  function record(m, dt) {
    if (m.phase === 'replay' || m.cfg.remoteClient) return; if ((tick++ & 1)) return;
    const f = { p: [m.puck.x, m.puck.y, m.puck.z], e: m.sk.map(s => [s.x, s.y, s.heading, s.vx, s.vy, s.state, s.fightU || 0, s.hood ? 1 : 0, s.swing > 0 ? 1 : 0, s.st]), g: m.gl.map(g => [g.x, g.y, g.state, g.heading]), fire: m.puck.fire ? 1 : 0 };
    frames.push(f); if (frames.length > BUF) frames.shift();
  }
  const canPlay = m => frames.length > 60;
  function start(m, kind) {
    const n = Math.min(frames.length, 240), clip = frames.slice(-n);
    const saved = { sk: m.sk.map(s => [s.x, s.y, s.heading, s.vx, s.vy, s.state, s.st]), gl: m.gl.map(g => [g.x, g.y, g.state, g.heading]), p: [m.puck.x, m.puck.y, m.puck.z] };
    m.rp = { clip, i: 0, saved, kind }; m.phase = 'replay'; m.pt = 0; Bus.emit('replay_start', { kind });
    const rec = m.stats.goals[m.stats.goals.length - 1]; clips.push({ clip, score: (rec && rec.fire ? 5 : 3) + (rec && rec.shot === 'onetimer' ? 2 : 0) + RNG.fx() }); clips.sort((a, b) => b.score - a.score); clips.length = Math.min(clips.length, 3);
  }
  function apply(m, f) {
    f.e.forEach((e, i) => { const s = m.sk[i]; s.x = e[0]; s.y = e[1]; s.heading = e[2]; s.vx = e[3]; s.vy = e[4]; s.state = e[5]; s.fightU = e[6]; s.hood = !!e[7]; s.st = e[9]; });
    f.g.forEach((e, i) => { const g = m.gl[i]; g.x = e[0]; g.y = e[1]; g.state = e[2]; g.heading = e[3]; });
    m.puck.x = f.p[0]; m.puck.y = f.p[1]; m.puck.z = f.p[2]; m.puck.fire = !!f.fire; m.puck.owner = null;
  }
  function restore(m) { const sv = m.rp.saved; m.sk.forEach((s, i) => { const e = sv.sk[i]; s.x = e[0]; s.y = e[1]; s.heading = e[2]; s.vx = e[3]; s.vy = e[4]; s.state = e[5]; s.st = e[6]; }); m.gl.forEach((g, i) => { const e = sv.gl[i]; g.x = e[0]; g.y = e[1]; g.state = e[2]; g.heading = e[3]; }); m.puck.x = sv.p[0]; m.puck.y = sv.p[1]; m.puck.z = sv.p[2]; m.puck.fire = false; }
  function step(m, dt) {
    const rp = m.rp; if (!rp) { m.phase = 'goal'; return; }
    rp.i += dt * 60 * .5; const f = rp.clip[Math.min(rp.clip.length - 1, rp.i | 0)]; apply(m, f); Flow.animate(m, dt);
    const skip = m.humans.some(h => h.input && (h.input.pressed('pass') || h.input.pressed('confirm')));
    if (rp.i >= rp.clip.length - 1 || skip) { restore(m); m.rp = null; m.phase = 'goal'; m.pt = 99; m.replayDone = true; Bus.emit('replay_end', {}); }
  }
  return { record, canPlay, start, step, reset() { frames = []; tick = 0; }, clips: () => clips, clearClips() { clips = []; } };
})();

/* ---- OBJECTIVES (story) ---- */
const Objectives = (() => {
  let st = {}, cnt = {}, ch = null, off = [];
  function reset(chapter) { st = {}; cnt = {}; ch = chapter; off.forEach(f => f()); off = [];
    if (!chapter) return;
    const done = (id) => { if (!st[id]) { st[id] = true; Bus.emit('objective', { id, text: (chapter.objectives.find(o => o.id === id) || {}).text }); } };
    const on = (t, f) => off.push(Bus.on(t, f)); const m = () => Match.cur();
    on('goal', g => { if (g.side !== 0) return; if (g.shot === 'onetimer') done('onetimer'); if (g.pp) done('ppgoal'); if (g.fire) done('kaboomgoal'); if (g.vault && g.deke) done('vaultdeke'); if (g.scorer.stats.goals >= 3) done('hat'); });
    on('big_hit', e => { if (e.a.side === 0) { cnt.bighits = (cnt.bighits || 0) + 1; if (cnt.bighits >= 3) done('bighits'); } });
    on('frozen', e => { if (e.s.side === 1) done('ice'); }); on('thin_ice_break', e => { /* counted when a rival freezes */ });
    on('kaboom_start', e => { if (e.side === 0) done('kaboom'); });
    on('fight_end', e => { if (e.w && e.w.side === 0) { cnt.fights = (cnt.fights || 0) + 1; if (cnt.fights >= 2) done('fights'); } });
    on('mascot_down', e => { if (e.s.side === 0) done('pete'); });
    on('final', e => { if (e.score[0] > e.score[1]) done('win'); }); on('shootout_end', e => { if (e.win === 0) done('win'); });
  }
  const done = id => !!st[id];
  const stars = () => ch ? ch.objectives.filter(o => st[o.id]).length : 0;
  const progress = (o) => o.need ? (cnt[o.id] || 0) + '/' + o.need : '';
  return { reset, done, stars, progress, state: () => Object.assign({}, st) };
})();

/* ---- CHAPTER 5: Gilded Boost, Doris' organ ---- */
const Ch5 = (() => {
  Bus.on('period_start', e => { const m = e.m || Match.cur(); if (!m || !m.cfg.story || m.cfg.story.id !== 5) return; if (e.period === 3) { m.boostOn = true; UI.toast('GLITTERMAN: Synergy, boys!', '#ffd36a', 3); Synth.babble('Synergy, boys!', 'glitter', { excl: true }); }
    if (e.period === 2 && m.dorisPick === 'doris1') doris(m, false); });
  function doris(m, late) { if (m.doris && m.doris.t > 0) return; m.doris = { t: 20, mul: late ? 1.15 : 1.1 }; Sim.addBoom(m, 0, late ? 45 : 30); UI.banner('DORIS! PLAY THE SONG!', { size: 3, dur: 2.2, y: .3 }); Synth.organ(Synth.ORGAN.charge, 150, .18); Synth.react('chant'); Synth.babble('DORIS! PLAY THE SONG!', 'marge', { excl: true }); Bus.emit('doris', { late }); }
  function tick(m, dt) { if (!m.cfg.story || m.cfg.story.id !== 5) return; if (m.doris && m.doris.t > 0) m.doris.t -= dt; if (m.dorisPick === 'doris2' && m.period === 3 && m.clock <= 60 && !m.dorisLate) { m.dorisLate = true; doris(m, true); } }
  return { tick, doris };
})();

/* ---- SHOOTOUT ---- */
const Shootout = (() => {
  function begin(m) {
    m.phase = 'shootout'; m.pt = 0; m.so = { round: 0, turn: 0, shots: [[], []], clock: 8, state: 'setup', t: 0, order: [[0, 1, 2], [0, 1, 2]], done: false, win: -1 }; m.noPickup = false; m.phaseNoPlay = false;
    for (const s of m.sk) { if (s.state === 'bin') { m.sinBin = m.sinBin.filter(x => x !== s); } s.state = 'skate'; s.st = 0; s.parked = true; s.x = (s.side ? Rink.CX + 90 : Rink.CX - 90) + s.slot * 20; s.y = Rink.Y0 - 6; s.vx = s.vy = 0; s.hasPuck = false; }
    m.end = [0, 1]; Sim.emit('shootout_begin', {}); nextAttempt(m);
  }
  function nextAttempt(m) {
    const so = m.so, side = so.turn, defSide = 1 - side, rd = Math.floor(so.round / 2);
    const sk = Sim.teamOf(m, side)[so.order[side][rd % 3]]; so.shooter = sk; so.goalie = m.gl[defSide]; so.clock = 8; so.t = 0; so.state = 'setup'; so.res = null;
    // shooter at center attacks the defender's goal; set the ends so side's attack goes toward goalie's end
    m.end[defSide] = side === 0 ? 1 : 0; m.end[side] = 1 - m.end[defSide];
    for (const s of m.sk) { s.parked = s !== sk; if (s.parked) { s.x = (s.side ? Rink.X1 - 160 : Rink.X0 + 160) + s.slot * 20; s.y = Rink.Y0 - 10; s.vx = s.vy = 0; s.state = 'skate'; s.intent.mx = s.intent.my = 0; } }
    const dir = Sim.attackDir(m, side); sk.x = Rink.CX - dir * 40; sk.y = Rink.CY; sk.vx = sk.vy = 0; sk.heading = dir > 0 ? 0 : PI; sk.state = 'skate'; sk.turbo = 1;
    const p = m.puck; p.owner = null; p.frozen = false; p.inNet = -1; p.out = false; p.fire = false; p.shotBy = null; p.passTo = null; p.x = sk.x + dir * 11; p.y = sk.y; p.vx = p.vy = p.vz = 0; Puck.take(m, sk);
    for (const g of m.gl) { g.manual = null; g.state = 'ready'; g.save = null; g.x = Sim.ownGoalX(m, g.side) + Sim.attackDir(m, g.side) * 12; g.y = Rink.CY; }
    const hum = m.humans.find(h => h.side === side), hdef = m.humans.find(h => h.side === defSide);
    for (const h of m.humans) { if (h.side === side) Match.switchTo(m, h, sk); }
    if (hdef && hdef.input) { so.goalie.manual = hdef.intent; hdef.goalieMode = true; } for (const h of m.humans) if (h.side === side) h.goalieMode = false;
    Sim.emit('so_attempt', { sk, side });
    m.goalPending = null;
  }
  function result(m, goal) {
    const so = m.so; if (so.res) return; so.res = goal ? 'goal' : 'miss'; so.shots[so.turn].push(goal ? 1 : 0); so.t = 0; so.state = 'result';
    if (goal) { m.puck.owner = null; Sim.emit('so_goal', { side: so.turn, s: so.shooter }); } else Sim.emit('so_miss', { side: so.turn });
  }
  function decided(m) {
    const so = m.so, a = so.shots[0].filter(x => x).length, b = so.shots[1].filter(x => x).length, na = so.shots[0].length, nb = so.shots[1].length;
    if (na <= 3 && nb <= 3 && (na < 3 || nb < 3)) { // can one side no longer catch up?
      if (a + (3 - na) < b) return 1; if (b + (3 - nb) < a) return 0; return -1; }
    if (na === nb && na >= 3 && a !== b) return a > b ? 0 : 1; return -1;
  }
  function step(m, dt) {
    const so = m.so; if (!so || so.done) return; so.t += dt; const p = m.puck;
    if (so.state === 'setup') { if (so.t > 1.4) { so.state = 'live'; so.t = 0; } return; }
    if (so.state === 'live') {
      so.clock -= dt;
      if (m.goalPending) { m.goalPending = null; result(m, true); }
      else if (p.out || p.frozen || (!p.owner && p.shotBy == null && so.t > 1 && Math.hypot(p.vx, p.vy) < 5) || so.clock <= 0 || (so.shooter && Math.abs(p.x - Rink.CX) < 6 && (p.x - so.shooter.x) * Sim.attackDir(m, so.turn) < -20)) { if (!p.owner || so.clock <= 0 || p.frozen || p.out) result(m, false); }
      else if (p.shotBy && !p.owner && Math.hypot(p.vx, p.vy) < 12 && p.inNet < 0) result(m, false);
      else if (p.shotBy && so.t > 4 + 0 && Math.hypot(p.vx, p.vy) < 40) result(m, false);
      return;
    }
    if (so.state === 'result' && so.t > 2.2) {
      const d = decided(m);
      if (d >= 0) { so.done = true; so.win = d; if (!m.bonusSO) { m.score[d]++; m.so.final = true; } else UI.toast('SHOWCASE: ' + (d === 0 ? 'MALL MONEY WON!' : 'MARAUDERS TAKE IT'), '#ffd36a', 3.5); Bus.emit('shootout_end', { win: d }); for (const s of m.sk) s.parked = false; m.phase = 'final'; m.pt = 0; m.phaseNoPlay = true; Sim.emit('final', { score: m.score.slice() }); return; }
      so.round++; so.turn = so.round % 2; nextAttempt(m);
    }
  }
  return { begin, step, nextAttempt };
})();

/* ---- FLOOD WAGON (intermission minigame) ---- */
const Flood = (() => {
  function wanted(m) { if (m.cfg.session || m.cfg.noFlood || m.cfg.flood === false) return false; const s = S('flood'); if (s === 'Never') return false; return m.humans.length > 0; }
  function begin(m, next) {
    m.fl = { x: Rink.X0 + 60, y: Rink.Y1 - 40, a: -PI / 2 * 0 + 0, v: 0, t: 0, dur: 24, state: m.humans.length && S('flood') !== 'Always' ? 'ask' : 'drive', ask: 6, total: Rink.scuffTotal(), next, cleaned: 0, auto: !m.humans.length, honk: 0, score: 0 };
    m.phase = 'flood'; m.pt = 0; if (m.fl.state === 'drive') Sim.emit('flood_start', {}); else Sim.emit('flood_ask', {});
  }
  function step(m, dt) {
    const f = m.fl; if (!f) { m.phase = 'play'; return; }
    f.t += dt; const hum = m.humans.find(h => h.input);
    if (f.state === 'ask') { f.ask -= dt; const I = hum && hum.input; if (I && I.pressed('pass')) { f.state = 'drive'; f.t = 0; Sim.emit('flood_start', {}); } else if ((I && I.pressed('deke')) || f.ask <= 0) { f.state = 'skip'; f.t = 0; } return; }
    if (f.state === 'skip') { Rink.resetScuff(); if (f.t > .6) end(m, 0); return; }
    if (f.state === 'done') { if (f.t > 2.2) end(m, f.score); return; }
    let sx = 0, sy = 0, gas = false;
    if (f.auto) { const tt = f.t * .8; f.targetA = Math.atan2(Math.sin(tt * 2) * 120 + 400 - f.y, Math.cos(tt) * 360 + 560 - f.x); sx = Math.cos(f.targetA); sy = Math.sin(f.targetA); gas = true; }
    else { const I = hum.input, mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]); sx = d[0]; sy = d[1]; gas = I.down('turbo'); if (I.pressed('pass')) { f.honk = .5; Sim.emit('honk', {}); } }
    if (Math.hypot(sx, sy) > .25) { const ta = Math.atan2(sy, sx); f.a += clamp(U.angDiff(f.a, ta), -2.2 * dt, 2.2 * dt); }
    const top = gas ? 90 : 56; f.v += (top - f.v) * Math.min(1, 1.2 * dt);
    f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt; const cb = Rink.clampBody(f, 14); if (cb) { f.a += PI * .6 * dt; f.v *= .9; }
    Rink.clean(f.x, f.y, 26); f.honk = Math.max(0, f.honk - dt);
    if (f.t > f.dur) { const left = Rink.scuffTotal(); f.cleaned = f.total > 0 ? 1 - left / f.total : 1; f.score = f.cleaned > .85 ? 30 : Math.round(f.cleaned * 20); Rink.resetScuff(); f.state = 'done'; f.t = 0; Sim.emit('flood_done', { cleaned: f.cleaned, perfect: f.cleaned > .85 }); }
  }
  function end(m, boomBonus) { const f = m.fl; m.fl = null; if (boomBonus > 25) Sim.addBoom(m, 0, boomBonus); m.phase = 'faceoff'; f.next(); }
  return { wanted, begin, step };
})();
