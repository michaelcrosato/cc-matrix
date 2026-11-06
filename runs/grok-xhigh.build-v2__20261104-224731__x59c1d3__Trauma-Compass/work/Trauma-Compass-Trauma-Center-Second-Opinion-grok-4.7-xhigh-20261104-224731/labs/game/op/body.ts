/**
 * @file Vitals, the clock, the Code, the Gift, phase changes, and the colleague. Field time is the only clock
 * the patient knows. Cursors already moved before this runs.
 */
import { award, failOp, heal, POINTS, winOp } from './ratings';
import type { Hand, Op, Seat, Spawn } from './types';
import { addTarget, enterPhase, FIELD_SECOND } from './world';

/** Field ticks this step. Stillpoint is a quarter. The pulse-lock minigame is 30 percent. */
export function fieldDelta(op: Op): number {
  if (op.seats.some((seat) => seat.giftKind === 'still' && seat.giftLeft > 0)) return 25;
  if (op.seats.some((seat) => seat.lock >= 0)) return 30;
  if (op.radial) return 60;
  return 100;
}

/** Read hands into seats. Null means the menu is up: cursors stay, buttons do not stick. */
export function applyHands(op: Op, hands: readonly Hand[] | null): void {
  if (!hands) {
    for (const seat of op.seats) seat.use = false;
    op.radial = false;
    return;
  }
  op.radial = hands.some((hand) => hand.radial === true);
  for (let i = 0; i < op.seats.length; i++) {
    const hand = hands[i];
    const seat = op.seats[i];
    if (!hand) continue;
    seat.x = Math.max(-8, Math.min(8, hand.x));
    seat.z = Math.max(-5, Math.min(5, hand.z));
    if (op.roll) {
      const wave = Math.sin(op.tick / 40);
      if (op.tick % 420 < 36) {
        seat.x += wave * 0.1;
        seat.z += wave * 0.04;
      }
    }
    if (hand.tool >= 0 && hand.tool <= 7 && hand.tool !== seat.tool) {
      seat.tool = hand.tool;
      op.events.push({ type: 'tool', text: 'clack', seat: seat.id });
    }
    seat.use = hand.use;
    seat.drop = hand.drop;
    if (hand.site >= 0 && hand.site < op.sites.length) seat.site = hand.site;
    if (hand.hint) op.events.push({ type: 'hint', text: op.hint || 'Steady, Doctor.', seat: seat.id });
    if (hand.swap && op.swapOk) swapPersona(op, seat);
    if (hand.gift) pressGift(op, seat);
    // One hold is one shock. The next try waits until the paddles come up.
    if (hand.paddle && !seat.prevPaddle) pressPaddle(op, seat);
    seat.prevPaddle = hand.paddle;
  }
}

/** Swap the lead between Stillpoint and Second Pulse. */
function swapPersona(op: Op, seat: Seat): void {
  if (seat.id !== 0) return;
  if (seat.gift === 'stillpoint') {
    seat.gift = 'second';
    op.persona = 'sabine';
  } else if (seat.gift === 'second') {
    seat.gift = 'stillpoint';
    op.persona = 'wren';
  }
  op.events.push({ type: 'swap', text: op.persona, seat: seat.id });
}

/** Triangle: start a lock, or hit the next beat. Simple Gift skips the lock. */
function pressGift(op: Op, seat: Seat): void {
  if (seat.gift === 'none' && seat.charges <= 0 && !op.attract) return;
  if (seat.lock >= 0) {
    const window = Math.max(4, Math.round((op.balance.giftWindow / 1000) * 60));
    const error = Math.abs(op.tick - seat.lockBeat);
    if (error <= Math.max(2, Math.round(window / 2))) seat.lockPerfect += 1;
    else if (error <= window) seat.lockGood += 1;
    seat.lock += 1;
    seat.lockBeat = op.tick + 40;
    if (seat.lock >= 3) finishLock(op, seat);
    return;
  }
  if (seat.giftLeft > 0) return;
  if (seat.charges <= 0 && !op.attract) return;
  if (!op.attract) seat.charges -= 1;
  op.giftUsed = true;
  if (op.simple) {
    seat.giftKind = seat.gift === 'second' ? 'pulse' : 'still';
    seat.giftLeft = Math.round(6 * 60 * op.balance.giftTime);
    seat.lastGift = op.tick;
    consult(op, seat);
    return;
  }
  seat.lock = 0;
  seat.lockGood = 0;
  seat.lockPerfect = 0;
  seat.lockBeat = op.tick + 40;
  seat.lastGift = op.tick;
}

