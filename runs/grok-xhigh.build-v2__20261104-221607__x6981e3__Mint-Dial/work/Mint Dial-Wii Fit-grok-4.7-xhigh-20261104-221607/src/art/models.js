import { model } from '../../pixel-engine.js';

export const ounce = model({
  id: 'ounce',
  about: 'Ounce: a mint retro bathroom scale whose round dial is its face',
  tags: ['character'],
  size: [1.1, 1.05, 1.1],
  palette: { body: 'cyan', base: 'teal', tread: 'sky', face: 'white', rim: 'slate', tick: 'mist', needle: 'red', eye: 'ink' },
  parts: [
    { name: 'base', box: [1.04, 0.08, 1.04], at: [0, 0.04, 0], c: 'base' },
    { name: 'plate', box: [0.96, 0.2, 0.96], at: [0, 0.18, 0], c: 'body' },
    { mirror: [{ name: 'tread', box: [0.3, 0.08, 0.42], at: [0.22, 0.3, -0.22], c: 'tread' }], axis: 'x' },
    {
      group: [
        { name: 'neck', box: [0.5, 0.42, 0.14], at: [0, 0.21, 0], c: 'body' },
        {
          group: [
            { name: 'rim', cyl: [0.78, 0.1, 0.78], at: [0, 0, 0], c: 'rim', seg: 14 },
            { name: 'dial', cyl: [0.66, 0.08, 0.66], at: [0, 0.06, 0], c: 'face', seg: 14 },
            ...[-60, -30, 0, 30, 60].map((a) => ({
              box: [0.08, 0.06, 0.1],
              at: [Math.sin((a * Math.PI) / 180) * 0.26, 0.1, -Math.cos((a * Math.PI) / 180) * 0.26],
              rot: [0, -a, 0],
              c: 'tick',
            })),
            { mirror: [{ name: 'eye', box: [0.08, 0.06, 0.11], at: [0.12, 0.1, -0.07], c: 'eye' }], axis: 'x' },
            {
              group: [
                { name: 'needleBar', box: [0.08, 0.06, 0.22], at: [0, 0, 0.1], c: 'needle' },
                { name: 'hub', cyl: [0.08, 0.06, 0.08], at: [0, 0, 0], c: 'needle', seg: 8 },
              ],
              name: 'needle',
              pivot: true,
              at: [0, 0.12, 0.1],
              rot: [0, 180, 0],
            },
          ],
          name: 'face',
          pivot: true,
          at: [0, 0.5, 0.08],
          rot: [72, 0, 0],
        },
      ],
      name: 'head',
      pivot: true,
      at: [0, 0.26, 0.2],
    },
  ],
});

export const yogaMat = model({
  id: 'yoga-mat',
  about: 'A lime clinic mat',
  tags: ['prop'],
  size: [1.2, 0.08, 2.2],
  palette: { mat: 'lime', edge: 'white' },
  parts: [
    { name: 'mat', box: [1.1, 0.08, 2.05], at: [0, 0.04, 0], c: 'mat' },
    { name: 'edge', box: [1.16, 0.06, 0.08], at: [0, 0.045, 1], c: 'edge' },
  ],
});

export const hoop = model({
  id: 'hoop',
  about: 'A hoop for economics',
  tags: ['prop'],
  size: [1.2, 1.2, 0.2],
  palette: { ring: 'orange', tape: 'white' },
  parts: [
    { name: 'ring', torus: [1.05, 1.05, 0.16], at: [0, 0.6, 0], c: 'ring' },
    { name: 'tape', box: [0.16, 0.2, 0.1], at: [0, 1.05, 0], c: 'tape' },
  ],
});

export const coconut = model({
  id: 'coconut',
  about: 'A coconut, soon to be headed',
  tags: ['prop'],
  size: [0.34, 0.34, 0.34],
  palette: { shell: 'sand', spot: 'slate' },
  parts: [
    { name: 'shell', ball: [0.32, 0.3, 0.32], at: [0, 0.16, 0], c: 'shell' },
    { name: 'spot', box: [0.08, 0.08, 0.08], at: [0.06, 0.22, 0.12], c: 'spot' },
  ],
});

export const jar = model({
  id: 'sweat-jar',
  about: 'The sweat jar. The fluid is a solid pretending.',
  tags: ['prop'],
  size: [1, 2.8, 1],
  palette: { glass: 'sky', fluid: 'cyan', lid: 'white', label: 'sand' },
  parts: [
    { name: 'glass', lathe: [[0.42, 0], [0.48, 0.1], [0.48, 2.1], [0.38, 2.4], [0.38, 2.55]], at: [0, 0.15, 0], seg: 12, c: 'glass' },
    { name: 'fluid', cyl: [0.36, 0.8, 0.36], at: [0, 0.55, 0], c: 'fluid', seg: 12 },
    { name: 'lid', cyl: [0.4, 0.08, 0.4], at: [0, 2.7, 0], c: 'lid', seg: 12 },
    { name: 'label', box: [0.2, 0.16, 0.06], at: [0, 1.2, 0.42], c: 'label' },
  ],
});

