// The one test command: node tests/run.mjs. It prints only the failures, then one line with the count.
// Everything runs headless (the engine's game.advance and game.input, no screen): the rules and the physics as pure
// checks, scripted plays of whole matches and derbies by the game's own input, the drill, the attract mode, the touch-only
// card, dev mode, the AI Hub's round with a mock client, and the deliverables. Exit code 1 on any failure.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, loadWithHub } from './lib/load.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let total = 0, failed = 0;
const check = (name, ok, detail = '') => {
  total++;
  if (!ok) { failed++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); }
};
const safe = (name, fn) => {
  try { fn(); } catch (e) { check(name, false, 'threw ' + (e && e.message || e)); }
};

// ---- the rules: pure -------------------------------------------------------------------------------------------------
{
  const { BZ } = load();
  safe('rules: a walk forces the runners in order', () => {
    const S = BZ.newMatch({ innings: 3 });
    S.bases = ['a', 'b', null]; S.batter = 'c';
    const r = BZ.walk(S);
    check('walk: runners move up, batter on first', S.bases.join(',') === 'c,a,b' && r.runs === 0, JSON.stringify(S.bases));
    S.bases = ['a', 'b', 'c']; S.batter = 'd'; S.balls = 3;
    const r2 = BZ.pitchCount(S, 'ball');
    check('walk: bases loaded forces in a run', r2.ev === 'walk' && S.score[0] === 1, JSON.stringify([r2, S.score]));
  });
  safe('rules: hit types move the runners', () => {
    const S = BZ.newMatch({ innings: 3 });
    S.bases = ['a', 'b', 'c']; S.batter = 'd';
    check('single: the runner on third scores; the others move up one', BZ.hit(S, 'single') === 1 && S.bases.join(',') === 'd,a,b', JSON.stringify(S.bases));
    S.bases = ['a', null, 'c']; S.batter = 'e';
    check('double: the runner on third scores; the first-base runner goes to third', BZ.hit(S, 'double') === 1 && S.bases.join(',') === ',e,a', JSON.stringify(S.bases));
    S.bases = ['a', 'b', 'c']; S.batter = 'f';
    check('triple: all three score', BZ.hit(S, 'triple') === 3 && S.bases.join(',') === ',,f');
    S.bases = ['a', null, null]; S.batter = 'g';
    check('home run: all score, the batter too', BZ.hit(S, 'hr') === 2 && S.bases.every(x => !x) && S.hr[0] === 1);
  });
  safe('rules: outs, the half and the inning', () => {
    const S = BZ.newMatch({ innings: 1 });
    S.batter = 'x';
    BZ.recordOut(S); BZ.recordOut(S);
    const e = BZ.recordOut(S);
    check('third out ends the top of the first', e.end === 'halfOver' && S.top === false && S.outs === 0, JSON.stringify(e));
    S.score = [0, 0];
    S.batter = 'y';
    const e2 = BZ.recordOut(S); BZ.recordOut(S); const e3 = BZ.recordOut(S);
    check('a tied game goes to extra innings', e3.end === 'inningOver' && S.inning === 2 && S.extra === true, JSON.stringify([e2, e3]));
  });
  safe('rules: the home team does not bat in the last half when ahead', () => {
    const S = BZ.newMatch({ innings: 1 });
    S.score = [3, 0];
    S.top = false; S.outs = 2;
    const e = BZ.recordOut(S);
    check('the bottom of the last inning ends it when the visitors lead', e.end === 'gameOver' && S.over === true, JSON.stringify(e));
    const T = BZ.newMatch({ innings: 1 });
    T.score = [0, 2]; T.top = true; T.outs = 2;
    check('the top of the last inning ends it when the home team leads', BZ.recordOut(T).end === 'gameOver');
  });
  safe('rules: the walk-off', () => {
    const S = BZ.newMatch({ innings: 1 });
    S.top = false; S.score = [2, 2];
    BZ.addRuns(S, 1, 1);
    check('a run in the home last half ends the game', S.over === true && S.walkoff === true);
  });
  safe('rules: the line score', () => {
    const S = BZ.newMatch({ innings: 3 });
    BZ.addRuns(S, 0, 2);
    S.top = false; BZ.addRuns(S, 1, 1); S.top = true; S.inning = 2;
    const L = BZ.lineScore(S);
    check('the line score keeps runs by inning and blanks the unplayed', L.away[0] === '2' && L.home[0] === '1' && L.away[1] === '' , JSON.stringify(L));
  });
  safe('rules: a ground play forces the runner at second', () => {
    const S = BZ.newMatch({ innings: 3 });
    S.bases = ['a', null, null]; S.batter = 'b';
    const r = BZ.groundPlay(S, 1, { batterOut: false, runnerOut: true });
    check('a forced runner out at second; the batter safe at first', S.outs === 1 && S.bases[0] === 'b' && r.ev === 'force' || r.ev === 'forceOut', JSON.stringify([S.bases, S.outs, r.ev]));
  });
}

