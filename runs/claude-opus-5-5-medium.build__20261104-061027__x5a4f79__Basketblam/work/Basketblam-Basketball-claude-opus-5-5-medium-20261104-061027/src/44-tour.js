/* THE BLAM TOUR, STORY BEATS AND BLAM CAMP. The Tour: pick a crew, the prologue, three stops at the other crews' courts,
 * the reveal, the final against the BLAMBOTS at the Blam Dome, the ending, credits, unlocks and the Hall of Blam. Story
 * beats are E.Dialog lines with live portraits and gibberish voices on a staged set. Camp: ten lessons, each a few goals
 * checked by match events. */
function loadProgress() {
  const d = { tour: null, unlocked: {}, camp: [], records: {}, seenCamp: false };
  S.progress = Object.assign(d, store.get('bb:progress', {}));
  S.progress.records = S.progress.records || {}; S.progress.unlocked = S.progress.unlocked || {}; S.progress.camp = S.progress.camp || [];
}
function saveProgress() { store.set('bb:progress', S.progress); }
const tourStops = team => STREET_TEAMS.filter(t => t !== team).map(t => ({ opp: t, court: get('team', t).court })).concat([{ opp: 'blambots', court: 'dome', boss: true }]);
const TOUR_DIFF = ['rookie', 'pro', 'allstar', 'blam'];
function stopDiff(stop) { const k = Math.max(0, TOUR_DIFF.indexOf(setting('difficulty'))), shift = [-1, 0, 1, 1][stop]; return TOUR_DIFF[clamp(k + shift, 0, 3)]; }

