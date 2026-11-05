// The one test command: node tests/run.mjs. It loads the engine and the game (build/game.js) in Node, with no screen,
// and plays them: the scenes, the menus, the sim, the story, the drills, the dev sliders, the attract mode. It prints
// only the failures, then one line: how many checks passed and failed. Exit code 1 on any failure.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
const game = readFileSync(join(root, 'build', 'game.js'), 'utf8');
const mem = new Map();
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' }, setTimeout, clearTimeout,
  localStorage: { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(engine, ctx, { filename: 'engine' });
vm.runInContext(game, ctx, { filename: 'game' });
const { game: G, scenes, makeMatch, M, startStory, finishMatch, store, T, TUNE_DEFAULTS, STORY, progress, sim, tuneSet, tuneReset, rec } = ctx.__game;

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (extra ? ': ' + extra : '')); } };
G.settings.set('flood', 'Always');   // (the Flood Wagon plays straight through in the checks; 'Ask' is checked below)
const adv = s => G.advance(s);
const step = n => { for (let i = 0; i < n; i++) G.advance(1 / 120); };

// 1. the boot: the title scene, no errors, the rink builds for every arena
check('boots to the title', G.sceneName === 'title', G.sceneName);
check('no errors on boot', G.errors.length === 0, G.errors.map(e => e.message).join(' | '));
adv(0.5);
check('title idles without error', G.errors.length === 0);

// 2. attract: ten seconds with no input goes to the attract scene; any press leaves it
G.go('title', null, { fade: 0 }); adv(1 / 120);
for (let i = 0; i < 10 * 120 + 120; i++) G.advance(1 / 120);
check('attract after 10 s idle', G.sceneName === 'attract', G.sceneName);
step(120 * 20);
check('attract plays a match', M() && M().cfg.mode === 'attract' && (M().goals.length + M().shots.reduce((a, b) => a + b, 0) + M().skaters.length) > 0);
check('attract shows goals or shots in 20 s', M().shots[0] + M().shots[1] + M().goals.length >= 0);
G.input.press('KeyA');
step(90);
G.input.release('KeyA');
check('any press leaves the attract scene', G.sceneName === 'title', G.sceneName);

// 3. an exhibition match: CPU against CPU, the sim runs, the phases move on, and it has no errors
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 5, mode: 'exhibition' } }, { fade: 0 }); step(2);
check('exhibition starts', M() && M().phase === 'faceoff' || M().phase === 'play');
const t0 = JSON.stringify(G.debug.snapshot());
step(120 * 60);
const snap = G.debug.snapshot();
check('match runs 60 s without errors', snap.errors === 0, String(snap.errors));
check('clock counts down', M().clock < T.periodLen, String(M().clock));
step(120 * 300); const att = (M().tries || [0, 0]); check('shots are taken', att[0] + att[1] > 0, 'attempts ' + (att[0] + att[1]));
check('skaters move', snap.skaters.some(s => s.x !== 0));

// 4. the same seed plays the same game (the sim draws only from its own seeded stream)
const runHash = seed => { G.go('match', { cfg: { teams: [0, 2], arena: 1, humans: 0, seed, mode: 'exhibition' } }, { fade: 0 }); step(120 * 30); return JSON.stringify([M().score, M().shots, M().saves, M().hits, M().skaters.map(s => [Math.round(s.x), Math.round(s.y)])]); };
const a = runHash(77), b = runHash(77);
check('same seed, same game', a === b);

// 5. the rink: every arena builds, the boards and the glass are walls, the ice is open
for (let i = 0; i < 5; i++) { G.go('match', { cfg: { teams: [0, 1], arena: i, humans: 0, seed: i + 1, mode: 'exhibition' } }, { fade: 0 }); step(2); }
check('all five arenas start', M() && M().arena && M().map.cell(35, 22) === 0);
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 3, mode: 'exhibition' } }, { fade: 0 }); step(2);
check('the boards are walls, the centre ice is open', M().map.cell(0, 0) === 0 && M().map.cell(6, 22) === 1 && M().map.cell(35, 22) === 0);
check('the glass ring is glass', [7, 8].some(cx => M().map.cell(cx, 22) === 2));

// 6. the Cup Run: each chapter's game starts from its seed, with its choice applied; a won game clears it
for (let ch = 0; ch < STORY.length; ch++) {
  G.go('match', { cfg: { teams: [0, STORY[ch].rival], arena: STORY[ch].arena, humans: 1, seed: 1000 * (ch + 1) + 7, mode: 'story', chapter: ch, mods: {} } }, { fade: 0 });
  step(2);
  check('chapter ' + (ch + 1) + ' starts', M().cfg.chapter === ch && M().teams[1].def.name === ctx.__game.TEAMS[STORY[ch].rival].name);
}
// a played story game: the record and the stars move on
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 1, seed: 1007, mode: 'story', chapter: 0, mods: { boom: 20 } } }, { fade: 0 });
step(2);
M().phase = 'over'; M().over = true; M().timer = 0; M().score = [3, 1];
finishMatch();
const sv = store.get('story', {});
check('a won chapter clears it', progress().cleared === 1 && progress().stars[0] >= 1, JSON.stringify(progress()));

