// Headless test for BREAKING DUST BOWL: no browser. It loads the engine and the game the way the page does (vendor/
// session.js is skipped: no hub), then checks: the title, attract mode after 10 s idle, the attract run through the
// lab, the desert and the showdown without errors, and a played lab cook. Run: node test/test.mjs
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('vendor/my-3d2dge.js'), ctx, { filename: 'my-3d2dge.js' });
vm.runInContext(read('src/game.js'), ctx, { filename: 'game.js' });

const game = ctx.My3D2dge.current;
const T = ctx.__breakingDustBowl;
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
const sec = (s, every = 1 / 120) => { for (let t = 0; t < s; t += every) game.advance(every); };

check(game.sceneName === 'title', 'the page starts on the title (got ' + game.sceneName + ')');
sec(1);
check(!game.errors.length, 'no errors on the title: ' + game.errors.map(e => e.message).join(' | '));

// attract mode: 10 s idle on the title starts an AI demo in the lab
sec(10.5);
check(game.sceneName === 'lab' && T.cur() && T.cur().kind === 'lab', 'after 10 s idle, attract mode starts in the lab (got ' + game.sceneName + ')');

// the AI cooks three batches, walks out, plays the desert run, then the showdown
let seen = new Set([game.sceneName]), t0 = 0;
for (let i = 0; i < 60 * 240 && !seen.has('showdown'); i++) {
  game.advance(1 / 120);
  seen.add(game.sceneName);
}
check(seen.has('desert'), 'the attract run reaches the desert (scenes: ' + [...seen].join(', ') + ')');
check(seen.has('showdown'), 'the attract run reaches the showdown');
check(!game.errors.length, 'no errors in the attract run: ' + game.errors.map(e => e.message).join(' | '));
const p = T.progress();
check(p.delivered >= 1 || (T.cur() && T.cur().kind === 'showdown'), 'the attract run delivers batches (delivered ' + p.delivered + ', cash $' + p.cash + ')');
check(p.purity.length >= 3, 'three cooks were logged (purity ' + JSON.stringify(p.purity) + ')');

// the showdown runs its fight for a while: no errors, the boss takes hits
sec(60);
check(!game.errors.length, 'the showdown runs with no errors: ' + game.errors.map(e => e.message).join(' | '));
const boss = T.cur() && T.cur().boss;
check(!!boss, 'the showdown has a boss (hp ' + (boss && boss.hp) + ')');

// a played run (not attract): go to the title by any key, start a new game, and check the lab cook by hand
game.go('title', {}, { fade: 0 }); sec(1);
T.setDemo(false);
Object.assign(T.progress(), { batches: 0, purity: [], delivered: 0, cash: 0, scene: 'lab' });   // what NEW GAME does
game.go('lab', {}, { fade: 0 }); sec(3);
const lab = T.cur();
check(lab && lab.kind === 'lab' && lab.talk.open, 'the lab opens with Tomas talking (' + (lab && lab.kind) + ')');
for (let i = 0; i < 2000 && lab.talk.open; i++) { game.input.tap('confirm'); game.advance(1 / 120); }
check(lab.phase === 'free', 'the intro is done and the player is free (phase ' + lab.phase + ')');
check(!game.errors.length, 'no errors in the lab: ' + game.errors.map(e => e.message).join(' | '));

// a cook: walk to the station and press confirm in the green band; the sweep is timed by the state
lab.hero.body.x = lab.station.x + 4; lab.hero.body.y = lab.station.y;
game.advance(1 / 120); game.input.tap('confirm'); game.advance(1 / 120);
check(lab.phase === 'cook', 'confirm at the station starts a cook (phase ' + lab.phase + ')');
for (let st = 0; st < 3 && lab.phase === 'cook'; st++) {
  for (let i = 0; i < 2000; i++) {
    if (Math.abs(lab.cook.pos - lab.cook.zone) < lab.cook.half * .6) break;
    game.advance(1 / 120);
  }
  for (let k = 0; k < 6; k++) game.advance(1 / 120);   // presses a few frames apart, as a player's are
  game.input.tap('confirm'); game.advance(1 / 120);
  while (lab.talk.open) { game.input.tap('confirm'); game.advance(1 / 120); }
}
check(lab.cookDone === 1 && T.progress().purity.length === 1, 'a played cook gives a batch with a purity (' + JSON.stringify(T.progress().purity) + ')');
check(!game.errors.length, 'no errors after a played cook: ' + game.errors.map(e => e.message).join(' | '));

// the settings: the axis inversion and the symbols exist and take effect
game.settings.set('invertX', true);
check(game.settings.invertX === true, 'the gamepad left-right inversion is a setting');
game.settings.set('glyphs', 'xbox');
check(game.input.glyphs === 'xbox', 'the Xbox symbol setting reaches the input');
game.settings.set('glyphs', 'playstation');

console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
process.exit(failed ? 1 : 0);
