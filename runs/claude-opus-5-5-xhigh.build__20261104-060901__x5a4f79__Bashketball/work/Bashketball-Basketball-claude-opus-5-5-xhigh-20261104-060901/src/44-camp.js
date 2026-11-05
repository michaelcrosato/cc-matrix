/* 44-camp: Blam Camp (PLAN 10.9), ten lessons on the court. DEE DEE coaches through captions and her voice; INTERN 1
 * is your teammate, INTERNS 2 and 3 the practice opponents (scripted or passive). Each lesson is a few steps: an
 * instruction card with the player's own glyphs, a goal counter, "NICE!" on each success, then the next. Lessons are
 * picked from a list, can be skipped (the pause menu), and their completion is saved. */
const sp = (x, y) => [OX + x, OY + y];
function campPlace(slot, x, y, ball) { const p = S.players[slot]; const [wx, wy] = sp(x, y); p.x = wx; p.y = wy; p.vx = p.vy = 0; p.z = 0; p.setState('run'); p.jump = null; p.dunk = null; if (ball) giveBall(p, 'camp'); return p; }
const me = () => S.players[0], mate = () => S.players[1];
const CAMP_LESSONS = [
  { id: 'move', name: 'MOVE & TURBO', steps: [
    { text: 'Run through the three cones with {move}', say: 'WELCOME TO BLAM CAMP! RUN THROUGH THE CONES. FEEL THE SNEAKERS.', goal: 3, setup(L) { campPlace(0, 120, 144); L.cones = [sp(220, 80), sp(320, 200), sp(440, 110)].map(([x, y]) => ({ x, y, hit: false })); },
      tick(L) { for (const c of L.cones) if (!c.hit && dist2(me().x, me().y, c.x, c.y) < 16) { c.hit = true; L.count++; sfx('code_ok'); } } },
    { text: 'Hold {turbo} and cross the court in under 4 seconds', say: 'NOW HOLD TURBO AND GO! UNDER FOUR SECONDS!', goal: 1, setup(L) { campPlace(0, 30, 144); L.cones = []; L.runT = null; },
      tick(L, dt) { const lx = me().x - OX; if (lx > 70 && L.runT === null) L.runT = 0; if (L.runT !== null) L.runT += dt; if (lx > CW - 60 && L.runT !== null) { if (L.runT < 4) L.count++; else { L.runT = null; campPlace(0, 30, 144); caption('deedee', 'TOO SLOW! HOLD TURBO THE WHOLE WAY. AGAIN!'); } } } }
  ] },
  { id: 'pass', name: 'PASS', steps: [
    { text: 'Press {pass} to pass to your teammate', say: 'PASSING! PRESS PASS AND INTERN ONE CATCHES IT. TWICE, PLEASE.', goal: 2, setup(L) { campPlace(0, 200, 120, true); campPlace(1, 330, 190); }, on: { catch(L, e) { if (e.slot === 1) { L.count++; game.after(.8, () => { if (mate().has) passBall(mate(), me(), 'chest'); }); } } } },
    { text: 'When your teammate has it, press {pass} to call for it', say: 'NOW CALL FOR IT! PRESS PASS WHEN INTERN ONE HAS THE BALL.', goal: 1, setup(L) { campPlace(0, 200, 120); campPlace(1, 330, 190, true); }, on: { catch(L, e) { if (e.slot === 0 && e.from === 1) L.count++; } } }
  ] },
  { id: 'jumper', name: 'JUMP SHOT', steps: [
    { text: 'Hold {shoot} to jump, let go at the top. Make 2 (one PERFECT)', say: 'JUMP SHOTS! HOLD SHOOT, LET GO AT THE TOP OF THE JUMP. THE METER SHOWS YOU WHEN.', goal: 2, spot: [470, 110], setup(L) { campPlace(0, 470, 110, true); L.perfect = 0; L.bonus = .25; },
      on: { release(L, e) { if (e.slot === 0) L.lastPerfect = e.perfect; }, basket(L, e) { if (e.slot === 0 && !e.dunk && !e.three) { if (L.lastPerfect) L.perfect++; if (L.count === 1 && !L.perfect && !L.lastPerfect) { caption('deedee', 'GOOD! NOW ONE PERFECT: LET GO RIGHT AT THE TOP!'); } else L.count++; } } }, reset: true }
  ] },
  { id: 'three', name: 'THREE', steps: [
    { text: 'Make a three from beyond the arc', say: 'THE ARC IS THE LINE OF HONOR. SHOOT FROM BEHIND IT FOR THREE!', goal: 1, setup(L) { campPlace(0, 430, 230, true); L.bonus = .3; }, on: { basket(L, e) { if (e.slot === 0 && e.three) L.count++; } }, reset: true }
  ] },
  { id: 'dunk', name: 'DUNK', steps: [
    { text: 'Hold {turbo}, drive, press {shoot} inside the ring', say: 'DUNKS NEED TURBO! HOLD IT, GET INSIDE THE RING, AND PRESS SHOOT!', goal: 2, ring: true, setup(L) { campPlace(0, 380, 150, true); me().turbo = 1; }, on: { basket(L, e) { if (e.slot === 0 && e.dunk) L.count++; } }, reset: true }
  ] },
  { id: 'oop', name: 'ALLEY-OOP', steps: [
    { text: 'Press {oop} to lob to your cutting teammate', say: 'INTERN ONE WILL CUT TO THE RIM. WHEN IT GLOWS, PRESS ALLEY-OOP!', goal: 1, setup(L) { campPlace(0, 380, 200, true); campPlace(1, 330, 80); mate().turbo = 1; }, on: { alleyoop(L, e) { if (e.slot === 1) L.count++; } }, reset: true,
      ai(L, p, c) { if (p === mate()) { goTo(p, c, OX + 520, OY + 120, false); c.turboD = p.x < OX + 500; return c; } } },
    { text: 'Cut to the rim and press {oop} to call for one', say: 'YOUR TURN TO FLY! CUT TO THE RIM, HOLD TURBO, PRESS ALLEY-OOP TO CALL FOR IT!', goal: 1, setup(L) { campPlace(0, 330, 80); campPlace(1, 380, 210, true); me().turbo = 1; }, on: { alleyoop(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p === mate()) { if (p.has && p.order && p.order.kind === 'oop' && oopReady(p, me())) c.oopP = true; return c; } } }
  ] },
  { id: 'steal', name: 'STEAL & SPIN', steps: [
    { text: 'Swipe with {pass} to strip the dribbler (try its dribble side)', say: 'DEFENSE! GET CLOSE AND SWIPE WITH PASS. FROM THE SIDE OR BEHIND WORKS BEST.', goal: 1, setup(L) { campPlace(2, 320, 150, true); campPlace(0, 290, 150); campPlace(1, 120, 260); }, on: { steal(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2) { const t = game.time; c.mx = Math.sin(t * .8) * .3; c.my = Math.cos(t * .6) * .3; return c; } if (p.slot === 3 || p.slot === 1) return c; } },
    { text: 'With the ball, press {shove} to SPIN past the intern', say: 'SPIN MOVE! WITH THE BALL, PRESS SHOVE AND YOU SPIN. BREAK SOME ANKLES!', goal: 1, setup(L) { campPlace(0, 300, 150, true); campPlace(2, 330, 150); me().turbo = 1; }, on: { anklesBroken(L, e) { if (e.slot === 0) L.count++; }, spin(L, e) { if (e.slot === 0 && dist2(me().x, me().y, S.players[2].x, S.players[2].y) < 30) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2) { goTo(p, c, me().x + 22, me().y, false); return c; } if (p.slot === 3 || p.slot === 1) return c; } }
  ] },
  { id: 'block', name: 'BLOCK & SHOVE', steps: [
    { text: 'Jump with {shoot} to block the intern\'s jumper', say: 'BLOCKS! WHEN THE INTERN JUMPS, JUMP WITH SHOOT. TIMING IS EVERYTHING.', goal: 1, setup(L) { campPlace(2, 420, 150, true); campPlace(0, 400, 150); L.shotT = 1.4; }, on: { block(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c, dt) { if (p.slot === 2) { if (p.has && p.state === 'run') { L.shotT -= dt; if (L.shotT <= 0) { L.shotT = 2.5; c.shootP = true; c.shootD = true; } } else if (p.state === 'gather' || (p.state === 'air' && p.jump && !p.jump.released)) c.shootD = p.st < .32; return c; } if (p.slot === 3 || p.slot === 1) return c; },
      tick(L) { if (S.ball.state === 'loose' || S.ball.state === 'dead' || (S.ball.state === 'held' && S.ball.owner !== S.players[2])) { if (S.ball.z < 6 && !L.resetting) { L.resetting = true; game.after(.8, () => { L.resetting = false; campPlace(2, 420, 150, true); campPlace(0, 400, 150); }); } } } },
    { text: 'Press {shove} to shove the intern (it\'s legal!)', say: 'AND NOW: THE SHOVE. NO FOULS IN BASHKETBALL. PRESS SHOVE NEXT TO THE INTERN!', goal: 1, setup(L) { campPlace(2, 360, 150, true); campPlace(0, 330, 150); me().turbo = 1; }, on: { shove(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2 || p.slot === 3 || p.slot === 1) return c; } }
  ] },
  { id: 'rebound', name: 'REBOUND', steps: [
    { text: 'Grab the intern\'s miss: jump with {shoot} or run to it', say: 'REBOUNDS! THE INTERN WILL MISS. TRUST ME. GO GET IT!', goal: 1, setup(L) { campPlace(2, 470, 200, true); campPlace(0, 540, 150); L.shotT = 1; S.cheats.shots = null; }, on: { rebound(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c, dt) { if (p.slot === 2) { if (p.has && p.state === 'run') { L.shotT -= dt; if (L.shotT <= 0) { L.shotT = 3; L.forceMiss = true; c.shootP = true; c.shootD = true; } } else if (p.state === 'gather' || p.state === 'air') c.shootD = p.st < .31; return c; } if (p.slot === 3 || p.slot === 1) return c; } },
    { text: 'Shoot, jump for your miss with {shoot}, then {shoot} again: PUTBACK!', say: 'NOW THE PUTBACK: CATCH IT IN THE AIR UNDER THE RIM AND PRESS SHOOT AGAIN!', goal: 1, setup(L) { campPlace(0, 530, 160, true); L.bonus = -1; }, on: { dunk(L, e) { if (e.slot === 0 && e.putback) L.count++; } }, reset: true }
  ] },
  { id: 'nova', name: 'SUPERNOVA & THE RULES', steps: [
    { text: 'Score three in a row to go SUPERNOVA!', say: 'LAST LESSON! SCORE THREE IN A ROW AND YOU GO SUPERNOVA. THE INTERNS ARE... RELAXED.', goal: 1, init() { me().heat = 0; }, setup(L) { campPlace(0, 400, 150, true); L.bonus = .3; }, on: { supernovaOn(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2 || p.slot === 3) { goTo(p, c, OX + 300 + p.slot * 10, OY + 40, false); return c; } } },
    { text: 'The rules: read the card, then {confirm}', say: 'YOU\'RE READY! REMEMBER THE RULES AND GO MAKE SOME NOISE!', goal: 1, card: true, setup(L) { L.cardT = 0; }, tick(L, dt) { L.cardT += dt; if (L.cardT > .6 && game.players.some(I => I.pressed('confirm'))) L.count++; } }
  ] }
];
const CAMP_RULES = ['NO FOULS: SHOVE, STEAL, BUMP. IT\'S ALL LEGAL.', 'GOALTENDING COUNTS FOR THE SHOOTER.', 'THE SHOT CLOCK IS 20 SECONDS.', 'DUNKS NEED TURBO.', 'NOBODY LEAVES THE COURT: THE WALLS KEEP IT IN.', 'THREE STRAIGHT = SUPERNOVA.'];
/* the lesson running in the match scene */
function startLesson(i, fromTour) {
  const L = CAMP_LESSONS[i], team = fromTour ? TOUR.team : (EXH.teams[0] && STREET_TEAMS.includes(EXH.teams[0]) ? EXH.teams[0] : 'hightops'), T = get('team', team);
  CAMPRUN.i = i; CAMPRUN.fromTour = fromTour; S.cheats = {};
  startMatchScene({ court: T.court, home: team, away: 'camp', lineups: [[T.players[0], 'intern1', T.players[1]], ['intern2', 'intern3', 'intern1']], humans: [[0, game.input]], quarterLen: 600, diff: [1, 0], powerups: false, twists: false, tipoff: false, mode: 'camp', seed: 3 + i },
    { fade: .2, noBreakCard: true, onEnd: () => {}, lesson: makeLessonRunner(L) });
}
const CAMPRUN = { i: 0, fromTour: false };
function makeLessonRunner(L) {
  const R = { L, step: 0, count: 0, niceT: 0, doneT: 0, t: 0, started: false, bonus: 0 };
  const offs = [];
  const st = () => L.steps[R.step];
  const begin = () => { const s = st(); if (!s) return; R.waiting = false; R.count = 0; R.bonus = 0; R.t = 0; R.niceT = 0; if (S.match) { S.match.practice = true; S.match.phase = 'live'; } for (const p of S.players) p.order = null; if (s.init) s.init(R); s.setup(R); R.bonus = R.bonus || 0; caption('deedee', s.say, 6); };
  R.update = dt => {
    const M = S.match; if (!M) return;
    if (!R.started) { R.started = true; M.practice = true; for (const [k, fn] of Object.entries(L.steps.reduce((a, s) => Object.assign(a, s.on || {}), {}))) offs.push(on(k, e => { const s = st(); if (s && s.on && s.on[k] && R.doneT <= 0) s.on[k](R, e); })); begin(); }
    M.phase = M.phase === 'dead' && R.doneT <= 0 ? 'dead' : M.phase; M.practice = true;
    if (L.steps[R.step] && L.steps[R.step].tick && R.doneT <= 0) L.steps[R.step].tick(R, dt);
    if (R.forceMiss && S.ball.state === 'shot' && S.ball.shot && S.ball.shot.shooter.slot === 2) { R.forceMiss = false; const sh = S.ball.shot; if (sh.made) { sh.made = false; const rim = RIMS[sh.rim]; const v = E.arc(S.ball, { x: rim.x - rim.side * 1, y: rim.y + 11, z: RIM_Z + 1 }, tune('ballGravity'), { apex: 20 }); S.ball.vx = v.vx; S.ball.vy = v.vy; S.ball.vz = v.vz; } }
    R.t += dt; R.niceT = Math.max(0, R.niceT - dt);
    // after a score or a dead ball, put the lesson back (no inbounds in camp)
    if (st() && st().reset && (M.phase === 'dead' || M.phase === 'inbound') && R.doneT <= 0) { if (!R.resetT) R.resetT = .9; R.resetT -= dt; if (R.resetT <= 0) { R.resetT = 0; M.phase = 'live'; st().setup(R); } }
    if (!R.waiting && R.count >= (st() ? st().goal : 1) && R.doneT <= 0) {
      R.niceT = 1.2; R.count = 0; R.waiting = true; sfx('code_ok'); banner('NICE!', 'JACKPOT', BANNER_COLORS.steal, { force: true });
      R.step++; if (R.step < L.steps.length) game.after(1.3, () => begin()); else { R.doneT = 2.4; if (!PROG.camp.includes(L.id)) { PROG.camp.push(L.id); saveProgress(); } caption('deedee', L.id === 'nova' ? 'YOU\'RE READY! GO GET \'EM!' : 'LESSON COMPLETE! ON TO THE NEXT!', 6); }
    }
    if (R.doneT > 0) { R.doneT -= dt; if (R.doneT <= 0) { offs.forEach(f => f()); finishLesson(); } }
  };
  R.ai = (p, c, dt, B) => { const s = st(); if (p.slot === 0) return null; if (s && s.ai) { const r = s.ai(R, p, c, dt, B); if (r) return r; } if (p.team === 1) { goTo(p, c, OX + 330 + (p.slot - 2) * 40, OY + 30, false); return c; } return null; };
  R.skip = () => { R.count = 99; };
  R.draw = (g, r) => {
    const s = st(), x = Math.round(r.W * .05), w = Math.round(r.W * .9);
    E.ui.box(g, x, 4, w, 34, { bg: ['#2a1650', '#140a28'], border: UIC.accent, alpha: .92 });
    E.font.text(g, 'BLAM CAMP • ' + (CAMPRUN.i + 1) + '. ' + L.name, x + 6, 7, UIC.accent, { outline: false });
    E.font.text(g, (s ? Math.min(R.count, s.goal) : 0) + ' / ' + (s ? s.goal : 1), x + w - 6, 7, UIC.gold, { align: 'right', outline: false });
    if (s) promptLine(g, s.text, x + w / 2, 21, { align: 'center' });
    if (s && s.card) { const cw = Math.min(r.W - 40, 300), cx = Math.round((r.W - cw) / 2); E.ui.box(g, cx, 46, cw, 100, { bg: ['#22163a', '#0e0820'], border: UIC.gold }); E.font.text(g, 'THE RULES', cx + cw / 2, 50, UIC.gold, { align: 'center', outline: false }); CAMP_RULES.forEach((l, i) => E.font.text(g, '• ' + l, cx + 8, 64 + i * 12, UIC.ink, { outline: false })); }
    if (!(ANN.cap && game.real < ANN.cap.until)) promptLine(g, '{pause} PAUSE: SKIP STEP, LESSON LIST', x + w / 2, r.H - 14, { align: 'center', color: UIC.muted });
  };
  R.world = r => {
    const s = st(); if (!s) return;
    for (const c of R.cones || []) r.queue(c.x, c.y, 0, g => { const [x, y] = r.w(c.x, c.y, 0); px.poly(g, [[x, y - 12], [x + 5, y], [x - 5, y]], c.hit ? '#5ae08a' : '#ff7a2a'); px.rect(g, x - 3, y - 7, 6, 2, '#ffffff'); });
    if (s.spot) { const [x, y] = sp(...s.spot); r.decal(() => r.groundRing(x, y, 14, UIC.gold, .8)); }
    if (s.ring) { const rim = attackRim(0), R2 = dunkRange(me()); r.decal(() => r.groundArc(rim.x, rim.y, R2 - 2, R2 + 1, PI / 2, PI * 1.5, '#5aff7a', .7)); }
    if (L.id === 'oop' && R.step === 0 && oopReady(me(), mate())) r.decal(() => r.groundRing(mate().x, mate().y, 12, '#5aff7a', .8));
  };
  return R;
}
function finishLesson() {
  const next = CAMPRUN.i + 1; S.lesson = null;
  if (next < CAMP_LESSONS.length && !CAMPRUN.single) startLesson(next, CAMPRUN.fromTour);
  else if (CAMPRUN.fromTour) gotoScreen('tourmap'); else gotoScreen('camp');
}
/* the lesson list */
S.menu.camp = { i: 0, rects: [] };
SC.camp = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('camp'); S.lesson = null; this.fromTour = !!(d && d.fromTour); if (this.fromTour) { CAMPRUN.single = false; startLesson(0, true); } },
  update(dt) {
    const nav = idleTick(dt, 'camp'); if (!nav) return; const st = S.menu.camp, items = CAMP_LESSONS.map(L => ({ label: L.name }));
    const r = listNav(st, items, nav); if (r.cancel) { gotoScreen('menu'); return; }
    if (r.picked >= 0) { consumeNav(); CAMPRUN.single = false; startLesson(r.picked, false); }
  },
  draw(r) {
    screenFrame(r, 'BLAM CAMP', ['{confirm} START LESSON', '{cancel} BACK']);
    r.overlay(g => {
      const st = S.menu.camp, x = Math.round(r.W * .06), w = Math.round(r.W * .5), h = 15, rows = CAMP_LESSONS.length;
      st.rects = CAMP_LESSONS.map((L, i) => drawButton(g, x, 30 + i * (h + 2), w, h, (i + 1) + '. ' + L.name + (PROG.camp.includes(L.id) ? '  ★' : ''), { focus: st.i === i, color: PROG.camp.includes(L.id) ? '#9affb0' : null }));
      const L = CAMP_LESSONS[st.i], px0 = x + w + 10, pw = Math.round(r.W * .94) - px0;
      E.ui.box(g, px0, 30, pw, rows * (h + 2) - 2, { bg: '#1e1434', border: UIC.line }); drawPortrait(g, 'deedee', px0 + pw / 2 - 18, 36, 36);
      L.steps.forEach((s, i) => wrapText(s.text.replace(/\{(\w+)\}/g, (m, a) => '[' + (CONTROL_NAMES[a] || a).toUpperCase() + ']'), pw - 12).slice(0, 2).forEach((l, k) => E.font.text(g, l, px0 + 6, 80 + i * 26 + k * 9, UIC.ink, { outline: false })));
    });
  }
};
