import { PALETTE, THREE, Terrain, createNoise, toonMaterial } from '../../pixel-engine.js';
import { RIVER, ROADS, distToPoly, nearRiver, nearRoad } from '../content/roads.js';
import { SITES } from '../content/sites.js';
import { FIRE_CELL, FIRE_N, FIRE_ORIGIN } from './fire.js';

const { Color, Mesh, BoxGeometry } = THREE;

export function heightFn(seed) {
  const n = createNoise(seed);
  const fbm = (x, z, f) => n.fbm2(x * f, z * f, { octaves: 3 });
  return (x, z) => {
    let h = 40 + 14 * fbm(x, z, 0.0032) + 2.5 * fbm(x, z, 0.02);
    const rd = Math.hypot(x + 130, z + 520);
    if (rd < 260) {
      const t = 1 - rd / 260;
      h += 42 * t * t * (0.55 + 0.45 * n.ridged2(x * 0.008, z * 0.008, { octaves: 2 }));
    }
    if (x < -520) {
      const pass = Math.hypot(x + 590, z + 430);
      const cut = pass < 90 ? pass / 90 : 1;
      h += 30 * Math.min(1, (-520 - x) / 90) * cut;
    }
    const sd = Math.hypot(x - 200, z - 470);
    if (sd < 150) h = h * (sd / 150) + 36 * (1 - sd / 150);
    const md = Math.hypot(x - 150, z + 300);
    if (md < 70) h -= 24 * (1 - md / 70);
    const riverD = distToPoly(x, z, RIVER);
    if (riverD < 7) h -= 3 * (1 - riverD / 7);
    let roadD = 99;
    for (const road of ROADS) {
      const d = distToPoly(x, z, road.pts);
      if (d < roadD) roadD = d;
    }
    if (roadD < 8) h = h * (roadD / 8) + (h - 0.4) * (1 - roadD / 8);
    for (const s of SITES) {
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < 18) h = h * (d / 18) + h * (1 - d / 18);
    }
    return h;
  };
}

export function buildLand(ctx, seed) {
  const sample = heightFn(seed);
  const land = new Terrain({
    size: [1280, 1280],
    cells: [512, 512],
    at: [0, 0, 0],
    bands: [
      { below: 34, color: PALETTE.teal },
      { below: 42, color: PALETTE.sand },
      { below: 55, color: PALETTE.orange },
      { below: 80, color: PALETTE.plum },
    ],
    steep: 0.62,
    rock: PALETTE.plum,
  });
  land.generate(sample);
  land.attach(ctx.physics);
  ctx.scene.add(land.mesh);
  const heights = sample;
  paint(land, heights);
  return { land, heights };
}

function paint(land, heights) {
  const col = land.mesh.geometry.getAttribute('color');
  const nx = land.nx;
  const nz = land.nz;
  const sand = new Color(PALETTE.sand);
  const orange = new Color(PALETTE.orange);
  const red = new Color(PALETTE.red);
  const plum = new Color(PALETTE.plum);
  const white = new Color(PALETTE.white);
  const green = new Color(PALETTE.green);
  const teal = new Color(PALETTE.teal);
  const base = new Uint8Array(nx * nz * 3);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = land.pointX(ix);
      const z = land.pointZ(iz);
      const h = heights(x, z);
      let c = orange;
      if (nearRiver(x, z, 10)) c = teal;
      else if (Math.hypot(x - 200, z - 470) < 140 && h < 40) c = white;
      else if (nearRoad(x, z, 6)) c = red;
      else if (h > 62) c = plum;
      else if (x > 200 && z < 200 && z > -100) c = green;
      else c = sand;
      const bi = (ix + iz * nx) * 3;
      base[bi] = Math.round(c.r * 255);
      base[bi + 1] = Math.round(c.g * 255);
      base[bi + 2] = Math.round(c.b * 255);
      const vi = 6 * (ix + iz * nx);
      for (let k = 0; k < 6; k++) col.setXYZ(vi + k, c.r, c.g, c.b);
    }
  }
  col.needsUpdate = true;
  land.userData = { base };
  return base;
}

export function paintScar(land, ix, iz) {
  const col = land.mesh.geometry.getAttribute('color');
  const x = FIRE_ORIGIN + (ix + 0.5) * FIRE_CELL;
  const z = FIRE_ORIGIN + (iz + 0.5) * FIRE_CELL;
  const nx = land.nx;
  const [cw, ch] = land.cell;
  const x0 = land.pointX(0);
  const z0 = land.pointZ(0);
  const tx0 = Math.max(0, Math.floor((x - FIRE_CELL - x0) / cw));
  const tz0 = Math.max(0, Math.floor((z - FIRE_CELL - z0) / ch));
  const tx1 = Math.min(nx - 1, Math.ceil((x + FIRE_CELL - x0) / cw));
  const tz1 = Math.min(land.nz - 1, Math.ceil((z + FIRE_CELL - z0) / ch));
  const ink = new Color(PALETTE.ink);
  const slate = new Color(PALETTE.slate);
  for (let tz = tz0; tz <= tz1; tz++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const vi = 6 * (tx + tz * nx);
      const c = ((tx + tz) & 1) ? ink : slate;
      for (let k = 0; k < 6; k++) col.setXYZ(vi + k, c.r, c.g, c.b);
    }
  }
  col.needsUpdate = true;
}

export function fuelAt(x, z, heights) {
  if (nearRiver(x, z, 9)) return 0;
  if (nearRoad(x, z, 7)) return 0;
  if (Math.hypot(x - 200, z - 470) < 130) return 0;
  const h = heights(x, z);
  if (h > 68) return 0;
  if (Math.hypot(x - 150, z + 300) < 40) return 0;
  if (x > 180 && z > -160 && z < 80) return 2;
  return 1;
}

export function fillFuel(fire, heights) {
  for (let iz = 0; iz < FIRE_N; iz++) {
    for (let ix = 0; ix < FIRE_N; ix++) {
      const [x, z] = fire.center(ix, iz);
      fire.fuel[fire.idx(ix, iz)] = fuelAt(x, z, heights);
    }
  }
}

export function addBlock(ctx, x, y, z, w, h, d, color) {
  ctx.physics.addStaticBox({ position: [x, y, z], halfExtents: [w / 2, h / 2, d / 2] });
  const mesh = new Mesh(new BoxGeometry(w, h, d), toonMaterial(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return mesh;
}
