/**
 * @file The operation bot. It reads the live field and writes the same hand record a pad would.
 * It never sets score, vitals, or `done` itself. `runBot` stops on a win, a loss, or ten seconds with no change.
 */
import { flapOpen } from './act';
import { codeBand } from './body';
import { stepOp } from './step';
import { rightTool } from './table';
import type { Hand, Op, Seat, Target } from './types';
import { idleHand, segmentU } from './world';

/** Tool ids in radial order, matching `TOOLS`. */
const INDEX: Record<string, number> = {
  scalpel: 0,
  forceps: 1,
  suture: 2,
  drain: 3,
  laser: 4,
  syringe: 5,
  gel: 6,
  scanner: 7,
};

/** Hands for every seat, from the operation as it stands before this step. */
export function botHands(op: Op): Hand[] {
  return op.seats.map((seat) => botHand(op, seat));
}

/** Play until the operation ends. A frozen field for 600 ticks is a stall, not a win. */
export function runBot(op: Op, cap = 60 * 60 * 12): Op {
  let last = '';
  let same = 0;
  for (let i = 0; i < cap && op.status === 'playing'; i++) {
    const sig = signature(op);
    if (sig === last) same += 1;
    else {
      same = 0;
      last = sig;
    }
    if (same > 600) {
      op.status = 'lost';
      op.fail = `stalled ${sig.slice(0, 180)}`;
      break;
    }
    stepOp(op, botHands(op));
  }
  return op;
}

/** What changed, so a slow burn does not look like a stall. */
function signature(op: Op): string {
  const bits = op.targets
    .filter((target) => !target.done)
    .map(
      (target) =>
        `${target.id}:${target.cut}:${target.stitches}:${Math.round(target.volume * 5)}:${Math.round(target.burn * 5)}:${Math.round(target.laserDamage * 5)}:${target.dose}:${target.hidden ? 1 : 0}:${target.stroke.toFixed(1)}`,
    )
    .join(',');
  return `${op.phase}:${op.code ? 'c' : ''}:${op.injected ? 1 : 0}:${op.mercyKills}:${bits}`;
}

/** One surgeon's hand for this step. */
function botHand(op: Op, seat: Seat): Hand {
  const hand = idleHand(seat);
  if (op.status !== 'playing') return hand;
  if (op.code) {
    hand.paddle = codeBand(op);
    return hand;
  }
  if (seat.lock >= 0) {
    hand.gift = op.tick === seat.lockBeat;
    return hand;
  }
  const phase = op.phases[op.phase];
  if (phase?.until === 'injected' && !op.injected) return inject(op, seat, hand);
  if (phase?.until === 'code') return hand;
  if (seat.hold >= 0) {
    const held = op.targets.find((item) => item.id === seat.hold && !item.done);
    if (held) {
      if (held.site !== seat.site) hand.site = held.site;
      pull(op, seat, hand, held);
      return hand;
    }
  }
  const target = pick(op, seat);
  if (!target) {
    const matron = op.targets.find(
      (item) => !item.done && !item.optional && item.phase === op.phase && item.kind === 'matron',
    );
    if (matron) approach(hand, seat, matron.x, matron.z, op.balance.cursor);
    return hand;
  }
  if (target.site !== seat.site) hand.site = target.site;
  if (target.kind === 'binder' && target.tag === 'gift' && seat.giftLeft <= 0) {
    hand.gift = seat.charges > 0;
    return hand;
  }
  work(op, seat, hand, target);
  return hand;
}

/** The next thing this seat should touch. Seats split the list so they do not grab the same shard. */
function pick(op: Op, seat: Seat): Target | null {
  const list = op.targets.filter((target) => open(op, target));
  list.sort((a, b) => rank(a) - rank(b) || a.id - b.id);
  if (list.length === 0) return null;
  if (op.seats.length === 1) return list[0];
  const mine = list.filter((_, index) => index % op.seats.length === seat.id);
  return mine[0] ?? null;
}

