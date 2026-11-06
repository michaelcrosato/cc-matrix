/**
 * @file A shared-world round. The host steps the operation and sends each tick's hands. Clients play that list.
 * Presses are counters, so a lost packet does not drop a Gift.
 */
import type { Hand } from '../op/types';

/** The round the hub returns from connect. */
export interface HubInfo {
  me: number;
  players: { id: number; name: string; color: string }[];
  isHost: boolean;
  server: boolean;
  seed: number;
}

/** The card, as the `card` event describes it. */
export interface CardState {
  left: number | null;
  paused: boolean;
  starting: boolean;
  ready: number[];
  asked: boolean;
}

/** What one seat last told the host. */
export interface Sample {
  x: number;
  z: number;
  tool: number;
  use: number;
  gift: number;
  drop: number;
  swap: number;
  hint: number;
  paddle: number;
  site: number;
}

/** A tick the host has already decided. */
export interface TickMsg {
  t: 't';
  from: number;
  hands: number[][];
  hash: string;
}

/** One seat's intent on the way to the host. */
export interface IntentMsg {
  t: 'i';
  x: number;
  z: number;
  tool: number;
  use: number;
  gift: number;
  drop: number;
  swap: number;
  hint: number;
  paddle: number;
  site: number;
}

const ZERO: Sample = { x: 0, z: 0, tool: 1, use: 0, gift: 0, drop: 0, swap: 0, hint: 0, paddle: 0, site: 0 };

/** Apply a newer counter as a single press, and remember it. */
function take(next: number, prev: number): { fire: boolean; at: number } {
  if (next > prev) return { fire: true, at: prev + 1 };
  return { fire: false, at: prev };
}

/** The host's book of what each seat has done, and the ticks waiting to be sent. */
export class HostBook {
  readonly latest = new Map<number, Sample>();
  readonly applied = new Map<number, Sample>();
  readonly gone = new Set<number>();
  queue: { tick: number; hands: number[]; hash: string }[] = [];
  next = 0;
  hash = '';

  /** Store a client's latest intent. Older counters are ignored. */
  hear(from: number, msg: IntentMsg): void {
    if (this.gone.has(from)) return;
    const prev = this.latest.get(from) ?? { ...ZERO };
    this.latest.set(from, {
      x: msg.x,
      z: msg.z,
      tool: msg.tool,
      use: msg.use,
      gift: Math.max(prev.gift, msg.gift),
      drop: Math.max(prev.drop, msg.drop),
      swap: Math.max(prev.swap, msg.swap),
      hint: Math.max(prev.hint, msg.hint),
      paddle: Math.max(prev.paddle, msg.paddle),
      site: Math.max(prev.site, msg.site),
    });
  }

  /** Hands for the next tick. A seat that left holds still. */
  handsFor(seats: number): Hand[] {
    const hands: Hand[] = [];
    for (let seat = 0; seat < seats; seat++) {
      const base: Hand = {
        x: 0,
        z: 0,
        tool: 1,
        use: false,
        drop: false,
        gift: false,
        paddle: false,
        site: -1,
        swap: false,
        hint: false,
      };
      if (this.gone.has(seat)) {
        hands.push(base);
        continue;
      }
      const sample = this.latest.get(seat) ?? { ...ZERO };
      const prev = this.applied.get(seat) ?? { ...ZERO };
      const gift = take(sample.gift, prev.gift);
      const drop = take(sample.drop, prev.drop);
      const swap = take(sample.swap, prev.swap);
      const hint = take(sample.hint, prev.hint);
      const paddle = take(sample.paddle, prev.paddle);
      const site = take(sample.site, prev.site);
      this.applied.set(seat, {
        ...sample,
        gift: gift.at,
        drop: drop.at,
        swap: swap.at,
        hint: hint.at,
        paddle: paddle.at,
        site: site.at,
      });
      hands.push({
        ...base,
        x: sample.x,
        z: sample.z,
        tool: sample.tool,
        use: sample.use > 0,
        gift: gift.fire,
        drop: drop.fire,
        swap: swap.fire,
        hint: hint.fire,
        paddle: paddle.fire,
        site: site.fire ? (prev.site + 1) % 4 : -1,
        radial: false,
      });
    }
    return hands;
  }
}

/** How many buffered ticks a client should play this pass. */
export function drainCount(queued: number): number {
  if (queued > 30) return 8;
  if (queued > 6) return 2;
  return 1;
}

/** A local press, counted so the host still sees it if a packet is lost. */
export function countPress(previous: Sample, hand: Hand, siteChanged: boolean): Sample {
  return {
    x: hand.x,
    z: hand.z,
    tool: hand.tool,
    use: hand.use ? 1 : 0,
    gift: previous.gift + (hand.gift ? 1 : 0),
    drop: previous.drop + (hand.drop ? 1 : 0),
    swap: previous.swap + (hand.swap ? 1 : 0),
    hint: previous.hint + (hand.hint ? 1 : 0),
    paddle: previous.paddle + (hand.paddle ? 1 : 0),
    site: previous.site + (siteChanged ? 1 : 0),
  };
}

export { ZERO };
