/* SPRING TRAINING: eight lessons taught by Grandpa Ike, each a real match set up as a drill, with goals counted from the
 * bus, prompts in the player's own glyphs, slow pitches where they help, and LESSON PASSED! Then the House Rules card. */
const P1 = () => game.input;
const ikePitches = m => { m.teams[1].pitcher = TEAMS.COM.roster[8]; m.teams[1].stamina[m.teams[1].pitcher.id] = 100; };
const LESSONS = [
  { id: 'bp', name: 'BATTING PRACTICE', intro: ['Aim the sweet spot where the pitch will cross, and swing as it gets there.', 'Contact swing: the big ring. Three fair balls and we\'re done.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { allStrikes: true, noCpuSuper: true }, tune: { pitchSpeed: .7 }, setup: ikePitches }), slow: true, bigSpot: true,
    goals: [['fair', 'FAIR BALLS', 3]] },
  { id: 'power', name: 'POWER AND BUNTS', intro: ['Power swing: the small red ring. Hit it square and it flies.', 'Then square around and bunt: hold the bunt button and let the ball hit the bat.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { allStrikes: true, noCpuSuper: true }, tune: { pitchSpeed: .75, exitVelocity: 1.3 }, setup: ikePitches }), slow: true,
    goals: [['powerHit', 'POWER-SWING EXTRA-BASE HIT OR HOMER', 1], ['bunt', 'FAIR BUNT', 1]] },
  { id: 'zone', name: 'READING THE ZONE', intro: ['A good eye wins at-bats. Take the balls, hit the strikes.', 'Watch the zone grid. Curves fall, sliders slide.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { noCpuSuper: true }, tune: { pitchSpeed: .85 } }),
    goals: [['takeBall', 'BALLS TAKEN', 2], ['hitStrike', 'STRIKES HIT FAIR', 2]] },
  { id: 'mound', name: 'ON THE MOUND', intro: ['Your turn to pitch. Pick a pitch with its button, aim during the windup...', '...and press again when the ring meets the target. Steer it early with the stick.'],
    cfg: () => ({ away: 'HCK', home: 'COM', park: 'kernel', ctrl: [[null, null], [P1(), null]], cheats: { noCpuSuper: true, cpuNoSwing: true } }),
    goals: [['strikeTypes', 'STRIKES WITH 3 DIFFERENT PITCHES', 3], ['perfect', 'PERFECT RELEASE', 1], ['after', 'AFTERTOUCH', 1]] },
  { id: 'field', name: 'LEATHER AND LASERS', intro: ['Fielding! The chaser runs to the ball by himself. You pick the throw.', 'Each base has its button: circle first, triangle second, square third, cross home. Or click the base.'],
    cfg: () => ({ away: 'HCK', home: 'COM', park: 'kernel', ctrl: [[null, null], [P1(), null]], cheats: { noCpuSuper: true, allStrikes: true }, tune: { cpuBat: 1.3 } }),
    goals: [['flyCatch', 'FLY BALLS CAUGHT', 2], ['throwOut', 'OUTS ON YOUR THROWS', 2]] },
  { id: 'wheels', name: 'WHEELS', intro: ['On the bases! Hold L1 and press a base button before the pitch to steal.', 'Turbo with L2. Runners go all on R1, back on L1.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { noCpuSuper: true, cpuNoSwing: false } }),
    goals: [['steal', 'STOLEN BASE', 1], ['turbo', 'TURBO USED', 1], ['score', 'RUN SCORED', 1]] },
  { id: 'batzooka', name: 'BATZOOKA!', intro: ['Your grandma\'s bat. The meter is full: arm it with R1, then swing.', 'Big ring, big loft, big boom. Miss it and it fizzles.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { infMeter: true, allStrikes: true, noCpuSuper: true }, tune: { pitchSpeed: .8 } }), slow: true,
    goals: [['bzHomer', 'BATZOOKA HOME RUN', 1]] },
  { id: 'rhubarb', name: 'RHUBARB 101', intro: ['Sometimes the benches empty. It\'s all slapstick, but you might as well win it.', 'Punch, shove and toss. Practice on the grounds crew.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { noCpuSuper: true } }),
    goals: [['punch', 'PUNCHES LANDED', 5], ['shove', 'SHOVES', 1], ['toss', 'TOSSES', 1]], rhubarbLen: 30 }
];
function lessonEnter(L) {
  M.lesson = { def: L, goals: L.goals.map(([id, label, need]) => ({ id, label, need, n: 0 })), slow: L.slow, bigSpot: L.bigSpot, passed: false, intro: 0, types: new Set(), rhubarbLen: L.rhubarbLen, noHazard: true };
  M.innings = 99; M.mercy = false; M.shows = false; M.phase = 'halfStart'; M.phaseT = 0; setFielders();
  M.lesson.introOpen = true; babble.say(L.intro.join(' '), 'ike');
  if (L.id === 'wheels') { const r = addRunner(offense().lineup[8], 1); r.p = TEAMS.COM.roster[0]; }
}
function lessonGoal(id, k = 1) { if (!M || !M.lesson || M.lesson.passed) return; const g = M.lesson.goals.find(g => g.id === id); if (!g || g.n >= g.need) return; g.n = Math.min(g.need, g.n + k); sfx('coin'); if (M.lesson.goals.every(g => g.n >= g.need)) lessonPassed(); }
function lessonPassed() {
  const L = M.lesson; L.passed = true; L.doneT = 0; stamp('LESSON PASSED!', GREEN, { scale: 3, life: 3 }); sting('victory');
  if (!SAVE.training.done.includes(L.def.id)) SAVE.training.done.push(L.def.id); autosave(); emit('lesson', { id: L.def.id, passed: true });
}
function lessonTick(dt) {
  const L = M.lesson;
  if (L.passed) { L.doneT += dt; if (L.doneT > 3) { M.lesson = null; game.go('lessons', { justPassed: L.def.id }); } return; }
  if (M.outs >= 2) M.outs = 0;
  if (M.phase === 'halfEnd' || M.half !== 0) { M.half = 0; M.outs = 0; M.inning = 1; setPhase('walkUp'); M.cam = 'plate'; setFielders(); }
  if (L.def.id === 'rhubarb' && M.phase === 'walkUp' && !M.rhubarb && !L.brawled) { L.brawled = true; startRhubarb(null, batterNow()); }
  if (L.def.id === 'rhubarb' && L.brawled && M.phase !== 'rhubarb' && !L.passed) { L.brawled = false; }
  if (L.def.id === 'wheels' && M.phase === 'walkUp' && !M.runners.length) addRunner(offense().lineup[0], 1);
  // Ike's fungo drill: every other ball is a lofted fly to the outfield
  if (L.def.id === 'field' && M.phase === 'select' && !L.fed) { L.fed = true; const fly = L.goals[0].n < L.goals[0].need && M.pitchCount % 2 === 0; M.force = Object.assign(M.force || {}, { contact: 'perfect', fungo: fly }); }
  if (M.phase !== 'select') L.fed = false;
  if (L.def.id === 'wheels') { const I = P1(); if (I.down('l2') && M.phase === 'inPlay') lessonGoal('turbo'); }
  for (const t of M.teams) t.runs = Math.min(t.runs, 9);
}
BZ.bus.on('playOver', d => { if (!M || !M.lesson) return; const P_ = M.lastPlay; if (!P_ || P_.steal) return; lessonGoal('fair'); if (P_.kind === 'bunt') lessonGoal('bunt'); if ((P_.hit >= 2 || P_.hr) && M.lastContact && M.lastContact.swing === 'power') lessonGoal('powerHit'); if (P_.inZone) lessonGoal('hitStrike'); });
BZ.bus.on('contact', () => { if (M && M.lesson && M.pitch) { const cr = pitchPos(M.pitch, 1); if (inZone(cr.x, cr.z, batterNow()) && M.play) M.play.inZone = true; } });
BZ.bus.on('call', d => { if (!M || !M.lesson) return; if (d.kind === 'ball' && !M.swing) lessonGoal('takeBall'); if (d.kind === 'strike' && M.lesson.def.id === 'mound') { if (!M.lesson.types.has(M.pitchType)) { M.lesson.types.add(M.pitchType); lessonGoal('strikeTypes'); } } });
BZ.bus.on('release', d => { if (!M || !M.lesson || d.cpu) return; if (d.q >= .95) lessonGoal('perfect'); });
BZ.bus.on('pitchCross', () => { if (M && M.lesson && M.pitch && M.pitch.after > .08 && !M.pitch.cpu) lessonGoal('after'); });
BZ.bus.on('catch', d => { if (M && M.lesson && d.fly) lessonGoal('flyCatch'); });
BZ.bus.on('received', () => { if (M && M.lesson) M.lesson.lastRecv = M.t; });
BZ.bus.on('forceOut', () => { if (M && M.lesson && M.lesson.lastRecv && M.t - M.lesson.lastRecv < .2) lessonGoal('throwOut'); });
BZ.bus.on('tagOut', () => { if (M && M.lesson && M.lesson.def.id === 'field') lessonGoal('throwOut'); });
BZ.bus.on('safeSteal', () => lessonGoal('steal'));
BZ.bus.on('run', d => { if (M && M.lesson && d.team === 0) lessonGoal('score'); });
BZ.bus.on('homer', d => { if (M && M.lesson && d.batzooka) lessonGoal('bzHomer'); if (M && M.lesson && M.lastContact && M.lastContact.swing === 'power') lessonGoal('powerHit'); });
BZ.bus.on('brawlHit', d => { if (!M || !M.lesson || !d.human) return; lessonGoal(d.kind === 'punch' ? 'punch' : d.kind); });
function lessonDraw(r) {
  r.overlay(g => {
    const L = M.lesson, W = r.W, x = W - SAFE - 150 - cornerW(), y = SAFE + 62;
    if (L.introOpen) { const H = r.H; panel(g, W / 2 - 160, H / 2 - 50, 320, 96, { border: '#4fe0b0' }); try { portraitOf('ike').drawPortrait(g, W / 2 - 152, H / 2 - 42, 36, { bg: '#1e2a5a' }); } catch (e) { /* first frame */ } text(g, 'GRANDPA IKE: ' + L.def.name, W / 2 - 110, H / 2 - 42, '#ffd36a'); L.def.intro.forEach((l, i) => para(g, l, W / 2 - 110, H / 2 - 28 + i * 24, 262)); promptRow(g, game.input, [['confirm', 'LET\'S GO']], W / 2, H / 2 + 30, 'center'); }
    panel(g, x, y, 150, 14 + L.goals.length * 12, { border: '#4fe0b0' });
    text(g, L.def.name, x + 6, y + 3, '#4fe0b0');
    L.goals.forEach((gl, i) => text(g, (gl.n >= gl.need ? '✓ ' : '') + gl.n + ' / ' + gl.need + '  ' + gl.label, x + 6, y + 14 + i * 12, gl.n >= gl.need ? '#4fe0b0' : '#ffffff'));
  });
}
const LS = { menu: null };
SCENES.lessons = {
  input: KEYS, camera: { zoom: false },
  enter(d) {
    IDLE.t = 0; music('training'); MENUBG.park = 'kernel'; LS.fromTour = (d && d.fromTour) || LS.fromTour;
    const items = LESSONS.map((L, i) => ({ label: (SAVE.training.done.includes(L.id) ? '✓ ' : '') + (i + 1) + '. ' + L.name, act: () => game.go('match', Object.assign(L.cfg(), { mode: 'training', innings: 99, lesson: L, onEnd: () => game.go('lessons') })) }));
    items.push({ label: 'HOUSE RULES', act: () => { PLAYBOOK.open = true; PLAYBOOK.page = PB_PAGES.length - 1; } });
    items.push({ label: LS.fromTour ? 'ON TO THE TOUR MAP' : 'BACK', act: () => { if (LS.fromTour) { LS.fromTour = false; autosave(); game.go('tourMap'); } else game.go('title'); } });
    LS.menu = new BigMenu(items, { w: 170, h: 18, gap: 3, cols: 2, textAlign: 'left', onBack: () => { if (LS.fromTour) { LS.fromTour = false; game.go('tourMap'); } else game.go('title'); } });
    if (d && d.justPassed) { const i = LESSONS.findIndex(L => L.id === d.justPassed); LS.menu.i = Math.min(i + 1, items.length - 1); }
  },
  update(dt) { commonTick(dt); if (PLAYBOOK.open) return playbookUpdate(dt); if (idleTick(dt)) return game.go('attract'); LS.menu.update(game.input, dt); },
  draw(r) {
    menuBackdrop(r, .55);
    r.overlay(g => { title(g, 'SPRING TRAINING', r.W / 2, 10, 3); text(g, 'with Grandpa Ike', r.W / 2, 36, '#c8c8d8', { align: 'center' }); LS.menu.draw(g, r.W / 2, 54); legend(g, r.W, r.H, [['confirm', 'START'], ['cancel', 'BACK']]); });
    if (PLAYBOOK.open) playbookDraw(r);
  }
};
