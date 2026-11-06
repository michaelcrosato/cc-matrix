/** @file Hashed flow data and component declarations, shared by the scene and its read-only page. */
import {
  defineComponent,
  type ActorComponent,
  type ClipsData,
  type ScenePropComponent,
  type World,
} from '../../../engine/sim-api';
import type { ActivityRun } from './events/types';
import type { Wobble } from './wobble';
export type Progress = {
  day: number;
  done: string[];
  ages: number[];
  pebbles: number;
  finds: number[];
  bests: Record<string, number>;
  complete: boolean;
  endingSeen: boolean;
  look: number;
  colour: number;
  headband: boolean;
};
export const freshProgress = (): Progress => ({
  day: 1,
  done: [],
  ages: [],
  pebbles: 0,
  finds: [],
  bests: {},
  complete: false,
  endingSeen: false,
  look: 0,
  colour: 0,
  headband: false,
});
export type Flow = Progress & {
  mode: string;
  event: ActivityRun;
  wobble: Wobble;
  hero: number;
  plumb: number;
  others: number[];
  tare: number;
  clock: number;
  serial: number;
  message: string;
  speaker: string;
  focus: string;
  demo: boolean;
  demoStart: number;
  roundOnly: boolean;
  feet: number[];
  topples: number;
  lastMistakes: number;
  lastBeat: number;
  costume: number;
  bank: number;
  resultsTick: number;
  props: number[];
  expert: boolean;
  ghostIds: number[];
  cairn: number[];
  talks: Record<string, number>;
  finaleGuests: number[];
  remoteScores: number[];
  remoteDots: number[][];
  drinks: number[];
  marbles: number[];
  phone: number;
};
export type Guest = { seat: number; pose: string; initial: boolean };
export type GameComponents = {
  retreat: { data: Flow };
  guest: Guest;
  actor: ActorComponent;
  clips: ClipsData;
  puppet: { body: string };
  sceneProp: ScenePropComponent;
  ghost: { seat: number; x: number; y: number; phase: number; active: boolean; score: number };
  find: { index: number; x: number; z: number };
  plaque: { index: number; x: number; z: number };
};
defineComponent('retreat', {
  description: 'The complete Little Fulcrum run.',
  fields: { data: { type: 'object', default: {}, description: 'Serializable flow, daily ritual and activity state.' } },
});
defineComponent('guest', {
  description: 'A guest and their scrubbed pose.',
  fields: {
    seat: { type: 'integer', default: 0, description: 'Mat index.' },
    pose: { type: 'string', default: 'Stand', description: 'Active pose strip.' },
    initial: { type: 'boolean', default: false, description: 'Additive lean layers have started.' },
  },
});
defineComponent('ghost', {
  description: 'A remote guest on a neighbouring mat.',
  fields: {
    seat: { type: 'integer', default: 1, description: 'Mat.' },
    x: { type: 'number', default: 0, description: 'Balance lean sideways.' },
    y: { type: 'number', default: 0, description: 'Balance lean forward.' },
    phase: { type: 'integer', default: 0, description: 'Current class.' },
    active: { type: 'boolean', default: true, description: 'Still present.' },
    score: { type: 'number', default: 0, description: 'Remote score.' },
  },
});
for (const name of ['find', 'plaque'])
  defineComponent(name, {
    description: `An island ${name}.`,
    fields: {
      index: { type: 'integer', default: 0, description: 'Content row.' },
      x: { type: 'number', default: 0, description: 'East.' },
      z: { type: 'number', default: 0, description: 'South.' },
    },
  });
export const flowOf = (w: World<GameComponents>): Flow => w.query('retreat')[0].retreat.data;
