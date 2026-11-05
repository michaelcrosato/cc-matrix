/* ---- THE MATCH SCENE: the game on the screen (pausable: the pause menu has Dev Mode), its results, the records, the
 * story's progress, and the start: the scene table, the deep links, the debug handle for the tests ---- */
/** each skater's and goalie's rig, posed from the sim: skating, the cheer, the stagger, the down, the save */
function rigsStep(dt) {
  for (const g of M.goalies) g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: g.vx, vy: g.vy, facing: g.face, down: g.state === 'down', pose: g.state === 'save' ? 'block' : null, expr: null });
  for (const sk of M.skaters) {
    const pose = sk.state === 'celebrate' ? 'cheer' : sk.state === 'stagger' ? 'hips' : sk.state === 'check' ? 'guard' : sk.state === 'fight' ? 'block' : null;
    sk.rig.update(dt, { x: sk.x, y: sk.y, z: sk.state === 'bin' ? -10 : 0, vx: sk.vx, vy: sk.vy, facing: sk.face, down: sk.state === 'down', pose, expr: sk.state === 'celebrate' ? 'shout' : null, sprint: Math.hypot(sk.vx, sk.vy) > 120 });
  }
}
/** the match's end: the result (the stars, the line from the Cup Run), the records and the story's progress */
function finishMatch() {
  const cfg = M.cfg, won = (M.soWinner !== undefined ? M.soWinner : (M.score[0] > M.score[1] ? 0 : 1)) === 0, tied = false;
  M.winner = won ? 0 : 1;
  const L = { mode: cfg.mode, chapter: cfg.chapter, home: M.teams[0].def.name, away: M.teams[1].def.name, score: M.score[0] + ' - ' + M.score[1], stars: starsOf(), won: M.drill ? undefined : won, draw: tied && !M.drill };
  if (M.drill) L.drill = { ok: !!M.drill.ok, name: M.drill.name };
  if (cfg.mode === 'story') {
    const s = STORY[cfg.chapter], margin = M.score[0] - M.score[1], kabGoal = M.goals.some(g => g.kab && g.t === 0);
    const count = (won ? 1 : 0) + (won && (margin >= 2 || kabGoal) ? 1 : 0) + (won && M.score[1] === 0 ? 1 : 0);
    L.stars2 = count; L.chapter = cfg.chapter; L.line = won ? s.win : 'THE BRUISERS, THE HORNETS, THE LUMBERJACKS, THE OWLS, THE MONKEYS: ALL OF THEM CAN BE BEATEN. TRY AGAIN.';
    const sv = STORY_SAVE();
    sv.stars[cfg.chapter] = Math.max(sv.stars[cfg.chapter] || 0, count);
    if (won && cfg.chapter === sv.cleared) sv.cleared = Math.min(STORY.length, sv.cleared + 1);
    store.set('story', sv);
  }
  const R = rec();
  R.games++; if (won && !M.drill) R.wins++; R.goals += M.score[0]; R.hits += M.hits[0]; R.kaboomGoals += M.goals.filter(g => g.kab && g.t === 0).length;
  if (won && M.score[1] === 0 && !M.drill) R.shutouts++; if (M.drill && M.drill.ok) R.drills++; if (cfg.mode === 'story' && won) R.chapters++;
  store.set('records', R);
  lastResult = L;
  if (L.stars && L.stars.length) say('THE THREE STARS: ' + L.stars.map((st, i) => (i + 1) + '. ' + st.name).join(', ') + '.');
}
/** the match's own frame: its scene, its input, its camera (it follows the puck, lead and zoom) */
scenes.match = {
  view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS, res: 'ps1', pausable: true, camera: { zoom: [.7, 1.6] },
  enter(d) {
    if (d && d.cfg) makeMatch(d.cfg);
    else if (!M || (M.over && !(d && d.resume))) makeMatch({ teams: [0, 1], arena: 0, humans: Math.max(1, game.players.length), seed: 1, mode: 'exhibition' });
    game.allowJoin(false);
    game.follow(M.puck, { z: 8, lead: 10 }); game.cam.smooth = .18; game.cam.bounds = null;
    A.music(SONG_MATCH);
    if (!(d && d.resume)) { game.input.consumeAll(); talkSay(pick(['THE PUCK IS DROPPED. HERE WE GO!', 'FACEOFF. THE ICE IS PERFECT. THE CROWD IS UP.'], 0)); }
  },
  update(dt) {
    if (!M) return;
    if (game.input.pressed('camera')) game.nextView();   // (V, or R3: the broadcast view, then the overhead)
    if (M.punch > 0) game.setZoom(1 + .18 * (M.punch / .45)); else if (M.punchOn) { game.setZoom(1); M.punchOn = false; }
    if (M.punch > 0) M.punchOn = true;
    if (M.phase === 'intermission' && M.floodWanted) { M.floodWanted = false; game.go('flood', null, { fade: 'iris' }); return; }
    if (Net.live) { netMatchUpdate(dt); return; }
    if (dev.kaboom && M.boom[0] < 100) M.boom[0] = 100;
    directorStep(); matchStep(dt); rigsStep(dt); talk.update(dt);
    if (M.phase === 'over' && M.timer <= 0 && !M.finished) { M.finished = true; finishMatch(); game.go('results', null, { fade: 'iris' }); }
  },
  draw(r) { drawMatch(r); }
};

