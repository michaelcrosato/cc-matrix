// The one test command: node test/run.mjs. It loads the engine and the game's files in a VM (no screen, no sound), drives the
// game by fixed steps (game.advance) and scripted input, and checks the state. It prints only failures and one count line.
// Suites: boot (the files load, the title, the scenes), sim (a play, the downs, a scripted whole match with four quarters),
// attract (idle to the attract mode, then any input back), dev (the sliders change the match, reset restores the defaults),
// flow (the pause menu's Dev mode returns to the same match, the cup's chapters, the touch-only notice).
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['vendor/my-3d2dge.js', 'src/00-boot.js', 'src/10-data.js', 'src/20-field.js', 'src/30-sim.js', 'src/35-extras.js', 'src/40-view.js', 'src/50-scenes.js', 'src/60-net.js', 'src/99-start.js'];

let failed = 0, count = 0;
const check = (what, ok, detail = '') => { count++; if (!ok) { failed++; console.log('FAIL ' + what + (detail ? ': ' + detail : '')); } };

// a fresh page: the files in order, the window object, a location with no hash, and no matchMedia (a desk)
function boot(hash = '', extra = {}) {
  const ctx = { console, Math, setTimeout, clearTimeout, Date };
  ctx.window = ctx; ctx.location = { hash }; Object.assign(ctx, extra);
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return ctx;
}

const suites = {};

suites.boot = () => {
  const ctx = boot(); const FF = ctx.FF, game = FF.game, snap = () => game.debug.snapshot();
  check('the files load: scenes, data, the sim', !!FF.scenes.title && !!FF.scenes.play && !!FF.sim && !!FF.data);
  game.advance(.5);
  check('the title is the first scene', snap().scene === 'title', JSON.stringify(snap()).slice(0, 200));
  check('the glyph default is PlayStation', game.input.glyphs === 'playstation', String(game.input.glyphs));
  check('no errors at the title', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
};

suites.sim = () => {
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim, I = game.input;
  game.go('play', { mode: 'exhibition' }, { fade: 0 }); game.advance(.2);
  check('exhibition starts in the call', S.phase === 'call', S.phase);
  check('seven a side on the field', S.all.length === 14 && S.all.filter(p => p.side === 0).length === 7);
  // one play by hand: the human calls a run, and it runs until the whistle
  let plays = 0, guard = 0;
  const prevDown = [];
  while (plays < 12 && guard++ < 20000) {
    if (S.phase === 'call' && S.cfg.human.includes(S.poss)) { S.pickCall(S.cpuCall()); plays++; }
    game.advance(1 / 120);
  }
  check('twelve plays run to the whistle without an error', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
  check('the downs move (a down counter of 1 to 4, a yard to go)', S.down >= 1 && S.down <= 4 && S.togo > 0, S.down + '/' + S.togo);
  check('the match clock runs in live play', S.clock < 120, String(S.clock));
};

suites.whole = () => {
  // a whole match: the CPU calls for both sides, a quarter is 60 seconds, four quarters, the final whistle
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim;
  game.go('play', { mode: 'exhibition' }, { fade: 0 }); game.advance(.2);
  S.cfg.chapter = Object.assign({}, S.cfg.chapter, { quarter: 60 }); S.clock = 60;
  let guard = 0, phases = new Set(), tdSeen = 0, fdSeen = 0, halfSeen = false, big = 0;
  while (!S.over && guard++ < 120 * 2400) {
    if (S.phase === 'call' && S.cfg.human.includes(S.poss)) { const k = S.cpuCall(); S.pickCall(k); }
    phases.add(S.phase);
    if (S.phase === 'half') halfSeen = true;
    game.advance(1 / 120);
    if (game.errors.length) break;
  }
  check('the whole match runs to the final whistle', S.over, 'phase ' + S.phase + ' qtr ' + S.qtr + ' after ' + guard + ' steps');
  check('no error in the whole match', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 3)));
  check('the match has scored', S.score[0] + S.score[1] > 0, JSON.stringify(S.score));
  check('there was a half', halfSeen, '');
  check('the phases include the call, the snap, the live play and the dead ball', ['call', 'snap', 'live', 'dead'].every(p => phases.has(p)), [...phases].join(','));
  check('the stats recorded yards', S.stats.yards[0] + S.stats.yards[1] > 0, JSON.stringify(S.stats.yards));
};

