// ---- the match scene (pausable): it runs a Match, the camera director, the HUD, the pickers (bowler, tea treat), the
// story's beats and tips, the Nets' lessons, and keeps the highlights. Quick Match, Versus, Story, Nets, Showdown and
// the AI Hub round all play here.
let MATCH = null;
function startMatch(cfg, extra = {}) { game.go('match', Object.assign({ cfg }, extra)); }
SC.match = {
  pausable: true, camera: { zoom: false },
  enter(d) {
    const m = this.m = new Match(d.cfg); MATCH = m; this.d = d;
    commReset(m); useGround(m.cfg.ground, m); WORLD.shot = null; WORLD.forceShot = null; WORLD.focusOverride = null;
    m.highlights = []; this.prevState = null; this.tipsSeen = {}; this.tip = null; this.lesson = d.lesson !== undefined ? LESSONS[d.lesson] : null; this.lessonN = 0; this.lessonDone = false;
    CROWD.size = m.g.crowd; CROWD.rain = m.weather === 'rain'; PICK.i = 0; PICK.tea = 0;
    if (!m.cfg.noMusic) music(m.cfg.mode === 'showdown' || m.cfg.mode === 'hub' ? 'showdown' : m.g.song);
    this.talk = new E.Dialog(game, { lines: 3, place: 'top', voice: null, border: '#ffd23a', bg: ['#1a1430', '#0e0c1c'] });
    this.midDone = false; this.endT = 0; this.finished = false;
    if (this.lesson) { this.lessonEvents = []; this.offLesson = []; const L = this.lesson; this.offLesson.push(...L.on.map(ev => { const fn = data => { if (MATCH === m && !this.lessonDone && L.check(ev, data, m)) { this.lessonN++; sfx('coin'); if (this.lessonN >= L.goal) { this.lessonDone = true; sting('win'); if (!profile.lessons.includes(L.id)) { profile.lessons.push(L.id); saveProfile(); } cover('lesson:' + L.id); } } }; on(ev, fn); return [ev, fn]; })); if (L.setup) L.setup(m); }
    game.input.consumeAll();
    emit('match:start', { mode: m.cfg.mode });
  },
  exit() { if (this.offLesson) for (const [ev, fn] of this.offLesson) { const a = BUS.subs[ev]; if (a) a.splice(a.indexOf(fn), 1); } this.offLesson = null; game.timeScale = 1; game.weather = null; },
  update(dt) {
    const m = this.m, I = game.input;
    if (DEV.open) { devUpdate(dt); return; }
    if (this.talk.open) { this.talk.update(dt); return; }
    // the speed of the game: the dev slider, dev slow motion, a moment's slow motion for big moments
    if (WORLD.slowT > 0) WORLD.slowT -= 1 / 120;
    game.timeScale = T('timeScale') * (DEV.toggles.slowmo ? .25 : 1) * (WORLD.slowT > 0 ? WORLD.slowK : 1);
    // pickers and skips
    if (m.needBowler && m.state === 'between') this.pickBowler(m);
    if (m.state === 'break') {
      if (m.cfg.mode === 'story' && !this.midDone && m.i >= 1) { this.midDone = true; const C = CHAPTERS[m.cfg.chapter - 1]; if (C.mid && C.mid.length) this.storyTalk(C.mid); if (m.i === 1 && !m.I.so && !m.teaChosen) { m.needTea = true; } return; }
      if (m.needTea) this.pickTea(m);
      else if (I.pressed('confirm') || I.pressed('shot') || (I.clicked && I.clicked())) m.breakGo = true;
    }
    if (m.state === 'dead' && (I.pressed('confirm') || (I.clicked && I.clicked())) && m.st > .5) m.skipDead();
    if (m.cfg.mode === 'story' && m.cfg.chapter <= 2) this.tips(m);
    // the dev toggles that act on the match
    m.dev.infiniteHype = DEV.toggles.infHype; m.dev.alwaysFire = DEV.toggles.alwaysFire; m.dev.invincible = DEV.toggles.invincible; m.dev.autoBat = DEV.toggles.autoBat; m.dev.autoBowl = DEV.toggles.autoBowl; m.dev.noChaos = DEV.toggles.noChaos;
    if (DEV.toggles.alwaysFire) { m.fire.batOn = true; }
    if (DEV.toggles.infHype) m.hype[0] = m.hype[1] = 100;
    const before = m.state;
    m.update(dt);
    if (before === 'dead' && m.state !== 'dead') this.keepHighlight(m);
    director(m, dt); hudStep(dt); musicLayers(m);
    if (this.lesson && this.lessonDone) { this.endT += dt; if (this.endT > 2.5 || (this.endT > .8 && I.pressed('confirm'))) { const nx = this.d.after; if (nx) nx(); else game.go('lessons'); } }
    if (m.cfg.mode === 'nets' && m.cfg.nets === 'six' && m.I.legal >= 12 && m.state === 'between') { m.result = { winner: 0, text: 'The Six Machine: ' + (m.I.runs) + ' points' }; m._go('over'); }
    if (m.state === 'over') { this.endT += dt; if (this.endT > 3 || (this.endT > 1 && I.pressed('confirm'))) this.finish(m); }
  },
  finish(m) {
    if (this.finished) return; this.finished = true;
    const mode = m.cfg.mode;
    if (mode === 'nets' && m.cfg.nets === 'six') { game.go('table', { mode: 'six', score: m.I.runs }); return; }
    if (mode === 'nets') { game.go('netsmenu'); return; }
    game.go('results', { m });
  },
  storyTalk(lines, then) {
    const q = lines.slice(), next = () => { if (!q.length) { if (then) then(); return; } const [who, text] = q.shift(); if (who === '*') { this.talk.say(text, { name: 'THE ALMANACK', onDone: next }); return; } const V_ = VOICES[who] || VOICES.aubrey; this.talk.say(text, { name: V_.name, portrait: portraitRig(who), onDone: next }); say(text, who); };
    next();
  },
  pickBowler(m) {
    const pad = m.pad('bowl'), I = pad.I || game.input, n = m.needBowler.length;
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { PICK.i = (PICK.i - 1 + n) % n; sfx('select'); }
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { PICK.i = (PICK.i + 1) % n; sfx('select'); }
    const p = !HEADLESS && I.pointer && I.pointer(), c = I.clicked && I.clicked(), R = HUD.pick || [];
    const hit = q => R.findIndex(rc => q[0] >= rc[0] && q[0] < rc[0] + rc[2] && q[1] >= rc[1] && q[1] < rc[1] + rc[3]);
    if (p) { const k = hit(p); if (k >= 0 && k !== PICK.i) PICK.i = k; }
    if (c && hit(c) >= 0) { PICK.i = hit(c); m.pickBowler(m.needBowler[PICK.i].id); sfx('confirm'); I.consumeAll(); return; }
    if (I.pressed('confirm') || I.pressed('shot')) { PICK.i = Math.min(PICK.i, n - 1); m.pickBowler(m.needBowler[PICK.i].id); sfx('confirm'); I.consumeAll(); }
  },
  pickTea(m) {
    const I = game.input;
    if (I.repeat('left', .3, .15)) { PICK.tea = (PICK.tea + 2) % 3; sfx('select'); }
    if (I.repeat('right', .3, .15)) { PICK.tea = (PICK.tea + 1) % 3; sfx('select'); }
    const c = I.clicked && I.clicked(), R = HUD.tea || []; let k = -1; if (c) k = R.findIndex(rc => c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3]);
    if (k >= 0) PICK.tea = k;
    if (I.pressed('confirm') || I.pressed('shot') || k >= 0) { const t = TEA_TREATS[PICK.tea]; m.teaTreat = t.id; m.teaChosen = true; m.needTea = false; if (t.id === 'sponge') m.hypeAdd(m.cfg.teams.indexOf('ker'), 40); sfx('confirm'); cover('tea:' + t.id); emit('tea', { id: t.id }); I.consumeAll(); m.breakGo = true; }
    if (m.st > 20) { m.needTea = false; m.breakGo = true; }
  },
  // tips for the first chapters (5.16.1): the first time each moment comes up
  tips(m) {
    const show = (k, text) => { if (this.tipsSeen[k]) return; this.tipsSeen[k] = true; this.tip = { text, t: 0 }; };
    if (m.state === 'flight' && m.isHuman('bat')) show('bat', 'BATTING: AIM WITH THE STICK, THEN TIME THE SHOT AS THE BALL ARRIVES');
    if (m.state === 'inPlay' && m.isHuman('run')) show('run', 'RUNNING: CALL A RUN, PRESS AGAIN TO TURN FOR TWO, OR SEND THEM BACK');
    if (m.state === 'setup' && m.isHuman('bowl')) show('bowl', 'BOWLING: PLACE THE MARKER, PICK A DELIVERY, RELEASE IN THE GREEN');
    if (m.state === 'flight' && m.isHuman('bowl') && m.atouch > 0) show('after', 'AFTERTOUCH: PUSH LEFT OR RIGHT JUST AFTER RELEASE TO SWING IT');
    if (m.catchQTE && m.isHuman('field')) show('catch', 'A CATCH! PRESS AS THE GOLD RING CLOSES ON THE WHITE ONE');
    if (m.canReview() && m.sideHumans(m.reviewSide()).length) show('review', 'THINK THE UMPIRE GOT IT WRONG? REVIEW IT: ONE PER INNINGS');
    if (m.specialReady(m.isHumanSideIdx())) show('special', 'THE KERFUFFLE METER IS FULL: YOUR SPECIAL IS READY');
    if (this.tip) { this.tip.t += 1 / 120; if (this.tip.t > 5) this.tip = null; }
  },
  keepHighlight(m) {
    const r = m.lastRec; if (!r || !m.rec) return;
    const w = (r.wicket ? 6 : 0) + (r.boundary === 6 ? 5 : r.boundary === 4 ? 2 : 0) + (r.bonus ? 4 : 0) + (r.special ? 3 : 0);
    if (w < 2) return;
    const from = Math.max(0, m.rec.findIndex(f => f.t >= (m.releaseT || 0) - .4)), frames = m.rec.slice(from);
    if (frames.length < 30) return;
    const label = r.wicket ? 'WICKET: ' + upper(r.wicket.how) : r.boundary === 6 ? 'SIX!' : r.bonus ? 'KERFUFFLE BONUS' : 'FOUR!';
    m.highlights.push({ frames, w, label }); m.highlights.sort((a, b) => b.w - a.w); if (m.highlights.length > 3) m.highlights.length = 3;
  },
  draw(r) {
    const m = this.m;
    drawWorld(r, m, 1 / 60);
    drawHud(r, m);
    r.overlay(g => {
      const W = r.W;
      if (this.tip) { panel(g, W / 2 - 160, 44, 320, 16, { rule: '#5fd38a' }); E.font.text(g, this.tip.text, W / 2, 48, '#f4f0e0', { align: 'center', shadow: '#000' }); }
      if (this.lesson) {
        const L = this.lesson; panel(g, W / 2 - 160, 40, 320, 32, { rule: '#ff8ad8' });
        E.font.text(g, 'MRS CRUMB: ' + upper(L.title) + '  ' + Math.min(this.lessonN, L.goal) + ' / ' + L.goal, W / 2, 44, '#ff8ad8', { align: 'center', shadow: '#000' });
        E.font.text(g, L.text[Math.min(L.text.length - 1, Math.floor(m.t / 6) % L.text.length)], W / 2, 56, '#f4f0e0', { align: 'center', shadow: '#000' });
        if (this.lessonDone) bigTitle(g, 'LESSON COMPLETE', W / 2, r.H / 2 - 20, { scale: 2 });
      }
      if (m.cfg.mode === 'nets' && m.cfg.nets === 'bat') prompts(g, game.input, [['back', ''], ['run', 'Machine: ' + DELIVERIES[NETS_DELS[NETS.k]].name]], W / 2, 70, { align: 'center' });
      if (m.cfg.mode === 'nets' && m.cfg.nets === 'six') E.font.text(g, 'THE SIX MACHINE  BALL ' + Math.min(12, m.I.legal + 1) + ' / 12', W / 2, 44, '#ffd23a', { align: 'center', shadow: '#000' });
      if (m.cfg.mode === 'hub') drawHubHud(g, r, m);
    });
    this.talk.draw(r);
    if (DEV.open) devDraw(r);
  }
};
// ---------------------------------------------------------------- story chapters
function startChapter(n, o = {}) {
  const C = CHAPTERS[n - 1];
  const cfg = { mode: 'story', chapter: n, teams: ['ker', C.opp], ground: C.ground, overs: C.overs, wickets: C.wickets, difficulty: o.difficulty || { Village: 'village', County: 'county', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[game.settings.difficulty] || 'county',
    kerfuffle: C.kerfuffle, humans: [[game.input], []], batFirst: C.batFirst || null, scenario: C.scenario || null, rain: !!C.rain, boss: !!C.boss, superOver: true };
  const play = () => startMatch(cfg);
  const pre = () => game.go('cutscene', { lines: C.pre, ground: C.ground, title: 'CHAPTER ' + n + ': ' + upper(C.title), next: n === 1 && !profile.lessons.includes('aim') ? () => lessonChain(['aim', 'loft', 'defend', 'run', 'bowl'], play) : play });
  pre();
}
function lessonChain(ids, then) {
  const k = LESSONS.findIndex(L => L.id === ids[0]);
  if (k < 0 || !ids.length) { then(); return; }
  startNets({ kind: 'lesson', lesson: k, after: () => lessonChain(ids.slice(1), then) });
}
function storyStars(m) {
  const C = CHAPTERS[m.cfg.chapter - 1], goals = C.goals.map(([n, f]) => [n, !!f(m)]);
  const got = goals.map((g, k) => g[1] ? k : -1).filter(k => k >= 0);
  const best = new Set([...(profile.story.best[C.n] || []), ...got]);
  profile.story.best[C.n] = [...best]; profile.story.stars[C.n] = Math.max(profile.story.stars[C.n] || 0, best.size);
  if (m.won) profile.story.chapter = Math.max(profile.story.chapter, Math.min(5, C.n + 1));
  if (m.won && C.n === 5) profile.story.done = true;
  if (m.won && !profile.unlocked.includes(C.opp)) profile.unlocked.push(C.opp);
  saveProfile(); if (!HUB) try { game.saves.autosave(); } catch (e) { /* storage blocked */ }
  cover('storyChapter' + C.n);
  return { goals };
}
function storyWin(n) {
  const C = CHAPTERS[n - 1];
  game.go('cutscene', { lines: C.win, ground: C.ground, title: n === 5 ? 'THE END' : 'VICTORY', next: n === 5 ? () => { cover('ending'); game.go('about', { page: ABOUT_PAGES.length - 1, ending: true }); } : () => game.go('storymap') });
}
// ---------------------------------------------------------------- the Nets: lessons, free practice, the Six Machine
const NETS_DELS = ['express', 'outswing', 'inswing', 'bouncer', 'yorker', 'slower', 'dobber', 'legbreak', 'googly', 'offbreak'];
const NETS = { k: 0 };
const LESSONS = [
  { id: 'aim', title: 'Aim and the ground shot', role: 'bat', goal: 3, on: ['bat:contact'], check: (e, d) => d.kind === 'clean' && SHOT[d.shot].b === 'shot', text: ['Push the stick, or point the mouse, where the ball should go.', 'Press the ground shot as the ball reaches you. Three clean hits, dear.'] },
  { id: 'loft', title: 'The lofted shot', role: 'bat', goal: 2, on: ['bat:contact'], check: (e, d) => d.kind === 'clean' && SHOT[d.shot].b === 'loft', text: ['The lofted shot goes in the air. Over the fielders, ideally.', 'Two clean lofted hits. Mind the greenhouse.'] },
  { id: 'defend', title: 'Defend and leave', role: 'bat', goal: 3, on: ['ball:done'], check: (e, d) => !d.rec.wicket && (!d.rec.shot || SHOT[d.rec.shot].b === 'block'), text: ['Defend a straight one, or press nothing to leave a wide one.', 'Survive three balls without attacking them. Patience, dear.'] },
  { id: 'run', title: 'Running between the wickets', role: 'bat', goal: 3, on: ['run'], check: () => true, text: ['After you hit it, call the run. Press again at the crease for two.', 'Send them back if it looks tight. Complete three runs.'], setup: m => { m.cfg.lessonRun = true; } },
  { id: 'charge', title: 'Charging the spinner', role: 'bat', goal: 2, on: ['bat:contact'], check: (e, d, m) => m.batters[0].charged > 0 && d.kind === 'clean', text: ['Against spin, charge down the pitch before it lands.', 'It turns a good length into a half-volley. Miss, and you are stumped.'], del: ['legbreak', 'offbreak', 'googly'] },
  { id: 'bowl', title: 'Bowling: the marker and the meter', role: 'bowl', goal: 3, on: ['ball:released'], check: (e, d) => d.grade === 'green', text: ['Move the marker where the ball should land, then pick a delivery.', 'Press again with the needle in the green. Three green deliveries.'] },
  { id: 'aftertouch', title: 'Aftertouch', role: 'bowl', goal: 2, on: ['ball:done'], check: () => (COVER.aftertouch || 0) > (LESSONS[6]._a || 0) && (LESSONS[6]._a = COVER.aftertouch), text: ['Just after the release, push the stick left or right.', 'It adds swing, or drift for a spinner. Bowl two with aftertouch.'] },
  { id: 'special', title: 'Specials and the Kerfuffle meter', role: 'bat', goal: 1, on: ['special'], check: () => true, text: ['Big moments fill the Kerfuffle meter. Full, and your special is ready.', 'It is full now. Press the special button, then watch.'], setup: m => { m.hype[0] = 100; } },
  { id: 'catch', title: 'The catch ring', role: 'field', goal: 2, on: ['catch'], check: () => true, text: ['When the ball goes up, a gold ring closes on a white one.', 'Press as they meet. Two catches. Hands like a teapot, not a colander.'] },
  { id: 'throw', title: 'Throws and run-outs', role: 'field', goal: 2, on: ['throw'], check: () => true, text: ['When you field it, throw to the keeper or the bowler.', 'The end the batter is running to is the one to aim at. Two throws.'] },
  { id: 'review', title: 'Reviews', role: 'bowl', goal: 1, on: ['review:start'], check: (e, d) => d.kind === 'krs', text: ['If the umpire gets an LBW wrong, review it: one per innings.', 'Owl-Eye will show where it pitched, hit and was going.'] }
];
function startNets(o) {
  const kind = o.kind, L = kind === 'lesson' ? LESSONS[o.lesson] : null, role = L ? L.role : kind === 'bowl' ? 'bowl' : 'bat';
  const bowlHuman = role === 'bowl' || role === 'field';
  const script = { k: 0, next(what, m) {
    if (what !== 'bowl') { if (L && L.id === 'catch') return { btn: 'loft', th: pick([-60, 0, 60, -100, 100]), grade: 'PERFECT' }; if (L && L.id === 'throw') return { btn: 'shot', th: pick([-40, 40, 70, -70]), grade: 'GOOD' }; if (L && L.id === 'review') return { btn: null }; if (kind === 'bowl' || (L && L.role === 'bowl')) return null; return null; }
    if (L && L.del) return { del: L.del[this.k++ % L.del.length], grade: 'green' };
    if (kind === 'six') return { del: ['express', 'slower', 'outswing', 'legbreak', 'yorker', 'bouncer'][this.k++ % 6], grade: 'green' };
    return { del: NETS_DELS[NETS.k], grade: 'green' };
  } };
  const teams = bowlHuman ? ['mud', 'ker'] : ['ker', 'thr'];
  const cfg = { mode: 'nets', nets: kind === 'lesson' ? 'lesson' : kind, teams, ground: 'green', overs: 99, wickets: 99, kerfuffle: kind !== 'lesson' || L.id === 'special' || L.id === 'review', humans: bowlHuman ? [[], [game.input]] : [[game.input], []], single: true, superOver: false, script: bowlHuman ? (L && (L.id === 'catch' || L.id === 'throw' || L.id === 'review') ? script : null) : script, netsMachine: !bowlHuman, difficulty: 'village', noReplays: true };
  if (L && L.id === 'review') cfg.umpWrong = true;
  if (L && (L.id === 'catch' || L.id === 'throw')) cfg.assist = 'Manual';
  startMatch(cfg, { lesson: L ? o.lesson : undefined, after: o.after });
}
// the Nets' machine bowls the chosen delivery; L1 / R1 change it in free practice
on('state', d => { const m = MATCH; if (!m || m.cfg.mode !== 'nets' || m.cfg.nets !== 'bat' || d.s !== 'setup') return; });
const _netsSetup = Match.prototype._setup;
Match.prototype._setup = function (dt) {
  if (this.cfg.mode === 'nets' && this.cfg.nets === 'bat' && this.isHuman('bat')) { const I = game.input, was = NETS.k; if (I.pressed('run')) { NETS.k = (NETS.k + 1) % NETS_DELS.length; sfx('select'); } if (I.pressed('back')) { NETS.k = (NETS.k - 1 + NETS_DELS.length) % NETS_DELS.length; sfx('select'); } if (was !== NETS.k) { this.bowlPlan = null; this.dev.forceDelivery = null; this.st = 0; } }
  return _netsSetup.call(this, dt);
};
// ---------------------------------------------------------------- the Super Over Showdown
function startShowdown(kind, o = {}) {
  const R = E.rng(o.seed || ((Math.random() * 1e9) >>> 0));
  const balls = ['piston', 'steamBouncer', 'piston', 'spinCycle', 'steamBouncer', 'piston'].map((d, k) => ({ del: d, target: [-(2 + R() * 6), d === 'steamBouncer' ? 170 : d === 'spinCycle' ? 70 + R() * 30 : 60 + R() * 60], grade: 'green', special: k === 5 }));
  if (kind === 'bat') {
    const script = { k: 0, next(what) { if (what !== 'bowl') return null; return balls[Math.min(5, this.k++)]; } };
    startMatch({ mode: 'showdown', showdown: 'bat', teams: ['ker', 'thr'], ground: 'dome', timeOfDay: 'night', weather: 'clear', overs: 1, wickets: 2, kerfuffle: true, humans: [[game.input], []], batFirst: 'ker', single: true, superOver: false, script, difficulty: 'county' });
  } else {
    startMatch({ mode: 'showdown', showdown: 'bowl', teams: ['ker', 'lar'], ground: 'bay', overs: 1, wickets: 2, kerfuffle: true, humans: [[game.input], []], scenario: { innings: 2, target: 15, battingFirst: 'ker', firstRuns: 14 }, single: true, superOver: false, order: { lar: ['kev', 'shazza', 'wal'] }, difficulty: 'county' });
  }
}
function showdownScore(m) { const I = m.I; if (m.cfg.showdown === 'bat') return I.runs; return Math.max(0, (14 - I.runs) * 10 + I.wkts * 25); }
let ARCADE = null;
function arcade() { if (!ARCADE) ARCADE = new E.Arcade(game, { id: 'kerfuffle', lives: 1, hud: false, colors: ['#c8c0e0', '#ffd23a', '#ffffff'] }); return ARCADE; }
SC.table = {
  enter(d) { this.d = d; this.t = 0; this.entering = false; const A = arcade(); music('showdown');
    if (d.score !== undefined && A.qualifies(d.score, d.mode)) { this.entering = true; A.enter(d.score, d.mode, () => { this.entering = false; }); }
    this.modes = d.modes || [d.mode]; this.k = 0; IDLE.t = 0; },
  update(dt) { this.t += dt; const A = arcade(); A.update(dt); if (this.entering) return; idleStep(dt, 'table'); const I = game.input;
    if (this.modes.length > 1 && (I.pressed('left') || I.pressed('right'))) { this.k = (this.k + 1) % this.modes.length; sfx('select'); }
    if (this.t > .8 && (I.pressed('confirm') || I.pressed('cancel'))) game.go(this.d.mode === 'six' ? 'netsmenu' : 'showmenu'); },
  draw(r) { drawBackdrop(r, 1 / 60, { gid: 'dome', time: 'night' }); const A = arcade(), md = this.modes[this.k];
    r.overlay(g => px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0818')));
    if (!this.entering) A.drawTable(r, md, 34, md === 'bat' ? 'SHOWDOWN: BAT' : md === 'bowl' ? 'SHOWDOWN: BOWL' : 'THE SIX MACHINE');
    A.draw(r);
    r.overlay(g => { if (this.d.score !== undefined) E.font.text(g, 'YOUR SCORE: ' + this.d.score, r.W / 2, 16, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); if (!this.entering) footer(g, r, this.modes.length > 1 ? [['left', 'Table'], ['confirm', 'Back']] : [['confirm', 'Back']]); }); }
};
