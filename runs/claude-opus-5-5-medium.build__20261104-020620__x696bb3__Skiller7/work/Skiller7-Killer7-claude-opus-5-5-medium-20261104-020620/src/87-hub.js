/* SKILLER7 — Echo Run (§7.24): the Black Run as a time trial as Dagny. Whiteouts that reach you add 3 s; each crit takes
 * 0.5 s off. On its own: your best run is recorded and replayed as YOUR ECHO. In an AI Hub session (ghost mode, 1-4):
 * the others are echoes in their seat colours; the hub runs the card, the clock and the results. */
const ECHO = { on: false, solo: true, t: 0, pen: 0, crits: 0, thawed: 0, done: false, dist: 0, rec: [], recT: 0, enc: 0, best: null, ghosts: {}, sendT: 0, progT: 0, started: false, finishedAt: null };
S7.ECHO = ECHO;
const ENCOUNTERS = [[120, ['giggler', 'giggler']], [260, ['tobogganer']], [420, ['plow', 'giggler']], [600, ['tobogganer', 'tobogganer']], [760, ['twins']], [900, ['snowballer', 'snowballer']], [1100, ['giggler', 'giggler', 'giggler']], [1300, ['plow']], [1450, ['tobogganer', 'tobogganer']]];
S7.ECHO_ENCOUNTERS = ENCOUNTERS;
const ECHO_RANKS = [[70, 'DOUBLE BLACK'], [82, 'BLACK DIAMOND'], [96, 'BLUE SQUARE'], [1e9, 'GREEN CIRCLE']];
S7.echoRank = t => ECHO_RANKS.find(([s]) => t < s)[1];
const hubOn = () => typeof AIHub !== 'undefined' && !!AIHub.active;
S7.hubActive = () => hubOn() && !!S7.HUB;

/** set up a run: a fresh state, Dagny at the start gate, the course's encounters from the seeded stream */
function echoSetup(solo) {
  S7.newGame({ seed: 77, difficulty: 'Piste' }); G.noSaves = true; G.echo = true; G.roster.dagny.unlocked = true; G.persona = 'dagny'; G.red = 200;
  const rnd = solo ? E.rng(1926) : (AIHub.rng ? AIHub.rng('course') : E.rng(1926));
  ECHO.plan = ENCOUNTERS.map(([m, list]) => ({ m: m * .5, list: list.map(t => t === 'plow' && rnd() < .3 ? 'giggler' : t), side: rnd() < .5 ? -1 : 1, part: ['head', 'chest', 'belly'][Math.floor(rnd() * 3)] }));
  Object.assign(ECHO, { on: true, solo, t: 0, pen: 0, crits: 0, thawed: 0, done: false, dist: 0, rec: [], recT: 0, enc: 0, started: !solo ? false : false, finishedAt: null, sendT: 0, progT: 0, countT: 3 });
  S7.enterArea('01C', 'st', { noAutosave: true, silent: true });
  G.flags['trig:01C:skitip'] = true;
  try { const b = typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('s7:echo') || 'null'); ECHO.best = b && b.time ? b : null; } catch (e) { ECHO.best = null; }
}
S7.echoSetup = echoSetup;
S7.startEchoSolo = () => { echoSetup(true); S7.game.go('hub', { solo: true }, { fade: 'white', seconds: .4 }); };
S7.echoPenalty = e => { if (!ECHO.on || ECHO.done) return; ECHO.pen += 3; G.walker.v *= .4; S7.splash('+3 S', 1, { big: false }); emit('echo', { kind: 'penalty' }); void e; };
S7.echoCrit = () => { if (!ECHO.on || ECHO.done) return; ECHO.crits++; ECHO.pen -= .5; S7.splash('-0.5 S', .8, { small: true }); };
S7.bus.on('kill', () => { if (ECHO.on) ECHO.thawed++; });
/** the course distance travelled (metres) */
const echoMetres = () => ECHO.dist / M;
S7.echoStep = (dt) => {
  if (!ECHO.on || !G.echo) return;
  if (!ECHO.started || ECHO.done) return;
  ECHO.t += dt; const wk = G.walker, e = curEdge();
  if (e && (e.kind === 'ski' || e.kind === 'jump') && !wk.node) ECHO.dist += wk.v * dt;
  // the encounters, spawned ahead of you along your line
  const p = ECHO.plan[ECHO.enc];
  if (p && echoMetres() >= p.m - 30) {
    ECHO.enc++; const H = heroPos(), f = H.angle;
    p.list.forEach((t, k) => { const a = f + p.side * (.3 + k * .25), d = (34 + k * 6) * M, x = H.x + Math.cos(a) * d, y = H.y + Math.sin(a) * d; spawnEnemy(t, x, y, undefined, { part: p.part, revealed: 0 }); });
  }
  // the record (every 0.1 s: edge, s, aiming, yaw)
  ECHO.recT += dt; if (ECHO.recT >= .1) { ECHO.recT = 0; ECHO.rec.push([W.rails.edges.indexOf(e), Math.round(wk.s), G.aim.on ? 1 : 0, Math.round(G.aim.yaw * 100)]); }
  // the finish: the village bottom
  if (wk.node === 'vb' || wk.passed === 'vb' || e && e.id === 'f2-vb' && wk.s >= e.len - 2) echoFinish();
};
function echoFinish() {
  if (ECHO.done) return; ECHO.done = true; const time = Math.max(0, ECHO.t + ECHO.pen); ECHO.finishedAt = time;
  ECHO.rank = S7.echoRank(time); emit('echo', { kind: 'finish', time });
  if (ECHO.solo) { const better = !ECHO.best || time < ECHO.best.time; if (better) { ECHO.newBest = true; try { localStorage.setItem('s7:echo', JSON.stringify({ time, rec: ECHO.rec })); } catch (e) { /* the record lasts the visit */ } } }
  else if (hubOn()) { AIHub.result({ time: Math.round(time * 1000), stats: { Crits: ECHO.crits, Penalties: Math.max(0, Math.round(ECHO.pen + ECHO.crits * .5) / 3 | 0), Thawed: ECHO.thawed }, awards: ECHO.pen <= 0 ? [{ title: 'Clean Line', detail: 'No penalties' }] : [] }); ECHO.reported = true; }
}
/** where a recorded echo is at time t (seconds) */
S7.echoAt = (rec, t) => { const k = Math.min(rec.length - 1, Math.max(0, Math.floor(t / .1))), s = rec[k]; if (!s) return null; const e = W.rails.edges[s[0]]; if (!e) return null; const p = edgePos(W.rails, e, s[1]); return { x: p.x, y: p.y, z: p.z, angle: p.angle, aim: s[2], yaw: s[3] / 100 }; };
S7.echoHud = (g, r, x, my) => {
  const t = ECHO.done ? ECHO.finishedAt : ECHO.t + ECHO.pen, s = fmtTime(t);
  E.font.title(g, s, r.W / 2, my + 2, { scale: 3, colors: ['#ffffff', INK], outline: '#000', align: 'center', depth: 1 });
  txt(g, 'PENALTIES ' + (ECHO.pen > 0 ? '+' : '') + ECHO.pen.toFixed(1) + ' S   ' + Math.round(echoMetres()) + ' M', r.W / 2 - 80, my + 28, MUTED);
  if (ECHO.best) txt(g, 'BEST ' + fmtTime(ECHO.best.time), x - 80, my + 44, GOLD);
  void x;
};

