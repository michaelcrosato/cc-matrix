/**
 * @file The Great Tilt's twelve guests on foot: they drift downhill politely unless called; Nan walks up on her own and is
 * already there; after the time box those who remain shuffle uphill by themselves. Each one delivered takes off half a degree.
 *
 * Game code, sim-side.
 *
 * @example
 * // stepWalkers(c, data, guestX, guestZ);
 */
import { stepCrowdBody } from '../../../../engine/sim-api';
import { STATIONS } from '../data/stations';
import { castOf, say } from './kit';
import type { Ctx } from './types';

/** The East Terrace's radius, m. */
export const TERRACE = 8;

/** A guest in the finale. */
export interface Walker {
  x: number;
  z: number;
  body: number;
  named: string;
  following: number;
  delivered: boolean;
}

/** Moves the finale's guests a step. They drift downhill politely unless called, and Nan is already there. */
export function stepWalkers(c: Ctx, d: { walkers: Walker[]; delivered: number }, ghx: number, ghz: number): void {
  const isl = c.w.query('island')[0].island;
  const { x: tx, z: tz } = STATIONS.eastTerrace;
  const push = -isl.tiltX * 0.09;
  const lateShuffle = c.a.phase !== 'east';
  d.walkers.forEach((g) => {
    if (g.delivered && !lateShuffle) return;
    let [vx, vz] = [-push, 0.12 * Math.sin(c.a.t * 0.01 + g.x)];
    if (g.named === 'nan' && !g.delivered) {
      // Nan walks up on her own and is already there.
      const [dx, dz] = [tx - g.x, tz - g.z];
      const r = Math.hypot(dx, dz) || 1;
      vx = (dx / r) * 2.2;
      vz = (dz / r) * 2.2;
    } else if (g.following > 0) {
      g.following -= 1;
      const [dx, dz] = [ghx - g.x, ghz - g.z];
      const r = Math.hypot(dx, dz) || 1;
      const speed = r > 2 ? 4.2 : 0.6;
      vx = (dx / r) * speed - push * 0.3;
      vz = (dz / r) * speed;
    } else if (lateShuffle && !g.delivered) {
      const [dx, dz] = [tx - g.x, tz - g.z];
      const r = Math.hypot(dx, dz) || 1;
      vx = (dx / r) * 3;
      vz = (dz / r) * 3;
    } else if (g.delivered) {
      vx = vz = 0;
    }
    g.x = Math.max(-92, Math.min(95, g.x + vx * c.w.dt));
    g.z = Math.max(-80, Math.min(85, g.z + vz * c.w.dt));
    const y = c.ground(g.x, g.z);
    if (g.named) {
      const person = castOf(c.w, g.named);
      if (person) {
        Object.assign(person.cast, { hold: true, x: g.x, y, z: g.z, yaw: Math.atan2(vx, vz) });
        const actor = c.w.get(person.id)?.actor;
        if (actor) actor.intents = {};
      }
    } else {
      const body = c.w.get(g.body)?.crowdBody;
      if (body) stepCrowdBody(c.w, g.body, body, { at: [g.x, y, g.z], velocity: [vx, 0, vz], yaw: Math.atan2(vx, vz) });
    }
    if (!g.delivered && Math.hypot(g.x - tx, g.z - tz) < TERRACE) {
      g.delivered = true;
      d.delivered += 1;
      isl.tiltX = Math.min(-0.5, isl.tiltX + 0.5);
      c.w.emit('guestDelivered', { n: d.delivered, named: g.named });
      if (g.named === 'nan') say(c, 'nan', 'tilt.nan');
    }
  });
}
