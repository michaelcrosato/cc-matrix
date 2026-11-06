/**
 * @file The cast's proportions as builds: three guest builds, Plumb (very tall, thin), Gerald (immense calves), Bex,
 * Nan (small, stooped) and Tare (very short). Sim-side data, no engine call beyond `defineBuild`.
 * @example
 * BUILD_IDS.plumb; // 'build:plumb'
 */
import { defineBuild } from '../../../engine/sim-api';

const make = (id: string, size: number, extra: Record<string, number> = {}) =>
  defineBuild(id, {
    size,
    legUpper: 0.42,
    legLower: 0.42,
    hipHeight: 0.81,
    torso: 0.55,
    headRadius: 0.2,
    ...extra,
  } as never);
make('build:guestA', 1);
make('build:guestB', 1.06, { torso: 0.58 });
make('build:guestC', 0.94, { headRadius: 0.22 });
make('build:plumb', 1.3, { shoulderHalf: 0.17, headRadius: 0.17, torso: 0.6 });
make('build:gerald', 1.04, { legLower: 0.5, shoulderHalf: 0.3 });
make('build:bex', 0.98, { headRadius: 0.19 });
make('build:nan', 0.82, { torso: 0.5 });
make('build:critter', 0.3, { legUpper: 0.15, legLower: 0.15, hipHeight: 0.3, torso: 0.3, headRadius: 0.22 });
make('build:tare', 0.5, { legUpper: 0.2, legLower: 0.2, hipHeight: 0.4, torso: 0.45, headRadius: 0.3 });
export const BUILD_IDS = { guest: ['build:guestA', 'build:guestB', 'build:guestC'], plumb: 'build:plumb', gerald: 'build:gerald', bex: 'build:bex', nan: 'build:nan', tare: 'build:tare' } as const; // prettier-ignore
