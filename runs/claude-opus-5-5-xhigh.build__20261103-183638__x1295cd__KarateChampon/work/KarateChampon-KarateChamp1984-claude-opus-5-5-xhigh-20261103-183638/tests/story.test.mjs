// story: the scripted playthrough of the whole game. From the title, real menu inputs into CHAMPON ROAD; every ladder node
// in order (prologue, lessons played with real keys, nine matches with an Autopilot on player 1, the three bonus stages
// autoplayed, the cutscenes, promotions), the ending, the credits, the initials (three confirms), back to the title. Then
// the continue (a retry with the score reset) and game over with initials; then an honest run with no cheats
import { fresh, steps } from './lib/util.mjs';
const DIRS = { u: 'up', d: 'down', f: 'right', b: 'left' }, TK = { u: 'tUp', d: 'tDown', f: 'tRight', b: 'tLeft' };
// one step of a player who knows what each screen wants
export function drive(game, KC, o, log) {
  const sc = game.scene, n = game.sceneName, I = game.input; o.t = (o.t || 0) + 1 / 120;
  if (n !== o.last) { log.push(n); o.last = n; o.sceneT = 0; if (n === 'fight' && o.auto) { game.debug.autopilot(0, o.auto); } if (n === 'bonus' && o.bonusAuto) sc.d.auto = true; }
  o.sceneT += 1 / 120; const every = Math.floor(o.sceneT * 120) % 40 === 20;
  if (['cutscene', 'road', 'vscard', 'promotion'].includes(n) && every && o.sceneT > (n === 'promotion' ? 2.8 : .5)) I.tap('confirm');
  else if (n === 'credits' && every && o.sceneT > 1.2) I.tap('skip');
  else if (n === 'credits' && every) I.tap('start');
  else if (n === 'initials' && every && o.sceneT > .3) I.tap('confirm');
  else if (n === 'practice') { const D = sc.drill; if (D.done && every && sc.endT > 3.3) I.tap('confirm'); else if (D.state === 'now' && sc.hero.free && D.t > .2 && !o.pressed) { o.pressed = true; const id = D.tech; if (id === 'crouch') { I.hold('down'); o.release = 60; } else if (id === 'jump') { I.hold('up'); o.release = 4; } else { const c = KC.cellOf(id); if (c[0] !== 'n') I.hold(DIRS[c[0]]); I.tap(TK[c[1]]); o.release = 3; o.held = c[0] !== 'n' ? DIRS[c[0]] : null; } } if (D.state !== 'now') o.pressed = false; if (o.release !== undefined && --o.release <= 0) { o.release = undefined; for (const k of ['up', 'down', 'left', 'right']) I.hold(k, false); } }
  else if (n === 'continue' && o.cont !== undefined && o.sceneT > .5 && every) { if (o.cont === 'yes') I.tap('confirm'); else if (o.cont === 'no') { I.tap('down'); I.tap('down'); } o.cont = o.cont === 'no' ? 'noConfirm' : o.cont === 'noConfirm' ? 'done' : o.cont; if (o.cont === 'done') I.tap('confirm'); }
  steps(game, 1);
}
export default async t => {
  // ---- the cheat run: Autopilot L10, the CPU at level 1, one point a round ----
  { const { KC, game } = fresh(), I = game.input, log = [], o = { auto: 10, bonusAuto: true };
    KC.TUNE.cpuLevel = 1; KC.TUNE.pointsToWin = 1;
    steps(game, 60); I.tap('start'); steps(game, 30);
    t.check('title: start opens the menu', game.scene.menuOn === true);
    const it = game.scene.menu.selected; t.check('the first item is CHAMPON ROAD (no save yet)', it && it.label === 'CHAMPON ROAD', it && it.label); I.tap('confirm'); steps(game, 10);
    t.check('the road begins with the prologue', game.sceneName === 'cutscene' && KC.Story.node === 0, game.sceneName);
    const ranks = [], scores = []; let lastNode = 0, cap = 120 * 60 * 25, guard = 0, unlockK = null;
    while (guard++ < cap && !(game.sceneName === 'title' && lastNode >= 16)) {
      const node = KC.Story.node; if (node !== lastNode) { if (KC.DATA.ladder[lastNode].kind === 'match') { ranks.push(KC.Story.rank); scores.push(KC.Story.score); } if (KC.DATA.ladder[lastNode].id === 'm8') unlockK = KC.Save.unlocked('kyabetsu'); lastNode = node; }
      if (node === 16 && KC.tuneChanged()) KC.Dev.resetAll();   // (the ending: scores count again, so the initials show)
      if (game.sceneName === 'continue') { t.check('the cheat run never loses (node ' + node + ')', false); o.cont = 'yes'; }
      drive(game, KC, o, log);
    }
    t.check('the whole road plays through to the title', game.sceneName === 'title' && lastNode >= 16, game.sceneName + ' node ' + lastNode + ' after ' + (guard / 120).toFixed(0) + ' s');
    const want = ['yellow', 'green', 'blue', 'brown', 'dan1', 'dan3', 'dan5', 'dan8', 'champ'];
    t.check('each match promotes: yellow to champ', JSON.stringify(ranks) === JSON.stringify(want), ranks.join(','));
    t.check('the score grows after every match', scores.every((s, i) => i === 0 || s > scores[i - 1]) && scores[0] > 0, scores.join(','));
    t.check('kyabetsu unlocks at match 8; mei and the classic palette at the end', unlockK === true && KC.Save.unlocked('mei') && KC.Save.unlocked('classic'));
    for (const s of ['practice', 'bonus', 'promotion', 'vscard', 'road', 'cutscene', 'credits', 'initials']) t.check('the road visits ' + s, log.includes(s), log.join(' '));
    t.check('initials took a top-ten place', KC.Save.table('story').some(e => e.name === 'AAA'), JSON.stringify(KC.Save.table('story').slice(0, 3)));
    t.check('autosave: CONTINUE appears on the title', (() => { I.tap('start'); steps(game, 20); return game.scene.menu.items[0].label === 'CONTINUE'; })(), game.scene.menu && game.scene.menu.items[0].label);
    t.check('no errors on the whole road', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  }
  // ---- continue and game over ----
  { const { KC, game } = fresh(), I = game.input, log = [], o = {};
    KC.Story.newGame(); KC.Story.node = 2; KC.Story.score = 4000; KC.Story.rank = 'white'; KC.Story.run(); steps(game, 2);
    for (let i = 0; i < 120 * 20 && game.sceneName !== 'fight'; i++) drive(game, KC, o, log);
    steps(game, 120 * 6); KC.scene.bout.forceWin(1, 'win'); for (let i = 0; i < 120 * 8 && game.sceneName !== 'continue'; i++) steps(game, 1);
    t.check('a lost match asks CONTINUE?', game.sceneName === 'continue', game.sceneName);
    I.tap('confirm'); steps(game, 4); t.check('continuing retries the match with the score reset and the rank kept', game.sceneName === 'vscard' && KC.Story.score === 0 && KC.Story.rank === 'white' && KC.Story.node === 2, game.sceneName + ' ' + KC.Story.score);
    for (let i = 0; i < 120 * 10 && game.sceneName !== 'fight'; i++) drive(game, KC, o, log);
    steps(game, 120 * 6); KC.Story.score = 300000; KC.scene.bout.forceWin(1, 'win'); for (let i = 0; i < 120 * 8 && game.sceneName !== 'continue'; i++) steps(game, 1);
    steps(game, 120 * 10.5); t.check('the countdown runs out to GAME OVER', game.sceneName === 'gameover', game.sceneName);
    for (let i = 0; i < 120 * 10 && game.sceneName === 'gameover'; i++) { if (i % 60 === 30 && i > 330) I.tap('confirm'); steps(game, 1); }
    t.check('a qualifying score enters initials', game.sceneName === 'initials', game.sceneName);
    for (let i = 0; i < 120 * 5 && game.sceneName === 'initials'; i++) { if (i % 30 === 15) I.tap('confirm'); steps(game, 1); }
    steps(game, 120 * 2); t.check('then the records or the title', ['title', 'records'].includes(game.sceneName), game.sceneName);
    t.check('the table has the new score', KC.Save.table('story')[0].score === 300000, JSON.stringify(KC.Save.table('story')[0]));
  }
  // ---- the tip after two lost rounds, and the easier retry ----
  { const { KC, game } = fresh(); KC.Story.newGame(); KC.Story.node = 5; KC.Story.lost.ebi = 2; const d = KC.Story.matchData(); t.check('after 2 lost rounds the VS card shows a tip', d.tip === KC.FIGHTER.ebi.tip); KC.Story.assist = true; t.check('the easier retry lowers the CPU', KC.Story.matchData().assist === true); }
  // ---- the honest run: Autopilot L7 against the normal ladder on Normal, continues allowed; no soft-locks ----
  { const { KC, game } = fresh(), log = [], o = { auto: 7, bonusAuto: true, cont: 'yes' };
    KC.Story.newGame(); KC.Story.run(); let guard = 0, last = 0, start = 0, worst = 0, matches = 0, losses = 0; steps(game, 2);
    while (guard++ < 120 * 60 * 40 && !(KC.Story.node >= 16)) { if (KC.Story.node !== last) { worst = Math.max(worst, (guard - start) / 120); start = guard; last = KC.Story.node; } if (game.sceneName === 'continue') { if (o.last !== 'continue') losses++; o.cont = 'yes'; } if (game.sceneName === 'promotion' && o.last !== 'promotion') matches++; drive(game, KC, o, log); }
    t.check('honest run: the road is finished (continues allowed)', KC.Story.node >= 16, 'stuck at node ' + KC.Story.node + ' in ' + game.sceneName);
    t.check('honest run: no node took 10 simulated minutes', worst < 600, worst.toFixed(0) + ' s');
    t.check('honest run: no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
    t.note = 'honest run: ' + matches + ' wins, ' + losses + ' losses';
  }
};
