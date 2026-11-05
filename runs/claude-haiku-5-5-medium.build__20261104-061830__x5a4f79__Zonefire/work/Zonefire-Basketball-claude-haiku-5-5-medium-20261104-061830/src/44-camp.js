/* ---- BLAM CAMP (plan §10.9): ten lessons on the Skybox with DEE DEE coaching through captions and voice. The practice
 * partners (the interns) are passive; a lesson is complete when its goal is counted from the match's own events (so
 * a lesson can't be faked by a screen). Completion is saved; the lessons can be picked, and skipped. ---- */
const CAMP_LESSONS = [
  { id: 'move', name: 'MOVE & TURBO', text: 'RUN THROUGH THE CONES. HOLD {turbo} TO RUN FAST.', goal: 3, count: 'cones' },
  { id: 'pass', name: 'PASS', text: 'PASS TO YOUR TEAMMATE TWICE. THEN CALL FOR IT WITH {pass}.', goal: 2, count: 'pass' },
  { id: 'jump', name: 'JUMP SHOT', text: 'HOLD {shoot} TO JUMP. RELEASE AT THE TOP. MAKE TWO. ONE PERFECT.', goal: 2, count: 'jumpMake', perfect: true },
  { id: 'three', name: 'THREE', text: 'MAKE A THREE FROM BEYOND THE ARC.', goal: 1, count: 'three' },
  { id: 'dunk', name: 'DUNK', text: 'HOLD {turbo} AND PRESS {shoot} INSIDE THE DUNK RING. TWO DUNKS.', goal: 2, count: 'dunk' },
  { id: 'oop', name: 'ALLEY-OOP', text: 'PRESS {oop} TO LOB TO YOUR CUTTING TEAMMATE.', goal: 1, count: 'oop' },
  { id: 'steal', name: 'STEAL & SPIN', text: 'STRIP AN INTERN WITH {pass}. BEAT ONE WITH A SPIN: {shove}.', goal: 2, count: 'stealSpin' },
  { id: 'block', name: 'BLOCK & SHOVE', text: 'BLOCK AN INTERN\'S JUMPER WITH {shoot}. SHOVE ONE WITH {shove}.', goal: 2, count: 'blockShove' },
  { id: 'rebound', name: 'REBOUND', text: 'GRAB A MISS, THEN A PUTBACK DUNK.', goal: 2, count: 'rebound' },
  { id: 'nova', name: 'SUPERNOVA & THE RULES', text: 'SCORE THREE IN A ROW. THEN READ THE RULES CARD.', goal: 3, count: 'streak' }
];
const campDone = () => S.progress.camp || (S.progress.camp = []);
S.camp = null;

/** the camp's event counts: a lesson's goal is counted from the match's own events, by the player's slot */
const campCount = {};
const campCountReset = () => { for (const k of Object.keys(campCount)) delete campCount[k]; };
on('basket', ev => { if (!S.camp || ev.slot !== 0) return; if (ev.three) campCount.three = (campCount.three || 0) + 1; campCount.jumpMake = (campCount.jumpMake || 0) + 1; if (ev.perfect) campCount.perfect = (campCount.perfect || 0) + 1; campCount.streakNow = ev.streak; if (ev.streak > (campCount.streak || 0)) campCount.streak = ev.streak; if (ev.dunk) campCount.dunk = (campCount.dunk || 0) + 1; });
on('pass', ev => { if (S.camp && ev.slot === 0) campCount.pass = (campCount.pass || 0) + 1; });
on('alleyoop', ev => { if (S.camp && ev.slot === 0) campCount.oop = (campCount.oop || 0) + 1; });
on('steal', ev => { if (S.camp && ev.slot === 0) campCount.steal = (campCount.steal || 0) + 1; });
on('spin', ev => { if (S.camp && ev.slot === 0) campCount.spin = (campCount.spin || 0) + 1; });
on('block', ev => { if (S.camp && ev.slot === 0) campCount.block = (campCount.block || 0) + 1; });
on('knockdown', ev => { if (S.camp && ev.by === 0) campCount.knock = (campCount.knock || 0) + 1; });
on('rebound', ev => { if (S.camp && ev.slot === 0) campCount.rebound = (campCount.rebound || 0) + 1; if (S.camp && ev.slot === 0 && S.camp.afterRebound) campCount.putback = true; });
on('dunkStart', ev => { if (S.camp && ev.slot === 0 && ev.blocked) campCount.blockedDunk = true; });

/** the goal's counter for the running lesson, from the events above */
const campGoalNow = l => {
  switch (l.count) {
    case 'cones': return Math.min(3, S.camp.cones || 0);
    case 'pass': return Math.min(2, campCount.pass || 0);
    case 'jumpMake': return Math.min(2, (campCount.jumpMake || 0) > 0 && (!l.perfect || campCount.perfect) ? campCount.jumpMake : 0);
    case 'three': return Math.min(1, campCount.three || 0);
    case 'dunk': return Math.min(2, campCount.dunk || 0);
    case 'oop': return Math.min(1, campCount.oop || 0);
    case 'stealSpin': return Math.min(2, Math.min(campCount.steal || 0, 1) + Math.min(campCount.spin || 0, 1));
    case 'blockShove': return Math.min(2, Math.min(campCount.block || 0, 1) + Math.min(campCount.knock || 0, 1));
    case 'rebound': return Math.min(2, (campCount.rebound || 0) > 0 && campCount.putback ? 2 : Math.min(1, campCount.rebound || 0));
    case 'streak': return Math.min(3, campCount.streak || 0);
  }
  return 0;
};

