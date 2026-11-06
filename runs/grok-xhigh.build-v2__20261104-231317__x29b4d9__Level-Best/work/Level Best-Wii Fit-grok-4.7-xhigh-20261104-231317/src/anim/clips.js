import * as THREE from 'three/webgpu';

/** A short idle on a named arm joint. The mixer owns the clip. */
export function armIdle(mixer, name = 'arm') {
  const times = [0, 0.5, 1];
  const axis = new THREE.Vector3(1, 0, 0);
  const q = new THREE.Quaternion();
  const values = [];
  for (const angle of [0.35, -0.2, 0.35]) {
    q.setFromAxisAngle(axis, angle);
    values.push(q.x, q.y, q.z, q.w);
  }
  const track = new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
  const clip = new THREE.AnimationClip('idle', 1, [track]);
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();
  return action;
}
