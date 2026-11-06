/** @file Activity-specific composition over the engine camera contract; camera banking sells the Great Tilt. */
import { defineCamera, makePose, type Camera, type CameraPose, type CameraInput } from '../../../engine';
export const SHOT = {
  mode: 'title',
  event: 'pose',
  tick: 0,
  phase: 0,
  tilt: 0,
  leanX: 0,
  leanY: 0,
  reduced: false,
  feet: [-57.4, 8.2, 20],
};
function aim(position: [number, number, number], target: number[], fov: number, roll = 0): CameraPose {
  const dx = target[0] - position[0],
    dy = target[1] - position[1],
    dz = target[2] - position[2];
  return makePose({
    position,
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
    fov,
    roll,
    far: 1500,
    distance: Math.hypot(dx, dy, dz),
  });
}
function makeRetreatCamera(): Camera {
  let time = 0,
    at = [...SHOT.feet],
    pose = aim([-45, 12.7, 32], [-59, 9.2, 20], 45);
  return {
    type: 'fixed',
    update(input: CameraInput = {}, dt = 1 / 60) {
      time += dt;
      const to = input.follow ?? SHOT.feet,
        k = 1 - Math.exp(-dt * 9);
      at = at.map((v, i) => v + (to[i] - v) * k);
      if (SHOT.mode === 'title' || SHOT.mode === 'credits') {
        pose = aim([-49.5 + Math.sin(time * 0.06), 11.5, 31], [-62.5, 8.9, 20], 43);
      } else if (SHOT.mode === 'overview') {
        const a = time * 0.035;
        pose = aim([Math.sin(a) * 180, 145, Math.cos(a) * 180], [0, 4, 0], 50);
      } else if (SHOT.event === 'tilt' && SHOT.phase === 0) {
        pose = SHOT.tick < 600 ? aim([-48, 10.7, 19], [-52, 9.6, 13], 43) : aim([90, 100, 140], [0, 6, 0], 52);
      } else if (SHOT.event === 'garden') {
        pose = aim([30.2, 17.5, -42.2], [30, 12, -48], 43);
      } else if (SHOT.event === 'tilt' && SHOT.phase === 4 && SHOT.tick < 210 * 60) {
        pose = aim([-48, 10.7, 19], [-52, 9.6, 13], 43);
      } else if (SHOT.event === 'tilt' && SHOT.phase >= 3) {
        const roll = SHOT.reduced ? 0 : SHOT.leanX * 0.2;
        const base = aim([90, 100, 140], [0, 6, 0], 52, roll);
        pose = makePose({ ...base, pitch: base.pitch + (SHOT.reduced ? 0 : SHOT.leanY * 0.08) });
      } else if (SHOT.event === 'line')
        pose = aim([at[0] + 5.7, at[1] + 4.5, at[2] - 8], [at[0], at[1] + 0.8, at[2] + 4], 48);
      else if (SHOT.event === 'paddle' || SHOT.event === 'jog')
        pose = aim([at[0] + 5, at[1] + 4, at[2] - 8], [at[0], at[1] + 0.9, at[2]], 55);
      else if (SHOT.event === 'pond')
        pose = aim([at[0] + 0.6, at[1] + 1.6, at[2] + 6.6], [at[0], at[1] + 0.6, at[2]], 43);
      else if (SHOT.event === 'group') pose = aim([-51, 13.4, 33.5], [-52, 9, 18.5], 52);
      else if (SHOT.event === 'dive')
        pose = aim([at[0] + 9, Math.max(5, at[1] + 2), at[2] + 8], [at[0], at[1] + 1, at[2]], 48);
      else
        pose = aim(
          [at[0] + 4.8, at[1] + 3, at[2] + 7.5],
          [at[0], at[1] + 1, at[2]],
          43,
          SHOT.reduced ? 0 : SHOT.event === 'tilt' ? SHOT.tilt * 0.009 : 0,
        );
      return pose;
    },
    pose: () => pose,
    yaw: () => pose.yaw,
    spec: () => ({ type: 'fixed' }),
    code: () => 'cam3=retreat',
    describe: () => 'Little Fulcrum activity camera',
  };
}
defineCamera('retreat', {
  description: 'The island brochure and each activity in its own composition.',
  create: makeRetreatCamera,
});
