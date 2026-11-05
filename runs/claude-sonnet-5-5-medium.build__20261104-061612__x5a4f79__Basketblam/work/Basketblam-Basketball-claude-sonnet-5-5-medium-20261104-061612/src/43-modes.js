/* BASKETBLAM - the match scene, results, the Blam Tour and Blam Camp */

/* ===== the match scene (exhibition, tour, camp, hub) ===== */
let matchData = null, resultsFor = null;
function matchFrame(dt) {
  const M = S.match;
  talk.update(dt); annT += dt;
  const sdt = dt * tune('gameSpeed');
  matchStep(sdt, cmdFor);
  for (const p of S.players) {
    p.rig.update(dt, rigState(p));
    if (p.rig.o.headR0 === undefined) p.rig.o.headR0 = p.rig.o.headR;
    p.rig.o.headR = p.rig.o.headR0 * (S.cheats.big ? 1.8 : 1);   // the BIG HEADS cheat
  }
  cameraStep(dt); fxStep(dt);
  crowdUpdate(dt, clamp(.25 + M.excite * .75, 0, 1));
}
function enterMatch(data) {
  wireEvents(); data = data || {}; matchData = data; S.fromGame = true;
  let cfg = data.cfg;
  S.cheats.infTurbo = S.cheats.infTurbo && false;
  if (data.attract) { cfg = attractMatchCfg(); S.cheats.infTurbo = true; }
  else if (data.hub) cfg = hubCfg();
  else if (data.tour) { cfg = tourCfg(data.tour); }
  else if (data.camp) cfg = campCfg();
  if (!cfg) cfg = { teams: [0, 1], court: 'alley', humans: { 0: game.input }, qLen: 90, difficulty: 'Pro' };
  if (!data.attract && cfg.mode !== 'attract') S.cheats.infTurbo = false;
  game.resetCamera(); game.follow(null); game.cam.bounds = null; game.input.consumeAll();
  newMatch(cfg);
  if (cfg.mode === 'camp') { S.match.phase = 'camp'; S.ball.state = 'dead'; campStart(); }
  S.dev.open = false; S.howto = null; talk.close && talk.close();
  game.timeScale = 1;
  L.enabled = true; L.ambient = clamp(.78 + courtDef().lights * .2, 0, 1);
  music(courtDef().music); game.allowJoin(false);
  if (cfg.mode !== 'attract') { game.settings.set && 0; }
  crowdStop();
  S.match.resultSaved = false;
}
const matchScene = {
  view: 'broadcast', views: ['broadcast', 'high'], input: KEYS, res: 'ps1', pausable: !HUB, camera: { zoom: false },
  enter(d) { enterMatch(d); },
  exit() { crowdStop(); L.enabled = false; music(null); game.timeScale = 1; },
  update(dt) {
    const M = S.match; if (!M) return;
    const view = game.settings.camera === 'High' ? 'high' : 'broadcast'; if (game.baseView && game.baseView.id !== view) game.setView(view);
    game.input.glyphs = padStyle() === 'xbox' ? 'xbox' : 'playstation';
    if (S.dev.open) { devUpdate(dt); cameraStep(dt); return; }
    if (S.howto) { howUpdate(dt); return; }
    if (S.hub && hubWaiting()) { cameraStep(dt); return; }
    if (S.mode === 'camp') campStep(dt);
    matchFrame(dt);
    if (S.hub) hubStep(dt);
    if (M.phase === 'end' && M.endT > 2.4 && S.mode !== 'camp') finishMatch();
    // the controller drops out: a human who is idle for long gets help? (no) ; autopilot via dev
  },
  draw(r) { drawMatch(r); if (S.dev.open) r.overlay(g => drawDevPanel(g, r)); if (S.howto) r.overlay(g => drawHowOverlay(g, r)); if (S.mode === 'camp') r.overlay(g => campDraw(g, r)); },
  back() { return false }
};
scenes.match = matchScene;
// attract: the same match with the CPU playing every slot, any input leaves
scenes.attract = Object.assign({}, matchScene, {
  pausable: false,
  enter() { enterMatch({ attract: true }); S.mode = 'attract'; idleMs = 0; },
  update(dt) {
    const I = game.input, m = mouseHud(), mv = I.move();
    const moved = m && lastMouse && (Math.abs(m[0] - lastMouse[0]) + Math.abs(m[1] - lastMouse[1])) > 3; lastMouse = m;
    S.attractT = (S.attractT || 0) + dt;
    if (touchOnlyDevice()) { const c = I.clicked && I.clicked(); if (c && c[1] > game.H - 26 && c[0] > game.W - 72) game.menu('settings'); if (I.anyPressed()) I.consumeAll(); }
    else if (S.attractT > .5 && (I.anyPressed() || Math.hypot(mv[0], mv[1]) > .4 || moved)) { S.attractT = 0; S.mode = 'title'; go('title'); return; }
    matchFrame(dt);
    const M = S.match; if (M.phase === 'end' && M.endT > 3 || M.time > 150) { S.attractT = 0.6; game.go('attract', null, { fade: 0 }); }
    // to show off: Supernova on a loop
  },
  draw(r) { drawMatch(r); if (touchOnlyDevice()) r.overlay(g => { panel(g, r.W / 2 - 130, r.H - 52, 260, 24); bigText(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 44, { scale: 1 }); panel(g, r.W - 70, r.H - 24, 66, 18); txt(g, 'SETTINGS', r.W - 37, r.H - 19, '#fff', { align: 'center', font: 'tiny' }); }); }
});

