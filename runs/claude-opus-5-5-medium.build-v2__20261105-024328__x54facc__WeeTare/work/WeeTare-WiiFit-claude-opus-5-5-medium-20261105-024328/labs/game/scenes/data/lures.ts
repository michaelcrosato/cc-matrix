/**
 * @file Still Pond's lures, in order: each tempts you to press something. The page draws them. A row is an id it knows,
 * and the line said with it, if any.
 */
export interface Lure {
  readonly id: string;
  readonly line?: string;
  readonly who?: string;
}

export const LURES: readonly Lure[] = [
  { id: 'pressNow' },
  { id: 'psst', line: 'pond.lure.psst', who: 'tare' },
  { id: 'phone', line: 'pond.lure.phone', who: 'bex' },
  { id: 'frogKnee', line: 'pond.lure.frog', who: 'tare' },
  { id: 'gullHead', line: 'pond.lure.gull', who: 'tare' },
  { id: 'fakePause' },
  { id: 'disconnect' },
  { id: 'wrong', line: 'pond.lure.wrong', who: 'plumb' },
  { id: 'credits' },
  { id: 'pressNow' },
];
