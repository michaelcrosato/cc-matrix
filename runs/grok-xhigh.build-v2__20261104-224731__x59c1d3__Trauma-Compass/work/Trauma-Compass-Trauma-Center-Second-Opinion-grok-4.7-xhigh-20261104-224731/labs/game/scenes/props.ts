/**
 * @file The theatre props the scene stands around the sheet. The table and the lamp are the engine's. These four are
 * this game's: a pad, two drapes, a monitor and a board. None of them has a body, so they never fall onto the player.
 */
import { defineProp } from '../../../engine/sim-api';

defineProp('prop:sheet', {
  description: 'The living sheet. The page rewrites its vertices each frame: breath, heartbeat, wounds and blood.',
  parts: [
    {
      name: 'mesh',
      geometry: 'geometry:sheet',
      material: 'material:tissue',
    },
  ],
});

defineProp('prop:cursor', {
  description: 'The gloved hand and the tool, rewritten each frame so they sit on the cursor.',
  parts: [
    {
      name: 'mesh',
      geometry: 'geometry:cursor',
      material: 'material:glove',
    },
  ],
});

defineProp('prop:drape', {
  description: 'A green drape on a pole, screening the theatre from the rest of the room.',
  parts: [
    {
      name: 'cloth',
      geometry: 'geometry:box',
      params: { width: 1.6, height: 2.4, depth: 0.02 },
      material: 'material:cloth',
      tint: '#1c6b58',
      position: [0, 1.2, 0],
    },
    {
      name: 'pole',
      geometry: 'geometry:box',
      params: { width: 0.04, height: 2.4, depth: 0.04 },
      material: 'material:iron',
      tint: '#8d887c',
    },
  ],
});

defineProp('prop:monitor', {
  description: 'A vitals monitor on a stand, its dark screen facing the table.',
  parts: [
    {
      name: 'screen',
      geometry: 'geometry:box',
      params: { width: 0.56, height: 0.36, depth: 0.04 },
      material: 'material:paint',
      tint: '#141c1a',
      position: [0, 1.4, 0],
    },
    {
      name: 'bezel',
      geometry: 'geometry:box',
      params: { width: 0.62, height: 0.42, depth: 0.03 },
      material: 'material:paint',
      tint: '#2c3330',
      position: [0, 1.4, -0.02],
    },
    {
      name: 'stand',
      geometry: 'geometry:box',
      params: { width: 0.08, height: 1.2, depth: 0.08 },
      material: 'material:iron',
    },
  ],
});

defineProp('prop:board', {
  description: 'A board of case notes on a stand beside the table.',
  parts: [
    {
      name: 'face',
      geometry: 'geometry:box',
      params: { width: 0.9, height: 0.7, depth: 0.03 },
      material: 'material:planks',
      tint: '#d9d3c4',
      position: [0, 1.45, 0],
    },
    {
      name: 'post',
      geometry: 'geometry:box',
      params: { width: 0.06, height: 1.2, depth: 0.06 },
      material: 'material:iron',
    },
  ],
});