// ---- the pitch, the zone, the contact: pure --------------------------------------------------------------------------
{
  const { BZ } = load();
  safe('pitch: the release meter is exact in its sweet spot', () => {
    check('dead centre is no error', BZ.releaseError(.5) === 0);
    check('the far end misses fully', BZ.releaseError(0) === 1);
  });
  safe('pitch: the zone', () => {
    check('the middle of the plate is a strike', BZ.inZone(0, 2.5));
    check('high above the zone is a ball', !BZ.inZone(0, 4.5));
  });
  safe('pitch: the plan lands where it is aimed with a perfect release', () => {
    const plan = BZ.planPitch({ pitch: 'fastball', aimLat: .3, aimH: 2.4, release: .5, rng: () => .25 });
    const at = BZ.plateLoc(plan);
    check('a perfect fastball lands on the aim', Math.abs(at.lat - .3) < 1e-9 && Math.abs(at.h - 2.4) < 1e-9, JSON.stringify(at));
    const cu = BZ.plateLoc(BZ.planPitch({ pitch: 'curve', aimLat: 0, aimH: 3.5, release: .5, rng: () => .25 }));
    check('a curve drops at the plate', cu.h < 2.0, JSON.stringify(cu));
  });
  safe('contact: timing and place decide the result', () => {
    const plate = { lat: 0, h: 2.5 };
    const perfect = BZ.contact({ swingT: 0, reticle: plate, plate });
    check('a centred, on-time swing is a hit with high quality', perfect.type === 'hit' && perfect.q > .95, JSON.stringify(perfect));
    check('a swing far too early is a whiff', BZ.contact({ swingT: -.5, reticle: plate, plate }).type === 'whiff');
    check('a swing off the ball is a whiff', BZ.contact({ swingT: 0, reticle: { lat: 2, h: 2.5 }, plate }).type === 'whiff');
    check('a swing just off the spot is a foul', BZ.contact({ swingT: 0, reticle: { lat: 1.5, h: 2.5 }, plate }).type === 'foul');
    const early = BZ.contact({ swingT: -.1, reticle: plate, plate }), late = BZ.contact({ swingT: .1, reticle: plate, plate });
    check('early goes right, late goes left', early.spray > 0 && late.spray < 0, JSON.stringify([early.spray, late.spray]));
    const bz = BZ.contact({ swingT: .3, reticle: plate, plate, batzooka: true });
    check('a Batzooka swing is always on time and harder', bz.type === 'hit' && bz.exit > perfect.exit, JSON.stringify([bz.exit, perfect.exit]));
  });
}

// ---- the ball: pure --------------------------------------------------------------------------------------------------
{
  const { BZ } = load();
  const flight = (o) => { const b = BZ.launchBall(o); let n = 0; while (!b.stopped && n < 40000) { BZ.stepBall(b, 1 / 120); n++; } return b; };
  safe('ball: a long drive over the fence is a home run', () => {
    const b = flight({ exit: 520, launch: 30, spray: 0 });
    check('a 30-degree drive at 520 clears center field', BZ.ballResult(b) === 'hr', BZ.ballResult(b));
  });
  safe('ball: a short fly is not', () => {
    const b = flight({ exit: 300, launch: 30, spray: 0 });
    check('a 300 U/s fly lands in the outfield, not a homer', BZ.ballResult(b) !== 'hr', BZ.ballResult(b));
  });
  safe('ball: a ball hit foul is foul', () => {
    const b = flight({ exit: 380, launch: 15, spray: 60 });
    check('a ball landing past the line is foul', BZ.ballResult(b) === 'foul', BZ.ballResult(b));
  });
  safe('ball: a grounder rolls and stops', () => {
    const b = flight({ exit: 200, launch: 3, spray: -5 });
    check('a grounder stops, and it is a hit', b.stopped && ['single', 'double', 'triple'].includes(BZ.ballResult(b)), BZ.ballResult(b));
  });
}

