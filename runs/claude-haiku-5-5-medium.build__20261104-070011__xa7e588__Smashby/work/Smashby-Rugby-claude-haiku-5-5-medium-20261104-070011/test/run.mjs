// THE ONE TEST COMMAND: node test/run.mjs [--only <suite>]. Rebuilds the single HTML, runs every headless suite, and
// prints only the failures and one count line. Exit code 1 on any failure.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './load.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > -1 ? process.argv[onlyArg + 1] : null;
const started = Date.now();
let passed = 0, failed = 0, suites = 0;
const failures = [];
let suite = '';

function check(name, ok, detail) {
  if (ok) passed++;
  else { failed++; failures.push(`${suite} › ${name}${detail ? ': ' + detail : ''}`); }
}
function run(name, fn) {
  if (only && only !== name) return;
  suites++; suite = name;
  try { fn(); } catch (e) { failed++; failures.push(`${name} › threw: ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
}

// the build first: the same file the player gets
try { execFileSync(process.execPath, [join(root, 'build.mjs')], { stdio: 'pipe' }); }
catch (e) { failed++; failures.push('build › ' + String(e.stderr || e).slice(0, 300)); }

const DT = 1 / 120;
const { ctx, SM, E } = loadGame();
const game = ctx.__smashby.game;
const I = game.input;
const fakeInput = (opts) => ({
  lastDevice: 'keyboard', padIndex: null, move: () => (opts.move ? opts.move() : [0, 0]), down: a => !!(opts.down && opts.down(a)),
  pressed: a => !!(opts.pressed && opts.pressed(a)), released: a => !!(opts.released && opts.released(a)), repeat: () => false,
  anyPressed: () => false, consume() {}, consumeAll() {}, label: a => a, pointer: () => null
});
const resetTune = () => SM.TUNE.reset();
// a match ready to play: the kick-off is skipped (the kick-off has its own test in the batch)
const newMatch = (o = {}) => { resetTune(); SM.CHEATS.godMode = false; SM.CHEATS.refBlind = false; const M = SM.newMatch(Object.assign({ home: 0, away: 1, venue: 0, halves: 120, attract: true, seed: 11 }, o)); SM.setPhase('play'); const fh = M.players.find(q => q.side === 0 && q.pos === 4); M.ball.owner = fh; M.ball.state = 'held'; M.ball.lastTouch = 0; return M; };
const stepN = (n, after) => { for (let i = 0; i < n; i++) { SM.step(DT); if (after) after(); } };
const events = M => { const out = []; return { take: () => out.push(...M.events.splice(0)), out }; };
const has = (list, t) => list.some(e => e.t === t);

// ---------- boot: the scene table, the bundle and the page ----------
run('boot', () => {
  const need = ['title', 'menu', 'setup', 'cup', 'story', 'match', 'results', 'about'];
  check('every scene is registered', need.every(k => k in SM.scenes), need.filter(k => !(k in SM.scenes)).join(','));
  const html = readFileSync(resolve(root, '..', 'Smashby-Rugby-claude-haiku-5-5-medium-20261104-070011.html'), 'utf8');
  check('the page is one file with the engine inlined', html.includes('my-3D2dge') && html.includes('<title>Smashby</title>'));
  check('no script tag is left open in the page', (html.match(/<script>/g) || []).length === 2);
  check('the page is under 2 MB', statSync(resolve(root, '..', 'Smashby-Rugby-claude-haiku-5-5-medium-20261104-070011.html')).size < 2 * 1024 * 1024);
  check('the tuning defaults are the plan\'s', SM.TUNE.defaults().runSpeed === 100 && SM.TUNE.defaults().turboMult === 1.45 && SM.TUNE.defaults().halfLength === 120);
  check('the PlayStation glyphs are the default', game.settings.glyphs === 'playstation', String(game.settings.glyphs));
});

// ---------- sim rules ----------
run('sim-try', () => {
  const M = newMatch();
  const p = M.players.find(q => q.side === 0 && q.pos === 3);
  p.x = SM.X1 + 10; p.y = SM.CY; M.ball.owner = p; M.ball.state = 'held';
  stepN(2);
  check('a carrier across the try line scores a try', M.score[0] === 5 && M.stats[0].tries === 1, JSON.stringify(M.score));
  check('the try enters its celebration', M.phase === 'try', M.phase);
  const ev = [];
  stepN(6 * 120, () => ev.push(...M.events.splice(0).map(e => e.t)));
  check('after the celebration the conversion is kicked (a goal or a miss)', ev.includes('goal') || ev.includes('miss'), ev.join(','));
});
run('sim-conversion', () => {
  const M = newMatch({ seed: 5 });
  const p = M.players.find(q => q.side === 0 && q.pos === 3);
  p.x = SM.X1 + 10; p.y = SM.CY; M.ball.owner = p; M.ball.state = 'held';
  stepN(2);
  stepN(3.1 * 120);
  check('the conversion starts in the kicker\'s phase', M.phase === 'conv', M.phase);
  const c = M.conv, need = SM.clamp(c.dist / (SM.TUNE.v.kickMax * .9), .2, .95);
  const before = M.score[0];
  SM.decideKick(need, 0);
  check('a kick on the mark is a conversion (two points)', M.score[0] === before + 2, JSON.stringify(M.score));
});
run('sim-missed-kick', () => {
  const M = newMatch({ seed: 6 });
  const p = M.players.find(q => q.side === 0 && q.pos === 3);
  p.x = SM.X1 + 10; p.y = SM.CY; M.ball.owner = p; M.ball.state = 'held';
  stepN(2); stepN(3.1 * 120);
  const before = M.score[0];
  SM.decideKick(0.02, 0.9);
  check('a missed kick scores nothing and the other side drops out', M.score[0] === before && M.phase !== 'conv', JSON.stringify([M.score, M.phase]));
});
run('sim-touch-lineout', () => {
  const M = newMatch({ seed: 7 });
  for (const q of M.players) { q.x = 1000; q.y = 500; }
  M.ball.owner = null; M.ball.state = 'loose'; M.ball.x = 500; M.ball.y = SM.Y0 - 6; M.ball.z = 0; M.ball.vx = 0; M.ball.vy = -20; M.ball.vz = 0; M.ball.lastTouch = 0;
  stepN(1);
  check('the ball over the touchline is a lineout to the other side', M.phase === 'lineout' && M.lineout && M.lineout.thrower === 1, M.phase);
  stepN(3 * 120);
  check('the lineout is won and play goes on', M.phase !== 'lineout' && M.lineout === null, M.phase);
});
run('sim-scrum', () => {
  const M = newMatch({ seed: 8 });
  SM.startScrum(500, 300, 1);
  check('a scrum is set at its mark', M.phase === 'scrum' && M.scrum.x === 500, M.phase);
  const ev = [];
  stepN(4.2 * 120, () => ev.push(...M.events.splice(0).map(e => e.t)));
  check('the scrum is won and the side with the ball plays on', ev.includes('scrumWon') && (M.phase === 'play' || M.phase === 'ruck'), M.phase + ' ' + ev.join(','));
});
run('sim-penalty', () => {
  const M = newMatch({ seed: 9 });
  const off = M.players.find(q => q.side === 1 && q.pos === 6);
  off.x = 400; off.y = SM.CY;
  check('a seen foul is a penalty', SM.foul('late', off, off.x, off.y, false) === true && M.phase === 'penalty' && M.pen.side === 0, M.phase);
  stepN(1.2 * 120);
  check('the CPU chooses and play resumes (or a kick is set)', M.phase !== 'penalty' && M.pen === null, M.phase);
});
run('sim-hooter-half', () => {
  const M = newMatch({ seed: 10, halves: 30 });
  M.run = M.halfLen - .01;
  stepN(120);
  check('the hooter goes at zero', M.hooter === true, String(M.hooter));
  for (let i = 0; i < 80 * 120 && M.half === 1; i++) SM.step(DT);
  check('the half ends at the next stoppage', M.half === 2 || M.phase === 'half', M.phase + ' half ' + M.half);
  stepN(6 * 120);
  check('the second half runs', M.half === 2 && !M.over, 'half ' + M.half + ' over ' + M.over);
});
run('sim-golden', () => {
  const M = newMatch({ seed: 12, attract: false });
  M.half = 2; M.score = [7, 7]; M.run = M.halfLen; M.hooter = true;
  SM.fullTime();
  check('a level game at full time goes to golden point', M.golden === true && !M.over, 'golden ' + M.golden + ' over ' + M.over);
  M.conv = { side: 0, x: SM.X1 - 150, y: SM.CY, kind: 'conv' };
  SM.startConversion('conv');
  const need = SM.clamp(M.conv.dist / (SM.TUNE.v.kickMax * .9), .2, .95);
  SM.decideKick(need, 0);
  check('the next score in golden point ends the match', M.over === true && M.score[0] === 9, 'over ' + M.over + ' score ' + M.score);
});
run('sim-tackle-chance', () => {
  const M = newMatch({ seed: 21 });
  const p = M.players.find(q => q.side === 0 && q.pos === 6), c = M.players.find(q => q.side === 1 && q.pos === 6);
  p.stats.TKL = 7; c.stats.POW = 7;
  let ok = 0, n = 400, broke = 0;
  for (let i = 0; i < n; i++) {
    M.phase = 'play'; M.ruck = null;
    // the carrier runs at the tackler: the tackler stands in front of him, so there is no side bonus
    c.x = 500; c.y = SM.CY; c.facing = 0; c.st = 'run'; c.stT = 0; c.stunT = 0; c.evadeT = 0; c.evade = 0; c.fendT = 0; c.onFire = false; c.turbo = 0;
    p.x = 512; p.y = SM.CY; p.facing = Math.PI; p.cool = 0; p.stunT = 0; p.st = 'run'; p.fendT = 0;
    M.ball.owner = c; M.ball.state = 'held';
    SM.tackle(p, false, 0);
    const ev = M.events.splice(0);
    if (ev.some(e => e.t === 'tackle')) ok++;
    if (ev.some(e => e.t === 'brokenTackle')) broke++;
  }
  const expected = SM.TUNE.v.tackleBase * (.9 + .02 * 7 - .02 * 7);
  const rate = ok / (ok + broke);
  check('the tackle success rate is within 5% of the formula over 400 tries', Math.abs(rate - expected) < .05, 'rate ' + rate.toFixed(3) + ' expected ' + expected.toFixed(3));
});
run('sim-pass-catch', () => {
  const M = newMatch({ seed: 31 });
  SM.TUNE.v.catchBase = 1; SM.TUNE.v.pressurePenalty = 0;
  const passer = M.players.find(q => q.side === 0 && q.pos === 3), recv = M.players.find(q => q.side === 0 && q.pos === 4);
  for (const q of M.players) { if (q.side === 1) { q.x = 1000; q.y = 60; } }
  passer.x = 500; passer.y = 300; recv.x = 440; recv.y = 220; recv.vx = recv.vy = 0; recv.stats.HND = 10; recv.stunT = 0; recv.st = 'run';
  M.ball.owner = passer; M.ball.state = 'held';
  SM.actions(passer, { press: { passUp: true } }, DT);
  check('a pass up the screen goes to the receiver above', M.ball.state === 'pass' && M.ball.receiver === recv, M.ball.state);
  stepN(1.5 * 120);
  check('the receiver catches it', M.ball.owner === recv, M.ball.owner && M.ball.owner.nick);
});
run('sim-legal-receivers', () => {
  const M = newMatch({ seed: 32 });
  const p = M.players.find(q => q.side === 0 && q.pos === 4);
  const ahead = M.players.find(q => q.side === 0 && q.pos === 6);
  p.x = 500; p.y = 300; ahead.x = 600; ahead.y = 200;
  check('no pass goes to a man in front', !SM.legalReceivers(p, true).includes(ahead));
  M.ball.owner = p; M.ball.state = 'held';
  p.cool = 0;
  check('no legal receiver above the passer', SM.legalReceivers(p, true).length === 0);
  M.events.length = 0;
  SM.actions(p, { press: { passUp: true } }, DT);
  check('a dummy is sold when nobody is legal', M.events.some(e => e.t === 'dummy') && M.ball.owner === p, JSON.stringify(M.events.map(e => e.t)));
});
run('sim-sin-bin', () => {
  const M = newMatch({ seed: 41 });
  const p = M.players.find(q => q.side === 0 && q.pos === 5);
  SM.sendOff(p);
  check('a yellow card leaves the side with six', M.players.filter(q => q.side === 0 && q.bin <= 0).length === 6, String(M.players.filter(q => q.side === 0 && q.bin <= 0).length));
  for (let i = 0; i < 200 * 120 && p.bin > 0; i++) SM.step(DT);
  check('the sin bin ends after its seconds of play', p.bin <= 0, String(p.bin));
});
run('sim-tuning-speed', () => {
  const measure = rs => {
    const M = newMatch({ seed: 51 });
    SM.TUNE.v.runSpeed = rs;
    const p = M.players.find(q => q.side === 0 && q.pos === 6);
    p.x = 300; p.y = SM.CY; p.vx = p.vy = 0; p.st = 'run'; p.stunT = 0; p.cool = 0; M.ball.owner = null; M.ball.state = 'placed';
    for (const q of M.players) if (q !== p) { q.x = 1000; q.y = 60; }
    const x0 = p.x;
    for (let i = 0; i < 120; i++) SM.playerStep(p, DT, { mx: 1, my: 0, press: {} });
    return p.x - x0;
  };
  const slow = measure(60), fast = measure(160);
  check('a faster run speed moves the player further', fast > slow * 2, slow.toFixed(1) + ' vs ' + fast.toFixed(1));
  resetTune();
});
run('sim-seats', () => {
  const M = newMatch({ seed: 61 });
  const ev = fakeInput({ move: () => [1, 0] });
  const seat = SM.seatPlayer({ input: ev, name: 'P1', color: '#fff' }, M.players.find(q => q.side === 0 && q.pos === 4));
  check('a seat drives its player', seat.p && seat.p.pos === 4 && seat.p.seat === seat);
  SM.takeControl(seat, M.players.find(q => q.side === 0 && q.pos === 5));
  check('taking control moves the seat to another player', seat.p.pos === 5 && M.players.find(q => q.side === 0 && q.pos === 4).seat === null);
});

// ---------- the batch: CPU matches with no errors and no stalls ----------
run('ai-batch', () => {
  let stalls = 0, unfinished = 0, scores = 0;
  for (let k = 0; k < 6; k++) {
    const M = newMatch({ seed: 200 + k, venue: k % 4, home: 0, away: 1 + (k % 4), halves: 90 });
    let held = 0, last = M.phase;
    for (let n = 0; n < 120 * 700 && !M.over; n++) {
      SM.step(DT);
      M.events.length = 0;
      if (M.phase === last) held++; else { held = 0; last = M.phase; }
      if (held * DT > 45 && M.phase !== 'full' && M.phase !== 'play') { stalls++; break; }
    }
    if (!M.over) unfinished++;
    scores += M.score[0] + M.score[1];
  }
  check('no CPU match stalls in a phase', stalls === 0, 'stalls ' + stalls);
  check('every CPU match reaches full time', unfinished === 0, 'unfinished ' + unfinished);
  check('CPU matches score (average at least ten points a match)', scores / 6 >= 10, String(scores / 6));
});

// ---------- scenes: the flow, the attract, settings, results ----------
run('flow', () => {
  game.go('title'); game.advance(.5);
  check('the title waits for a press', game.debug.snapshot().scene === 'title');
  I.tap('start'); game.advance(.5);
  check('start opens the menu', game.debug.snapshot().scene === 'menu', game.debug.snapshot().scene);
  game.go('setup'); game.advance(.5);
  check('exhibition setup opens', game.debug.snapshot().scene === 'setup');
  game.go('match', { home: 0, away: 2, venue: 1, halves: 60 }); game.advance(2);
  const snap = game.debug.snapshot();
  check('a match starts from the setup', snap.scene === 'match' && (snap.phase === 'kickoff' || snap.phase === 'play') && snap.players.length === 14, snap.scene + ' ' + snap.phase);
  check('a human seat plays the match', snap.seats.length === 1 && snap.seats[0].pos === 4, JSON.stringify(snap.seats));
  check('the match has no errors so far', (game.errors || []).length === 0, (game.errors || []).map(e => e.message).slice(0, 2).join(' | '));
});
run('attract', () => {
  game.go('title'); game.advance(.5);
  game.advance(11, { draw: true });
  check('ten seconds idle on the title starts the attract demo', game.debug.snapshot().scene === 'match' && SM.M.attractOn === true);
  I.tap('pause'); game.advance(.1);
  game.go('title'); game.advance(.5);
});
run('settings', () => {
  game.settings.set('glyphs', 'xbox');
  check('the Xbox button symbols can be chosen', game.settings.glyphs === 'xbox');
  game.settings.set('glyphs', 'playstation');
  check('PlayStation is the default again', game.settings.glyphs === 'playstation');
  game.settings.set('difficulty', 'rookie');
  check('difficulty is a game setting', SM.difficulty === 'rookie');
  game.settings.set('difficulty', 'pro');
});
run('results', () => {
  game.go('results', { home: 'x', away: 'y', score: [14, 7], stats: [{ tries: 2, bigHits: 1, metres: 40, poss: 30 }, { tries: 1, bigHits: 0, metres: 30, poss: 20 }], cupMatch: false, attract: false, players: [] });
  game.advance(.6, { draw: true });
  check('results show after a match', game.debug.snapshot().scene === 'results');
  I.tap('confirm'); game.advance(.5);
  check('confirm leaves the results for the menu', game.debug.snapshot().scene === 'menu', game.debug.snapshot().scene);
});

// ---------- dev mode: the pause item opens the panel; the sliders, cheats and events work ----------
run('dev', () => {
  game.go('match', { home: 0, away: 1, venue: 0, halves: 120 }); game.advance(1.5);
  SM.devFromPause();
  game.advance(.2);
  check('dev mode from the pause menu opens the panel', SM.dev.open === true);
  SM.TUNE.set('runSpeed', 150);
  check('a slider changes the tuning', SM.TUNE.v.runSpeed === 150);
  SM.TUNE.reset();
  check('reset restores every default', SM.TUNE.v.runSpeed === 100 && SM.TUNE.v.halfLength === 120);
  SM.CHEATS.godMode = true;
  SM.CHEATS.godMode = false;
  check('cheats toggle', SM.CHEATS.godMode === false);
  const before = SM.M.score[0];
  SM.devTry(0);
  check('the try event fires from the panel', SM.M.score[0] === before + 5, String(SM.M.score));
  SM.dev.open = false;
});

// ---------- the cup: a save per win and the story beats ----------
run('cup', () => {
  E.store.set('smashby:cup', { round: 0, won: 0 });
  game.go('cup'); game.advance(.5);
  check('the cup hub opens', game.debug.snapshot().scene === 'cup');
  game.go('results', { home: 'Mudlarks', away: 'Badgers', score: [9, 3], stats: [{ tries: 2, bigHits: 0, metres: 0, poss: 0 }, { tries: 0, bigHits: 0, metres: 0, poss: 0 }], cupMatch: true, round: 0, attract: false, players: [] });
  game.advance(1.2);
  I.tap('confirm'); game.advance(1);
  check('a cup win saves the next round', E.store.get('smashby:cup', {}).round === 1, JSON.stringify(E.store.get('smashby:cup', {})));
  E.store.set('smashby:cup', { round: 0, won: 0 });
});

// ---------- the whole Mega Cup, scripted: four matches with the CPU brain in the human's seat ----------
run('playthrough', () => {
  E.store.set('smashby:cup', { round: 0, won: 0 });
  SM.TUNE.set('halfLength', 40);
  const rounds = [0, 1, 2, 3];
  let attemptsLost = 0;
  for (let k = 0; k < 30 && E.store.get('smashby:cup', { round: 0 }).round < 4; k++) {
    const round = E.store.get('smashby:cup', { round: 0 }).round;
    game.go('story', { cup: true, round }); game.advance(1);
    check('round ' + (round + 1) + ' story opens', game.debug.snapshot().scene === 'story', game.debug.snapshot().scene);
    for (let w = 0; w < 40 * 4 && game.debug.snapshot().scene === 'story'; w++) game.advance(.25);
    const M0 = SM.M;
    if (game.debug.snapshot().scene !== 'match') { check('round ' + (round + 1) + ' starts its match', false, game.debug.snapshot().scene); break; }
    for (let w = 0; w < 240 && SM.M.phase === 'kickoff'; w++) game.advance(DT);
    const seat = SM.M.seats[0];
    seat.input = fakeInput({
      move: () => { const p = seat.p; if (!p) return [0, 0]; const it = SM.brain(p, DT); seat._it = it; return [it.mx || 0, it.my || 0]; },
      down: a => (a === 'turbo' ? !!(seat._it && seat._it.turbo) : false),
      pressed: a => { const it = seat._it || {}; const pr = it.press || {}; return (a === 'x' && (pr.x || pr.tackleTap || pr.mash || pr.scrumPress)) || (a === 'sq' && (pr.sq || pr.jackal)) || (a === 'l1' && pr.passUp) || (a === 'r1' && pr.passDown) || (a === 'ci' && pr.ci); },
      released: a => a === 'x' && !!(seat._it && seat._it.xReleased),
    });
    let guard = 0;
    while (!SM.M.over && guard++ < 120 * 700) {
      // a penalty against the human side waits on the menu: the autopilot takes the tap (the menu itself is the game's)
      if (SM.M.phase === 'penalty' && SM.M.pen && !SM.M.pen.choice) SM.M.pen.choice = 'tap';
      game.advance(DT);
    }
    const M = SM.M;
    check('round ' + (round + 1) + ' is played to full time', M.over === true && M.phase === 'full', M.phase);
    check('round ' + (round + 1) + ' has no errors', (game.errors || []).length === 0, (game.errors || []).map(e => e.message).slice(0, 1).join(' | '));
    // the results: a win saves the next round (the results scene does that); a loss stays on the round
    const won = M.score[0] > M.score[1];
    if (!won) { attemptsLost++; check('a lost round stays on its round (retry)', E.store.get('smashby:cup', { round: 0 }).round === round, 'lost ' + attemptsLost); }
    for (let w = 0; w < 40 && game.debug.snapshot().scene !== 'results'; w++) game.advance(.1);
    game.advance(.5); I.tap('confirm');
    for (let w = 0; w < 40 && game.debug.snapshot().scene === 'results'; w++) game.advance(.1);
    game.advance(.5);
    const c = E.store.get('smashby:cup', { round: 0 });
    check('the cup record moves on after a win', won ? c.round === round + 1 : c.round === round, JSON.stringify(c) + ' won=' + won);
    if (c.round >= 4) break;
  }
  check('the cup record is four rounds', E.store.get('smashby:cup', {}).round >= 4, JSON.stringify(E.store.get('smashby:cup', {})));
  SM.TUNE.reset();
  E.store.set('smashby:cup', { round: 0, won: 0 });
});

const dt = Math.round((Date.now() - started) / 100) / 10;
const count = `${passed} passed, ${failed} failed (${suites} suites, ${dt} s)`;
for (const f of failures) console.log('FAIL ' + f);
console.log(count);
process.exit(failed ? 1 : 0);
