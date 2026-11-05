// Net suite: N copies of the game, each in its own vm with a fake AIHub, on one virtual clock and a simulated network
// (latency, jitter, loss for unreliable messages, ordered reliable ones).
import { boot } from './lib.mjs';
function makeNet(n, o = {}) {
  const net = { now: 0, startAt: null, queue: [], copies: [], sent: [], finished: null };
  const players = Array.from({ length: n }, (_, i) => ({ id: i, name: ['Red Fox', 'Blue Otter', 'Green Heron', 'Gold Lynx'][i], color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] }));
  for (let i = 0; i < n; i++) {
    const handlers = {}, pendingEv = {};
    const hub = {
      active: true, me: i,
      connect: () => Promise.resolve({ me: i, players, host: 0, isHost: i === 0, server: false, mode: 'shared-world', round: 1, limitMs: 360000, seed: 99 }),
      ready() { hub.readied = true; }, answer(a) { hub.answers = (hub.answers || []).concat(a); },
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); for (const a of pendingEv[ev] || []) fn(...a); pendingEv[ev] = []; return () => {}; },
      emit(ev, ...a) { if (handlers[ev] && handlers[ev].length) for (const fn of handlers[ev]) fn(...a); else (pendingEv[ev] = pendingEv[ev] || []).push(a); },
      time: () => net.startAt === null ? -Infinity : net.now - net.startAt,
      send(data, opt = {}) { const s = JSON.stringify(data); net.sent.push({ from: i, at: net.now, bytes: s.length, t: data.t, rel: opt.reliable !== false }); if (s.length > 16384) return false; for (let j = 0; j < n; j++) { if (j === i || (opt.to !== undefined && opt.to !== j)) continue; if (opt.reliable === false && Math.random() < (o.loss || 0)) continue; net.queue.push({ to: j, from: i, at: net.now + (o.latency || 0) + Math.random() * (o.jitter || 0), data: JSON.parse(s) }); } return true; },
      finish(r) { net.finished = r; }, rng: () => Math.random, progress() {}, result() {}, fail() {}
    };
    const t = boot({ quiet: true, seed: 11 + i, hub });
    net.copies.push({ t, hub });
  }
  net.step = async (sec) => {
    const steps = Math.round(sec * 120);
    for (let k = 0; k < steps; k++) {
      net.now += 1000 / 120;
      const due = net.queue.filter(m => m.at <= net.now); net.queue = net.queue.filter(m => m.at > net.now);
      for (const m of due) net.copies[m.to].hub.emit('message', m.data, m.from);
      for (const c of net.copies) c.t.game.advance(1 / 120);
      if (k % 12 === 0) await Promise.resolve();
    }
  };
  return net;
}
export default async function (check) {
  const net = makeNet(3, { latency: 80, jitter: 30, loss: .05 });
  await new Promise(r => setTimeout(r, 0)); await net.step(.5);
  const [A, B, C] = net.copies;
  check('every copy readies with no key press', net.copies.every(c => c.hub.readied));
  check('every copy shows the card', net.copies.every(c => c.t.snap().scene === 'scard'), net.copies.map(c => c.t.snap().scene).join());
  B.t.I.tap('confirm'); await net.step(.1);
  check('Enter on the card answers ready', (B.hub.answers || []).includes('ready'), JSON.stringify(B.hub.answers));
  for (const c of net.copies) c.hub.emit('start', { in: 3000 }); net.startAt = net.now + 3000;
  await net.step(3.6);
  check('play begins at time 0', net.copies.every(c => c.t.snap().scene === 'splay'), net.copies.map(c => c.t.snap().scene).join());
  await net.step(2);
  const hm = A.t.D.W.mons.length, cm = B.t.D.W.mons.length;
  check('clients see the host\'s monsters', hm > 0 && cm > 0 && Math.abs(hm - cm) <= 3, hm + ' vs ' + cm);
  // a client walks: the host sees its hero move
  const bx0 = A.t.D.PARTY[1].x; B.t.I.hold('right'); await net.step(1); B.t.I.hold('right', false); await net.step(.4);
  check('the host sees a client\'s hero move', A.t.D.PARTY[1].x > bx0 + 20, A.t.D.PARTY[1].x - bx0);
  // a client's pickup: the host decides, every copy hears
  const it = A.t.D.W.items.find(i => i.kind === 'gold') || A.t.D.W.items[0];
  const hb = B.t.D.PARTY[1]; hb.x = it.x; hb.y = it.y; hb.body.x = it.x; hb.body.y = it.y; await net.step(.8);
  check('a client\'s pickup is confirmed for everyone', !A.t.D.W.items.some(i => i.id === it.id) && !C.t.D.W.items.some(i => i.id === it.id), it.kind);
  check('...and the score is the client\'s', A.t.D.PARTY[1].score > 0 && B.t.D.PARTY[1].score === A.t.D.PARTY[1].score, A.t.D.PARTY[1].score + ' ' + B.t.D.PARTY[1].score);
  // magic from a client strikes on the host
  for (const c of net.copies) c.t.D.W && 0;
  const hW = A.t.D.W, hh = A.t.D.PARTY[1]; hh.flasks = 1;
  const m = A.t.D.spawn('gnasher', hh.x + 30, hh.y, 1); await net.step(.3);
  B.t.I.tap('magic'); await net.step(.6);
  check('magic from a client works on the host', m.dead, m.hp);
  // a 100-monster scene: snapshot sizes, and the hub's rates
  const bHp0 = B.t.D.PARTY[1].hp;
  for (let k = 0; k < 100; k++) { const h = A.t.D.PARTY[k % 3], a = k / 100 * 6.28; const x = h.x + Math.cos(a) * (40 + k), y = h.y + Math.sin(a) * (30 + k % 40); if (hW.map.walkable(Math.floor(x / 16), Math.floor(y / 16))) A.t.D.spawn('ghost', x, y, 2); }
  net.sent.length = 0; await net.step(3);
  const snaps = net.sent.filter(s => s.t === 's'), maxB = Math.max(...snaps.map(s => s.bytes)), avgB = snaps.reduce((a, s) => a + s.bytes, 0) / snaps.length;
  check('snapshots stay under 4 KB on average with a horde', avgB < 4096, Math.round(avgB) + ' avg, ' + maxB + ' max, ' + hW.mons.length + ' monsters');
  check('every message is under 16 KB', net.sent.every(s => s.bytes < 16384), maxB);
  const perSec = {}; for (const s of net.sent) { const k = s.from + ':' + Math.floor(s.at / 1000); perSec[k] = (perSec[k] || 0) + 1; }
  check('no copy sends more than 20 messages in a second', Object.values(perSec).every(v => v <= 20), JSON.stringify(perSec));
  check('client heroes take damage from host monsters', B.t.D.PARTY[1].hp < bHp0 - 6, bHp0 - B.t.D.PARTY[1].hp);
  // time-up: one finish with standings, every player once
  A.hub.emit('time-up', { graceMs: 5000 }); await net.step(.3);
  const f = net.finished;
  check('time-up: the host finishes with valid standings', f && Array.isArray(f.standings) && f.standings.flat().sort().join() === '0,1,2', JSON.stringify(f));
  check('...with scores, stats and awards', f && f.scores && f.stats && Array.isArray(f.awards), JSON.stringify(f && f.awards));
  for (const c of net.copies) c.hub.emit('end', { reason: 'finished', standings: f.standings });
  net.sent.length = 0; await net.step(1);
  check('end: nothing more is sent', net.sent.length === 0, net.sent.length);
  check('end: ROUND OVER on every copy', net.copies.every(c => c.t.snap().scene === 'sover'), net.copies.map(c => c.t.snap().scene).join());
  check('no errors in any copy', net.copies.every(c => !c.t.errors().length), net.copies.map(c => c.t.errors().join('|')).join(' / '));
  // leave: a client leaves; the host removes its hero
  const n2 = makeNet(2); await new Promise(r => setTimeout(r, 0)); await n2.step(.3);
  for (const c of n2.copies) c.hub.emit('start', { in: 3000 }); n2.startAt = n2.now; await n2.step(1);
  n2.copies[0].hub.emit('leave', { id: 1, reason: 'left' }); await n2.step(.3);
  check('a player who leaves is removed from the world', n2.copies[0].t.D.PARTY.length === 1, n2.copies[0].t.D.PARTY.length);
}