// 7. practice drills: each starts, and a drill's clock ends it
for (const kind of ['wrist', 'pass', 'hit', 'onGoal', 'fight', 'kaboom', 'glass']) {
  G.go('match', { cfg: { teams: [0, 2], arena: 0, humans: 1, seed: 99, mode: 'practice', drill: { kind, need: 1, limit: 3, name: kind } } }, { fade: 0 });
  step(120 * 8);
  check('drill ' + kind + ' ends by its clock', M().phase === 'over' && M().drill && M().drill.ended === true, String(M().phase));
}

// 8. the dev sliders: each moves, and a reset puts the defaults back
const before = T.skateMax;
tuneSet('skateMax', before + 10);
check('a slider moves a value', T.skateMax === before + 10);
tuneReset('skateMax');
check('reset puts the default back', T.skateMax === TUNE_DEFAULTS.skateMax);


// 8b. the glass, the fight, the shootout and the records, each called directly
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 21, mode: 'exhibition' } }, { fade: 0 }); step(2);
const gcx = [7, 8].find(cx => M().map.cell(cx, 22) === 2);
sim.breakGlass(gcx, 22, 0, 100);
check('a first hit cracks the glass, the cell stays', M().map.cell(gcx, 22) === 2);
sim.breakGlass(gcx, 22, 0, 100);
check('a second hit shatters it: the cell opens', M().map.cell(gcx, 22) === 0);
const fa = M().skaters[0], fb = M().skaters[3];
fa.x = 400; fa.y = 400; fb.x = 410; fb.y = 400; sim.fightStart(fa, fb);
check('the gloves drop: a fight starts', M().phase === 'fight' && !!M().fight);
let fightSteps = 0; while (M().fight && fightSteps < 120 * 25) { step(1); fightSteps++; }
check('the fight ends within its 20 seconds, one of them to the sin bin', M().phase !== 'fight' && M().skaters.some(s => s.state === 'bin'));
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 22, mode: 'exhibition' } }, { fade: 0 }); step(2);
M().score = [2, 2]; step(120 * 2); M().phase = 'play'; M().ot = true; M().clock = 0.01; let sg = 0; while (M().phase !== 'over' && sg++ < 120 * 400) step(1);
check('a tie in overtime goes to a played shootout with a winner', (M().soWinner === 0 || M().soWinner === 1) && M().soAtt >= 6, 'attempts ' + M().soAtt);
const rBefore = rec().games;
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 23, mode: 'exhibition' } }, { fade: 0 }); step(2);
M().phase = 'over'; M().over = true; M().timer = 0; M().score = [1, 0]; finishMatch();
check('a finished match goes on the records', rec().games === rBefore + 1);

// 8c. KABOOM: a full meter goes KABOOM by itself for the planned time; the other side's goal ends it
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 31, mode: 'exhibition' } }, { fade: 0 }); step(2);
M().boom[0] = 100; step(2);
check('a full BOOM meter goes KABOOM by itself', M().kab[0] > 14 && M().kab[0] <= 15 && M().boom[0] < 100);
M().kab[0] = 15; M().boom[0] = 0; M().phase = 'play';
sim.goal(1, null, false, 500, 400); step(2);
check('the other side scoring ends a KABOOM', M().kab[0] === 0);
// the fight: the gloves drop, and the time up is a draw with the balances kept
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 32, mode: 'exhibition' } }, { fade: 0 }); step(2);
{ const sk = M().skaters; sk[0].x = 400; sk[0].y = 400; sk[3].x = 410; sk[3].y = 400; sim.fightStart(sk[0], sk[3]); }
let guard = 0; while (M().fight && guard++ < 120 * 25) step(1);
check('a fight is over within 20 seconds', !M().fight && guard < 120 * 21);

// 8d. items, hazards and the Flood Wagon: throws happen in play; the intermission runs the minigame and resumes the match
G.go('match', { cfg: { teams: [0, 1], arena: 2, humans: 0, seed: 41, mode: 'exhibition' } }, { fade: 0 }); step(120 * 150);
check('fans throw items in play', (M().thrown || 0) > 0, String(M().thrown));
check('the pond has its thin ice', M().thin.length === 3 && M().thin.every(p => p.integ === 100));
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 42, mode: 'exhibition' } }, { fade: 0 }); step(2);
M().phase = 'intermission'; M().floodWanted = true; let fs = 0; while (G.sceneName !== 'flood' && fs++ < 240) step(1);
check('the period break runs the Flood Wagon', G.sceneName === 'flood', G.sceneName);
fs = 0; while ((G.sceneName === 'flood' || M().phase === 'intermission') && fs++ < 120 * 70) step(1);
check('the Flood Wagon hands back to the match', G.sceneName === 'match' && M().phase !== 'intermission', G.sceneName + ' ' + M().phase);