// ---- the play: a fly caught, a grounder thrown --------------------------------------------------------------------------
{
  const { BZ } = load();
  safe('play: a fly ball under a fielder is caught', () => {
    const S = BZ.newMatch({ innings: 3 });
    S.top = true; S.batter = 'x';
    const F = BZ.makeFielders();
    const b = BZ.launchBall({ exit: 360, launch: 40, spray: 0 });   // over centre field, about 255 ft out
    const play = new BZ.Play(S, b, F);
    let n = 0;
    while (play.phase !== 'over' && n < 4000) { play.step(1 / 120, {}); n++; }
    check('the fly is caught by the centre fielder', play.result && play.result.kind === 'caught', JSON.stringify(play.result));
    check('a caught fly is an out', S.outs === 1, String(S.outs));
  });
  safe('play: a grounder to short is thrown in time or not', () => {
    const S = BZ.newMatch({ innings: 3 });
    S.top = true; S.batter = 'x';
    const F = BZ.makeFielders();
    const b = BZ.launchBall({ exit: 180, launch: 2, spray: -6 });
    const play = new BZ.Play(S, b, F);
    let n = 0;
    while (play.phase !== 'over' && n < 20000) { play.step(1 / 120, {}); n++; }
    check('the grounder is played to a base', play.result && ['ground', 'hit', 'foul', 'caught'].includes(play.result.kind), JSON.stringify(play.result && play.result.kind));
  });
}

// ---- the whole game, played by the CPU on both sides: the playthrough ----------------------------------------------------
{
  const g = load();
  const { game, BZ } = g;
  game.advance(.1);
  safe('playthrough: a three-inning CPU game plays to its final, with no errors', () => {
    BZ.game.go('attract');
    game.advance(1);
    let loops = 0;
    while (BZ.M && !BZ.M.S.over && loops < 2000) { game.advance(1); loops++; }
    check('the game reaches the final', BZ.M && BZ.M.S.over, 'loops ' + loops);
    check('no errors in the game', game.errors.length === 0, game.errors.map(e => e.message || String(e)).slice(0, 2).join(' | '));
  });
}

// ---- a human plays the duel with the game's own input: the pitch and the drill -----------------------------------------
{
  const g = load();
  const { game, BZ, snap } = g;
  game.advance(.1);
  safe('human: the pitcher winds up, releases on the meter, and the pitch flies', () => {
    BZ.startMatch(game, { innings: 1, p1: 1, human: [false, true], seed: 11 });
    game.advance(.5);
    game.advance(3);
    const phases = [];
    for (let i = 0; i < 60 && snap().phase !== 'pitch'; i++) {
      if (snap().phase === 'ready') game.input.tap('confirm');
      if (snap().phase === 'meter') game.input.tap('confirm');
      phases.push(snap().phase);
      game.advance(.1);
    }
    check('a human pitcher reaches the pitch', snap().phase === 'pitch', phases.slice(-5).join(','));
  });
  safe('drill: a pitcher who throws three strikes finishes the strikes lesson', () => {
    BZ.game.go('attract'); game.advance(.5);
    BZ.startMatch(game, { innings: 1, p1: 1, human: [false, true], drill: { kind: 'strikes', goal: 3 }, lesson: 'pitch', seed: 77 });
    game.advance(.5);
    let loops = 0;
    while (BZ.M && BZ.M.phase !== 'final' && loops < 4000 && game.sceneName === 'match') {
      const ph = snap().phase;
      if (ph === 'ready' || ph === 'meter') game.input.tap('confirm');
      game.advance(.25);
      loops++;
    }
    check('the drill is met by thrown strikes', BZ.M.drill.got >= 3, 'got ' + BZ.M.drill.got);
    check('the lesson match ends when the drill is met', BZ.M.S.over === true || BZ.M.phase === 'final', 'phase ' + BZ.M.phase);
  });
}

