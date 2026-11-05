import { load } from '../tests/lib/load.mjs';
import { writeSync } from 'node:fs';
const log = (...a) => writeSync(1, a.join(' ') + '\n');
const { B } = load();
B.reseed(1);
const p = new B.Player(0, null); p.bot = new B.Bot(p, { skill: process.argv[3] || 'average', cheat: process.argv[4] === 'cheat' });
const play = new B.Play({ players: [p] });
const site = play.startSite(process.argv[2] || 'hollow-1');
for (let n = 0; n < 120 * 40 && !site.ended; n++) {
  play.update(1/120);
  if (n % 60 === 0) {
    const L = site.lens; const bits = site.herd.list.filter(a => a.cat === 'animal' && a.live).map(a => { const pt = B.aimPointOf(a, 'heart'); const P = L.project(...pt); const r = P ? B.castShot(site, L, P[0], P[1]) : null; return a.kind + a.id + ':' + (P ? P.slice(0, 2).map(Math.round) : 'x') + ':' + (r ? r.kind + (r.actor ? r.actor.id : '') : '') + (a.hidden ? 'H' : ''); });
    log(site.t.toFixed(1), 'ret', p.ret.map(Math.round), 'tgt', p.bot.target && p.bot.target.id, 'shots', p.site.shots, bits.join(' '));
  }
}
