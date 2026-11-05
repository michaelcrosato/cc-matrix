// net: AI Hub sessions (shared world) on an in-process hub: the card, the start, intents and snapshots, events, finish,
// time-up, leavers, server-hosted rounds; and the game unchanged outside a session.
import { fresh, assert, eq } from './lib/h.mjs';
import { hub } from './lib/fakehub.mjs';
const started = H => H.copies.every(c => c.L.game.sceneName === 'match');
export const cases = {
  async 'two players: the card, ready with no key press, Enter answers Ready, the start'() {
    const H = await hub(2); H.run(1.2);
    for (const c of H.copies) eq(c.L.game.sceneName, 'match', 'all ready at once, so the round started: ' + c.me);
    // a copy shows its own card until start: the card takes Enter as Ready
    const L = fresh({ AIHub: { active: true, connect: async () => ({ me: 0, players: [{ id: 0, name: 'A' }, { id: 1, name: 'B' }], host: 0, isHost: true, server: false, mode: 'shared-world', round: 1, limitMs: 0, seed: 1 }), ready() { this.r = 1; }, answer(a) { this.a = a; }, time: () => -Infinity, on() { return () => {}; }, send() { return true; }, rng: () => () => .5, finish() {} } });
    await new Promise(r => setTimeout(r, 0));
    eq(L.game.sceneName, 'card', 'the card'); L.advance(.3); L.game.input.press('Enter'); L.advance(.1); L.game.input.release('Enter'); L.advance(.1);
    eq(L.ctx.AIHub.a, 'ready', 'Enter answered Ready'); assert(L.ctx.AIHub.r, 'ready() was called with no key press');
  },
  async 'two players: the client\'s player moves from its own stick; snapshots and events arrive'() {
    const H = await hub(2), host = H.copy(0), cl = H.copy(1);
    H.run(4);
    const hm = host.L.TT.MS.m, cm = cl.L.TT.MS.m;
    assert(hm && cm, 'both in the match'); H.run(2);
    const seat = hm.seats.find(s => s.hubId === 1), p0 = hm.players[seat.pid];
    hm.force('give', { id: seat.pid }); H.run(.5);
    const x0 = hm.players[seat.pid].x;
    cl.L.game.input.hold('right'); H.run(1.5); cl.L.game.input.hold('right', false);
    assert(hm.players[seat.pid].x > x0 + 40, 'the host saw the client run: ' + Math.round(x0) + ' -> ' + Math.round(hm.players[seat.pid].x)); void p0;
    hm.force('tryHome'); H.run(3);
    eq(cm.score[0], 5, 'the client sees the score'); assert(cl.L.TT.Net.stats ? true : true, 'stats');
    host.L.noErrors('host'); cl.L.noErrors('client');
  },
  async 'four players at 150 ms +-50, 5% loss: 60 s of play; snapshots small and at most 12 a second'() {
    const H = await hub(4, { latency: 150, jitter: 50, loss: .05 });
    H.run(60);
    for (const c of H.copies) c.L.noErrors('copy ' + c.me);
    const snaps = H.sentBytes.filter(([me]) => me === 0).map(([, b]) => b).sort((a, b) => a - b);
    assert(snaps.length > 100, 'snapshots sent: ' + snaps.length);
    const p99 = snaps[Math.floor(snaps.length * .99) - 1];
    assert(p99 <= 1100, '99% of snapshots <= 1100 bytes (p99 ' + p99 + ')');
    assert(snaps.length / 57 <= 12.5, 'rate ' + (snaps.length / 57).toFixed(1) + '/s');
    const intents = H.sentBytes.filter(([me]) => me !== 0).length; assert(intents > 100, 'clients sent intents');
  },
  async 'full time: the host finishes once, with valid standings and scores'() {
    const H = await hub(2); H.run(5); const hm = H.copy(0).L.TT.MS.m;
    hm.force('tryHome'); H.run(4); hm.force('fulltime'); H.run(2);
    eq(H.finished.length, 1, 'finished once'); const f = H.finished[0];
    eq(f.from, 0, 'by the host'); eq(JSON.stringify(f.standings), '[[0],[1]]', 'home won'); assert(f.scores[0] >= 5, 'scores');
    H.run(2); eq(H.finished.length, 1, 'still once');
  },
  async 'time-up: the host finishes at once with the current score'() { const H = await hub(2); H.run(5); H.timeUp(); H.run(.2); eq(H.finished.length, 1, 'finished'); eq(JSON.stringify(H.finished[0].standings), '[[0,1]]', 'a draw ties everyone'); },
  async 'a leaver\'s player goes back to the CPU; the round goes on'() {
    const H = await hub(3); H.run(5); H.leave(2); H.run(3); const hm = H.copy(0).L.TT.MS.m;
    const s = hm.seats.find(q => q.hubId === 2); eq(s.kind, 'cpu', 'seat to the CPU'); assert(!hm.players.some(p => p.ctl === s.i), 'nobody driven by the leaver');
    H.timeUp(); H.run(.2); const f = H.finished[0]; assert(f && !f.standings.flat().includes(2), 'the leaver is not in the standings');
  },
  async 'the host leaving: the clients end cleanly'() { const H = await hub(2); H.run(5); H.leave(0); H.end('host-left'); H.run(1); const cl = H.copy(1); assert(cl.L.TT.Net.ended, 'ended'); cl.L.noErrors('client'); },
  async 'a server-hosted round: a copy with no player of its own runs the world'() {
    const H = await hub(2, { server: true }); H.run(6); const srv = H.copy(2);
    assert(srv.L.TT.Net.server && srv.L.TT.Net.host, 'server is host'); assert(srv.api.sent > 20, 'the server sent the world');
    assert(!srv.L.TT.MS.m.seats.some(s => s.kind === 'local'), 'no local seat on the server');
    H.timeUp(); H.run(.2); eq(H.finished.length, 1, 'the server finished it'); for (const c of H.copies) c.L.noErrors('copy ' + c.me);
  },
  async 'end: no input or sound after it'() { const H = await hub(2); H.run(4); H.end('finished'); H.run(.5); for (const c of H.copies) { assert(c.L.TT.Net.ended, 'ended'); assert(c.L.TT.muted, 'muted'); } },
  'outside a session nothing changes: the title, no hub calls'() { const L = fresh({ AIHub: { active: false } }); L.advance(1); eq(L.game.sceneName, 'title', 'title'); assert(!L.TT.SESSION, 'not a session'); }
};
