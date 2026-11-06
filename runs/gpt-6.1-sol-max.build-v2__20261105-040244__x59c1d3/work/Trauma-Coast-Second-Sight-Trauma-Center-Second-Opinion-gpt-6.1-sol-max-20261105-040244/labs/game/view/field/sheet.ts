/** @file A breathing 3D tissue sheet with organ bulges, vascular relief, cloth folds and submerged ripples. */
import { heartRate } from '../../scenes/op/gift';
import type { Operation } from '../../data/types';
import { getCase } from '../../data/cases';
import { meshes, rgb, sheetResolution, type V3 } from './liveMesh';
const hump = (x: number, z: number, cx: number, cz: number, rx: number, rz: number): number =>
  Math.exp(-(((x - cx) * (x - cx)) / (rx * rx) + ((z - cz) * (z - cz)) / (rz * rz)) * 2);
export function fieldHeight(x: number, z: number, s: Operation): number {
  const t = s.fieldTicks / 6000,
    heart = getCase(s.caseId).field === 'heart';
  let h =
    0.07 * Math.sin(t * 1.5) +
    0.18 * hump(x, z, 0, 0, 7, 4) +
    0.32 * hump(x, z, -2, -0.4, 4, 2.9) +
    0.25 * hump(x, z, 2, 0.6, 3, 2);
  if (heart)
    h +=
      0.55 *
      hump(x, z, 0, 0, 3, 2) *
      (1 + (s.code ? 0 : Math.pow(Math.max(0, Math.cos((t * Math.PI * 2 * heartRate(s)) / 60)), 4)) * 0.18);
  h += 0.025 * Math.sin(x * 4 + Math.sin(z * 3)) * Math.cos(z * 4);
  for (const target of s.targets)
    if (!target.done && target.kind === 'reverie' && target.site === (s.seats[0]?.site ?? 0)) {
      const d = Math.hypot(x - target.x, z - target.z);
      h += Math.exp(-d * d * 3) * 0.24 + Math.sin(d * 12 - t * 9) * Math.exp(-d * 2) * 0.055;
    }
  return h;
}
export function drawSheet(s: Operation, blood = 'red'): void {
  const m = meshes.sheet;
  m.clear();
  const nx = sheetResolution.x,
    nz = sheetResolution.z,
    dx = 20 / nx,
    dz = 12 / nz;
  const at = (x: number, z: number): V3 => {
    const edge = (x * x) / 61 + (z * z) / 15.3,
      cloth = edge > 1;
    const h = cloth
      ? 0.1 + 0.09 * Math.sin(x * 3 + z * 0.7) * Math.cos(z * 2.7) + Math.max(0, Math.abs(x) - 7.8) * 0.07
      : fieldHeight(x, z, s);
    return [x, h, z];
  };
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const x = -10 + i * dx,
        z = -6 + j * dz,
        e = (x * x) / 61 + (z * z) / 15.3,
        cloth = e > 1;
      let color: string;
      if (cloth) {
        const n = Math.sin(x * 2.4 + z) * Math.cos(z * 3.3);
        color = n > 0.45 ? '#2c6464' : n < -0.4 ? '#194647' : '#245758';
      } else {
        const v = Math.sin(x * 1.2 + Math.cos(z * 1.3)) * 0.4 + Math.cos(z * 1.9) * 0.3;
        color = e > 0.91 ? '#c38a76' : v > 0.35 ? '#be827c' : v < -0.3 ? '#8b4b60' : '#b57377';
        if (getCase(s.caseId).field === 'heart') color = v > 0.2 ? '#a34c60' : '#bb6269';
        const vein = Math.abs(Math.sin(x * 1.9 + Math.sin(z * 1.7) * 0.7));
        if (vein < 0.035 && e < 0.8) color = '#704858';
        for (const t of s.targets) {
          if (t.done || t.site !== s.seats[0].site) continue;
          const d = Math.hypot(x - t.x, z - t.z);
          if (t.kind === 'numb' && d < t.radius) color = '#637d93';
          if (t.kind === 'balm' && d < t.radius) {
            const gx = Math.floor(x * 2),
              gz = Math.floor(z * 2);
            if ((((gx * 17 + gz * 31 + t.id) % 7) + 7) % 7 < 6) color = '#c9cdb0';
          }
          if (t.kind === 'pool' && d < t.radius * Math.sqrt(Math.max(0, t.hp)))
            color = blood === 'off' ? '#354c53' : blood === 'teal' ? '#1b6065' : '#6d263d';
        }
      }
      const index = j * (nx + 1) + i;
      m.positions.set(at(x, z), index * 3);
      m.colors.set(rgb(color), index * 3);
      m.uvs.set([x * 0.5, z * 0.5], index * 2);
    }
  m.count = nx * nz * 6;
  m.geometry?.computeVertexNormals();
  m.commit();
}