/** the camp: the lessons list, then a lesson on the court; the match runs with the interns passive */
const startCampLesson = idx => {
  const l = CAMP_LESSONS[idx];
  S.camp = { idx, lesson: l, t: 0, cones: 0, done: false, rules: false, afterRebound: false, won: false };
  campCountReset();
  S.setup = { home: 'hightops', away: 'breakers', court: 'skybox', qLen: 600, difficulty: 'Pro', powerups: false, twists: false, humans: [{ slot: 0, input: game.input }], mode: 'camp', campLesson: idx, passive: true };
  game.go('court', { court: 'skybox', qLen: 600, humans: [{ slot: 0, input: game.input }], home: 'hightops', away: 'breakers', mode: 'camp', passive: true, twists: false, powerups: false }, { fade: .2 });
};
const campFinishLesson = () => {
  const l = S.camp.lesson, c = campDone();
  if (!c.includes(l.id)) c.push(l.id);
  saveProgress();
  S.camp.done = true; S.camp.doneT = 0;
  emit('campDone', { id: l.id });
};
/** the camp's own step (called from the court scene in camp mode): counts the cones, watches the goal, and finishes */
const campStep = dt => {
  if (!S.camp) return;
  S.camp.t += dt;
  const p = S.players[0];
  if (p && S.camp.lesson.id === 'move' && p.turboOn) { S.camp.turboRun = (S.camp.turboRun || 0) + Math.hypot(p.body.vx, p.body.vy) * dt; if (S.camp.turboRun > 260 * (S.camp.cones + 1) / 3) S.camp.cones = Math.min(3, S.camp.cones + 1); }
  if (S.camp.done) { S.camp.doneT += dt; return; }
  if (S.camp.rules) { if (game.players.some(I => I && I.pressed('confirm'))) { anyConsume('confirm'); campFinishLesson(); } return; }
  if (campGoalNow(S.camp.lesson) >= S.camp.lesson.goal) {
    // the last lesson ends on the rules card: no fouls, goaltending counts, 20 seconds, dunks need turbo, nobody leaves, three straight is Supernova
    if (S.camp.lesson.id === 'nova') S.camp.rules = true; else campFinishLesson();
  }
  if (S.camp.lesson.id === 'rebound' && campCount.rebound) S.camp.afterRebound = true;
};
/** the camp's card at the bottom: the lesson, its instruction (in the player's glyphs), the counter, and DEE DEE's line */
const campDraw = r => {
  const c = S.camp; if (!c) return;
  const l = c.lesson, g0 = campGoalNow(l);
  r.overlay(g => {
    panel(g, 16, r.H * .14, r.W * .36, 84, { border: C.gold });
    E.font.text(g, 'CAMP ' + (c.idx + 1) + ' · ' + l.name, 28, r.H * .14 + 10, C.gold, { scale: 2, outline: false, shadow: '#000' });
    promptLine(g, l.text, 28, r.H * .14 + 42, { scale: 1 });
    E.font.text(g, g0 + ' / ' + l.goal, r.W * .36, r.H * .14 + 60, C.ink, { align: 'right', scale: 2, outline: false, shadow: '#000' });
    if (c.rules) {
      panel(g, r.W * .2, r.H * .18, r.W * .6, r.H * .5, { border: C.gold });
      E.font.title(g, 'THE RULES', r.W / 2, r.H * .22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      ['NO FOULS. SHOVING IS LEGAL.', 'GOALTENDING COUNTS FOR THE SHOOTER.', 'A 20-SECOND SHOT CLOCK.', 'DUNKS NEED TURBO.', 'NOBODY LEAVES THE COURT.', 'THREE STRAIGHT BASKETS = SUPERNOVA.'].forEach((t, i) => E.font.text(g, t, r.W * .24, r.H * .32 + i * 34, C.ink, { scale: 2, outline: false, shadow: '#000' }));
      E.font.text(g, 'YOU\'RE READY! PRESS CONFIRM', r.W / 2, r.H * .64, C.gold, { align: 'center', scale: 2, outline: false, shadow: '#000' });
    }
    if (c.done) E.font.text(g, 'NICE!', r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 4, outline: false, shadow: '#000' });
  });
};
scenes.camp = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'camp'; S.idle = 0; S.campList = new FocusList([], { x: 36, y: 0, gap: 28, w: 340, onBack: () => game.go('menu', null, { fade: .2 }) }); },
  update(dt) {
    const c = campDone();
    S.campList.setItems(CAMP_LESSONS.map((l, i) => ({ label: (c.includes(l.id) ? 'DONE  ' : '      ') + (i + 1) + '. ' + l.name, on: () => startCampLesson(i) })));
    S.campList.nav(dt);
  },
  draw(r) {
    const c = campDone();
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => { screenTitle(g, 'BLAM CAMP', 'TEN LESSONS FROM DEE DEE', r.W); panel(g, r.W * .44, r.H * .24, r.W * .5, r.H * .6); E.font.text(g, 'DEE DEE: "WELCOME TO CAMP. THE INTERNS WON\'T FIGHT BACK. MUCH."', r.W * .47, r.H * .27, C.cyan, { scale: 1, outline: false, shadow: '#000', wrap: r.W * .44 }); E.font.text(g, c.length + ' OF 10 DONE', r.W * .47, r.H * .8, C.gold, { scale: 2, outline: false, shadow: '#000' }); });
    const boxes = S.campList.draw(r, { x: 36, y: r.H * .26, gap: Math.max(30, r.H * .075), w: r.W * .36, scale: 2 });
    S.campList.pointer(r, boxes);
    promptBar(r, MENU_PROMPT);
  }
};
