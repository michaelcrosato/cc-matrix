// The scripted playthrough of the whole game (PLAN 8.5): the full descent twice (the same hash both times), a balance
// smoke with no cheats, the attract loop, and four players on one machine.
import { writeFileSync } from 'node:fs';
import { boot, suite } from './lib.mjs';
const LIMIT = 360;   // game seconds a floor may take
function descent(S, label) {
  const t = boot({ seed: 777 }), { game, api, D } = t, I = t.I;
  game.settings.set('cheat_god', true);
  // the front end, as a player would: the title, the menu, class select with a second player
  I.tap('confirm'); game.advance(.4); I.tap('confirm'); game.advance(.8);
  if (label === 'A') S.check('the menu opens class select', game.sceneName === 'select', game.sceneName);
  const p2 = game.addPlayer({ keys: 'right' }); game.advance(.4);
  I.tap('confirm'); game.advance(.3);
  for (let i = 0; i < 3; i++) { p2.tap('right'); game.advance(.15); }
  p2.tap('confirm'); game.advance(.3); I.tap('start'); game.advance(1);
  if (label === 'A') S.check('two fools chosen, the run begins', game.sceneName === 'play' && D.world().heroes.map(h => h.cls).join() === 'berserker,hexer', D.world() && D.world().heroes.map(h => h.cls));
  const order = [], phases = [], times = {};
  let lastW = null, t0 = 0, stuck = null;
  for (let sec = 0; sec < 4000 && game.sceneName !== 'ending'; sec += .5) {
    const W = D.world();
    if (W && W !== lastW) { lastW = W; order.push(W.id); t0 = sec; for (const h of W.heroes) h.bot = h.bot || api.makeBot({ cheat: false }); }
    if (W && W.boss && phases[phases.length - 1] !== W.boss.phase) phases.push(W.boss.phase);
    if (W) times[W.id] = sec - t0;
    if (sec - t0 > LIMIT + 15) { stuck = W.id + ' (' + W.heroes.map(h => h.bot && h.bot.goal).join('/') + ')'; break; }
    game.advance(.5);
  }
  if (label === 'A') {
    S.check('the floors in order', order.join() === 'f1,f2,f3,t1,f4,f5,f6,t2,f7,f8,f9', order.join() + (stuck ? ' stuck on ' + stuck : ''));
    S.check('every floor finished within 6 minutes', Object.values(times).every(s => s <= LIMIT + 12), times);
    S.check('the King\'s phases in order', phases.join().startsWith('0,1,2,3') || phases.join().startsWith('1,2,3'), phases);
    S.check('the ending', game.sceneName === 'ending');
  }
  game.advance(17); game.advance(2);
  if (label === 'A') S.check('the credits', game.sceneName === 'credits', game.sceneName);
  game.advance(27); I.tap('confirm'); game.advance(1.5);
  if (label === 'A') S.check('Descent II begins', game.sceneName === 'play' && D.world().descent === 2 && D.world().id === 'f1');
  game.advance(8);
  if (label === 'A') { S.check('a cheated run keeps off the table', api.CAB.table(api.TABLE_MODE).length === 0); S.check('the descent: no errors', !t.errors().length, t.errors().slice(0, 3)); }
  return { hash: D.stateHash(), score: D.world().heroes.map(h => h.score), times };
}
export default function () {
  const S = suite('play');
  const a = descent(S, 'A'), b = descent(S, 'B');
  S.check('the same game twice: the same hash', a.hash === b.hash && a.score.join() === b.score.join(), [a.hash, b.hash, a.score, b.score]);

  // ---- balance smoke: no cheats ----
  const metrics = { full: a.times };
  {
    const t = boot({ seed: 31 }), { game, api, D } = t;
    game.settings.set('difficulty', 'easy');
    api.startRun([{ cls: 'shieldmaiden', bot: api.makeBot({ cheat: false }) }]);
    game.go('play', { floor: 0, card: false }, { fade: 0 }); game.advance(.1);
    let sec = 0, seen = []; for (; sec < 1500 && D.world().index < 4; sec++) { game.advance(1); if (seen[seen.length - 1] !== D.world().id) seen.push(D.world().id); }
    const h = D.world().heroes[0];
    metrics.easy = { reached: D.world().id, seconds: sec, hp: Math.round(h.hp), continues: h.continues, score: h.score, kills: h.stats.kills, food: h.stats.food };
    S.check('balance: a bot on Easy goes from floor 1 to floor 4', D.world().id === 'f4', metrics.easy);
    S.check('balance: ...rising again at most once', h.continues <= 1, metrics.easy);
  }
  {
    const t = boot({ seed: 32 }), { game, api, D } = t;
    api.startRun([{ cls: 'berserker', bot: api.makeBot({ cheat: false }) }]);
    game.go('play', { floor: 0, card: false }, { fade: 0 }); game.advance(.1);
    const W0 = D.world(); let sec = 0, hpAt = 0; for (; sec < 400 && D.world() === W0; sec += .25) { hpAt = W0.heroes[0].hp; game.advance(.25); }
    const h = W0.heroes[0];
    metrics.normal1 = { seconds: sec, hp: Math.round(hpAt), food: h.stats.food, kills: h.stats.kills, continues: h.continues };
    S.check('balance: a bot on Normal clears floor 1 with 300+ health', D.world() !== W0 && hpAt >= 300 && h.continues === 0, metrics.normal1);
  }
  writeFileSync(new URL('./out/balance.json', import.meta.url), JSON.stringify(metrics, null, 2));

  // ---- the attract loop: 90 s, every segment, no errors; any input leaves ----
  {
    const t = boot({ seed: 5 }), { game } = t;
    game.advance(11);
    S.check('attract: starts after 10 s idle', game.sceneName === 'attract');
    const segs = new Set(); for (let i = 0; i < 90 * 4 + 40; i++) { game.advance(.25); segs.add(game.scene.seg); }
    S.check('attract: every segment plays, and it loops', segs.size === 7 && game.sceneName === 'attract', [...segs]);
    S.check('attract: the bots never fall', !t.D.world() || t.D.world().heroes.every(h => h.alive));
    t.I.tap('fire'); game.advance(.6);
    S.check('attract: any input returns to the title', game.sceneName === 'title');
    S.check('attract: no errors', !t.errors().length, t.errors().slice(0, 3));
  }

  // ---- four players on one machine: keyboard halves and pads, joining mid-floor, dropping out, the leash ----
  {
    const t = boot({ seed: 8 }), { game, api, D } = t;
    api.startRun([{ cls: 'ranger', input: t.I }]);
    game.go('play', { floor: 1, card: false }, { fade: 0 }); game.advance(.2);
    const p2 = game.addPlayer({ keys: 'right' }), p3 = game.addPlayer({ pad: 0 }), p4 = game.addPlayer({ pad: 1 }); game.advance(.2);
    const W = D.world();
    S.check('four join mid-floor: two keyboard halves, two pads', W.heroes.length === 4 && game.players.length === 4 && t.I.half === 'left' && p2.half === 'right' && p3.pad === 0 && p4.pad === 1);
    S.check('four different fools', new Set(W.heroes.map(h => h.cls)).size === 4, W.heroes.map(h => h.cls));
    S.check('the left half still fires with the mouse', t.I.map.fire.includes('Mouse0') && t.I.map.fire.includes('KeyF') && p2.map.fire.includes('Period'), [t.I.map.fire, p2.map.fire]);
    p3.hold('left'); game.advance(.2); p3.hold('left', false);
    W.heroes[1].joinT = 0; W.heroes[2].joinT = 0; W.heroes[3].joinT = 0;
    t.hold('left'); p2.hold('right'); game.advance(4); t.hold('left', false); p2.hold('right', false);
    const xs = W.heroes.map(h => h.x), span = Math.max(...xs) - Math.min(...xs);
    S.check('the leash keeps all four on one screen', span <= W.leash[0] + 2, [span, W.leash]);
    api.dropOut(3); game.advance(.2);
    S.check('player 3 drops out', W.heroes.length === 3 && game.players.length === 3);
    S.check('four players: no errors', !t.errors().length, t.errors().slice(0, 3));
  }
  return S;
}
