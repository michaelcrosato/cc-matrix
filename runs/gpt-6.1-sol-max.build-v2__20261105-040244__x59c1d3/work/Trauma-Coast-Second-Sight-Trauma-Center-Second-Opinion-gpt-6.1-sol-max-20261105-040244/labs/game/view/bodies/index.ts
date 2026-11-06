/** @file Distinct surgical puppets built on native adult proportions and the engine body grammar. */
import { defineBody, getBody, type BodyPart } from '../../../../engine';
import '../../cast/build';
const human = getBody('body:humanoid');
const people: Record<string, [string, string, string, string]> = {
  wren: ['#d9ad89', '#203034', '#3d9d98', '#1a4850'],
  odie: ['#bd8e69', '#c4b9aa', '#233e54', '#192939'],
  chief: ['#e6b995', '#bdb4a3', '#e8e7db', '#374653'],
  sabine: ['#8e5f46', '#cbd2cf', '#e6dbc2', '#394f58'],
  voss: ['#e4bca1', '#a28462', '#e4d8b8', '#e6dfce'],
  patient: ['#d4a383', '#684a39', '#9baea5', '#657c7c'],
};
for (const [id, [skin, hair, cloth, pants]] of Object.entries(people)) {
  const extras: BodyPart[] = [];
  if (id === 'chief')
    extras.push(['limb', ['off', 'head', 0.18, -0.09, 0.15], ['off', 'head', 0.18, 0.09, 0.15], 0.035, 0.045, 'hair']);
  if (id === 'odie') extras.push(['ball', ['off', 'head', -0.17, 0, 0.4], 0.14, 'hair']);
  if (id === 'wren')
    for (const sign of [-1, 1])
      extras.push([
        'limb',
        ['off', 'head', 0.22, sign * 0.03, 0.22],
        ['off', 'head', 0.22, sign * 0.15, 0.22],
        0.012,
        0.012,
        'belt',
      ]);
  defineBody(`body:${id}`, {
    description: `Original Harbor Light cast: ${id}.`,
    build: 'build:drama',
    parts: [...human.parts, ...extras],
    mirror: human.mirror,
    slots: { ...human.slots, skin, hair, cloth, pants, boot: '#172d35', belt: '#c7b582' },
    limbRadius: 0.07,
    torsoRadius: 0.23,
  });
}