/* ---- the Tour's start: continue or new; P2 may join the same crew ---- */
const TSTART = { list: null };
SCENES.tourstart = menuScene({
  enter() {
    S.scene = 'tourstart'; idleReset(); music('tourmap');
    while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
    game.allowJoin({ max: 2, onJoin: (I) => { I.glyphs = setting('symbols'); A.sfx('confirm'); } });
    const t = S.progress.tour, items = [];
    if (t && t.team && t.stop < 4) items.push({ label: 'CONTINUE TOUR', value: 'STOP ' + (t.stop + 1), onPick: () => go('tourmap') });
    items.push({ label: 'NEW TOUR', onPick: () => { S.setup = { mode: 'tour', humans: game.players.map(I => ({ input: I, side: 0 })), teams: ['hightops', 'breakers'], pick: [0, 0] }; go('teams'); } });
    items.push({ label: 'BACK', onPick: () => go('menu') });
    TSTART.list = new FocusList(items, { onBack: () => go('menu') });
  },
  exit() { game.allowJoin(false); },
  onBack() { go('menu'); },
  update(dt) { TSTART.list.update(dt); },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r); E.font.title(g, 'THE BLAM TOUR', r.W / 2, sf.y, { scale: 3, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 2, align: 'center' });
      TSTART.list.draw(g, Math.round(r.W / 2 - 110), sf.y + 40, 220, 24, { scale: 2 });
      txt(g, game.players.length > 1 ? 'P2 JOINED: YOU PLAY TOGETHER ON ONE CREW' : 'A FRIEND? P2 PRESS START (PAD) OR 2 (KEYBOARD) TO JOIN YOUR CREW', r.W / 2, sf.y + 130, UI.dim, 1, 'center');
      promptBar(g, r, '{move} CHOOSE   {confirm} SELECT   {cancel} BACK');
    });
  }
});
function tourBegin() {
  const st = S.setup, team = st.teams[0];
  S.progress.tour = { team, pick: st.pick[0], stop: 0, score: 0, cheats: false, two: st.humans.length > 1 };
  S.tourHumans = st.humans.map(h => h.input);
  saveProgress();
  playBeat('prologue', () => { if (!S.progress.seenCamp) { S.progress.seenCamp = true; saveProgress(); playBeat('campOffer', () => go('tourmap'), { onChoice: i => { if (i === 1) { S.campFromTour = true; go('camplist'); return true; } return false; } }); } else go('tourmap'); });
}
function tourCfg() {
  const t = S.progress.tour, stops = tourStops(t.team), s = stops[t.stop], tm = get('team', t.team), humans = (S.tourHumans && S.tourHumans.length ? S.tourHumans : [game.input]);
  const first = tm.players[t.pick || 0], starters = [first, ...tm.players.filter(x => x !== first)].slice(0, 2);
  return { court: s.court, mode: 'tour', teams: [{ id: t.team, lineup: tm.players.slice(), starters }, { id: s.opp }], humans: humans.slice(0, 2).map((I, k) => ({ input: I, slot: k })),
    quarter: 90, difficulty: stopDiff(t.stop), powerups: t.stop > 0, twists: true, boss: !!s.boss, stopLabel: s.boss ? 'THE FINAL' : 'STOP ' + (t.stop + 1) + ' OF THE BLAM TOUR' };
}
function tourPlayStop() {
  const t = S.progress.tour, stops = tourStops(t.team), s = stops[t.stop], vars = tourVars();
  const intro = { stage: s.court, lines: [['vinnie', 'STOP ' + (t.stop + 1) + ' OF THE BLAM TOUR: ' + get('team', t.team).short + ' VERSUS ' + get('team', s.opp).short + ' AT ' + get('court', s.court).name + '!'], ['deedee', COURT_LINES[s.court]]] };
  if (s.boss) { playBeat('finalPre', () => go('matchup', { cfg: tourCfg() })); return; }
  const rv = RIVAL[s.opp], cap = get('team', t.team).players[t.pick || 0];
  intro.lines.push([rv[0], rv[1]], [cap, rv[2][t.team] || "Let's play."]);
  playBeat(intro, () => go('matchup', { cfg: tourCfg() }));
}
function tourVars() { const t = S.progress.tour; return t ? { team: get('team', t.team).short, captain: get('player', get('team', t.team).players[t.pick || 0]).name, reply: REVEAL_REPLY[t.team] } : {}; }
function tourAfterMatch(won) {
  const t = S.progress.tour, m = S.match, stops = tourStops(t.team), s = stops[t.stop];
  if (!won) { playBeat(s.boss ? 'lossFinal' : 'lossStop', () => go('matchup', { cfg: tourCfg() })); return; }
  t.score += m.style[0]; if (m.cfg.starred) t.cheats = true;
  t.stop++; saveProgress(); emit('tourStop', { stop: t.stop });
  if (s.boss) return tourWon();
  const next = () => go('tourmap');
  if (t.stop === 1) { const b = BEATEN[s.opp]; playBeat({ stage: 'studio', lines: [b, ['gigawatt', 'Hmm. Promising. My engineers are taking notes. Lots of notes.']] }, next); }
  else if (t.stop === 2) playBeat('post2', next);
  else if (t.stop === 3) playBeat('reveal', next);
  else next();
}
function tourWon() {
  const t = S.progress.tour, rec = S.progress.records;
  rec.toursWon = (rec.toursWon || 0) + 1; S.progress.unlocked = Object.assign(S.progress.unlocked, { teams: true, bigHeads: true, secrets: true }); saveProgress();
  playBeat('ending', () => go('credits', { then: () => { const score = t.score; const done = () => { S.progress.tour = null; saveProgress(); go('hall'); }; if (!t.cheats && qualifies(score)) { go('results', { cfg: S.match.cfg }); startInitials(score, get('team', t.team).short, done); } else done(); } }));
}
function tourQuit() {
  const t = S.progress.tour; if (t && t.score > 0 && !t.cheats && qualifies(t.score)) { startInitials(t.score, get('team', t.team).short, () => { S.progress.tour = null; saveProgress(); go('menu'); }); return; }
  S.progress.tour = null; saveProgress(); go('menu');
}

