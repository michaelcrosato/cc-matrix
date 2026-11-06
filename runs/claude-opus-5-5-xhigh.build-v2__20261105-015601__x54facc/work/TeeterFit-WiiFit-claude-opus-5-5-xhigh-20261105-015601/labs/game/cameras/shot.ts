/**
 * @file The camera mode `cam3=shot`: a single data-driven camera the page aims each frame (ui/shots.ts): where it stands,
 * what it looks at, its lens and its roll. Every activity's purpose-built camera is a row in that table, and this
 * eases towards it, so one activity's shot blends into the next's with no pop.
 *
 * Game code, a page's: view state, never the sim's.
 *
 * @example
 * // setShot({ at: [0, 3, 8], look: [0, 1, 0], fov: 40 });
 */
import { defineCamera, followCamera, makePose, type CameraInput, type CameraPose } from '../../../engine';

/** What a shot asks for. */
export interface Shot {
  at: readonly [number, number, number];
  look: readonly [number, number, number];
  fov?: number;
  roll?: number;
  /** Time constant of the ease, s; 0 cuts. */
  ease?: number;
}

/** The shot asked for: the page writes it each frame. */
let wanted: Shot = { at: [0, 30, 120], look: [0, 6, 0], fov: 40, ease: 0 };

/** Aims the camera. */
export function setShot(shot: Shot): void {
  wanted = shot;
}

/** Its state. */
interface State {
  at: readonly [number, number, number] | null;
  look: readonly [number, number, number];
  fov: number;
  roll: number;
}

/** The step: ease towards the shot. */
function step(state: State, _input: CameraInput, dt: number): State {
  const ease = wanted.ease ?? 0.6;
  const k = ease <= 0 || !state.at ? 1 : 1 - Math.exp(-dt / ease);
  const mix = (a: readonly number[], b: readonly number[]) =>
    a.map((v, i) => v + (b[i] - v) * k) as unknown as [number, number, number];
  const from = state.at ?? wanted.at;
  return {
    at: mix(from, wanted.at),
    look: mix(state.at ? state.look : wanted.look, wanted.look),
    fov: state.fov + ((wanted.fov ?? 45) - state.fov) * k,
    roll: state.roll + ((wanted.roll ?? 0) - state.roll) * k,
  };
}

/** The pose from the state. */
function pose(state: State): CameraPose {
  const [x, y, z] = state.at ?? wanted.at;
  const [lx, ly, lz] = state.look;
  const [dx, dy, dz] = [lx - x, ly - y, lz - z];
  const flat = Math.hypot(dx, dz) || 1e-3;
  return makePose({
    position: [x, y, z],
    yaw: Math.atan2(dx, dz),
    pitch: Math.max(-1.55, Math.min(1.55, Math.atan2(dy, flat))),
    roll: state.roll,
    fov: state.fov,
    distance: Math.hypot(flat, dy),
    far: 9000,
  });
}

/** The camera. */
export function shotCamera() {
  return followCamera('shot', { at: null, look: wanted.look, fov: wanted.fov ?? 45, roll: 0 } as State, {
    step,
    pose,
    spec: () => ({}),
    code: () => 'cam3=shot',
    describe: () => 'shot: wherever the page aims it',
  });
}

defineCamera('shot', {
  description: 'A camera the page aims each frame: the table of purpose-built shots in ui/shots.ts.',
  create: () => shotCamera(),
});
