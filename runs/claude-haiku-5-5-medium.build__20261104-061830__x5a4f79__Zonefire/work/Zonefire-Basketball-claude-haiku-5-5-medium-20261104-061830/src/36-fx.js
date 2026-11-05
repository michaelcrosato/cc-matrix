/* ---- THE CAMERA (plan §9.1): the director sets the focus every step. The broadcast camera follows the ball with a lead in
 * the direction of play, the court's middle held vertically; a dunk cam and the slow motion come with the dunks. ---- */
const cameraStep = (dt) => {
  const b = S.ball; if (!b) return;
  const lead = clamp(b.vx * .22, -48, 48);
  const x = clamp(b.x + lead, COURT_X0 - 60, COURT_X1 + 60), c = CENTRE();
  game.focus(x, c.y, 0);
};

/* ---- THE EFFECTS AND THE EVENT WIRING (plan §9.2–9.5): each event's banner, caption, hit-stop, shake, particles, crowd
 * and rumble. The sounds (fragments 10–12) listen to the same events; the attract director and the net do too. ---- */
const nameOf = p => p ? p.name : '';
const spark = (x, y, z, n, col) => { if (P && P.sparks) P.sparks(x, y, z, n, null, { color: col }); };
const glint = (x, y, z, n, col) => { if (P && P.glints) P.glints(x, y, z, n, col); };
const ringFx = (x, y, z, r0, r1, col) => { if (P && P.ring) P.ring(x, y, r0, r1, col, .4); };
const teamOf = slot => S.players[slot] ? S.players[slot].side : 0;

on('basket', ev => {
  const p = S.players[ev.slot], m = S.match;
  if (p && p.def.celebrations) p.celebrate = { name: p.def.celebrations[(S.fxRng() * p.def.celebrations.length) | 0], t: 0 };
  if (ev.dunk) { /* the dunk's own banner came with the slam */ }
  else if (ev.three) { banner('THREE!', 'THREE'); caption('three', { NAME: nameOf(p) }, 'DEE DEE'); }
  else caption('basket', { NAME: nameOf(p) }, 'VINNIE');
  if (p) p.stats.pts += 0;
  glint(ev.x, ev.y, ev.z, 10, '#ffe08a'); spark(ev.x, ev.y, ev.z, 12, '#fff6c0'); ringFx(ev.x, ev.y, ev.z, 4, 26, '#fff6c0');
  game.shake && game.shake(2);
  if (A && A.sfx) A.sfx('swish');
  const pts = m ? m.score[ev.side] : 0;
  if (p && p.stats.pts > (S.progress.records.mostPoints || 0)) { S.progress.records.mostPoints = p.stats.pts; saveProgress(); }
});
on('dunkStart', ev => {
  const p = S.players[ev.slot];
  if (ev.blocked) { banner('REJECTED!', 'REJECTED'); return; }
  if (!game.reduceMotion && tune('dunkSlowMo') < 1 && setting('shake') !== 'Off') { game.timeScale = tune('dunkSlowMo'); game.after(.35, () => { game.timeScale = 1; }); }   // §9.2: the apex in slow motion
  banner(ev.banner, 'DUNK'); caption('dunkPower', { NAME: nameOf(p) }, 'VINNIE');
  if (ev.lines === 'spin' || ev.lines === 'hang' || ev.lines === 'flip') caption('dunkSpin', { NAME: nameOf(p) }, 'DEE DEE');
  if (ev.lines === 'nova') caption('novaOn', { NAME: nameOf(p) }, 'VINNIE');
  if (ev.lines === 'quake') caption('quake', { NAME: nameOf(p) }, 'VINNIE');
  if (A && A.sfx) A.sfx('whoosh');
});
on('dunk', ev => {
  const p = S.players[ev.slot];
  if (game.freeze) game.freeze(.08);
  game.shake && game.shake(4);
  if (P && P.ring) ringFx(ev.x, ev.y, ev.z, 4, 26, '#fff6c0');
  spark(ev.x, ev.y, ev.z, 16, '#ffd23a'); glint(ev.x, ev.y, ev.z, 10, '#ffffff');
  if (A && A.sfx) A.sfx('slam');
});
on('alleyoop', ev => { caption('alleyoop', { NAME: nameOf(S.players[ev.to]) }, 'VINNIE'); banner('ALLEY-OOP!', 'ALLEYOOP'); });
on('block', ev => {
  const p = S.players[ev.slot];
  if (ev.rejected) { banner('REJECTED!', 'REJECTED'); caption('block', { NAME: nameOf(p) }, 'VINNIE'); }
  if (game.freeze) game.freeze(.06);
  spark(ev.x, ev.y, ev.z, 8, '#ff5a3a'); if (A && A.sfx) A.sfx('block');
});
on('steal', ev => { banner('PICKPOCKET!', 'PICKPOCKET'); caption('steal', { NAME: nameOf(S.players[ev.slot]), VICTIM: nameOf(S.players[ev.victim]) }, 'DEE DEE'); glint(ev.x, ev.y, 18, 6, '#7af0a0'); if (A && A.sfx) A.sfx('steal'); });
on('shove', ev => { if (A && A.sfx) A.sfx('shove'); });
on('knockdown', ev => { if (A && A.sfx) A.sfx('fall'); if (S.match && COMMENTARY_LEVEL() === 2 && Math.random() < .25) caption('shove', { VICTIM: nameOf(S.players[ev.slot]), NAME: nameOf(S.players[ev.by]) }, 'VINNIE'); });
on('ankles', ev => { banner('ANKLES!', 'ANKLES'); caption('ankles', { VICTIM: nameOf(S.players[ev.slot]) }, 'DEE DEE'); });
on('goaltend', ev => { banner('GOALTENDING!', 'REJECTED'); caption('goaltend', {}, 'VINNIE'); });
on('shatter', ev => { banner('SHATTERED!', 'SHATTERED'); caption('shatter', {}, 'VINNIE'); game.shake && game.shake(6); if (game.freeze) game.freeze(.15); S.glassOut = 1; if (A && A.sfx) A.sfx('shatter'); });
on('supernovaOn', ev => { const p = S.players[ev.slot]; banner('SUPERNOVA!', 'SUPERNOVA'); caption('novaOn', { NAME: nameOf(p) }, 'VINNIE'); ringFx(p.body.x, p.body.y, p.body.z, 4, 34, '#e8b0ff'); if (A && A.sfx) A.sfx('nova'); });
on('supernovaOff', ev => { const p = S.players[ev.slot]; caption('novaOff', { NAME: nameOf(p) }, 'VINNIE'); });
on('quarterEnd', ev => { caption('quarterEnd', {}, 'VINNIE'); });
on('halftime', ev => { caption('halftime', {}, 'DEE DEE'); });
on('overtime', ev => { banner('OVERTIME!', 'DUNK'); caption('clutch', {}, 'VINNIE'); });
on('shotClockViolation', ev => { caption('shotclock', {}, 'VINNIE'); });
on('deadBall', ev => { if (ev.reason === 'shotclock') banner('SHOT CLOCK!', 'THREE'); });
on('possession', ev => { S.captionsThisPoss = 0; });
on('gameEnd', ev => { caption('final', { TEAM: S.teams[ev.winner === null ? 0 : ev.winner] ? S.teams[ev.winner === null ? 0 : ev.winner].short : '' }, 'VINNIE'); playSting(ev.winner === 0 ? 'victory' : 'defeat'); });
on('tipoff', ev => { caption('tipoff', {}, 'VINNIE'); });
on('quarterStart', ev => { /* the break card is over: the quarter's own card is the HUD's */ });

