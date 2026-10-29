import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { carAxes, yawFromFlatDirection } from '../src/math3.js';

function close(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
}

test('car basis matches a Three.js object with Euler order YXZ', () => {
  const samples = [
    [0, 0, 0],
    [0.4, 0, 0],
    [0, 0.7, 0],
    [1.2, -0.4, 0.3],
    [Math.PI, 0.2, -0.5],
    [-0.8, 1.1, 0.6],
  ];
  for (const [yaw, pitch, roll] of samples) {
    const object = new THREE.Object3D();
    object.rotation.order = 'YXZ';
    object.rotation.set(pitch, yaw, roll);
    object.updateMatrixWorld(true);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(object.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(object.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(object.quaternion);
    const axes = carAxes(yaw, pitch, roll);
    close(axes.forward.x, forward.x);
    close(axes.forward.y, forward.y);
    close(axes.forward.z, forward.z);
    close(axes.right.x, right.x);
    close(axes.right.y, right.y);
    close(axes.right.z, right.z);
    close(axes.up.x, up.x);
    close(axes.up.y, up.y);
    close(axes.up.z, up.z);
  }
  const identity = carAxes(0, 0, 0);
  close(identity.forward.x, 0);
  close(identity.forward.y, 0);
  close(identity.forward.z, -1);
  close(identity.right.x, 1);
  close(identity.right.z, 0);
});

test('yaw from a flat direction reproduces that direction as forward', () => {
  for (const dir of [
    { x: 0, z: -1 },
    { x: 0, z: 1 },
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0.6, z: -0.3 },
  ]) {
    const yaw = yawFromFlatDirection(dir);
    const forward = carAxes(yaw, 0, 0).forward;
    const l = Math.hypot(dir.x, dir.z);
    close(forward.x, dir.x / l, 1e-6);
    close(forward.z, dir.z / l, 1e-6);
    close(forward.y, 0);
  }
});