/** Whether the bot is allowed to work this target right now. */
function open(op: Op, target: Target): boolean {
  if (target.done || target.optional || target.phase !== op.phase) return false;
  if (target.under >= 0 && !flapOpen(op, target.under)) return false;
  if (target.locked && !target.hidden) return false;
  if (target.kind === 'matron' && !target.vulnerable) return false;
  return true;
}

/** Lower runs first. A yawning Matron outranks the small ones. */
function rank(target: Target): number {
  if (target.kind === 'lull' || target.kind === 'bleeder' || target.kind === 'mote') return 0;
  if (target.kind === 'flap') return 1;
  if (target.kind === 'matron' && target.vulnerable) return 1;
  if (target.hidden) return 2;
  if (target.kind === 'pool') return 4;
  if (target.kind === 'solace') return 5;
  if (target.kind === 'balmNode') return 6;
  if (target.kind === 'guide') return 7;
  if (target.kind === 'nodule') return 8;
  if (target.kind === 'wound') return 9;
  if (target.kind === 'shard' || target.kind === 'mass' || target.kind === 'cocoon' || target.kind === 'tendril')
    return 10;
  if (target.kind === 'binder') return 11;
  if (target.kind === 'balmCell') return 12;
  return 13;
}

/** Dispatch on the kind. The hand only aims, equips, and holds use. */
function work(op: Op, seat: Seat, hand: Hand, target: Target): void {
  if (target.hidden) return scan(op, seat, hand, target);
  if (target.kind === 'solace' && target.gen < 3) return split(op, seat, hand, target);
  if (target.kind === 'solace') return burn(op, seat, hand, target);
  if (target.kind === 'guide') return cut(op, seat, hand, target);
  if (target.kind === 'wound') return stitch(op, seat, hand, target);
  if (target.kind === 'shard' || target.kind === 'mass' || target.kind === 'cocoon' || target.kind === 'tendril')
    return pull(op, seat, hand, target);
  if (target.kind === 'flap') return pull(op, seat, hand, target);
  if (target.kind === 'binder' || target.kind === 'matron' || target.kind === 'balmNode')
    return bind(op, seat, hand, target);
  if (target.kind === 'balmCell' || target.kind === 'abrasion' || target.kind === 'numb')
    return paint(op, seat, hand, target);
  const tool = rightTool(target.kind);
  if (tool === 'drain') return drain(op, seat, hand, target);
  if (tool === 'laser') return burn(op, seat, hand, target);
  if (tool === 'gel') return paint(op, seat, hand, target);
  if (tool) hand.tool = INDEX[tool] ?? 0;
}

/** Step toward a point at `metres` per second, never past it. */
function approach(hand: Hand, seat: Seat, x: number, z: number, metres: number): void {
  const dx = x - seat.x;
  const dz = z - seat.z;
  const dist = Math.hypot(dx, dz);
  const step = Math.max(0.5, metres) / 60;
  if (dist <= step) {
    hand.x = x;
    hand.z = z;
    return;
  }
  hand.x = seat.x + (dx / dist) * step;
  hand.z = seat.z + (dz / dist) * step;
}

/** Follow the guide vertex the cut has reached. */
function cut(op: Op, seat: Seat, hand: Hand, target: Target): void {
  const count = target.path.length / 2;
  const index = Math.min(target.cut, Math.max(0, count - 1));
  const x = target.path[index * 2] ?? target.x;
  const z = target.path[index * 2 + 1] ?? target.z;
  approach(hand, seat, x, z, op.balance.cursor);
  hand.use = target.cut > 0 || Math.hypot(seat.x - x, seat.z - z) < 0.28;
  hand.tool = 0;
}

