/** @file Host input sequencing and monotonic presses; this pure queue is exercised under simulated packet loss. */
import type { Hand } from '../data/types';
export interface TickPacket {
  t: 'ticks';
  from: number;
  hands: Hand[][];
  check?: [number, string];
}
export class Sequencer {
  next = 0;
  hands: Hand[];
  queue = new Map<number, Hand[]>();
  checks = new Map<number, string>();
  mismatches = 0;
  checked = 0;
  constructor(seats: number) {
    this.hands = Array.from({ length: seats }, () => [0, 0, 3, 0, 0, 0, 0, 0, 0]);
  }
  input(seat: number, hand: Hand): void {
    const old = this.hands[seat];
    if (!old) return;
    const n = [...hand] as Hand;
    for (const i of [4, 5, 7]) n[i] = Math.max(old[i], n[i]);
    this.hands[seat] = n;
  }
  receive(packet: TickPacket): void {
    packet.hands.forEach((h, i) => {
      if (packet.from + i >= this.next) this.queue.set(packet.from + i, h);
    });
    if (packet.check) this.checks.set(...packet.check);
  }
  drain(step: (hands: Hand[]) => void, hash: () => string, limit = 8): void {
    for (let i = 0; i < limit; i++) {
      const h = this.queue.get(this.next);
      if (!h) break;
      step(h);
      this.queue.delete(this.next);
      this.next++;
      const expected = this.checks.get(this.next);
      if (expected) {
        this.checked++;
        if (hash() !== expected) this.mismatches++;
        this.checks.delete(this.next);
      }
    }
  }
  leave(seat: number): void {
    if (this.hands[seat]) this.hands[seat][3] = -1;
  }
}
