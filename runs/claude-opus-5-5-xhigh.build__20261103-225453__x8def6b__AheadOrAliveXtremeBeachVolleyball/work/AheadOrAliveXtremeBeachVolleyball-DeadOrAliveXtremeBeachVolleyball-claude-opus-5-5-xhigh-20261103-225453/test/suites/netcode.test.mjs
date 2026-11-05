import { makeSession } from '../lib/fakehub.mjs';
// each client's own fighter is played by a bot: it presses Play on its planned contacts at t*, and serves when it serves
const clientBot = c => { const G = c.G, M = G.M; if (!M || M.role !== 'client') return; const me = M.players.find(p => p.ctl.kind === 'human'); if (!me) return; const I = c.game.input;
  if (M.plan && M.plan.pid === me.id && !M.plan.done && M.now >= M.plan.tStar - .004) I.tap('play');
  if ((M.phase === 'serveSetup' && M.serverId === me.id && M.phaseT > .6 && !M.tossAsked) || (M.phase === 'toss' && M.serverId === me.id && M.L && M.L.kind === 'toss' && M.now >= G.Ball.apexT(M.L) && !M.serveSent)) I.tap('play'); };
const hostBot = c => { const M = c.G.M; if (M && M.role === 'host') { M.perfectPlayer = true; } };
export default async function (t) {
  for (const n of [1, 2, 4]) {
    const S = makeSession(n, { latency: 150, jitter: 50, loss: .05, seed: n }); await S.flush();
    t.ok(n + 'p: every copy connects and readies with no key press', S.copies.every(c => c.ready && c.game.sceneName === 'hub'));
    S.card(); for (let i = 0; i < 60; i++) S.step(); S.start();
    let agreeAt = 0, agreeOk = 0, launches = 0;
    for (let i = 0; i < 120 * 70; i++) {
      for (const c of S.copies) { clientBot(c); hostBot(c); }
      S.step();
      if (i % 120 === 0 && i > 120 * 5) { const H = S.copies[0].G.M; for (const c of S.copies.slice(1)) { const M = c.G.M; if (!M || !M.L || !H.L || M.L.kind === 'toss') continue; agreeAt++; const same = Math.abs(M.L.t0 - H.L.t0) < .002 && Math.hypot(M.L.p[0] - H.L.p[0], M.L.p[1] - H.L.p[1]) < .05; const later = H.L.t0 > M.L.t0; if (same || later) agreeOk++; } }
    }
    const host = S.copies[0], HM = host.G.M;
    t.ok(n + 'p: the host plays the match on the hub clock', HM && HM.role === 'host' && HM.rules.rallies > 2, HM && HM.rules.score.join('-'));
    if (n > 1) {
      t.ok(n + 'p: the clients follow the same launches', agreeAt > 0 && agreeOk / agreeAt > .9, agreeOk + '/' + agreeAt);
      const scores = S.copies.map(c => c.G.M.rules.score.join('-')); for (let i = 0; i < 120; i++) S.step();
      t.ok(n + 'p: every copy shows the same score', new Set(S.copies.map(c => c.G.M.rules.score.join('-'))).size === 1, S.copies.map(c => c.G.M.rules.score.join('-')).join(' / ') + ' was ' + scores.join(' / '));
      const remote = HM.players.filter(p => p.ctl.kind === 'net'); t.ok(n + 'p: remote players touch the ball through their claims', remote.some(p => p.stats.touches + p.stats.serves > 0), remote.map(p => p.stats.touches + '/' + p.stats.serves).join(' '));
      // a claim outside the window is refused
      const rp = remote[0]; if (HM.plan && rp) { const before = HM.rallyTouches; rp.claim = { at: HM.plan.tStar + 2, q: 'PERFECT', aim: [0, 0] }; const keepP = HM.plan.p; HM.plan.p = rp; host.G.Net.remoteContact(HM, rp, HM.plan); HM.plan.p = keepP; t.ok(n + 'p: a claim outside the window is refused', HM.rallyTouches === before); }
      // messages per second, and unreliable sizes
      const per = {}; for (const m of S.sent) { const k = m.from + ':' + Math.floor(m.at / 1000); per[k] = (per[k] || 0) + 1; }
      t.ok(n + 'p: at most 20 messages a second from a copy', Math.max(...Object.values(per)) <= 20, Math.max(...Object.values(per)));
      t.ok(n + 'p: unreliable messages under 1,200 bytes', S.sent.filter(m => !m.rel).every(m => m.bytes < 1200));
    }
    if (n === 4) { S.leave(3); for (let i = 0; i < 30; i++) S.step(); t.ok('4p: a leaver becomes a CPU', HM.players.every(p => !(p.ctl.kind === 'net' && p.ctl.pid === 3))); }
    // time-up: the host finishes at once with the current score
    S.timeUp(); for (let i = 0; i < 10; i++) S.step();
    const F = S.finished && S.finished.out, R = HM.rules.score;
    t.ok(n + 'p: time-up finishes with standings', !!F && Array.isArray(F.standings) && F.standings.flat().length >= 1, JSON.stringify(F));
    if (F && n > 1 && R[0] !== R[1]) t.ok(n + 'p: the team ahead first', F.standings[0].every(id => HM.players.find(p => (p.ctl.pid === id || (p.ctl.kind === 'human' && id === 0))).side === (R[0] > R[1] ? 0 : 1)), JSON.stringify(F.standings));
    if (F && n === 1) t.ok('1p: one human: standings and won', F.standings.length === 1 && typeof F.won === 'boolean');
    S.end(); for (let i = 0; i < 30; i++) S.step();
    t.ok(n + 'p: every copy still in the round stops at the end', S.copies.filter(c => !c.left).every(c => c.G.Net.ended));
    t.ok(n + 'p: no errors', S.copies.every(c => !c.game.errors.length), S.copies.flatMap(c => c.game.errors.map(e => (e.where || '') + ' ' + e.message)).slice(0, 3).join(' | '));
  }
  // a server with no player of its own hosts and finishes
  const SV = makeSession(2, { server: true, latency: 100, jitter: 30, loss: .05 }); await SV.flush(); SV.card(); for (let i = 0; i < 30; i++) SV.step(); SV.start();
  for (let i = 0; i < 120 * 30; i++) { for (const c of SV.copies) clientBot(c); SV.step(); }
  const SM = SV.copies[0].G.M; t.ok('server: it runs the world', SM && SM.role === 'host' && !SM.players.some(p => p.ctl.kind === 'human') && SM.rules.rallies > 0);
  SV.timeUp(); for (let i = 0; i < 10; i++) SV.step(); t.ok('server: it finishes the round', !!SV.finished);
  t.ok('server: no errors', SV.copies.every(c => !c.game.errors.length), SV.copies.flatMap(c => c.game.errors.map(e => e.message)).slice(0, 3).join(' | '));
}
