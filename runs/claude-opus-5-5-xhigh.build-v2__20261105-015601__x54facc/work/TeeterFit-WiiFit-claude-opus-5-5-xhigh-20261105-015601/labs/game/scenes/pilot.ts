/**
 * @file The pilot (PLAN.md section 14): every character, the Guest included, is `player: false`, and this one system
 * writes `actor.intents` each step: the step's `move` on the island, nothing in an activity, the bot's in attract, the
 * slope added in the finale. It also runs what roam offers: the thing the Guest is looking at, using it, hidden
 * pebbles, staying out of deep water, and the other guests' idle errands.
 *
 * Game code, sim-side.
 *
 * @example
 * // stepPilot(w, intents); // first, each step
 */
import { held, placeActor, pressed, type Intents } from '../../../engine/sim-api';
import type { GameWorld } from './components';
import { USABLES, usableAt } from './data/usables';
import { SEA_Y } from './data/stations';
import { castOf } from './events/kit';
import { flowOf, groundAt, islandOf } from './flow';
import { tiltPushFor } from './tilt';
import { useThing } from './use';

/** How far the thing in view may be, m, and how far off the view's centre, rad. */
const FOCUS_REACH = 7;
const FOCUS_CONE = 0.75;
/** The depth of water a walker turns back at. */
const DEEP = 0.5;

/** The world-space move of the Guest this step, by whoever drives it. */
function guestMove(w: GameWorld, intents: Intents): readonly [number, number] {
  const move = intents.move;
  return move ? [move[0], move[1]] : [0, 0];
}

/** Picks the usable thing nearest the view's centre, within reach. */
function findFocus(w: GameWorld, x: number, z: number, cam: number): number {
  let best = -1;
  let bestScore = Infinity;
  USABLES.forEach((_u, i) => {
    const at = usableAt(w, i);
    if (!at) return;
    const [dx, dz] = [at[0] - x, at[1] - z];
    const d = Math.hypot(dx, dz);
    if (d > FOCUS_REACH) return;
    let off = Math.atan2(dx, dz) - cam;
    off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > 1.8 && Math.abs(off) > FOCUS_CONE) return;
    const score = d + 3 * Math.abs(off);
    if (score < bestScore) [best, bestScore] = [i, score];
  });
  return best;
}

/** One step of the people's feet. */
export function stepPilot(w: GameWorld, intents: Intents): void {
  const flow = flowOf(w);
  const guest = castOf(w, 'guest');
  const actorEntity = guest ? w.get(guest.id) : undefined;
  const actor = actorEntity?.actor;
  if (!actor || !guest) return;
  const roaming = flow.mode === 'roam';
  if (roaming && !guest.cast.hold) {
    const move = flow.attract || w.settings.get<boolean>('game.auto') ? ([0, 0] as const) : guestMove(w, intents);
    const slow = held(intents, 'walk') ? 0.45 : 1;
    const [px, pz] = tiltPushFor(w, actor.x, actor.z);
    actor.intents = { move: [move[0] * slow + px, move[1] * slow + pz], b: held(intents, 'jump') ? ['jump'] : [] };
    const cam = typeof intents.cam === 'number' ? intents.cam : 0;
    flow.focus = findFocus(w, actor.x, actor.z, cam);
    if (pressed(intents, 'use') && flow.focus >= 0) useThing(w, flow.focus);
    if (pressed(intents, 'wave')) w.emit('wave', { day: flow.day });
    guest.cast.pose = held(intents, 'wave') ? '~Greeting' : flow.resting > 0 ? '~Meditate' : '';
    // Keep walkers out of deep water.
    const under = groundAt(w, actor.x, actor.z);
    const onDeck = actor.y > SEA_Y + 0.8 && under < actor.y - 0.6;
    if ((!onDeck && under < SEA_Y - DEEP) || Math.hypot(actor.x, actor.z) > 118) {
      const r = Math.hypot(actor.x, actor.z) || 1;
      const pull = 0.5;
      const [nx, nz] = [actor.x - (actor.x / r) * pull, actor.z - (actor.z / r) * pull];
      placeActor(w, guest.id, [nx, groundAt(w, nx, nz), nz], actor.yaw);
    }
  } else if (roaming && flow.resting > 0) {
    // Sat on a bench, with the view: moving or using gets you up.
    const move = guestMove(w, intents);
    flow.resting += 1;
    if (Math.hypot(move[0], move[1]) > 0.1 || pressed(intents, 'use') || pressed(intents, 'jump')) {
      flow.resting = 0;
      Object.assign(guest.cast, { hold: false, pose: '' });
    }
  } else if (!guest.cast.hold) {
    actor.intents = {};
  }
  stepHelpers(w);
  const isl = islandOf(w);
  isl.seaX += 0.15 * w.dt;
  isl.seaZ += 0.08 * w.dt;
}

/** Where a helper wants to be, when not held. */
function stepHelpers(w: GameWorld): void {
  const flow = flowOf(w);
  const guest = castOf(w, 'guest');
  const guestActor = guest ? w.get(guest.id)?.actor : undefined;
  for (const e of w.query('cast', 'actor')) {
    const c = e.cast;
    if (c.who === 'guest' || c.hold) continue;
    if (flow.mode === 'event' && c.who !== 'tare') {
      e.actor.intents = {}; // the activity owns them; an activity that walks them writes after this
      continue;
    }
    let [gx, gz] = [c.home[0], c.home[1]];
    if (c.who === 'tare' && guestActor && flow.mode === 'roam') [gx, gz] = [guestActor.x + 1.6, guestActor.z + 1.3];
    const [dx, dz] = [gx - e.actor.x, gz - e.actor.z];
    const d = Math.hypot(dx, dz);
    const stop = c.who === 'tare' ? 1.2 : 0.5;
    const far = d > stop;
    if (d > 40 && flow.mode === 'roam') placeActor(w, e.id, [gx, groundAt(w, gx, gz), gz], e.actor.yaw);
    const tare = c.who === 'tare';
    const hop = tare && far && w.tick % 42 === 0;
    e.actor.intents = far ? { move: [dx / d, dz / d], b: hop ? ['jump'] : [] } : {};
    if (!far && c.pose === '' && c.who === 'nan') c.pose = 'Stoop';
    if (c.pose === 'Stoop') c.poseT = 1;
    if (!far && c.who === 'bex' && c.pose === '') c.pose = 'PhoneStare';
    if (c.pose === 'PhoneStare') c.poseT = 1;
    if (!far && c.who === 'plumb' && c.pose === '') c.pose = 'Upright';
    if (c.pose === 'Upright') c.poseT = 1;
  }
}

/** Every usable, for the page's prompts. */
export const usableList = USABLES;
