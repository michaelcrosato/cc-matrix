// The AI Hub round against a fake hub (the protocol's calls): connect, ready with no key press, the card's answers, the
// start on the hub's clock, the ghost sends, progress, the result once, and the end. The real harness runs in a browser.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const dev = new URL('../', import.meta.url), read = p => readFileSync(new URL(p, dev), 'utf8');
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; vm.createContext(ctx);
const calls = [], sent = [], progress = [], results = [], answers = []; const handlers = {}; let clock = -3000;
ctx.AIHub = { active: true, connect(o) { calls.push(['connect', o.mode, o.seats.join('-'), o.card]); return Promise.resolve({ me: 0, mode: 'ghost', round: 1, limitMs: 240000, seed: 7, host: 0, isHost: true,
  players: [{ id: 0, name: 'Ann', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }] }); },
  ready() { calls.push(['ready']); }, on(ev, fn) { handlers[ev] = fn; }, time() { return clock; }, send(d) { sent.push(d); return true; },
  progress(p) { progress.push(p); }, result(r) { results.push(r); }, answer(a) { answers.push(a); }, rng() { return () => 0.5; }, fail() {} };
for (const f of ['engine/my-3d2dge.js', ...JSON.parse(read('src/manifest.json')).map(f => 'src/' + f)]) vm.runInContext(read(f), ctx, { filename: f });
const game = ctx.My3D2dge.current, OB = ctx.OB;
const fails = [];
(async () => { const check = (n, ok, d = '') => { if (!ok) fails.push(n + (d ? ': ' + d : '')); };
await new Promise(r => setTimeout(r, 0));
game.advance(.1);
check('hub: the card is the first scene', game.sceneName === 'hubcard', game.sceneName);
check('hub: ready() called once, with no key', calls.filter(c => c[0] === 'ready').length === 1);
check('hub: connect in ghost mode, seats 1-4, with the card', calls.some(c => c[1] === 'ghost' && c[2] === '1-4' && c[3] === true));
check('hub: no title, no pause quit', OB.env.hub === true);
handlers.card({ left: 9000, paused: false, starting: false, ready: [0], asking: 0, asked: false });
game.advance(1);
ctx.AIHub.answer = a => answers.push(a);
game.debug && 0;
// the start: the hub's clock is negative until the round begins
handlers.start({ in: 3000 }); game.advance(.5);
check('hub: the race starts on the start event', game.sceneName === 'race', game.sceneName);
game.advance(3); check('hub: the countdown waits for the hub clock', OB.race.status === 'countdown', OB.race.status);
clock = 0; game.advance(.5);
check('hub: play begins when the clock reaches zero', OB.race.status !== 'countdown' || OB.race.countdown < 3.2, OB.race.status);
game.advance(10);
const ghostSends = sent.filter(d => d.t === 'g').length;
check('hub: ghost sends about 10 a second', ghostSends >= 95 && ghostSends <= 130, ghostSends + ' sends');
check('hub: ghost sends use unreliable and carry the stage area', sent.some(d => d.t === 'g' && d.area === 'S1'));
check('hub: progress once a second', progress.length >= 8, progress.length + ' reports');
// a ghost from the other copy arrives: drawn only while it shares our stage
handlers.message({ t: 'g', area: 'S1', z: 4000, x: .3, v: 200, yaw: 0, drift: 0 }, 1);
check('hub: a ghost on our stage is kept', OB.Hub.ghosts.size === 1);
check('hub: a ghost on another stage is not drawn', OB.Hub.visible({ stage: { def: { id: 'S2' } } }).length === 0);
// the time-up, then the end: the result once, and no input after the end
handlers['time-up']({ graceMs: 5000 });
check('hub: time-up reports a result', results.length >= 1, JSON.stringify(results));
handlers.end({ reason: 'finished', standings: [0, 1] });
check('hub: end stops the music', OB.Music.now === null);
check('hub: no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
console.log(fails.length ? 'hub fake FAILED:\n  ' + fails.join('\n  ') : 'hub fake ok: ' + ghostSends + ' ghost sends, ' + progress.length + ' progress, ' + results.length + ' result');
process.exit(fails.length ? 1 : 0);
})();