/* ---- the tour map: a painted map with stop medallions (mouse hover and click) ---- */
const TM = { i: 0, boxes: [] };
const MAP_SPOTS = { skybox: [.22, .38], pier: [.15, .72], scrapyard: [.48, .55], caldera: [.82, .78], dome: [.68, .25] };
SCENES.tourmap = menuScene({
  enter() { S.scene = 'tourmap'; idleReset(); music('tourmap'); TM.i = S.progress.tour ? S.progress.tour.stop : 0; },
  onBack() { go('menu'); },
  update(dt) {
    const t = S.progress.tour; if (!t) return go('menu');
    for (const I of game.players) { if (I.pressed('confirm') || I.pressed('start')) { A.sfx('confirm'); return tourPlayStop(); } if (I.pressed('cancel')) { A.sfx('cancel'); return go('menu'); } }
    const cl = game.input.clicked(); if (cl) for (const b of TM.boxes) if (hitBox(cl, b.box) && b.k === t.stop) { A.sfx('confirm'); return tourPlayStop(); }
    const ptr = game.input.pointer(); TM.hover = -1; if (ptr) for (const b of TM.boxes) if (hitBox(ptr, b.box)) TM.hover = b.k;
  },
  draw(r) {
    const t = S.progress.tour; if (!t) return;
    r.sky(['#1a3a6a', '#2a6a9a', '#3a8ab0']); game.focus(0, 0, 0); L.enabled = false;
    r.overlay(g => {
      const sf = safe(r), mx = sf.x, my = sf.y + 20, mw = sf.w, mh = sf.h - 60;
      // the land: coast, hills, the island, the city skyline
      px.poly(g, [[mx, my + mh * .2], [mx + mw * .6, my], [mx + mw * .75, my + mh * .1], [mx + mw * .7, my + mh * .6], [mx + mw * .45, my + mh * .85], [mx + mw * .1, my + mh * .9], [mx, my + mh * .6]], '#4a8a4a');
      px.poly(g, [[mx + mw * .05, my + mh * .25], [mx + mw * .55, my + mh * .08], [mx + mw * .65, my + mh * .5], [mx + mw * .4, my + mh * .75], [mx + mw * .12, my + mh * .7]], '#6aaa5a');
      px.disc(g, mx + mw * .84, my + mh * .76, mh * .14, '#5a3a2a'); px.poly(g, [[mx + mw * .79, my + mh * .8], [mx + mw * .84, my + mh * .58], [mx + mw * .89, my + mh * .8]], '#3a2018'); px.disc(g, mx + mw * .84, my + mh * .6, 3, '#ff5a1a');
      for (let k = 0; k < 7; k++) px.rect(g, mx + mw * (.16 + k * .025), my + mh * (.3 - (k % 3) * .04), mw * .02, mh * (.1 + (k % 3) * .04), '#3a3a5a');
      const stops = tourStops(t.team), order = stops.map(s => s.court);
      let prev = null; TM.boxes = [];
      order.forEach((c, k) => {
        const [u, v] = MAP_SPOTS[c], x = Math.round(mx + mw * u), y = Math.round(my + mh * v);
        if (prev) for (let q = 0; q <= 10; q++) if (q % 2 === 0) px.rect(g, Math.round(lerp(prev[0], x, q / 10)), Math.round(lerp(prev[1], y, q / 10)), 2, 2, '#ffffff');
        prev = [x, y];
        const won = k < t.stop, next = k === t.stop, R = next ? 11 + Math.sin(game.time * 6) * 2 : 10;
        px.disc(g, x, y, R + 2, '#0a0612'); px.disc(g, x, y, R, won ? UI.gold : next ? UI.accent : '#5a5070');
        txt(g, k < 3 ? String(k + 1) : 'F', x, y - 4, '#ffffff', 1, 'center');
        if (won) txt(g, 'W', x + 10, y - 14, UI.good, 2);
        txt(g, get('court', c).name.replace('THE ', ''), x, y + 13, next || TM.hover === k ? '#ffffff' : UI.dim, 1, 'center');
        TM.boxes.push({ box: [x - 14, y - 14, 28, 28], k });
      });
      // the side panel
      const s = stops[t.stop], tm = get('team', t.team);
      const py0 = sf.y + sf.h - 96; panel(g, sf.x + sf.w - 150, py0, 150, 70, null);
      txt(g, tm.short, sf.x + sf.w - 75, py0 + 6, tm.jersey, 1, 'center');
      txt(g, 'TOUR SCORE ' + t.score, sf.x + sf.w - 75, py0 + 18, '#ffffff', 1, 'center');
      txt(g, 'RECORD ' + t.stop + '-0', sf.x + sf.w - 75, py0 + 30, UI.dim, 1, 'center');
      if (s) { txt(g, 'NEXT: ' + get('team', s.opp).short, sf.x + sf.w - 75, py0 + 44, UI.gold, 1, 'center'); txt(g, get('court', s.court).name, sf.x + sf.w - 75, py0 + 55, UI.dim, 1, 'center'); }
      E.font.title(g, 'THE BLAM TOUR', sf.x, sf.y - 4, { scale: 2, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 1 });
      promptBar(g, r, '{confirm} PLAY THE NEXT STOP   {cancel} MAIN MENU');
    });
  }
});