/** Three beats are in. Set the duration. */
function finishLock(op: Op, seat: Seat): void {
  const seconds = Math.min(10.5, 3 + seat.lockGood * 1.5 + seat.lockPerfect * 2.5);
  seat.giftKind = seat.gift === 'second' ? 'pulse' : 'still';
  seat.giftLeft = Math.round(seconds * 60 * op.balance.giftTime);
  seat.lock = -1;
  seat.lastGift = op.tick;
  consult(op, seat);
  op.events.push({ type: 'gift', text: seat.giftKind === 'pulse' ? 'Second Pulse' : 'Stillpoint', seat: seat.id });
}

/** Two gifts inside a second: both last longer. */
function consult(op: Op, seat: Seat): void {
  for (const other of op.seats) {
    if (other.id === seat.id || other.lastGift < 0) continue;
    if (Math.abs(other.lastGift - seat.lastGift) <= 60 && other.giftLeft > 0) {
      other.giftLeft = Math.round(other.giftLeft * 1.5);
      seat.giftLeft = Math.round(seat.giftLeft * 1.5);
      op.events.push({ type: 'consult', text: 'CONSULT!' });
    }
  }
}

/** Count a missed beat so a lock cannot sit forever. */
function tickLocks(op: Op): void {
  for (const seat of op.seats) {
    if (seat.lock < 0) continue;
    if (op.tick > seat.lockBeat + 12) {
      seat.lock += 1;
      seat.lockBeat = op.tick + 40;
      if (seat.lock >= 3) finishLock(op, seat);
    }
  }
}

/** Both paddles. Inside the green band, the Code lands. */
function pressPaddle(op: Op, seat: Seat): void {
  if (!op.code) return;
  if (!codeBand(op)) {
    op.code.tries -= 1;
    op.code.shocks += 1;
    op.events.push({ type: 'shock', text: 'Miss.', seat: seat.id });
    if (op.code.tries <= 0) {
      op.code = null;
      failOp(op, 'The line stays flat.');
    }
    return;
  }
  const patient = op.patients[op.code.patient];
  if (patient) {
    patient.vitals = Math.max(patient.vitals, 25);
    patient.alive = true;
  }
  op.code = null;
  op.codeCleared = true;
  op.events.push({ type: 'shock', text: 'Got them.', seat: seat.id });
}

/** The charge ring is green for a generous slice of each beat-and-a-half. */
export function codeBand(op: Op): boolean {
  const at = op.tick % 90;
  return at >= 28 && at < 62;
}

/** Bleeds, parasite auras, numb patches, then the flatline check. */
export function stepVitals(op: Op, ft: number): void {
  const seconds = ft / FIELD_SECOND;
  const scale = op.balance.vitalsDrain;
  const diff = op.difficulty === 'intern' ? 0.6 : op.difficulty === 'attending' ? 1.3 : 1;
  for (const patient of op.patients) {
    if (!patient.alive) continue;
    const shielded = op.seats.some((seat) => seat.giftKind === 'pulse' && seat.giftLeft > 0);
    let drain = 0;
    for (const target of op.targets) {
      if (target.done || target.patient !== patient.id) continue;
      if (target.kind === 'pool' && target.volume > 0) drain += target.bleed * op.balance.bleed;
      if (target.kind === 'wound' && target.bleeding) drain += (target.deep ? 1.2 : target.bleed) * op.balance.bleed;
      if (target.kind === 'lull' || target.kind === 'matron') drain += 0.6;
      if (target.kind === 'numb') drain += 0.2;
      if (target.kind === 'balmCell') drain += 0.01;
      if (target.kind === 'bleeder') drain += target.bleed;
    }
    if (!shielded && !op.holdVitals) patient.vitals -= drain * seconds * scale * diff;
    if (op.attract) patient.vitals = Math.max(30, patient.vitals);
    patient.vitals = Math.min(100, patient.vitals);
    if (patient.vitals <= 0) flatline(op, patient.id);
  }
}

