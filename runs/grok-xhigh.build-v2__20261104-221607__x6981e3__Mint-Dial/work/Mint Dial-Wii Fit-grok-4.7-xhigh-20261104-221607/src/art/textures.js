import { textureDef } from '../../pixel-engine.js';

export const clinicTile = textureDef({
  id: 'clinic-tile',
  size: [16, 16],
  tile: true,
  palette: { grout: 'mist', a: 'white', b: 'white' },
  layers: [{ pattern: 'tiles', colors: ['grout', 'a', 'b'], w: 16, h: 16, mortar: 1, seed: 3 }],
  about: 'Clinic floor, white on white, with a mist grout line.',
  tags: ['floor'],
});
