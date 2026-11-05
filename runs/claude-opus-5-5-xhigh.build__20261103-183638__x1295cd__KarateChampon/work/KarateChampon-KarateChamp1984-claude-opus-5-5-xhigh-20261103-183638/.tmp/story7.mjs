import { fresh, steps } from '../tests/lib/util.mjs';
import { drive } from '../tests/story.test.mjs';


const { KC, game } = fresh(), I = game.input, log = [], o = { auto: 10, bonusAuto: true };
KC.TUNE.cpuLevel = 1; KC.TUNE.pointsToWin = 1; steps(game, 60); I.tap('start'); steps(game, 30); I.tap('confirm'); steps(game, 10);
let last = '';
for (let i = 0; i < 120 * 60 * 6; i++) {
  if (KC.Story.node === 6 && game.sceneName === 'practice') { const sc = game.scene, D = sc.drill; const line = `${D.i} ${D.tech} ${D.state} m${D.misses} ${sc.hero.st} ended:${sc.ended} endT:${(sc.endT||0).toFixed(1)} press:${o.pressed} rel:${o.release} held:${['up','down','left','right'].filter(k=>I.down(k))}`; if (line !== last) { console.log((i/120).toFixed(2), line); last = line; } }
  if (KC.Story.node === 7) { console.log('reached 7'); break; }
  drive(game, KC, o, log);
}
console.log('paused', game.paused, 'overlay', KC.Overlay.active, 'frozen', KC.DEV.frozen, 'errors', game.errors.slice(0,3).map(e => e.message + ' @ ' + (e.stack||'').split('\n').slice(1,3).join(' ')));
