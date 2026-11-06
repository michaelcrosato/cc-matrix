/**
 * @file The activity table: every module, by id. A new activity is a new module and a new row here.
 *
 * Game code, sim-side.
 *
 * @example
 * ACTIVITIES.pond.title; // 'Still Pond'
 */
import { garden } from './garden';
import { group, setGroupTable } from './group';
import { hoop } from './hoop';
import { jog } from './jog';
import { tilt } from './tilt';
import { paddle } from './paddle';
import { plunge } from './plunge';
import { line } from './line';
import { reps } from './reps';
import { step } from './step';
import { morning } from './morning';
import { makePoseClass } from './pose';
import { pond } from './pond';
import { ring } from './ring';
import type { Activity } from './types';

/** The activities, by id. */
export const ACTIVITIES: Record<string, Activity> = {
  morning,
  poseA: makePoseClass('poseA', 'Pose Class'),
  poseB: makePoseClass('poseB', 'Pose Class'),
  poseC: makePoseClass('poseC', 'Pose Class'),
  heron: makePoseClass('heron', 'The Heron'),
  pond,
  ring,
  group,
  reps,
  step,
  line,
  paddle,
  garden,
  plunge,
  hoop,
  jog,
  tilt,
};

setGroupTable(ACTIVITIES);
