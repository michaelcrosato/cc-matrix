/**
 * @file Host lockstep without a socket. Four copies, delayed intents, loss on the way to the host, one leaver.
 * The host's applied hands are what every copy steps. After the run, the hashes for each applied tick agree.
 */
import { stepOp, lastHash } from './step';
import type { Hand, Op } from './types';
import { addTarget, createBare, idleHand } from './world';

/** A roll in 0..1 from the tick and the seat, with no Math.random. */
function roll(tick: number, seat: number): number {
  const x = Math.sin(tick * 12.9898 + seat * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** What one surgeon meant to do on one tick. Pure, so every copy would have sent the same intent. */
export function intentAt(tick: number, seat: number, hand: Hand): Hand {
  const angle = tick / 18 + seat;
  return {
    ...hand,
    x: Math.sin(angle) * (1.4 + seat * 0.15),
    z: Math.cos(angle * 0.8) * 0.9,
    tool: Math.floor(tick / 90 + seat) % 8,
    use: tick % 37 < 8,
    gift: false,
    paddle: false,
    drop: false,
    site: -1,
    swap: false,
    hint: false,
  };
}

/** One peer's view of the operation. */
interface Peer {
  op: Op;
  /** Last intent that actually reached the host, per seat. */
  last: Hand[];
  /** Hash after each applied tick. */
  hashes: string[];
}

/** Run the lockstep. Returns the peers so a test can read the hashes. */
export function runLockstep(ticks = 3600, seats = 4): { peers: Peer[]; dropped: number; leftAt: number } {
  const peers: Peer[] = [];
  for (let i = 0; i < 4; i++) {
    const op = createBare({ seats, code: false });
    addAnchor(op);
    peers.push({ op, last: op.seats.map((seat) => idleHand(seat)), hashes: [] });
  }
  const host = peers[0];
  let dropped = 0;
  const leftAt = Math.floor(ticks / 2);
  const delay = 4;
  /** Intents in flight: tick they were sent, seat, hand, and whether the wire kept them. */
  const wire: { arrive: number; seat: number; hand: Hand }[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    for (let seat = 0; seat < seats; seat++) {
      if (seat === seats - 1 && tick >= leftAt) continue;
      const hand = intentAt(tick, seat, host.last[seat]);
      const lost = roll(tick, seat) < 0.05;
      if (lost) {
        dropped += 1;
        continue;
      }
      const jitter = Math.floor(roll(tick, seat + 3) * 3);
      wire.push({ arrive: tick + delay + jitter, seat, hand });
    }
    const applied = host.last.map((hand) => ({ ...hand, use: false }));
    for (let i = wire.length - 1; i >= 0; i--) {
      const packet = wire[i];
      if (packet.arrive > tick) continue;
      applied[packet.seat] = packet.hand;
      host.last[packet.seat] = packet.hand;
      wire.splice(i, 1);
    }
    for (const peer of peers) {
      stepOp(peer.op, applied);
      peer.hashes.push(lastHash(peer.op));
    }
  }
  return { peers, dropped, leftAt };
}

/** A locked mass that keeps the bare operation from ending the moment it starts. */
function addAnchor(op: Op): void {
  addTarget(op, { kind: 'mass', x: 6, z: 4, locked: true }, 0);
}