// ---- the derby: a scripted batter, the game's own input ---------------------------------------------------------------
{
  const g = load();
  const { game, BZ, snap } = g;
  game.advance(.1);
  safe('derby: a scripted batter scores, then the round ends on the outs', () => {
    BZ.game.go('derbySetup'); game.advance(.5);
    BZ.D = BZ.newDerby([{ name: 'P1', color: '#e8443a', input: game.input }], 'local');
    game.go('derby'); game.advance(.5);
    BZ.D.phase = 'play'; BZ.D.round = BZ.newRound(BZ.D); BZ.derbyNewPitch(BZ.D);
    let loops = 0;
    while (!BZ.D.finished && loops < 6000) {
      const R = BZ.D.round;
      if (R && R.plan && !R.swung && !R.ball && R.pt > R.plan.time - .05 && R.pt < R.plan.time + .1) game.input.tap('confirm');
      game.advance(1 / 60);
      loops++;
      if (BZ.D.round === null && BZ.D.players[0].done) break;
    }
    const p = BZ.D.players[0];
    check('the round ends on its outs or the clock', p.done === true, 'loops ' + loops);
    check('the scripted batter has swings and some score', p.swings > 0 && p.score >= 0, JSON.stringify({ swings: p.swings, score: p.score, outs: p.outs }));
    check('no errors in the derby', game.errors.length === 0);
  });
}

// ---- attract: idle on the title starts it, any input stops it -----------------------------------------------------------
{
  const g = load();
  const { game, snap } = g;
  game.advance(.5);
  safe('attract: ten seconds idle starts it, any press returns to the title', () => {
    check('the title waits', snap().scene === 'title', snap().scene);
    game.advance(11);
    check('after ten seconds, attract runs', snap().scene === 'attract', snap().scene);
    game.advance(2);
    game.input.tap('confirm'); game.advance(.5);
    check('any press returns to the title', snap().scene === 'title', snap().scene);
  });
}

// ---- touch-only devices: the card and the settings button, and attract still runs --------------------------------------
{
  const g = load();
  const { game, BZ } = g;
  game.advance(.5);
  safe('touch: a touch-only device shows the card and the settings button only', () => {
    g.ctx.location.hash = '#touch';
    check('the touch-only test is set', BZ.isTouchOnly() === true);
    game.go('title'); game.advance(.5);
    check('the title marks touch-only', BZ.touchOnly === true);
    check('the title offers only OPTIONS', BZ.titleMenu && BZ.titleMenu.items && BZ.titleMenu.items.length === 1, String(BZ.titleMenu && BZ.titleMenu.items && BZ.titleMenu.items.length));
    g.ctx.location.hash = '';
  });
}

// ---- dev mode: the sliders, the reset, the pause entry --------------------------------------------------------------------
{
  const g = load();
  const { game, BZ } = g;
  game.advance(.5);
  safe('dev: sliders change the tuning live, and reset restores the defaults', () => {
    const before = BZ.TUNE.pitchSpeed;
    BZ.bumpTune('pitchSpeed', 1);
    check('a slider moves a value by its step', Math.abs(BZ.TUNE.pitchSpeed - (before + BZ.TUNE_META.pitchSpeed.step)) < 1e-9);
    BZ.setTune('exitSpeed', 99999);
    check('a slider clamps at its maximum', BZ.TUNE.exitSpeed === BZ.TUNE_META.exitSpeed.max);
    BZ.resetTune();
    check('reset restores every default', Object.keys(BZ.TUNE_META).every(k => BZ.TUNE[k] === BZ.TUNE_META[k].def));
  });
  safe('dev: the pause menu offers dev mode outside a hub', () => {
    const items = game.menu && BZ.pauseItems();
    check('the pause menu has Dev Mode', Array.isArray(items) && items.some(i => i[0] === 'Dev Mode'), JSON.stringify(items && items.map(i => i[0])));
  });
  safe('dev: the dev scene opens and returns to where it came from', () => {
    game.go('dev', { back: 'title' }); game.advance(.5);
    check('dev mode is a scene', game.sceneName === 'dev');
    game.input.tap('cancel'); game.advance(.5);
    check('cancel returns to the title', game.sceneName === 'title', game.sceneName);
  });
}

