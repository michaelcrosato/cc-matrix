/**
 * @file The live operation for the one running scene. The page reads it; the scene writes it. A JSON snapshot on the
 * chart component is what capture and restore put back, so the object here is replaced when the snapshot disagrees.
 */
import { enterPhase } from '../op/world';
import { createFromCase } from '../op/world';
import type { Difficulty, Op } from '../op/types';

/** The operation the scene is stepping, or null on a title or a story run. */
let live: Op | null = null;

/** The operation, if this run has one. */
export function liveOp(): Op | null {
  return live;
}

/** Replace the live operation. Capture and restore call this with the parsed snapshot. */
export function adoptOp(op: Op | null): void {
  live = op;
}

/**
 * Make the live operation the chart's snapshot. Call this after a restore and before reading cursors: the module
 * copy is not part of the world capture, and the chart is.
 */
export function followChart(blob: string): void {
  if (!blob) {
    live = null;
    return;
  }
  if (live && snapshot(live) === blob) return;
  live = parseSnapshot(blob);
}

/** Advance to phase `index` by clearing the phases before it. Phase 0 is already open. */
export function jumpPhase(op: Op, index: number): void {
  const goal = Math.max(0, Math.min(index, Math.max(0, op.phases.length - 1)));
  while (op.phase < goal) {
    for (const target of op.targets) if (target.phase === op.phase) target.done = true;
    op.phase += 1;
    enterPhase(op);
  }
}

/** Options a run starts with. */
export interface RunOpts {
  difficulty: Difficulty;
  seed: number;
  seats: number;
  attract: boolean;
  simple: boolean;
  colleague: boolean;
  phase: number;
}

/** Start `op:…`, or clear the live operation for any other run. */
export function openRun(run: string, opts: RunOpts): Op | null {
  if (!run.startsWith('op:')) {
    live = null;
    return null;
  }
  const raw = run.slice(3);
  const id = raw.startsWith('case:') ? raw : `case:${raw}`;
  const op = createFromCase(id, {
    difficulty: opts.difficulty,
    seed: opts.seed,
    seats: opts.seats,
    attract: opts.attract,
    simple: opts.simple,
    colleague: opts.colleague ? true : undefined,
  });
  if (opts.phase > 0) jumpPhase(op, opts.phase);
  live = op;
  return op;
}

/** The snapshot the chart stores. */
export function snapshot(op: Op): string {
  return JSON.stringify(op);
}

/** An operation from a chart snapshot. */
export function parseSnapshot(text: string): Op {
  return JSON.parse(text) as Op;
}
