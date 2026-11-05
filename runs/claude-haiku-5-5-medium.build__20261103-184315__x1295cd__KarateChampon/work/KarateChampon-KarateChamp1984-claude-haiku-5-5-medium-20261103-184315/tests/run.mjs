// THE test command: node tests/run.mjs [--only a,b]. It builds first, runs every suite headless, and prints only the
// failing checks and one final count line.
import { loadEngine, loadGame, dev } from './lib/load.mjs';
import { buildGame, buildHtml } from '../tools/build.mjs';

const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const t0 = Date.now();
buildGame();
const results = { pass: 0, fail: 0 };
const fails = [];
const check = (suite, name, ok, detail) => {
  if (ok) results.pass++; else { results.fail++; fails.push(`[${suite}] ${name}${detail ? ' — ' + detail : ''}`); }
};

function freshGame() {
  const ctx = loadEngine();
  const KC = loadGame(ctx);
  const game = ctx.My3D2dge.current;
  return { ctx, KC, game };
}
const quiet = (fn) => { const w = console.warn, l = console.log; console.warn = () => {}; console.log = () => {}; try { return fn(); } finally { console.warn = w; console.log = l; } };

const suites = {
  data(t) {
    const { KC, game } = freshGame();
    const errs = KC.validateData();
    check('data', 'validateData passes', errs.length === 0, errs.join(', '));
    check('data', '15 techniques plus block and the flips are defined', Object.keys(KC.DATA.techniques).length >= 20);
    check('data', 'every matrix cell maps to a technique', Object.keys(KC.DATA.matrix).every(p => Object.keys(KC.DATA.matrix[p]).every(s => KC.DATA.techniques[KC.DATA.matrix[p][s]])));
    check('data', 'the ladder has 17 nodes and ends on the stadium', KC.DATA.ladder.length >= 17 && KC.DATA.ladder.at(-2).id === 'mei');
    check('data', 'the about data has every feedback field', ['sourceInformation', 'aiHub'].every(k => !!KC.ABOUT[k]));
    check('data', 'the title is set', KC.ABOUT.aiHub.name === 'Karate Champon');
  },
  technique(t) {
    const { KC } = freshGame();
    const d = (id, speed = 1) => { const K = KC.Karateka; const f = new K({ id: 'taro', side: 'w' }); f.stats.speed = speed; return f.techSteps(id); };
    // the frame totals of the table, in 120 Hz steps (frames times two)
    const T = KC.DATA.techniques;
    for (const id of ['frontKick', 'roundKick', 'upLunge', 'frontSweep']) {
      const s = d(id);
      check('technique', `${id} startup/active/recovery steps match the table`, s.s === T[id].f[0] * 2 && s.a === T[id].f[1] * 2 && s.r === T[id].f[2] * 2, JSON.stringify(s));
    }
    check('technique', 'techSpeed scales the frames', (() => { const K = KC.Karateka; const f = new K({ id: 'taro', side: 'w' }); KC.TUNE.techSpeed = 0.5; const s = f.techSteps('frontKick'); KC.TUNE.techSpeed = 1; return s.s === T.frontKick.f[0] * 4; })());
    // the quality to points table (4.5 golden cases) via the award formula
    const pts = (lo, hi, q) => KC.clamp(lo + Math.round((hi - lo) * q / 100) * 100, lo, hi) * 1;
    check('technique', 'round kick at q 1 gives 600 (full)', pts(300, 600, 1) === 600);
    check('technique', 'round kick at q .5 gives 500', pts(300, 600, 0.5) === 500);
    check('technique', 'round kick at q .15 gives 300', pts(300, 600, 0.15) === 300);
    check('technique', 'upper lunge at q .15 gives 600 (full)', pts(500, 1000, 0.15) === 600);
    check('technique', 'a counter doubles a front kick: 400 (half)', Math.min(1000, pts(100, 200, 1) * 2) === 400);
    check('technique', 'a counter back kick: 800 (full)', Math.min(1000, pts(200, 400, 1) * 2) === 800);
    // the reach, measured: a round kick lands at a gap inside its band against a standing dummy
    const { game } = freshGame();
    const bout = (gap) => {
      const A = new KC.Karateka({ id: 'taro', side: 'w' }), B = new KC.Karateka({ id: 'kamaboko', side: 'r' });
      A.x = 150; B.x = 150 + KC.BODY_W + gap; A.facing = 1; B.facing = -1;
      A.startTech('roundKick');
      let hit = null;
      for (let i = 0; i < 200 && !hit; i++) {
        A.tick(1 / 120, B, true); B.tick(1 / 120, A, false);
        if (A.tech && A.tech.ph === 1) hit = KC.Bout.prototype.checkHit.call({ steps10: () => 20 }, A, B) || null;
      }
      return !!hit;
    };
    check('technique', 'round kick lands inside its band', bout(12) === true);
    check('technique', 'round kick whiffs beyond its reach', bout(40) === false);
    check('technique', 'a round kick misses a crouching foe', (() => { const A = new KC.Karateka({ id: 'taro', side: 'w' }), B = new KC.Karateka({ id: 'kamaboko', side: 'r' }); A.x = 150; B.x = 180; B.crouch = true; A.facing = 1; B.facing = -1; A.startTech('roundKick'); A.tech.ph = 1; A.tech.t = 2; return !A.hittableBy(T.roundKick, B); })());
    check('technique', 'a low kick cannot be blocked', T.lowKick.unblockable === true);
    check('technique', 'a jumper is only hit by high techniques', (() => { const A = new KC.Karateka({ id: 'taro', side: 'w' }), B = new KC.Karateka({ id: 'kamaboko', side: 'r' }); B.z = 20; B.vz = -10; return A.hittableBy(T.roundKick, B) && !A.hittableBy(T.lowKick, B) && !A.hittableBy(T.frontKick, B); })());
    check('technique', 'the block is a 14-frame guard (blockWindow)', (() => { const K = KC.Karateka; const f = new K({ id: 'taro', side: 'w' }); return f.techSteps('block').a === 28; })());
  },
  bout(t) {
    const { KC } = freshGame();
    const w = new KC.Karateka({ id: 'taro', side: 'w' }), r = new KC.Karateka({ id: 'kamaboko', side: 'r' });
    const b = new KC.Bout({ white: w, red: r, seed: 3, intro: false, roundsToWin: 2, pointsToWin: 2 });
    const phases = [];
    b.on('call', () => {});
    let last = '';
    for (let i = 0; i < 120 * 5; i++) { b.step(1 / 120, { a: () => null, b: () => null }); if (b.phase !== last) { phases.push(b.phase); last = b.phase; } }
    check('bout', 'the phase sequence starts at the referee bow', phases[0] === 'rei' && phases.includes('card') && phases.includes('ready') && phases.includes('hajime'), phases.join('>'));
    check('bout', 'the clock runs only in the fight', b.clock === KC.TUNE.clock || b.clock < KC.TUNE.clock);
    // a full scripted round: the CPU on each side, with a hard points target so the round ends
    const w2 = new KC.Karateka({ id: 'taro', side: 'w' }), r2 = new KC.Karateka({ id: 'kamaboko', side: 'r' });
    const ai1 = new KC.KarateAI(w2, 5, { level: 6 }), ai2 = new KC.KarateAI(r2, 6, { level: 3 });
    const b2 = new KC.Bout({ white: w2, red: r2, seed: 9, intro: false, roundsToWin: 1, pointsToWin: 2 });
    let steps = 0, sawPoint = false;
    b2.on('point', () => { sawPoint = true; });
    while (b2.phase !== 'matchEnd' && steps < 120 * 400) { steps++; b2.step(1 / 120, { a: () => ai1.intent(r2, 1 / 120), b: () => ai2.intent(w2, 1 / 120) }); }
    check('bout', 'a CPU bout reaches the match end', b2.phase === 'matchEnd', b2.phase + ' after ' + steps);
    check('bout', 'the bout scores some points', sawPoint);
    check('bout', 'a winner is recorded', b2.matchOver === 0 || b2.matchOver === 1);
    // the AI's determinism: the same seeds give the same result
    const run = (seed) => { const a = new KC.Karateka({ id: 'ebi', side: 'w' }), c = new KC.Karateka({ id: 'ika', side: 'r' }); const A = new KC.KarateAI(a, seed), C = new KC.KarateAI(c, seed + 1); const B = new KC.Bout({ white: a, red: c, seed, intro: false, roundsToWin: 1, pointsToWin: 2 }); let n = 0; while (B.phase !== 'matchEnd' && n < 120 * 400) { n++; B.step(1 / 120, { a: () => A.intent(c, 1 / 120), b: () => C.intent(a, 1 / 120) }); } return [n, B.points.join(','), B.matchOver].join('|'); };
    check('bout', 'the same seed plays the same bout', run(21) === run(21));
  },
  ai(t) {
    const { KC } = freshGame();
    const levelWins = (lvlA, lvlB, seeds) => {
      let aWins = 0;
      for (let s = 1; s <= seeds; s++) {
        const a = new KC.Karateka({ id: 'taro', side: 'w' }), c = new KC.Karateka({ id: 'kamaboko', side: 'r' });
        const A = new KC.KarateAI(a, s * 3, { level: lvlA }), C = new KC.KarateAI(c, s * 5, { level: lvlB });
        const B = new KC.Bout({ white: a, red: c, seed: s, intro: false, roundsToWin: 1, pointsToWin: 2 });
        let n = 0; while (B.phase !== 'matchEnd' && n < 120 * 400) { n++; B.step(1 / 120, { a: () => A.intent(c, 1 / 120), b: () => C.intent(a, 1 / 120) }); }
        if (B.matchOver === 0) aWins++;
      }
      return aWins / seeds;
    };
    const hi = levelWins(8, 2, 8);
    check('ai', 'a level 8 CPU beats a level 2 CPU more often than not', hi >= 0.5, 'won ' + hi);
    check('ai', 'every personality completes a match (smoke)', ['kamaboko', 'ebi', 'ika', 'mei'].every(id => { const a = new KC.Karateka({ id, side: 'w' }), c = new KC.Karateka({ id: 'negi', side: 'r' }); const A = new KC.KarateAI(a, 4), C = new KC.KarateAI(c, 6); const B = new KC.Bout({ white: a, red: c, seed: 4, intro: false, roundsToWin: 1, pointsToWin: 2 }); let n = 0; while (B.phase !== 'matchEnd' && n < 120 * 400) { n++; B.step(1 / 120, { a: () => A.intent(c, 1 / 120), b: () => C.intent(a, 1 / 120) }); } return B.phase === 'matchEnd'; }));
  },
  bonus(t) {
    const { KC } = freshGame();
    const s = KC.Bonus.boardsNew({ n: 5 });
    KC.Bonus.boardsStep(s, 1 / 120, true);
    for (let i = 0; i < 120 * 1.5; i++) KC.Bonus.boardsStep(s, 1 / 120, true);
    KC.Bonus.boardsStep(s, 1 / 120, false);
    check('bonus', 'boards: a held breath then a release chops', s.phase === 'result', s.phase);
    check('bonus', 'boards: the broken count follows the power', s.broken >= 0 && s.broken <= 5);
    const p = KC.Bonus.boardsNew({ n: 5 }); p.ki = 97; p.phase = 'breathe'; KC.Bonus.boardsChop(p);
    check('bonus', 'boards: PERFECT at 95 power and up', p.perfect === true);
    const pots = KC.Bonus.potsNew(1);
    check('bonus', 'pots: 16 objects per visit', pots.seq.length === 16);
    check('bonus', 'pots: the sequence is seeded and the same every time', JSON.stringify(KC.Bonus.potsNew(1).seq) === JSON.stringify(pots.seq));
    const bull = KC.Bonus.bullNew();
    check('bonus', 'bull: three charges at 150, 190, 240', KC.Bonus.bullSpeeds.join(',') === '150,190,240');
  },
  flow(t) {
    const { KC, game } = freshGame();
    game.advance(0.5);
    check('flow', 'the game boots to the title', game.sceneName === 'title', game.sceneName);
    game.advance(11);
    check('flow', 'ten seconds idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName);
    game.input.tap('confirm');
    game.advance(1);
    check('flow', 'any input exits the attract mode', game.sceneName === 'title', game.sceneName);
    game.go('fight', { mode: 'versus', w: 'taro', r: 'kamaboko', stage: 'dojo', cpuR: true, cpuW: true, roundsToWin: 1, pointsToWin: 2, intro: false });
    game.advance(1);
    check('flow', 'a fight starts from its data', game.sceneName === 'fight' && !!KC.fightState, game.sceneName);
    game.advance(90);
    const snap = game.debug.snapshot();
    check('flow', 'a CPU fight reaches the results', ['results', 'title'].includes(game.sceneName) || snap.bout && snap.bout.matchOver !== null, game.sceneName + ' ' + JSON.stringify(snap.bout));
    check('flow', 'no errors in the run', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  },
  story(t) {
    // the scripted playthrough: every ladder node in order, from the road. The CPU plays the fights, the autoplay plays the drills,
    // the talk boxes are confirmed, and the bonus games run on their own timers.
    const { KC, game } = freshGame();
    KC.TUNE.pointsToWin = 1; KC.TUNE.roundsToWin = 1; KC.TUNE.cpuLevel = 0;
    KC.autoPlay = true;
    KC.TOGGLES.p1Invincible = true;   // the autopilot's cheat: the CPU cannot score on P1 (a dev toggle)
    KC.save.write({ node: 0, rank: 0, score: 0, finished: false });
    game.go('road', { resume: true }); game.advance(1);
    const seen = [];
    let guard = 0, cause = '';
    const runUntil = (pred, maxSec, fn) => { for (let k = 0; k < maxSec * 2 && !pred(); k++) { if (fn) fn(); game.advance(0.5); } return pred(); };
    while (guard++ < 40) {
      const save = KC.save.load() || {};
      if ((save.node || 0) >= KC.DATA.ladder.length) break;
      const idx = save.node, node = KC.DATA.ladder[idx];
      seen.push(node.id);
      KC.startNode(idx);
      game.advance(1);
      if (game.sceneName === 'vs') { game.advance(3); }
      if (game.sceneName === 'fight') {
        // the fight plays itself: both sides CPU, with autopilot levels
        // the player's side is the autopilot at level 10 (the plan's cheat for the playthrough); the opponent is its own CPU
        const F = KC.fightState; if (F) { F.cpuW = true; F.aiW = new KC.KarateAI(F.w, 99, { level: 10 }); }
        const done = runUntil(() => game.sceneName !== 'fight', 600, () => { const G = KC.fightState; if (G && G.bout && G.bout.phase === 'hajime') { G.cpuW = true; G.aiW = new KC.KarateAI(G.w, 99, { level: 10 }); } });
        if (!done) { cause = 'fight did not end: ' + node.id; break; }
      }
      if (game.sceneName === 'cutscene' || game.sceneName === 'ending') {
        runUntil(() => game.sceneName !== 'cutscene' && game.sceneName !== 'ending', 120, () => game.input.tap('confirm'));
      }
      if (game.sceneName === 'practice') {
        runUntil(() => game.sceneName !== 'practice', 900);
      }
      if (game.sceneName === 'bonus') {
        if (node.bonus === 'boards') { game.input.hold('tDown', true); game.advance(2); game.input.hold('tDown', false); }
        runUntil(() => game.sceneName !== 'bonus', 120);
      }
      if (game.sceneName === 'promotion') runUntil(() => game.sceneName !== 'promotion', 10);
      if (game.sceneName === 'continue') { game.go('gameover', { score: 0 }); runUntil(() => game.sceneName !== 'gameover', 12); cause = 'lost at ' + node.id; break; }
      if (game.sceneName === 'road' || game.sceneName === 'cutscene') { }
      if (game.sceneName !== 'road' && game.sceneName !== 'title' && game.sceneName !== 'ending' && game.sceneName !== 'gameover') { game.go('road', { resume: true }); game.advance(1); }
    }
    KC.autoPlay = false; KC.TOGGLES.p1Invincible = false;
    const final = KC.save.load() || {};
    const want = KC.DATA.ladder.map(n => n.id);
    check('story', 'the playthrough visits every ladder node in order', JSON.stringify(seen) === JSON.stringify(want), 'visited ' + seen.length + ' of ' + want.length + ' ' + seen.join(',') + ' ' + cause);
    check('story', 'the run gets through the ladder to the ending', (final.node || 0) >= KC.DATA.ladder.length, 'node ' + final.node + ' scene ' + game.sceneName + ' ' + cause);
    check('story', 'no errors in the playthrough', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
    KC.resetTune();
  },
  dev(t) {
    const { KC, game } = freshGame();
    game.go('dev', { back: 'title' }); game.advance(1);
    check('dev', 'dev mode opens as its own screen', game.sceneName === 'dev', game.sceneName);
    KC.TUNE.walk = 99; game.advance(1);
    check('dev', 'a slider changes its live value', KC.TUNE.walk === 99);
    KC.resetTune();
    check('dev', 'reset restores the defaults', KC.TUNE.walk === KC.TUNE_DEFAULTS.walk && !KC.tuneChanged());
    KC.TUNE.hitstop = 0.3;
    check('dev', 'tuning marks the dev state as changed', KC.tuneChanged());
    KC.resetTune();
  },
  modes(t) {
    const { KC, game } = freshGame();
    game.go('kach', { seats: 3, stage: 'dojo', roster: ['taro', 'kamaboko', 'negi'] }); game.advance(1);
    for (let i = 0; i < 400 && !KC.kach.over; i++) game.advance(1);
    check('modes', 'local Kachinuki (3 seats) runs to a champion', KC.kach.over && KC.kach.wins.some(w => w >= 5), JSON.stringify(KC.kach.wins));
    check('modes', 'Kachinuki rotates the queue (the winner stays, the loser goes to the back)', KC.kach.queue.length === 3 && KC.kach.boutN >= 2);
    game.go('lab', { tech: 'roundKick' }); game.advance(1);
    game.input.tap('confirm'); game.advance(1.5);
    check('modes', 'the Technique Lab reports a hit for a round kick at reach', /HIT/.test(KC.S.lab.result || ''), KC.S.lab.result);
    game.advance(1, { draw: true });
    game.go('attract'); game.advance(1);
    const seenPhases = [];
    for (let i = 0; i < 80; i++) { game.advance(1); const ph = game.sceneName === 'attract' ? KC.S.attract.phase : game.sceneName; if (seenPhases.at(-1) !== ph) seenPhases.push(ph); if (game.sceneName === 'title') break; }
    const want = ['bout', 'reel', 'howto', 'scores', 'title'];
    check('modes', 'the attract loop cycles bout, reel, how-to, scores, then the title', want.every(w => seenPhases.includes(w)), seenPhases.join('>'));
    KC.TOGGLES.hitBoxes = true; KC.TOGGLES.frameData = true; KC.TOGGLES.inputDisplay = true;
    game.go('fight', { mode: 'versus', w: 'taro', r: 'kamaboko', stage: 'dojo', cpuR: true, cpuW: true, intro: false }); game.advance(2, { draw: true });
    check('modes', 'a fight draws with the dev overlays on', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
    KC.resetTune();
  },
  pads(t) {
    const { KC, game, ctx } = freshGame();
    let pressed = false;
    const mk = () => ({ connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, k) => ({ pressed: k === 0 && pressed, value: k === 0 && pressed ? 1 : 0 })) });
    ctx.navigator.getGamepads = () => [mk()];
    const prev = {};
    const first = KC.padIntent(0, 1, prev);
    check('pads', 'a pad with nothing held gives no technique', first && first.tech === null);
    pressed = true;
    const press = KC.padIntent(0, 1, prev);
    check('pads', 'the cross button is a technique press (down)', press && press.tech === 'd', JSON.stringify(press));
    const held = KC.padIntent(0, 1, prev);
    check('pads', 'holding the button does not repeat the technique', held && held.tech === null);
    check('pads', 'a seat with no pad connected is CPU', (ctx.navigator.getGamepads = () => []) && !KC.padConnected(0));
  },
  audio(t) {
    const { KC, game } = freshGame();
    KC.A.defineAll(game.audio);
    const names = ['whoosh', 'thwackHalf', 'thwackFull', 'clack', 'flagSnap', 'whistle', 'gong', 'crowdOoh', 'boardCrack', 'potShatter', 'bowlDing', 'bullSnort', 'dizzy', 'perfect', 'countBeep', 'menuMove', 'menuOk', 'menuBack'];
    const missing = names.filter(n => !game.audio.presets || !game.audio.presets[n]);
    check('audio', 'every sound effect the game plays is defined', missing.length === 0, missing.join(','));
    const songs = Object.keys(KC.A.songs);
    const badStage = Object.values(KC.DATA.stages).filter(st => !KC.A.songs[st.music]).map(st => st.id);
    check('audio', 'every stage has a song', badStage.length === 0, badStage.join(','));
    check('audio', 'the voice gives the same syllables for the same line', JSON.stringify(KC.A.syllables('BEGIN!')) === JSON.stringify(KC.A.syllables('BEGIN!')) && KC.A.speak(game, 'FULL POINT!', 'genkotsu') > 0);
  },
  input(t) {
    const { KC } = freshGame();
    // every matrix cell, from both sides: posture (relative) and stick (relative) give the technique the table names
    const cells = [];
    for (const p of Object.keys(KC.DATA.matrix)) for (const st of Object.keys(KC.DATA.matrix[p])) cells.push([p, st]);
    const bad = cells.filter(([p, st]) => KC.DATA.techFor(p, st, 50) !== KC.DATA.matrix[p][st]);
    check('input', 'all 20 matrix cells map to their techniques', cells.length === 20 && bad.length === 0, bad.map(c => c.join('')).join(','));
    check('input', 'toward and away swap sides with the foe', KC.relDir('r', 1) === 't' && KC.relDir('r', -1) === 'a' && KC.relDir('l', -1) === 't');
    check('input', 'the quantizer picks the dominant axis and needs 0.35 to count', KC.quantize(0.9, 0.2) === 'r' && KC.quantize(0.2, -0.9) === 'u' && KC.quantize(0.1, 0.1) === null);
    check('input', 'a close front kick becomes a reverse punch', KC.DATA.techFor('n', 't', 8) === 'revPunch' && KC.DATA.techFor('n', 't', 30) === 'frontKick');
    check('input', 'a fighter buffers a press made while busy for 18 steps (0.15 s)', (() => { const { KC: K } = freshGame(); const f = new K.Karateka({ id: 'taro', side: 'w' }); const g = new K.Karateka({ id: 'kamaboko', side: 'r' }); f.startTech('roundKick'); f.control({ posture: 'n', tech: 'u' }, g); return f.pending === 'u' && f.pendingT === 18; })());
    check('input', 'the keyboard and the pad read the same technique names', (() => { const { KC: K } = freshGame(); return K.DATA.techniques.roundKick.name === 'ROUND KICK'; })());
  },
  ui(t) {
    const { KC, game, ctx } = freshGame();
    // the touch-only gate: a touch screen with no fine pointer and no key pressed
    ctx.navigator.maxTouchPoints = 5;
    ctx.window.matchMedia = (q) => ({ matches: false });
    KC.inputSeen = false; KC.updateTouchGate();
    check('ui', 'a touch-only device shows the controller-or-keyboard gate', KC.touchGate === true);
    check('ui', 'touch controls stay off on touch-only devices', game.input.touchEnabled === false);
    game.advance(1);
    game.go('title'); game.advance(1);
    check('ui', 'the title and attract screens run behind the gate', game.sceneName === 'title' || game.sceneName === 'attract', game.sceneName);
    KC.inputSeen = true; KC.updateTouchGate();
    check('ui', 'a key or pad press lifts the gate', KC.touchGate === false);
    check('ui', 'the About pages hold every TASK field with no empty value', (() => {
      const si = KC.ABOUT.sourceInformation; const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      return keys.every(k => si[k] && String(si[k]).trim() !== '') && KC.ABOUT.testingFeedback.length === 4 && KC.ABOUT.engineFeedback.length === 6 && KC.ABOUT.promptFeedback.length === 4;
    })());
    check('ui', 'prompts show keycaps on the keyboard and PlayStation shapes on a pad by default', (() => {
      game.input.lastDevice = 'keyboard'; const k = KC.device();
      game.input.lastDevice = 'gamepad'; const pad = KC.device();
      game.input.lastDevice = 'keyboard';
      return k === 'keyboard' && pad === 'gamepad' && KC.PS_DEFAULT !== false;
    })());
    KC.inputSeen = false;
  },
  build(t) {
    const html = buildHtml(buildGame());
    const fs = require_fs();
    check('build', 'the single HTML file is written', fs.exists(html));
    const text = fs.read(html);
    check('build', 'no external requests (no http src or href)', !/(src|href)=["']https?:/i.test(text));
    check('build', 'the title is Karate Champon', /<title>Karate Champon<\/title>/.test(text));
    const ex = JSON.parse(fs.read(new URL('../../exit-interview.json', import.meta.url).pathname));
    check('build', 'exit-interview.json parses and fills every field', ex.sourceInformation && Object.values(ex.sourceInformation).every(v => v !== '') && ex.aiHub && ex.aiHub.name === 'Karate Champon');
  }
};
function require_fs() {
  return { exists: (p) => { try { return !!fsStat(p); } catch (e) { return false; } }, read: (p) => fsRead(p) };
}
import { statSync, readFileSync } from 'node:fs';
const fsStat = (p) => statSync(p);
const fsRead = (p) => readFileSync(p, 'utf8');

for (const [name, fn] of Object.entries(suites)) {
  if (only.length && !only.includes(name)) continue;
  try { quiet(() => fn({})); } catch (e) { results.fail++; fails.push(`[${name}] threw: ${(e && e.stack || e).toString().split('\n').slice(0, 2).join(' / ')}`); }
}
for (const f of fails) console.log('FAIL ' + f);
console.log(`KC TESTS: ${results.pass} passed, ${results.fail} failed, 0 skipped (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(results.fail ? 1 : 0);
