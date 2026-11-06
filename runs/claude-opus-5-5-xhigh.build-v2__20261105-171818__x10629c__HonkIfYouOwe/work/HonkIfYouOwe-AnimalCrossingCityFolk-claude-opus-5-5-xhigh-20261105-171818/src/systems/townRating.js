// Clementine gives one honest sentence and one hint.
import { HOSTS } from '../data/dialogue/hosts.js';

export function townScore(w) {
  const o = Object.values(w.town.objects);
  const trees = o.filter((x) => x.k === 'tree').length;
  const flowers = o.filter((x) => x.k === 'flower' && (x.wilt ?? 0) < 2).length;
  const weeds = o.filter((x) => x.k === 'weed').length;
  const litter = o.filter((x) => x.k === 'drop' || x.k === 'hole').length;
  let s = 50;
  s += trees >= 40 && trees <= 70 ? 20 : trees < 40 ? -(40 - trees) : -(trees - 70);
  s += Math.min(25, flowers * 1.2);
  s -= weeds * 2;
  s -= litter;
  return { score: Math.max(0, Math.min(100, Math.round(s))), trees, flowers, weeds, litter };
}
export function townRating(g) {
  const r = townScore(g.world);
  const verdict = r.score >= 80 ? 'This is a very good village. The bee has stopped writing to the authorities.' : r.score >= 60 ? 'This is a good village. You could tell people about it. They would ask where it was.' : r.score >= 35 ? 'This village is fine. Fine is a word the bee uses.' : 'This village has seen better days. I can show you the form.';
  const hint = r.weeds > 8 ? 'Hint: weeds. Pull them. The bee is counting.' : r.trees < 40 ? `Hint: more trees. You have ${r.trees}. Forty to seventy is the sweet spot.` : r.trees > 70 ? `Hint: fewer trees. You have ${r.trees}. It's getting hard to find the post.` : r.flowers < 20 ? 'Hint: more flowers. Near the houses. The bee is very specific about this.' : r.litter > 6 ? "Hint: there's a lot of holes and things lying around." : 'Hint: keep doing whatever this is.';
  return { ...r, lines: [verdict, hint], base: HOSTS.clementine.rating };
}
