import { textureDef } from '../../pixel-engine.js';

const FRAMES = [
  ['...bb.....', '..baab....', '.baaaab...', 'baadaaab..', '.baaaab...', '..baab....', '...bb.....'],
  ['..bb......', '.baaab....', 'baadaab...', '.baaaab...', 'baacaaab..', '.baaab....', '..bb......'],
  ['...b......', '..baab....', '.badaab...', 'baaaaab...', '.baaaab...', '..baab....', '...b......'],
  ['....bb....', '...baab...', '..baaaab..', '.baadaab..', '..baaaab..', '...baab...', '....bb....'],
];

export const grassFlame = textureDef({
  id: 'grass-flame',
  about: 'Licking grass flame',
  tags: ['fx'],
  size: [40, 14],
  frames: 4,
  palette: { a: 'red', b: 'orange', c: 'sand', d: 'white' },
  layers: FRAMES.map((pixels, i) => ({ at: [i * 10, 0], pixels, legend: { a: 'a', b: 'b', c: 'c', d: 'd' } })),
});

export const TEXTURES = [grassFlame];
