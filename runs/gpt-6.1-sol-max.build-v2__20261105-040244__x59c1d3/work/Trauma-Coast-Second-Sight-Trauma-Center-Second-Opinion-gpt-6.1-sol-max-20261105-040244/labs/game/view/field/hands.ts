/** @file Gloved hands, steel instruments, spring-lag handovers and tool contact effects. */
import type { Operation, Seat } from '../../data/types';
import { meshes, type V3 } from './liveMesh';
import { fieldHeight } from './sheet';
const positions = new Map<number, { x: number; z: number; tool: number; swap: number }>();
export const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
export function drawHands(s: Operation, dt: number): void {
  const site = s.seats[0].site;
  if (s.code) {
    for (const side of [-1, 1]) {
      const x = side * 2,
        z = 1,
        h = fieldHeight(x, z, s);
      meshes.steel.ball(x, h + 0.15, z, 0.65, 0.15, 0.8, '#bdd2d3');
      meshes.glove.ball(x, h + 0.48, z + 0.3, 0.4, 0.25, 0.6, '#d4e2d7');
      meshes.steel.line(
        [
          [x, h + 0.4, z],
          [x, h + 0.5, z + 0.7],
        ],
        0.17,
        '#35555f',
      );
      meshes.glow.ring(x, h + 0.07, z, 0.88, 0.035, '#f2ce8c');
    }
    return;
  }
  for (const p of s.seats) {
    if (!p.active || p.site !== site) continue;
    drawHand(s, p, dt);
  }
}
function drawHand(s: Operation, p: Seat, dt: number): void {
  let lag = positions.get(p.id);
  if (!lag) {
    lag = { x: p.x, z: p.z, tool: p.tool, swap: 0 };
    positions.set(p.id, lag);
  }
  if (lag.tool !== p.tool) {
    lag.swap = 0.15;
    lag.tool = p.tool;
  }
  lag.swap = Math.max(0, lag.swap - dt);
  lag.x += (p.x - lag.x) * Math.min(1, dt * 24);
  lag.z += (p.z - lag.z) * Math.min(1, dt * 24);
  const x = lag.x,
    z = lag.z,
    h = fieldHeight(x, z, s),
    tremble = Math.min(...s.patients) < 25 ? Math.sin(s.tick * 2.3) * 0.025 : 0,
    y = h + 0.55 + lag.swap * 3;
  const skin = p.id === 0 ? '#d6e7e0' : p.id === 1 ? '#adc5e7' : p.id === 2 ? '#b4d5bc' : '#e4d8ad';
  const steel = '#bacfd5',
    dark = '#445e67',
    g = meshes.glove,
    m = meshes.steel;
  g.ball(x + 0.65 + tremble, y, z + 0.92, 0.34, 0.19, 0.53, skin);
  g.ball(x + 0.98, y + 0.11, z + 1.52, 0.27, 0.23, 0.68, skin);
  g.ball(x + 1.12, y + 0.12, z + 1.9, 0.31, 0.28, 0.22, '#244b53');
  for (let i = 0; i < 4; i++)
    g.ball(x + 0.24 + i * 0.15, y - 0.02, z + 0.55 + (i % 2) * 0.04, 0.09, 0.1, 0.29, skin, 10);
  g.ball(x + 0.3, y + 0.04, z + 0.98, 0.13, 0.14, 0.28, skin, 10);
  const tip: V3 = [p.x, h + 0.08, p.z],
    grip: V3 = [x + 0.47, y, z + 0.6];
  if (p.tool === 0) {
    m.line([tip, grip], 0.075, steel);
    m.line([[x + 0.18, y - 0.05, z + 0.22], grip], 0.11, dark);
    m.tri(tip, [p.x - 0.09, h + 0.13, p.z + 0.36], [p.x + 0.08, h + 0.17, p.z + 0.37], '#e5ece9');
  }
  if (p.tool === 1) {
    for (const sign of [-1, 1]) m.line([tip, [x + 0.12 + sign * 0.1, y - 0.07, z + 0.26], grip], 0.045, steel);
  }
  if (p.tool === 2) {
    const needle: V3[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 19) * Math.PI;
      needle.push([p.x + Math.cos(a) * 0.18, h + 0.1 + Math.sin(a) * 0.18, p.z]);
    }
    m.line(needle, 0.035, steel);
    meshes.thread.line([tip, [x + 0.4, y + 0.15, z + 0.6], [x + 1.1, y + 0.3, z + 1]], 0.024, '#214753');
  }
  if (p.tool === 3) {
    m.line([tip, grip, [x + 1.3, y + 0.3, z + 2]], 0.09, '#8cbbba');
    m.ball(x + 0.45, y, z + 0.6, 0.13, 0.11, 0.27, dark);
  }
  if (p.tool === 4) {
    m.line([[p.x, h + 0.27, p.z + 0.18], grip], 0.12, dark);
    if (p.held) meshes.glow.line([tip, [p.x, h + 0.4, p.z + 0.2]], 0.04, '#ffdc9a');
  }
  if (p.tool === 5) {
    m.line([tip, grip], 0.04, steel);
    g.ball(x + 0.34, y - 0.12, z + 0.4, 0.1, 0.1, 0.3, '#e4e5ca');
    meshes.glow.line(
      [
        [x + 0.33, y - 0.1, z + 0.25],
        [x + 0.42, y - 0.03, z + 0.5],
      ],
      0.035,
      p.charge >= 0.75 && p.charge <= 0.95 ? '#99f1ac' : '#d7bb74',
    );
  }
  if (p.tool === 6) {
    m.line([tip, grip], 0.12, '#9bbac4');
    if (p.held) meshes.glow.disc(p.x, h + 0.06, p.z, 0.65, 0.5, '#9fc7b9', s.tick * 0.02);
  }
  if (p.tool === 7) {
    m.ball(x + 0.16, y - 0.18, z + 0.2, 0.27, 0.11, 0.2, dark);
    if (p.held) meshes.glow.ring(p.x, h + 0.065, p.z, ((s.tick % 90) / 90) * 3, 0.025, '#98d5e6');
  }
  const color = p.id === 0 ? '#b2ffe7' : SEAT_COLORS[p.id];
  meshes.glow.ring(p.x, h + 0.095, p.z, 0.24, 0.038, '#123e48');
  meshes.glow.ring(p.x, h + 0.105, p.z, 0.2, 0.024, color);
  for (const sign of [-1, 1]) {
    meshes.glow.line(
      [
        [p.x + sign * 0.29, h + 0.1, p.z],
        [p.x + sign * 0.39, h + 0.1, p.z],
      ],
      0.022,
      color,
    );
    meshes.glow.line(
      [
        [p.x, h + 0.1, p.z + sign * 0.29],
        [p.x, h + 0.1, p.z + sign * 0.39],
      ],
      0.022,
      color,
    );
  }
}