function finishMatch() {
  const M = S.match; if (M.resultSaved) return; M.resultSaved = true;
  const prog = store.progress(), rec = prog.records, hs = S.humans, humanTeams = new Set(Object.keys(hs).map(k => +k < 2 ? 0 : 1));
  const mine = Object.keys(hs).length ? [...humanTeams][0] : 0;
  const best = Math.max(...S.players.filter(p => p.input).map(p => p.st.pts), 0);
  rec.games++; if (M.winner === mine && M.winner >= 0) rec.wins++; rec.mostPoints = Math.max(rec.mostPoints, best); rec.dunks += S.players.reduce((a, p) => a + (p.input ? p.st.dunks : 0), 0);
  rec.bestStyle = Math.max(rec.bestStyle, ...S.players.filter(p => p.input).map(p => p.st.style));
  store.save(prog);
  resultsFor = { cfg: S.cfg, score: M.score.slice(), winner: M.winner, mine, players: S.players.map(p => ({ name: p.name, team: p.team, st: Object.assign({}, p.st), human: !!p.input, spec: p.spec, tdef: p.tdef })), qScores: M.qScores.map(q => q.slice()), mode: S.mode, tour: matchData && matchData.tour, mvp: mvpOf().slot, ot: M.ot };
  if (S.hub) { hubFinish(); return; }
  go('results');
}

