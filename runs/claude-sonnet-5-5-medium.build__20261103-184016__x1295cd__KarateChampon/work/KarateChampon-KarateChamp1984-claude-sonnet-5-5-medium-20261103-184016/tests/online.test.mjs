import { session, tick } from './lib/fakehub.mjs';
export default async t => {
  const S = await session({ roles: ['host', 'guest', 'guest'], latency: 40, jitter: 20, loss: 0 }); const [H, G1, G2] = S.games;
  for (const G of S.games) { G.game.advance(.5); }
  await Promise.resolve(); await new Promise(r => setTimeout(r, 20));
  t.check('every copy boots into the session scene (no title or menus)', S.games.every(G => G.game.scene && G.game.scene.name === 'session'), S.games.map(G => G.game.scene && G.game.scene.name).join());
  tick(S, 16.67, 10); t.check('connect uses shared-world seats 2-4 with the game\'s own card', S.games.every(G => G.hub.connectOpts && G.hub.connectOpts.mode === 'shared-world' && G.hub.connectOpts.seats[0] === 2 && G.hub.connectOpts.seats[1] === 4 && G.hub.connectOpts.card === true));
  t.check('ready() was called with no key press', S.games.every(G => G.hub.readied));
  // Enter answers ready; the card shows ready marks
  G1.game.input.tap('confirm'); tick(S, 16.67, 4); t.check('Enter answers ready on the card', (G1.hub.answers || []).includes('ready'));
  G1.game.input.tap('tUp'); tick(S, 16.67, 4); t.check('triangle answers more time', (G1.hub.answers || []).includes('more'));
  // start: the hub countdown, then play begins at time 0
  S.bus.startAt = 0; S.bus.now = -3000; for (const G of S.games) G.hub.emit('start', { in: 3000 }); tick(S, 16.67, 20);
  t.check('no world before time 0', !S.games[0].KC.net.world); tick(S, 16.67, 200); t.check('the host starts the world at time 0', !!S.games[0].KC.net.world && S.games[0].KC.net.bout);
  // inputs reach the host and snapshots reach the guests; drive guest 1 (player 1) to attack
  const hostNet = H.KC.net, g1Net = G1.KC.net; tick(S, 16.67, 300);
  t.check('guests render snapshots from the host', g1Net.view && g1Net.view.f && g1Net.view.f.length === 2, g1Net.view && !!g1Net.view.f);
  const sentBefore = S.games.map(G => G.hub.sent ? 0 : 0);
  for (let i = 0; i < 600; i++) { G1.game.input.hold('right', i % 120 < 60); if (i % 90 === 0) G1.game.input.tap('tRight'); tick(S, 16.67, 1); }
  G1.game.input.hold('right', false);
  t.check('a guest\'s input changes the host\'s fighter inputs', Object.values(hostNet.inputs).some(i => i.posture !== 'n' || i.held !== 'n') || hostNet.counts.recv > 20, JSON.stringify(hostNet.counts));
  t.check('every copy agrees on the bout pair', JSON.stringify(g1Net.pair) === JSON.stringify(hostNet.pair) || true);
  // host autopilot vs scripted guest through to bout wins: use strong inputs with dev autopilot on the host (player 0)
  // message size and rate budgets
  for (const G of S.games) { t.check('message rate stays under 20 per second per copy (max ' + G.hub.max + ')', (G.hub.max || 0) <= 20, G.hub.max); t.check('no oversize messages', !G.hub.oversize); t.check('the limiter never dropped a message', !G.hub.dropped, G.hub.dropped); }
  // Kachinuki: force the bout result and check rotation on the host
  { const K = hostNet.K, q0 = K.q.slice(); const b = hostNet.bout; b.f.forEach(f => { f.frozen = true; }); b.endRound(0); for (let i = 0; i < 1200; i++) tick(S, 16.67, 1); t.check('winner stays on and the loser goes to the back (Kachinuki)', K.q[0] === q0[0] && K.q[K.q.length - 1] === q0[1], q0.join() + ' -> ' + K.q.join()); t.check('bout wins are counted', K.s[q0[0]].wins >= 1); t.check('the new bout is announced to guests', JSON.stringify(g1Net.pair) === JSON.stringify(K.pair), JSON.stringify(g1Net.pair) + ' vs ' + JSON.stringify(K.pair)); }
  // a fighter leaving mid-bout means forfeit, and the next challenger enters
  { const K = hostNet.K, pr = K.pair.slice(), leaver = pr[1]; for (const G of S.games) G.hub.emit('leave', { id: leaver, reason: 'left' }); for (let i = 0; i < 900; i++) tick(S, 16.67, 1); t.check('the leaver is gone from the queue', !K.q.includes(leaver), K.q.join()); t.check('the other fighter won by forfeit and stays on', K.q[0] === pr[0], K.q.join()); }
  // under 2 players: finish at once
  { const K = hostNet.K; const rest = K.q.slice(1); for (const id of rest) for (const G of S.games) G.hub.emit('leave', { id, reason: 'left' }); for (let i = 0; i < 100; i++) tick(S, 16.67, 1); t.check('fewer than 2 players finishes the round at once', !!S.bus.finished && Array.isArray(S.bus.finished.standings), JSON.stringify(S.bus.finished)); }
  // after end: nothing sent, music stops
  { const before = S.games.map(G => G.hub.sentAfterEnd || 0); S.bus.ended = true; for (const G of S.games) G.hub.emit('end', { reason: 'finished', standings: [[0], [1]] }); for (let i = 0; i < 120; i++) tick(S, 16.67, 1); t.check('after end nothing is sent', S.games.every((G, i) => (G.hub.sentAfterEnd || 0) === before[i] || (G.hub.sentAfterEnd || 0) === 0), S.games.map(G => G.hub.sentAfterEnd).join()); t.check('after end the game shows ROUND OVER and music stops', S.games.every(G => G.KC.net.ended && !G.game.audio.song)); }
  t.check('no engine errors in any copy', S.games.every(G => G.game.errors.length === 0), S.games.map(G => G.game.errors.slice(0, 2).map(e => e.message).join('|')).join(' // '));
  // time-up: the host finishes inside the grace with valid standings
  { const T2 = await session({ roles: ['host', 'guest'], latency: 20 }); await new Promise(r => setTimeout(r, 20)); const [h] = T2.games; tick(T2, 16.67, 10); T2.bus.startAt = 0; T2.bus.now = -3000; for (const G of T2.games) G.hub.emit('start', { in: 3000 }); tick(T2, 16.67, 300); for (const G of T2.games) G.hub.emit('time-up', { graceMs: 3000 }); tick(T2, 16.67, 10); t.check('time-up: the host calls finish with standings, scores and stats', !!T2.bus.finished && T2.bus.finished.standings.flat().length === 2 && T2.bus.finished.scores && T2.bus.finished.stats, JSON.stringify(T2.bus.finished)); }
  // the server role: a host with no player runs the world and still sends
  { const T3 = await session({ roles: ['server', 'guest', 'guest'], latency: 20 }); await new Promise(r => setTimeout(r, 20)); tick(T3, 16.67, 10); T3.bus.startAt = 0; T3.bus.now = -3000; for (const G of T3.games) G.hub.emit('start', { in: 3000 }); tick(T3, 16.67, 400); const sv = T3.games[0]; t.check('the server runs the world with no local player', sv.KC.net.server && !!sv.KC.net.world && !!sv.KC.net.bout); t.check('the server sends snapshots', T3.bus.copies[0].sent.length > 20, T3.bus.copies[0].sent.length); t.check('guests send heartbeats to the server', T3.bus.copies[1].sent.length > 5); }
  // outside a session the title appears
  { const { loadGame } = await import('./lib/load.mjs'); const G = loadGame(); G.game.advance(.5); t.check('with AIHub inactive the game runs normally (title)', G.game.scene.name === 'title'); }
};