/* ---- story beats: a staged set, then Dialog lines with portraits and voices ---- */
const STORY = { beat: null, i: 0, talk: null, done: null, hold: 0, cast: [] };
function playBeat(beat, done, o = {}) { const b = typeof beat === 'string' ? Object.assign({ id: beat }, BEATS[beat]) : beat; go('story', { beat: b, done, o }); }
function skipStory() { if (S.scene === 'story' && STORY.done) { const d = STORY.done; STORY.done = null; d(); } }
SCENES.story = menuScene({
  pausable: true,
  enter(d) {
    S.scene = 'story'; STORY.beat = d.beat; STORY.done = d.done; STORY.o = d.o || {}; STORY.i = -1; STORY.hold = 0; STORY.t = 0;
    STORY.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: UI.accent, bg: ['#2a1a48', '#140c24'] });
    if (d.beat.music) music(d.beat.music); else music('story');
    if (d.beat.villain) game.after(.5, () => layer('villain', 1));
    STORY.cast = [...new Set(d.beat.lines.map(l => l[0]))].map(id => id === '{CAPTAIN}' ? captainId() : id);
    emit('beat', { beat: d.beat.id || 'stop' });
    nextLine();
  },
  update(dt) {
    STORY.t += dt;
    if (game.players.some(I => I.down('confirm'))) { STORY.hold += dt; if (STORY.hold > 1) { STORY.hold = 0; game.players.forEach(I => I.consumeAll()); return skipStory(); } } else STORY.hold = 0;
    if (game.players.some(I => I.pressed('start'))) { game.players.forEach(I => I.consumeAll()); return skipStory(); }
    if (STORY.talk.update(dt)) return;
  },
  draw(r) {
    const b = STORY.beat, t = STORY.t, stage = b.stage;
    game.focus(0, 0, 0);
    if (stage === 'studio') { r.sky(['#0a0820', '#1a1040', '#2a1850']); }
    else backdropOf(get('court', stage) ? stage : 'dome').draw(r);
    L.enabled = false;
    r.overlay(g => {
      if (stage !== 'studio') { const c = get('court', stage) || get('court', 'dome'), fy = Math.round(r.H * .6); px.rect(g, 0, fy, r.W, r.H - fy, 'rgb(' + c.base.map(v => Math.round(v * .7)).join(',') + ')'); px.rect(g, 0, fy, r.W, 2, c.line); for (let k = 0; k < 8; k++) px.rect(g, 0, fy + 8 + k * 14, r.W, 1, 'rgb(' + c.base.map(v => Math.round(v * .55)).join(',') + ')'); }
      if (stage === 'studio') {   // the Channel BLAM studio desk; the monitor shows the Commissioner
        const dy = Math.round(r.H * .62); px.rect(g, 0, dy, r.W, r.H - dy, '#1a1230'); E.ui.box(g, Math.round(r.W * .2), dy - 20, Math.round(r.W * .6), 34, { bg: ['#3a2a6a', '#1a1230'], border: UI.gold });
        txt(g, 'CHANNEL BLAM', r.W / 2, dy - 12, UI.gold, 2, 'center');
        const mx = Math.round(r.W * .72), my = Math.round(r.H * .14); E.ui.box(g, mx - 34, my, 68, 54, { bg: '#0a0a14', border: '#6a6a8a' }); npcRig('gigawatt').drawPortrait(g, mx - 24, my + 5, 44, { bg: '#2a1a3a' });
      }
      const cast = STORY.cast.filter(id => id !== 'gigawatt' || stage !== 'studio'), sp = Math.min(70, r.W / (cast.length + 1));
      cast.forEach((id, k) => { const rg = npcRig(id), x = Math.round(r.W / 2 + (k - (cast.length - 1) / 2) * sp), y = Math.round(r.H * (stage === 'studio' ? .6 : .66)); const cur = STORY.cur === id; rg.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: cur ? 'shout' : null, pose: cur && Math.floor(t * 2) % 2 ? 'cheer' : null }); rg.bb.targets = null; rg.draw(g, x, y, E.charView(E.VIEWS.side)); if (cur) txt(g, '↓', x, y - 70, UI.gold, 1, 'center'); });
      promptLine(g, 'HOLD {confirm} SKIP', r.W - 8, 8, game.input, { align: 'right', color: UI.dim });
    });
    STORY.talk.draw(r);
  }
});
const captainId = () => { const t = S.progress.tour; return t ? get('team', t.team).players[t.pick || 0] : 'volt'; };
function nextLine() {
  const b = STORY.beat; STORY.i++;
  if (STORY.i >= b.lines.length) {
    if (b.choices) { STORY.talk.say([fill(b.lines[b.lines.length - 1][1], tourVars())], { name: 'DEE DEE DECIBEL', portrait: npcRig('deedee'), choices: b.choices, onChoice: i => { if (STORY.o.onChoice && STORY.o.onChoice(i)) return; skipStory(); } }); STORY.i = 999; return; }
    return skipStory();
  }
  if (STORY.i >= b.lines.length) return;
  let [who, line] = b.lines[STORY.i]; if (who === '{CAPTAIN}') who = captainId();
  if (b.choices && STORY.i === b.lines.length - 1) { STORY.i++; return nextLine(); }
  const rig = npcRig(who), prof = voiceOf(who), name = (get('npc', who) || get('player', who) || { name: who }).name;
  STORY.cur = who; STORY.talk.voice = ch => Voice.letter(ch, prof);
  STORY.talk.say([fill(line, tourVars())], { name, portrait: rig, onDone: () => nextLine() });
}

