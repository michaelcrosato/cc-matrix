/**
 * @file One step of an operation. Hands in, events and a new hash out. The same function serves the bot, the
 * couch, the attract loop, and the lockstep host.
 */
import { actAll } from './act';
import { applyHands, fieldDelta, growAway, stepBody, stepVitals } from './body';
import { stepStrains } from './strains';
import type { Hand, Op } from './types';
import { hashOp } from './world';

/** Advance one sixtieth of a second. `hands` null holds still with the buttons up. */
export function stepOp(op: Op, hands: readonly Hand[] | null): void {
  if (op.status !== 'playing') return;
  op.events = [];
  applyHands(op, hands);
  actAll(op);
  const ft = fieldDelta(op);
  op.field += ft;
  stepStrains(op, ft);
  growAway(op, ft);
  stepVitals(op, ft);
  stepBody(op, ft);
  op.tick += 1;
  op.events.push({ type: 'hash', text: hashOp(op) });
}

/** The latest hash, from the step that just ran. */
export function lastHash(op: Op): string {
  const found = op.events.find((event) => event.type === 'hash');
  return found?.text ?? hashOp(op);
}
