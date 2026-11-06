import * as THREE from 'three/webgpu';
import { sphere, cone, cyl, box, at } from './materials.js';
import { Rig } from '../anim/rig.js';
import { poseClip } from '../anim/clips.js';
const clips = () => [
  poseClip('fly', .36, [{ t: 0, pose: { wingL: [0, 0, 44], wingR: [0, 0, -44] } }, { t: .18, pose: { wingL: [0, 0, -40], wingR: [0, 0, 40] } }, { t: .36, pose: { wingL: [0, 0, 44], wingR: [0, 0, -44] } }]),
  poseClip('land', .4, [{ t: 0, pose: { wingL: [0, 0, 60], wingR: [0, 0, -60], body: [-20, 0, 0] } }, { t: .4, pose: { wingL: [0, 0, -70], wingR: [0, 0, 70], body: [0, 0, 0] } }], false),
  poseClip('stand', 1.5, [{ t: 0, pose: { wingL: [0, 0, -74], wingR: [0, 0, 74], body: [0, 0, 0] } }, { t: .8, pose: { wingL: [0, 0, -74], wingR: [0, 0, 74], body: [4, 8, 0] } }, { t: 1.5, pose: { wingL: [0, 0, -74], wingR: [0, 0, 74], body: [0, 0, 0] } }]),
  poseClip('peck', .3, [{ t: 0, pose: { body: [0, 0, 0], wingL: [0, 0, -74], wingR: [0, 0, 74] } }, { t: .15, pose: { body: [42, 0, 0], wingL: [0, 0, -74], wingR: [0, 0, 74] } }, { t: .3, pose: { body: [0, 0, 0], wingL: [0, 0, -74], wingR: [0, 0, 74] } }]),
  poseClip('squawk', .5, [{ t: 0, pose: { body: [-20, 0, 0], wingL: [0, 0, 30], wingR: [0, 0, -30] } }, { t: .25, pose: { body: [-34, 0, 0], wingL: [0, 0, 60], wingR: [0, 0, -60] } }, { t: .5, pose: { body: [-20, 0, 0], wingL: [0, 0, 30], wingR: [0, 0, -30] } }]),
];
export function makeGull() {
  const group = new THREE.Group(); const body = new THREE.Group(); body.name = 'body'; body.position.y = .12; group.add(body);
  body.add(sphere(.13, '#FFFFFF', .85, .85, 1.35));
  body.add(at(sphere(.085, '#FFFFFF'), 0, .12, .12));
  const beak = cone(.028, .1, '#F5C542', 8); beak.rotation.x = Math.PI / 2; body.add(at(beak, 0, .11, .24));
  for (const x of [-1, 1]) { body.add(at(sphere(.014, '#1A1420'), x * .05, .15, .19)); const brow = box(.05, .012, .012, '#1A1420'); brow.rotation.z = x * -.5; body.add(at(brow, x * .05, .185, .19)); }
  const wingL = new THREE.Group(); wingL.name = 'wingL'; wingL.position.set(-.1, .05, 0); body.add(wingL); wingL.add(at(sphere(.17, '#AEB6C2', 1, .1, .55), -.15, 0, 0));
  const wingR = new THREE.Group(); wingR.name = 'wingR'; wingR.position.set(.1, .05, 0); body.add(wingR); wingR.add(at(sphere(.17, '#AEB6C2', 1, .1, .55), .15, 0, 0));
  for (const x of [-.05, .05]) group.add(at(cyl(.012, .012, .1, '#F58A2E', 6), x, .05, 0));
  const rig = new Rig(group, clips, 'gull'); rig.play('stand', 0);
  return { group, rig, tick(dt) { rig.update(dt); } };
}
