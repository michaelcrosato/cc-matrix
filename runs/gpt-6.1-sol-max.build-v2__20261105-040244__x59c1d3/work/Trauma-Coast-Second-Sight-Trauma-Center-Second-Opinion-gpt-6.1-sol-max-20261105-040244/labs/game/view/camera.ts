/** @file Native camera modes for surgical parallax, precision, ship roll, flap inspection and dramatic close-ups. */
import { defineCamera, followCamera, makePose, type CameraPose } from '../../../engine';
export const surgicalCue = { x: 0, z: 0, precision: false, ship: false, time: 0, flap: 0, failed: false, site: 0 };
export const storyCue = { x: 9, y: 5, z: -12, yaw: -33, pitch: -16, roll: 0 };
interface SurgicalState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  site: number;
}
const start: SurgicalState = { x: 0, y: 19, z: -5, yaw: 0, pitch: (-72 * Math.PI) / 180, roll: 0, fov: 42, site: 0 };
const lerp = (from: number, to: number, k: number): number => from + (to - from) * k;
defineCamera('surgeon', {
  description: 'Above living tissue: precision dolly, parallax, flap tilt and a rolling ship.',
  create() {
    return followCamera(
      'surgeon',
      { ...start },
      {
        step(s, _input, dt) {
          const k = 1 - Math.exp(-dt * 6),
            cue = surgicalCue,
            shift = cue.site !== s.site ? (cue.site > s.site ? 1.2 : -1.2) : s.x;
          return {
            x: lerp(shift, -cue.x * 0.025, k),
            y: lerp(s.y, cue.failed ? 22 : 15, k),
            z: lerp(s.z, -5 - cue.z * 0.02, k),
            yaw: lerp(s.yaw, -cue.x * 0.0025, k),
            pitch: lerp(s.pitch, ((-72 + cue.z * 0.35 + cue.flap * 4) * Math.PI) / 180, k),
            roll: lerp(s.roll, cue.ship ? (Math.sin((cue.time * Math.PI * 2) / 7) * Math.PI) / 30 : 0, k),
            fov: lerp(s.fov, cue.precision ? 36 : 42, k),
            site: cue.site,
          };
        },
        pose: (s) =>
          makePose({ position: [s.x, s.y, s.z], yaw: s.yaw, pitch: s.pitch, roll: s.roll, fov: s.fov, distance: 16 }),
        spec: () => ({}),
        code: () => 'cam3=surgeon',
        describe: () => 'A surgeon above the operating field.',
      },
    );
  },
});
defineCamera('harbor', {
  description: 'A staged native portrait camera that can bank into a Drama Cut.',
  create() {
    return followCamera(
      'harbor',
      { x: storyCue.x, y: storyCue.y, z: storyCue.z, yaw: storyCue.yaw, pitch: storyCue.pitch, roll: 0 },
      {
        step(s, _i, dt) {
          const k = 1 - Math.exp(-dt * 7);
          return {
            x: lerp(s.x, storyCue.x, k),
            y: lerp(s.y, storyCue.y, k),
            z: lerp(s.z, storyCue.z, k),
            yaw: lerp(s.yaw, storyCue.yaw, k),
            pitch: lerp(s.pitch, storyCue.pitch, k),
            roll: lerp(s.roll, storyCue.roll, k),
          };
        },
        pose: (s) =>
          makePose({
            position: [s.x, s.y, s.z],
            yaw: (s.yaw * Math.PI) / 180,
            pitch: (s.pitch * Math.PI) / 180,
            roll: s.roll,
            fov: 38,
          }) as CameraPose,
        spec: () => ({}),
        code: () => 'cam3=harbor',
        describe: () => 'Port Verity, seen from the room.',
      },
    );
  },
});
