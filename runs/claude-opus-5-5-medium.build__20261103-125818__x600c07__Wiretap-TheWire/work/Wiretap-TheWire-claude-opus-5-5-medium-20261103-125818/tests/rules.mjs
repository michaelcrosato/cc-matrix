// Rules: cipher, photo scoring, perception targets, box thresholds, affidavit scoring, the chase, montage for every path.
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
let ERR = 0; const ctx = { console: { log: console.log, info() {}, warn() {}, error: (...a) => { ERR++; console.log('ERR', String(a[0]).slice(0, 200)); } }, addEventListener() {}, location: { hash: '' }, setTimeout: f => f(), performance: { now: () => Date.now() } };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx);
const src = readFileSync('dev-bundle.js', 'utf8').replace(/\}\)\(\);\s*$/, `;globalThis.__T = { encode, decodeTurns, Cipher, Camera, Perception, Agent, makePlayer, World, Box, BOX, Paper, montageCards, FL: () => STATE.flags, S: () => STATE, setS: s => { STATE = s; }, freshState, Chase, FD, Field, PAGES_COREY };\n})();`);
vm.runInContext(src, ctx); const g = ctx.My3D2dge.current; g.advance(.5); const T = ctx.__T; let fails = 0;
const ok = (n, c, x = '') => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' · ' + x : '')); if (!c) fails++; };
ok('cipher CW encodes App. C', T.encode('555-0187') === '555-0769' && T.encode('555-0143') === '555-0781' && T.encode('555-0174') === '555-0798');
ok('one turn decodes, three turns decode the flip', T.decodeTurns('555-0769', 1) === '555-0187' && T.decodeTurns('555-0329', 3) === '555-0143');
// photo scoring
const W = T.World, cop = T.makePlayer('dana', { x: 30 * 16, y: 28 * 16 }), cam = T.Camera.make({});
const tee = new T.Agent({ id: 'tee', person: 'tee', x: 30 * 16 + 8, y: 31 * 16 }); tee.role = 'lieutenant'; tee.facing = Math.atan2(cop.y - tee.y, cop.x - tee.x);
cam.focusT = .4; let s = T.Camera.score(cam, cop, tee); ok('facing, focused: 2 stars', s.stars === 2, JSON.stringify(s.tags));
tee.act = 'payphone'; s = T.Camera.score(cam, cop, tee); ok('in the act: 3 stars', s.stars === 3);
tee.facing += Math.PI; tee.act = null; s = T.Camera.score(cam, cop, tee); ok('back turned: no face star', !s.tags.includes('face'));
const far = new T.Agent({ id: 'x', person: 'rook', x: 30 * 16, y: 28 * 16 + 240 }); ok('230+ units: blurry', T.Camera.score(cam, cop, far).stars === 0);
cop.burned = true; tee.facing -= Math.PI; ok('burned: 0 stars', T.Camera.score(cam, cop, tee).stars === 0); cop.burned = false;
// perception: staring at a lookout from 60 is made fast; walking past isn't; blending at 100 never
const look = new T.Agent({ id: 'moe', person: 'moe', x: 30 * 16, y: 26.5 * 16 }); look.watcher = true; look.range = 170; look.fov = 1.7;
const run = (setup, secs) => { look.minds = {}; const p = T.makePlayer('dana', { x: 0, y: 0 }, { id: 'd' + Math.random() }); setup(p); look.facing = Math.atan2(p.y - look.y, p.x - look.x); let made = -1;
  for (let i = 0; i < secs * 120; i++) { T.Perception.update(1 / 120, [look], [p], { onMade: () => { if (made < 0) made = i / 120; } }); look.facing = Math.atan2(p.y - look.y, p.x - look.x); } return made; };
const stare = run(p => { p.body.x = look.x + 60; p.body.y = look.y; p.watching = true; p.aimAt = { x: look.x, y: look.y }; p.still = 5; }, 12);
ok('staring from 60: made in about 4 s', stare > 2 && stare < 7, stare.toFixed(1) + ' s');
ok('walking past at 60: never made', run(p => { p.body.x = look.x + 60; p.body.y = look.y; p.moving = true; }, 20) < 0);
ok('blending at 100: never made', run(p => { p.body.x = look.x + 100; p.body.y = look.y; p.still = 9; p.blending = true; }, 30) < 0);
const still = run(p => { p.body.x = look.x + 100; p.body.y = look.y; p.still = 9; }, 20); ok('standing still at 100: made in about 9-14 s', still > 6 && still < 16, still.toFixed(1) + ' s');
// box: thresholds and the lawyer
T.setS(T.freshState()); const st = { resolve: 70, fear: 30, shown: ['pager'], got: [] }, out = []; T.Box.checkBeats(T.BOX.corey, st, out); ok('Resolve 70: B1 only', st.got.join() === 'B1');
st.resolve = 40; T.Box.checkBeats(T.BOX.corey, st, out); ok('Resolve 40 + pager: B2', st.got.includes('B2'));
// affidavit: a direct page + photo reaches 4
const ev = [{ id: 'page:x', kind: 'page', num: 'P1' }, { id: 'act:tee:payphone', kind: 'photo', act: 'payphone', who: 'tee' }];
ok('P1: page + payphone act = 4 points with a direct item', T.Paper.score('P1', ev).ok, JSON.stringify(T.Paper.score('P1', ev)));
ok('P1: an informant alone is not enough', !T.Paper.score('P1', [{ id: 'stmt:pockets', kind: 'stmt' }]).ok);
// montage: every path gives 14 cards with text
let mOk = true; for (const path of ['A', 'B']) for (const i5 of ['weight', 'talk', 'run', 'stay']) for (const loss of ['tee', 'pigeon', 'corey']) for (const ci of [true, false]) {
  const S = T.freshState(); Object.assign(S.flags, { path, i5, lossOn: loss, coreyCI: ci, coreyExposed: ci, dilemma: 'go' }); T.setS(S); const c = T.montageCards(); if (c.length !== 14 || c.some(x => !x[2])) mOk = false; }
ok('montage: 14 valid cards on every branch', mOk);
ok('no runtime errors', ERR === 0, ERR + '');
process.exit(fails ? 1 : 0);