/* ---- the AI Hub session ---- */
S7.hubBoot = async game => {
  if (!hubOn()) return;
  try {
    const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] });
    S7.hubTried = true;
    if (!info) { if (game.sceneName === 'hub') game.go('title'); return; }
    S7.HUB = { info, ghosts: {}, ended: false, timeUp: false, readySent: false };
    if (S7.touchOnly()) { AIHub.fail('Controller or keyboard required'); return; }
    AIHub.on('message', (d, from) => { if (!d || from === info.me) return; if (d.t === 'g') S7.HUB.ghosts[from] = Object.assign(S7.HUB.ghosts[from] || {}, { e: d.e, s: d.s, a: d.a, y: d.y, at: Date.now() }); if (d.t === 'done') (S7.HUB.ghosts[from] = S7.HUB.ghosts[from] || {}).done = d.time; });
    AIHub.on('leave', d => { delete S7.HUB.ghosts[d.id]; });
    AIHub.on('start', () => { S7.HUB.start = true; });
    AIHub.on('time-up', () => { S7.HUB.timeUp = true; if (!ECHO.done && !ECHO.reported) { AIHub.result({ score: Math.round(echoMetres()) }); ECHO.reported = true; } });
    AIHub.on('end', () => { S7.HUB.ended = true; game.input.clear(); if (game.audio) { game.audio.music(null); game.audio.mute(true); } });
  } catch (e) { game.fail('hub', e); }
};
S7.hubScene = game => ({
  touch: [], pausable: true, camera: false,
  enter(d) {
    if (typeof AIHub !== 'undefined' && AIHub.active && !S7.HUB && !(d && d.solo)) { if (S7.hubTried) { game.go('title'); return; } }
    const solo = !S7.hubActive(); if (!ECHO.on || ECHO.solo !== solo) echoSetup(solo);
    S7.presenter.enterArea(G.area); S7.music('echorun', { restart: true }); this.drawn = 0; this.after = 0;
    if (solo) { ECHO.countT = 3; ECHO.started = false; }
  },
  update(dt) {
    const H = S7.HUB;
    if (H && H.ended) return;
    if (UI.update(dt)) return;
    this.ticks = (this.ticks || 0) + 1;
    if (H && !H.readySent && this.ticks > 3 && (this.drawn > 1 || S7.game.headless)) { H.readySent = true; AIHub.ready(); }
    // the network keeps the hub's clock (real time), whatever the frame rate
    const nowR = typeof performance !== 'undefined' ? performance.now() / 1000 : G.time, rdt = Math.min(.5, Math.max(0, nowR - (this.lastR ?? nowR))); this.lastR = nowR;
    if (H && H.start && !H.ended && !ECHO.started) { ECHO.progT0 = (ECHO.progT0 || 0) + rdt; if (ECHO.progT0 >= 1) { ECHO.progT0 = 0; AIHub.progress({ score: 0, label: 'at the start gate' }); } }
    if (!ECHO.started) {
      if (H) { const t = AIHub.time(); if (H.start && t >= 0) { ECHO.started = true; S7.splash('GO!', 1, { big: true }); } }
      else { ECHO.countT -= dt; if (ECHO.countT <= 0) { ECHO.started = true; S7.splash('GO!', 1, { big: true }); } }
      S7.cameraStep(dt); S7.presenter.step(dt); return;
    }
    const I = S7.BOT.on ? S7.bot.intent(dt) : readHumanIntent(dt);
    if (!S7.BOT.on) UI.worldIntent(I);
    game.timeScale = 1;
    if (!ECHO.done) simUpdate(dt, I); else { S7.cameraStep(dt); this.after += dt; }
    S7.presenter.step(dt);
    if (H && !H.ended) {
      ECHO.sendT += rdt; if (ECHO.sendT >= .1) { ECHO.sendT = 0; const e = curEdge(); AIHub.send({ t: 'g', area: 'blackrun', e: W.rails.edges.indexOf(e), s: Math.round(G.walker.s), a: G.aim.on ? 1 : 0, y: Math.round(G.aim.yaw * 100) }, { reliable: false }); }
      ECHO.progT += rdt; if (ECHO.progT >= 1 || !ECHO.progSent) { ECHO.progSent = true; ECHO.progT = 0; const m = Math.round(echoMetres()); AIHub.progress({ score: m, label: Math.round(m / 6.4) + '% down · +' + Math.max(0, ECHO.pen).toFixed(0) + ' s' }); }
      if (ECHO.done && !ECHO.doneSent) { ECHO.doneSent = true; AIHub.send({ t: 'done', time: ECHO.finishedAt }, { reliable: true }); }
    }
    if (!H && ECHO.done && this.after > 1.2 && !UI.modal()) UI.open('echoresults');
  },
  draw(r) {
    this.drawn++;
    S7.presenter.draw(r);
    r.overlay(g => {
      UI.hud(g, r, 1 / 60);
      const H = S7.HUB;
      if (!ECHO.started) { const n = H ? (AIHub.time() === -Infinity ? 'GET READY' : Math.max(1, Math.ceil(-AIHub.time() / 1000))) : Math.max(1, Math.ceil(ECHO.countT)); E.font.title(g, String(n), r.W / 2, r.H * .32, { scale: 5, colors: ['#ffffff', INK], outline: '#000', align: 'center', depth: 2, depthColor: RED }); txt(g, 'ECHO RUN · THE BLACK RUN', r.W / 2 - tw('ECHO RUN · THE BLACK RUN', 2) / 2, r.H * .32 + 50, RED, { scale: 2 }); }
      if (H && H.ended) { veil(g, r, .6); E.font.title(g, 'ROUND OVER', r.W / 2, r.H * .4, { scale: 4, colors: ['#ffffff', INK], outline: '#000', align: 'center' }); }
      else if (ECHO.done && H) txt(g, 'FINISHED ' + fmtTime(ECHO.finishedAt) + ' · WATCHING THE ECHOES', r.W / 2 - 110, r.H * .3, GOLD);
      UI.draw(g, r);
    });
  }
});
SCREENS.echoresults = () => {
  const L = new List([{ label: 'RUN AGAIN', onPick: () => { UI.close(); echoSetup(true); S7.game.go('hub', { solo: true }, { fade: 'white', seconds: .3 }); } }, { label: 'TITLE', onPick: () => { UI.close(); ECHO.on = false; S7.game.go('title'); } }]);
  return { update() { L.update(); }, draw(g, r) { const F = frame(g, r, 'ECHO RUN', { tscale: 2, sub: ECHO.rank }); const s = fmtTime(ECHO.finishedAt); E.font.title(g, s, r.W / 2, F.y + 54, { scale: 4, colors: ['#ffffff', INK], outline: '#000', align: 'center' }); txt(g, 'CRITS ' + ECHO.crits + '   THAWED ' + ECHO.thawed + '   PENALTIES ' + ECHO.pen.toFixed(1) + ' S', r.W / 2 - 100, F.y + 96, INK); if (ECHO.newBest) txt(g, 'A NEW BEST. YOUR ECHO WILL RACE YOU.', r.W / 2 - tw('A NEW BEST. YOUR ECHO WILL RACE YOU.') / 2, F.y + 110, GOLD); else if (ECHO.best) txt(g, 'BEST ' + fmtTime(ECHO.best.time), r.W / 2 - 30, F.y + 110, GOLD); L.draw(g, r.W / 2 - 80, F.y + 130, 160); } };
};
