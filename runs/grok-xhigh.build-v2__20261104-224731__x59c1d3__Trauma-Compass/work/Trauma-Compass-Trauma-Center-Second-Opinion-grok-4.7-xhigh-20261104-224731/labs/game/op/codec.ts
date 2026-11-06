/**
 * @file Hands as a flat list of numbers, the only shape `game:hands` carries. Ten fields, then the radial flag.
 * Positions are quantised to 1/256 m so a replay of the same gesture is the same list.
 */
import type { Hand } from './types';

/** Numbers per seat in a packed hand list. */
export const HAND_STRIDE = 11;

/** One seat's hands as eleven numbers. */
export function packHand(hand: Hand): number[] {
  return [
    Math.round(hand.x * 256) / 256,
    Math.round(hand.z * 256) / 256,
    hand.tool,
    hand.use ? 1 : 0,
    hand.drop ? 1 : 0,
    hand.gift ? 1 : 0,
    hand.paddle ? 1 : 0,
    hand.site,
    hand.swap ? 1 : 0,
    hand.hint ? 1 : 0,
    hand.radial ? 1 : 0,
  ];
}

/** Every seat, concatenated. */
export function packHands(hands: readonly Hand[]): number[] {
  return hands.flatMap(packHand);
}

/** The list back into hands. A short list returns null so the sim holds still. */
export function unpackHands(raw: unknown, seats: number): Hand[] | null {
  if (!Array.isArray(raw) || raw.length < HAND_STRIDE) return null;
  const hands: Hand[] = [];
  const count = Math.min(seats, Math.floor(raw.length / HAND_STRIDE));
  for (let i = 0; i < count; i++) {
    const at = i * HAND_STRIDE;
    const n = (offset: number): number => {
      const value = raw[at + offset];
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    };
    hands.push({
      x: n(0),
      z: n(1),
      tool: Math.round(n(2)),
      use: n(3) > 0,
      drop: n(4) > 0,
      gift: n(5) > 0,
      paddle: n(6) > 0,
      site: Math.round(n(7)),
      swap: n(8) > 0,
      hint: n(9) > 0,
      radial: n(10) > 0,
    });
  }
  return hands;
}
