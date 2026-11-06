/** @file Scene-scoped prop registration keeps unplaced island assets out of the session warm-up. */
import { defineProp } from '../../../engine/sim-api';
import { makeMatMint, makeMatCoral, makePavilion } from './collection1';
import { makeGull } from './collection10';
import { makePalm, makeShrub, makeRock } from './collection2';
import { makePebble, makePath, makePlatform } from './collection3';
import { makeTare, makeNotice, makePlaque } from './collection4';
import { makeHut, makeLighthouse, makeBenchRetreat } from './collection5';
import { makeParasol, makePier, makeFerry } from './collection6';
import { makeBuoy, makeBoard, makeRope } from './collection7';
import { makePostRetreat, makeHoopRetreat, makeStepRetreat } from './collection8';
import { makeGardenTable, makeStone, makeFrog } from './collection9';
import { makeCounterCart, makeCounterRails, makeBeacon } from './finale';
import { makeDrinkTable, makeDrinkGlass, makeMarbleQuiet, makePhoneStone } from './story';
const makeSea = () =>
  defineProp('prop:sea', {
    description: 'Open sea to every horizon.',
    parts: [
      {
        name: 'water',
        geometry: 'geometry:box',
        params: { width: 1800, height: 0.08, depth: 1800 },
        material: 'material:retreatSea',
        shadow: false,
      },
    ],
  });
const makePondSurface = () =>
  defineProp('prop:pondSurface', {
    description: 'The still water under the jetty.',
    parts: [
      {
        name: 'water',
        geometry: 'geometry:box',
        params: { width: 19, height: 0.025, depth: 18 },
        material: 'material:retreatSea',
        shadow: false,
      },
    ],
  });
const builders: Record<string, () => unknown> = {
  matMint: makeMatMint,
  matCoral: makeMatCoral,
  pavilion: makePavilion,
  gull: makeGull,
  palm: makePalm,
  shrub: makeShrub,
  rock: makeRock,
  pebble: makePebble,
  path: makePath,
  platform: makePlatform,
  tare: makeTare,
  notice: makeNotice,
  plaque: makePlaque,
  hut: makeHut,
  lighthouse: makeLighthouse,
  benchRetreat: makeBenchRetreat,
  parasol: makeParasol,
  pier: makePier,
  ferry: makeFerry,
  buoy: makeBuoy,
  board: makeBoard,
  rope: makeRope,
  postRetreat: makePostRetreat,
  hoopRetreat: makeHoopRetreat,
  stepRetreat: makeStepRetreat,
  gardenTable: makeGardenTable,
  stone: makeStone,
  frog: makeFrog,
  counterCart: makeCounterCart,
  counterRails: makeCounterRails,
  beacon: makeBeacon,
  drinkTable: makeDrinkTable,
  drinkGlass: makeDrinkGlass,
  marbleQuiet: makeMarbleQuiet,
  phoneStone: makePhoneStone,
  sea: makeSea,
  pondSurface: makePondSurface,
};
const registered = new Set<string>();
export function registerRetreat(small = false): void {
  for (const name of small ? ['matMint', 'matCoral', 'pavilion', 'tare'] : Object.keys(builders)) {
    if (registered.has(name)) continue;
    builders[name]();
    registered.add(name);
  }
}
