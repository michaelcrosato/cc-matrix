/** @file Compose the live operating diorama once per drawn engine frame. */
import type { Operation } from '../../data/types';
import { meshes } from './liveMesh';
import { drawSheet, fieldHeight } from './sheet';
import { drawTargets } from './targets';
import { drawHands } from './hands';
export function drawField(
  s: Operation,
  dt: number,
  blood: string,
  debug: { shapes: boolean; assist: boolean; path: number[][] } = { shapes: false, assist: false, path: [] },
): void {
  for (const m of Object.values(meshes)) m.clear();
  drawSheet(s, blood);
  const vessels = [
    [-6, -1, -3, -0.5, 0, 1, 3, 0.6, 6, 2],
    [-4, 2, -2, 1, 0, 1.1, 2, -1, 5, -2.3],
    [-1, -3, -0.8, -1, 0, 1, 1, 2, 2, 3],
  ];
  for (const path of vessels) {
    const points: [number, number, number][] = [];
    for (let j = 2; j < path.length; j += 2)
      for (let i = 0; i < 20; i++) {
        const u = i / 20,
          x = path[j - 2] * (1 - u) + path[j] * u,
          z = path[j - 1] * (1 - u) + path[j + 1] * u;
        points.push([x, fieldHeight(x, z, s) + 0.016, z]);
      }
    meshes.wet.line(points, 0.055, '#81485b');
  }
  drawTargets(s, blood);
  if (s.status === 'won') {
    const h = fieldHeight(0, 0, s) + 0.12;
    meshes.glove.quad([-2, h, -1], [-2, h, 1], [2, h, 1], [2, h, -1], '#d8dccb');
    for (let i = 0; i < 9; i++)
      meshes.thread.line(
        [
          [-1 + i * 0.25, h + 0.01, -0.8],
          [-1 + i * 0.25, h + 0.01, 0.8],
        ],
        0.025,
        '#a4b2a7',
      );
  }
  drawHands(s, dt);
  if (debug.shapes)
    for (const t of s.targets)
      if (!t.done && t.site === s.seats[0].site) {
        meshes.glow.ring(t.x, fieldHeight(t.x, t.z, s) + 0.12, t.z, t.radius + 0.45, 0.025, '#ffdf8f');
        if (t.path.length)
          meshes.glow.line(
            t.path.map((p) => [p[0], fieldHeight(p[0], p[1], s) + 0.12, p[1]]),
            0.035,
            '#ffdf8f',
          );
      }
  if (debug.assist) {
    const p = s.seats[0];
    meshes.glow.ring(p.x, fieldHeight(p.x, p.z, s) + 0.12, p.z, 0.65, 0.025, '#a4c9ff');
  }
  if (debug.path.length > 1)
    meshes.glow.line(
      debug.path.map((p) => [p[0], fieldHeight(p[0], p[1], s) + 0.14, p[1]]),
      0.055,
      '#ffe4a1',
    );
  if (s.caseId === 'struck-off') {
    const drift = Math.sin(((s.fieldTicks / 6000) * Math.PI * 2) / 7) * 0.4;
    for (const sign of [-1, 1])
      meshes.steel.line(
        [
          [sign * 8 + drift, 0.3, 2],
          [sign * 8.4 + drift, 0.3, 3],
        ],
        0.07,
        '#d9e2d4',
      );
  }
  for (const m of Object.values(meshes)) if (m.id !== 'sheet') m.commit();
}
