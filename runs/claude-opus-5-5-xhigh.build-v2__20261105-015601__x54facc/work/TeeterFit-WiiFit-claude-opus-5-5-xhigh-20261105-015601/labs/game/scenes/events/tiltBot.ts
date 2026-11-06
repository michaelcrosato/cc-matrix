/**
 * @file The bot of the Great Tilt: gathers guests with Calm Calls and leads them east, cranks the carts, holds the island.
 *
 * Game code, sim-side.
 *
 * @example
 * // tilt.bot = tiltBot;
 */
import { breathe, holdAt, type Player } from '../bot/players';
import { STATIONS } from '../data/stations';
import { castOf, leanForWorld, steps } from './kit';
import type { Walker } from './tiltWalkers';
import type { Ctx, SeatEntity } from './types';

/** How far a Calm Call reaches, m, and how long it charges, s. */
const CALL_REACH = 8;
const CALL_CHARGE = 2;

/** One seat's input for one step of the finale. */
export function tiltBot(c: Ctx, e: SeatEntity, player: Player): void {
  const d = c.a.data as unknown as { walkers: Walker[] };
  const { seat, wobble } = e;
  seat.act = false;
  seat.fl = seat.fr = 0;
  const guest = castOf(c.w, 'guest');
  const me = guest ? c.w.get(guest.id)?.actor : undefined;
  if (!player.acts || !me) {
    seat.lx = seat.ly = 0;
    return;
  }
  if (c.a.phase === 'east') {
    const { x: tx, z: tz } = STATIONS.eastTerrace;
    const followers = d.walkers.filter((g) => g.following > steps(c, 2) && !g.delivered);
    let goal: [number, number] = [tx, tz];
    if (followers.length === 0) {
      const near = d.walkers
        .filter((g) => !g.delivered)
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      if (near) goal = [near.x, near.z];
      if (near && Math.hypot(near.x - me.x, near.z - me.z) < CALL_REACH - 2) {
        const mem = seat.mem as { hold?: number };
        mem.hold = (mem.hold ?? 0) + 1;
        if (mem.hold < steps(c, CALL_CHARGE) + 3) seat.fl = seat.fr = 1;
        else mem.hold = 0;
      }
    }
    const [dx, dz] = [goal[0] - me.x, goal[1] - me.z];
    const r = Math.hypot(dx, dz) || 1;
    const straggling = followers.some((g) => Math.hypot(g.x - me.x, g.z - me.z) > 5);
    const pace = followers.length > 0 && straggling ? 0.1 : 1;
    const [lx, ly] = leanForWorld((dx / r) * pace, (dz / r) * pace);
    [seat.lx, seat.ly] = [lx, ly];
  } else if (c.a.phase === 'weights') {
    holdAt(c.w, seat, wobble, 0.3, 0, player);
    const cycle = player.name === 'perfect' ? 20 : 36;
    const left = Math.floor(c.a.t / cycle) % 2 === 0;
    const t = c.a.t % cycle;
    seat.fl = left && t < 6 ? 1 : 0;
    seat.fr = !left && t < 6 ? 1 : 0;
  } else if (c.a.phase === 'stone') {
    holdAt(c.w, seat, wobble, 0, 0, player);
    breathe(c.w, seat, wobble, player);
  } else {
    seat.lx = seat.ly = 0;
  }
}
