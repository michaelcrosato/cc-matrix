/**
 * @file The cast's proportions (`defineBuild`): Plumb very tall and narrow, Gerald's calves, Nan small and stooped, Tare a
 * very short drum on two stubby legs, and the guest's other two looks. A field left out keeps `build:chibi`'s value.
 */
import { defineBuild } from '../../../engine/sim-api';

defineBuild('build:plumb', { size: 1, legUpper: 0.62, legLower: 0.62, hipHeight: 1.2, torso: 0.78, headRadius: 0.16 });
defineBuild('build:gerald', {
  size: 1,
  legUpper: 0.42,
  legLower: 0.46,
  hipHeight: 0.85,
  torso: 0.58,
  headRadius: 0.21,
});
defineBuild('build:bex', { size: 1, legUpper: 0.4, legLower: 0.4, hipHeight: 0.77, torso: 0.5, headRadius: 0.2 });
defineBuild('build:nan', { size: 1, legUpper: 0.29, legLower: 0.29, hipHeight: 0.56, torso: 0.42, headRadius: 0.18 });
defineBuild('build:tare', { size: 1, legUpper: 0.13, legLower: 0.13, hipHeight: 0.25, torso: 0.2, headRadius: 0.14 });
defineBuild('build:guestTall', {
  size: 1,
  legUpper: 0.48,
  legLower: 0.48,
  hipHeight: 0.93,
  torso: 0.6,
  headRadius: 0.19,
});
defineBuild('build:guestRound', {
  size: 1,
  legUpper: 0.36,
  legLower: 0.36,
  hipHeight: 0.7,
  torso: 0.56,
  headRadius: 0.23,
});