/* ---- credits: a scroll over confetti, then the unlock cards ---- */
const CR = { t: 0, then: null };
SCENES.credits = menuScene({
  enter(d) { S.scene = 'credits'; CR.t = 0; CR.then = d && d.then; music('credits'); sting('unlock'); },
  update(dt) { CR.t += dt; if (S.fxRng() < .5) P.add({ kind: 'bit', x: S.fxRng() * game.W, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1 }); if ((CR.t > 26 || (CR.t > 2 && game.players.some(I => I.pressed('confirm') || I.pressed('start')))) && CR.then) { const f = CR.then; CR.then = null; f(); } },
  draw(r) {
    menuBackdrop(r, CR.t);
    r.overlay(g => {
      for (let k = 0; k < 60; k++) { const x = (k * 53 + CR.t * 30 * (k % 3 + 1)) % r.W, y = (k * 37 + CR.t * 40 * (k % 4 + 1)) % r.H; px.rect(g, Math.round(x), Math.round(y), 2, 3, ['#ff3ca6', '#ffd23a', '#2de2ff', '#5aff8a'][k % 4]); }
      let y = r.H - CR.t * 22;
      for (const [a, b] of CREDITS) { txt(g, a, r.W / 2, Math.round(y), UI.gold, 2, 'center'); E.font.wrap(b, r.W - 60, {}).forEach((ln, i) => txt(g, ln, r.W / 2, Math.round(y + 18 + i * 10), '#ffffff', 1, 'center')); y += 50; }
      ['UNLOCKED: THE BLAMBOTS', 'UNLOCKED: CHANNEL BLAM ALL-STARS', 'UNLOCKED: BIG HEADS (OPTIONS)', 'SECRETS ON THE ABOUT SCREEN'].forEach((u, i) => { if (CR.t > 14 + i * 2) txt(g, u, r.W / 2, r.H * .3 + i * 14, UI.good, 1, 'center'); });
      promptBar(g, r, '{confirm} CONTINUE');
    });
  }
});