/** Vitals hit zero. */
function flatline(op: Op, patientId: number): void {
  const patient = op.patients[patientId];
  patient.vitals = 0;
  if (op.code) return;
  if (!op.codeAllowed || (patient.coded && op.id !== 'case:mercy')) {
    patient.alive = false;
    failOp(op, `${patient.name} is gone.`);
    return;
  }
  patient.coded = op.id !== 'case:mercy';
  op.code = { left: 8 * FIELD_SECOND, tries: 2, patient: patientId, free: op.id === 'case:mercy', shocks: 0 };
  op.events.push({ type: 'code', text: 'Paddles.' });
}

/** Gifts, the Code timer, the clock, and the phase. */
export function stepBody(op: Op, ft: number): void {
  tickLocks(op);
  for (const seat of op.seats) if (seat.giftLeft > 0 && seat.lock < 0) seat.giftLeft -= 1;
  if (op.code) {
    op.code.left -= ft;
    if (op.code.left <= 0) {
      op.code = null;
      failOp(op, 'The line stays flat.');
    }
  }
  if (!op.attract && !op.holdClock) op.clock -= ft / Math.max(0.4, op.balance.clock);
  if (op.clock <= 0 && op.status === 'playing') {
    op.clock = 0;
    failOp(op, 'Time.');
  }
  stepColleague(op);
  advance(op);
}

/** The AI colleague drains and holds flaps. It never takes the lead's hands. */
function stepColleague(op: Op): void {
  op.helper = '';
  if (!op.colleague || op.seats.length > 1 || op.status !== 'playing') return;
  const pool = op.targets.find((target) => target.kind === 'pool' && !target.done && target.volume > 0);
  if (pool) {
    pool.volume = Math.max(0, pool.volume - 0.35 / 60);
    op.helper = 'drain';
    if (pool.volume <= 0) pool.done = true;
  }
  const flap = op.targets.find((target) => target.kind === 'flap' && !target.done);
  if (flap && op.targets.some((target) => target.under === flap.id && !target.done)) {
    flap.lift = 1;
    flap.clipped = 8 * FIELD_SECOND;
    flap.done = true;
    op.helper = 'flap';
  }
}

/** Leave a finished phase. An empty clear-phase does not loop forever. */
function advance(op: Op): void {
  if (op.status !== 'playing') return;
  let guard = 0;
  while (phaseDone(op) && guard < 6) {
    guard += 1;
    const seat = op.seats[0];
    award(op, seat, 'CLEAN', POINTS.phase, op.phases[op.phase]?.id ?? 'Phase');
    op.phase += 1;
    if (op.phase >= op.phases.length) {
      winOp(op);
      return;
    }
    enterPhase(op);
  }
}

/** Whether the current phase's condition is met. */
function phaseDone(op: Op): boolean {
  const phase = op.phases[op.phase];
  if (!phase || op.status !== 'playing') return false;
  if (phase.until === 'injected') return op.injected;
  if (phase.until === 'code') return op.codeCleared;
  return op.targets.every((target) => target.phase !== op.phase || target.done || target.optional);
}

/** Pools on sites nobody is touching slowly deepen, so leaving hurts. */
export function growAway(op: Op, ft: number): void {
  const seconds = ft / FIELD_SECOND;
  for (const target of op.targets) {
    if (target.done || target.kind !== 'pool') continue;
    if (op.seats.some((seat) => seat.site === target.site)) continue;
    target.volume = Math.min(target.volumeMax + 2, target.volume + 0.18 * seconds);
  }
}

/** A seat the tests can poke. */
export function seatOf(op: Op, id = 0): Seat {
  return op.seats[id];
}

/** Heal hook used by Second Pulse tests through award. Re-export path stays in ratings. */
export function touchHeal(op: Op, seat: Seat, amount: number): void {
  heal(op, seat, amount);
}

/** Spawn helper for a strain that births a lull, a mote, or a tendril. */
export function birth(
  op: Op,
  kind: 'lull' | 'numb' | 'binder' | 'mote' | 'wound' | 'guide' | 'tendril',
  x: number,
  z: number,
  phase: number,
  extra: Partial<Spawn> = {},
): void {
  addTarget(op, { ...extra, kind, x, z, site: extra.site ?? 0, patient: extra.patient ?? 0 }, phase);
}
