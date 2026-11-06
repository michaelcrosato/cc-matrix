/**
 * @file The operating theatre as a text level: a bare floor big enough for the table, the lamp and one surgeon
 * standing off the sheet. The sheet's world position is `FIELD_AT`, which the page uses to aim the mouse.
 */
import { compileLevel } from '../../../engine/sim-api';

/** Twenty by nine metres inside a wall, the surgeon's mark near the middle. */
export const OR_TEXT = `---
description: Harbor Light operating theatre. A bare floor the table, the lamp and the drapes stand on.
---
####################
#..................#
#..................#
#..................#
#........@.........#
#..................#
#..................#
#..................#
####################
`;

/** The compiled floor. */
export const OR = compileLevel(OR_TEXT, { file: 'labs/game/scenes/room.ts', name: 'or' });

/** Where the sheet stands, metres. The mouse ray subtracts this. */
export const FIELD_AT = {
  x: OR.spawns.find((spawn) => spawn.name === 'hero')?.position[0] ?? 10,
  y: 0.82,
  z: OR.spawns.find((spawn) => spawn.name === 'hero')?.position[2] ?? 4,
};
