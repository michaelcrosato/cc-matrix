/**
 * @file Builders for one operation: postcard lines, a phase row, and the things a phase spawns.
 */
import type { PhaseDef, Postcards, Spawn } from './types';

/** Four postcard lines. */
export function cards(s: string, a: string, b: string, c: string): Postcards {
  return { S: s, A: a, B: b, C: c };
}

/** A phase row. */
export function phase(
  id: string,
  hint: string,
  until: PhaseDef['until'],
  spawn: Spawn[],
  onEnter = '',
  teach = '',
): PhaseDef {
  return { id, hint, until, spawn, onEnter, teach };
}

/** A pool small enough that triage still has a clock. */
export function pool(x: number, z: number, site = 0, patient = 0): Spawn {
  return { kind: 'pool', x, z, site, patient, volume: 1.15, bleed: 0.22 };
}

/** A laceration two stitches long. */
export function wound(x: number, z: number, site = 0, patient = 0): Spawn {
  return { kind: 'wound', x, z, x2: x + 1.15, z2: z, site, patient, need: 2 };
}

/** A shard of glass or graft. */
export function shard(x: number, z: number, site = 0, patient = 0): Spawn {
  return { kind: 'shard', x, z, site, patient };
}

/** Gel on raw skin. */
export function gel(x: number, z: number, site = 0, patient = 0): Spawn {
  return { kind: 'abrasion', x, z, site, patient, coverNeed: 8 };
}

/** A guide the scalpel can follow. `bow` bends it off the straight line. */
export function curve(x0: number, z0: number, x1: number, z1: number, bow: number, unlock = '', tag = ''): Spawn {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.round(len / 0.32));
  const path: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    path.push(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u + Math.sin(u * Math.PI) * bow);
  }
  return { kind: 'guide', x: x0, z: z0, path, unlock, tag, spawnBleeders: tag === 'long' ? 2 : 0 };
}

/** Six motes around the heart. */
export function motes(): Spawn[] {
  const out: Spawn[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    out.push({ kind: 'mote', x: Math.cos(angle) * 1.15, z: Math.sin(angle) * 0.7 });
  }
  return out;
}
