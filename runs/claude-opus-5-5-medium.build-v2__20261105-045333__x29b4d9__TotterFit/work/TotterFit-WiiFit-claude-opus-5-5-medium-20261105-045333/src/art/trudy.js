import * as THREE from 'three/webgpu';
import { rbox } from './props.js';
import { box, capsule, sphere, cyl, torus, at, toon } from './materials.js';
import { Rig } from '../anim/rig.js';
import { poseClip } from '../anim/clips.js';
const clips = () => [
  poseClip('idle', 2, [{ t: 0, pose: { body: [0, 0, -2] } }, { t: 1, pose: { body: [0, 0, 2] } }, { t: 2, pose: { body: [0, 0, -2] } }]),
  poseClip('hop', .4, [{ t: 0, pose: { body: [10, 0, 0], pegL: [-30, 0, 0], pegR: [-30, 0, 0] } }, { t: .2, pose: { body: [-8, 0, 0], pegL: [24, 0, 0], pegR: [24, 0, 0] } }, { t: .4, pose: { body: [10, 0, 0], pegL: [-30, 0, 0], pegR: [-30, 0, 0] } }]),
  poseClip('gasp', .5, [{ t: 0, pose: { body: [0, 0, 0] } }, { t: .15, pose: { body: [-22, 0, 0] } }, { t: .5, pose: { body: [-14, 0, 0] } }], false),
  poseClip('sulk', 1, [{ t: 0, pose: { body: [14, 26, 0] } }, { t: 1, pose: { body: [16, 22, 2] } }]),
  poseClip('faint', 1, [{ t: 0, pose: { body: [0, 0, 0] } }, { t: .5, pose: { body: [-20, 0, 12] } }, { t: 1, pose: { body: [-82, 0, 6] } }], false),
  poseClip('read', 1.6, [{ t: 0, pose: { body: [12, 0, 0] } }, { t: .8, pose: { body: [18, 8, 0] } }, { t: 1.6, pose: { body: [12, 0, 0] } }]),
];
export function makeTrudy() {
  const group = new THREE.Group(); const body = new THREE.Group(); body.name = 'body'; body.position.y = .32; group.add(body);
  const pegL = new THREE.Group(); pegL.name = 'pegL'; pegL.position.set(-.3, .32, 0); group.add(pegL); pegL.add(at(cyl(.07, .09, .32, '#8F6A42'), 0, -.16, 0));
  const pegR = new THREE.Group(); pegR.name = 'pegR'; pegR.position.set(.3, .32, 0); group.add(pegR); pegR.add(at(cyl(.07, .09, .32, '#8F6A42'), 0, -.16, 0));
  body.add(at(rbox(1.1, .42, .26, .1, '#F5B700'), 0, .21, 0));
  body.add(at(box(.56, .2, .05, '#2A2233'), 0, .23, .125));
  const vial = capsule(.075, .36, '#B9F26B'); vial.rotation.z = Math.PI / 2; body.add(at(vial, 0, .23, .15));
  const bubble = sphere(.058, '#FFFFFF', 1.25, .9, .7); bubble.position.set(0, .23, .21); body.add(bubble);
  const pupil = sphere(.024, '#1A1420'); pupil.position.set(0, 0, .85); bubble.add(pupil); pupil.scale.set(.42, .6, .42);
  for (const x of [-.07, .07]) body.add(at(box(.012, .13, .02, '#1A1420'), x, .23, .225));
  for (const x of [-.42, .42]) { body.add(at(sphere(.075, '#B9F26B', 1, 1, .4), x, .23, .125)); }
  const mouth = torus(.05, .012, '#1A1420', Math.PI); mouth.rotation.z = Math.PI; body.add(at(mouth, 0, .075, .135));
  const rig = new Rig(group, clips, 'trudy'); rig.play('idle', 0);
  const t = { group, body, rig, bubble, bubbleX: 0, hopT: 0, squash: 0, wantX: 0,
    tick(dt, feelX = 0) {
      rig.update(dt);
      this.wantX = Math.max(-.2, Math.min(.2, feelX));
      this.bubbleX += (this.wantX - this.bubbleX) * (1 - Math.exp(-5 * dt));
      bubble.position.x = this.bubbleX;
      if (this.squash > 0) { this.squash = Math.max(0, this.squash - dt * 4); const v = Math.sin(this.squash * Math.PI) * .2; body.scale.set(1 + v, 1 - v, 1); }
    },
    hop() { this.squash = 1; rig.play('hop', .1, 'idle'); },
  };
  return t;
}
