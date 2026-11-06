/**
 * @file The purpose-built camera for each activity, as a table of functions from what is happening to where the camera
 * stands (PLAN.md section 6's table). The page calls `shotFor` each frame and `cam3=shot` eases towards the answer. Reduced
 * Motion takes out roll and shake.
 *
 * Game code, a page's.
 *
 * @example
 * // setShot(shotFor('line', view));
 */
import type { Shot } from '../cameras/shot';
import { MAT_OFFSETS, PLUMB_AT, STATIONS } from '../scenes/data/stations';

/** What a shot may look at. */
export interface ShotView {
  t: number;
  phase: string;
  guest: { x: number; y: number; z: number; yaw: number };
  tiltX: number;
  tiltZ: number;
  reduced: boolean;
  data: Record<string, unknown>;
  seat?: number;
  round: boolean;
}

/** A shot that frames a mat from the front, with a slow drift. */
function matShot(v: ShotView): Shot {
  const { x, z } = STATIONS.pavilion;
  const { y } = v.guest;
  if (v.phase === 'demo') {
    // Plumb demonstrates: the camera turns to them.
    const [px, pz] = [x + PLUMB_AT[0], z + PLUMB_AT[1]];
    return { at: [px + 5.4, y + 1.9, pz - 3.6], look: [px, y + 1.2, pz], fov: 40, ease: 1 };
  }
  const drift = Math.sin(v.t * 0.12) * 2.4;
  return {
    at: [v.guest.x + 4.4 + drift, y + 2.2, v.guest.z - 6],
    look: [v.guest.x - 0.5, y + 0.5, v.guest.z],
    fov: 42,
    ease: 0.8,
  };
}

/** A class: all four mats from the front, as wide as the pavilion's back curtain lets it, so everybody can see themselves. */
function classShot(v: ShotView): Shot {
  if (v.phase === 'demo') return matShot(v);
  const { x, z } = STATIONS.pavilion;
  const { y } = v.guest;
  const row = z + MAT_OFFSETS[0][1];
  return { at: [x + Math.sin(v.t * 0.1) * 1.2, y + 3.2, z - 7.6], look: [x, y + 0.7, row], fov: 46, ease: 0.8 };
}