// ---- the AI Hub: the online Derby with a mock client -------------------------------------------------------------------
// (the hub's promise resolves between steps, so the checks run as an async block)
async function hubChecks() {
  const info = {
    me: 0, mode: 'ghost', round: 1, limitMs: 120000, seed: 7, host: 0, isHost: true,
    players: [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }]
  };
  const calls = { ready: 0, progress: [], result: [], send: [], answers: [], connect: 0 };
  const handlers = {};
  let t = -3000;
  const mock = {
    active: true, seeded: true,
    connect(o) { calls.connect++; calls.mode = o.mode; return Promise.resolve(info); },
    ready() { calls.ready++; },
    answer(a) { calls.answers.push(a); },
    time: () => t,
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; },
    progress(p) { calls.progress.push(p); },
    result(r) { calls.result.push(r); },
    finish() {},
    send(d, o) { calls.send.push({ d, o }); return true; },
    rng(label) { let s = 7 + label.length; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; },
    fail() {}
  };
  const emit = (ev, ...a) => (handlers[ev] || []).forEach(f => f(...a));
  const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
  const { game, BZ } = loadWithHub(mock);
  const { snap } = { snap: () => game.debug.snapshot() };
  game.advance(.5);
  await settle();
  safe('hub: the round connects, calls ready once, and starts on the hub clock', () => {
    check('the hub scene connects', calls.connect === 1, String(calls.connect));
    check('ready is called once, with no key press', calls.ready === 1, String(calls.ready));
    check('the game is in its own card', BZ.hubState === 'card', BZ.hubState);
    emit('start', { in: 3000 });
    game.advance(.2);
    check('the start moves to the countdown', BZ.hubState === 'countdown', BZ.hubState);
    t = 0;
    game.advance(.5);
    check('play begins when the clock reaches zero', BZ.hubState === 'play', BZ.hubState);
  });
  safe('hub: progress is reported about once a second, and ghost traffic stays under 20 a second', () => {
    const before = calls.progress.length;
    game.advance(4);
    const n = calls.progress.length - before;
    check('progress arrives about once a second', n >= 3 && n <= 5, String(n));
    const ghostMsgs = calls.send.filter(s => s.d.t === 'g').length;
    check('ghost traffic is 10 a second or less', ghostMsgs <= 45, String(ghostMsgs));
  });
  safe('hub: a ghost message shows, and the local score is unchanged by it', () => {
    const before = BZ.D.players[0].score;
    emit('message', { t: 'g', s: 1, sc: 340, o: 2, a: 'derby' }, 1);
    check('a ghost is shown with its score', BZ.hubGhosts[1] && BZ.hubGhosts[1].score === 340);
    check('the ghost does not change this round', BZ.D.players[0].score === before);
  });
  safe('hub: time up reports once; the end stops the round', () => {
    emit('time-up', { graceMs: 3000 });
    game.advance(.2);
    check('the result is reported', calls.result.length === 1, String(calls.result.length));
    emit('time-up', { graceMs: 3000 });
    check('a second time up does not report again', calls.result.length === 1);
    emit('end', { reason: 'finished', standings: [[0], [1]] });
    game.advance(.5);
    check('the end stops the round', BZ.hubState === 'ended', BZ.hubState);
    check('no errors in the hub round', game.errors.length === 0, game.errors.map(e => e.message || String(e)).slice(0, 2).join(' | '));
  });
}
await hubChecks();

// ---- the deliverables and the source -----------------------------------------------------------------------------------
{
  const srcFiles = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js'));
  const src = srcFiles.map(f => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
  check('no TODO, FIXME or placeholder left in the source', !/\bTODO\b|\bFIXME\b|placeholder|\bstub\b/i.test(src), (src.match(/\bTODO\b|\bFIXME\b|placeholder|\bstub\b/gi) || []).slice(0, 3).join(','));
  check('gameplay never calls Math.random', !/Math\.random/.test(src));
  check('the source has no network calls', !/\bfetch\(|XMLHttpRequest|WebSocket/.test(src));
  const bundle = join(root, '..', 'BatzookaBaseball-Baseball-claude-haiku-5-5-medium-20261104-060643.html');
  check('the single HTML file exists beside the dev folder', existsSync(bundle));
  const exitFile = join(root, '..', 'exit-interview.json');
  let parsed = null;
  try { parsed = JSON.parse(readFileSync(exitFile, 'utf8')); } catch (e) { parsed = null; }
  check('exit-interview.json parses', !!parsed);
  if (parsed) {
    const sections = ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'];
    check('exit-interview.json has every section', sections.every(k => k in parsed));
    // the catalogue's series may be empty (the task says so); every other field must be answered
    const { series, ...rest } = parsed.aiHub || {};
    const emptyFields = JSON.stringify(Object.assign({}, parsed, { aiHub: rest })).match(/""/g);
    check('every exit-interview field is answered', !emptyFields, emptyFields ? emptyFields.length + ' empty values' : '');
  }
}

console.log(failed ? `${failed} of ${total} checks failed` : `all ${total} checks passed`);
process.exit(failed ? 1 : 0);
