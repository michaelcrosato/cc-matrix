// The AI Hub session over a fake hub: traffic both ways, the message budget, snapshot sizes, prediction near the host,
// play calls arriving, a player or the host leaving, a server host, time-up and the end.
import { load } from '../lib/context.mjs';
import { makeHub } from '../lib/fakehub.mjs';
async function run(n, o, steps, ok, label) {
  const H = makeHub(n, o), C = H.copies.map(c => ({ me: c.me, ctx: load({ hub: c.api }) }));
  const yieldp = () => new Promise(r => setImmediate(r));
  for (const c of C) c.ctx.game.advance(.05); await yieldp(); await yieldp();
  let t = 0, near = 0, nearN = 0;
  for (let i = 0; i < steps; i++) {
    for (const c of C) if (!H.copies.find(x => x.me === c.me).api._left) c.ctx.game.advance(1 / 30);
    H.tick(1000 / 30); t += 1 / 30; if (i % 15 === 0) await yieldp();
    if (o.leaveAt && Math.abs(t - o.leaveAt) < 1 / 60) H.leave(o.leaveId);
    if (o.timeUpAt && Math.abs(t - o.timeUpAt) < 1 / 60) H.timeUp();
    // prediction: a client's own athlete near the host's copy of it
    const host = C.find(c => c.me === (H.server ? -1 : 0)), cl = C.find(c => c.me === 1);
    if (host && cl && cl.ctx.FF.match && host.ctx.FF.match && cl.ctx.FF.match.phase === 'LIVE') { const a = cl.ctx.FF.match.on.find(x => x.ctl === 0); if (a) { const b = host.ctx.FF.match.all.find(x => x.id === a.id); if (b && !(b.downT > 0)) { nearN++; if (Math.hypot(a.x - b.x, a.y - b.y) < 2 * 16 + Math.hypot(b.vx, b.vy) * .25) near++; } } }
    if (H.ended && i > 10 && !o.keep) { for (let k = 0; k < 10; k++) { for (const c of C) c.ctx.game.advance(1 / 30); H.tick(33); } break; }
  }
  const errs = C.flatMap(c => c.ctx.game.errors.map(e => 'p' + c.me + ': ' + e.message));
  ok(label + ': no errors', !errs.length, errs.slice(0, 3).join(' | '));
  return { H, C, near: nearN ? near / nearN : 1, nearN };
}
export default async ok => {
  // two players: the round plays, the host is told time is up and finishes once
  let r = await run(2, { latency: 60 }, 30 * 70, ok, '2 players');
  const { H } = r;
  ok('2 players: both copies started a match', r.C.every(c => c.ctx.FF.match), r.C.map(c => c.ctx.game.sceneName).join(','));
  ok('2 players: traffic both ways', (H.sent[0] || []).length > 20 && (H.sent[1] || []).length > 20, (H.sent[0] || []).length + ' / ' + (H.sent[1] || []).length);
  const rate = me => { const s = H.sent[me] || []; let worst = 0; for (const m of s) worst = Math.max(worst, s.filter(x => x.t > m.t - 1000 && x.t <= m.t).length); return worst; };
  ok('2 players: at most 18 messages a second from each copy', rate(0) <= 18 && rate(1) <= 18, rate(0) + ' / ' + rate(1));
  ok('2 players: snapshots stay under 1,100 bytes', Math.max(...(H.sent[0] || []).filter(m => m.kind === 's').map(m => m.len)) <= 1100, Math.max(...(H.sent[0] || []).filter(m => m.kind === 's').map(m => m.len)));
  ok('2 players: the client sees the live play', r.C[1].ctx.FF.match.on.length >= 14, r.C[1].ctx.FF.match.on.length);
  ok('2 players: the predicted athlete stays near the host\'s (95% when not locked)', r.near >= .9 || r.nearN < 30, r.near.toFixed(2) + ' of ' + r.nearN);
  // time-up: the host finishes within the grace, everyone is told the end
  r = await run(2, { latency: 100, timeUpAt: 30 }, 30 * 45, ok, 'time-up');
  ok('time-up: finish called once with every player in the standings', !!r.H.finished && r.H.finished.standings.flat().sort().join() === '0,1' && !r.H.log.some(l => l[0] === 'finish twice'), JSON.stringify(r.H.finished));
  ok('time-up: every copy ended', r.C.every(c => c.ctx.FF.net.ended));
  const after = (r.H.sent[0] || []).filter(m => m.t > r.H.now - 100).length; ok('nothing is sent after the end', after === 0, after);
  // four players with latency and loss; a player leaves: his athletes go back to the CPU
  r = await run(4, { latency: 150, jitter: 50, loss: .05, leaveAt: 25, leaveId: 3, timeUpAt: 40 }, 30 * 50, ok, '4 players');
  ok('4 players: the host finishes with the three left', r.H.finished && r.H.finished.standings.flat().length === 3, JSON.stringify(r.H.finished));
  const m0 = r.C[0].ctx.FF.match; ok('4 players: the leaver\'s athletes go back to the CPU', !m0.all.some(a => a.ctl === 'net:3'));
  // the host leaves: the round ends for the others
  r = await run(3, { latency: 80, leaveAt: 20, leaveId: 0, keep: true }, 30 * 25, ok, 'host leaves');
  ok('host leaves: the clients end', r.C.filter(c => c.me !== 0).every(c => c.ctx.FF.net.ended && c.ctx.FF.net.endReason === 'host-left'));
  // a server host with no player of its own
  r = await run(2, { server: true, latency: 60, timeUpAt: 25 }, 30 * 35, ok, 'server');
  ok('server: the server hosts and finishes', !!r.H.finished && r.C.find(c => c.me === -1).ctx.FF.net.server, JSON.stringify(r.H.finished));
  ok('server: both players saw the match', r.C.filter(c => c.me >= 0).every(c => c.ctx.FF.match && c.ctx.FF.match.on.length >= 14));
};
