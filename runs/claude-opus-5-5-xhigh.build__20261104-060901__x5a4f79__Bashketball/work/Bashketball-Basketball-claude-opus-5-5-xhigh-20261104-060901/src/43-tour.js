/* 43-tour: the Blam Tour (PLAN 10.5-10.6). PROLOGUE -> STOP 1 -> STOP 2 -> STOP 3 -> THE REVEAL -> THE FINAL -> ENDING ->
 * CREDITS -> HALL OF BLAM ENTRY. The tour map, the story scene (beats as dialog with live portraits and gibberish voices,
 * staged with posed rigs), the flow between stops, rematches, autosave and CONTINUE TOUR, unlocks, in-play beats. */
const TOUR = { team: 'hightops', stop: 0, score: 0, cheatsUsed: false, beatsSeen: [], lineups: [null, null], opp: null, court: null, seenReboot: false, gags: [], results: [], firstTour: true };
game.saves.write = () => ({ data: tourState(), place: TOUR.court ? get('court', TOUR.court).name : 'THE BLAM TOUR', level: TOUR.stop + 1 });
game.saves.read = save => { if (save && save.data) restoreTour(save.data); };
function tourState() { return { team: TOUR.team, stop: TOUR.stop, score: TOUR.score, cheatsUsed: TOUR.cheatsUsed, beatsSeen: TOUR.beatsSeen.slice(), lineups: TOUR.lineups, results: TOUR.results.slice(), gags: TOUR.gags.slice() }; }
function restoreTour(d) { Object.assign(TOUR, { team: d.team, stop: d.stop, score: d.score || 0, cheatsUsed: !!d.cheatsUsed, beatsSeen: d.beatsSeen || [], lineups: d.lineups || [null, null], results: d.results || [], gags: d.gags || [] }); setStop(); }
function setStop() {
  const opps = TOUR_STOPS[TOUR.team] || TOUR_STOPS.hightops;
  TOUR.opp = TOUR.stop < 3 ? opps[TOUR.stop] : 'blambots'; TOUR.court = get('team', TOUR.opp).court;
  TOUR.lineups = [TOUR.lineups[0] || get('team', TOUR.team).players.slice(), get('team', TOUR.opp).players.slice()];
}
function saveTour() { PROG.tour = tourState(); saveProgress(); try { game.saves.autosave(); } catch (e) { game.fail('autosave', e); } }
function beginTour() {
  Object.assign(TOUR, { team: EXH.teams[0], stop: 0, score: 0, cheatsUsed: false, beatsSeen: [], results: [], gags: [], seenReboot: false, firstTour: !PROG.tour && !PROG.records.toursWon });
  TOUR.lineups = [EXH.lineups[0] || get('team', TOUR.team).players.slice(), null]; TOUR.humans = Math.min(2, EXH.picks ? EXH.picks.filter(p => p.side === 0).length : 1);
  setStop(); saveTour();
  playBeats(TOUR.firstTour ? ['prologue', 'campOffer'] : ['prologue'], () => gotoScreen('tourmap'));
}
function continueTour() { const d = PROG.tour || (game.saves.latest() && game.saves.latest().data); if (!d) return false; restoreTour(d); TOUR.humans = 1; gotoScreen('tourmap'); return true; }
/* ---- the tour's menu ---- */
S.menu.tour = { i: 0, rects: [] };
SC.tourmenu = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('tourmap'); },
  items() { return [{ label: 'CONTINUE TOUR', disabled: !PROG.tour, sub: PROG.tour ? get('team', PROG.tour.team).short + ' • STOP ' + (PROG.tour.stop + 1) + ' • ' + PROG.tour.score + ' PTS' : 'No tour in progress' }, { label: 'NEW TOUR', sub: 'Pick a crew and take on the Tour' }, { label: 'BACK' }]; },
  update(dt) {
    const nav = idleTick(dt, 'tourmenu'); if (!nav) return; const st = S.menu.tour, items = this.items(); if (items[st.i].disabled) st.i = 1;
    const r = listNav(st, items, nav);
    if (r.cancel) { gotoScreen('menu'); return; }
    if (r.picked === 0) { consumeNav(); continueTour(); } else if (r.picked === 1) { consumeNav(); EXH.seats = [{ side: 0, ready: true }]; EXH.teams[0] = EXH.teams[0] && STREET_TEAMS.includes(EXH.teams[0]) ? EXH.teams[0] : 'hightops'; gotoScreen('teams', { tour: true }); } else if (r.picked === 2) gotoScreen('menu');
  },
  draw(r) {
    screenFrame(r, 'THE BLAM TOUR', ['{confirm} SELECT', '{cancel} BACK']);
    r.overlay(g => { const st = S.menu.tour, x = Math.round(r.W * .2), w = Math.round(r.W * .6); st.rects = this.items().map((it, i) => drawButton(g, x, 50 + i * 36, w, 30, it.label, { focus: st.i === i, sub: it.sub, disabled: it.disabled })); });
  }
};
/* ---- the tour map: Neon Heights' skyline, the Pier on the coast, the Scrapyard inland, Kaboom Island, the Dome on a hill ---- */
const MAP_SPOTS = { skybox: [.2, .32], pier: [.14, .7], scrapyard: [.48, .5], caldera: [.78, .78], dome: [.7, .22] };
S.menu.map = { hover: -1 };
SC.tourmap = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('tourmap'); setStop(); },
  update(dt) {
    const nav = idleTick(dt, 'tourmap'); if (!nav) return;
    const medal = SC.tourmap.medal, clickNext = nav.click && ((SC.tourmap.nextRect && inRect(nav.click, SC.tourmap.nextRect)) || (medal && Math.hypot(nav.click[0] - medal[0], nav.click[1] - medal[1]) < 14));
    SC.tourmap.hover = !!(medal && NAV.hover && Math.hypot(NAV.hover[0] - medal[0], NAV.hover[1] - medal[1]) < 14);
    if (nav.confirm || clickNext) { consumeNav(); goToStop(); }
    if (nav.cancel) { saveTour(); gotoScreen('menu'); }
  },
  draw(r) {
    screenFrame(r, 'THE BLAM TOUR', ['{confirm} PLAY STOP ' + (TOUR.stop + 1), '{cancel} SAVE & QUIT'], { sky: ['#0e1a3a', '#1a3a5a', '#2a5a6a'] });
    r.overlay(g => {
      const mw = Math.round(r.W * .64), mh = r.H - 60, mx = Math.round(r.W * .03), my = 28, t = game.real;
      // the land and the sea
      E.ui.box(g, mx, my, mw, mh, { bg: ['#2a6a8a', '#1a4a6a'], border: '#8ab0c8' });
      px.poly(g, [[mx + 4, my + 4], [mx + mw * .92, my + 4], [mx + mw * .9, my + mh * .55], [mx + mw * .6, my + mh * .7], [mx + mw * .25, my + mh * .62], [mx + 4, my + mh * .82]], '#5a8a4a');
      px.poly(g, [[mx + mw * .66, my + mh * .7], [mx + mw * .9, my + mh * .66], [mx + mw * .94, my + mh * .9], [mx + mw * .68, my + mh * .94]], '#4a7a3a');
      for (let k = 0; k < 6; k++) px.rect(g, mx + mw * .08 + k * 6, my + mh * .2 - (k % 3) * 6, 5, 14 + (k % 3) * 6, '#3a2a5a');
      const order = (TOUR_STOPS[TOUR.team] || []).map(id => get('team', id).court).concat('dome'), home = get('team', TOUR.team).court;
      const pt = c => [mx + MAP_SPOTS[c][0] * mw, my + MAP_SPOTS[c][1] * mh];
      const [hx, hy] = pt(home); px.disc(g, hx, hy, 5, '#fff'); E.font.text(g, 'HOME', hx, hy + 7, '#fff', { align: 'center', outline: '#000' });
      let prev = [hx, hy];
      order.forEach((c, i) => { const [x, y] = pt(c); for (let u = 0; u < 1; u += .08) px.dot(g, lerp(prev[0], x, u), lerp(prev[1], y, u), i <= TOUR.stop ? '#ffd23a' : '#c8d8e8'); prev = [x, y]; });
      order.forEach((c, i) => {
        const [x, y] = pt(c), won = i < TOUR.stop, next = i === TOUR.stop, T = get('team', i < 3 ? TOUR_STOPS[TOUR.team][i] : 'blambots'), pulse = next ? 2 + Math.sin(t * 6) * 1.5 + (SC.tourmap.hover ? 2 : 0) : 0;
        if (next) SC.tourmap.medal = [x, y];
        px.disc(g, x, y, 10 + pulse, next ? UIC.gold : won ? '#5ae08a' : '#3a3a5a'); px.disc(g, x, y, 8, i === 3 ? '#2a2a3a' : E.shade(T.colors.jersey, -.3)); px.sprite(g, LOGOS[T.logo].spr, x - 6, y - 5);
        if (won) { E.font.title(g, 'W', x + 8, y - 12, { scale: 1, colors: ['#ffffff', '#5aff7a', '#1a8a3a'] }); const res = TOUR.results[i]; if (res) E.font.text(g, res, x, y + 12, '#fff', { align: 'center', outline: '#000' }); }
        E.font.text(g, get('court', c).name.replace('THE ', ''), x, y - 22, next ? UIC.gold : '#e8f0ff', { align: 'center', outline: '#000' });
      });
      // the side panel
      const sx = mx + mw + 8, sw = r.W - sx - 8, T = get('team', TOUR.team), O = get('team', TOUR.opp);
      E.ui.box(g, sx, my, sw, mh, { bg: ['#1e1434', '#120a22'], border: UIC.line });
      px.sprite(g, LOGOS[T.logo].big, sx + sw / 2 - 12, my + 6); E.font.text(g, T.short, sx + sw / 2, my + 30, '#fff', { align: 'center', outline: false });
      E.font.text(g, 'TOUR SCORE', sx + sw / 2, my + 44, UIC.muted, { align: 'center', outline: false }); E.font.text(g, String(TOUR.score), sx + sw / 2, my + 53, UIC.gold, { align: 'center', scale: 2, outline: '#000' });
      E.font.text(g, 'RECORD ' + TOUR.stop + '-' + (TOUR.losses || 0), sx + sw / 2, my + 72, UIC.ink, { align: 'center', outline: false });
      E.font.text(g, TOUR.stop < 3 ? 'NEXT: STOP ' + (TOUR.stop + 1) : 'THE FINAL', sx + sw / 2, my + 88, UIC.gold, { align: 'center', outline: false });
      E.font.text(g, 'VS ' + O.short, sx + sw / 2, my + 98, '#fff', { align: 'center', outline: false });
      E.font.text(g, get('court', TOUR.court).name, sx + sw / 2, my + 108, UIC.muted, { align: 'center', outline: false });
      SC.tourmap.nextRect = drawButton(g, sx + 6, my + mh - 30, sw - 12, 22, 'PLAY', { focus: true, center: true });
    });
  }
};
function tourDiff() { const base = game.settings.difficulty === undefined ? 1 : game.settings.difficulty; return clamp(base + TOUR_DIFF_SHIFT[Math.min(3, TOUR.stop)], 0, 3); }
function goToStop() {
  setStop();
  const beats = TOUR.stop === 3 ? ['finalPre'] : ['stopIntro', 'pregame'];
  playBeats(beats, () => gotoScreen('matchup', { tour: true }));
}
function startTourMatch() {
  const humans = game.players.slice(0, Math.max(1, Math.min(2, TOUR.humans || 1))).map((I, i) => [i, I]);
  const o = applyCodes({ court: TOUR.court, home: TOUR.team, away: TOUR.opp, lineups: TOUR.lineups.map(l => l && l.slice()), humans, quarterLen: TOUR.quarterLen || 90, diff: [tourDiff(), tourDiff()], powerups: TOUR.stop > 0, twists: true, comeback: game.settings.comeback, mode: 'tour' });
  if (o.starred) TOUR.cheatsUsed = true;
  startMatchScene(o, { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'tour' }); } });
}
/** after a tour match's results: the post-game beat and the map, or the rematch prompt, or the ending */
function tourAfterMatch(res) {
  const won = res.winner === 0;
  if (won) {
    TOUR.score += res.style[0]; TOUR.results[TOUR.stop] = res.score[0] + '-' + res.score[1];
    const done = TOUR.stop; TOUR.stop++;
    if (done === 3) { TOUR.stop = 3; finishTour(); return; }
    saveTour();
    const beats = done === 0 ? ['post1'] : done === 1 ? ['post2'] : ['reveal'];
    TOUR.lastOpp = TOUR.opp; playBeats(beats, () => gotoScreen('tourmap'), { opp: TOUR.opp });
  } else { TOUR.losses = (TOUR.losses || 0) + 1; playBeats([TOUR.stop === 3 ? 'lossFinal' : 'lossStop'], () => gotoScreen('rematch')); }
}
/* ---- a loss: REMATCH? with a 10-second countdown ---- */
S.menu.rematch = { i: 0, rects: [], t: 0 };
SC.rematch = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('story'); S.menu.rematch.t = 10; S.menu.rematch.i = 0; },
  items: [{ label: 'REMATCH' }, { label: 'TOUR MAP' }, { label: 'QUIT TOUR' }],
  update(dt) {
    const st = S.menu.rematch, nav = navInput(); st.t -= dt;
    const r = listNav(st, this.items, nav);
    if (r.picked === 0 || st.t <= 0) { consumeNav(); gotoScreen('matchup', { tour: true }); }
    else if (r.picked === 1) { consumeNav(); saveTour(); gotoScreen('tourmap'); }
    else if (r.picked === 2 || r.cancel) { consumeNav(); quitTour(); }
  },
  draw(r) {
    screenFrame(r, 'REMATCH?', ['{confirm} SELECT']);
    r.overlay(g => { const st = S.menu.rematch, x = Math.round(r.W * .3), w = Math.round(r.W * .4); E.font.title(g, String(Math.max(0, Math.ceil(st.t))), Math.round(r.W / 2), 36, { align: 'center', scale: 4, colors: BANNER_COLORS.block }); st.rects = this.items.map((it, i) => drawButton(g, x, 90 + i * 28, w, 22, it.label, { focus: st.i === i, center: true })); });
  }
};
function quitTour() { const score = TOUR.score; PROG.tour = null; saveProgress(); hallEntry(score, () => gotoScreen('menu')); }
function finishTour() {
  PROG.records.toursWon = (PROG.records.toursWon || 0) + 1;
  const newly = !PROG.unlocked.bots; PROG.unlocked.bots = true; PROG.unlocked.allstars = true; PROG.unlocked.bigHeads = true; PROG.tour = null; saveProgress(); defineBigHeads();
  playBeats(['ending'], () => gotoScreen('credits', { unlocks: newly || true, score: TOUR.score }));
}
function defineBigHeads() { if (PROG.unlocked.bigHeads && !game.settings.spec('bigHeads')) game.settings.define({ key: 'bigHeads', label: 'Big heads', type: 'toggle', value: false, group: 'Game' }); }
/** the initials wheel for a qualifying tour score (no cheats), then done */
function hallEntry(score, done) {
  if (!TOUR.cheatsUsed && score > 0 && CAB.qualifies(score, 'tour') && !HUB) gotoScreen('hallentry', { score, done }); else done();
}
SC.hallentry = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('credits'); this.d = d; CAB.enter(d.score, 'tour', () => { game.after(.6, () => this.d.done()); }); },
  update(dt) { CAB.update(dt); },
  draw(r) { screenFrame(r, 'HALL OF BLAM', null); r.overlay(g => { E.font.text(g, 'TOUR SCORE ' + this.d.score + '! ENTER YOUR INITIALS', Math.round(r.W / 2), 30, UIC.gold, { align: 'center', outline: false }); }); CAB.draw(r); }
};
/* ---- credits: the roll over the trophy lift and a confetti storm, then the unlock cards ---- */
SC.credits = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('credits'); setupArena('dome'); this.t = 0; this.d = d || {}; this.cards = d && d.unlocks ? UNLOCK_CARDS.slice() : []; sting('victory'); this.trophy = dressPlayer(get('player', get('team', TOUR.team).players[0]), TOUR.team); },
  update(dt) {
    this.t += dt; updateArena(dt); crowdTick(1 / 120, false); game.focus(CMX, CMY, 0); if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) { for (let k = 0; k < 3; k++) P.add({ kind: 'bit', x: CMX - 200 + S.fx() * 400, y: CMY - 60 + S.fx() * 120, z: 160, vx: (S.fx() - .5) * 30, vy: 0, vz: -20, life: 3, color: pickF(['#ff3ca6', '#2de2ff', '#ffd23a', '#5ae08a', '#ffffff']) }); crowdReact('cheer', .2); }
    this.trophy.bb.pose = CLIPS.pointSky(this.t); this.trophy.bb.pose.R = [2, 2, 46]; this.trophy.bb.pose.L = [2, -2, 46]; this.trophy.bb.w = 1; this.trophy.update(dt, { x: CMX, y: CMY, z: 0, facing: PI / 2, expr: 'shout' });
    const nav = navInput(), rollEnd = CREDITS_ROLL.length * 12 / 22 + 8;
    if (nav.confirm || nav.cancel || nav.click || this.t > rollEnd + this.cards.length * 2.5) {
      if (this.t < rollEnd && !nav.cancel) { this.t = rollEnd; consumeNav(); return; }
      consumeNav(); const score = this.d.score || 0; if (this.d.score !== undefined) hallEntry(score, () => gotoScreen('menu')); else gotoScreen('about');
    }
  },
  draw(r) {
    drawArena(r); r.shadow(CMX, CMY, 8, .4); r.actor(CMX, CMY, 0, (g, ox, oy) => this.trophy.draw(g, ox, oy, r.view));
    const h = this.trophy.hand('R'); r.shape('trophy', h[0], h[1], h[2] - 4, { scale: 1.2 });
    r.overlay(g => {
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a1a4a'));
      const rollEnd = CREDITS_ROLL.length * 12 / 22 + 8, y0 = r.H - this.t * 22;
      if (this.t < rollEnd) CREDITS_ROLL.forEach(([a, b], i) => { const y = Math.round(y0 + i * 12 * 2); if (y < -10 || y > r.H) return; E.font.text(g, a, Math.round(r.W / 2), y, UIC.gold, { align: 'center', outline: '#000' }); if (b) E.font.text(g, b, Math.round(r.W / 2), y + 10, '#fff', { align: 'center', outline: '#000' }); });
      else { const k = Math.floor((this.t - rollEnd) / 2.5), c = this.cards[Math.min(k, this.cards.length - 1)]; if (c) { if (Math.floor(((this.t - rollEnd) % 2.5) * 10) === 0) sting('unlock'); E.ui.box(g, Math.round(r.W / 2) - 120, Math.round(r.H / 2) - 20, 240, 40, { bg: ['#3a1a5a', '#1a0a2a'], border: UIC.gold }); E.font.text(g, c, Math.round(r.W / 2), Math.round(r.H / 2) - 4, UIC.gold, { align: 'center', outline: '#000' }); } }
    });
  }
};