export const palm = model({
  id: 'palm',
  about: 'A short palm. The kit library had none this simple.',
  tags: ['prop'],
  size: [1.4, 2.6, 1.4],
  palette: { trunk: 'sand', frond: 'lime' },
  parts: [
    { name: 'trunk', cyl: [0.18, 1.8, 0.22], at: [0, 0.9, 0], c: 'trunk', seg: 8 },
    { name: 'frondA', box: [1.1, 0.08, 0.22], at: [0.2, 1.9, 0], rot: [0, 20, 0], c: 'frond' },
    { name: 'frondB', box: [0.9, 0.08, 0.2], at: [-0.15, 1.85, 0.15], rot: [0, -40, 0], c: 'frond' },
  ],
});

export const pavilion = model({
  id: 'pavilion',
  about: 'Four posts and a cone roof',
  tags: ['building'],
  size: [3.2, 2.8, 3.2],
  palette: { post: 'white', roof: 'cyan', floor: 'sand' },
  parts: [
    { name: 'floor', box: [3, 0.1, 3], at: [0, 0.05, 0], c: 'floor' },
    { name: 'p0', box: [0.16, 1.8, 0.16], at: [-1.2, 1, -1.2], c: 'post' },
    { name: 'p1', box: [0.16, 1.8, 0.16], at: [1.2, 1, -1.2], c: 'post' },
    { name: 'p2', box: [0.16, 1.8, 0.16], at: [-1.2, 1, 1.2], c: 'post' },
    { name: 'p3', box: [0.16, 1.8, 0.16], at: [1.2, 1, 1.2], c: 'post' },
    { name: 'roof', cone: [3.1, 0.8, 3.1], at: [0, 2.2, 0], c: 'roof' },
  ],
});

export const pier = model({
  id: 'pier',
  about: 'A short pier with a rail',
  tags: ['prop'],
  size: [1.4, 1, 4],
  palette: { deck: 'sand', rail: 'white' },
  parts: [
    { name: 'deck', box: [1.2, 0.12, 3.6], at: [0, 0.4, 0], c: 'deck' },
    { name: 'railL', box: [0.08, 0.5, 3.4], at: [-0.55, 0.69, 0], c: 'rail' },
    { name: 'railR', box: [0.08, 0.5, 3.4], at: [0.55, 0.69, 0], c: 'rail' },
  ],
});

export const kevin = model({
  id: 'kevin',
  about: 'Kevin the seagull. Two wings, no wisdom.',
  tags: ['character'],
  size: [0.9, 0.5, 0.5],
  palette: { body: 'white', wing: 'mist', beak: 'orange', foot: 'orange' },
  parts: [
    { name: 'body', ball: [0.36, 0.24, 0.28], at: [0, 0.28, 0], c: 'body' },
    { name: 'head', ball: [0.16, 0.16, 0.16], at: [0, 0.4, 0.18], c: 'body' },
    { name: 'beak', box: [0.08, 0.06, 0.14], at: [0, 0.38, 0.3], c: 'beak' },
    { name: 'wingL', box: [0.32, 0.06, 0.16], at: [-0.28, 0.32, 0], c: 'wing' },
    { name: 'wingR', box: [0.32, 0.06, 0.16], at: [0.28, 0.32, 0], c: 'wing' },
    { name: 'footL', box: [0.08, 0.12, 0.12], at: [-0.08, 0.12, 0.04], c: 'foot' },
    { name: 'footR', box: [0.08, 0.12, 0.12], at: [0.08, 0.12, 0.04], c: 'foot' },
  ],
});

export const ferry = model({
  id: 'ferry',
  about: 'The morning ferry, boxy and polite',
  tags: ['prop'],
  size: [2.2, 1.4, 4],
  palette: { hull: 'white', cabin: 'cyan', trim: 'red' },
  parts: [
    { name: 'hull', box: [2, 0.5, 3.6], at: [0, 0.35, 0], c: 'hull' },
    { name: 'cabin', box: [1.4, 0.7, 1.4], at: [0, 0.9, -0.4], c: 'cabin' },
    { name: 'trim', box: [2.05, 0.08, 0.12], at: [0, 0.62, 1.7], c: 'trim' },
  ],
});

export const hammock = model({
  id: 'hammock',
  about: 'A hammock between two posts',
  tags: ['prop'],
  size: [2.4, 1.6, 0.8],
  palette: { cloth: 'red', post: 'sand' },
  parts: [
    { name: 'postL', box: [0.1, 1.4, 0.1], at: [-1, 0.7, 0], c: 'post' },
    { name: 'postR', box: [0.1, 1.4, 0.1], at: [1, 0.7, 0], c: 'post' },
    { name: 'cloth', box: [1.96, 0.08, 0.55], at: [0, 0.7, 0], c: 'cloth' },
  ],
});

export const vitamin = model({
  id: 'vitamin',
  about: 'One vitamin, colour decided by the tray',
  tags: ['prop'],
  size: [0.16, 0.1, 0.16],
  palette: { pill: 'white' },
  parts: [{ name: 'pill', cyl: [0.14, 0.08, 0.14], at: [0, 0.05, 0], c: 'pill', seg: 8 }],
});

export const MODELS = [ounce, yogaMat, hoop, coconut, jar, palm, pavilion, pier, kevin, ferry, hammock, vitamin];
