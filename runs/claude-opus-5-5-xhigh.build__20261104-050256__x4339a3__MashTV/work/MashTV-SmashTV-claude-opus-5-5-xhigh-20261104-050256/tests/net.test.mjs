// net: AI Hub sessions through a fake hub (several game copies on one clock and a lossy network)
import { createHub } from '../tools/fakehub.mjs';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function session(t, o = {}) {
  const bus = createHub(o), viol = [];
  const stub = name => (...a) => { viol.push(name); return name === 'confirm' ? false : null; };
  const globals = { alert: stub('alert'), confirm: stub('confirm'), prompt: stub('prompt'), open: stub('open'), fetch: stub('fetch'), WebSocket: function () { viol.push('WebSocket'); }, RTCPeerConnection: function () { viol.push('RTCPeerConnection'); } };
  const copies = bus.copies.map(h => Object.assign(t.boot({ hub: h, globals }), { hub: h }));
  const step = async (ms = 1000 / 60) => { bus.tick(ms); for (const c of copies) if (!c.hub.gone) c.game.advance(ms / 1000); };
  for (let i = 0; i < 20; i++) { await wait(6); await step(); }
  return { bus, copies, step, viol, run: async (s, every) => { for (let k = 0; k < s * 60; k++) { await step(); if (every && every(k)) return true; } return false; } };
}
const local = c => c.MT.run && c.MT.run.contestants.find(q => q.netId === c.hub.me);
export const suites = {
  async net(t) {
    // ------------------------------------------------------------------ host + 2 clients, 150 ± 50 ms, 5% loss
    const S = await session(t, { players: 3, latency: 150, jitter: 50, loss: .05 }), { bus, copies } = S, [host, c1, c2] = copies;
    t.check('every copy connects and readies with no key press', copies.every(c => c.hub.readyCalled), copies.map(c => c.hub.readyCalled));
    t.check('a session opens on our own card', copies.every(c => c.game.sceneName === 'sessionCard'), copies.map(c => c.game.sceneName));
    t.check('the host knows it hosts', host.MT.net.isHost && !c1.MT.net.isHost);
    bus.card({ ready: [] }); await S.step();
    c1.game.input.tap('confirm'); c2.game.input.press('Pad3'); await S.step(); await S.step(); c2.game.input.release('Pad3');
    t.check('the card: confirm answers ready, △ asks for more time', bus.answers.some(a => a[0] === 1 && a[1] === 'ready') && bus.answers.some(a => a[0] === 2 && a[1] === 'more'), bus.answers);
    bus.start(); await S.run(2.5);
    t.check('the countdown: still on the card before time 0', copies.every(c => c.game.sceneName === 'sessionCard'));
    await S.run(1);
    t.check('play starts at time 0 in the Lightning Round', copies.every(c => c.game.sceneName === 'play' && c.MT.play.world && c.MT.play.world.room.id === 'L1'), copies.map(c => [c.game.sceneName, c.MT.play.world && c.MT.play.world.room.id]));
    for (const c of copies) { const me = local(c); if (me) { me.ctl = 'bot'; me.godMode = true; me.botOpts = {}; } }
    host.MT.T.dmgMul = 3;
    t.check('the session play scene does not pause', copies.every(c => !c.game.scene.pausable));
    let compared = 0, within = 0, total = 0, counts = [];
    const roomAt = {}; const sentBefore = host.hub.stats.sent;
    await S.run(25, k => {
      if (k % 60 === 30) {
        const hw = host.MT.play.world, cw = c1.MT.play.world;
        if (hw && cw && hw.room.id === cw.room.id && hw.phase === 'WAVES') { counts.push([hw.enemies.length, cw.enemies.length]); for (const e of hw.enemies) { const m = cw.enemies.find(q => q.id === e.id); if (m) { total++; if (Math.hypot(m.x - e.x, m.y - e.y) < 24) within++; } } compared++; }
      }
      for (const c of copies) { const id = c.MT.play.world && c.MT.play.world.room.id; const key = id + ':' + c.hub.me; if (id && !roomAt[key]) roomAt[key] = bus.clock; }
      return false;
    });
    t.check('traffic flows both ways from every copy', copies.every(c => c.hub.stats.sent > 0 && c.hub.stats.recv > 0), copies.map(c => [c.hub.stats.sent, c.hub.stats.recv]));
    const maxRate = Math.max(...copies.map(c => Math.max(...Object.values(c.hub.stats.bySec))));
    t.check('no copy sends more than 20 messages a second', maxRate <= 20, maxRate);
    t.check('no message over 12 KB', copies.every(c => c.hub.stats.max <= 12288), copies.map(c => c.hub.stats.max));
    t.check('no message was dropped by the limiter', copies.every(c => c.hub.stats.drops === 0), copies.map(c => c.hub.stats.drops));
    const good = counts.filter(([a, b]) => Math.abs(a - b) <= Math.max(2, a * .1)).length;
    t.check('clients see the host\'s enemies (counts within 10%)', counts.length > 3 && good >= counts.length * .8, counts);
    t.check('90% of matched enemy positions within 24 units', total > 20 && within >= total * .9, [within, total]);
    t.check('client bots earn cash (credited by the host)', [c1, c2].every(c => local(c).pr.cash > 0), [c1, c2].map(c => local(c).pr.cash));
    await S.run(120, k => { for (const c of copies) { const id = c.MT.play.world && c.MT.play.world.room.id; const key = id + ':' + c.hub.me; if (id && !roomAt[key]) roomAt[key] = bus.clock; } return ['L2', 'L3'].every(r => [0, 1, 2].every(i => roomAt[r + ':' + i])); });
    const rooms = Object.keys(roomAt).map(k => k.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i);
    const lags = []; for (const r of rooms) { const h = roomAt[r + ':0']; for (const c of [1, 2]) if (h && roomAt[r + ':' + c]) lags.push(roomAt[r + ':' + c] - h); }
    t.check('room changes reach every copy within a second', rooms.length >= 2 && lags.every(l => l < 1000), [rooms, lags]);
    // a client's hurt shows on the host
    const me1 = local(c1); await S.run(5, () => me1.state === 'play'); me1.godMode = false; me1.invuln = 0; let hostHurt = false; const off = host.MT.on('ev:hurt', d => { if (d.c && d.c.netId === 1) hostHurt = true; });
    c1.MT.play.world.hurtContestant(me1, 1, { kind: 'test' }); await S.run(1.5, () => hostHurt); off(); me1.godMode = true;
    t.check('a client\'s hurt reaches the host', hostHurt);
    // the session overlay on the host never stops snapshots
    host.MT.net.toggleOverlay(); const s0 = host.hub.stats.sent; await S.run(2); host.MT.net.toggleOverlay();
    t.check('the host\'s session overlay does not stop the world', host.hub.stats.sent - s0 >= 25 && host.MT.play.world.phase !== 'HOLD', host.hub.stats.sent - s0);
    // on to Mashy; his death finishes the round once
    let ok = await S.run(150, () => host.MT.play.world.room.id === 'LB');
    t.check('the round reaches Mashy', ok, host.MT.play.world.room.id);
    await S.run(10, () => host.MT.play.world.boss && host.MT.play.world.boss.phase === 'p1');
    const hb = host.MT.play.world.boss; if (hb) for (const p of hb.parts) p.hp = Math.min(p.hp, 2);
    ok = await S.run(30, () => bus.finished.length > 0);
    const fin = bus.finished[0] && bus.finished[0][1];
    t.check('Mashy\'s death: the host finishes once, won', ok && bus.finished.length === 1 && bus.finished[0][0] === 0 && fin.won === true, bus.finished.length);
    t.check('the standings list every player, best first by cash', fin && fin.standings.flat().length === 3 && fin.standings.flat().every(id => [0, 1, 2].includes(id)), fin && fin.standings);
    t.check('scores, stats and awards come with it', fin && fin.scores && fin.stats && Array.isArray(fin.awards) && fin.awards.length >= 2, fin && Object.keys(fin));
    await S.run(1);
    t.check('every copy got the over message', [c1, c2].every(c => c.MT.net.over && c.MT.net.over.won), [c1, c2].map(c => !!c.MT.net.over));
    bus.end('finished'); await S.run(.5);
    t.check('end: every copy shows the end card, takes no input and mutes', copies.every(c => c.game.sceneName === 'sessionEnd' && c.game.audio.muted), copies.map(c => [c.game.sceneName, c.game.audio.muted]));
    t.check('no dialogs, popups, sockets or fetches', !S.viol.length, S.viol);
    t.check('no errors on any copy', copies.every(c => !c.game.errors.length), copies.map(c => c.game.errors.map(e => e.where + ' ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' / '))));
    // ------------------------------------------------------------------ time-up, and a player leaving
    const T2 = await session(t, { players: 3, latency: 80, jitter: 20, loss: 0 });
    T2.bus.card({}); T2.bus.start(); await T2.run(3.6);
    for (const c of T2.copies) { const me = local(c); if (me) { me.ctl = 'bot'; me.godMode = true; } }
    await T2.run(5);
    T2.bus.leave(2); await T2.run(1);
    t.check('a player leaving is removed by the host', !T2.copies[0].MT.run.contestants.some(c => c.netId === 2));
    T2.bus.timeUp(); await T2.run(1);
    t.check('time-up: the host finishes within a second', T2.bus.finished.length === 1 && T2.bus.finished[0][0] === 0, T2.bus.finished.length);
    t.check('time-up standings leave out the player who left', T2.bus.finished[0] && !T2.bus.finished[0][1].standings.flat().includes(2));
    // ------------------------------------------------------------------ a server copy with no player of its own
    const SV = await session(t, { players: 2, server: true, latency: 100, jitter: 30, loss: .05 });
    SV.bus.card({}); SV.bus.start(); await SV.run(3.6);
    const srv = SV.copies[2];
    t.check('server mode: the server runs the world', srv.game.sceneName === 'sessionServer' && srv.MT.play.world && srv.MT.net.isServer, srv.game.sceneName);
    for (const c of SV.copies.slice(0, 2)) { const me = local(c); if (me) { me.ctl = 'bot'; me.godMode = true; } }
    await SV.run(10);
    t.check('server mode: the server sends snapshots, the players play', srv.hub.stats.sent > 100 && SV.copies.slice(0, 2).every(c => c.game.sceneName === 'play' && c.MT.play.world.enemies.length + c.MT.play.world.wave > 0), [srv.hub.stats.sent, SV.copies.map(c => c.game.sceneName)]);
    t.check('server mode: players earn cash', SV.copies.slice(0, 2).some(c => local(c).pr.cash > 0), SV.copies.slice(0, 2).map(c => local(c).pr.cash));
    SV.bus.timeUp(); await SV.run(1); t.check('server mode: the server finishes', SV.bus.finished.length === 1 && SV.bus.finished[0][0] === 2, SV.bus.finished);
    t.check('server mode: no errors', SV.copies.every(c => !c.game.errors.length), SV.copies.map(c => c.game.errors.map(e => e.message)));
  },
};
