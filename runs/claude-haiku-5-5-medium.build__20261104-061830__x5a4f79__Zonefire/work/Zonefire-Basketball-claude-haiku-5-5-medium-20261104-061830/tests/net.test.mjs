// The net (plan §19.2 "net"): a host's snapshot applies on a copy and the bodies agree; a copy's input moves the host's
// player; the snapshot stays small; the events replay once.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);

T('net.a host snapshot applies on a copy: the ball and every body agree, and it is small', () => {
  const host = loadGame({ seed: 21 }), copy = loadGame({ seed: 21 });
  for (const g of [host, copy]) g.bb.setupMatch({ court: 'skybox', humans: [], qLen: 60 });
  for (let i = 0; i < 240; i++) host.bb.matchStep(1 / 120);
  host.bb.S.net.role = 'host';
  const snap = host.bb.netSnapshot();
  const json = JSON.stringify(snap);
  expect(json.length < 1100, `snapshot ${json.length} bytes, want under 1100`);
  copy.bb.S.net.role = 'client';
  copy.bb.netApplySnapshot(snap);
  const hb = host.bb.S.ball, cb = copy.bb.S.ball;
  expect(Math.abs(hb.x - cb.x) < 1 && Math.abs(hb.z - cb.z) < 1, `ball ${hb.x.toFixed(1)} vs ${cb.x.toFixed(1)}`);
  host.bb.S.players.forEach((p, i) => { const q = copy.bb.S.players[i]; expect(Math.abs(p.body.x - q.body.x) < 1.5, `player ${i} x ${p.body.x} vs ${q.body.x}`); });
  expect(copy.bb.S.match.score.join() === host.bb.S.match.score.join(), 'the score agrees');
});
T('net.a copy\'s input moves the host\'s player through the network path', () => {
  const host = loadGame({ seed: 22 });
  host.bb.setupMatch({ court: 'skybox', humans: [], qLen: 60 });
  host.bb.S.net.role = 'host';
  host.bb.S.net.slotOf = { 1: 0 };
  const p = host.bb.S.players[0];
  p.human = true; p.input = host.bb.netInput ? host.bb.netInput(1) : null;
  host.bb.S.net.inputs[1] = { m: [0, 0], h: {}, p: {}, r: {}, lastE: -1 };
  host.bb.netApply(1, { t: 'i', s: 1, a: 0, m: [64, 0], h: 0, e: [] });
  const x0 = p.body.x;
  for (let i = 0; i < 120; i++) { host.bb.S.net.inputs[1].m = [1, 0]; host.bb.matchStep(1 / 120); }
  expect(p.body.x > x0 + 20, `the host's player should run on the copy's stick (${x0} → ${p.body.x})`);
});
T('net.the events of a snapshot play once on a copy', () => {
  const host = loadGame({ seed: 23 }), copy = loadGame({ seed: 23 });
  for (const g of [host, copy]) g.bb.setupMatch({ court: 'skybox', humans: [], qLen: 60 });
  for (let i = 0; i < 2400; i++) { host.bb.matchStep(1 / 120); if (host.bb.S.events.length > 30) break; }
  host.bb.S.net.role = 'host'; host.bb.S.net.evSent = 0;
  const s1 = host.bb.netSnapshot();
  copy.bb.S.net.role = 'client';
  let n = 0; copy.bb.on('*', () => n++);
  copy.bb.netApplySnapshot(s1);
  const first = n;
  copy.bb.netApplySnapshot(s1);
  expect(n === first, `a repeated snapshot must not replay its events (${first} then ${n})`);
});
