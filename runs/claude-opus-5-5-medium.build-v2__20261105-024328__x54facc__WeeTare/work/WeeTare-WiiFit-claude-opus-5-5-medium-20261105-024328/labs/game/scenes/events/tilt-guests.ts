/**
 * @file The Great Tilt's guests: drifting downhill politely, following a Calm Call, arriving on the East Terrace. Gerald, Bex and Nan
 * are actors; the rest are crowd bodies, stepped in the phase `anim`. All are carried along, so none can stick.
 */
import { stepCrowdBody } from '../../../../engine/sim-api';
import { castOf } from '../cast-ref';
import { STATIONS } from '../data/stations';
import { cue, islandOf, say, type C, type EvState, type W } from '../types';
import { clamp, groundAt, standAt } from './kit';

const DELIVER_R = 11;

/** A guest in the storm. */
export interface Drifter {
  body: number;
  named: boolean;
  x: number;
  z: number;
  follow: boolean;
  home: boolean;
  nan: boolean;
}

interface Guests {
  guests: Drifter[];
  delivered: number;
}
type ActorOf = { actor: C['actor'] & { intents: Record<string, unknown> } };

/** The slope's downhill push, m/s, for the current tilt. */
export function slopePush(tiltDeg: number): number {
  return Math.sin((Math.abs(tiltDeg) * Math.PI) / 180) * 12;
}

/** Moves the crowd bodies each step (their rigs step in `anim`). */
export function stepDrifters(w: W, d: Pick<Guests, 'guests' | 'delivered'>): void {
  const island = islandOf(w);
  const push = slopePush(island.tiltX);
  const gx = (w.get(castOf(w).guest) as unknown as ActorOf).actor;
  for (const g of d.guests) {
    if (g.home) continue;
    let vx = -push * 0.5;
    let vz = Math.sin(w.tick * 0.013 + g.body) * 0.25;
    if (g.follow) {
      const [dx, dz] = [gx.x - 1.5 - g.x, gx.z - g.z];
      const len = Math.hypot(dx, dz);
      if (len > 2.5) {
        vx += (dx / len) * 4.6;
        vz += (dz / len) * 4.6;
      } else vx *= 0.1;
    }
    if (g.nan) [vx, vz] = [(STATIONS.east.x - g.x) * 0.02, (STATIONS.east.z - g.z) * 0.02];
    g.x = clamp(g.x + vx / 60, -82, 90);
    g.z = clamp(g.z + vz / 60, -60, 70);
    if (Math.hypot(g.x - STATIONS.east.x, g.z - STATIONS.east.z) < DELIVER_R) {
      g.home = true;
      g.follow = false;
      if (!g.nan) {
        d.delivered += 1;
        island.tiltX = Math.max(1, island.tiltX - 0.5);
        cue(w, 'ding', { n: d.delivered });
        say(w, `tilt.delivered.${(d.delivered % 4) + 1}`, 'plumb');
      }
    }
  }
}

/** Draws the guests where they are. Named people are actors; the rest are crowd bodies, stepped by the system below. */
export function drawDrifters(w: W, d: Pick<Guests, 'guests'>): void {
  for (const g of d.guests) {
    if (g.named) standAt(w, g.body, g.x, g.z, Math.PI / 2);
  }
}

/** The system that steps the crowd humanoids in `anim`, as the engine asks. */
export function stepTiltCrowd(w: W): void {
  const ev = (w.query('flow')[0] as unknown as { flow: { ev: EvState | null } }).flow.ev;
  if (!ev || ev.id !== 'tilt') return;
  const d = ev.d as unknown as Pick<Guests, 'guests'>;
  for (const g of d.guests ?? []) {
    if (g.named) continue;
    const entity = w.get(g.body) as unknown as { id: number; crowdBody: never } | undefined;
    if (!entity) continue;
    stepCrowdBody(w as never, g.body, entity.crowdBody, {
      at: [g.x, groundAt(w, g.x, g.z), g.z],
      velocity: [0, 0, 0],
      yaw: Math.PI / 2,
    } as never);
  }
}
