/** @file Eye-level body, driving and holstered walking cameras; they keep the native articulated body visible. */
import { defineCamera, followCamera, makePose, createChaseCamera, type CameraInput } from '../../../engine';
let driveHeading = 0;
export function setDriveHeading(yaw: number): void {
  driveHeading = yaw;
}
for (const name of ['fieldBody', 'fieldDrive', 'fieldWalk', 'fieldDown'])
  defineCamera(name, {
    description: 'A visible-body camera at the mercenary’s eye.',
    create: (_code, { from }) => {
      return followCamera(
        name,
        {
          x: 0,
          y: 0,
          z: 0,
          yaw: name === 'fieldDrive' ? driveHeading : (from?.yaw ?? 0),
          carYaw: driveHeading,
          pitch: name === 'fieldBody' ? -0.86 : (from?.pitch ?? 0),
        },
        {
          step: (s, input: CameraInput, dt) => {
            const follow = input.follow ?? [s.x, s.y, s.z],
              yaw =
                s.yaw +
                (name === 'fieldDrive'
                  ? Math.atan2(Math.sin(driveHeading - s.carYaw), Math.cos(driveHeading - s.carYaw))
                  : 0) -
                (input.look?.[0] ?? 0) -
                (input.turn?.[0] ?? 0) * 2.5 * dt;
            const pitch =
              name === 'fieldBody'
                ? -0.86
                : Math.max(-1.2, Math.min(1.2, s.pitch + (input.look?.[1] ?? 0) + (input.turn?.[1] ?? 0) * 2 * dt));
            return { x: follow[0], y: follow[1], z: follow[2], yaw, pitch, carYaw: driveHeading };
          },
          pose: (s) =>
            makePose({
              position: [
                s.x + Math.sin(s.yaw) * 0.18,
                s.y + (name === 'fieldDown' ? 0.45 : name === 'fieldDrive' ? 1.25 : 1.52),
                s.z + Math.cos(s.yaw) * 0.18,
              ],
              yaw: s.yaw,
              pitch: s.pitch,
              fov: 76,
              near: 0.04,
              far: 2400,
            }),
          spec: () => ({ type: 'first' as const }),
          code: () => `cam3=${name}`,
          describe: () => name,
        },
      );
    },
  });

defineCamera('fieldChase', {
  description: 'A chase view that follows vehicle steering while preserving free look.',
  create: (_code, { from }) => {
    const camera = createChaseCamera({ from, yaw: driveHeading, pitch: -0.25, distance: 7 });
    let old = driveHeading;
    return {
      ...camera,
      code: () => 'cam3=fieldChase',
      update: (input: CameraInput = {}, dt = 0) => {
        const delta = Math.atan2(Math.sin(driveHeading - old), Math.cos(driveHeading - old));
        old = driveHeading;
        return camera.update({ ...input, look: [(input.look?.[0] ?? 0) - delta, input.look?.[1] ?? 0] }, dt);
      },
    };
  },
});
