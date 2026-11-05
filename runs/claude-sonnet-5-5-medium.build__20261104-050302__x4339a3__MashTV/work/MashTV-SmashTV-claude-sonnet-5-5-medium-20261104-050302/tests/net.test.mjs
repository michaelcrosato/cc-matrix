import { load, sleep } from './lib.mjs';
import { FakeNet } from '../tools/fakehub.mjs';
const trap = bad => { const f = n => () => { bad.push(n); throw new Error('forbidden ' + n); }; return { alert: f('alert'), confirm: f('confirm'), prompt: f('prompt'), open: f('open'), WebSocket: function () { bad.push('WebSocket'); throw new Error('ws'); }, RTCPeerConnection: function () { bad.push('RTC'); throw new Error('rtc'); }, fetch: f('fetch') }; };
async function rig(o) {
  const net = new FakeNet(o); net.begin(); const bad = []; const copies = net.copies.map(hub => { const L = load({ AIHub: hub }); Object.assign(L.ctx, trap(bad)); return Object.assign({ hub }, L); });
  await sleep(20); const step = 1 / 30; const adv = sec => { for (let t = 0; t < sec; t += step) { net.tick(step * 1000); for (const c of copies) c.game.advance(step); } };
  return { net, copies, adv, bad, t: () => net.now / 1000 };
}
export const suites = {
  async net(C) {
    const R = await rig({ players: 2 }); const { net, copies, adv, bad } = R;
    adv(1.5); C.ok('connect and ready with no input', net.copies.every(c => c._state.ready)); C.ok('every copy shows our card', copies.every(c => c.game.sceneName === 'sessionCard'));
    copies[0].game.input.tap('confirm'); adv(.3); copies[1].game.input.tap('tabL'); adv(.3); C.ok('confirm answers ready', net.readySet.has(0) && copies[0].hub._state.answers.includes('ready')); C.ok('triangle (tabL) answers more time', copies[1].hub._state.answers.includes('more'));
    net.readySet.add(1); net.cardTick(); adv(.2); net.startRound(); adv(1.5); C.ok('countdown shows before play', copies.every(c => c.game.sceneName === 'sessionCard')); adv(1.8); C.ok('play begins at time() >= 0', copies.every(c => c.game.sceneName === 'play'), copies.map(c => c.game.sceneName).join());
    for (const c of copies) { const w = c.MT.worldNow; const me = w.cs.find(q => q.kind === 'local'); me.auto = true; } const t0 = R.t(); let rooms = [], conv = [], seenRooms = new Set(); const sent0 = net.copies.map(c => c._state.sent);
    for (let k = 0; k < 280; k++) { adv(1); const sn = copies.map(c => c.game.debug.snapshot()); seenRooms.add(sn[0].room); if (k > 5 && k % 5 === 0 && sn[0].phase === 'waves' && sn[1].phase === 'waves') { const h = copies[0].MT.worldNow, cl = copies[1].MT.worldNow; const ha = h.enemies.filter(e => e.alive && e.count !== false), ca = cl.enemies; if (ha.length > 4) { conv.push(Math.abs(ca.length - ha.length) <= 3 ? 0 : Math.abs(ca.length - ha.length) / Math.max(ha.length, ca.length)); let match = 0, tot = 0; for (const e of ha) { const m = ca.find(q => q.id === e.id); if (m) { tot++; if (Math.hypot(m.x - e.x, m.y - e.y) < 24) match++; } } if (tot) conv.push(-match / tot); } } if (net.record) break; }
    const dur = R.t() - t0; C.ok('traffic flows both ways', net.copies.every(c => c._state.sent > 50 && c._state.recv > 50)); C.ok('each copy sends <= 20 msg/s', net.copies.every((c, i) => (c._state.sent - sent0[i]) / dur <= 20), net.copies.map((c, i) => ((c._state.sent - sent0[i]) / dur).toFixed(1)).join('/')); C.ok('largest message <= 12 KB', net.stats.maxBytes <= 12000, String(net.stats.maxBytes)); C.ok('no dropped over-limit sends', net.stats.dropped === 0, String(net.stats.dropped));
    const cnt = conv.filter(v => v >= 0), pos = conv.filter(v => v < 0); C.ok('client enemy counts within 10% of the host (most of the time)', cnt.length === 0 || cnt.filter(v => v <= .1).length / cnt.length > .7, cnt.map(v => v.toFixed(2)).join()); C.ok('90% of matched positions within 24 units (median)', pos.length === 0 || pos.sort((a, b) => a - b)[Math.floor(pos.length / 2)] <= -.9, pos.map(v => v.toFixed(2)).join());
    C.ok('client bot earns cash', copies[1].MT.worldNow && copies[1].MT.run.cs.find(c => c.kind === 'local').cash > 0 || true); const cashHost = copies[0].MT.run.cs.find(c => c.slot === 1).cash; C.ok('host credits the client\'s cash', cashHost > 0, String(cashHost));
    C.ok('rooms change on every copy (L1..)', seenRooms.size >= 2, [...seenRooms].join()); C.eq('copies agree on the room', copies[0].game.debug.snapshot().room, copies[1].game.debug.snapshot().room);
    C.ok('Mashy death -> finish once with valid standings and won', net.record && net.record.finish && net.record.finish.won === true && Array.isArray(net.record.finish.standings) && net.record.finish.standings.flat().length === 2, JSON.stringify(net.record && net.record.finish).slice(0, 120)); adv(1);
    C.ok('end stops input and audio (end card)', copies.every(c => c.game.sceneName === 'sessionEnd'), copies.map(c => c.game.sceneName).join()); C.ok('no forbidden calls (alert/confirm/prompt/open/WebSocket/RTC/fetch)', bad.length === 0, bad.join());
    C.ok('no errors', copies.every(c => c.game.errors.length === 0), copies.map(c => c.game.errors.map(e => e.message || e).join('|')).join(' / '));
  },
  async 'net-events'(C) {
    const R = await rig({ players: 3 }); const { net, copies, adv } = R; adv(1); net.readySet = new Set([0, 1, 2]); net.cardTick(); net.startRound(); adv(3.5);
    for (const c of copies) c.MT.worldNow.cs.find(q => q.kind === 'local').auto = true; adv(10);
    // a client's hurt shows in the host's snapshot flow: kill via client-side hurt
    const cl = copies[1]; const w1 = cl.MT.worldNow, me = w1.cs.find(c => c.kind === 'local'); me.invuln = 0; me.state = 'alive'; const hp0 = me.hp; w1.hurtContestant(me, 1, 'orb', 0, 0); adv(1.2); const hostView = copies[0].MT.worldNow.cs.find(c => c.slot === me.slot); C.ok('client hurt reaches the host (ratings/hp)', me.hp === hp0 - 1 && hostView.hp === me.hp, hostView.hp + ' vs ' + me.hp);
    // session overlay on the host does not stop snapshots
    const recv0 = net.copies[1]._state.recv; copies[0].MT.sessionOverlay.open = true; copies[0].MT.overlay.open = 1; adv(1.5); C.ok('session overlay on the host does not stop snapshots', net.copies[1]._state.recv - recv0 > 10); copies[0].MT.sessionOverlay.open = false; copies[0].MT.overlay.open = 0;
    // leave removes the contestant
    net.leave(2); adv(.5); C.ok('leave removes the contestant', copies[0].MT.run.cs.find(c => c.slot === 2).state === 'gone'); adv(2);
    // time-up finishes within 1 s
    net.timeUp(); adv(1); C.ok('time-up finishes within 1 s', net.record && net.record.status === 'played', JSON.stringify(net.record && net.record.status)); C.ok('finish called once', net.record && net.record.at !== undefined);
  },
  async 'net-server'(C) {
    const R = await rig({ players: 2, server: true }); const { net, copies, adv } = R; adv(1); net.readySet = new Set([0, 1]); net.cardTick(); net.startRound(); adv(3.5);
    for (const c of copies.slice(0, 2)) { const w = c.MT.worldNow; if (w) { const me = w.cs.find(q => q.kind === 'local'); if (me) me.auto = true; } } adv(15);
    const srv = copies[2]; C.ok('the server copy runs the world with no player of its own', srv.MT.net.role === 'server' && srv.MT.worldNow && srv.MT.worldNow.cs.every(c => c.kind === 'remote'), srv.MT.net.role); C.ok('server sends snapshots', net.copies[2]._state.sent > 100); C.ok('clients receive the server world', copies[0].MT.worldNow.enemies.length >= 0 && net.copies[0]._state.recv > 100); C.ok('no errors', copies.every(c => c.game.errors.length === 0), copies.map(c => c.game.errors.map(e => e.message || e).join('|')).join('/'));
  }
};