/* ---- BLAM CAMP ---- */
def('team', 'interns', { name: 'GLOBO-BLAM INTERNS', short: 'INTERNS', jersey: '#8a8a94', trim: '#c8c8d0', shorts: '#4a4a54', sneaker: '#f4f4f4', sock: '#c8c8d0', court: 'skybox', players: ['intern1', 'intern2', 'intern3'], style: 'Practice partners', hidden: true, locked: true });
PL('intern1', 'INTERN 1', 'interns', 1, 'PRACTICE PARTNER', [5, 6, 5, 5, 7, 4, 4, 4], { build: 'chibi', size: 1.6, hair: 'short', hairColor: '#5a3a1a', skin: '#e0b090' }, { pitch: 180, wave: 'triangle', rate: 12 }, 'flex', ['Nice!', 'Got it!']);
PL('intern2', 'INTERN 2', 'interns', 2, 'PRACTICE PARTNER', [4, 4, 3, 3, 4, 4, 4, 3], { build: 'chibi', size: 1.6, hair: 'ponytail', hairColor: '#1a1a1a', skin: '#8a5a3c' }, { pitch: 210, wave: 'triangle', rate: 12 }, 'flex', ['Eep!', 'Ow.']);
PL('intern3', 'INTERN 3', 'interns', 3, 'PRACTICE PARTNER', [4, 4, 3, 3, 4, 4, 4, 3], { build: 'chibi', size: 1.6, hair: 'spiky', hairColor: '#e0b040', skin: '#f0c8a0' }, { pitch: 200, wave: 'triangle', rate: 12 }, 'flex', ['Hey!', 'Aw.']);
const me = ev => ev.slot === 0;
const LESSONS = [
  { id: 'move', title: 'MOVE AND TURBO', steps: [
    { text: '{move} RUN THROUGH THE THREE GOLD CONES', goal: 3, cones: [[XM - 100, YM - 60], [XM + 60, YM + 70], [XM + 180, YM - 40]] },
    { text: 'HOLD {turbo} AND CROSS THE WHOLE COURT IN UNDER 4 SECONDS', goal: 1, race: true }] },
  { id: 'pass', title: 'PASS', steps: [
    { text: '{pass} PASS TO YOUR TEAMMATE (TWICE)', goal: 2, ev: e => e.type === 'pass' && me(e) },
    { text: 'TEAMMATE HAS IT: {pass} CALLS FOR IT. GET IT BACK', goal: 1, ev: e => e.type === 'catch' && me(e) && S.ball.passer === 1 }] },
  { id: 'jumper', title: 'JUMP SHOT', steps: [
    { text: 'HOLD {shoot}, RELEASE AT THE TOP. MAKE TWO JUMPERS', goal: 2, ev: e => e.type === 'basket' && me(e) && !e.dunk && !e.layup },
    { text: 'NOW A PERFECT ONE: LET GO RIGHT AT THE TOP', goal: 1, ev: e => e.type === 'basket' && me(e) && e.perfect }] },
  { id: 'three', title: 'THREE-POINTER', steps: [{ text: 'STEP BEYOND THE ARC. {shoot} MAKE A THREE', goal: 1, ev: e => e.type === 'basket' && me(e) && e.three }] },
  { id: 'dunk', title: 'DUNK', steps: [{ text: 'HOLD {turbo}, DRIVE, PRESS {shoot} INSIDE THE RING: TWO DUNKS', goal: 2, ev: e => e.type === 'basket' && me(e) && e.dunk }] },
  { id: 'oop', title: 'ALLEY-OOP', steps: [
    { text: 'YOUR TEAMMATE CUTS. {oop} LOB THE ALLEY-OOP', goal: 1, ev: e => e.type === 'basket' && e.alleyoop && e.slot === 1 },
    { text: 'NOW YOU CUT: RUN AT THE RIM AND PRESS {oop} TO CALL FOR IT', goal: 1, ev: e => e.type === 'basket' && e.alleyoop && me(e), mateBall: true }] },
  { id: 'steal', title: 'STEAL AND SPIN', steps: [
    { text: '{pass} SWIPE THE BALL FROM AN INTERN (FROM THE SIDE WORKS BEST)', goal: 1, ev: e => e.type === 'steal' && me(e), foeBall: true },
    { text: 'WITH THE BALL, {shove} SPIN PAST AN INTERN', goal: 1, ev: e => (e.type === 'ankles' || e.type === 'spin') && me(e) }] },
  { id: 'block', title: 'BLOCK AND SHOVE', steps: [
    { text: '{shoot} JUMP AND BLOCK AN INTERN\'S SHOT', goal: 1, ev: e => e.type === 'block' && me(e), foeBall: true, foeShoot: true },
    { text: '{shove} SHOVE AN INTERN. IT\'S LEGAL!', goal: 1, ev: e => e.type === 'shove' && me(e), foeBall: true }] },
  { id: 'rebound', title: 'REBOUND', steps: [
    { text: 'THE INTERNS ARE BRICKING. {shoot} JUMP FOR THE REBOUND', goal: 1, ev: e => e.type === 'rebound' && me(e), foeBall: true, foeShoot: true, foeMiss: true },
    { text: 'OFFENSIVE BOARD + {turbo}: A PUTBACK SLAM (OR ANY BASKET OFF A REBOUND)', goal: 1, ev: e => e.type === 'basket' && me(e) && (e.putback || S.campReb), mateMiss: true }] },
  { id: 'nova', title: 'SUPERNOVA AND THE RULES', steps: [
    { text: 'SCORE THREE IN A ROW: GO SUPERNOVA!', goal: 1, ev: e => e.type === 'supernovaOn' && me(e), passive: true },
    { text: 'NO FOULS. GOALTENDING COUNTS. 20-SECOND SHOT CLOCK. DUNKS NEED TURBO. {confirm} YOU\'RE READY!', goal: 1, card: true }] }
];
const CAMP = { lesson: 0, step: 0, n: 0, nice: 0, done: false, raceT: -1, cones: [] };
const CL = { list: null };
SCENES.camplist = menuScene({
  enter() { S.scene = 'camplist'; idleReset(); music('camp'); const done = S.progress.camp; CL.list = new FocusList(LESSONS.map((l, k) => ({ label: (k + 1) + '. ' + l.title, value: () => done.includes(l.id) ? '•' : '', onPick: () => startLesson(k) })).concat([{ label: S.campFromTour ? 'ON TO THE TOUR' : 'BACK', onPick: () => campExit() }]), { onBack: () => campExit() }); },
  onBack() { campExit(); },
  update(dt) { CL.list.update(dt); },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), w = Math.min(260, sf.w * .6), h = Math.max(12, Math.floor((sf.h - 40) / 11) - 2);
      txt(g, 'BLAM CAMP', sf.x, sf.y, UI.gold, 2);
      CL.list.draw(g, sf.x, sf.y + 22, w, h, { gap: 2, scale: 1 });
      if (sf.w - w > 120) { npcRig('deedee').drawPortrait(g, sf.x + w + 30, sf.y + 30, 64); E.font.wrap("I'M DEE DEE. TEN LESSONS, NO HOMEWORK. PICK ONE, OR START AT THE TOP!", sf.w - w - 40, {}).forEach((ln, i) => txt(g, ln, sf.x + w + 20, sf.y + 104 + i * 10, '#ffffff', 1)); }
      promptBar(g, r, '{move} CHOOSE   {confirm} START   {cancel} BACK');
    });
  }
});
function campExit() { if (S.campFromTour) { S.campFromTour = false; go('tourmap'); } else go('menu'); }
function campCfg() {
  const team = S.progress.tour ? S.progress.tour.team : 'hightops', tm = get('team', team);
  return { court: tm.court, mode: 'camp', teams: [{ id: team, lineup: [tm.players[0], 'intern1'], starters: [tm.players[0], 'intern1'] }, { id: 'interns', lineup: ['intern2', 'intern3'], starters: ['intern2', 'intern3'] }],
    humans: [{ input: game.input, slot: 0 }], quarter: 300, difficulty: 'rookie', powerups: false, twists: false, cheats: { freezeClock: true, freezeShot: true },
    onEnter: () => lessonStep(), onStep: campStep, overlay: campOverlay, onEnd: () => {} };
}
function startLesson(k) { CAMP.lesson = k; CAMP.step = 0; CAMP.n = 0; CAMP.done = false; go('match', campCfg()); }
function lessonStep(keep) {
  const L0 = LESSONS[CAMP.lesson], st = L0.steps[Math.min(CAMP.step, L0.steps.length - 1)], m = S.match; if (!keep) { CAMP.n = 0; S.campReb = false; } CAMP.raceT = -1;
  S.cheats = Object.assign({}, m.cfg.cheats, st.passive ? { cpuPassive: true } : {}, st.foeMiss ? { missTeam: 1 } : {}, st.mateMiss ? { missTeam: 0 } : {});
  CAMP.cones = st.cones ? st.cones.map(c => ({ x: c[0], y: c[1], hit: false })) : [];
  m.phase = 'live'; m.clock = 300; m.shotClock = 20;
  const me0 = S.players[0], mate0 = S.players[1], f = S.players.slice(2);
  Object.assign(me0, { x: XM - 60, y: YM, z: 0, vx: 0, vy: 0, state: 'run' }); Object.assign(mate0, { x: XM + 80, y: YM + 60, z: 0, vx: 0, vy: 0, state: 'run' });
  f.forEach((p, k) => Object.assign(p, { x: XM + 140, y: YM + (k ? 50 : -50), z: 0, vx: 0, vy: 0, state: 'run' }));
  if (st.foeBall) giveBall(f[0], 'give'); else if (st.mateBall || CAMP.lesson === 1 && CAMP.step === 1) giveBall(mate0, 'give'); else if (!st.cones && !st.race) giveBall(me0, 'give');
  if (st.race) { me0.x = X0 + 40; }
  if (st.foeShoot) f[0].order = { kind: 'shoot', t: 2 };
  // the interns stay out of the way in the first lessons
  S.cheats.cpuPassive = S.cheats.cpuPassive || CAMP.lesson <= 5 || st.passive;
  if (!keep) Caption.show('deedee', st.text.replace(/\{[a-z]+\}/g, '').replace(/\s+/g, ' ').trim(), { big: true });
  emit('lessonStep', { lesson: L0.id, step: CAMP.step });
}
on('*', ev => {
  if (S.mode !== 'camp' || !S.match || CAMP.done) return;
  const st = LESSONS[CAMP.lesson].steps[CAMP.step];
  if (ev.type === 'rebound' && ev.slot === 0) S.campReb = true;
  if (st.ev && st.ev(ev)) campProgress();
  if (st.foeShoot && (ev.type === 'basket' || ev.type === 'rebound' || ev.type === 'steal') && ev.slot !== 0) game.after(.8, () => { if (S.mode === 'camp' && LESSONS[CAMP.lesson].steps[CAMP.step] === st) lessonStep(); });
  if (ev.type === 'basket' && S.mode === 'camp' && !st.ev) return;
});
function campProgress() {
  const L0 = LESSONS[CAMP.lesson], st = L0.steps[CAMP.step];
  CAMP.n++; CAMP.nice = 1.2; A.sfx('code_ok');
  if (CAMP.n < st.goal) return;
  CAMP.step++;
  if (CAMP.step >= L0.steps.length) {
    CAMP.done = true; if (!S.progress.camp.includes(L0.id)) S.progress.camp.push(L0.id); saveProgress(); sting('unlock'); emit('lessonDone', { lesson: L0.id });
    Caption.show('deedee', CAMP.lesson === LESSONS.length - 1 ? "YOU'RE READY! GO GET 'EM!" : 'LESSON COMPLETE! ON TO THE NEXT ONE!', { big: true });
    game.after(2.2, () => { if (S.mode !== 'camp') return; if (CAMP.lesson < LESSONS.length - 1) startLesson(CAMP.lesson + 1); else go('camplist'); });
  } else game.after(.9, () => { if (S.mode === 'camp' && !CAMP.done) lessonStep(); });
}
function campStep(dt) {
  const st = LESSONS[CAMP.lesson].steps[CAMP.step], p = S.players[0]; CAMP.nice = Math.max(0, CAMP.nice - dt);
  if (!st || CAMP.done) return;
  for (const c of CAMP.cones) if (!c.hit && Math.hypot(p.x - c.x, p.y - c.y) < 14) { c.hit = true; campProgress(); }
  if (st.race) { if (p.x < X0 + 80) CAMP.raceT = 0; else if (CAMP.raceT >= 0) { CAMP.raceT += dt; if (p.x > X1 - 80) { if (CAMP.raceT < 4) campProgress(); CAMP.raceT = -1; } } }
  if (st.card && game.input.pressed('confirm')) campProgress();
  if (st.foeShoot) { const f = S.players[2]; if (hasBall(f) && !f.order) f.order = { kind: 'shoot', t: 1 }; }
  if (st.mateMiss || st.foeMiss) { /* the shooting team always misses: rebounds galore */ }
  if (!owner() && S.ball.state === 'loose' && S.ball.z <= BALL_R + .5 && Math.hypot(S.ball.vx, S.ball.vy) < 5 && !st.foeShoot) { /* a dead ball rolls back to you */ giveBall(st.foeBall ? S.players[2] : p, 'give'); }
}
function campOverlay(g, r) {
  const L0 = LESSONS[CAMP.lesson], st = L0.steps[CAMP.step] || L0.steps[L0.steps.length - 1];
  const w = Math.min(r.W - 20, 420), x = Math.round(r.W / 2 - w / 2), y = 42;
  E.ui.box(g, x, y, w, 30, { bg: ['#2a1a48', '#140c24'], border: UI.gold, alpha: .92 });
  txt(g, 'LESSON ' + (CAMP.lesson + 1) + '/10: ' + L0.title + (st.goal > 1 ? '   ' + CAMP.n + '/' + st.goal : ''), x + 6, y + 3, UI.gold, 1);
  promptLine(g, st.text, x + 6, y + 16, game.input, {});
  if (CAMP.nice > 0) E.font.title(g, CAMP.done ? 'LESSON COMPLETE!' : 'NICE!', r.W / 2, r.H * .32, { scale: 3, colors: ['#ffffff', '#5aff8a', '#1a8a3a'], depth: 2, align: 'center' });
  for (const c of CAMP.cones) if (!c.hit) { const [sx, sy] = r.w(c.x, c.y, 0); px.poly(g, [[sx, sy - 12], [sx - 5, sy], [sx + 5, sy]], UI.gold); }
  if (st.race && CAMP.raceT >= 0) txt(g, CAMP.raceT.toFixed(1) + 's', r.W / 2, 76, CAMP.raceT < 4 ? '#ffffff' : UI.bad, 2, 'center');
}
