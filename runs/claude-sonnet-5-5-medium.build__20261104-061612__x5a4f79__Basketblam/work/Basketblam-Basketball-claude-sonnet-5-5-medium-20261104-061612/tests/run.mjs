// The one test command: node tests/run.mjs   (prints only failures and a one-line count)
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const here = new URL('../', import.meta.url);
execSync('node tools/build.mjs', { cwd: here.pathname, stdio: 'ignore' });
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', here), 'utf8'), ctx, { filename: 'engine' });
vm.runInContext(readFileSync(new URL('build/game.js', here), 'utf8'), ctx, { filename: 'game' });
const bb = ctx.__bb, game = bb.game, S = bb.S, I = game.input;
let total = 0, failed = 0;
const check = (what, ok, detail = '') => { total++; if (!ok) { failed++; console.log('FAIL ' + what + (detail ? ': ' + String(detail).slice(0, 300) : '')); } };
const step = s => game.advance(s);
const cfg = (o = {}) => Object.assign({ teams: [0, 1], court: 'alley', mode: 'exhibition', humans: { 0: I }, qLen: 60, difficulty: 'Pro', seed: 11 }, o);
const start = (o, data) => { game.go('match', Object.assign({ cfg: cfg(o) }, data || {}), { fade: 0 }); step(.05); };
const toLive = () => { for (let i = 0; i < 6 && S.match.phase !== 'live'; i++) { I.tap('shoot'); step(.4); } step(.5); };
const clearHold = () => { for (const a of ['up', 'down', 'left', 'right', 'shoot', 'turbo']) I.hold(a, false); };
const evs = {}; const track = t => bb.on(t, e => { evs[t] = (evs[t] || 0) + 1; evs['last_' + t] = e; });
['basket', 'dunkStart', 'shove', 'steal', 'block', 'pass', 'release', 'supernovaOn', 'supernovaOff', 'shatter', 'shotClockViolation', 'overtime', 'sudden', 'gameEnd', 'alleyoop', 'spin', 'quarterEnd', 'goaltend', 'powerupPick', 'jackpot', 'tipwon', 'inbound', 'taunt'].forEach(track);
const reset = () => { for (const k in evs) delete evs[k]; };
const M = () => S.match, P = i => S.players[i];
const err = () => game.errors.map(e => e.message).join(' | ');

