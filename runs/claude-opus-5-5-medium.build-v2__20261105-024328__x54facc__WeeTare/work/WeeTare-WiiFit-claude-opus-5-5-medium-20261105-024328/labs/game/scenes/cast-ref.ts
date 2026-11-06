/**
 * @file Who stands where, by id: the component `cast` (one entity) names the actors and crowd bodies a scene has, so
 * activities reach Plumb or Gerald without a search. Absent people are −1: a session's small scene has fewer.
 */
import { defineComponent } from '../../../engine/sim-api';
import type { W } from './types';

export interface Cast {
  plumb: number;
  tare: number;
  gerald: number;
  bex: number;
  nan: number;
  guest: number;
  gull: number;
  frog: number;
  extras: number[];
}

export const CAST = defineComponent('cast', {
  description: 'The ids of the scene’s people and critters.',
  fields: {
    plumb: { type: 'integer', default: -1, description: 'Instructor Plumb.' },
    tare: { type: 'integer', default: -1, description: 'Tare.' },
    gerald: { type: 'integer', default: -1, description: 'Gerald.' },
    bex: { type: 'integer', default: -1, description: 'Bex.' },
    nan: { type: 'integer', default: -1, description: 'Old Nan.' },
    guest: { type: 'integer', default: -1, description: 'You.' },
    gull: { type: 'integer', default: -1, description: 'The Gull.' },
    frog: { type: 'integer', default: -1, description: 'The Frog.' },
    extras: { type: 'array', default: [], description: 'Other guests.' },
  },
});

export const castOf = (w: W): Cast => (w.query('cast' as never)[0] as unknown as { cast: Cast }).cast;
