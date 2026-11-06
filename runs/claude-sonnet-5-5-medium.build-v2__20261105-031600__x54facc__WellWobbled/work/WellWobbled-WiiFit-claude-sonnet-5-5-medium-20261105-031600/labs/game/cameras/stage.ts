/**
 * @file One camera mode `stage` with a preset per activity (the table in the plan): `cam3=stage,<preset>`. It follows the point
 * the page hands it (the guest's feet) and looks at it from a preset offset: front (low, slow push-in), mat (three-quarter,
 * drifting orbit), side, behind, portrait, line, dive, tilt (wide, banking by the page's roll) and wide. The page sets
 * `stageFx.roll` (radians) and `stageFx.t` (seconds) each frame; those are presentation only. Page-side.
 * @example
 * // inspector.camera.set('cam3=stage,mat', { blend: true })
 */
import { defineCamera, followCamera, makePose, type CameraInput, type CameraPose } from '../../../engine';

/** Presentation-only values the page updates each frame. */
export const stageFx = { roll: 0, t: 0, reduced: false };
interface Preset {
  chase?: boolean;
  dist: number;
  height: number;
  yaw: number;
  fov: number;
  drift?: number;
  push?: number;
  aim?: number;
  look?: [number, number];
}
export const PRESETS: Record<string, Preset> = {
  front: { dist: 4.2, height: 1.2, yaw: 0, fov: 45, push: 0.6, aim: 1 },
  mat: { dist: 5.5, height: 2.3, yaw: 0.7, fov: 45, drift: 0.35, aim: 1 },
  side: { dist: 5.5, height: 1.5, yaw: 1.4, fov: 45, aim: 1 },
  behind: { dist: 7.5, height: 4.2, yaw: Math.PI, fov: 50, aim: 1.2 },
  portrait: { dist: 3.6, height: 1.1, yaw: 0, fov: 40, aim: 0.9 },
  line: { dist: 8, height: 4, yaw: Math.PI, fov: 55, aim: 1.4 },
  dive: { dist: 10, height: 3, yaw: 1.3, fov: 55, aim: 0 },
  tilt: { dist: 120, height: 70, yaw: 0.4, fov: 50, aim: 2 },
  wide: { dist: 16, height: 7, yaw: 0.3, fov: 50, aim: 1.5 },
  roam: { chase: true, dist: 6.5, height: 3.4, yaw: Math.PI, fov: 55, aim: 1.3 },
  title: { dist: 150, height: 52, yaw: 0, fov: 45, drift: 0.05, aim: 6 },
};
interface State {
  readonly preset: string;
  readonly at: readonly [number, number, number] | null;
  readonly yaw: number;
}
function step(state: State, input: CameraInput, dt: number): State {
  const to = input.follow;
  if (!to) return state;
  const from = state.at ?? to;
  const jump = Math.hypot(to[0] - from[0], to[2] - from[2]) > 6;
  const k = jump ? 1 : 1 - Math.exp(-dt / 0.2);
  const at = [0, 1, 2].map((i) => from[i] + (to[i] - from[i]) * k) as [number, number, number];
  let yaw = state.yaw;
  if (PRESETS[state.preset]?.chase && !jump) {
    const dx = to[0] - from[0],
      dz = to[2] - from[2];
    if (Math.hypot(dx, dz) > 0.01) {
      const want = Math.atan2(dx, dz) + Math.PI;
      let d = want - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * 2.2);
    }
  }
  return { ...state, at, yaw };
}
function pose(state: State): CameraPose {
  const p = PRESETS[state.preset] ?? PRESETS.mat;
  const [x, y, z] = state.at ?? [0, 0, 0];
  const yaw = p.chase ? state.yaw : p.yaw + (p.drift ? Math.sin(stageFx.t * p.drift) * 0.5 : 0);
  const dist = p.dist - (p.push ? Math.min(p.push * 2, stageFx.t * 0.03) : 0);
  const px = x + Math.sin(yaw) * dist,
    pz = z + Math.cos(yaw) * dist,
    py = y + p.height;
  const ay = y + (p.aim ?? 1);
  const dx = x - px,
    dz = z - pz;
  return makePose({
    position: [px, py, pz],
    yaw: Math.atan2(dx, dz),
    pitch: -Math.atan2(py - ay, Math.hypot(dx, dz)),
    fov: p.fov,
    distance: Math.hypot(dx, dz, py - ay),
    roll: stageFx.reduced ? 0 : stageFx.roll,
  } as never);
}
export const stageCamera = (preset: string) =>
  followCamera(
    'stage',
    { preset, at: null, yaw: PRESETS[preset]?.yaw ?? 0 } as State,
    {
      step,
      pose,
      spec: (s: State) => ({ preset: s.preset }),
      code: (s: State) => `cam3=stage,${s.preset}`,
      describe: (s: State) => `stage: ${s.preset}`,
    } as never,
  );
defineCamera('stage', {
  description: 'The retreat stage camera: a preset per activity, following the guest.',
  create(code: string) {
    const [, preset = 'mat'] = code.split(',');
    return stageCamera(PRESETS[preset] ? preset : 'mat');
  },
} as never);
