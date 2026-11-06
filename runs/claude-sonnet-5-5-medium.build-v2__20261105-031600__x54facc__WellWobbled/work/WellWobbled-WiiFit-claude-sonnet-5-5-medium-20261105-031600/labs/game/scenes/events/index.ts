/**
 * @file The activity registry: every activity module by id. Add a row here to add an activity.
 * @example
 * ACTIVITIES.morning.title; // 'Morning Check'
 */
import { morning } from './morning';
import { poseA, poseB, poseC, poseH } from './pose';
import { ring } from './ring';
import { cliff } from './cliff';
import { garden } from './garden';
import { hoop } from './hoop';
import { jog } from './jog';
import { line } from './line';
import { paddle } from './paddle';
import { pond } from './pond';
import { reps } from './reps';
import { tilt } from './tilt';
import { stepClass } from './step';
import type { Activity } from './types';

export const ACTIVITIES: Record<string, Activity> = {
  morning,
  poseA,
  poseB,
  poseC,
  poseH,
  ring,
  pond,
  step: stepClass,
  reps,
  line,
  paddle,
  garden,
  cliff,
  hoop,
  jog,
  tilt,
};