/** The table. */
const SHOTS: Readonly<Record<string, (v: ShotView) => Shot>> = {
  mat: matShot,
  class: classShot,
  platform: (v) => {
    const push = Math.min(1, v.t / 12);
    return {
      at: [v.guest.x + 0.6, v.guest.y + 1.5, v.guest.z - (7.2 - push * 1.4)],
      look: [v.guest.x, v.guest.y + 0.4, v.guest.z],
      fov: 40,
      ease: 1,
    };
  },
  reps: (v) => ({
    at: [v.guest.x + 5.2, v.guest.y + 2, v.guest.z + 3.6],
    look: [v.guest.x - 0.5, v.guest.y + 0.9, v.guest.z - 0.4],
    fov: 42,
    ease: 0.9,
  }),
  step: (v) => ({
    at: [v.guest.x + 0.5, v.guest.y + 4, v.guest.z + 5.6],
    look: [v.guest.x, v.guest.y + 0.8, v.guest.z - 1],
    fov: 46,
    ease: 0.9,
  }),
  pond: (v) => ({
    at: [v.guest.x, v.guest.y + 1.1, v.guest.z - 6],
    look: [v.guest.x, v.guest.y + 0.05, v.guest.z],
    fov: 34,
    ease: 1.2,
  }),
  line: (v) => ({
    at: [v.guest.x + 4.4, v.guest.y + 3.6, v.guest.z - 7.5],
    look: [v.guest.x, v.guest.y + 0.8, v.guest.z + 3],
    fov: 46,
    ease: 0.45,
  }),
  paddle: (v) => {
    const [fx, fz] = [Math.sin(v.guest.yaw), Math.cos(v.guest.yaw)];
    return {
      at: [v.guest.x - fx * 8.6, v.guest.y + 3.1, v.guest.z - fz * 8.6],
      look: [v.guest.x + fx * 3, v.guest.y + 0.9, v.guest.z + fz * 3],
      fov: 50,
      ease: 0.5,
    };
  },
  garden: (v) => {
    const { x, z } = STATIONS.terrace;
    const y = v.guest.y;
    return { at: [x, y + 5, z + 1.8], look: [x, y + 0.92, z], fov: 34, ease: 0.8 };
  },
  plunge: (v) => {
    const { x } = STATIONS.cliff;
    if (v.phase === 'cards')
      return { at: [x + 10.5, 2.5, v.guest.z + 6.5], look: [x - 3, 3.3, v.guest.z - 3], fov: 44, ease: 0.25 };
    if (v.phase === 'air')
      return {
        at: [x + 13, Math.max(3.2, v.guest.y + 1), v.guest.z + 3],
        look: [x, v.guest.y, v.guest.z - 2],
        fov: 50,
        ease: 0.25,
      };
    return {
      at: [x + 7, v.guest.y + 1.7, v.guest.z + 1.2],
      look: [x, v.guest.y + 1, v.guest.z - 1.5],
      fov: 44,
      ease: 0.8,
    };
  },
  hoop: (v) => ({
    at: [v.guest.x + 1.6, v.guest.y + 2.1, v.guest.z - 6],
    look: [v.guest.x, v.guest.y + 1, v.guest.z],
    fov: 42,
    ease: 0.8,
  }),
  jog: (v) => {
    const [fx, fz] = [Math.sin(v.guest.yaw), Math.cos(v.guest.yaw)];
    return {
      at: [v.guest.x - fx * 7, v.guest.y + 3.6, v.guest.z - fz * 7],
      look: [v.guest.x + fx * 4, v.guest.y + 1.1, v.guest.z + fz * 4],
      fov: 54,
      ease: 0.6,
    };
  },
  tilt: (v) => {
    const roll = v.reduced ? 0 : (v.tiltX * Math.PI) / 180;
    if (v.phase === 'storm') {
      const plumbClose = v.t > 3 && v.t < 11;
      const at: [number, number, number] = plumbClose ? [3.4, 10.2, 22.2] : [14, 18, 56];
      const look: [number, number, number] = plumbClose ? [2, 9.3, 26] : [0, 8, 26];
      return { at, look, fov: plumbClose ? 30 : 46, roll: roll * 0.5, ease: 0.9 };
    }
    if (v.phase === 'stone') {
      const a = v.t * 0.045;
      return { at: [Math.sin(a) * 92, 54, Math.cos(a) * 92], look: [0, 8, 0], fov: 46, roll, ease: 1.1 };
    }
    if (v.phase === 'dawn')
      return {
        at: [v.guest.x + 3.6, v.guest.y + 1.7, v.guest.z - 5],
        look: [v.guest.x + 1, v.guest.y + 1, v.guest.z + 1],
        fov: 38,
        ease: 1.2,
      };
    if (v.phase === 'weights')
      return {
        at: [v.guest.x - 2, v.guest.y + 4.2, v.guest.z - 9],
        look: [v.guest.x + 2, v.guest.y + 0.8, v.guest.z + 1],
        fov: 48,
        roll: roll * 0.4,
        ease: 0.8,
      };
    return {
      at: [v.guest.x - 9, v.guest.y + 8, v.guest.z - 3],
      look: [v.guest.x + 8, v.guest.y, v.guest.z],
      fov: 50,
      roll: roll * 0.7,
      ease: 0.6,
    };
  },
  title: (v) => {
    const a = v.t * 0.05;
    return { at: [Math.sin(a) * 130, 42, Math.cos(a) * 130], look: [0, 10, 0], fov: 42, ease: 0 };
  },
  card: (v) => {
    const { x, z } = STATIONS.pavilion;
    const a = Math.sin(v.t * 0.12) * 2;
    return { at: [x + a, 11.6, z + 18], look: [x, 9, z + 2], fov: 42, ease: 0.8 };
  },
  credits: (v) => {
    const a = v.t * 0.05;
    return { at: [Math.sin(a) * 28 + 2, 13, Math.cos(a) * 28 + 26], look: [2, 8.8, 28], fov: 40, ease: 1.2 };
  },
};

/** The shot for a name. */
export function shotFor(name: string, view: ShotView): Shot {
  return (SHOTS[name] ?? SHOTS.title)(view);
}

/** Every shot's name, for tests. */
export const SHOT_NAMES = Object.keys(SHOTS);
