/* ---- THE BLAM TOUR (plan §10.5, §11.4): the tour map (the four stops, the medallions, the side panel), the beats as engine
 * dialogue with portraits, the stop's flow (intro, pre-game talk, matchup, the game, results, post-game beat, the map and
 * an autosave), the loss path (a rematch, a 10-second countdown), the reveal, the ending, the credits and unlocks, and the
 * Hall of Blam's initials wheel. A tour's progress is in S.progress.tour and E.store. ---- */
const TOUR_SCORE_OF = (pts, margin, won) => (won ? 2000 + Math.max(0, margin) * 50 : 0) + pts * 10;
const tourNow = () => S.progress.tour;
const tourSave = () => { saveProgress(); };

/** a new tour: the team is chosen on the team select, the lineup after, then the prologue and (first time) the camp offer */
const goTourNew = () => {
  S.mode = 'tour';
  S.progress.tour = { team: null, stop: 0, score: 0, won: [], beatsSeen: {}, rematch: false, quit: false, lost: null };
  tourSave();
  S.setup = Object.assign({}, SETUP, { humans: [], mode: 'tour' });
  game.go('teams', null, { fade: .2 });
};
const goTourContinue = () => { S.mode = 'tour'; game.go('tour', null, { fade: .2 }); };
/** after the lineup of a tour: the prologue beat, the camp offer, then the map */
const tourAfterLineup = () => {
  const t = tourNow(); t.team = S.setup.home; t.lineup = [S.lineupSel[0], S.lineupSel[1]]; tourSave();
  playBeat(BEATS.prologue, () => {
    if (!S.progress.camp || !S.progress.camp.length) return playBeat(BEATS.campOffer, () => game.go('tour', null, { fade: .2 }));
    game.go('tour', null, { fade: .2 });
  });
};

