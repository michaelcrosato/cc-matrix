// Places. Everything is built from the island's giant equipment and clean white tile.
import { applySky, Boids, GrassField, Mirror, PALETTE, RippleField, setLookLayer, skyAt, THREE, toonMaterial, WAVES_CALM, WaterSurface } from '../../pixel-engine.js';
import { place } from '../art/props.js';
import { floorPlane } from '../art/textures.js';

const { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, DoubleSide, PlaneGeometry } = THREE;

export function box(ctx, w, h, d, at, color, { cast = true, receive = true, collide = false, parent = null } = {}) {
  const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(PALETTE[color]));
  m.position.set(...at);
  m.castShadow = cast;
  m.receiveShadow = receive;
  (parent ?? ctx.scene).add(m);
  if (collide) ctx.physics.addStaticBox({ position: at, halfExtents: [w / 2, h / 2, d / 2] });
  return m;
}

export function setSky(ctx, hour = 11) {
  applySky(ctx.engine, skyAt(hour));
  if (hour > 8 && hour < 16) {
    ctx.scene.background = new Color(PALETTE.sky);
    ctx.engine.sun.intensity = Math.max(ctx.engine.sun.intensity, 2.4);
    ctx.engine.ambient.intensity = Math.max(ctx.engine.ambient.intensity, 1.3);
  }
}

export function sea(ctx, { size = [160, 120], at = [0, -0.5, -60], ripples = false } = {}) {
  const rip = ripples ? new RippleField({ size, cells: [Math.round(size[0] * 3), Math.round(size[1] * 3)], center: [at[0], at[2]] }) : null;
  const water = new WaterSurface({ size, at, waves: WAVES_CALM, segments: rip ? undefined : [40, 30], ripples: rip, deep: PALETTE.blue, shallow: PALETTE.cyan, foam: PALETTE.white });
  ctx.scene.add(water);
  return water;
}

/** Soft light, faked as a slanted ghost of a plane. */
export function sunbeam(ctx, x, z, h = 7, w = 1.1) {
  const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: PALETTE.sand, transparent: true, opacity: 0.1, depthWrite: false, side: DoubleSide }));
  m.position.set(x, h / 2 - 0.1, z);
  m.rotation.z = 0.32;
  m.rotation.y = 0.2;
  m.castShadow = false;
  ctx.scene.add(m);
  return m;
}

export function matsFor(n) {
  if (n >= 4) return [-3, -1, 1, 3];
  if (n === 3) return [-2.2, 0, 2.2];
  if (n === 2) return [-1, 1];
  return [0];
}
export const MAT_Z3 = 0.8;
export const MAT_Z4 = 0.8;

/** Pavilion of Holding Still: tile, columns, sea behind, a rail for Kevin. */
export function pavilionSet(ctx) {
  setSky(ctx, 10);
  ctx.scene.add(floorPlane('clinic-tile', 36, 22, { at: [0, 0, -2] }));
  box(ctx, 36, 0.5, 22, [0, -0.26, -2], 'mist', { cast: false });
  sea(ctx, { at: [0, -0.9, -70], size: [200, 120] });
  // Colonnade behind the mats.
  for (const x of [-10, -6.5, 6.5, 10]) {
    const m = new Mesh(new THREE.CylinderGeometry(0.36, 0.42, 5.2, 8), toonMaterial(PALETTE.white));
    m.position.set(x, 2.6, -5);
    m.castShadow = true;
    ctx.scene.add(m);
    box(ctx, 1, 0.3, 1, [x, 5.25, -5], 'mist');
  }
  box(ctx, 24, 0.5, 1.2, [0, 5.6, -5], 'white');
  box(ctx, 26, 0.3, 2.2, [0, 6, -5], 'sky');
  const rail = place(ctx, 'class-rail', { at: [0, 0, -3.1], params: { len: 11 } });
  place(ctx, 'palm', { at: [-13, 0, -7.5], yaw: 30, scale: 1.3 });
  place(ctx, 'palm', { at: [12.5, 0, -8.5], yaw: 200, scale: 1.2 });
  sunbeam(ctx, -4.5, -1.4); sunbeam(ctx, -1, -2.4, 7.5, 1.4); sunbeam(ctx, 3.2, -1.8, 7, 0.9);
  ctx.engine.setSunDirection([0.5, 0.75, 0.55]);
  return { railY: 1.11, railZ: -3.1, rail };
}

/** The Rep Shed, inside: sprung floor, a mirror wall, giant dumbbells. */
export function shedSet(ctx) {
  setSky(ctx, 11);
  ctx.scene.background = new Color(PALETTE.white);
  ctx.scene.add(floorPlane('gym-floor', 24, 14, { at: [0, 0, 0] }));
  box(ctx, 24, 0.5, 14, [0, -0.26, 0], 'orange', { cast: false });
  box(ctx, 24, 6, 0.4, [0, 3, -3.4], 'white', { cast: false });
  box(ctx, 0.4, 6, 14, [-9, 3, 0], 'mist', { cast: false });
  box(ctx, 0.4, 6, 14, [9, 3, 0], 'mist', { cast: false });
  box(ctx, 24, 0.5, 14, [0, 6, 0], 'mist', { cast: false });
  box(ctx, 24, 0.3, 0.1, [0, 3.7, -3.1], 'orange', { cast: false });
  box(ctx, 24, 0.5, 0.1, [0, 0.25, -3.15], 'slate', { cast: false });
  const mirror = new Mirror({ size: [11, 3] });
  mirror.mesh.position.set(0, 2.1, -3.14);
  ctx.scene.add(mirror.mesh);
  const stop = mirror.attach(ctx.engine.renderer, ctx.scene);
  place(ctx, 'giant-dumbbell', { at: [-6.6, 0, -1.8], yaw: 20 });
  place(ctx, 'giant-dumbbell', { at: [6.6, 0, -2], yaw: -15 });
  place(ctx, 'giant-dumbbell', { at: [6.2, 0.82, -2], yaw: 10 });
  place(ctx, 'towel-rack', { at: [-7.6, 0, 1.4], yaw: 90 });
  ctx.engine.setSunDirection([0.3, 0.9, 0.4]);
  return { mirror, stop };
}

