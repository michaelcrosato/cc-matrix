/**
 * @file The living sheet and the glove. A kit box lends its geometry class. The page keeps the buffers and rewrites
 * them every frame. Ninety-six by sixty, not the plan's three hundred and twenty by one hundred and ninety-two:
 * four software-rendered copies of the denser grid were killed for memory on this machine.
 */
import { boxGeometry, defineGeometry, defineMaterial } from '../../../../engine';
import type { Op } from '../../op/types';

/** Columns of quads across the sheet. */
export const COLS = 96;
/** Rows of quads down the sheet. */
export const ROWS = 60;
/** Half-width of the sheet, metres. Cursors clamp to this. */
export const HALF_X = 8;
/** Half-depth of the sheet, metres. */
export const HALF_Z = 5;

/** Vertices across, including the last edge. */
const VX = COLS + 1;
/** Vertices down. */
const VZ = ROWS + 1;
/** Sheet vertices. The glove is a second geometry. */
const SHEET = VX * VZ;

/** A buffer geometry, as much of it as this file uses. three.js stays inside the engine. */
interface Mesh {
  setAttribute(name: string, attribute: unknown): void;
  setIndex(index: number[]): void;
  getAttribute(name: string): { array: Float32Array; needsUpdate: boolean };
  computeVertexNormals(): void;
}

/** The attribute class taken from a kit box. */
interface AttributeCtor {
  new (array: Float32Array, size: number): unknown;
}

const sample = boxGeometry({ width: 1, height: 1, depth: 1 });
const Geometry = sample.constructor as new () => Mesh;
const Attribute = sample.getAttribute('position').constructor as AttributeCtor;

/** The sheet, once the builder has run. */
let sheet: Mesh | null = null;
/** The glove, once the builder has run. */
let glove: Mesh | null = null;

/** Grid index. */
function at(x: number, z: number): number {
  return z * VX + x;
}

/** Build the sheet once, at its full extent, so the cull box covers every later height. */
function buildSheet(): Mesh {
  const position = new Float32Array(SHEET * 3);
  const color = new Float32Array(SHEET * 3);
  const uv = new Float32Array(SHEET * 2);
  for (let z = 0; z < VZ; z++) {
    for (let x = 0; x < VX; x++) {
      const i = at(x, z);
      position[i * 3] = -HALF_X + (x / COLS) * HALF_X * 2;
      position[i * 3 + 1] = 0.4;
      position[i * 3 + 2] = -HALF_Z + (z / ROWS) * HALF_Z * 2;
      uv[i * 2] = x / COLS;
      uv[i * 2 + 1] = z / ROWS;
      color[i * 3] = 0.72;
      color[i * 3 + 1] = 0.28;
      color[i * 3 + 2] = 0.3;
    }
  }
  const index: number[] = [];
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const a = at(x, z);
      index.push(a, a + VX, a + 1, a + 1, a + VX, a + VX + 1);
    }
  }
  const mesh = new Geometry();
  mesh.setAttribute('position', new Attribute(position, 3));
  mesh.setAttribute('normal', new Attribute(new Float32Array(SHEET * 3), 3));
  mesh.setAttribute('color', new Attribute(color, 3));
  mesh.setAttribute('uv', new Attribute(uv, 2));
  mesh.setIndex(index);
  mesh.computeVertexNormals();
  sheet = mesh;
  return mesh;
}

/** A small glove: a palm, a thumb, and a tool, twelve triangles, four seats packed end to end. */
function buildGlove(): Mesh {
  const count = 4 * 16;
  const mesh = new Geometry();
  mesh.setAttribute('position', new Attribute(new Float32Array(count * 3), 3));
  mesh.setAttribute('normal', new Attribute(new Float32Array(count * 3), 3));
  mesh.setAttribute('color', new Attribute(new Float32Array(count * 3), 3));
  mesh.setAttribute('uv', new Attribute(new Float32Array(count * 2), 2));
  const index: number[] = [];
  for (let s = 0; s < 4; s++) {
    const b = s * 16;
    index.push(b, b + 1, b + 2, b, b + 2, b + 3);
    index.push(b + 4, b + 5, b + 6, b + 4, b + 6, b + 7);
    index.push(b + 8, b + 9, b + 10, b + 8, b + 10, b + 11);
  }
  mesh.setIndex(index);
  glove = mesh;
  return mesh;
}

defineGeometry('geometry:sheet', {
  description: 'The operation sheet, a grid the page rewrites every frame.',
  budget: 200000,
  create: () => buildSheet() as never,
});

defineGeometry('geometry:cursor', {
  description: 'Four gloved hands. The page moves the vertices onto the cursors.',
  budget: 4000,
  create: () => buildGlove() as never,
});

defineMaterial('material:tissue', {
  color: '#ffffff',
  roughness: 0.32,
  metalness: 0.04,
  vertexColors: true,
});

defineMaterial('material:glove', {
  color: '#ffffff',
  roughness: 0.55,
  vertexColors: true,
});

/** Blood colour from the display setting. */
function bloodOf(mode: string): [number, number, number] {
  if (mode === 'teal') return [0.15, 0.45, 0.48];
  if (mode === 'off') return [0.35, 0.32, 0.3];
  return [0.45, 0.05, 0.08];
}

