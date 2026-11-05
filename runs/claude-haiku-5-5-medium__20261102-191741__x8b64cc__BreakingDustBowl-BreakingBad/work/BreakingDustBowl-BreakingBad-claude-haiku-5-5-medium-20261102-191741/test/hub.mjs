// Headless test of the AI Hub round: a stub of the hub client (vendor/session.js is the real one, in the page) stands in
// for the hub. The page opens on the wait card, the hub's start begins the desert round, the hub's clock counts down,
// the batches are delivered and the round reports one result. Run: node test/hub.mjs
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const handlers = {}, reported = [], calls = [];
let clock = -3;
const hub = {
  active: true, connect: o => { calls.push(['connect', o]); return Promise.resolve({ me: 0 }); },
  ready: () => calls.push(['ready']), on: (t, fn) => { handlers[t] = fn; }, progress: p => calls.push(['progress', p.score]),
  result: r => { reported.push(r); calls.push(['result', r.score]); }, time: () => clock
};
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '' }, AIHub: hub };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('vendor/my-3d2dge.js'), ctx);
vm.runInContext(read('src/game.js'), ctx);
const game = ctx.My3D2dge.current, T = ctx.__breakingDustBowl;
const sec = s => { for (let t = 0; t < s; t += 1 / 120) game.advance(1 / 120); };
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
sec(1);
await new Promise(r => setTimeout(r, 0));   // connect() resolves, then the game calls ready()
check(game.sceneName === 'wait', 'the hub page opens on the wait card (got ' + game.sceneName + ')');
check(calls.some(c => c[0] === 'connect' && c[1].mode === 'parallel' && c[1].seats[0] === 1 && c[1].seats[1] === 4), 'connect() asks for parallel mode, 1 to 4 seats');
check(calls.some(c => c[0] === 'ready'), 'ready() is called once the game has loaded');
handlers.start();
sec(0.5);
check(game.sceneName === 'desert' && T.cur().round, 'the start begins the desert round (got ' + game.sceneName + ')');
clock = -2; sec(0.2);
check(/GET READY/.test(T.cur().roundOver || ''), 'the countdown shows while the hub clock is negative');
clock = 0; sec(0.2);
check(T.cur().phase === 'run', 'play begins when the hub clock reaches 0');
T.setDemo(true); // an AI plays the round for the test
for (let i = 0; i < 60 * 240 && !reported.length; i++) game.advance(1 / 120);
check(reported.length === 1 && reported[0].score > 0, 'the round reports one result with a score (' + JSON.stringify(reported) + ')');
check(calls.some(c => c[0] === 'progress'), 'progress is reported during the round');
check(!game.errors.length, 'no errors in the round: ' + game.errors.map(e => e.message).join(' | '));
handlers.end && handlers.end();
console.log(failed ? failed + ' check(s) failed' : 'hub round checks passed');
process.exit(failed ? 1 : 0);
