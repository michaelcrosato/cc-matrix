/** @file Surgical targets visibly change: open lips, tightening thread, blood, clips, ghosts and strain telegraphs. */
import { Blob } from '../../../../engine';
import type { Operation, Point, Target } from '../../data/types';
import { defaultRules } from '../../scenes/op/state';
import { telegraph } from '../../scenes/strains';
import { pathAt, pathLength } from '../../scenes/op/geometry';
import { RESPONSE, TOOLS } from '../../data/tools';
import { distanceTo } from '../../scenes/op/geometry';
import { hidden } from '../../scenes/op/tools';
import { meshes, type V3 } from './liveMesh';
import { fieldHeight } from './sheet';
const blobs = new Map<number, Blob>();
const point = (p: Point, s: Operation, up = 0.05): V3 => [p[0], fieldHeight(p[0], p[1], s) + up, p[1]];
function stroke(
  t: Target,
  s: Operation,
  width: number,
  color: string,
  start = 0,
  end = pathLength(t.path),
  glow = false,
): void {
  const length = pathLength(t.path),
    points: V3[] = [];
  for (let k = start; k <= Math.min(end, length) + 0.03; k += 0.07) points.push(point(pathAt(t.path, k), s, 0.035));
  (glow ? meshes.glow : meshes.wet).line(points, width, color);
}
export function drawTargets(s: Operation, blood = 'red'): void {
  const site = s.seats[0].site,
    time = s.fieldTicks / 6000;
  const red = blood === 'off' ? '#354c53' : blood === 'teal' ? '#134c52' : '#662238';
  for (const t of s.targets) {
    if (t.site !== site) continue;
    if (t.done) {
      if (['shard', 'mass', 'cocoon'].includes(t.kind) && s.tick - t.last < 45) {
        const u = (s.tick - t.last) / 45,
          x = t.x + (8 - t.x) * u,
          z = t.z + (3 - t.z) * u;
        meshes.steel.ball(
          x,
          fieldHeight(t.x, t.z, s) + 0.5 + Math.sin(u * Math.PI) * 2,
          z,
          0.2 * (1 - u * 0.7),
          0.2,
          0.15,
          t.kind === 'shard' ? '#c3e4de' : '#a6a1b8',
          10,
        );
      }
      if (t.kind === 'wound') {
        stroke(t, s, 0.07, '#513b4f');
        for (const p of t.stitches)
          meshes.thread.line(
            [point([p[0] - 0.04, p[1] - 0.22], s, 0.07), point([p[0] + 0.04, p[1] + 0.22], s, 0.08)],
            0.04,
            '#233c45',
          );
      }
      continue;
    }
    const h = fieldHeight(t.x, t.z, s) + 0.04;
    const buried = t.buried && t.scanned < s.fieldTicks;
    if (hidden(s, t) && t.kind !== 'pool' && t.kind !== 'flap') continue;
    if (buried && t.kind !== 'reverie') continue;
    const cursor = s.seats[0];
    if (RESPONSE[TOOLS[cursor.tool]][t.kind] === 'effect' && distanceTo(t, cursor.x, cursor.z) < t.radius + 0.35)
      meshes.glow.ring(t.x, h + 0.035, t.z, t.radius + 0.3, 0.025, '#baffd7');
    const warning = telegraph(s, t, defaultRules());
    if (['lull', 'solace', 'reverie', 'mercy'].includes(t.kind) && warning > 0) {
      meshes.glow.ring(t.x, h + 0.04, t.z, t.kind === 'mercy' ? 2 : 1.3, 0.045, '#f6ca77');
      meshes.glow.ring(t.x, h + 0.045, t.z, (1 - warning) * 1.3, 0.05, '#d98e59');
    }
    switch (t.kind) {
      case 'pool': {
        const r = t.radius * Math.sqrt(Math.max(0, t.hp));
        if (t.hp > 0) {
          meshes.wet.disc(t.x, h + 0.025, t.z, r, r * 0.74, red, time);
          meshes.wet.disc(
            t.x - 0.18,
            h + 0.035,
            t.z - 0.15,
            r * 0.55,
            r * 0.3,
            blood === 'teal' ? '#2e8588' : '#8e3d50',
            time,
          );
          meshes.glow.line(
            [
              [t.x - r * 0.4, h + 0.04, t.z - r * 0.2],
              [t.x + r * 0.1, h + 0.04, t.z - r * 0.25],
            ],
            0.018,
            '#d8a5a2',
          );
        }
        break;
      }
      case 'wound': {
        stroke(t, s, 0.25, red);
        stroke(t, s, 0.075, '#351c2e');
        for (const p of t.stitches) {
          meshes.thread.line(
            [point([p[0] - 0.13, p[1] - 0.25], s, 0.09), point([p[0] + 0.13, p[1] + 0.25], s, 0.09)],
            0.042,
            '#223d49',
          );
          meshes.thread.ball(p[0], fieldHeight(p[0], p[1], s) + 0.075, p[1], 0.06, 0.045, 0.06, '#223d49', 8);
        }
        const total = pathLength(t.path),
          next = pathAt(t.path, Math.min(total - 0.1, t.stitches.length * 0.45 + 0.05));
        meshes.glow.ring(next[0], fieldHeight(...next, s) + 0.075, next[1], 0.31, 0.033, '#8ff1d5');
        break;
      }
      case 'incision':
      case 'mass': {
        if (t.kind === 'mass') meshes.wet.ball(t.x, h + 0.16, t.z, 1.08, 0.45, 0.85, t.dose ? '#7b5a74' : '#b6a2b6');
        stroke(t, s, 0.15, '#103f49', 0, pathLength(t.path), true);
        stroke(t, s, 0.055, '#a8f8df', t.progress, pathLength(t.path), true);
        if (t.progress > 0) stroke(t, s, 0.16, red, 0, t.progress);
        const next = pathAt(t.path, t.progress);
        meshes.glow.ring(next[0], fieldHeight(...next, s) + 0.08, next[1], 0.15, 0.045, '#e3fff1');
        break;
      }
      case 'shard': {
        meshes.steel.tri(
          [t.x - 0.22, h, t.z + 0.32],
          [t.x + 0.24, h + 0.16, t.z + 0.12],
          [t.x + 0.02, h + 0.75, t.z - 0.28],
          '#d4f4ef',
        );
        meshes.glow.line(
          [
            [t.x - 0.24, h + 0.02, t.z + 0.3],
            [t.x + 0.02, h + 0.78, t.z - 0.28],
          ],
          0.025,
          '#ecfff2',
        );
        break;
      }
      case 'bleeder':
      case 'nodule': {
        meshes.wet.ball(t.x, h + 0.1, t.z, 0.18, 0.2, 0.19, '#bc5360');
        meshes.glow.ring(t.x, h + 0.04, t.z, 0.3, 0.032, '#f0bd75');
        break;
      }
      case 'abrasion':
      case 'numb': {
        const col = t.kind === 'numb' ? '#7296ad' : '#d6b2ab';
        if (t.path.length) {
          stroke(t, s, 0.16, col);
          if (t.progress > 0) stroke(t, s, 0.21, '#93cfc0', 0, pathLength(t.path) * Math.min(1, t.progress));
        } else {
          meshes.wet.disc(t.x, h, t.z, t.radius, t.radius * 0.7, col);
          meshes.glow.ring(t.x, h + 0.035, t.z, t.radius + 0.1, 0.025, '#9cddce');
        }
        break;
      }
      case 'flap': {
        const lift = t.lift * 1.65,
          back = t.z - 0.2,
          front = t.z + 1.7 * Math.cos(lift);
        meshes.wet.quad(
          [t.x - 1.3, h, back],
          [t.x - 1.3, h + Math.sin(lift) * 1.7, front],
          [t.x + 1.3, h + Math.sin(lift) * 1.7, front],
          [t.x + 1.3, h, back],
          '#bd8a81',
        );
        meshes.glow.ring(t.x, h + 0.13, t.z, 0.22, 0.055, '#f4d695');
        if (t.clip > s.fieldTicks) meshes.steel.ball(t.x + 1.2, h + 1.5, back, 0.17, 0.07, 0.2, '#d5d7bc');
        break;
      }
      case 'balm': {
        for (let x = -t.radius; x < t.radius; x += 0.5)
          for (let z = -t.radius; z < t.radius; z += 0.5)
            if (
              x * x + z * z < t.radius * t.radius &&
              (((Math.floor(x * 2) * 17 + Math.floor(z * 2) * 31 + t.id) % 7) + 7) % 7 < 6
            ) {
              const px = t.x + x,
                pz = t.z + z,
                ph = fieldHeight(px, pz, s) + 0.045;
              meshes.thread.quad(
                [px, ph, pz],
                [px, ph, pz + 0.44],
                [px + 0.44, ph, pz + 0.44],
                [px + 0.44, ph, pz],
                '#c5d4bd',
              );
            }
        break;
      }
      case 'tendril': {
        const points = Array.from({ length: 20 }, (_, i) => {
          const f = i / 19;
          return point([t.x * f + Math.sin(f * 6 + time) * 0.15, t.z * f], s, 0.15);
        });
        meshes.wet.line(points, 0.15, '#d9c189');
        meshes.glow.ring(t.x, h + 0.05, t.z, 0.25, 0.04, '#f5e4a8');
        break;
      }
      case 'binder':
      case 'node': {
        meshes.wet.ball(
          t.x,
          h + 0.2,
          t.z,
          t.kind === 'node' ? 0.7 : 0.25,
          0.45,
          t.kind === 'node' ? 0.7 : 0.25,
          '#d5dabe',
        );
        meshes.glow.ring(t.x, h + 0.1, t.z, t.kind === 'node' ? 0.85 : 0.4, 0.055, '#f4dc9c');
        for (let i = 0; i < t.dose; i++)
          meshes.glow.ball(t.x - 0.15 + i * 0.3, h + 0.7, t.z, 0.08, 0.08, 0.08, '#ffdf82');
        break;
      }
      case 'reverie':
      case 'decoy': {
        if (t.kind === 'reverie' && buried) break;
        meshes.wet.ball(t.x, h + 0.22, t.z, 0.6, 0.26, 0.45, t.kind === 'decoy' ? '#8c88b4' : '#778cce');
        meshes.glow.ring(t.x, h + 0.12, t.z, 0.8, 0.035, '#a9d8e7');
        break;
      }
      case 'mote': {
        meshes.glow.ball(t.x, h + 0.4 + Math.sin(time * 3 + t.id) * 0.09, t.z, 0.17, 0.22, 0.17, '#fff1be');
        meshes.glow.ring(t.x, h + 0.06, t.z, 0.28, 0.025, '#ead6a0');
        break;
      }
      case 'cocoon': {
        meshes.wet.ball(t.x, h + 0.12, t.z, 0.4, 0.22, 0.27, '#8b76a2');
        meshes.glow.ring(t.x, h + 0.02, t.z, 0.5, 0.025, '#c7b6df');
        break;
      }
      default: {
        let blob = blobs.get(t.id);
        if (!blob) {
          blob = new Blob();
          blobs.set(t.id, blob);
        }
        blob.step({ squash: Math.sin(time * 3 + t.id) * 0.1, squint: t.progress > 0 });
        const squash = blob.state.squash;
        const r = t.kind === 'mercy' ? 1.35 : t.kind === 'matron' ? 1.2 : t.kind === 'solace' ? t.radius : 0.48,
          col = t.kind === 'mercy' ? '#eee3bc' : t.kind === 'solace' ? '#d6a24d' : '#b69acb';
        meshes.wet.ball(t.x, h + r * 0.6, t.z, r * (1 + squash * 0.05), r * 0.7 * (1 - squash * 0.05), r * 0.72, col);
        for (const sign of [-1, 1]) {
          meshes.wet.ball(t.x + sign * r * 0.31, h + r * 0.92, t.z - r * 0.5, r * 0.13, r * 0.13, r * 0.08, '#312a46');
          meshes.glow.ball(
            t.x + sign * r * 0.32,
            h + r * 0.98,
            t.z - r * 0.56,
            r * 0.05,
            r * 0.05,
            r * 0.03,
            '#edffdd',
          );
        }
        if (t.kind === 'solace')
          for (const sign of [-1, 1])
            meshes.wet.ball(t.x + sign * r * 0.9, h + r * 0.4, t.z, r * 0.5, r * 0.11, r * 0.3, col);
        if (t.kind === 'matron' && (s.fieldTicks - t.born) % 48000 < 15000)
          meshes.wet.ball(t.x, h + 0.9, t.z - 0.8, 0.36, 0.3, 0.1, '#49304f');
        if (t.kind === 'mercy') {
          for (let i = 0; i < 3; i++) meshes.glow.ring(t.x, h + 0.4 + i * 0.3, t.z, 1.6 + i * 0.15, 0.024, '#eadca8');
        }
      }
    }
  }
}
