/**
 * @file Every activity by id. Adding an activity is a module and a row here (and rows in days.ts and the line files).
 */
import type { Activity } from './kit';
import { CHECK, RING_CLASS } from './ring';
import { POSE_ACTIVITIES } from './pose';
import { POND, POND_SHORT } from './pond';
import { REPS } from './reps';
import { STEP, STEP_SHORT } from './step';
import { HOOP, HOOP_SHORT } from './hoop';
import { LINE } from './line';
import { PADDLE } from './paddle';
import { GARDEN } from './garden';
import { PLUNGE } from './plunge';
import { JOG } from './jog';
import { TILT } from './tilt';

const LIST: readonly Activity[] = [CHECK, RING_CLASS, ...POSE_ACTIVITIES, POND, POND_SHORT, REPS, STEP, STEP_SHORT, HOOP, HOOP_SHORT, LINE, PADDLE, GARDEN, PLUNGE, JOG, TILT]; // prettier-ignore

export const ACTIVITIES: Readonly<Record<string, Activity>> = Object.fromEntries(LIST.map((a) => [a.id, a]));

/** The activities the balance tests hold to the plan's targets. */
export const PLAYED = [
  'check',
  'poseA',
  'poseB',
  'poseC',
  'pond',
  'reps',
  'step',
  'line',
  'paddle',
  'garden',
  'plunge',
  'hoop',
  'jog',
  'ring',
  'heron',
  'hoopS',
  'stepS',
  'pondS',
] as const;
