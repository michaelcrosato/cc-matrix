/**
 * @file Keeps attract's bot cheating: nothing it plays can leave the flow in a state that stops the loop. Attract never
 * reads or writes the save, and pays no pebbles.
 */
import { flowOf, type W } from './types';

/** Attract earns nothing: pebbles and ages stay as they were. */
export function flowStepAttractGuard(w: W): void {
  const flow = flowOf(w);
  if (flow.auto) flow.group = null;
}
