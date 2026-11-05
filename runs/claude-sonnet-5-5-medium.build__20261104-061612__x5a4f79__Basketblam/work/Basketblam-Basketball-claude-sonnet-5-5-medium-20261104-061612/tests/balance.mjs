import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url);
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', here), 'utf8'), ctx); vm.runInContext(readFileSync(new URL('build/game.js', here), 'utf8'), ctx);
const bb = ctx.__bb, game = bb.game, S = bb.S;
const tot = { games: 0, pts: 0, dunk: 0, three: 0, steals: 0, blocks: 0, shoves: 0, rel: 0, made: 0, clockv: 0, novas: 0, secs: 0, oop: 0 };
['basket'].forEach(t => bb.on(t, e => { tot.made++; if (e.dunk) tot.dunk++; if (e.three) tot.three++; if (e.oop) tot.oop++; }));
bb.on('steal', () => tot.steals++); bb.on('block', () => tot.blocks++); bb.on('shove', () => tot.shoves++); bb.on('release', () => tot.rel++); bb.on('shotClockViolation', () => tot.clockv++); bb.on('supernovaOn', () => tot.novas++);
const pairs = [[0, 1, 'alley'], [2, 3, 'lunar'], [1, 2, 'roof'], [4, 0, 'dome']];
for (let g = 0; g < 8; g++) {
  const [a, b, c] = pairs[g % 4];
  game.go('match', { cfg: { teams: [a, b], court: c, mode: 'exhibition', humans: {}, qLen: 90, difficulty: 'Pro', seed: 40 + g } }, { fade: 0 }); game.advance(.05);
  let n = 0; while (!S.match.over && n < 120 * 60 * 14) { game.advance(1 / 30); n += 4; }
  tot.games++; tot.pts += S.match.score[0] + S.match.score[1]; tot.secs += S.match.time;
  console.log('game', g, c, TEAMS(a), TEAMS(b), S.match.score.join('-'), 'ot', S.match.ot, Math.round(S.match.time) + 's', S.match.over ? '' : 'NOT OVER');
}
function TEAMS(i) { return bb.TEAMS[i].short; }
console.log(JSON.stringify(tot)); console.log('errors', game.errors.map(e => e.message));
