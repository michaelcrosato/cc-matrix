import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, TC_NO_BOOT: false }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const TC = ctx.TC, game = TC.game, seen = [], t0 = Date.now(); const go = (a, s = .5) => { if (a) game.input.tap(a); game.advance(s); };
go(null, .8); go('confirm', .8); go('confirm', .8); go('down', .3); go('confirm', .8); go('confirm', .8);
let stages = 0;
for (let k = 0; k < 2 * 3000 && game.sceneName !== 'gameover'; k++) {
  const sc = game.sceneName; if (seen[seen.length - 1] !== sc) seen.push(sc);
  if (sc === 'play' && TC.play && !TC.play.bots[0]) { stages++; Object.assign(TC.play.sim.cheats, { god: true, ammo: true }); const b = new TC.Autopilot('showoff'); b.skipCuts = true; TC.play.bots[0] = b; }
  go(sc === 'briefing' || sc === 'results' || sc === 'ending' ? 'confirm' : null, .5);
}
console.log(game.sceneName, TC.scenes.gameover.d, TC.scenes.gameover.score, stages);
for (let k = 0; k < 40 && game.sceneName !== 'menu'; k++) go('confirm', .5);
console.log(game.errors.map(e => String((e && (e.stack || e.message)) || e).split('\n').slice(0, 8).join(' / '))); console.log(seen.join(' > '), '|', game.sceneName, TC.arcade.table('arcade').slice(0, 2), game.errors.length, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
