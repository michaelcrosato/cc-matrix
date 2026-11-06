import * as THREE from 'three/webgpu';
import { sphere, cyl, cone, torus, at, cached, mesh } from './materials.js';
import { Rig } from '../anim/rig.js';
import { poseClip } from '../anim/clips.js';
import { POSES } from '../data/poses.js';
const clips = () => [
  poseClip('stand', 4, [{ t: 0, pose: { body: [0, 0, 0], neck1: [0, 0, 0], headJ: [0, 0, 0] } }, { t: 2, pose: { body: [1, 0, 1], neck1: [2, 0, 0], headJ: [0, 6, 0] } }, { t: 4, pose: { body: [0, 0, 0], neck1: [0, 0, 0], headJ: [0, 0, 0] } }]),
  poseClip('bow', 2, [{ t: 0, pose: { neck1: [0, 0, 0], neck2: [0, 0, 0], neck3: [0, 0, 0] } }, { t: 1, pose: { neck1: [26, 0, 0], neck2: [20, 0, 0], neck3: [24, 0, 0], headJ: [20, 0, 0] } }, { t: 2, pose: { neck1: [0, 0, 0], neck2: [0, 0, 0], neck3: [0, 0, 0] } }], false),
  poseClip('turn', 3, [{ t: 0, pose: { headJ: [0, 0, 0] } }, { t: 1.5, pose: { headJ: [0, 50, 6] } }, { t: 3, pose: { headJ: [0, 0, 0] } }], false),
  poseClip('pat', 1, [{ t: 0, pose: { wingR: [0, 0, 0], neck3: [10, 0, 0] } }, { t: .5, pose: { wingR: [0, 0, 70], neck3: [24, 0, 0] } }, { t: 1, pose: { wingR: [0, 0, 0], neck3: [10, 0, 0] } }]),
  // A slow demonstration of each pose: the heron leans as the pose asks.
  ...POSES.map((p) => poseClip(`demo_${p.id}`, 3, [{ t: 0, pose: { body: [0, 0, 0], wingL: [0, 0, 0], wingR: [0, 0, 0], neck1: [0, 0, 0] } }, { t: 1.5, pose: { body: [p.z * 26, 0, -p.x * 30], wingL: [p.z * 40, 0, -30 + p.x * 50], wingR: [p.z * 40, 0, 30 + p.x * 50], neck1: [p.z * 20, 0, -p.x * 18] } }, { t: 3, pose: { body: [0, 0, 0], wingL: [0, 0, 0], wingR: [0, 0, 0], neck1: [0, 0, 0] } }])),
  poseClip('peck', .8, [{ t: 0, pose: { neck1: [0, 0, 0], neck2: [0, 0, 0], neck3: [0, 0, 0] } }, { t: .4, pose: { neck1: [40, 0, 0], neck2: [40, 0, 0], neck3: [30, 0, 0], headJ: [24, 0, 0] } }, { t: .8, pose: { neck1: [0, 0, 0], neck2: [0, 0, 0], neck3: [0, 0, 0] } }], false),
];
export function makeHeron() {
  const group = new THREE.Group();
  group.add(at(cyl(.025, .025, 1.05, '#F58A2E'), 0, .525, 0));
  group.add(at(sphere(.08, '#F58A2E', 1.8, .3, 1.2), 0, .02, .05));
  const body = new THREE.Group(); body.name = 'body'; body.position.y = 1.2; group.add(body);
  body.add(sphere(.34, '#A9C2D4', .8, .92, 1.35));
  const tucked = cyl(.022, .022, .4, '#F58A2E'); tucked.rotation.x = 1.1; body.add(at(tucked, .1, -.28, -.08));
  const wingL = new THREE.Group(); wingL.name = 'wingL'; wingL.position.set(-.26, .08, 0); body.add(wingL); wingL.add(at(sphere(.3, '#7E9CB4', .18, .78, 1.3), -.02, -.1, -.05));
  const wingR = new THREE.Group(); wingR.name = 'wingR'; wingR.position.set(.26, .08, 0); body.add(wingR); wingR.add(at(sphere(.3, '#7E9CB4', .18, .78, 1.3), .02, -.1, -.05));
  const scarf = torus(.13, .05, '#C24D6A'); scarf.rotation.x = Math.PI / 2 - .3; body.add(at(scarf, 0, .24, .24));
  let p = body; const segs = [[0, .24, .26], [0, .2, .02], [0, .18, -.05], [0, .18, .03], [0, .16, .06]];
  segs.forEach((s, i) => {
    const j = new THREE.Group(); j.name = `neck${i + 1}`; j.position.set(s[0], s[1], s[2]); p.add(j);
    j.add(at(sphere(.062, '#D6E3EC', 1, 1.8, 1), 0, .07, 0)); p = j;
  });
  const headJ = new THREE.Group(); headJ.name = 'headJ'; headJ.position.set(0, .16, 0); p.add(headJ);
  headJ.add(sphere(.115, '#D6E3EC', 1, .95, 1.2));
  const beak = cone(.05, .34, '#F5C542'); beak.rotation.x = Math.PI / 2; headJ.add(at(beak, 0, -.01, .28));
  const crest = cone(.03, .28, '#1A1420', 8); crest.rotation.x = -2.2; headJ.add(at(crest, 0, .1, -.14));
  for (const x of [-1, 1]) { const e = torus(.03, .009, '#1A1420', Math.PI); e.rotation.y = x * Math.PI / 2; headJ.add(at(e, x * .1, .02, .06)); }
  const rig = new Rig(group, clips, 'heron'); rig.play('stand', 0);
  return { group, rig, tick(dt) { rig.update(dt); } };
}