/* ===== results ===== */
let resList = null;
scenes.results = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() {
    L.enabled = false; const R = resultsFor; if (!R) return go('title');
    const items = [];
    const won = R.winner === R.mine;
    if (R.tour) {
      if (won) items.push({ label: R.tour.stop >= 3 ? 'FINISH THE TOUR' : 'NEXT STOP', fn: () => tourAfter(R.tour, true) });
      else items.push({ label: 'RETRY STOP', fn: () => tourAfter(R.tour, false) });
      items.push({ label: 'TO TITLE', fn: () => go('title') });
    } else { items.push({ label: 'REMATCH', fn: () => go('match', { cfg: Object.assign({}, R.cfg, { seed: undefined }) }) }); items.push({ label: 'TO TITLE', fn: () => go('title') }); }
    resList = new FocusList(items, { horizontal: true }); music(won ? 'victory' : 'lose'); resT = 0; crowdStop();
  },
  update(dt) { touchIdle(dt); resT += dt; if (resList) resList.update(dt); },
  draw(r) {
    const R = resultsFor; if (!R) return; const W = r.W, H = r.H, won = R.winner === R.mine, ht = TEAMS[R.cfg.teams[0]], at = TEAMS[R.cfg.teams[1]];
    r.sky(won ? ['#1a0c38', '#5a1a68', '#ffa030'] : ['#0c0c1c', '#1a1a38', '#2a2a48']);
    r.overlay(g => {
      const title = R.winner < 0 ? 'A DRAW!?' : TEAMS[R.cfg.teams[R.winner]].name + ' WIN!';
      bigText(g, title, W / 2, 6, { scale: 3, colors: won ? ['#fffbe8', '#ffd36a', '#ff8a2a'] : ['#e0e0f0', '#9aa0c0', '#6a70a0'] });
      txt(g, (R.ot ? 'OVERTIME   ' : '') + R.score[0] + '  -  ' + R.score[1], W / 2, 36, '#fff', { align: 'center', scale: 2 });
      txt(g, ht.name, W / 2 - 70, 38, ht.color, { align: 'right' }); txt(g, at.name, W / 2 + 70, 38, at.color);
      // quarter table
      panel(g, 10, 58, 130, 92);
      txt(g, 'BY QUARTER', 18, 62, '#9a9ac8', { font: 'tiny' });
      R.qScores.forEach((q, i) => { const lb = i < 4 ? 'Q' + (i + 1) : 'OT' + (i - 3); txt(g, lb, 18, 74 + i * 11, '#c8c8e8', { font: 'tiny' }); txt(g, String(q[0]), 70, 73 + i * 11, ht.color, { align: 'right' }); txt(g, String(q[1]), 120, 73 + i * 11, at.color, { align: 'right' }); });
      // players
      R.players.forEach((p, i) => {
        const x = 150 + (i % 2) * 138, y = 58 + Math.floor(i / 2) * 46, mv = R.mvp === i;
        panel(g, x, y, 134, 42, { border: mv ? '#ffd36a' : TEAMS[R.cfg.teams[p.team]].color });
        drawPortraitOf(g, p.spec, p.tdef, x + 3, y + 3, 36);
        txt(g, p.name + (p.human ? ' (YOU)' : ''), x + 42, y + 3, '#fff', { font: 'tiny' }); if (mv) txt(g, 'MVP ★', x + 130, y + 3, '#ffd36a', { align: 'right', font: 'tiny' });
        txt(g, p.st.pts + ' PTS  ' + p.st.dunks + ' DUNK', x + 42, y + 12, '#e8e4f8', { font: 'tiny' }); txt(g, p.st.blocks + ' BLK  ' + p.st.steals + ' STL  ' + p.st.assists + ' AST', x + 42, y + 20, '#c8c8e8', { font: 'tiny' });
        txt(g, 'STYLE ' + p.st.style, x + 42, y + 29, '#ff9a3a', { font: 'tiny' });
      });
      if (R.tour) txt(g, won ? 'STOP CLEARED!' : 'THEY BEAT YOU. RUN IT BACK.', W / 2, 156, won ? '#8aff9a' : '#ff8a8a', { align: 'center' });
      resList.drawRow(g, W / 2 - 100, 170, 98, 18);
      drawPrompts(g, [['move', 'CHOOSE'], ['confirm', 'GO']], W / 2, H - 14);
    });
  }
};
let resT = 0;
// horizontal draw override for the results list
FocusList.prototype.drawRow = function (g, x, y, w, h) { this.rects = []; this.items.forEach((it, k) => { const foc = k === this.i, xx = x + k * (w + 6); this.rects.push([xx, y, w, h]); E.ui.box(g, xx, y, w, h, { bg: foc ? ['#ffb830', '#e8601a'] : ['#2a2c44', '#1a1c30'], border: foc ? '#fff6c0' : '#5a5e88', alpha: 1 }); txt(g, it.label, xx + w / 2, y + 6, foc ? '#2a1204' : '#e8e8ff', { align: 'center', outline: false }); }); };

