/** @file Four copies stay identical for 3,600 ticks despite latency, jitter, input loss and a leaver. */
import { it, expect } from 'vitest';
import { Sequencer, type TickPacket } from './sequencer';
import { createOperation, defaultRules } from '../scenes/op/state';
import { stepOperation } from '../scenes/op/step';
import type { Operation, Hand } from '../data/types';
function hash(s: Operation): string {
  const text = JSON.stringify(s);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}
it('never loses or rolls back a press in an out-of-order unreliable input', () => {
  const q = new Sequencer(1);
  q.input(0, [1, 2, 3, 1, 8, 7, 0, 6, 0]);
  q.input(0, [2, 3, 4, 0, 2, 3, 0, 1, 0]);
  expect(q.hands[0].slice(4, 6)).toEqual([8, 7]);
  expect(q.hands[0][7]).toBe(6);
});
it('matches a host and three clients after a minute of a noisy network', () => {
  const rules = defaultRules(),
    host = createOperation('gala-shift', 41, 4),
    clients = [0, 1, 2].map(() => createOperation('gala-shift', 41, 4)),
    seq = new Sequencer(4),
    queues = clients.map(() => new Sequencer(4));
  const network: { at: number; client: number; packet: TickPacket }[] = [];
  let random = 12345;
  const rng = () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return random / 4294967296;
  };
  let pending: Hand[][] = [],
    from = 0;
  for (let t = 0; t < 3640; t++) {
    if (t < 3600) {
      for (let i = 0; i < 4; i++)
        if (!(i === 3 && t >= 1800) && t % 4 === 0 && rng() > 0.05)
          seq.input(i, [Math.sin(t * 0.013 + i) * 5, Math.cos(t * 0.011 + i) * 2, 3, 1, 0, 0, i % 2, 0, 0]);
      if (t === 1800) seq.leave(3);
      const h = seq.hands.map((h) => [...h] as Hand);
      stepOperation(host, h, rules);
      seq.next++;
      if (!pending.length) from = t;
      pending.push(h);
      if (pending.length === 4) {
        const packet: TickPacket = { t: 'ticks', from, hands: pending, check: [seq.next, hash(host)] };
        for (let i = 0; i < 3; i++) network.push({ at: t + 6 + Math.floor(rng() * 9), client: i, packet });
        pending = [];
      }
    }
    for (let i = network.length - 1; i >= 0; i--)
      if (network[i].at <= t) {
        queues[network[i].client].receive(network[i].packet);
        network.splice(i, 1);
      }
    for (let i = 0; i < 3; i++)
      queues[i].drain(
        (h) => stepOperation(clients[i], h, rules),
        () => hash(clients[i]),
        8,
      );
  }
  for (let i = 0; i < 3; i++) {
    expect(queues[i].next).toBe(3600);
    expect(queues[i].mismatches).toBe(0);
    expect(queues[i].checked).toBeGreaterThan(800);
    expect(clients[i]).toEqual(host);
  }
});
