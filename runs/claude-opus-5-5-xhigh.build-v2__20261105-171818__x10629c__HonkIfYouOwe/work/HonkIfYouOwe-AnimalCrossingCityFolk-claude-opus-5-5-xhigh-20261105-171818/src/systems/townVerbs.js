// What pressing does to things in the village: objects by kind, and the fixed places.
import { BUILDINGS, LANDMARKS, BENCHES } from '../data/town.js';
import { ITEMS } from '../data/items.js';

export function objectVerb(g, k, o, x, z) {
  switch (o.k) {
    case 'tree': return { label: o.wasp ? 'Shake the tree (it hums)' : 'Shake the tree', act: 'shakeTree' };
    case 'flower': return { label: 'Pick the flower', act: 'pickObject', give: `flower${o.species}${o.color}` };
    case 'weed': return { label: 'Pull the weed', act: 'pullWeed' };
    case 'drop': return { label: `Pick up ${ITEMS[o.item]?.name ?? 'it'}`, act: 'pickObject', give: o.item };
    case 'shell': return { label: `Pick up ${ITEMS[o.item]?.name ?? 'the shell'}`, act: 'pickObject', give: o.item };
    case 'driftwood': return { label: `Pick up ${ITEMS[o.item]?.name ?? 'the driftwood'}`, act: 'pickObject', give: o.item };
    case 'hole': return { label: 'Bury something', act: 'bury', hole: k };
    case 'beanstalk': return (o.stage ?? 0) >= 2 ? { label: 'Harvest the beanstalk', act: 'harvestStalk' } : { label: 'Check the beanstalk', act: 'lookStalk' };
    case 'snowman': return { label: 'Talk to the snowman', act: 'snowmanTalk' };
    case 'crack': return g.world.player.tool === 'shovel' ? null : { label: 'A star-shaped crack', act: 'crackHint' };
    case 'stump': return { label: 'Sit on the stump', act: 'sitStump' };
    case 'pattern': return { label: 'Scuff the pattern off', act: 'clearPattern' };
    case 'patternSign': return { label: 'Take the sign down', act: 'clearPattern' };
    default: return null;
  }
}
export function townInteractables(g) {
  const out = [];
  const w = g.world;
  for (const b of BUILDINGS) out.push({ id: `door:${b.id}`, x: b.door[0], z: b.door[1] - 0.4, r: 1.5, label: b.id === 'home' ? 'Go home' : `Enter ${b.name}`, act: 'enterBuilding', building: b });
  const [mx, mz] = LANDMARKS.mailbox;
  out.push({ id: 'mailbox', x: mx, z: mz, r: 1.4, label: w.mail.inbox.some((m) => !m.read) ? 'Check the mail (!)' : 'Check the mail', act: 'mailbox' });
  const [bx, bz] = LANDMARKS.oldBell;
  out.push({ id: 'bell', x: bx, z: bz, r: 1.6, label: 'Ring the Old Bell', act: 'ringBell' });
  const [nx, nz] = LANDMARKS.noticeBoard;
  out.push({ id: 'board', x: nx, z: nz, r: 1.5, label: 'Read the notice board', act: 'noticeBoard' });
  const [px, pz] = LANDMARKS.oldPear;
  out.push({ id: 'pear', x: px, z: pz, r: 2.2, label: 'Look up at the Old Pear', act: 'oldPear' });
  out.push({ id: 'bus', x: LANDMARKS.busStop[0], z: LANDMARKS.busStop[1], r: 1.7, label: 'Wait for the bus', act: 'busStop' });
  for (const [x, z] of BENCHES) {
    const lookout = x > 70;
    out.push({ id: `bench:${x}`, x, z, r: 1.5, label: lookout ? (g.isNight?.() ? 'Sit and look at the stars' : 'Sit on the bench') : 'Sit on the bench', act: lookout ? 'lookoutBench' : 'sitBench', seat: [x, z] });
  }
  const [lx, lz] = LANDMARKS.lighthouse;
  out.push({ id: 'lighthouse', x: lx, z: lz + 1.6, r: 1.6, label: 'Knock at the lighthouse', act: 'lighthouseKnock' });
  return out;
}
