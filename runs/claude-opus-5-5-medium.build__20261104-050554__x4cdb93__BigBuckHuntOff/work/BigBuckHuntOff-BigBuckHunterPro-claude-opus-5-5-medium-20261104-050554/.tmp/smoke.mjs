import { load } from '../tests/lib/load.mjs';
const { B } = load();
const t0 = Date.now();
for (const id of ['hollow-1','hollow-2','hollow-3','bugle-1','bugle-2','bugle-3','muskeg-1','muskeg-2','muskeg-3','iron-rack','duke','big-mo','bonus-crow','bonus-saucer','bonus-snowball']) {
  B.reseed(1);
  const p = new B.Player(0, null); p.bot = new B.Bot(p, { skill: 'average', cheat: false });
  const play = new B.Play({ players: [p], mode: 'single' });
  const site = play.startSite(id);
  let n = 0; while (!site.ended && n < 120 * 200) { play.update(1/120); n++; }
  const bucks = site.herd.list.filter(a => a.cat === 'animal' && a.legal);
  console.log(id.padEnd(16), 'ended', site.endReason, 't', site.t.toFixed(1), 'score', p.site.score, 'shots', p.site.shots, 'hits', p.site.hits, 'bucks', bucks.length, 'dead', bucks.filter(a=>a.dead).length, 'benched', p.benched, 'actors', site.herd.list.length);
}
console.log('ms', Date.now() - t0);
