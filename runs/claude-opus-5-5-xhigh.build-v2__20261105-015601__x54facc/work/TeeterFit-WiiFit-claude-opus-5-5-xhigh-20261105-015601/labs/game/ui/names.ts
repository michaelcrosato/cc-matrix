/**
 * @file The session's name labels: each other player's name from the hub, over their mat, as text and never as HTML.
 *
 * Game code, a page's.
 *
 * @example
 * // nameLabels(engine, session);
 */
import type { Engine } from '../../../engine';
import type { Session } from '../hub/session';
import { FLAT_Y, MAT_OFFSETS, STATIONS } from '../scenes/data/stations';

/** Puts a label over each other player's mat. */
export function nameLabels(engine: Engine, session: Session): void {
  const { x, z } = STATIONS.pavilion;
  for (const player of session.info.players) {
    const [ox, oz] = MAT_OFFSETS[player.id] ?? [0, 0];
    engine.ui?.label(player.name, { id: `name:${player.id}`, at: [x + ox, FLAT_Y + 2.3, z + oz], color: player.color });
  }
}