/** Beat Beach: sand, the stage behind, the sea. */
export function beachSet(ctx) {
  setSky(ctx, 12);
  box(ctx, 44, 0.6, 26, [0, -0.3, -2], 'sand', { cast: false });
  sea(ctx, { at: [0, -0.7, -75], size: [220, 120] });
  place(ctx, 'beat-stage', { at: [0, 0, -5.6] });
  place(ctx, 'palm', { at: [-9.5, 0, -3.8], yaw: 10, scale: 1.2 });
  place(ctx, 'palm', { at: [9.8, 0, -4.4], yaw: 170, scale: 1.3 });
  place(ctx, 'medicine-ball', { at: [-7.4, 0, 1.2], scale: 0.7 });
  ctx.engine.setSunDirection([0.4, 0.85, 0.5]);
  return {};
}

/** Lagoon Games: sand, water, the pier running off to one side. */
export function lagoonSet(ctx, { sandY = 0 } = {}) {
  setSky(ctx, 13);
  const sand = box(ctx, 44, 0.6, 18, [0, sandY - 0.3, 0], 'sand', { cast: false });
  sea(ctx, { at: [0, -0.6, -70], size: [220, 120] });
  place(ctx, 'palm', { at: [-10, 0, -5], yaw: 20, scale: 1.2 });
  place(ctx, 'palm', { at: [10.5, 0, -6], yaw: 150, scale: 1.1 });
  place(ctx, 'medicine-ball', { at: [8, 0, 1.6], scale: 0.6 });
  ctx.engine.setSunDirection([0.3, 0.85, 0.5]);
  return { sand };
}

/** Tare Island, close up, for the title: tile, Ounce's dais, palms, the volcano far off. */
export function plazaSet(ctx, hour = 10) {
  setSky(ctx, hour);
  ctx.scene.add(floorPlane('clinic-tile', 40, 26, { at: [0, 0, -2] }));
  box(ctx, 40, 0.5, 26, [0, -0.26, -2], 'mist', { cast: false });
  sea(ctx, { at: [0, -0.9, -80], size: [260, 130] });
  place(ctx, 'kettlebell-volcano', { at: [-16, -1, -26], scale: 1 });
  place(ctx, 'foam-roller-hill', { at: [15, -1, -22], yaw: 16 });
  place(ctx, 'palm', { at: [-9.5, 0, -6], yaw: 60, scale: 1.3 });
  place(ctx, 'palm', { at: [8.5, 0, -7], yaw: 210, scale: 1.2 });
  place(ctx, 'palm', { at: [12.5, 0, -2], yaw: 170 });
  place(ctx, 'medicine-ball', { at: [-6.5, 0, -8] });
  place(ctx, 'medicine-ball', { at: [-4.2, 0, -9.5], scale: 0.7 });
  return {};
}

export function gulls(ctx, n = 7, bounds = { min: [-14, 6, -14], max: [14, 10, 4] }) {
  const flock = new Boids(n, { bounds, maxSpeed: 3.2, minSpeed: 1.8, view: 5, space: 2, seed: 4 });
  const meshes = [];
  const mat = toonMaterial(PALETTE.white);
  for (let i = 0; i < n; i++) {
    const g = new Group();
    const body = new Mesh(new BoxGeometry(0.22, 0.14, 0.42), mat);
    const w1 = new Mesh(new BoxGeometry(0.5, 0.05, 0.2), mat);
    const w2 = new Mesh(new BoxGeometry(0.5, 0.05, 0.2), mat);
    w1.position.x = 0.32; w2.position.x = -0.32;
    g.add(body, w1, w2);
    setLookLayer(g, 'actors');
    ctx.scene.add(g);
    meshes.push({ g, w1, w2 });
  }
  return {
    flock,
    update(dt, t) {
      flock.step(Math.min(dt, 1 / 30));
      meshes.forEach((m, i) => {
        const p = i * 3;
        m.g.position.set(flock.pos[p], flock.pos[p + 1], flock.pos[p + 2]);
        m.g.rotation.y = Math.atan2(flock.vel[p], flock.vel[p + 2]);
        const f = Math.sin(t * 9 + i) * 0.5;
        m.w1.rotation.z = f; m.w2.rotation.z = -f;
      });
    },
  };
}

export function grass(ctx, area, at, mask, count = 1600) {
  const g = new GrassField({ area, at, count, height: [0.2, 0.42], base: PALETTE.green, tip: PALETTE.lime, mask, seed: 3 });
  ctx.scene.add(g);
  return g;
}