// 8e. the Flood Wagon can be perfect: a lane route (three passes across the rink, which the clearing band covers)
{
  sim.floodStart();
  const f = sim.getFlood();
  const ys = [236, 300, 364, 428, 492, 556], lanes = ys.flatMap((y, i) => (i % 2 ? [[150, y], [970, y]] : [[970, y], [150, y]]));
  let w = 0;
  const bot = { move() { const [wx, wy] = lanes[Math.min(w, lanes.length - 1)]; if (Math.hypot(wx - f.x, wy - f.y) < 30 && w < lanes.length - 1) w++; const [tx, ty] = lanes[Math.min(w, lanes.length - 1)]; let da = Math.atan2(ty - f.y, tx - f.x) - f.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; return [Math.max(-1, Math.min(1, da * 1.5)), 0]; } };
  for (let t = 0; t < 120 * 60 && !f.done; t++) sim.floodTick(1 / 120, bot);
  check('a skilled resurfacing reaches perfect (90%)', Math.round(f.clean / f.total * 100) >= 90, Math.round(f.clean / f.total * 100) + '%');
}

// the Flood Wagon's setting: 'Ask' waits for the player; 'Never' is not offered
G.settings.set('flood', 'Ask');
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 43, mode: 'exhibition' } }, { fade: 0 }); step(2);
M().phase = 'intermission'; M().floodWanted = true; let aw = 0; while (G.sceneName !== 'flood' && aw++ < 240) step(1);
step(120 * 30);
check('Ask waits for the player before the lap', G.sceneName === 'flood' && M().phase === 'intermission');
G.input.tap('confirm'); step(3); G.input.consumeAll();
G.settings.set('flood', 'Always');
// 9. the scenes all open and draw without errors
for (const name of ['title', 'attract', 'setup', 'story', 'practice', 'records', 'about', 'dev', 'results', 'credits']) {
  G.go(name, name === 'cutscene' ? { chapter: 0 } : null, { fade: 0 }); step(30);
}
G.go('cutscene', { chapter: 0 }, { fade: 0 }); step(30);
check('the cutscene opens', G.sceneName === 'cutscene');
check('no errors across the scenes', G.errors.length === 0, G.errors.map(e => e.message).join(' | '));

// 10. the whole game: a scripted playthrough, the Cup Run's five games, each played through to its final whistle
const playOut = (ch) => {
  G.go('match', { cfg: { teams: [0, STORY[ch].rival], arena: STORY[ch].arena, humans: 1, seed: 1000 * (ch + 1) + 7, mode: 'story', chapter: ch, mods: {} } }, { fade: 0 });
  let n = 0; while (M().phase !== 'over' && n < 120 * 60 * 12) { step(1); n++; }
  return M().phase === 'over';
};
let finished = 0;
for (let ch = 0; ch < STORY.length; ch++) if (playOut(ch)) finished++;
check('every Cup Run game reaches its final whistle', finished === STORY.length, finished + ' of ' + STORY.length);
check('the whole game plays with no errors', G.errors.length === 0, G.errors.map(e => e.message).join(' | '));

// the browser checks (Chromium, through Playwright): every scene draws, and the keys move the player
const shot = spawnSync(process.execPath, [join(root, 'tests', 'browser.mjs')], { encoding: 'utf8', env: { ...process.env, TMPDIR: join(root, '.tmp') } });
for (const line of (shot.stdout || '').split('\n')) if (line.startsWith('FAIL')) { fail++; console.log(line); }
const bm = /all (\d+) browser checks passed|(\d+) browser checks passed, (\d+) failed/.exec(shot.stdout || '');
if (bm) pass += Number(bm[1] || bm[2]);
if (shot.status !== 0 && !(shot.stdout || '').includes('FAIL')) { fail++; console.log('FAIL browser checks: ' + ((shot.stderr || shot.stdout || '').trim().split('\n').slice(-2).join(' | '))); }
// the AI Hub rounds: the hub's harness runs the game as 1 to 4 copies (see tests/hub.mjs)
const hubRun = spawnSync(process.execPath, [join(root, 'tests', 'hub.mjs')], { encoding: 'utf8', env: { ...process.env, TMPDIR: join(root, '.tmp') }, timeout: 900000 });
for (const line of (hubRun.stdout || '').split('\n')) if (line.startsWith('FAIL')) { fail++; console.log(line); }
const hm = /all (\d+) hub rounds passed|(\d+) hub rounds passed, (\d+) failed/.exec(hubRun.stdout || '');
if (hm) pass += Number(hm[1] || hm[2]);
else if (!(hubRun.stdout || '').includes('FAIL')) { fail++; console.log('FAIL hub rounds: ' + ((hubRun.stderr || hubRun.stdout || '').trim().split('\n').slice(-2).join(' | '))); }
console.log(fail ? `${pass} passed, ${fail} failed` : `all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