suites.attract = () => {
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim;
  game.advance(10.5);
  check('ten seconds idle at the title starts the attract mode', (game.scene && game.scene.name) === 'attract' || game.sceneName === 'attract', game.sceneName || JSON.stringify(game.debug.snapshot()).slice(0, 120));
  game.advance(20);
  check('the attract mode plays (a match is running)', S.cfg && S.cfg.attract && S.phase !== 'idle', S.phase);
  check('no error during attract', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
  game.input.tap('confirm'); game.advance(.5);
  check('any input exits the attract mode', (game.sceneName || (game.scene && game.scene.name)) === 'title', String(game.sceneName));
};

suites.dev = () => {
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim;
  FF.resetTune(); const d0 = FF.tune.runSpeed;
  FF.tune.runSpeed = 120; check('a slider changes the value', FF.tune.runSpeed === 120);
  FF.resetTune(); check('reset returns the sliders to their defaults', FF.tune.runSpeed === d0 && FF.tune.runSpeed === FF.tuneDefaults.runSpeed);
  game.go('play', { mode: 'exhibition' }, { fade: 0 }); game.advance(.2);
  FF.devFromPause(); game.advance(.3);
  check('the Dev mode opens from the pause menu', (game.sceneName || (game.scene && game.scene.name)) === 'dev', String(game.sceneName));
  game.input.tap('cancel'); game.advance(.3);
  check('back from the Dev mode returns to the match', (game.sceneName || (game.scene && game.scene.name)) === 'play', String(game.sceneName));
  check('the same match continues (the sim was not restarted)', S.cfg && S.cfg.mode === 'exhibition' && S.cfg.chapter.title === 'EXHIBITION');
};

suites.cup = () => {
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim;
  game.go('play', { mode: 'cup' }, { fade: 0 }); game.advance(.2);
  check('the cup starts at the prologue', S.cfg.chapter.title === 'PROLOGUE', S.cfg.chapter.title);
  check('the cup chapters are five', FF.data.CHAPTERS.length === 5);
  check('the chapters name an opponent in the teams', FF.data.CHAPTERS.every(c => FF.data.TEAMS[c.opp]));
};


suites.features = () => {
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim, X = S.extras;
  game.go('play', { mode: 'exhibition' }, { fade: 0 }); game.advance(.2);
  // a lateral: a carrier who is not the passer throws it back to a teammate level with or behind him
  S.pickCall('RUN_IN'); let g = 0; while (S.phase !== 'live' && g++ < 2000) game.advance(1 / 120);
  game.advance(.3);
  const h = S.ball.holder; S.lateral(h);
  check('a lateral sends the ball back to a teammate (in the air)', h && (S.ball.mode === 'air' || S.msg === 'LATERAL!'), S.ball.mode);
  // the Fiasco meter: full, the card is used, and the card's play is recorded
  X.meter = 100; check('the Fiasco card is used when the meter is full', X.useCard() && !!X.card && X.meter === 0, String(X.card));
  // the replay: the last frames are kept, and the replay plays them back
  S.pickCall('SLANT'); g = 0; while (S.phase !== 'call' && g++ < 20000 && !S.over) { if (S.phase === 'call') S.pickCall('SLANT'); game.advance(1 / 120); if (X.hist.length > 8) break; }
  check('plays are recorded for the replay', X.hist.length > 6, String(X.hist.length));
  X.startReplay(); let rs = 0; while (X.replaying() && rs++ < 2000) { X.replayStep(1 / 60); }
  check('the replay plays back and ends', !X.replaying(), String(rs));
  // a drill: three reps of the throw drill, and the match ends with the count of good reps
  game.go('play', { mode: 'drill', drill: 'throw' }, { fade: 0 }); game.advance(.2);
  let steps = 0;
  while (!S.over && steps++ < 120 * 900) game.advance(1 / 120);
  check('the drill runs its three reps to the end', S.over && S.drill && S.drill.reps === 3, JSON.stringify(S.drill));
  check('no error in the drill', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
  // the Play Lab: measured plays, and a table of the cards
  X.labStart(20); let lg = 0; while (!X.labStep(600) && lg++ < 200);
  check('the Play Lab measures its plays', X.lab && X.lab.n >= 20 && Object.keys(X.lab.rows).length > 0, JSON.stringify(X.lab && X.lab.n));
  // the couch: a second human on the defense takes a defender
  game.go('play', { mode: 'exhibition' }, { fade: 0 }); game.advance(.2);
  const fake = { move: () => [0, 0], down: () => false, pressed: () => false, buffered: () => false, consume() {}, released: () => false, label: a => a };
  S.start({ human: [0], ctrl: { 0: game.input, 1: fake }, chapter: FF.data.CHAPTERS[0] });
  check('a second human controller (couch or hub) takes a defender', S.all.some(p => p.side === 1 && p.human) && S.all.some(p => p.side === 0 && p.human));
  // the online snapshot: small enough for an unreliable message, and it reads back into the mirror
  S.start({ seed: 9, chapter: FF.data.CHAPTERS[0] }); game.advance(.5);
  const snap = JSON.parse(JSON.stringify(S.snapshot()));
  check('the online snapshot fits one unreliable message (under 1,200 bytes)', JSON.stringify(snap).length < 1200, String(JSON.stringify(snap).length));
  S.applySnapshot(snap);
  check('the mirror reads the snapshot back (same players, same phase)', S.all.length === 14 && S.phase === snap.ph, S.phase);
  // the remote input: the guest's pressed actions are read once, and held ones stay held
  const RI = FF.net.RemoteInput ? new FF.net.RemoteInput() : null;
  check('the remote input exists', !!RI);
  if (RI) { RI.feed({ m: [1, 0], h: ['turbo'], p: ['juke'] }); check('a remote press is read once', RI.pressed('juke') && (RI.consume('juke'), !RI.pressed('juke'))); check('a remote hold stays held', RI.down('turbo') && RI.move()[0] === 1); }
  check('no error in the extras', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
};


suites.flow = () => {
  // a match to the final whistle: the results, the highlight reel, back to the results; the hall counts the match once
  const ctx = boot(); const FF = ctx.FF, game = FF.game, S = FF.sim;
  const scene = () => game.sceneName || (game.scene && game.scene.name);
  game.go('play', { mode: 'exhibition' }, { fade: 0 }); game.advance(.2);
  S.cfg.chapter = Object.assign({}, S.cfg.chapter, { quarter: 40 }); S.clock = 40;
  let g = 0;
  while (!S.over && g++ < 120 * 1500) { if (S.phase === 'call' && S.ctrlOf(S.poss)) S.pickCall(S.cpuCall()); game.advance(1 / 120); if (game.errors.length) break; }
  game.advance(.5);
  check('the match ends and goes to the results', scene() === 'results', String(scene()));
  game.go('reel', null, { fade: 0 }); game.advance(.2);
  let r = 0; while (scene() === 'reel' && r++ < 120 * 120) game.advance(1 / 120);
  check('the reel plays the highlights', (S.extras.clips.length === 0) || r > 0, String(S.extras.clips.length));
  game.go('results', null, { fade: 0 }); game.advance(.5);
  check('back at the results after the reel', scene() === 'results', String(scene()));
  check('no error through the match, the results and the reel', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
};


suites.access = () => {
  // couch: a second player joins on the same screen, and takes the defense
  let ctx = boot(); let FF = ctx.FF, game = FF.game, S = FF.sim;
  game.go('play', { mode: 'versus' }, { fade: 0 }); game.advance(.3);
  game.addPlayer({ keys: 'right' }); game.advance(.2);
  check('a second player joins (addPlayer) and gets a controller', !!(S.ctrl && S.ctrl[1]), String(game.players && game.players.length));
  check('the second player takes a defender', S.all.some(p => p.side === 1 && p.human), '');
  check('no error after the join', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
  // touch-only: the notice and the flag, and the attract mode still runs
  ctx = boot('', { matchMedia: q => ({ matches: q.includes('coarse') }) }); FF = ctx.FF; game = FF.game;
  check('a touch-only device is detected', FF.touchOnly === true);
  game.advance(10.5);
  check('the attract mode still runs on a touch-only device', (game.sceneName || (game.scene && game.scene.name)) === 'attract', String(game.sceneName));
  // the cup: the cutscene plays its lines, then the match
  ctx = boot(); FF = ctx.FF; game = FF.game;
  game.go('cutscene', { lines: [['OWNER', 'Hi.'], ['CAPTAIN', 'Hello.']], next: { scene: 'play', data: { mode: 'cup' } } }, { fade: 0 }); game.advance(.2);
  let g = 0; while ((game.sceneName || game.scene.name) !== 'play' && g++ < 120 * 120) { game.input.tap('confirm'); game.advance(1 / 120); }
  check('the cup cutscene hands over to the match', (game.sceneName || game.scene.name) === 'play', String(game.sceneName));
  // the camera director: the call, the run and the kick each get their shot
  game.advance(1);
  check('the camera director names the shot', FF.view && FF.view.shot !== undefined && !!FF.view.shotLabel, String(FF.view && FF.view.shot));
  check('no error in the cutscene and the match', game.errors.length === 0, JSON.stringify(game.errors.slice(0, 2)));
};

const want = process.argv[2];
for (const [name, fn] of Object.entries(suites)) {
  if (want && want !== name) continue;
  try { fn(); } catch (e) { failed++; console.log('FAIL suite ' + name + ': ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); }
}
console.log(failed ? `${failed} of ${count} checks failed` : `all ${count} checks passed`);
process.exit(failed ? 1 : 0);
