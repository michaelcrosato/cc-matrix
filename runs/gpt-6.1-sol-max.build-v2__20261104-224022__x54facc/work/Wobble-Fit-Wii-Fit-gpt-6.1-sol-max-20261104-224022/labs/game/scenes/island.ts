/** @file The full residency and its separate, light session pavilion. All gameplay uses the same pilot. */
import { defineScene, type World } from '../../../engine/sim-api';
import { freshProgress, type Flow, type GameComponents } from './state';
import { makeWobble } from './wobble';
import { createRun } from './events/registry';
import { ACTIONS } from './flow';
import { buildWorld } from './world';
import { pilot } from './pilot';
import './settings';
export function setup(w: World<GameComponents>, small: boolean): void {
  const cast = buildWorld(w, small);
  const data: Flow = {
    ...freshProgress(),
    ...cast,
    mode: 'front',
    event: createRun('pose', 1),
    wobble: makeWobble([0, 1, 2, 3, 4, 5]),
    clock: 0,
    serial: 0,
    message: 'Please keep to the centre. No reason.',
    speaker: 'Tare',
    focus: '',
    demo: false,
    demoStart: 0,
    roundOnly: small,
    feet: [-57.4, 8.2, 20],
    topples: 0,
    lastMistakes: 0,
    lastBeat: -1,
    costume: 0,
    bank: 0,
    resultsTick: 0,
    props: [],
    expert: false,
    ghostIds: small
      ? Array.from({ length: w.settings.get<number>('game.sessionCount') - 1 }, (_, i) =>
          w.spawn({ ghost: { seat: i + 1, x: 0, y: 0, phase: 0, active: true, score: 0 } }),
        )
      : [],
    cairn: [],
    talks: {},
    finaleGuests: [],
    remoteScores: [0, 0, 0, 0],
    drinks: [],
    marbles: [],
    phone: -1,
    remoteDots: [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  };
  w.spawn({ retreat: { data } });
}
export const island = defineScene<GameComponents>('game:island', {
  description: 'A five-day balance residency at Little Fulcrum.',
  terrain: 'terrain:fulcrum',
  physics: true,
  setup: (w) => setup(w, false),
  step: pilot,
  actions: ACTIONS,
});
export const round = defineScene<GameComponents>('game:round', {
  description: 'Four neighbouring mats, three classes, no interference.',
  physics: true,
  setup: (w) => setup(w, true),
  step: pilot,
  actions: ACTIONS,
});
export default island;
