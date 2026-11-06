/**
 * @file The cast's proportions (PLAN.md section 10): three Guest builds, Plumb very tall and thin, Gerald with immense
 * calves' build, Bex, Nan small and stooped, and Tare a very short drum on two short legs.
 *
 * Game code, sim-side.
 *
 * @example
 * // getBuild('build:plumb').size;
 */
import { defineBuild } from '../../../engine/sim-api';

defineBuild('build:guest0', { size: 1, legUpper: 0.4, legLower: 0.4, hipHeight: 0.77, torso: 0.5, headRadius: 0.17 });
defineBuild('build:guest1', { size: 1, legUpper: 0.43, legLower: 0.43, hipHeight: 0.83, torso: 0.52, headRadius: 0.15, shoulderHalf: 0.17 }); // prettier-ignore
defineBuild('build:guest2', { size: 1, legUpper: 0.35, legLower: 0.35, hipHeight: 0.67, torso: 0.46, headRadius: 0.19, shoulderHalf: 0.21 }); // prettier-ignore
defineBuild('build:plumb', { size: 1, legUpper: 0.55, legLower: 0.55, hipHeight: 1.08, torso: 0.72, headRadius: 0.13, shoulderHalf: 0.14, armUpper: 0.4, armLower: 0.4 }); // prettier-ignore
defineBuild('build:gerald', { size: 1, legUpper: 0.38, legLower: 0.4, hipHeight: 0.75, torso: 0.5, headRadius: 0.18, shoulderHalf: 0.22 }); // prettier-ignore
defineBuild('build:bex', { size: 1, legUpper: 0.38, legLower: 0.38, hipHeight: 0.73, torso: 0.44, headRadius: 0.16, shoulderHalf: 0.15 }); // prettier-ignore
defineBuild('build:nan', { size: 1, legUpper: 0.26, legLower: 0.26, hipHeight: 0.5, torso: 0.34, headRadius: 0.14, shoulderHalf: 0.13, armUpper: 0.2, armLower: 0.2 }); // prettier-ignore
defineBuild('build:tare', { size: 1, legUpper: 0.09, legLower: 0.09, hipHeight: 0.17, torso: 0.2, headRadius: 0.05, hipHalf: 0.13, footSpread: 0.14, shoulderHalf: 0.16, armUpper: 0.05, armLower: 0.05, neck: 0.01 }); // prettier-ignore
defineBuild('build:gull', { size: 1, legUpper: 0.06, legLower: 0.06, hipHeight: 0.11, hipHalf: 0.04, footSpread: 0.05, torso: 0.13, shoulderHalf: 0.07, neck: 0.03, headRadius: 0.06, armUpper: 0.16, armLower: 0.16, footLength: 0.05, ankleHeight: 0.02 }); // prettier-ignore
defineBuild('build:frog', { size: 1, legUpper: 0.05, legLower: 0.05, hipHeight: 0.09, hipHalf: 0.07, footSpread: 0.09, torso: 0.08, shoulderHalf: 0.08, neck: 0.01, headRadius: 0.08, armUpper: 0.05, armLower: 0.05, footLength: 0.06, ankleHeight: 0.02 }); // prettier-ignore
