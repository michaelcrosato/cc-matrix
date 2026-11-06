/** @file Live public-API geometry buffers; page animation changes presentation without touching the simulation. */
import { boxGeometry, defineGeometry, Color } from '../../../../engine';
export type V3 = [number, number, number];
type Geo = ReturnType<typeof boxGeometry>;
const sample = boxGeometry();
const Geometry = sample.constructor as new () => Geo;
const Attribute = sample.getAttribute('position').constructor as new (
  a: Float32Array,
  n: number,
) => ReturnType<Geo['getAttribute']>;
const colors = new Map<string, V3>();
export function rgb(hex: string): V3 {
  let c = colors.get(hex);
  if (!c) {
    const v = new Color(hex);
    c = [v.r, v.g, v.b];
    colors.set(hex, c);
  }
  return c;
}
export const sheetResolution = { x: 320, z: 192 };
const gridIndices = (nx: number, nz: number): number[] => {
  const out: number[] = [],
    row = nx + 1;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * row + i,
        b = a + 1,
        c = a + row;
      out.push(a, c, b, b, c, c + 1);
    }
  return out;
};
export class LiveMesh {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
  geometry: Geo | null = null;
  count = 0;
  readonly id: string;
  readonly capacity: number;
  constructor(id: string, capacity = 150000) {
    this.id = id;
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.normals = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.uvs = new Float32Array(capacity * 2);
    for (let i = 0; i < capacity; i++) this.normals[i * 3 + 1] = 1;
    this.positions.set([-24, -2, -18, 24, 8, 18, 24, 8, 18]);
    defineGeometry(`geometry:live-${id}`, {
      description: `Animated ${id} buffer owned by the surgical view.`,
      budget: capacity,
      create: () => {
        const g = new Geometry();
        g.setAttribute('position', new Attribute(this.positions, 3));
        g.setAttribute('normal', new Attribute(this.normals, 3));
        g.setAttribute('color', new Attribute(this.colors, 3));
        g.setAttribute('uv', new Attribute(this.uvs, 2));
        this.uvs = g.getAttribute('uv').array as Float32Array;
        this.positions = g.getAttribute('position').array as Float32Array;
        this.normals = g.getAttribute('normal').array as Float32Array;
        this.colors = g.getAttribute('color').array as Float32Array;
        if (id === 'sheet') g.setIndex(gridIndices(sheetResolution.x, sheetResolution.z));
        g.computeBoundingSphere();
        this.geometry = g;
        return g;
      },
    });
  }
  clear(): void {
    this.count = 0;
  }
  tri(a: V3, b: V3, c: V3, color: string): void {
    if (this.count + 3 > this.capacity) return;
    const tone = rgb(color),
      ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2],
      vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2],
      nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx,
      length = Math.hypot(nx, ny, nz) || 1;
    for (const p of [a, b, c]) {
      const i = this.count++ * 3;
      this.positions.set(p, i);
      this.normals.set([nx / length, ny / length, nz / length], i);
      this.colors.set(tone, i);
    }
  }
  quad(a: V3, b: V3, c: V3, d: V3, color: string): void {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }
  disc(x: number, y: number, z: number, rx: number, rz: number, color: string, time = 0): void {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2,
        b = ((i + 1) / 48) * Math.PI * 2,
        r1 = 1 + Math.sin(a * 7 + time) * 0.035,
        r2 = 1 + Math.sin(b * 7 + time) * 0.035;
      this.tri(
        [x, y, z],
        [x + Math.cos(b) * rx * r2, y, z + Math.sin(b) * rz * r2],
        [x + Math.cos(a) * rx * r1, y, z + Math.sin(a) * rz * r1],
        color,
      );
    }
  }
  ring(x: number, y: number, z: number, r: number, width: number, color: string, fraction = 1): void {
    const count = Math.ceil(64 * fraction);
    for (let i = 0; i < count; i++) {
      const a = (i / 64) * Math.PI * 2,
        b = ((i + 1) / 64) * Math.PI * 2;
      this.quad(
        [x + Math.cos(a) * r, y, z + Math.sin(a) * r],
        [x + Math.cos(b) * r, y, z + Math.sin(b) * r],
        [x + Math.cos(b) * (r - width), y, z + Math.sin(b) * (r - width)],
        [x + Math.cos(a) * (r - width), y, z + Math.sin(a) * (r - width)],
        color,
      );
    }
  }
  ball(x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string, detail = 18): void {
    const p = (a: number, b: number): V3 => [
      x + Math.cos(a) * Math.sin(b) * rx,
      y + Math.cos(b) * ry,
      z + Math.sin(a) * Math.sin(b) * rz,
    ];
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < detail; i++) {
        const a = (i / detail) * Math.PI * 2,
          b = ((i + 1) / detail) * Math.PI * 2,
          c = (j / 10) * Math.PI,
          d = ((j + 1) / 10) * Math.PI;
        this.quad(p(a, c), p(b, c), p(b, d), p(a, d), color);
      }
  }
  line(points: V3[], width: number, color: string): void {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        dx = b[0] - a[0],
        dz = b[2] - a[2],
        l = Math.hypot(dx, dz) || 1,
        nx = ((-dz / l) * width) / 2,
        nz = ((dx / l) * width) / 2;
      this.quad(
        [a[0] + nx, a[1], a[2] + nz],
        [b[0] + nx, b[1], b[2] + nz],
        [b[0] - nx, b[1], b[2] - nz],
        [a[0] - nx, a[1], a[2] - nz],
        color,
      );
    }
  }
  commit(): void {
    if (!this.geometry) return;
    for (const name of ['position', 'normal', 'color', 'uv']) this.geometry.getAttribute(name).needsUpdate = true;
    this.geometry.setDrawRange(0, this.count);
  }
}
export const meshes = {
  sheet: new LiveMesh('sheet', 63000),
  wet: new LiveMesh('wet', 100000),
  thread: new LiveMesh('thread', 100000),
  glow: new LiveMesh('glow', 75000),
  steel: new LiveMesh('steel', 45000),
  glove: new LiveMesh('glove', 45000),
};

/** A software-adapter session keeps its world identical while drawing a smaller tissue grid. */
export function softwareSessionSheet(): void {
  sheetResolution.x = 96;
  sheetResolution.z = 58;
  const index = meshes.sheet.geometry?.getIndex();
  if (index) {
    index.array.fill(0);
    index.array.set(gridIndices(96, 58));
    index.needsUpdate = true;
  }
}
