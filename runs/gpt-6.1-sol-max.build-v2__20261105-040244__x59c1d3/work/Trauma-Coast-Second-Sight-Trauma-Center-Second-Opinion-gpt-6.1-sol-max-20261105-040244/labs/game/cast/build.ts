/** @file The same readable dramatic adult proportions in Node, replays and the rendered cast. */
import { defineBuild, getBuild } from '../../../engine/sim-api';
const adult = getBuild('build:adult');
export const drama = defineBuild('build:drama', {
  ...Object.fromEntries(Object.entries(adult).filter(([key]) => key !== 'id' && key !== 'kind')),
  headRadius: adult.headRadius * 1.25,
});