/** Cross the wound once per stitch, offset to either side. */
function stitch(op: Op, seat: Seat, hand: Hand, target: Target): void {
  const dx = target.x2 - target.x;
  const dz = target.z2 - target.z;
  const length = Math.max(0.5, Math.hypot(dx, dz));
  const u = Math.min(0.9, Math.max(0.1, (target.stitches + 0.5) / Math.max(1, target.need)));
  const side = seat.sutureSide >= 0 ? -1 : 1;
  const x = target.x + dx * u + (-dz / length) * 0.4 * side;
  const z = target.z + dz * u + (dx / length) * 0.4 * side;
  approach(hand, seat, x, z, op.balance.cursor);
  const along = segmentU(seat.x, seat.z, target);
  const atLine = Math.abs(along - u) < 0.14;
  hand.use = atLine && (seat.sutureSide !== 0 || Math.hypot(seat.x - x, seat.z - z) < 0.18);
  hand.tool = 2;
}

/** Grab, then back away slowly enough to stay CLEAN. */
function pull(op: Op, seat: Seat, hand: Hand, target: Target): void {
  hand.tool = 1;
  if (seat.hold === target.id) {
    const dx = seat.x - target.ox || 1;
    const dz = seat.z - target.oz;
    const len = Math.hypot(dx, dz) || 1;
    const step = 4 / 60;
    hand.x = Math.max(-7, Math.min(7, seat.x + (dx / len) * step));
    hand.z = Math.max(-4.5, Math.min(4.5, seat.z + (dz / len) * step));
    hand.use = true;
    return;
  }
  approach(hand, seat, target.x, target.z, op.balance.cursor);
  hand.use = Math.hypot(seat.x - target.x, seat.z - target.z) < 0.48;
}

/** Sit on a pool. */
function drain(op: Op, seat: Seat, hand: Hand, target: Target): void {
  approach(hand, seat, target.x, target.z, op.balance.cursor);
  hand.use = Math.hypot(seat.x - target.x, seat.z - target.z) < 0.6;
  hand.tool = 3;
}

/** Sit on something that burns. Let a hot laser cool. */
function burn(op: Op, seat: Seat, hand: Hand, target: Target): void {
  approach(hand, seat, target.x, target.z, op.balance.cursor);
  hand.use = seat.laserCool <= 0 && Math.hypot(seat.x - target.x, seat.z - target.z) < 0.32;
  hand.tool = 4;
}

/** A long stroke through Solace. Keep moving or the stroke never adds up. */
function split(op: Op, seat: Seat, hand: Hand, target: Target): void {
  const span = Math.max(0.8, target.radius * 0.9);
  const leg = Math.floor(op.tick / 18) % 2 === 0 ? -1 : 1;
  approach(hand, seat, target.x + leg * span, target.z, op.balance.cursor);
  hand.use = Math.hypot(seat.x - target.x, seat.z - target.z) <= target.radius + 0.25;
  hand.tool = 0;
}

/** Hold the syringe on a binder point or a yawning Matron. */
function bind(op: Op, seat: Seat, hand: Hand, target: Target): void {
  approach(hand, seat, target.x, target.z, op.balance.cursor);
  hand.use = Math.hypot(seat.x - target.x, seat.z - target.z) < 0.48;
  hand.tool = 5;
}

/** Paint gel. Balm cells clear on contact, so this is also how the film comes off. */
function paint(op: Op, seat: Seat, hand: Hand, target: Target): void {
  approach(hand, seat, target.x, target.z, op.balance.cursor);
  hand.use = Math.hypot(seat.x - target.x, seat.z - target.z) < op.balance.gel * 0.75;
  hand.tool = 6;
}

/** Stand on a buried target and ping. Everything in range comes up. */
function scan(op: Op, seat: Seat, hand: Hand, target: Target): void {
  approach(hand, seat, target.x, target.z, op.balance.cursor);
  hand.use = Math.hypot(seat.x - target.x, seat.z - target.z) < 0.4;
  hand.tool = 7;
}

/** Charge the stabiliser in clear tissue, then let go inside the band. */
function inject(op: Op, seat: Seat, hand: Hand): Hand {
  approach(hand, seat, 0, 2.2, op.balance.cursor);
  const there = Math.hypot(seat.x, seat.z - 2.2) < 0.25;
  hand.tool = 5;
  hand.use = there && seat.syringeCd <= 0 && seat.syringe < 0.86;
  return hand;
}