/** Tissue colour at a sheet point, before blood and burns. */
function tissue(x: number, z: number): [number, number, number] {
  const organ = Math.hypot(x * 0.55, z) < 2.2;
  const vein = Math.abs(z - Math.sin(x * 1.3) * 0.35) < 0.08;
  if (vein) return [0.55, 0.16, 0.22];
  if (organ) return [0.78, 0.36, 0.34];
  return [0.86, 0.62, 0.52];
}

/** Write one glove quad in local sheet space. */
function quad(
  array: Float32Array,
  base: number,
  x: number,
  z: number,
  w: number,
  d: number,
  y: number,
  rgb: [number, number, number],
  colors: Float32Array,
): void {
  const corners = [
    [x - w, z - d],
    [x + w, z - d],
    [x + w, z + d],
    [x - w, z + d],
  ];
  for (let i = 0; i < 4; i++) {
    const v = base + i;
    array[v * 3] = corners[i][0];
    array[v * 3 + 1] = y;
    array[v * 3 + 2] = corners[i][1];
    colors[v * 3] = rgb[0];
    colors[v * 3 + 1] = rgb[1];
    colors[v * 3 + 2] = rgb[2];
  }
}

/** A glove drawn now, ahead of the sim when the local cursor leads. */
export interface GloveAt {
  x: number;
  z: number;
}

/** Rewrite the sheet and the gloves from the operation. Missing meshes wait until the builder runs. */
export function paintField(op: Op | null, time: number, bloodMode: string, gloves?: readonly GloveAt[]): void {
  if (sheet) paintSheet(sheet, op, time, bloodOf(bloodMode));
  if (glove) paintGlove(glove, op, gloves);
}

/** Heights and colours of the sheet. */
function paintSheet(mesh: Mesh, op: Op | null, time: number, blood: [number, number, number]): void {
  const position = mesh.getAttribute('position');
  const color = mesh.getAttribute('color');
  const pos = position.array;
  const col = color.array;
  const breath = Math.sin(time * 1.4) * 0.012;
  const beat = Math.pow(Math.max(0, Math.sin(time * 6.2)), 18) * 0.03;
  const targets = op?.targets.filter((target) => !target.done && target.site === (op.seats[0]?.site ?? 0)) ?? [];
  for (let i = 0; i < SHEET; i++) {
    const x = pos[i * 3];
    const z = pos[i * 3 + 2];
    let y = breath + beat * Math.exp(-Math.hypot(x, z) * 0.8);
    let rgb = tissue(x, z);
    for (const target of targets) {
      const dx = x - target.x;
      const dz = z - target.z;
      const dist = Math.hypot(dx, dz);
      if (target.kind === 'pool' && dist < 0.35 + target.volume * 0.15) {
        y -= 0.02;
        rgb = blood;
      } else if ((target.kind === 'wound' || target.kind === 'guide') && dist < 0.18) {
        y += 0.03;
        rgb = [rgb[0] * 0.7, rgb[1] * 0.55, rgb[2] * 0.55];
      } else if (target.kind === 'reverie' && dist < target.radius + 0.2) {
        y += Math.sin(time * 3 + dist * 6) * 0.015;
        rgb = [0.55, 0.62, 0.78];
      } else if (target.burn > 0 && dist < 0.3) {
        rgb = [0.25, 0.18, 0.14];
      }
    }
    pos[i * 3 + 1] = y;
    col[i * 3] = rgb[0];
    col[i * 3 + 1] = rgb[1];
    col[i * 3 + 2] = rgb[2];
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
  mesh.computeVertexNormals();
}

/** Gloves follow the seats, or the local cursors when the page passes them. An empty seat is parked under the floor. */
function paintGlove(mesh: Mesh, op: Op | null, gloves?: readonly GloveAt[]): void {
  const position = mesh.getAttribute('position');
  const color = mesh.getAttribute('color');
  const pos = position.array;
  const col = color.array;
  const tints: [number, number, number][] = [
    [0.92, 0.93, 0.9],
    [0.95, 0.78, 0.55],
    [0.7, 0.82, 0.95],
    [0.82, 0.7, 0.9],
  ];
  for (let s = 0; s < 4; s++) {
    const seat = gloves?.[s] ?? op?.seats[s];
    const base = s * 16;
    if (!seat) {
      quad(pos, base, 0, 0, 0.01, 0.01, -4, tints[s], col);
      quad(pos, base + 4, 0, 0, 0.01, 0.01, -4, tints[s], col);
      quad(pos, base + 8, 0, 0, 0.01, 0.01, -4, [0.7, 0.75, 0.78], col);
      continue;
    }
    quad(pos, base, seat.x, seat.z, 0.16, 0.12, 0.08, tints[s], col);
    quad(pos, base + 4, seat.x - 0.14, seat.z + 0.08, 0.05, 0.07, 0.09, tints[s], col);
    quad(pos, base + 8, seat.x + 0.05, seat.z - 0.16, 0.03, 0.16, 0.1, [0.75, 0.78, 0.8], col);
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
  mesh.computeVertexNormals();
}