/* ---- the story scene: a list of beats, each a series of dialog lines on its stage ---- */
const TALK = new E.Dialog(game, { lines: 3, place: 'bottom', speed: 46 });
const STORY = { queue: [], beat: null, i: 0, lines: [], done: null, rigs: {}, t: 0, holdT: 0, choiceRes: null, ctx: {} };
function playBeats(ids, done, ctx = {}) { STORY.queue = ids.slice(); STORY.done = done; STORY.ctx = ctx; game.go('story', null, { fade: .2 }); }
function storyVars() { const T = get('team', TOUR.team); return { TEAM: T.short, CAPTAIN: get('player', (TOUR.lineups[0] || T.players)[0]).name }; }
function nextBeat() {
  if (!STORY.queue.length) { const d = STORY.done; STORY.done = null; TALK.close(); if (d) d(STORY.choiceRes); return; }
  const id = STORY.queue.shift(), b = get('beat', id); STORY.beat = b; STORY.i = 0; STORY.t = 0;
  if (!TOUR.beatsSeen.includes(id)) TOUR.beatsSeen.push(id);
  const ctx = Object.assign({ team: TOUR.team, stop: TOUR.stop, opp: STORY.ctx.opp || TOUR.opp, court: TOUR.court, homeTeam: TOUR.team, awayTeam: TOUR.opp }, STORY.ctx);
  STORY.lines = (b.dynamic ? beatLines(id, ctx) : b.lines).map(([sp, text]) => [sp === '{CAPTAIN}' ? (TOUR.lineups[0] || get('team', TOUR.team).players)[0] : sp, fill(text, storyVars())]);
  stageBeat(b, ctx); playMusic(b.music || 'story'); if (b.villain) game.after(.5, () => musicLayer('villain', true));
  emit('beat', { id }); sayLine();
}
function sayLine() {
  const b = STORY.beat, L = STORY.lines[STORY.i];
  if (!L) { nextBeat(); return; }
  const [sp, text] = L, both = sp === 'both', who = both ? 'vinnie' : sp, prof = CAST[who] ? CAST[who].voice : get('player', who) ? get('player', who).voice : 'vinnie';
  const name = both ? 'VINNIE & DEE DEE' : CAST[who] ? CAST[who].name : get('player', who) ? get('player', who).name : who.toUpperCase();
  TALK.voice = (ch, i, page) => { Voice.letter(ch, i, page, prof); if (both) Voice.letter(ch, i, page, 'deedee'); };
  const last = STORY.i === STORY.lines.length - 1, choices = last && b.choices ? b.choices : null;
  STORY.speaker = who;
  TALK.say(text, { name, portrait: storyRig(who), portraitOpts: { zoom: 3.2, turn: .4 }, choices, onChoice: k => { STORY.choiceRes = k; if (b.choices && k === 0 && STORY.beat === get('beat', 'campOffer')) { STORY.queue = []; STORY.done = () => { gotoScreen('camp', { fromTour: true }); }; } }, onDone: () => { STORY.i++; sayLine(); } });
}
function storyRig(id) { if (STORY.rigs[id]) return STORY.rigs[id]; const d = get('player', id); const rig = d ? dressPlayer(d, d.team) : castRig(CAST[id] ? id : 'vinnie'); rig.update(0, { x: 0, y: 0, z: 0, facing: PI / 2 }); return (STORY.rigs[id] = rig); }
/** each stage: where the cast stands */
function stageBeat(b, ctx) {
  const st = b.stage, actors = [];
  if (st === 'studio' || st === 'monitor') { actors.push(['vinnie', CMX - 26, CMY - 14, PI / 2], ['deedee', CMX + 26, CMY - 14, PI / 2]); }
  else if (st === 'court') { const a = (RIVAL_LINES[ctx.opp] || ['volt'])[0], mine = (TOUR.lineups[0] || get('team', TOUR.team).players)[0]; actors.push([mine, CMX - 40, CMY + 10, 0], [a, CMX + 40, CMY + 10, PI]); if (BEATEN_LINES[ctx.opp]) actors.push([BEATEN_LINES[ctx.opp][0], CMX + 40, CMY + 10, PI]); }
  else if (st === 'dome') { const mine = (TOUR.lineups[0] || get('team', TOUR.team).players)[0]; actors.push([mine, CMX - 70, CMY + 20, 0], ['gigawatt', CMX + 10, CMY - 10, PI * .75], ['dunkatron', CMX + 60, CMY + 10, PI], ['swatbot', CMX + 90, CMY - 6, PI]); if (b.ending) actors.push(['blammo', CMX - 20, CMY + 30, 0], ['vinnie', CMX - 120, CMY + 40, 0], ['deedee', CMX - 140, CMY + 20, 0]); }
  const seen = new Set(); STORY.actors = actors.filter(a => { if (seen.has(a[0])) return false; seen.add(a[0]); return true; }).map(([id, x, y, f]) => ({ id, rig: storyRig(id), x, y, f }));
  STORY.court = st === 'court' ? ctx.court : st === 'dome' ? 'dome' : null;
  if (STORY.court) setupArena(STORY.court);
}
SC.story = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [], pausable: true, story: true,
  enter() { menuEnter('story'); STORY.holdT = 0; nextBeat(); },
  exit() { TALK.close(); musicLayer('villain', false); game.setZoom(1); },
  update(dt) {
    STORY.t += dt; if (STORY.court) updateArena(dt);
    for (const a of STORY.actors || []) {
      const talking = STORY.speaker === a.id, ending = STORY.beat && STORY.beat.ending;
      if (ending && a.id === 'blammo' && STORY.i >= 3) { a.x += 30 * dt; const g2 = STORY.actors.find(q => q.id === 'gigawatt'); if (g2) { g2.x = a.x; g2.y = a.y; g2.carried = true; } }
      if (ending && (a.id === 'dunkatron' || a.id === 'swatbot') && STORY.i >= 1) a.down = true;
      a.rig.bb.pose = talking ? (CLIPS[a.rig.bb.def ? a.rig.bb.def.taunt : 'pointCamera'] || CLIPS.pointCamera)(STORY.t) : a.carried ? { R: [3, 6, 38], L: [3, -6, 38] } : null; a.rig.bb.w = approach(a.rig.bb.w, a.rig.bb.pose ? 1 : 0, dt * 8);
      a.rig._talk = talking && TALK.typing;
      a.rig.update(dt, { x: a.x, y: a.y, z: a.carried ? 30 : 0, facing: a.f, expr: talking ? 'shout' : null, down: a.down ? 1 : 0 });
    }
    game.focus(CMX, CMY, 0); game.cam.offset = [0, Math.round(game.H * (STORY.court ? .05 : .16))]; game.setZoom(STORY.court ? 1.3 : 2);
    // hold confirm for a second to skip this beat; Start skips the rest
    if (game.players.some(q => q.down('confirm'))) STORY.holdT += dt; else STORY.holdT = 0;
    if (STORY.holdT > 1) { STORY.holdT = 0; TALK.close(); STORY.lines = []; consumeNav(); nextBeat(); return; }
    if (game.players.some(q => q.pressed('start') && q.lastDevice === 'gamepad')) { skipCutscene(); return; }
    TALK.update(dt);
  },
  draw(r) {
    const b = STORY.beat; if (!b) return;
    if (STORY.court) drawArena(r);
    else { r.sky(['#0a0418', '#1e0c34', '#3a1452']); }
    r.overlay(g => {
      if (!STORY.court) {   // the Channel BLAM studio: lights, the logo, a monitor
        for (let k = 0; k < 8; k++) px.blend(g, .15, 'add', () => px.poly(g, [[r.W * (k / 8) + 20, 0], [r.W * (k / 8) - 30, r.H], [r.W * (k / 8) + 70, r.H]], k % 2 ? '#ff3ca6' : '#2de2ff'));
        const mx = r.W - 132, my = 22; E.ui.box(g, mx, my, 120, 74, { bg: '#0a0a14', border: '#5a5a6a' });
        if (b.stage === 'monitor' || STORY.speaker === 'gigawatt' || (b.id === 'prologue' && STORY.i >= 3 && STORY.i <= 4)) { drawPortrait(g, 'gigawatt', mx + 30, my + 6, 60, { frame: false, expr: 'smile' }); px.blend(g, .15, 'normal', () => { for (let y = my; y < my + 74; y += 2) px.rect(g, mx, y, 120, 1, '#000'); }); }
        else { px.sprite(g, LOGOS.mic.big, mx + 48, my + 20); E.font.text(g, 'CHANNEL BLAM', mx + 60, my + 50, UIC.gold, { align: 'center', outline: false }); }
      }
      E.font.text(g, b.title, 8, 6, UIC.muted, { outline: '#000' });
      promptLine(g, 'HOLD {confirm} SKIP', r.W - 8, 6, { align: 'right' });
    });
    if (!STORY.court) r.shape('anchor-desk', CMX, CMY + 6, 0, { scale: 1.6 });
    for (const a of STORY.actors || []) { r.shadow(a.x, a.y, 7, .4); r.actor(a.x, a.y, a.carried ? 30 : 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    TALK.draw(r);
  }
};
function skipCutscene() { TALK.close(); STORY.queue = []; STORY.lines = []; consumeNav(); nextBeat(); }
/** in play, the story speaks through captions (the Overclock, the first reboot) */
function playInPlayBeat(id) { const lines = get('beat', id).lines.map(([sp, t]) => [sp, fill(t, storyVars())]); lines.forEach(([sp, t], i) => game.after(i * 3.2, () => caption(sp, t, 6))); }
