/**
 * @file The scene `game:island`: the whole game on one world (PLAN.md section 14's one-scene rule). Activities are
 * spawned at their stations and removed afterwards. The page starts it, hands it the save with `game.begin`, and every
 * menu pick arrives as a scene action.
 *
 * Game code, sim-side: `node x sim labs/game/scenes/island.ts` runs it in Node.
 *
 * @example
 * // inspector.actions.run('game.begin', { day: 1 });
 */
import { addTerrainBody, defineScene, getTerrain, physicsOf, type Intents } from '../../../engine/sim-api';
import type { GameComponents } from './components';
import './components';
import './settings';
import { holdCast, scrubCast } from '../cast/roster';
import { ISLAND_ACTIONS } from './actions';
import { setHost, stepActivity } from './flow';
import { buildIsland, stepIsland } from './world';
import { makeSeats } from './seats';
import { stepDirector } from './director';
import { stepPilot } from './pilot';
import { stepCritters } from './critters';
import './terrain';
import './telegraphs';
import '../cast/index';
import '../props/core';
import '../props/stations';
import '../props/activities';

/** The island. */
export const island = defineScene<GameComponents>('game:island', {
  description: 'Little Fulcrum Wellness Retreat: the island, its stations, every activity, the five days.',
  terrain: 'terrain:fulcrum',
  physics: true,
  setup(w) {
    const terrain = getTerrain('terrain:fulcrum');
    addTerrainBody(physicsOf(w), terrain);
    setHost(w, { round: false, terrain, floorY: 2 });
    w.spawn({ flow: {} });
    w.spawn({ activity: {} });
    w.spawn({ island: {} });
    makeSeats(w, buildIsland(w));
    w.systems.add('game.hold', holdCast, { phase: 'readback' });
    w.systems.add('game.scrub', scrubCast, { phase: 'ai' });
    w.systems.add('game.critters', stepCritters, { phase: 'ai' });
    w.systems.add('game.world', stepIsland, { phase: 'rules' });
  },
  step(w, intents: Intents) {
    stepDirector(w);
    stepPilot(w, intents);
    stepActivity(w, intents);
  },
  actions: ISLAND_ACTIONS,
});

export default island;