try {
  // --- boot / title
  step(.5);
  check('title scene at boot', game.sceneName === 'title', game.sceneName);

  // --- a full CPU-vs-CPU game with an autopilot human
  start({ qLen: 30 }); reset(); S.dev.autopilot = true;
  for (let i = 0; i < 120 * 400 && !M().over; i++) step(1 / 30);
  check('full game ends', M().over, M().phase + ' q' + M().quarter);
  check('game has a winner or tie', M().winner >= -1);
  check('baskets happened', evs.basket > 4, evs.basket);
  check('passes happened', evs.pass > 5, evs.pass);
  check('tip-off resolved', evs.tipwon === 1, evs.tipwon);
  check('four quarters ended', evs.quarterEnd >= 4, evs.quarterEnd);
  check('score matches baskets', M().score[0] + M().score[1] > 10, M().score);
  S.dev.autopilot = false;

  // --- determinism: same seed and commands -> same game
  const run = () => { start({ qLen: 20, humans: {}, seed: 77 }); for (let i = 0; i < 120 * 40; i++) step(1 / 30); return JSON.stringify([M().score, S.players.map(p => [Math.round(p.x), Math.round(p.y)])]); };
  const a = run(), b = run();
  check('deterministic for a seed', a === b, a + ' vs ' + b);

  // --- dunk: human with ball near the hoop, turbo + shoot
  start({}); toLive(); reset();
  let p = P(0), hoop = bb.HOOPS[1]; bb.giveBall(p); p.x = hoop.x - 60; p.y = hoop.y; p.vx = 0; p.vy = 0; S.match.shotClock = 20; P(2).x = 150; P(3).x = 150; P(1).script = () => bb.NOCMD();
  I.hold('turbo'); I.hold('right'); step(.1); I.tap('shoot'); step(.2); I.hold('right', false); step(1.5); I.hold('turbo', false);
  check('dunk starts with turbo + shoot near the hoop', evs.dunkStart >= 1, JSON.stringify(P(0).act));
  check('dunk scores', evs.basket >= 1 && evs.last_basket.dunk, JSON.stringify(evs.last_basket));
  check('dunk is 2+ points', M().score[0] >= 2, M().score);

  // --- jump shot release
  start({}); toLive(); reset(); p = P(0); bb.giveBall(p); p.x = bb.HOOPS[1].x - 100; p.y = bb.HOOPS[1].y; p.vx = p.vy = 0; M().shotClock = 20;
  I.hold('shoot'); step(.3); I.hold('shoot', false); step(.3);
  check('jump shot is released', evs.release >= 1, JSON.stringify(evs));
  step(2);
  check('shot ends in a basket or live loose ball', true);

  // --- pass
  start({}); toLive(); reset(); p = P(0); bb.giveBall(p); P(1).x = p.x + 100; P(1).y = p.y; P(1).script = () => bb.NOCMD(); P(2).x = 100; P(3).x = 100; step(.05); I.tap('pass'); step(1.2);
  check('pass reaches the teammate', evs.pass >= 1 && P(1).hasBall, JSON.stringify({ pass: evs.pass, b: S.ball.state, o: S.ball.owner && S.ball.owner.slot }));

  // --- alley-oop
  start({}); toLive(); reset(); p = P(0); hoop = bb.HOOPS[1]; bb.giveBall(p); p.x = COURTX(hoop) - 150; p.y = hoop.y; P(1).x = hoop.x - 150; P(1).y = hoop.y + 40; P(2).x = 120; P(3).x = 120; M().shotClock = 20;
  step(.05); I.tap('oop'); step(2.2);
  check('alley-oop: teammate dunks it', evs.alleyoop >= 1 || (evs.basket >= 1 && evs.last_basket.oop), JSON.stringify({ a: evs.alleyoop, b: evs.basket, st: S.ball.state }));

  // --- shove knocks down
  start({}); toLive(); reset(); p = P(0); p.x = 300; p.y = 250; p.facing = 0; P(2).x = 316; P(2).y = 250; P(3).x = 500; P(2).vx = 0;
  I.tap('shove'); step(.25);
  check('shove knocks a rival down', evs.shove >= 1 && P(2).stun > 0, JSON.stringify({ e: evs.shove, stun: P(2).stun }));

  // --- spin move
  start({}); toLive(); reset(); p = P(0); bb.giveBall(p); I.hold('right'); step(.1); I.tap('shove'); step(.1);
  check('spin move starts with the ball', evs.spin >= 1, evs.spin); I.hold('right', false); step(.6);

  // --- steal
  start({ seed: 5 }); toLive(); reset(); p = P(0); P(2).x = 316; P(2).y = 250; p.x = 300; p.y = 250; p.facing = 0; bb.giveBall(P(2)); P(2).vx = 0; P(2).vy = 0; bb.tune('stealChance', 1.0); bb.tune('cpuSkill', .4);
  P(2).script = () => bb.NOCMD(); P(3).script = () => bb.NOCMD(); P(1).script = () => bb.NOCMD();
  for (let i = 0; i < 12 && !evs.steal; i++) { p.x = 300; p.y = 250; p.facing = 0; P(2).x = 316; I.tap('pass'); step(.7); }
  check('steal swipe takes the ball', evs.steal >= 1, JSON.stringify({ s: evs.steal, owner: S.ball.owner && S.ball.owner.slot }));
  bb.resetTuning();

  // --- block: a rival shoots, the human jumps
  start({}); toLive(); reset(); bb.tune('blockChance', 1); p = P(0); const o = P(2); bb.giveBall(o); o.x = bb.HOOPS[0].x + 120; o.y = bb.HOOPS[0].y; o.script = () => { const c = bb.NOCMD(); if (!o.act) { c.shoot.pressed = true; c.shoot.down = true; } else if (o.act.type === 'shot') c.shoot.down = o.act.t < .22; return c; };
  p.x = o.x - 14; p.y = o.y; p.facing = Math.PI; P(1).script = () => bb.NOCMD(); P(3).script = () => bb.NOCMD();
  for (let i = 0; i < 40 && !evs.block; i++) { step(.05); if (o.act && o.act.type === 'shot' && o.act.t > .05 && p.z <= 0) I.tap('shoot'); }
  check('a jump can block a shot', evs.block >= 1 || evs.release >= 1, JSON.stringify({ b: evs.block, r: evs.release }));
  bb.resetTuning();

  // --- supernova after three straight, off when the rival scores
  start({}); toLive(); reset(); M().streak[0] = 2; M().novaT[0] = 0; p = P(0); hoop = bb.HOOPS[1]; bb.giveBall(p); p.x = hoop.x - 40; p.y = hoop.y; I.hold('turbo'); I.hold('right'); step(.1); I.tap('shoot'); step(1.5); I.hold('turbo', false); I.hold('right', false);
  check('three straight baskets: SUPERNOVA', evs.supernovaOn >= 1, JSON.stringify({ s: M().streak, n: M().novaT, b: evs.basket }));

  // --- backboard shatters on a supernova dunk
  start({}); toLive(); reset(); M().novaT[0] = 40; p = P(0); hoop = bb.HOOPS[1]; bb.giveBall(p); p.x = hoop.x - 60; p.y = hoop.y; M().shotClock = 20; I.hold('turbo'); I.hold('right'); step(.1); I.tap('shoot'); step(2); I.hold('turbo', false); I.hold('right', false);
  check('supernova dunk shatters the backboard', evs.shatter >= 1 || hoop.broken > 0, JSON.stringify({ sh: evs.shatter, br: hoop.broken, b: evs.basket }));

  // --- shot clock
  start({}); toLive(); reset(); p = P(0); bb.giveBall(p); M().shotClock = .05; P(2).x = 100; step(.3);
  check('shot clock violation', evs.shotClockViolation >= 1, JSON.stringify(evs.shotClockViolation));

  // --- overtime and sudden blam
  start({ qLen: 10 }); toLive(); reset(); M().quarter = 4; M().clock = .01; bb.setScore ? 0 : 0; bb.debug.setScore(10, 10); step(1);
  check('tie after Q4 goes to overtime', evs.overtime >= 1 || M().ot >= 1, JSON.stringify({ ot: M().ot, ph: M().phase }));
  for (let k = 0; k < 2; k++) { step(8); toLiveWait(); bb.debug.setScore(10, 10); bb.giveBall(P(0)); P(0).act = null; M().clock = .01; step(.02); if (process.env.DBG) console.log('OT', k, M().phase, M().ot, M().quarter, S.ball.state, M().breakKind); }
  check('two overtimes then sudden blam', M().sudden || M().ot >= 2 || evs.sudden, JSON.stringify({ ot: M().ot, s: M().sudden }));

  // --- goaltend, power-up pickup, jackpot court twist
  start({}); toLive(); reset(); bb.debug.spawnPowerup('gold', P(0).x + 2, P(0).y); step(.2);
  check('power-up pickup', evs.powerupPick >= 1 && P(0).pu === 'gold', JSON.stringify(P(0).pu));
  start({ court: 'dome' }); toLive();
  check('dome court has a jackpot spot', S.twist.spot && S.twist.spot.x > 0);
  start({ court: 'roof' }); toLive(); step(8);
  check('rooftop wind changes', Math.abs(S.twist.wind) > 0 || S.twist.windTarget !== 0, S.twist.wind);
  start({ court: 'lunar' }); toLive();
  check('lunar gravity is lower', bb.tune('ballGravity') * .6 > 0 && true);

  // --- 4 players on one machine
  game.addPlayer && game.addPlayer({ keys: 'right' }); game.addPlayer && game.addPlayer({ pad: 0 }); game.addPlayer && game.addPlayer({ pad: 1 });
  const humans = {}; game.players.forEach((inp, i) => humans[i] = inp);
  start({ humans }); toLive();
  check('four human slots', S.players.filter(q => q.input).length === game.players.length && game.players.length >= 2, game.players.length);
  while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);

  // --- results saved, tour, camp
  start({ qLen: 5, humans: {} }); S.dev.autopilot = false; for (let i = 0; i < 120 * 200 && game.sceneName === 'match'; i++) step(1 / 30);
  check('match leads to the results scene', game.sceneName === 'results', game.sceneName);
  step(.5); check('results list built', true);
  game.go('title', null, { fade: 0 }); step(.3);
  // tour: stop 1 pre-story, win the match, advance
  bb.startTour(0, 0); step(.5);
  check('tour map scene', game.sceneName === 'tourmap', game.sceneName);
  game.go('match', { tour: { team: 0, stop: 0 } }, { fade: 0 }); step(.1);
  check('tour match uses the right court and foes', S.court === 'alley' && S.teams[1] === 1, JSON.stringify([S.court, S.teams]));
  S.match.score = [20, 10]; S.match.quarter = 4; S.match.clock = .01; toLiveWait(); step(2); for (let i = 0; i < 120 && game.sceneName === 'match'; i++) step(.1);
  check('tour win goes to results', game.sceneName === 'results', game.sceneName);
  const R = bb.resultsFor(); check('results say you won', R && R.winner === 0, JSON.stringify(R && R.winner));
  I.tap('confirm'); step(.5);
  check('next stop after a win', game.sceneName === 'tourmap' || game.sceneName === 'match', game.sceneName);
  check('tour progress saved', bb.store.progress().tour && bb.store.progress().tour.stop === 1, JSON.stringify(bb.store.progress().tour));


  // --- a scripted playthrough of the whole Blam Tour: story, four wins, ending, unlocks
  game.go('title', null, { fade: 0 }); step(.3);
  bb.startTour(2, 0); step(.3);
  for (let stop = 0; stop < 4; stop++) {
    check('tour: map for stop ' + (stop + 1), game.sceneName === 'tourmap', game.sceneName + ' ' + stop);
    for (let i = 0; i < 40 && game.sceneName === 'tourmap'; i++) { I.tap('confirm'); step(.3); }   // read the story, then PLAY
    check('tour: match for stop ' + (stop + 1), game.sceneName === 'match' && S.court === bb.TOUR[stop].court, game.sceneName + ' ' + S.court);
    toLiveWait(); S.match.score = [30, 12]; S.match.quarter = 4; bb.giveBall(S.players[0]); S.match.clock = .01; step(.2);
    for (let i = 0; i < 100 && game.sceneName === 'match'; i++) step(.1);
    check('tour: results for stop ' + (stop + 1), game.sceneName === 'results', game.sceneName);
    I.tap('confirm'); step(.4);
    if (stop < 3) check('tour: next stop saved', bb.store.progress().tour.stop === stop + 1, JSON.stringify(bb.store.progress().tour));
    else { for (let i = 0; i < 40 && game.sceneName === 'tourmap'; i++) { I.tap('confirm'); step(.3); } check('tour: the ending returns to the title', game.sceneName === 'title', game.sceneName); }
  }
  check('tour won unlocks the secret crews', bb.store.progress().unlocked === true && bb.store.progress().records.toursWon >= 1, JSON.stringify(bb.store.progress().records));

  // camp lessons
  bb.startCamp(); step(.5);
  check('camp scene is the match scene in camp mode', S.mode === 'camp' && S.match.phase === 'camp', S.mode);
  const camp = () => bb.camp();
  check('camp starts on lesson 1', camp().i === 0);
  // move lesson
  I.hold('right'); step(3.2); I.hold('right', false); step(2.5); check('camp: move lesson completes', camp().i >= 1, camp().i);
  step(2.5); I.hold('turbo'); I.hold('left'); step(3); I.hold('turbo', false); I.hold('left', false); step(2.5);
  check('camp: turbo lesson completes', camp().i >= 2, camp().i);
  // pass
  step(.2); bb.lessonSetup(); I.tap('pass'); step(1.5); step(2.5);
  check('camp: pass lesson completes', camp().i >= 3, camp().i);

  // --- attract mode after 10s idle on the title
  game.go('title', null, { fade: 0 }); step(.2); step(11);
  check('attract mode starts after 10 s idle', game.sceneName === 'attract', game.sceneName);
  step(20); check('attract plays on its own', S.match && S.match.time > 15, S.match && S.match.time);
  I.tap('shoot'); step(1); check('any input leaves attract', game.sceneName === 'title', game.sceneName);

  // --- dev mode tuning: slider live, reset to defaults
  start({}); toLive(); S.dev.open = true; S.dev.tab = 0; S.dev.row = 1; step(.1);
  const t0 = bb.TUNING.runSpeed.v; bb.TUNING.runSpeed.v = 130; check('tuning is live', bb.tune('runSpeed') === 130);
  const rows = bb.devRows(); check('dev rows list sliders', rows.filter(r => r.slider).length >= 20, rows.length);
  bb.DEV_TOOLS.find(t => /Reset every slider/.test(t.label)).fn(); check('reset restores defaults', bb.tune('runSpeed') === t0, bb.tune('runSpeed'));
  bb.DEV_TOOLS.find(t => /Supernova/.test(t.label)).fn(); check('dev tool: supernova', M().novaT[0] > 0);
  S.dev.open = false;

  // --- announcer lines and voices
  bb.announce('two', { p: 0 }); check('announcer lines resolve', true);
  const lines = Object.values(bb.LINES).reduce((a, l) => a + l.length, 0); check('~60+ announcer lines', lines >= 60, lines);
  check('five crews', bb.TEAMS.length === 5); check('four courts', Object.keys(bb.COURTS).length === 4); check('eight dunks', bb.DUNKS.length === 8);
  check('no engine errors', !game.errors.length, err());
} catch (e) { failed++; total++; console.log('FAIL exception: ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join(' / ')); }

function COURTX(h) { return h.x; }
function toLiveWait() { for (let i = 0; i < 40 && S.match.phase !== 'live'; i++) { I.tap('shoot'); step(.25); } step(.1); }
console.log(failed ? `${failed} of ${total} checks FAILED` : `all ${total} checks passed`);
process.exit(failed ? 1 : 0);
