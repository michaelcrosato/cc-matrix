import * as THREE from 'three/webgpu';
import { sphere, capsule, cone, torus, cyl, at } from './materials.js';
import { Rig } from '../anim/rig.js';
import { poseClip } from '../anim/clips.js';
const clips = () => [
  poseClip('bounce', .8, [{ t: 0, pose: { body: [0, 0, 2], flipL: [0, 0, -14], flipR: [0, 0, 14] } }, { t: .4, pose: { body: [-3, 0, -2], flipL: [0, 0, -30], flipR: [0, 0, 30] } }, { t: .8, pose: { body: [0, 0, 2], flipL: [0, 0, -14], flipR: [0, 0, 14] } }]),
  poseClip('clap', .4, [{ t: 0, pose: { flipL: [-60, 30, -30], flipR: [-60, -30, 30] } }, { t: .2, pose: { flipL: [-70, 0, -8], flipR: [-70, 0, 8] } }, { t: .4, pose: { flipL: [-60, 30, -30], flipR: [-60, -30, 30] } }]),
  poseClip('inhale', 1.6, [{ t: 0, pose: { body: [0, 0, 0] } }, { t: .9, pose: { body: [-14, 0, 0], flipL: [0, 0, -50], flipR: [0, 0, 50] } }, { t: 1.6, pose: { body: [6, 0, 0], flipL: [0, 0, -10], flipR: [0, 0, 10] } }], false),
  poseClip('salute', 1, [{ t: 0, pose: { flipR: [0, 0, 14] } }, { t: .3, pose: { flipR: [-150, 0, 60] } }, { t: 1, pose: { flipR: [-150, 0, 60] } }], false),
  poseClip('catch', .7, [{ t: 0, pose: { flipR: [-100, 0, 40], body: [0, 0, -6] } }, { t: .3, pose: { flipR: [-120, 0, 80], body: [0, 0, -14] } }, { t: .7, pose: { flipR: [-60, 0, 20], body: [0, 0, 0] } }], false),
];
export function makeWalrus() {
  const group = new THREE.Group(); const body = new THREE.Group(); body.name = 'body'; group.add(body);
  const c = capsule(.72, .5, '#B9806A'); c.scale.set(1.06, 1, .9); body.add(at(c, 0, .97, 0));
  const band = torus(.6, .07, '#E8443A'); band.rotation.x = Math.PI / 2; body.add(at(band, 0, 1.62, 0));
  for (const x of [-.22, .22]) { body.add(at(sphere(.24, '#E8CDB8', 1, .85, .9), x, 1.22, .56)); const tusk = cone(.05, .4, '#FFF4DC'); tusk.rotation.x = Math.PI; body.add(at(tusk, x * .9, .9, .66)); body.add(at(sphere(.05, '#1A1420'), x * 1.1, 1.52, .6)); }
  body.add(at(sphere(.08, '#6B3F36'), 0, 1.32, .7));
  const lan = torus(.48, .02, '#FFFFFF'); lan.rotation.x = Math.PI / 2 + .55; body.add(at(lan, 0, .86, .24));
  body.add(at(cyl(.045, .05, .14, '#F5B700'), 0, .56, .62));
  const flipL = new THREE.Group(); flipL.name = 'flipL'; flipL.position.set(-.72, 1.05, .1); body.add(flipL); flipL.add(at(sphere(.3, '#8D5F4F', .32, 1, .62), -.05, -.3, 0));
  const flipR = new THREE.Group(); flipR.name = 'flipR'; flipR.position.set(.72, 1.05, .1); body.add(flipR); flipR.add(at(sphere(.3, '#8D5F4F', .32, 1, .62), .05, -.3, 0));
  for (const x of [-.34, .34]) body.add(at(sphere(.26, '#8D5F4F', 1.2, .22, 1.4), x, .06, .2));
  const rig = new Rig(group, clips, 'walrus'); rig.play('bounce', 0);
  return { group, rig, tick(dt) { rig.update(dt); } };
}
