/**
 * @file The camera mode `cam3=stage`: whatever `ui/shots.ts` says this frame. Every activity's camera is a shot it computes
 * from the sim: where to stand, what to look at, how wide and how far to bank. This module holds that one shot and eases
 * toward it, so cuts can be soft, and hands out a checked pose. View state only.
 */
import { defineCamera, followCamera, makePose, type CameraInput, type CameraPose } from '../../../engine';

export interface Shot {
  at: [number, number, number];
  look: [number, number, number];
  fov: number;
  roll: number;
  /** Ease time, real seconds; 0 cuts. */
  lag: number;
}

/** The shot the page wants now. */
export const SHOT: Shot = { at: [0, 30, 60], look: [0, 6, 0], fov: 50, roll: 0, lag: 0.5 };

interface State {
  at: [number, number, number];
  look: [number, number, number];
  fov: number;
  roll: number;
}

const ease = (from: number, to: number, k: number) => from + (to - from) * k;

function step(state: State, _input: CameraInput, dt: number): State {
  const k = SHOT.lag <= 0 ? 1 : 1 - Math.exp(-dt / SHOT.lag);
  return {
    at: [0, 1, 2].map((i) => ease(state.at[i], SHOT.at[i], k)) as State['at'],
    look: [0, 1, 2].map((i) => ease(state.look[i], SHOT.look[i], k)) as State['look'],
    fov: ease(state.fov, SHOT.fov, k),
    roll: ease(state.roll, SHOT.roll, k),
  };
}

function pose(state: State): CameraPose {
  const [dx, dy, dz] = [0, 1, 2].map((i) => state.look[i] - state.at[i]);
  const flat = Math.hypot(dx, dz) || 1e-6;
  return makePose({
    position: state.at,
    yaw: Math.atan2(dx, dz),
    pitch: Math.max(-1.55, Math.min(1.55, Math.atan2(dy, flat))),
    roll: state.roll,
    fov: state.fov,
    far: 3000,
    distance: Math.hypot(flat, dy),
  } as never);
}

defineCamera('stage', {
  description: 'The stage camera: the page computes a shot each frame; this eases to it.',
  create() {
    return followCamera('stage', { at: [...SHOT.at], look: [...SHOT.look], fov: SHOT.fov, roll: SHOT.roll } as State, {
      step,
      pose,
      spec: () => ({}),
      code: () => 'cam3=stage',
      describe: () => 'stage: wherever the shot says',
    });
  },
} as never);
