// a loopback: a host and a client in two vm contexts joined by a fake AIHub (latency, loss, a shared clock)
import { boot, suite, errs } from './lib.mjs';
function makeBus(n) { return { t: 0, q: [], startAt: null, finishes: [], copies: [], n }; }
function fakeHub(bus, id, o = {}) {
  const h = {}, ids = Array.from({ length: bus.n }, (_, i) => i);
  const info = { me: id, players: ids.map(i => ({ id: i, name: 'BOT' + i, color: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] })), host: 0, isHost: id === 0, server: false, mode: 'shared-world', round: 1, limitMs: 360000, seed: 1234 };
  const hub = { active: true, version: 'fake', stats: { sent: 0, received: 0, maxSize: 0 }, readyCalled: false, answers: [],
    connect: async () => info, ready() { this.readyCalled = true; }, answer(a) { this.answers.push(a); },
    time() { return bus.startAt === null ? -Infinity : bus.t - bus.startAt; },
    on(ev, fn) { (h[ev] = h[ev] || []).push(fn); return () => {}; },
    emit(ev, ...a) { for (const f of h[ev] || []) f(...a); },
    send(d, op = {}) { const s = JSON.stringify(d); hub.stats.sent++; hub.stats.maxSize = Math.max(hub.stats.maxSize, s.length); if (s.length > 16384) return false; for (const c of bus.copies) if (c.id !== id) { if (op.reliable === false && Math.random() < .05) continue; bus.q.push({ at: bus.t + 150 + Math.random() * 50, to: c, d: JSON.parse(s), from: id }); } return true; },
    finish(res) { bus.finishes.push({ id, res }); }, rng: () => Math.random };
  return hub;
}
export default async () => {
  const S = suite('net'), bus = makeBus(2), copies = [];
  for (const id of [0, 1]) { const hub = fakeHub(bus, id); const g = boot({ before: ctx => { ctx.window = ctx; ctx.AIHub = hub; } }); copies.push({ id, g, hub }); bus.copies.push({ id, hub }); }
  const tick = async (sec) => { for (let t = 0; t < sec; t += 1 / 60) { bus.t += 1000 / 60; bus.q.sort((a, b) => a.at - b.at); while (bus.q.length && bus.q[0].at <= bus.t) { const m = bus.q.shift(); m.to.hub.stats.received++; m.to.hub.emit('message', m.d, m.from); } for (const c of copies) c.g.game.advance(1 / 60); await null; } };
  await tick(.5);
  S.check('every copy connects and calls ready() with no key', copies.every(c => c.hub.readyCalled), copies.map(c => c.g.snap().scene).join(','));
  S.check('the game shows its own card', copies.every(c => c.g.snap().scene === 'sessionCard'), copies.map(c => c.g.snap().scene).join(','));
  copies[1].g.I.tap('confirm'); await tick(.2); copies[0].g.I.tap('more'); await tick(.2);
  S.check('the card answers: confirm -> ready, triangle/M -> more', copies[1].hub.answers.includes('ready') && copies[0].hub.answers.includes('more'), JSON.stringify(copies.map(c => c.hub.answers)));
  for (const c of copies) c.hub.emit('card', { left: 3000, paused: false, starting: true, ready: [0, 1], asking: 0, asked: false });
  bus.startAt = bus.t + 3000; for (const c of copies) c.hub.emit('start', { in: 3000 });
  await tick(2); S.check('the countdown waits for time() >= 0', copies.every(c => c.g.snap().scene === 'sessionCard'));
  await tick(1.6); S.check('play begins at time() >= 0', copies.every(c => c.g.snap().scene === 'session'), copies.map(c => c.g.snap().scene).join(','));
  // bots drive both contestants
  for (const c of copies) { const W = c.g.MT.Show.W, me = W && W.contestants.find(k => k.ctl === 'local'); if (me) { me.input = null; me.ctl = 'local'; me.godMode = true; } }
  const botOn = () => { for (const c of copies) { const MT = c.g.MT, W = MT.Show.W; if (!W) continue; const me = W.contestants.find(k => k.ctl === 'local'); if (me) { const it = MT.bot.intent(me, W, {}); MT.intentFrom = (I, k) => k === me ? it : MT.NOINTENT(); } } };
  for (let k = 0; k < 40; k++) { botOn(); await tick(.5); }
  const host = copies[0].g, cli = copies[1].g, hW = host.MT.Show.W, cW = cli.MT.Show.W;
  S.check('traffic flows both ways', copies.every(c => c.hub.stats.sent > 0 && c.hub.stats.received > 0), JSON.stringify(copies.map(c => c.hub.stats)));
  S.check('no message over 12 KB', copies.every(c => c.hub.stats.maxSize < 12288), copies.map(c => c.hub.stats.maxSize).join(','));
  S.check('rate at most 20 messages a second', copies.every(c => c.hub.stats.sent / (bus.t - bus.startAt + 3000) * 1000 <= 20.5), copies.map(c => c.hub.stats.sent).join(','));
  S.check('the client mirrors the host\'s room', cW && hW && cW.room.id === hW.room.id, (cW && cW.room.id) + ' vs ' + (hW && hW.room.id));
  let dsum = 0, hsum = 0; for (let k = 0; k < 20; k++) { botOn(); await tick(.25); const W1 = copies[0].g.MT.Show.W, W2 = copies[1].g.MT.Show.W; if (W1.room.id !== W2.room.id) continue; const he = W1.enemies.filter(e => !e.dead).length; hsum += he; dsum += Math.abs(he - W2.enemies.length); }
  S.check('enemy counts converge (mean gap within 15% or 1.5)', dsum / 20 <= Math.max(1.5, hsum / 20 * .15), (dsum / 20).toFixed(2) + ' vs mean ' + (hsum / 20).toFixed(1));
  const cme = cW.contestants.find(k => k.ctl === 'local'), hcopy = hW.contestants.find(k => k.id === cme.id);
  S.check('the host sees the client\'s contestant move', Math.hypot(hcopy.x - cme.x, hcopy.y - cme.y) < 40, [hcopy.x, hcopy.y, cme.x, cme.y].map(Math.round).join(','));
  S.check('client bots earn cash (credited by the host)', hcopy.cash > 0 && cme.cash > 0, hcopy.cash + '/' + cme.cash);
  // time-up: the host finishes at once, with valid standings
  host.MT.net.hub.emit('time-up', { graceMs: 5000 }); await tick(.2);
  S.check('time-up: the host finishes once', bus.finishes.length === 1 && bus.finishes[0].id === 0, JSON.stringify(bus.finishes).slice(0, 200));
  const st = bus.finishes[0] && bus.finishes[0].res.standings; S.check('standings list every player once', st && st.flat().sort().join() === '0,1', JSON.stringify(st));
  for (const c of copies) c.hub.emit('end', { reason: 'finished', standings: st }); await tick(.3);
  S.check('end: every copy shows the end card, quiet', copies.every(c => c.g.snap().scene === 'sessionEnd' && c.g.MT.net.ended), copies.map(c => c.g.snap().scene).join(','));
  for (const c of copies) S.check('no errors on copy ' + c.id, c.g.game.errors.length === 0, errs(c.g).slice(0, 2).join(' | '));
  return S;
};
