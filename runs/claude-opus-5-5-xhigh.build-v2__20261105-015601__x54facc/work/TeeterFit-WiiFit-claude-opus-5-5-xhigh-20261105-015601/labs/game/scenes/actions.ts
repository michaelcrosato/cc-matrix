/**
 * @file The scene actions the page calls for every menu pick (recorded in replays): `game.begin` hands the sim the save,
 * `game.start` starts an activity, `game.leave` leaves one, `game.sleep` ends the day, and the dev jumps.
 *
 * Game code, sim-side.
 *
 * @example
 * // inspector.actions.run('game.start', { event: 'pond' });
 */
import { placeActor } from '../../../engine/sim-api';
import { guestBody, guestBuild } from '../cast/roster';
import type { GameWorld } from './components';
import { STATIONS } from './data/stations';
import { wobbleAge } from './scoring';
import { applyDay, sleepNow } from './days';
import { castOf, enter, releaseAll } from './events/kit';
import { activityOf, endActivity, flowOf, groundAt, leaveActivity, startActivity, type SeatUse } from './flow';
import { leaveResults } from './ending';
import { respawnGuest, syncCairn, syncFinds } from './world';
import { activitySeats } from './use';
import { startFinale, startGroup } from './start';

/** What `game.begin` hands the sim from the save. */
export interface BeginArgs {
  day?: number;
  done?: string[];
  seen?: string[];
  pebbles?: number;
  found?: number[];
  ages?: number[];
  bests?: Record<string, number>;
  look?: number;
  color?: string;
  band?: boolean;
  /** Start in roam mode at the plaza (false: stays on the front end). */
  roam?: boolean;
}

/** The actions. */
export const ISLAND_ACTIONS = {
  'game.begin': (w: GameWorld, args: unknown) => {
    const a = (args ?? {}) as BeginArgs;
    const flow = flowOf(w);
    endActivity(w);
    Object.assign(flow, {
      day: a.day ?? 1,
      done: [...(a.done ?? [])],
      seen: [...(a.seen ?? [])],
      pebbles: a.pebbles ?? 0,
      found: [...(a.found ?? [])],
      ages: [...(a.ages ?? [])],
      bests: { ...(a.bests ?? {}) },
      look: a.look ?? 0,
      color: a.color ?? 'coral',
      mode: a.roam === false ? 'front' : 'roam',
      attract: false,
      credits: false,
    });
    respawnGuest(w, guestBody(flow.look, flow.color, a.band ?? false), guestBuild(flow.look));
    applyDay(w);
    syncCairn(w, true);
    syncFinds(w);
  },
  'game.start': (w: GameWorld, args: unknown) => {
    const { event, short } = (args ?? {}) as { event: string; short?: boolean };
    if (event === 'group') startGroup(w);
    else if (event === 'tilt') startFinale(w);
    else startActivity(w, event, { ...activitySeats(event), short: short ?? false });
  },
  'game.leave': (w: GameWorld) => {
    const flow = flowOf(w);
    if (flow.mode === 'results') leaveResults(w);
    else if (activityOf(w)) leaveActivity(w);
    syncCairn(w);
  },
  'game.again': (w: GameWorld) => {
    const flow = flowOf(w);
    const event = flow.event;
    if (event === 'group') startGroup(w);
    else if (event === 'tilt') startFinale(w);
    else startActivity(w, event, activitySeats(event));
  },
  'game.sleep': (w: GameWorld) => sleepNow(w),
  'game.go': (w: GameWorld, args: unknown) => {
    const { station } = (args ?? {}) as { station: string };
    const s = STATIONS[station];
    const guest = castOf(w, 'guest');
    if (s && guest)
      placeActor(w, guest.id, [s.x, station === 'pier' ? s.y : groundAt(w, s.x, s.z + 3), s.z + 3], s.yaw);
  },
  'game.credits': (w: GameWorld, args: unknown) => {
    const { on } = (args ?? {}) as { on: boolean };
    flowOf(w).credits = on;
    if (!on) releaseAll({ w });
  },
  'game.dress': (w: GameWorld, args: unknown) => {
    const { color, band } = (args ?? {}) as { color: string; band: boolean };
    const flow = flowOf(w);
    flow.color = color;
    respawnGuest(w, guestBody(flow.look, color, band), guestBuild(flow.look));
  },
  'game.markDone': (w: GameWorld, args: unknown) => {
    const { id } = (args ?? {}) as { id: string };
    const flow = flowOf(w);
    if (!flow.done.includes(id)) flow.done.push(id);
  },
  'game.group': (w: GameWorld, args: unknown) => {
    const { seats } = (args ?? {}) as { seats: SeatUse[] };
    startGroup(w, seats);
  },
  'game.unlock': (w: GameWorld) => {
    const flow = flowOf(w);
    flow.seen = [
      'morning',
      'poseA',
      'poseB',
      'poseC',
      'pond',
      'reps',
      'garden',
      'paddle',
      'line',
      'step',
      'hoop',
      'plunge',
      'jog',
      'group',
      'tilt',
    ];
    flow.pebbles = Math.max(flow.pebbles, 40);
    syncCairn(w);
  },
  'game.front': (w: GameWorld) => {
    const flow = flowOf(w);
    endActivity(w);
    flow.mode = 'front';
  },
  /** Finish the running activity at a chosen score (dev mode). */
  'game.finish': (w: GameWorld, args: unknown) => {
    const { score } = (args ?? {}) as { score?: number };
    const entity = activityOf(w);
    if (!entity) return;
    entity.activity.data.forced = score ?? 750;
    if (entity.activity.id === 'morning')
      entity.activity.data.age = wobbleAge((score ?? 750) / 1000, w.settings.get<number>('game.age.k'));
    entity.activity.done = true;
  },
  /** Jump to a day (dev mode). */
  'game.day': (w: GameWorld, args: unknown) => {
    const { day } = (args ?? {}) as { day: number };
    const flow = flowOf(w);
    endActivity(w);
    flow.day = day;
    flow.done = [];
    flow.mode = 'roam';
    applyDay(w);
  },
  /** Jump to a finale step (dev mode). */
  'game.tiltStep': (w: GameWorld, args: unknown) => {
    const { phase } = (args ?? {}) as { phase: string };
    const flow = flowOf(w);
    if (flow.event !== 'tilt' || flow.mode !== 'event') startFinale(w);
    const entity = activityOf(w);
    if (!entity) return;
    const c = { w, a: entity.activity } as never;
    enter(c, phase);
    entity.activity.data.jumped = true;
  },
  /** Give pebbles (dev mode). */
  'game.give': (w: GameWorld, args: unknown) => {
    const { pebbles } = (args ?? {}) as { pebbles: number };
    flowOf(w).pebbles += pebbles;
    syncCairn(w);
  },
  'game.attract': (w: GameWorld, args: unknown) => {
    const { on } = (args ?? {}) as { on: boolean };
    const flow = flowOf(w);
    flow.attract = on;
    flow.roster = 0;
    flow.actTick = 0;
    if (!on) {
      endActivity(w);
      flow.mode = 'front';
    }
  },
};
