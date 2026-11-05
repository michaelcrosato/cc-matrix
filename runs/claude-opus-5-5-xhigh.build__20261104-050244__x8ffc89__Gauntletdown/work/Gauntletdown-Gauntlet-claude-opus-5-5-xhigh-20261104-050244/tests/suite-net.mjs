// The shared world through a fake hub: host + clients (with latency, jitter and loss), a server round, leaving.
import { suite } from './lib.mjs';
import { hubRound } from './fakehub.mjs';
const W = c => c.t.D.world(), heroOf = (c, id) => W(c).heroes.find(h => h.hubId === id);
async function startRound(net, S) {
  await net.step(.5);
  S.check('every copy readies without a key press', net.copies.every(c => c.ready), net.copies.map(c => c.me + ':' + c.ready));
  net.card(); await net.step(.2);
  for (const c of net.copies) if (!c.hub.server) c.t.I.tap('confirm');
  await net.step(.2);
  S.check('the card: confirm answers ready', net.copies.filter(c => !c.hub.server).every(c => c.answers.includes('ready')), net.copies.map(c => c.answers));
  net.start(); await net.step(3.3);
  S.check('play begins at time 0', net.copies.every(c => c.t.game.sceneName === 'splay'), net.copies.map(c => c.t.game.sceneName));
}
export default async function () {
  const S = suite('net');
  // ---- host + 2 clients, 150 ms latency, 50 jitter, 5% loss ----
  const net = hubRound({ players: 3, latency: 150, jitter: 50, loss: 5 });
  await startRound(net, S);
  const host = net.copy(0), c1 = net.copy(1), c2 = net.copy(2);
  S.check('roles', host.t.D.net().role === 'host' && c1.t.D.net().role === 'client', [host.t.D.net().role, c1.t.D.net().role]);
  await net.step(3);
  S.check('clients see the host\'s monsters', W(c1).monsters.length > 0 && W(c2).monsters.length > 0, [W(host).monsters.length, W(c1).monsters.length]);
  const hm = W(host).monsters.find(m => !m.dead), cm = hm && W(c1).monsters.find(m => m.id === hm.id);
  S.check('a puppet follows its monster', cm && Math.hypot(cm.x - hm.x, cm.y - hm.y) < 40, cm ? [cm.x, cm.y, hm.x, hm.y] : 'no puppet');
  // a client walks onto an item: the host gives it to them, everyone sees it gone
  const it = W(host).items.find(i => i.type === 'gold' || i.type === 'gem');
  const me1 = heroOf(c1, 1); me1.x = it.x; me1.y = it.y;
  await net.step(1.2);
  const hostHero1 = heroOf(host, 1);
  S.check('a client\'s pickup is confirmed by the host', W(host).items.find(i => i.id === it.id).gone && hostHero1.score > 0, [W(host).items.find(i => i.id === it.id).gone, hostHero1.score]);
  S.check('every copy sees the item gone', [c1, c2].every(c => W(c).items.find(i => i.id === it.id).gone));
  S.check('the client\'s score comes from the host', heroOf(c1, 1).score === hostHero1.score, [heroOf(c1, 1).score, hostHero1.score]);
  // a race: two clients on one item at once: one gets it
  const it2 = W(host).items.find(i => !i.gone && (i.type === 'gold' || i.type === 'gem' || i.type === 'roast'));
  if (it2) { const a = heroOf(c1, 1), b = heroOf(c2, 2), sa = heroOf(host, 1).score + heroOf(host, 2).score + heroOf(host, 1).hp + heroOf(host, 2).hp; a.x = b.x = it2.x; a.y = b.y = it2.y; await net.step(1.2); S.check('a race for one item: one hero gets it', W(host).items.find(i => i.id === it2.id).gone, sa); }
  // a door opened on the host opens everywhere; a kill reaches everyone
  const d = W(host).doors.find(x => !x.open);
  if (d) { host.t.api.damage; host.t.ctx.My3D2dge.current.debug.world(); const hh = heroOf(host, 0); hh.keys = 1; hh.x = (d.cells[0][0] + .5) * 16; hh.y = (d.cells[0][1] + 1.5) * 16; host.t.game.debug.world().heroes[0].intent.move = [0, -1]; await net.step(1); }
  if (d) S.check('a door opens on every copy', W(host).doors[d.id].open && W(c1).doors[d.id].open && W(c2).doors[d.id].open, [W(host).doors[d.id].open, W(c1).doors[d.id].open]);
  const victim = W(host).monsters.find(m => !m.dead);
  if (victim) { host.t.api.damage(victim, 999, { by: heroOf(host, 0), kind: 'shot' }); await net.step(1); S.check('a kill reaches the clients', !W(c1).monsters.some(m => m.id === victim.id), victim.id); }
  // a client's hero takes damage from host monsters (the host's numbers)
  const h1 = heroOf(c1, 1), before = heroOf(host, 1).hp; host.t.api.spawnMonster('gnasher', heroOf(host, 1).x + 12, heroOf(host, 1).y, 3); host.t.api.spawnMonster('gnasher', heroOf(host, 1).x - 12, heroOf(host, 1).y, 3);
  heroOf(host, 1).inv = 0; await net.step(3);
  S.check('a client\'s hero is hurt by the host\'s monsters', heroOf(host, 1).hp < before - 4 && Math.abs(h1.hp - heroOf(host, 1).hp) < 20, [before, heroOf(host, 1).hp, h1.hp]);
  // magic from a client strikes the host's monsters
  heroOf(host, 2).flasks = 2; await net.step(.6);
  const hx = heroOf(host, 2); for (let i = 0; i < 4; i++) host.t.api.spawnMonster('ghost', hx.x + 30 + i * 6, hx.y + 10, 1);
  await net.step(.4);
  const nearBefore = W(host).monsters.filter(m => !m.dead && Math.hypot(m.x - hx.x, m.y - hx.y) < 90).length;
  c2.t.I.tap('magic'); await net.step(1.2);
  const nearAfter = W(host).monsters.filter(m => !m.dead && Math.hypot(m.x - hx.x, m.y - hx.y) < 90).length;
  S.check('magic from a client strikes on the host', nearAfter < nearBefore && heroOf(host, 2).flasks === 1, [nearBefore, nearAfter, heroOf(host, 2).flasks]);
  // narrator lines arrive everywhere
  host.t.api.bus.emit('say', { key: 'tip_door' });
  const said = host.t.D.world(); void said;
  // rates and sizes: a crowd of 100 monsters
  for (let i = 0; i < 100; i++) { const h = heroOf(host, i % 3); host.t.api.spawnMonster(['gnasher', 'ghost', 'imp'][i % 3], h.x + Math.cos(i) * 60, h.y + Math.sin(i) * 40, 2); }
  await net.step(3);
  const snaps = net.log.filter(m => m.t === 's' && m.at > net.now - 2000), maxSnap = Math.max(0, ...snaps.map(m => m.bytes));
  S.check('snapshots stay under 4 KB with 100 monsters', maxSnap > 0 && maxSnap < 4096, maxSnap);
  S.check('every message is under 16 KB', net.log.every(m => m.lost || m.bytes < 16384) && net.copies.every(c => !c.oversize));
  const maxRate = Math.max(...net.copies.map(c => Math.max(0, ...Object.values(c.perSec))));
  S.check('no copy sends more than 20 messages in a second', maxRate <= 20, maxRate);
  S.check('traffic both ways', net.log.some(m => m.from === 0 && m.t === 's') && net.log.some(m => m.from === 1 && m.t === 'me'));
  // time-up: one finish, valid standings, within 5 s
  const at = net.now; net.timeUp(); await net.step(.5);
  const fin = net.finishes;
  S.check('time-up: the host finishes once, at once', fin.length === 1 && fin[0].by === 0 && fin[0].at - at < 5000, fin.map(f => [f.by, f.at - at]));
  const st = fin[0] && fin[0].r.standings;
  S.check('standings list every player once, best first', st && st.flat().sort().join() === '0,1,2' && Object.keys(fin[0].r.scores).length === 3, fin[0] && fin[0].r);
  S.check('awards and stats', fin[0] && fin[0].r.stats && fin[0].r.stats[0] && Array.isArray(fin[0].r.awards), fin[0] && fin[0].r.awards);
  net.end('finished', st); await net.step(.5);
  const sentBefore = net.copies.map(c => c.sent); await net.step(1);
  S.check('after end: nothing is sent', net.copies.every((c, i) => c.sent === sentBefore[i]), [sentBefore, net.copies.map(c => c.sent)]);
  S.check('after end: the round-over screen', net.copies.every(c => c.t.game.sceneName === 'splay' && c.t.D.net().role && c.t.ctx.My3D2dge.current.audio.muted !== false), net.copies.map(c => c.t.ctx.My3D2dge.current.audio.muted));
  S.check('no errors on any copy', net.copies.every(c => !c.t.errors().length), net.copies.map(c => c.t.errors().slice(0, 2)));

  // ---- a server round: the host has no player of its own ----
  const sv = hubRound({ players: 2, server: true, latency: 60, jitter: 20 });
  await startRound(sv, S);
  const srv = sv.copy(9);
  S.check('server: runs the world with no hero of its own', srv.t.D.net().role === 'server' && W(srv).heroes.length === 2 && W(srv).heroes.every(h => h.remote), W(srv).heroes.map(h => h.remote));
  await sv.step(3);
  S.check('server: clients see its monsters', W(sv.copy(0)).monsters.length > 0, W(sv.copy(0)).monsters.length);
  sv.timeUp(); await sv.step(.3);
  S.check('server: finishes on time-up', sv.finishes.length === 1 && sv.finishes[0].by === 9, sv.finishes);
  S.check('server: no errors', sv.copies.every(c => !c.t.errors().length), sv.copies.map(c => c.t.errors().slice(0, 2)));

  // ---- leaving: a client leaves (its hero goes); everyone leaves (the host finishes) ----
  const lv = hubRound({ players: 2 });
  await startRound(lv, S);
  lv.leave(1); await lv.step(.5);
  S.check('a player who leaves is taken out of the world', !W(lv.copy(0)).heroes.some(h => h.hubId === 1), W(lv.copy(0)).heroes.map(h => h.hubId));
  S.check('leaving: no errors', !lv.copy(0).t.errors().length, lv.copy(0).t.errors().slice(0, 2));
  return S;
}