/* ===== the Blam Tour ===== */
const tourStory = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', speed: 40 });
let tourState = null, tourList = null, tourPick = 0;
function oppOf(team, stop) { const t = TOUR[stop]; return TOUR_FOES(team)[stop]; }
function tourCfg(tr) { return { teams: [tr.team, oppOf(tr.team, tr.stop)], court: TOUR[tr.stop].court, mode: 'tour', humans: { 0: game.input }, qLen: 75 + tr.stop * 8, difficulty: ['Rookie', 'Pro', 'Pro', 'All-Star'][tr.stop], seed: 1000 + tr.stop * 17 + tr.team, tour: tr }; }
function startTour(team, stop) { const p = store.progress(); p.tour = { team, stop }; store.save(p); go('tourmap', { team, stop, phase: 'pre' }); }
function tourAfter(tr, won) {
  if (!won) return go('match', { tour: tr });
  const p = store.progress(), stop = tr.stop + 1;
  if (stop >= TOUR.length) { p.tour = { team: tr.team, stop: TOUR.length }; p.unlocked = true; p.records.toursWon++; store.save(p); go('tourmap', { team: tr.team, stop: tr.stop, phase: 'post', ending: true }); }
  else { p.tour = { team: tr.team, stop }; store.save(p); go('tourmap', { team: tr.team, stop: tr.stop, phase: 'post', next: stop }); }
}
scenes.tourteam = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() { L.enabled = false; tourPick = 0; music('camp'); },
  update(dt) {
    touchIdle(dt); const I = game.input; tourPick = cycle(I, 3, tourPick);
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { startTour(tourPick, 0); }
    if (I.pressed('cancel')) go('title');
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0e0a28', '#241048', '#7a2a58']);
    r.overlay(g => {
      bigText(g, 'CHOOSE YOUR CREW', W / 2, 6, { scale: 3 });
      for (let i = 0; i < 3; i++) {
        const t = TEAMS[i], x = 10 + i * ((W - 20) / 3), w = (W - 20) / 3 - 6, foc = i === tourPick, y = foc ? 40 : 46;
        panel(g, x, y, w, 150, { border: foc ? '#fff6c0' : t.color, bg: foc ? [t.color, t.dark] : ['#1c1e36', '#10121e'] });
        txt(g, t.name, x + w / 2, y + 5, foc ? '#fff' : t.color, { align: 'center' }); txt(g, t.blurb, x + w / 2, y + 16, foc ? '#fff' : '#9a9ac8', { align: 'center', font: 'tiny' });
        t.players.forEach((p, j) => { const yy = y + 28 + j * 58; drawPortraitOf(g, p, t, x + 6, yy, 42); txt(g, p.name, x + 54, yy, '#fff', { font: 'tiny' }); ['zoom', 'slam', 'deep', 'dime'].forEach((k, q) => { txt(g, RICON[k], x + 54, yy + 8 + q * 10, '#c8c8e8', { font: 'tiny', outline: false }); ratingPips(g, p.ratings[k], x + 54 + 26, yy + 9 + q * 10); }); });
      }
      drawPrompts(g, [['move', 'CHOOSE'], ['confirm', 'START TOUR'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};
let storyQ = [], storyDone = null, storyOn = false;
function runStory(lines, done) {
  storyQ = lines.slice(); storyDone = done; storyOn = true; nextStory();
}
function nextStory() {
  if (!storyQ.length) { storyOn = false; const d = storyDone; storyDone = null; if (d) d(); return; }
  const [who, text] = storyQ.shift(), v = VOICES[who] || VOICES.RICO;
  tourStory.voice = voiceFor(who in VOICES ? who : 'RICO');
  tourStory.say(text, { name: v.name, portrait: speakerRig(who in VOICES ? who : 'RICO'), portraitSize: 36, onDone: nextStory, nameColor: v.color });
  if (!storyQ.length) { }
}
scenes.tourmap = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter(d) {
    L.enabled = false; tourState = d; tourList = null; music('camp');
    const stop = d.stop, st = TOUR[stop];
    if (d.phase === 'pre') {
      const opp = TEAMS[oppOf(d.team, stop)], extra = stop < 2 ? [[opp.players[0].name === 'DEX' ? 'RICO' : 'RICO', 'TODAY\'S OPPONENTS: THE ' + opp.name + '! ' + opp.blurb.toUpperCase()]] : [];
      runStory(st.pre.concat(extra), () => { tourList = new FocusList([{ label: 'PLAY ' + st.name, fn: () => go('match', { tour: { team: d.team, stop } }) }, { label: 'BACK TO TITLE', fn: () => go('title') }]); });
    } else {
      runStory(st.post.concat(d.ending ? [['MAYOR', 'THE BLAM TOUR IS COMPLETE. THE MOON WALKERS AND THE BLAMBOTS ARE NOW IN YOUR EXHIBITION LIST. PLEASE DUNK RESPONSIBLY.']] : []), () => {
        if (d.ending) go('title'); else go('tourmap', { team: d.team, stop: d.next, phase: 'pre' });
      });
    }
  },
  update(dt) {
    touchIdle(dt); tourStory.update(dt);
    if (tourList) tourList.update(dt);
    if (game.input.pressed('cancel') && tourStory.open && storyOn) { storyQ = []; tourStory.close(); const d = storyDone; storyDone = null; storyOn = false; if (d) d(); }   // skip the cutscene
    else if (game.input.pressed('cancel') && !tourStory.open && !tourList) go('title');
  },
  draw(r) {
    const W = r.W, H = r.H, d = tourState; if (!d) return;
    const cd = COURTS[TOUR[d.stop].court];
    getBackdrop(TOUR[d.stop].court).draw(r);
    r.overlay(g => {
      px.blend && px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      bigText(g, 'THE BLAM TOUR', W / 2, 6, { scale: 3 });
      for (let i = 0; i < 4; i++) {
        const x = 14 + i * ((W - 28) / 4), w = (W - 28) / 4 - 6, cur = i === d.stop, done = i < d.stop || (d.phase === 'post' && i === d.stop && d.ending) || (store.progress().tour && store.progress().tour.stop > i);
        panel(g, x, 40, w, 62, { border: cur ? '#fff6c0' : done ? '#6aff9a' : '#4a4e78', bg: cur ? ['#5a3010', '#2a1408'] : ['#1c1e36', '#10121e'] });
        txt(g, i === 3 ? 'FINAL' : 'STOP ' + (i + 1), x + w / 2, 45, cur ? '#ffd36a' : '#9a9ac8', { align: 'center', font: 'tiny' });
        txt(g, COURTS[TOUR[i].court].name, x + w / 2, 58, '#fff', { align: 'center', font: 'tiny' });
        const opp = TEAMS[oppOf(d.team, i)]; txt(g, 'vs ' + opp.name, x + w / 2, 70, opp.color, { align: 'center', font: 'tiny' });
        txt(g, done ? 'CLEARED OK' : cur ? 'NEXT' : '...', x + w / 2, 88, done ? '#6aff9a' : '#c8c8e8', { align: 'center', font: 'tiny' });
      }
      txt(g, cd.name + ' - ' + cd.sub, W / 2, 112, '#ffe8c8', { align: 'center', font: 'tiny' }); txt(g, cd.twistText, W / 2, 124, '#8ad0ff', { align: 'center', font: 'tiny' });
      txt(g, 'YOUR CREW: ' + TEAMS[d.team].name, W / 2, 138, TEAMS[d.team].color, { align: 'center' });
      if (tourList) tourList.draw(g, W / 2 - 90, 154, 180, 18, 4);
    });
    tourStory.draw(r);
  }
};

/* ===== Blam Camp ===== */
const LESSONS = [
  { id: 'move', title: 'MOVE', text: 'Use the stick to run around. Reach the far baseline.', prompts: [['move', 'MOVE']], need: 'ball0' },
  { id: 'turbo', title: 'TURBO', text: 'Hold TURBO while you run. It drains and refills. Sprint for 2 seconds.', prompts: [['turbo', 'HOLD TO SPRINT'], ['move', 'MOVE']], need: 'ball0' },
  { id: 'pass', title: 'PASS', text: 'Pass the ball to your teammate COACH. They\'ll toss it back.', prompts: [['pass', 'PASS']], need: 'ball0' },
  { id: 'shoot', title: 'JUMP SHOT', text: 'HOLD SHOOT to jump, RELEASE at the very top. Sink a jumper.', prompts: [['shoot', 'HOLD, THEN RELEASE AT THE TOP']], need: 'ball0far' },
  { id: 'dunk', title: 'DUNK', text: 'Run at the hoop with TURBO held and press SHOOT. Throw it down!', prompts: [['turbo', 'TURBO'], ['shoot', 'DUNK']], need: 'ball0near' },
  { id: 'oop', title: 'ALLEY-OOP', text: 'Press OOP to lob it to COACH. They will leap and slam it.', prompts: [['oop', 'ALLEY-OOP LOB']], need: 'ball0mid' },
  { id: 'spin', title: 'SPIN MOVE', text: 'With the ball, press SHOVE to spin past defenders. Costs a little turbo.', prompts: [['shove', 'SPIN']], need: 'ball0' },
  { id: 'steal', title: 'STEAL', text: 'Get close to the ball handler and press PASS to swipe the ball!', prompts: [['pass', 'SWIPE']], need: 'dummyball' },
  { id: 'shove', title: 'SHOVE', text: 'No fouls here. Walk up to a rival and press SHOVE. Down they go.', prompts: [['shove', 'SHOVE']], need: 'dummy' },
  { id: 'block', title: 'BLOCK', text: 'The rival is shooting. Jump with SHOOT at the right moment to swat it!', prompts: [['shoot', 'JUMP TO BLOCK']], need: 'dummyshoot' }
];
let camp = null;
function campCfg() { return { teams: [0, 1], court: 'alley', mode: 'camp', humans: { 0: game.input }, qLen: 600, difficulty: 'Rookie', seed: 31 }; }
function startCamp() { go('match', { camp: true }); }
function campStart() {
  const prog = store.progress();
  camp = { i: 0, t: 0, flash: 0, jumps: 0, moved: 0, turboT: 0, wait: 0, done: false, last: null, passed: false };
  S.cheats.infTurbo = false;
  S.players[1].script = (p) => campMate(p); S.players[2].script = (p) => campDummy(p, 2); S.players[3].script = (p) => campDummy(p, 3);
  S.players.forEach(p => p.camp = true);
  lessonSetup();
  on('camp', () => { });
}
function campMate(p) {
  const c = NOCMD(), B = S.ball, M = S.match; p.ai.t += 1 / 120;
  if (p.hasBall) { p.ai.hold = (p.ai.hold || 0) + 1 / 120; if (p.ai.hold > 1.0) { p.ai.hold = 0; c.pass.pressed = true; } return c; }
  p.ai.hold = 0;
  if (p.act) return c;
  const h = attackHoop(0), tx = camp && LESSONS[camp.i] && LESSONS[camp.i].id === 'oop' ? h.x - 120 : COURT.cx + 20, ty = COURT.cy + 70; goto(c, p, tx, ty, 10); return c;
}
function campDummy(p, slot) {
  const c = NOCMD(), L0 = camp && LESSONS[camp.i] && LESSONS[camp.i].id; p.ai.t += 1 / 120;
  if (L0 === 'steal' && slot === 2) { // dribble slowly back and forth
    c.mx = Math.sin(p.ai.t * .7) * .5; c.my = Math.cos(p.ai.t * .5) * .3; return c;
  }
  if (L0 === 'block' && slot === 2) {
    const hp = attackHoop(1); // shoots at the left hoop... he is on team 1: attacks HOOPS[0]
    if (p.hasBall && !p.act) { p.ai.s = (p.ai.s || 0) + 1 / 120; const d = hoopDist(p, attackHoop(1)); if (d > 130) { goto(c, p, attackHoop(1).x + 100, attackHoop(1).y + 20, 10); } else if (p.ai.s > 2) { p.ai.s = 0; c.shoot.pressed = true; c.shoot.down = true; p.ai.shootErr = (Math.random() - .5) * .3; } }
    else if (p.act && p.act.type === 'shot') c.shoot.down = p.act.t < p.act.V / playerG();
    else if (!p.hasBall && S.ball.state === 'loose') { goto(c, p, S.ball.x, S.ball.y, 3); }
    return c;
  }
  return c;
}
function lessonSetup() {
  const L0 = LESSONS[camp.i], p0 = S.players[0], B = S.ball, h = attackHoop(0), M = S.match;
  S.players.forEach(p => { p.act = null; p.stun = 0; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.hasBall = false; p.turbo = 1; });
  B.owner = null; B.state = 'dead'; B.shot = null; B.scored = false;
  const place = (p, x, y) => { p.x = x; p.y = y; };
  place(p0, COURT.cx - 140, COURT.cy); place(S.players[1], COURT.cx + 20, COURT.cy + 70); place(S.players[2], COURT.cx + 150, COURT.cy - 80); place(S.players[3], COURT.cx + 180, COURT.cy + 70);
  S.players.forEach(p => p.facing = p.team ? PI : 0);
  switch (L0.need) {
    case 'ball0far': place(p0, h.x - 170, h.y + 20); giveBall(p0); break;
    case 'ball0near': place(p0, h.x - 130, h.y + 10); giveBall(p0); break;
    case 'ball0mid': place(p0, h.x - 200, h.y + 30); place(S.players[1], h.x - 130, h.y + 50); giveBall(p0); break;
    case 'dummyball': place(S.players[2], COURT.cx - 40, COURT.cy); place(p0, COURT.cx - 100, COURT.cy + 20); giveBall(S.players[2]); break;
    case 'dummy': place(S.players[2], COURT.cx - 60, COURT.cy); place(p0, COURT.cx - 130, COURT.cy + 10); B.x = COURT.cx; B.y = COURT.cy; break;
    case 'dummyshoot': { const h1 = attackHoop(1); place(S.players[2], h1.x + 90, h1.y + 30); place(p0, h1.x + 60, h1.y + 40); giveBall(S.players[2]); break; }
    default: giveBall(p0);
  }
  M.possession = L0.need === 'dummyball' || L0.need === 'dummyshoot' ? 1 : 0; M.shotClock = 99; camp.t = 0; camp.moved = 0; camp.turboT = 0; camp.jumps = 0; camp.passed = false; camp.flash = 0; camp.hint = 0;
  camp.last = { x: p0.x, y: p0.y };
}
function campComplete() { camp.flash = 2; sfx('jackpot'); banner('NICE!', { colors: ['#ffffff', '#8affc0', '#20c080'], scale: 3, y: .3 }); camp.wait = 2; const p = store.progress(); if (!p.camp.includes(LESSONS[camp.i].id)) { p.camp.push(LESSONS[camp.i].id); store.save(p); } }
function campStep(dt) {
  if (!camp) return; const M = S.match, p0 = S.players[0], L0 = LESSONS[camp.i];
  M.clock = 600; M.shotClock = 99;
  if (camp.done) { camp.wait -= dt; if (camp.wait <= 0 || game.input.pressed('confirm')) { go('title'); } return; }
  camp.t += dt; camp.flash = Math.max(0, camp.flash - dt);
  if (camp.wait > 0) { camp.wait -= dt; if (camp.wait <= 0) { camp.i++; if (camp.i >= LESSONS.length) { camp.done = true; camp.wait = 6; banner('CAMP COMPLETE!', { scale: 3, life: 3 }); announce('end', { w: 'YOU' }, 5); } else lessonSetup(); } return; }
  if (M.campT > 0) { M.campT -= dt; if (M.campT <= 0) lessonSetup(); }
  const id = L0.id;
  if (id === 'move') { camp.moved += Math.hypot(p0.x - camp.last.x, p0.y - camp.last.y); camp.last = { x: p0.x, y: p0.y }; if (camp.moved > 260) campComplete(); }
  if (id === 'turbo') { if (p0.boost) camp.turboT += dt; if (camp.turboT > 2) campComplete(); }
  if (id === 'pass') { if (S.players[1].hasBall) campComplete(); }
  if (id === 'spin') { }
  if (id === 'steal' || id === 'shove') { if (S.players[2].stun <= 0 && id === 'shove' && false) { } }
  // the ball ends up out of play: reset the lesson
  if (S.ball.state === 'dead' && !S.ball.owner && M.phase === 'camp' && !(M.campT > 0) && ['shoot', 'dunk', 'oop'].indexOf(id) < 0 && camp.t > 2 && id !== 'move' && id !== 'turbo' && id !== 'shove') { }
  if (camp.t > 25 && (id === 'shoot' || id === 'dunk' || id === 'oop') && !S.ball.owner && S.ball.state === 'loose' && S.ball.z < 6 && camp.t % 5 < dt) { }
  camp.hint = (camp.hint || 0) + dt;
  if (!p0.hasBall && !S.players.some(p => p.hasBall) && S.ball.state === 'loose' && ['shoot', 'dunk', 'oop', 'pass', 'spin'].includes(id)) { camp.loose = (camp.loose || 0) + dt; if (camp.loose > 4) { camp.loose = 0; lessonSetup(); } } else camp.loose = 0;
}
on('basket', e => {
  if (S.mode !== 'camp' || !camp || camp.done) return; const id = LESSONS[camp.i] && LESSONS[camp.i].id;
  if (camp.wait > 0) return;
  if ((id === 'shoot' && e.p === 0 && !e.dunk) || (id === 'dunk' && e.p === 0 && e.dunk) || (id === 'oop' && e.oop)) campComplete();
});
on('spin', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'spin' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('steal', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'steal' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('shove', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'shove' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('block', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'block' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('jump', e => { });
function campDraw(g, r) {
  if (!camp) return; const W = r.W, L0 = LESSONS[Math.min(camp.i, LESSONS.length - 1)];
  const y0 = r.H - 58; panel(g, 6, y0, W - 12, 52, { border: camp.flash > 0 ? '#6aff9a' : '#8a8ec8' });
  txt(g, 'BLAM CAMP  ' + Math.min(camp.i + 1, LESSONS.length) + '/' + LESSONS.length + '  -  ' + L0.title, 14, y0 + 4, '#ffd36a');
  const lines = E.font.wrap(L0.text, W - 40, { font: 'tiny' }); lines.forEach((l, i) => txt(g, l, 14, y0 + 15 + i * 8, '#e8e4f8', { font: 'tiny' }));
  drawPrompts(g, L0.prompts, W / 2, y0 + 37);
  if (camp.done) txt(g, 'CAMP COMPLETE! YOU ARE READY FOR THE BLAM TOUR.', W / 2, 50, '#8affc0', { align: 'center' });
  
}
