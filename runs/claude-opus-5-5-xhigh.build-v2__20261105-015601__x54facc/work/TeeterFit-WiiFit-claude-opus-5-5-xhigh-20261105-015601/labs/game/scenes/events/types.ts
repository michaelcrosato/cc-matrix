/**
 * @file The shape every activity shares (PLAN.md section 6): `step` emits sim events; the page turns them into text,
 * sound and HUD. `bot` writes the same seat input a player does: tests, attract mode and dev auto-play use it.
 *
 * Game code, sim-side.
 *
 * @example
 * // const pond: Activity = { id: 'pond', title: 'Still Pond', station: 'pond', map: 'actionMap:balance', ... };
 */
import type { ActivityData, Flow, GameWorld, HudData, Seat, Wobble } from '../components';
import type { Player } from '../bot/players';
import type { Station } from '../data/stations';

/** A seat with its body. */
export interface SeatEntity {
  id: number;
  seat: Seat;
  wobble: Wobble;
}

/** What an activity is handed each call. */
export interface Ctx {
  w: GameWorld;
  a: ActivityData;
  flow: Flow;
  /** The seats in play, seat 0 first. */
  seats: SeatEntity[];
  station: Station;
  /** The ground's height at a place. */
  ground(x: number, z: number): number;
  /** Whether this is the small session scene. */
  round: boolean;
  /** The activity's HUD, to write. */
  hud: HudData;
}

/** An activity. */
export interface Activity {
  id: string;
  title: string;
  /** The station it runs at. */
  station: string;
  /** The action map the page uses for it. */
  map: 'actionMap:balance' | 'actionMap:balanceFree';
  /** The camera shot the page frames it with. */
  shot: string;
  /** Whether the Wobble Model steps each seat (false: the activity reads seats directly). */
  wobble: boolean;
  /** How many seats it wants by default. */
  seats?: number;
  /** Spawns what it needs. */
  setup(c: Ctx): void;
  /** One step of its rules, after the seats and bodies stepped. */
  step(c: Ctx): void;
  /** Removes what setup did not put in the spawned lists. */
  teardown?(c: Ctx): void;
  /** One seat's input for one step, as `player` would press it. */
  bot(c: Ctx, seat: SeatEntity, player: Player): void;
  /** Its score for a seat, once done. */
  score(c: Ctx, index: number): number;
}
