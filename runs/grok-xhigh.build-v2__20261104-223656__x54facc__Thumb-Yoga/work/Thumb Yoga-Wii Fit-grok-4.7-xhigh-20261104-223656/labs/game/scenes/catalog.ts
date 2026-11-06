/**
 * @file Every shipped activity, by id. Days and the noticeboard look them up here. There is no second list.
 */
import type { Intents, World } from '../../../engine/sim-api';
import type { Band } from './bot';
import { garden } from './events/garden';
import { group } from './events/group';
import { line } from './events/line';
import { morning } from './events/morning';
import { paddle } from './events/paddle';
import { pond } from './events/pond';
import { poseA, poseClass } from './events/pose';
import { tilt } from './events/tilt';

/** What every activity module hands the driver. */
export interface Activity {
  id: string;
  title: string;
  seconds: number;
  setup(w: World): void;
  step(w: World, intents: Intents): void;
  teardown(w: World): void;
  score(w: World): number;
  bot(w: World, band: Band): Intents;
}

/** The activities a guest can be sent to, in programme order. */
export const ACTIVITIES: readonly Activity[] = [
  morning,
  poseA,
  poseClass('pose-b', 'Pose Class'),
  poseClass('pose-c', 'Pose Class'),
  pond,
  garden,
  paddle,
  line,
  group,
  tilt,
];

/** The activity with this id, or undefined when the id is an evening or the credits. */
export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((item) => item.id === id);
}

/** The activity with this id. Throws when the id is not shipped. */
export function activityById(id: string): Activity {
  const found = findActivity(id);
  if (!found) throw new Error(`no activity ${id}`);
  return found;
}
