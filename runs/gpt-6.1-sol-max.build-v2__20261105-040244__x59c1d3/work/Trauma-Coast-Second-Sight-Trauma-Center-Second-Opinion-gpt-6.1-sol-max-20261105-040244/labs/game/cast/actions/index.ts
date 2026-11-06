/** @file New melodramatic surgical gestures, driven by the engine multi-beat action animator. */
import { defineAction, type ActionSpec } from '../../../../engine/sim-api';
const moves: Record<
  string,
  { handR?: number[]; handL?: number[]; look?: number[]; lean?: number; twist?: number; crouch?: number }
> = {
  'scrub-hands': { handR: [0.3, -0.08, -0.1], handL: [0.3, 0.08, -0.1] },
  'mask-up': { handR: [0.22, -0.16, 0.2], handL: [0.22, 0.16, 0.2] },
  'hand-over-instrument': { handR: [0.5, 0.1, -0.1] },
  'clipboard-slam': { handR: [0.45, 0.18, -0.35], lean: 0.2 },
  'point-accusingly': { handR: [0.65, 0.05, 0.1], twist: 0.22 },
  'hands-on-desk': { handR: [0.45, 0.28, -0.3], handL: [0.45, -0.28, -0.3], lean: 0.25 },
  'collar-open': { handR: [0.12, 0.15, 0.03], handL: [0.15, -0.1, 0.02] },
  collapse: { crouch: 0.95, lean: 0.9 },
  'despair-knees': { crouch: 1, handR: [0.2, 0.2, 0.3], handL: [0.2, -0.2, 0.3] },
  'adjust-glasses': { handR: [0.21, 0.12, 0.28] },
  'moustache-rage': { handR: [0.35, 0.4, 0.4], twist: 0.3, lean: 0.2 },
  'tv-host-smile': { handR: [0.3, 0.5, 0.15], handL: [0.3, -0.5, 0.15] },
  'trumpet-raise': { handR: [0.38, 0.1, 0.1], handL: [0.35, -0.1, 0.1] },
  'scalpel-salute': { handR: [0.15, 0.2, 0.4] },
  'exhale-relief': { handR: [0.15, 0.2, -0.3], lean: -0.08 },
  'double-fist': { handR: [0.4, 0.2, -0.4], handL: [0.4, -0.2, -0.4], lean: 0.3 },
};
export const ACTIONS = Object.entries(moves).map(([name, m]) =>
  defineAction(`action:${name}`, {
    desc: `Original Harbor Light gesture: ${name}.`,
    beats: [
      { name: 'prepare', seconds: 0.15, motion: { lean: (m.lean ?? 0) * 0.3 } },
      {
        name: 'gesture',
        seconds: 0.65,
        effectors: { ...(m.handR ? { handR: m.handR } : {}), ...(m.handL ? { handL: m.handL } : {}) },
        motion: { lean: m.lean ?? 0, twist: m.twist ?? 0, crouch: m.crouch ?? 0 },
      },
      { name: 'settle', seconds: 0.35 },
    ],
  } satisfies ActionSpec),
);
