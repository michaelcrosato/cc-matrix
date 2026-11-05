import { load } from '../lib/load.mjs';
export default async t => {
  const { G, E } = load();
  t('21 swimsuits', G.SUITS.length === 21, G.SUITS.length); t('10 accessories', G.ACCS.length === 10); t('25 gifts', G.GIFTS.length === 25);
  const ids = [...G.SUITS, ...G.ACCS, ...G.GIFTS].map(i => i.id); t('item ids unique', new Set(ids).size === ids.length);
  for (const id of G.FIGHTERS) {
    const row = G.GIFTS.map(gf => G.taste(id, gf.id)); const n = k => row.filter(x => x === k).length;
    t(id + ' tastes: 2 loves, 3+ likes, 3+ dislikes', n('love') >= 2 && n('like') >= 3 && n('dislike') >= 3, JSON.stringify({ love: n('love'), like: n('like'), dislike: n('dislike') }));
    const L = G.LINES[id]; t(id + ' has every line kind', L.greet.length === 3 && L.chat.length === 6 && L.love.length === 2 && L.like.length === 2 && L.refuse.length === 2 && L.inviteYes.length === 2 && L.inviteNo.length === 2 && L.win.length === 2 && L.loss.length === 2 && L.farewell.length === 2 && !!L.ending && !!L.visit);
  }
  for (const id in G.CAST) t(id + ' has a voice', !!G.CAST[id].voice);
  for (const s of G.SUITS) t('suit ' + s.id + ' cut and pattern known', ['onepiece', 'racer', 'halter', 'sport2', 'tankini', 'rash', 'sarong'].includes(s.cut) && ['solid', 'stripes', 'pin', 'dots', 'waves', 'stars', 'floral', 'palms', 'check', 'gradient', 'geo', 'scales', 'sevens', 'lame'].includes(s.pattern));
  for (const sh in G.SHOPS) t('shop ' + sh + ' has stock', G.shopStock(sh, 5).length >= 6);
  // every line fits two lines of the dialog box (about 36 characters a line)
  const long = []; for (const id of G.FIGHTERS) for (const k in G.LINES[id]) { const v = G.LINES[id][k]; for (const l of [].concat(typeof v === 'object' && !Array.isArray(v) ? v.lines : v)) if (typeof l === 'string' && E.font.width(l) > 2 * 300) long.push(id + '.' + k); }
  t('lines fit the dialog box', !long.length, long.join(','));
  t('every rig builds', G.FIGHTERS.concat(['sonny', 'pepper', 'kai', 'odette', 'bo']).every(id => !!G.makeRig(id)));
  for (const s of G.SUITS) { const r = G.makeRig('rin', { suit: s.id, acc: ['sunhat', 'heartshades', 'shellnecklace'] }); r.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); t('suit ' + s.id + ' dresses a rig', r.C.cloth === s.colors[0]); }
};
