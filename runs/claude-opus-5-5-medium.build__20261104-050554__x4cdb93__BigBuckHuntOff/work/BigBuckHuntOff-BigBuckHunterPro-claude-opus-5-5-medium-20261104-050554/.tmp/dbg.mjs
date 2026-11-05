import { load } from '../tests/lib/load.mjs';
const { B } = load();
B.reseed(1);
const p = new B.Player(0, null); p.bot = new B.Bot(p, { skill: 'average' });
const play = new B.Play({ players: [p] });
const site = play.startSite(process.argv[2] || 'big-mo');
console.log('started'); let n = 0, t0 = Date.now();
while (!site.ended && n < 120 * 60) { if (n < 3) console.log('step', n); play.update(1/120); n++; if (n % 240 === 0) { const a = site.herd.list[0]; console.log(site.t.toFixed(1), Date.now() - t0, 'ms', a && [a.state, a.hidden, Math.round(a.x), Math.round(a.y), a.speed.toFixed(1), a.orders.map(o=>o[0]).join(',')].join(' '), 'tgt', p.bot.target && p.bot.target.id, 'ret', p.ret.map(Math.round), 'shots', p.site.shots); } }
console.log('end', site.endReason, site.t);
