import { boot, suite, until } from './lib.mjs';
export default async () => {
  const S = suite('ui'), g = boot(), MT = g.MT, I = g.I, sc = () => g.snap().scene;
  g.adv(.5);
  const targets = ['difficulty', 'episodes', 'howto', 'scores', null, 'about'];
  for (let i = 0; i < 6; i++) {
    if (i === 4) continue;
    g.game.go('title'); g.adv(.6); const T = g.game.scene; T.menu.i = i; I.tap('confirm'); g.adv(.6);
    S.check('menu item ' + MT.TEXT.menu[i] + ' opens its screen', sc() === targets[i], sc());
    I.tap('cancel'); g.adv(.6); S.check(MT.TEXT.menu[i] + ' goes back', sc() === 'title' || sc() === 'difficulty' && i === 0, sc());
  }
  g.game.go('lobby', { diff: 'CHAMPION' }); g.adv(.5);
  const L = g.game.scene, p2 = g.game.addPlayer({ pad: 1 }); g.adv(.2);
  S.check('lobby: a pad joins', L.seats.length === 2);
  p2.tap('right'); g.adv(.2); S.check('lobby: change looks', L.seats[1].look === 2, L.seats[1].look);
  I.tap('confirm'); g.adv(.1); S.check('lobby: ready', L.seats[0].ready && !L.seats[1].ready);
  p2.tap('confirm'); g.adv(2.6); S.check('all ready: the show starts', sc() === 'cut', sc());
  S.check('difficulty applied', MT.run.diff === 'CHAMPION' && MT.maxHp() === 1);
  S.check('both players are contestants', MT.run.contestants.length === 2 && MT.run.contestants[1].input === p2);
  g.game.removePlayer(p2);
  g.game.go('howto'); g.adv(.5); const H = MT.howtoPanel; I.tap('right'); g.adv(.1); S.check('how to play turns pages', H.page === 1); I.tap('tabL'); g.adv(.1); S.check('and back', H.page === 0);
  MT._mem['mashtv:eps'] = [1]; g.game.go('episodes'); g.adv(.4); S.check('episodes 2 and 3 locked at first', g.game.scene.list.items[1].disabled && g.game.scene.list.items[2].disabled);
  MT.unlock(2); g.game.go('episodes'); g.adv(.4); S.check('episode 2 unlocks', !g.game.scene.list.items[1].disabled);
  const pages = MT.aboutPages(), titles = pages.map(p => p.title).join('|');
  for (const sec of ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK']) S.check('about has ' + sec, titles.includes(sec));
  S.check('about: no empty values', pages.every(p => p.lines.length && p.lines.every(l => !/: $/.test(l))));
  const items = (g.game.o.menu.items || []).map(i => i[0]).join(',');
  S.check('the pause menu has Dev mode, Episode map, How to play', items === 'Dev mode,Episode map,How to play', items);
  S.check('at most 6 items on the title menu', MT.TEXT.menu.length <= 6);
  return S;
};