/** the match's scene step after the rules: the HUD's clock, the camera; when the game is over the results come after a beat */
const matchFrame = dt => {
  hudStep(dt);
  if (S.match && S.match.over && !S.resultsQueued) {
    S.resultsQueued = true;
    game.after(2.2, () => { game.go('results', resultsData(), { fade: .3 }); });
  }
};
/** the results: the final, the MVP (the most points, then the style), the box score and the rematch's setup */
const resultsData = () => {
  const m = S.match, pl = S.players.slice().sort((a, b) => b.stats.pts - a.stats.pts), mvp = pl[0];
  const box = S.players.map(p => `${p.name.padEnd(14, ' ')}${String(p.stats.pts).padStart(4)}${String(p.stats.reb).padStart(5)}${String(p.stats.ast).padStart(5)}${String(p.stats.stl).padStart(5)}${String(p.stats.blk).padStart(5)}${String(p.stats.dunks).padStart(5)}`);
  const home = S.teams[0], away = S.teams[1];
  return { match: { score: m.score.slice() }, homeName: home.short, awayName: away.short, courtName: COURTS[S.court].name, mvp: mvp ? mvp.name : '-', blam: mvp ? mvp.name + ' · ' + (mvp.stats.dunks ? mvp.stats.dunks + ' DUNK' + (mvp.stats.dunks > 1 ? 'S' : '') : mvp.stats.pts + ' POINTS') : '-', box, rematch: { court: S.court, humans: S.lastHumans || [], home: home.id, away: away.id, qLen: m.qLen, difficulty: setting('difficulty'), powerups: S.powerupsOn, twists: S.twistsOn } };
};