/* the beat runner: a list of [speaker, text]; a confirm (held 1 s to skip the beat, Start to skip all) turns the page */
const playBeat = (lines, done) => {
  S.beatQ = lines.slice(); S.beatDone = done;
  game.go('beat', null, { fade: .15 });
};
const beatTeam = () => S.progress.tour && S.progress.tour.team ? teamDef(S.progress.tour.team) : null;
scenes.beat = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() {
    S.scene = 'beat'; S.beatT = 0; S.beatHold = 0; S.beatVoiceId = 'vinnie';
    S.beatTalk = new E.Dialog(game, { lines: 3, place: 'bottom', border: C.gold, speed: 46, voice: (ch) => voiceLetter(ch, S.beatVoiceId || 'vinnie') });
    playSong('story');
    S.beatNext();
  },
  update(dt) {
    S.beatT += dt;
    if (S.beatTalk.update && S.beatTalk.update(dt)) return;
    if (game.input.down('confirm')) S.beatHold += dt; else S.beatHold = 0;
    if (game.input.pressed('start')) { S.beatQ = []; }
    if (S.beatHold > 1 && S.beatQ.length) { S.beatQ = []; S.beatHold = 0; }
    if (!S.beatQ.length) { const done = S.beatDone; S.beatDone = null; if (done) done(); return; }
    if (game.input.pressed('confirm')) { /* the line is on screen: the next press turns the page */ }
  },
  draw(r) {
    const team = beatTeam();
    r.sky(COURTS.dome.sky);
    r.overlay(g => { E.font.text(g, team ? team.short + ' · THE BLAM TOUR' : 'THE BLAM TOUR', r.W / 2, 12, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
    if (S.beatTalk && S.beatTalk.draw) S.beatTalk.draw(r);
    promptBar(r, [['{confirm}', 'NEXT'], ['{start}', 'SKIP ALL']]);
  }
};
/** the beat runner's step: shows the next line through the engine's dialogue, with the speaker's live portrait */
S.beatNext = () => {
  const talk = S.beatTalk; if (!talk) return;
  if (!S.beatQ || !S.beatQ.length) return;
  const [who, text] = S.beatQ.shift();
  const team = beatTeam();
  let spk = SPEAKERS[who], name, portrait, voice;
  if (who === 'captain') { const cap = captainOf(team ? team.id : 'hightops'); name = cap.name; portrait = cap.rig(); voice = cap.voice; }
  else if (spk) { name = spk.name; portrait = spk.rig(); voice = spk.voice; }
  else { const pd = playerDef(who); name = pd ? pd.name : who.toUpperCase(); portrait = pd ? playerRig(who) : null; voice = who; }
  S.beatVoiceId = voice;
  talk.say(fillLine(text, team), { name, portrait, onDone: () => { if (S.beatQ.length) S.beatNext(); }, speed: 46 });
};

/* the tour map: the four stops as medallions on a painted map; the focus list at the side; a stop's play starts its beats */
const TOUR_MAP_ITEMS = () => {
  const t = tourNow(), st = TOUR_STOPS[t.team] || [];
  const items = st.map((s, i) => {
    const won = t.won.includes(i), next = i === t.won.length;
    const label = (won ? 'W · ' : next ? '> ' : '  ') + 'STOP ' + (i + 1) + (i === 3 ? ' (FINAL)' : '');
    return { label, sub: teamDef(s.team).short, on: () => { if (next || won) tourStartStop(i); }, disabled: !next && !won };
  });
  items.push({ label: 'SAVE AND QUIT', on: () => { t.quit = true; tourSave(); game.go('menu', null, { fade: .2 }); } });
  return items;
};
S.tourList = null;
scenes.tour = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'tour'; S.idle = 0; playSong('tourmap'); S.tourList = S.tourList || new FocusList([], { x: 36, y: 0, gap: 34, w: 300, onBack: () => game.go('menu', null, { fade: .2 }) }); S.tourList.setItems(TOUR_MAP_ITEMS()); S.tourList.onBack = () => { tourNow().quit = true; tourSave(); game.go('menu', null, { fade: .2 }); }; },
  update(dt) { S.tourList.setItems(TOUR_MAP_ITEMS()); S.tourList.nav(dt); },
  draw(r) {
    const t = tourNow(), st = TOUR_STOPS[t.team] || [];
    r.sky(['#0b1230', '#1d2a5a', '#3a5a8a']);
    const boxes = S.tourList.draw(r, { x: 36, y: r.H * .26, gap: Math.max(34, r.H * .09), w: r.W * .26, scale: 2 });
    S.tourList.pointer(r, boxes);
    // the painted map (§11.4): the five places (Neon Heights' skyline, the Pier on the coast, the Scrapyard inland, Kaboom
    // Island off shore, the Blam Dome on a hill), the dotted route, and the medallions (won: a W and the score; next: pulsing;
    // later: dim) that the mouse hovers and clicks; a side panel with the tour score, the record and the next opponent
    const mx = r.W * .36, my = r.H * .22, mw = r.W * .6, mh = r.H * .6;
    const spots = [[.12, .62], [.36, .42], [.6, .58], [.82, .32]];
    const pulse = .5 + .5 * Math.sin(game.time * 5);
    r.overlay(g => {
      px.rect(g, mx, my, mw, mh, '#1a2a4a');
      px.rect(g, mx, my + mh * .7, mw, mh * .3, '#0c3a5a');                              // the sea
      px.rect(g, mx, my + mh * .66, mw * .35, mh * .05, '#c8a86a');                       // the Pier's boardwalk on the coast
      for (let i = 0; i < 9; i++) px.rect(g, mx + mw * (.03 + i * .04), my + mh * (.14 + (i % 3) * .05), mw * .03, mh * .4 - (i % 3) * 8, '#243a66');   // Neon Heights
      for (let i = 0; i < 6; i++) px.rect(g, mx + mw * (.3 + i * .02), my + mh * (.66 - (i % 2) * .03), mw * .025, mh * .05, '#6a5a48');  // Scrapyard junk piles
      px.disc(g, mx + mw * .9, my + mh * .8, mh * .09, '#3a5a2a'); px.disc(g, mx + mw * .9, my + mh * .76, mh * .04, '#7a3a2a');        // Kaboom Island and its volcano
      px.disc(g, mx + mw * .66, my + mh * .18, mh * .13, '#2a2e44'); px.rect(g, mx + mw * .6, my + mh * .18, mw * .12, mh * .08, '#34385a');   // the Blam Dome on a hill
      const names = ['NEON HEIGHTS', 'THE PIER', 'SCRAPYARD', 'KABOOM ISLAND', 'BLAM DOME'];
      names.forEach((n, i) => E.font.text(g, n, mx + mw * [.12, .36, .6, .82, .66][i], my + mh * [.08, .66, .68, .9, .08][i], C.cyan, { scale: 1, outline: false, shadow: '#000' }));
      // the route, dotted
      for (let i = 0; i < 3; i++) for (let k = 1; k < 8; k++) { const f = k / 8; const x = lerp(mx + mw * spots[i][0], mx + mw * spots[i + 1][0], f), y = lerp(my + mh * spots[i][1], my + mh * spots[i + 1][1], f); px.rect(g, x, y, 3, 3, '#ffe08a'); }
      st.forEach((s2, i) => {
        const cx = mx + mw * spots[i][0], cy = my + mh * spots[i][1], won = t.won.includes(i), next = i === t.won.length;
        const hot = S.tourHover === i;
        px.disc(g, cx, cy, next ? 15 + pulse * 3 : 14, won ? C.ok : next ? C.accent : '#3a2a5a'); px.disc(g, cx, cy, 11, '#140c26');
        if (hot) px.disc(g, cx, cy, 17, C.gold);
        E.font.text(g, won ? 'W' : String(i + 1), cx, cy - 4, won ? C.ok : next ? C.ink : C.muted, { align: 'center', scale: 1, outline: false });
        E.font.text(g, teamDef(s2.team).short, cx, cy + 20, won ? C.ok : C.ink, { align: 'center', scale: 1, outline: false, shadow: '#000' });
        if (won) E.font.text(g, 'W ' + (t.stamp && t.stamp[i] || ''), cx, cy + 30, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
      });
      panel(g, mx, my + mh + 12, mw, r.H * .16);
      E.font.text(g, 'TOUR SCORE ' + t.score, mx + 14, my + mh + 24, C.gold, { scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'RECORD: MOST POINTS ' + (S.progress.records.mostPoints || 0) + ' · TOURS WON ' + (S.progress.records.toursWon || 0), mx + 14, my + mh + 56, C.cyan, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'NEXT: ' + (t.won.length < 4 && st[t.won.length] ? teamDef(st[t.won.length].team).name : 'NONE'), mx + 14, my + mh + 74, C.ink, { scale: 1, outline: false, shadow: '#000' });
    });
    // the medallions answer the mouse: hover moves the focus to a stop, a click starts it
    const pt = game.input.pointer(), ck = game.input.clicked();
    S.tourHover = -1;
    spots.forEach((sp, i) => {
      const cx = mx + mw * sp[0], cy = my + mh * sp[1];
      if (pt && Math.hypot(pt[0] - cx, pt[1] - cy) < 18) { S.tourHover = i; S.tourList.i = Math.min(i, S.tourList.items.length - 1); }
      if (ck && Math.hypot(ck[0] - cx, ck[1] - cy) < 18) { const it = S.tourList.items[i]; if (it && !it.disabled && it.on) it.on(S.tourList); }
    });
  }
};
const tourStartStop = i => {
  const t = tourNow(), s = TOUR_STOPS[t.team][i], rival = teamDef(s.team), court = COURTS[s.court];
  t.stop = i; tourSave();
  S.setup = { home: t.team, away: s.team, court: s.court, qLen: 90, difficulty: setting('difficulty') || 'Pro', powerups: i >= 1, twists: true, humans: [{ slot: 0, input: game.input }], lineup: t.lineup || [0, 0], mode: 'tour', tourStop: i };
  S.tourShift = TOUR_SHIFT[i];
  const pre = PREGAME[s.team];
  const reply = pre && pre.replies[t.team];
  const beats = [['vinnie', 'STOP ' + (i + 1) + ' OF THE BLAM TOUR: {TEAM} VERSUS ' + rival.name + ' AT ' + court.name + '!'], ['deedee', BEATS.stopIntro[s.court]]];
  if (pre) beats.push([pre.who, pre.line], ['captain', reply ? reply[1] : '']);
  if (i === 3) beats.unshift(['vinnie', BEATS.final[0][1]]);
  playBeat(beats, () => game.go('matchup', null, { fade: .2 }));
};

/** the match's result on a tour: a win gives the stop's points and the post-game beat; a loss gives the rematch countdown */
const tourResult = (won, margin) => {
  const t = tourNow(), i = (S.setup || {}).tourStop || 0, pts = S.match.score[0];
  if (won) {
    if (!t.won.includes(i)) t.won.push(i);
    t.stamp = t.stamp || {}; t.stamp[i] = S.match.score[0] + '-' + S.match.score[1];   // the W stamp shows the final score
    t.score += TOUR_SCORE_OF(pts, margin, true);
    t.lost = null;
    tourSave();
    const post = BEATS.postGame[i + 1 <= 2 ? i + 1 : 2] || [];
    if (i === 3) return 'ending';
    return post.length ? 'post' : 'map';
  }
  t.lost = i; tourSave();
  return 'loss';
};
/** the stop's beats after a win: the post-game beat for the first two stops; the reveal after stop three; the ending */
const tourNextAfterWin = () => {
  const t = tourNow(), i = t.stop;
  if (i === 2) return playBeat(BEATS.reveal.map(([w, x]) => [w, w === 'captain' ? x : x]), () => game.go('tour', null, { fade: .2 }));
  if (i === 3) return tourEnding();
  const post = BEATS.postGame[i + 1];
  if (post) return playBeat(post, () => game.go('tour', null, { fade: .2 }));
  game.go('tour', null, { fade: .2 });
};
const tourEnding = () => {
  const t = tourNow();
  S.progress.unlocked.bots = true; S.progress.unlocked.allstars = true; S.progress.unlocked.bigHeads = true;
  S.progress.records.toursWon = (S.progress.records.toursWon || 0) + 1;
  tourSave();
  playBeat(BEATS.ending, () => game.go('credits', null, { fade: .3 }));
};
/** a loss on a stop: the results, then REMATCH? with a ten-second countdown (Rematch, Tour Map, Quit Tour) */
scenes.loss = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'loss'; S.lossT = 10; S.lossList = new FocusList([], { x: 40, y: 0, gap: 40, w: 300 }); },
  update(dt) {
    S.lossT -= dt;
    S.lossList.setItems([{ label: 'REMATCH', on: () => tourRematch() }, { label: 'TOUR MAP', on: () => game.go('tour', null, { fade: .2 }) }, { label: 'QUIT TOUR', on: () => tourQuit() }]);
    S.lossList.nav(dt);
    if (S.lossT <= 0) tourQuit();
  },
  draw(r) {
    const i = tourNow().lost, t = tourNow();
    r.sky(['#2a0a14', '#4a1a2a', '#6a2a3a']);
    r.overlay(g => {
      screenTitle(g, 'REMATCH?', i === 3 ? (BEATS.lossFinal[0][1]) : (BEATS.lossStop[0][1]), r.W);
      E.font.text(g, 'REMATCH IN ' + Math.ceil(Math.max(0, S.lossT)) + ' S', r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 3, outline: false, shadow: '#000' });
    });
    S.lossList.draw(r, { x: r.W * .3, y: r.H * .6, gap: 48, w: 300, scale: 2 });
    promptBar(r, MENU_PROMPT);
  }
};
const tourRematch = () => { const t = tourNow(); tourStartStop(t.lost); };
const tourQuit = () => { const t = tourNow(); t.quit = true; tourSave(); if (t.score > 0) hallEntry(t.score); else game.go('menu', null, { fade: .2 }); };
/** the Hall of Blam's initials wheel: up and down change a letter, left and right move, ✕ enters */
const hallEntry = score => { S.entry = { score, letters: [0, 0, 0], at: 0, team: teamDef(tourNow().team).short }; game.go('initials', null, { fade: .2 }); };
scenes.initials = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'initials'; },
  update() {
    const E2 = S.entry;
    if (game.input.pressed('up')) E2.letters[E2.at] = (E2.letters[E2.at] + 1) % 26;
    if (game.input.pressed('down')) E2.letters[E2.at] = (E2.letters[E2.at] + 25) % 26;
    if (game.input.pressed('right')) E2.at = Math.min(2, E2.at + 1);
    if (game.input.pressed('left')) E2.at = Math.max(0, E2.at - 1);
    if (game.input.pressed('confirm')) {
      const init = E2.letters.map(l => String.fromCharCode(65 + l)).join('');
      const hall = S.progress.hall || (S.progress.hall = []);
      hall.push({ initials: init, team: E2.team, score: E2.score }); hall.sort((a, b) => b.score - a.score); hall.length = Math.min(hall.length, 10);
      tourSave(); game.go('hall', null, { fade: .3 });
    }
    if (game.input.pressed('cancel')) game.go('menu', null, { fade: .2 });
  },
  draw(r) {
    const E2 = S.entry;
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'HALL OF BLAM', 'ENTER YOUR INITIALS · ' + E2.score + ' POINTS', r.W);
      E2.letters.forEach((l, i) => E.font.text(g, String.fromCharCode(65 + l), r.W / 2 - 60 + i * 60, r.H * .45, i === E2.at ? C.gold : C.ink, { align: 'center', scale: 5, outline: false, shadow: '#000' }));
    });
    promptBar(r, [['{confirm}', 'ENTER'], ['{cancel}', 'CANCEL']]);
  }
};
/** the credits after the ending: a scroll over the trophy and the unlock cards */
scenes.credits = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'credits'; S.creditsT = 0; playSong('credits'); },
  update(dt) { S.creditsT += dt; if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start')) tourQuitHall(); if (S.creditsT > 30) tourQuitHall(); },
  draw(r) {
    r.sky(['#2a0a40', '#5a1a6a', '#ff7a5c']);
    const lines = ['ZONEFIRE', 'THE BLAM TOUR, COMPLETE', '', 'PRODUCED WITH MY-3D2DGE V0.85.2', 'THE CHANNEL BLAM BROADCAST TEAM', 'VINNIE VOX · DEE DEE DECIBEL', 'COMMISSIONER GIGAWATT (NOT HAPPY)', 'THE BLAMBOTS (RECYCLED)', '', 'UNLOCKED: THE BLAMBOTS', 'UNLOCKED: CHANNEL BLAM ALL-STARS', 'UNLOCKED: BIG HEADS (OPTIONS)', 'SECRETS ON THE ABOUT SCREEN', '', 'NO FOULS. NO MERCY. ALL BLAM.'];
    r.overlay(g => { lines.forEach((t, i) => E.font.text(g, t, r.W / 2, r.H - 40 - S.creditsT * 26 + i * 34, C.ink, { align: 'center', scale: i === 0 ? 3 : 2, outline: false, shadow: '#000' })); });
  }
};
const tourQuitHall = () => { const t = tourNow(); if (t && t.score > 0 && !t.hallDone) { t.hallDone = true; tourSave(); hallEntry(t.score); } else game.go('menu', null, { fade: .3 }); };
