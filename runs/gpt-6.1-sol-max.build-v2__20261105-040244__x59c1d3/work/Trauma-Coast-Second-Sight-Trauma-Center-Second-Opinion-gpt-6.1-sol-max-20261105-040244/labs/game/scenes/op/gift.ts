/** @file Beat-timed Gifts, cooperative Consult and life-saving charge-ring shocks. */
import type { Operation, Rules, Seat } from '../../data/types';
import { event, fail } from './state';
export const heartRate = (s: Operation): number => Math.round(64 + (100 - Math.min(...s.patients)) * 0.65);
export const beatPeriod = (s: Operation): number => 3600 / heartRate(s);
export function activate(s: Operation, rules: Rules, seat: Seat, seconds: number): void {
  seat.pulseAt = 0;
  seat.giftUntil = s.tick + Math.round(seconds * 60);
  seat.giftStarted = s.tick;
  if (!rules.infiniteGift && !rules.attract) seat.gift = Math.max(0, seat.gift - 1);
  event(s, 'gift', seat.giftKind === 'pulse' ? 'SECOND PULSE' : 'STILLPOINT', seat.x, seat.z, seat.id);
  const partner = s.seats.find((p) => p.id !== seat.id && p.giftUntil > s.tick && s.tick - p.giftStarted < 60);
  if (partner) {
    seat.giftUntil += Math.round(seconds * 30);
    partner.giftUntil += Math.round((partner.giftUntil - partner.giftStarted) * 0.5);
    s.consultUntil = s.tick + 120;
    event(s, 'drama', 'CONSULT!');
  }
}
export function pressGift(s: Operation, rules: Rules, seat: Seat, sampledTick = s.tick): void {
  if (seat.giftKind === 'none' || seat.giftUntil > s.tick) return;
  if (!seat.pulseAt) {
    if (seat.gift < 1 && !rules.attract && !rules.infiniteGift) {
      event(s, 'say', 'One Gift per case, Doctor.');
      return;
    }
    if (rules.simpleGift) {
      activate(s, rules, seat, 6);
      return;
    }
    seat.pulseAt = s.tick + 1;
    seat.beats = 0;
    seat.lastBeat = Math.round(sampledTick / beatPeriod(s));
    seat.perfect = 0;
    seat.good = 0;
    event(s, 'pulse', 'Listen. Match the next three heartbeats.');
    return;
  }
  const period = beatPeriod(s),
    d = Math.abs((((sampledTick % period) + period / 2) % period) - period / 2);
  const peak = Math.round(sampledTick / period);
  if (d <= 8.4 && seat.beats < 3 && peak > seat.lastBeat) {
    seat.lastBeat = peak;
    seat.beats++;
    if (d <= 4.2) seat.perfect++;
    else seat.good++;
    event(s, 'beat', d <= 4.2 ? 'PERFECT' : 'GOOD');
    if (seat.beats === 3)
      activate(s, rules, seat, rules.balance.giftBase + seat.perfect * 2.5 + seat.good * rules.balance.giftPerBeat);
  }
}
export function updateGift(s: Operation, rules: Rules): void {
  for (const seat of s.seats)
    if (seat.pulseAt && s.tick - seat.pulseAt > beatPeriod(s) * 4)
      activate(s, rules, seat, rules.balance.giftBase + seat.perfect * 2.5 + seat.good * rules.balance.giftPerBeat);
}
export const shockLevel = (s: Operation, tick = s.tick): number => (tick % 150) / 150;
export function shock(s: Operation, seatId = 0, sampledTick = s.tick): void {
  const code = s.code;
  if (!code) return;
  const value = shockLevel(s, sampledTick);
  if (value >= 0.65 && value <= 0.86) {
    if (code.needsAll) {
      code.shockSeats ??= [];
      if (!code.shockSeats.includes(seatId)) code.shockSeats.push(seatId);
      if (code.shockSeats.length < s.seats.filter((p) => p.active).length) {
        event(s, 'say', 'Paddles ready. Waiting for every surgeon.');
        return;
      }
    }
    s.patients[code.patient] = 25;
    s.codes[code.patient]++;
    s.code = null;
    for (const p of s.seats) {
      p.charge = 0;
      p.held = false;
    }
    event(s, 'shock', 'SINUS RHYTHM. Welcome back.');
  } else {
    code.tries++;
    event(s, 'say', 'Not yet. Charge it. Watch the green band.');
    if (code.tries >= 2) fail(s, 'Two shocks. No rhythm.');
  }
}
