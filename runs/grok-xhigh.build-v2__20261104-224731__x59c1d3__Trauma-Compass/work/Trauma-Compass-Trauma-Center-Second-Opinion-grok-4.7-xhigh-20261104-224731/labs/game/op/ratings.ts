/**
 * @file Scores, chains, and ranks. A TEXTBOOK or CLEAN action feeds the chain. A SLIP zeroes it and cuts a real
 * nick. Ranks are fractions of the case's par, which is the bot's Resident score written into the case data.
 */
import type { Difficulty, Op, Rank, Rating, Seat } from './types';

/** Chain multiplier cap. */
const CHAIN_CAP = 2;

/** Points for one finished action, before the grade and the chain. */
export const POINTS = {
  stitch: 20,
  pool: 30,
  shard: 100,
  cut: 200,
  mass: 300,
  parasite: 500,
  phase: 1000,
} as const;

/** Grade multiplier. SLIP is zero and breaks the chain. */
function gradeMul(rating: Rating): number {
  if (rating === 'TEXTBOOK') return 1.5;
  if (rating === 'CLEAN') return 1;
  if (rating === 'ROUGH') return 0.5;
  return 0;
}

/** Whether Second Pulse is up for this seat, so the chain counts double and clean work heals. */
function pulsing(op: Op, seat: Seat): boolean {
  return seat.giftKind === 'pulse' && seat.giftLeft > 0;
}

/** Apply one grade. Returns the points added (0 for a slip). */
export function award(op: Op, seat: Seat, rating: Rating, base: number, text: string): number {
  if (rating === 'SLIP') {
    seat.chain = 0;
    op.slips += 1;
    nick(op, seat);
    op.events.push({ type: 'rating', text, rating, x: seat.x, z: seat.z, seat: seat.id });
    if (op.slips > op.slipLimit) failOp(op, 'Five slips? Get out of my OR.');
    return 0;
  }
  const chainMul = Math.min(CHAIN_CAP, 1 + seat.chain);
  const points = Math.round(base * gradeMul(rating) * chainMul);
  seat.score += points;
  op.score += points;
  if (rating === 'TEXTBOOK' || rating === 'CLEAN') {
    const step = pulsing(op, seat) ? 0.2 : 0.1;
    seat.chain = Math.min(CHAIN_CAP - 1, seat.chain + step);
    if (1 + seat.chain > seat.bestChain) seat.bestChain = 1 + seat.chain;
    if (seat.bestChain > op.bestChain) op.bestChain = seat.bestChain;
    if (pulsing(op, seat)) heal(op, seat, 1.5);
  }
  op.events.push({ type: 'rating', text: `${rating}`, rating, x: seat.x, z: seat.z, seat: seat.id });
  return points;
}

/** A small real wound where a slip happened. */
function nick(op: Op, seat: Seat): void {
  op.events.push({
    type: 'nick',
    text: 'A nick.',
    x: seat.x,
    z: seat.z,
    seat: seat.id,
  });
}

/** Add vitals to the seat's current patient, capped at 100. */
export function heal(op: Op, seat: Seat, amount: number): void {
  const patient = op.patients[Math.min(seat.site, op.patients.length - 1)] ?? op.patients[0];
  if (!patient || !patient.alive) return;
  patient.vitals = Math.min(100, patient.vitals + amount);
}

/** Fail the operation unless attract mode is holding the line. */
export function failOp(op: Op, reason: string): void {
  if (op.attract || op.status !== 'playing') return;
  op.status = 'lost';
  op.fail = reason;
  op.events.push({ type: 'fail', text: reason });
}

/** Win, and add the end-of-case bonus once. */
export function winOp(op: Op): void {
  if (op.status !== 'playing') return;
  const seconds = Math.max(0, Math.floor(op.clock / 6000));
  const vitals = op.patients.reduce((sum, patient) => sum + Math.max(0, patient.vitals), 0);
  let bonus = seconds * 10 + Math.round(vitals) * 20;
  if (op.slips === 0) bonus += 2000;
  if (!op.giftUsed) bonus += 1000;
  op.seats[0].score += bonus;
  op.score += bonus;
  op.status = 'won';
  op.events.push({ type: 'win', text: 'OPERATION COMPLETE' });
}

/** Rank for a score against the case par. ★ wants a clean S on Attending. */
export function rankFor(score: number, par: number, slips: number, difficulty: Difficulty): Rank {
  const safe = par > 0 ? par : 1;
  const ratio = score / safe;
  const letter: Rank = ratio >= 0.9 ? 'S' : ratio >= 0.75 ? 'A' : ratio >= 0.6 ? 'B' : 'C';
  if (letter === 'S' && slips === 0 && difficulty === 'attending') return '★';
  return letter;
}

/** Scalpel grade from the mean distance to the guide, metres. */
export function rateCut(mean: number, textbook: number): Rating {
  if (mean < textbook) return 'TEXTBOOK';
  if (mean < 0.4) return 'CLEAN';
  if (mean < 0.7) return 'ROUGH';
  return 'SLIP';
}

/** Syringe grade and the vitals it returns, from a charge in 0..1. */
export function rateInject(charge: number): { rating: Rating; vitals: number } {
  if (charge >= 0.75 && charge <= 0.95) return { rating: 'TEXTBOOK', vitals: 24 };
  if (charge > 0.95) return { rating: 'ROUGH', vitals: 6 };
  if (charge >= 0.5) return { rating: 'CLEAN', vitals: 18 };
  return { rating: 'ROUGH', vitals: Math.max(4, Math.round(charge * 16)) };
}
