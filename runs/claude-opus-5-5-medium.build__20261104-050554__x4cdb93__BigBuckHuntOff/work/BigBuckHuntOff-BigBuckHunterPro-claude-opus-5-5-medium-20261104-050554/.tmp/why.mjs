import { load } from '../tests/lib/load.mjs';
const { B } = load();
for (const id of process.argv.slice(2)) {
B.reseed(1); B.resetIds();
const p = new B.Player(0, null); p.bot = new B.Bot(p, { skill: 'expert', cheat: true });
const play = new B.Play({ players: [p] }), site = play.startSite(id);
const vis = {}; let n = 0;
while (!site.ended && n < 120 * 200) { play.update(1 / 120); n++; if (n % 30 === 0) for (const a of site.herd.list) if (a.cat === 'animal' && a.legal && a.live) { const pt = B.aimPointOf(a, 'heart'), P = site.lens.project(...pt); const on = P && P[0] > 0 && P[0] < 480 && P[1] > 0 && P[1] < 270; const r = on ? B.castShot(site, site.lens, P[0], P[1]) : null; const k = a.id; vis[k] = vis[k] || { on: 0, hit: 0, what: {} }; if (on) { vis[k].on++; if (r.actor === a) vis[k].hit++; else vis[k].what[r.kind + (r.actor ? r.actor.kind : '')] = (vis[k].what[r.kind + (r.actor ? r.actor.kind : '')] || 0) + 1; } } }
console.log(id, site.endReason, site.t.toFixed(1), 'shots', p.site.shots, JSON.stringify(site.herd.list.filter(a => a.cat === 'animal' && a.legal).map(a => [a.id, a.dead ? 'D' : a.escaped ? 'E' : '?', vis[a.id]])));
}
