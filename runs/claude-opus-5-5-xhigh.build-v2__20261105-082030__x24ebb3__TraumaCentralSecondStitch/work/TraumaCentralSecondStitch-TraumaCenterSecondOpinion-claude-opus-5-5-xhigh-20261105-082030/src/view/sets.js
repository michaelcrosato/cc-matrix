// Rooms. Each set is a mesh group with a lighting recipe: OR-7, the scrub room, the Chief's office, the
// ward, the corridor, the Foundation atrium, the helipad in the rain, and the same roof at dawn.
import { buildModel, clothGrid, glowMaterial, mergeStaticMeshes, PALETTE, Precipitation, setLookLayer, SoftMesh, THREE, toonMaterial } from '../../pixel-engine.js';
import { App } from '../app.js';
import { dishDef, iceTrayDef, retractorDef } from '../content/models/index.js';

const { BoxGeometry, Color, CylinderGeometry, Group, Mesh, PlaneGeometry, SphereGeometry } = THREE;

const box = (x, y, z, w, h, d, c, o = {}) => {
  const m = new Mesh(new BoxGeometry(w, h, d), typeof c === 'object' ? c : toonMaterial(c));
  m.position.set(x, y, z);
  m.castShadow = o.cast ?? false;
  m.receiveShadow = o.receive ?? true;
  if (o.rotY) m.rotation.y = o.rotY;
  if (o.rotZ) m.rotation.z = o.rotZ;
  if (o.rotX) m.rotation.x = o.rotX;
  return m;
};
const cyl = (x, y, z, r, h, c, o = {}) => {
  const m = new Mesh(new CylinderGeometry(o.top ?? r, r, h, o.seg ?? 10), toonMaterial(c));
  m.position.set(x, y, z);
  m.castShadow = o.cast ?? false;
  m.receiveShadow = true;
  return m;
};
function kenney(group, id, at, yaw = 0, palette = {}, scale = 1) {
  const kit = App.kit;
  if (!kit) return null;
  const full = `kenney-furniture/${id}`;
  const slots = kit.get(full).palette ?? {};
  const only = Object.fromEntries(Object.entries(palette).filter(([k]) => k in slots));
  const b = buildModel(full, { catalog: kit, palette: only });
  b.object.position.set(...at);
  b.object.rotation.y = yaw;
  b.object.scale.setScalar(scale);
  b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  group.add(b.object);
  return b.object;
}
const STEEL = { wood: 'mist', metal: 'slate', metalLight: 'white', metalDark: 'night', woodDark: 'slate', carpet: 'sky' };
const PALE = { wood: 'white', metal: 'mist', metalLight: 'white', metalDark: 'slate', woodDark: 'mist', carpet: 'white' };

export class SetView {
  constructor(ctx, id) {
    this.ctx = ctx;
    this.id = id;
    this.group = new Group();
    this.parts = [];
    this.lights = [];
    this.anim = [];
    this.rain = null;
    this.t = 0;
    ctx.scene.add(this.group);
    (SETS[id] ?? SETS.or7)(this, ctx);
    if (this.parts.length) this.group.add(...mergeStaticMeshes(this.parts));
  }
  add(...ms) { this.parts.push(...ms); }
  live(m) { this.group.add(m); return m; }
  light(o) { const h = this.ctx.lights.request(o); this.lights.push(h); return h; }
  env({ sun, sunDir, ambient, ambientColor, sunColor, bg }) {
    const e = this.ctx.engine;
    e.sun.intensity = sun;
    if (sunColor != null) e.sun.color.setHex(sunColor); else e.sun.color.setHex(0xffffff);
    if (sunDir) e.setSunDirection(sunDir);
    e.ambient.intensity = ambient;
    e.ambient.color.setHex(ambientColor ?? 0xffffff);
    this.ctx.scene.background = new Color(bg ?? PALETTE.ink);
  }
  update(dt, focus) {
    this.t += dt;
    for (const f of this.anim) f(dt, this.t);
    if (this.rain) this.rain.update(dt, this.rainCenter ?? focus);
  }
  addRain(count = 2200, center = null, area = [18, 9, 14]) {
    this.rain = new Precipitation({ kind: 'rain', count, area, color: 0x9fc4e8, speed: 13 });
    this.rain.wind.set(-1.6, 0.3);
    this.rainCenter = center;
    this.group.add(this.rain);
  }
  /** A window with rain streaks and harbour lights behind it. */
  harbourWindow(x, y, z, w, h, o = {}) {
    this.add(box(x, y, z - 0.04, w + 0.3, h + 0.3, 0.1, o.frame ?? PALETTE.slate));
    const pane = new Mesh(new PlaneGeometry(w, h), new THREE.MeshBasicNodeMaterial({ color: o.sky ?? 0x101a38 }));
    pane.position.set(x, y, z + 0.02);
    this.live(pane);
    const lights = [0xffcd75, 0xef7d57, 0xa7f070, 0x73eff7, 0xffcd75];
    for (let i = 0; i < 16; i++) {
      const lx = x - w / 2 + 0.2 + ((i * 0.37) % 1) * (w - 0.4);
      const ly = y - h / 2 + 0.15 + ((i * 0.61) % 1) * h * 0.3;
      const m = new Mesh(new BoxGeometry(0.07, 0.07, 0.02), glowMaterial(lights[i % 5]));
      m.position.set(lx, ly, z + 0.05);
      this.live(m);
      this.anim.push((dt, t) => { m.visible = Math.sin(t * (0.4 + i * 0.13) + i) > -0.85; });
    }
    for (let i = 1; i < (o.bars ?? 3); i++) this.add(box(x - w / 2 + (i * w) / (o.bars ?? 3), y, z + 0.06, 0.07, h, 0.05, o.frame ?? PALETTE.slate));
    this.add(box(x, y, z + 0.06, w, 0.07, 0.05, o.frame ?? PALETTE.slate));
    // Streaks.
    const streak = glowMaterial(0x4a6a9a);
    for (let i = 0; i < 12; i++) {
      const m = new Mesh(new BoxGeometry(0.02, 0.28, 0.01), streak);
      const sx = x - w / 2 + ((i * 0.53) % 1) * w;
      m.position.set(sx, y, z + 0.04);
      this.live(m);
      const speed = 2 + (i % 3);
      this.anim.push((dt, t) => { m.position.y = y + h / 2 - ((t * speed + i * 0.7) % h); });
    }
  }
  dispose() {
    for (const h of this.lights) h.release();
  }
}

const SETS = {
  or7(s) {
    s.env({ sun: 0.35, sunDir: [0.3, 1, 0.5], ambient: 0.28, ambientColor: 0x8fa8c8, bg: 0x0d0b14 });
    // Floor and walls.
    s.add(box(0, -0.25, 0, 30, 0.5, 26, 0x2a3142));
    for (let i = -7; i <= 7; i++) s.add(box(i * 2, 0.005, 0, 0.04, 0.01, 26, 0x394257));
    s.add(box(0, 3.5, -7, 30, 7, 0.4, 0x28303f), box(-12, 3.5, 0, 0.4, 7, 26, 0x242b39), box(12, 3.5, 0, 0.4, 7, 26, 0x242b39));
    s.add(box(0, 0.5, -6.75, 30, 1, 0.1, 0x37506a));
    // The gallery glass.
    s.add(box(0, 4.05, -6.82, 14.3, 2.5, 0.1, 0x1a2230));
    const glass = new Mesh(new PlaneGeometry(14, 2.2), new THREE.MeshBasicNodeMaterial({ color: 0x1d3a52 }));
    glass.position.set(0, 4.05, -6.74);
    s.live(glass);
    for (let i = 0; i < 6; i++) s.add(box(-7 + i * 2.8, 4.05, -6.7, 0.1, 2.5, 0.06, 0x394257));
    s.add(box(0, 2.85, -6.6, 14.3, 0.14, 0.3, 0x394257));
    // Motto over the door, a pale band.
    s.add(box(7.5, 2.7, -6.75, 2.6, 0.4, 0.06, 0x5a6a80), box(7.5, 1.2, -6.77, 2.2, 2.4, 0.1, 0x37506a), box(7.5, 1.2, -6.72, 0.06, 2.4, 0.06, 0x18202c));
    // The table.
    s.add(box(0, 0.45, -3, 0.9, 0.9, 1, 0x4f5f75), box(0, 0.95, -3, 3.3, 0.14, 1.4, 0x94b0c2), box(0, 0.05, -3, 1.6, 0.1, 1.6, 0x394257));
    s.add(box(0, 1.1, -3, 3.3, 0.2, 1.46, 0x257179, { cast: true }), box(-1.2, 1.26, -3, 0.5, 0.16, 0.6, 0xf2c9a2, { cast: true }), box(0.3, 1.26, -3, 1.9, 0.16, 1, 0x1e6068, { cast: true }));
    // The lamp arm: this one swings.
    s.add(box(0, 6.4, -3, 0.2, 1.2, 0.2, 0x566c86));
    const lamp = new Group();
    lamp.position.set(0, 5.8, -3);
    const arm = new Mesh(new BoxGeometry(0.1, 2.3, 0.1), toonMaterial(0x94b0c2));
    arm.position.y = -1.15;
    const shade = new Mesh(new CylinderGeometry(0.34, 0.86, 0.36, 12), toonMaterial(0xf4f4f4));
    shade.position.y = -2.4;
    const bulb = new Mesh(new SphereGeometry(0.3, 8, 6), glowMaterial(0xfff4d8));
    bulb.position.y = -2.56;
    bulb.scale.y = 0.4;
    lamp.add(arm, shade, bulb);
    arm.castShadow = shade.castShadow = true;
    setLookLayer(lamp, 'actors');
    s.live(lamp);
    s.lampMesh = lamp;
    s.lampLight = s.light({ position: [0, 3.2, -3], color: 0xfff0d0, intensity: 14, radius: 7, priority: 6 });
    s.anim.push((dt, t) => {
      const a = Math.sin(t * 0.9) * (s.lampSwing ?? 0.09);
      lamp.rotation.z = a;
      s.lampLight.position.set(Math.sin(a) * 2.5, 3.2, -3);
    });
    // Monitor on a stand.
    s.add(cyl(-3.4, 0.9, -3.3, 0.09, 1.8, 0x566c86), cyl(-3.4, 0.06, -3.3, 0.5, 0.1, 0x394257));
    s.add(box(-3.4, 2, -3.3, 1.2, 0.8, 0.3, 0x18202c, { cast: true }));
    const screen = new Mesh(new PlaneGeometry(1.04, 0.64), glowMaterial(0x0c3b2c));
    screen.position.set(-3.4, 2, -3.14);
    s.live(screen);
    const trace = new Mesh(new BoxGeometry(0.9, 0.04, 0.01), glowMaterial(0xa7f070));
    trace.position.set(-3.4, 2, -3.13);
    s.live(trace);
    s.anim.push((dt, t) => { trace.scale.y = 1 + (Math.sin(t * 8) > 0.82 ? 7 : 0); });
    s.light({ position: [-3.4, 2, -2.6], color: 0x74f0a0, intensity: 2.5, radius: 3.5, priority: 1 });
    // Instrument tray and cart.
    s.add(box(2.9, 1.05, -3.1, 1.3, 0.08, 0.8, 0x94b0c2), cyl(2.9, 0.5, -3.1, 0.07, 1, 0x566c86), cyl(2.9, 0.05, -3.1, 0.4, 0.08, 0x394257));
    for (let i = 0; i < 4; i++) s.add(box(2.45 + i * 0.3, 1.12, -3.1, 0.06, 0.05, 0.56, 0xf4f4f4));
    kenney(s.group, 'trashcan', [4.6, 0, -4.4], 0, STEEL);
    kenney(s.group, 'cabinet-bed-drawer', [-6, 0, -6.2], 0, STEEL, 1.6);
    s.wide = { position: [5.2, 3.6, 5.2], target: [0, 1.2, -2.8], fov: 38 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[-1.9, 0, -2.4, 0.9], [1.9, 0, -2.2, -0.9], [0.2, 0, -1.1, 3.1], [-3, 0, -1.6, 0.6]];
  },
  scrub(s) {
    s.env({ sun: 0.6, sunDir: [0.2, 1, 0.6], ambient: 0.62, ambientColor: 0xc9dcdc, bg: 0x17201f });
    s.add(box(0, -0.25, 0, 22, 0.5, 18, 0x4a6470));
    s.add(box(0, 3, -5.4, 22, 6, 0.3, 0x7fa39f), box(-9, 3, 0, 0.3, 6, 18, 0x72938f), box(9, 3, 0, 0.3, 6, 18, 0x72938f));
    // Tiles.
    for (let y = 0.4; y < 3.6; y += 0.5) for (let x = -9; x <= 9; x += 0.5) s.add(box(x + (Math.round(y * 2) % 2) * 0.25, y, -5.24, 0.47, 0.47, 0.02, ((x * 2 + y * 2) | 0) % 3 ? 0x8fb3ae : 0x9fc3bc, { receive: false }));
    s.add(box(0, 0.5, -5.2, 22, 1, 0.04, 0x566c86));
    for (let i = -2; i <= 2; i++) {
      kenney(s.group, 'bathroom-sink', [i * 2.1, 0, -4.9], 0, STEEL, 1.5);
      s.add(box(i * 2.1, 2.6, -5.1, 1.3, 1.2, 0.05, 0xb6c8d4));
      s.add(box(i * 2.1, 2.0, -5.08, 1.4, 0.06, 0.08, 0x566c86));
    }
    s.add(box(0, 4.7, -5.1, 18, 0.2, 0.3, 0xf4f4f4));
    s.light({ position: [0, 4, -2.4], color: 0xdff4f0, intensity: 7, radius: 10, priority: 3, flicker: 'fluorescent' });
    s.wide = { position: [4.2, 2.8, 4.6], target: [0, 1.2, -3], fov: 40 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[-1.6, 0, -2.6, 0.2], [1.6, 0, -2.2, -0.3], [3.4, 0, -1.4, -0.8]];
  },
  office(s) {
    s.env({ sun: 0.3, sunDir: [0.4, 0.8, 0.8], ambient: 0.32, ambientColor: 0x7c6a70, bg: 0x0c0a12 });
    s.add(box(0, -0.25, 0, 20, 0.5, 16, 0x4a2f2a));
    s.add(box(0, 3, -5.4, 20, 6, 0.3, 0x3f3540), box(-8, 3, 0, 0.3, 6, 16, 0x383040), box(8, 3, 0, 0.3, 6, 16, 0x383040));
    s.add(box(0, 0.45, -5.2, 20, 0.9, 0.06, 0x5d3a2f));
    s.harbourWindow(1.2, 2.8, -5.2, 4.4, 2.6, { bars: 3, frame: 0x2a2030 });
    kenney(s.group, 'bookcase-open', [-3.2, 0, -5], 0, { wood: 'orange' }, 1.5);
    kenney(s.group, 'bookcase-closed', [-4.6, 0, -5], 0, { wood: 'plum' }, 1.5);
    kenney(s.group, 'desk', [0.6, 0, -3.3], 0, { wood: 'plum', metal: 'sand' }, 1.7);
    kenney(s.group, 'chair-desk', [0.6, 0, -4.3], 0, { wood: 'night', metal: 'slate' }, 1.4);
    kenney(s.group, 'lamp-square-table', [1.5, 1.32, -3.3], 0, { wood: 'sand', metal: 'sand', lamp: 'sand' }, 1.3);
    kenney(s.group, 'books', [-0.1, 1.32, -3.2], 0.5, {}, 1.2);
    s.light({ position: [1.5, 2.2, -3], color: 0xffd9a0, intensity: 8, radius: 6, priority: 4 });
    s.light({ position: [1.2, 3, -4.4], color: 0x7fa0e0, intensity: 2.5, radius: 5, priority: 1 });
    s.wide = { position: [3.6, 2.6, 4.2], target: [0, 1.2, -3], fov: 40 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[0.6, 0, -4.6, 0], [-1.6, 0, -2, 0.7], [2.4, 0, -2, -0.7]];
    s.thunderFlash = true;
  },
  ward(s) {
    s.env({ sun: 0.75, sunDir: [-0.5, 0.8, 0.7], ambient: 0.6, ambientColor: 0xc8d4e0, bg: 0x18202c });
    s.add(box(0, -0.25, 0, 24, 0.5, 18, 0x56677a));
    s.add(box(0, 3, -5.4, 24, 6, 0.3, 0xa2b2b8), box(-10, 3, 0, 0.3, 6, 18, 0x93a4ac), box(10, 3, 0, 0.3, 6, 18, 0x93a4ac));
    s.add(box(0, 0.55, -5.2, 24, 1.1, 0.06, 0x5d8a8a));
    s.harbourWindow(-5, 3, -5.2, 2.8, 2, { sky: 0x4b6088, frame: 0xf4f4f4 });
    s.harbourWindow(5, 3, -5.2, 2.8, 2, { sky: 0x4b6088, frame: 0xf4f4f4 });
    for (let i = -1; i <= 1; i++) {
      kenney(s.group, 'bed-single', [i * 3.6, 0, -3.6], 0, PALE, 1.15);
      kenney(s.group, 'side-table', [i * 3.6 + 1.1, 0, -4.6], 0, STEEL, 1);
      // Curtains that move in the draught.
      const cloth = clothGrid({ width: 1.6, height: 2.4, cols: 8, rows: 8, origin: [i * 3.6 + 1.75, 3.2, -3.2], pin: 'top' });
      const mesh = new SoftMesh(cloth, toonMaterial(0x7fa8c2), { doubleSided: true });
      mesh.castShadow = false;
      s.live(mesh);
      s.anim.push((dt, t) => {
        cloth.step(Math.min(dt, 1 / 30));
        mesh.sync();
      });
      s.add(box(i * 3.6 + 1.75, 3.25, -3.2, 2, 0.05, 0.05, 0x94b0c2));
    }
    s.add(box(0, 5.2, -2, 16, 0.12, 0.8, 0xf4f4f4));
    s.light({ position: [0, 4.6, -2], color: 0xf0f4ff, intensity: 7, radius: 11, priority: 3 });
    s.wide = { position: [5, 3, 5], target: [0, 1, -3], fov: 40 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[-2, 0, -1.8, 0.5], [2, 0, -1.6, -0.5], [0, 0, -1.2, 3.1]];
  },
  corridor(s) {
    s.env({ sun: 0.25, sunDir: [0, 1, 0.3], ambient: 0.42, ambientColor: 0xa0a8c0, bg: 0x10141c });
    s.add(box(0, -0.25, -8, 9, 0.5, 34, 0x46536a));
    s.add(box(-4.5, 3, -8, 0.3, 6, 34, 0x8a98a4), box(4.5, 3, -8, 0.3, 6, 34, 0x7d8b98), box(0, 6, -8, 9, 0.3, 34, 0x5a6470), box(0, 3, -22, 9, 6, 0.3, 0x37414e));
    s.add(box(-4.34, 0.5, -8, 0.04, 1, 34, 0x5d8a8a), box(4.34, 0.5, -8, 0.04, 1, 34, 0x5d8a8a));
    for (let i = 0; i < 6; i++) {
      s.add(box(0, 5.8, -2 - i * 4, 2, 0.08, 0.5, 0xf4f4f4));
      s.add(box(-4.3, 1.5, -4 - i * 4, 0.1, 3, 1.6, 0x37506a), box(4.3, 1.5, -6 - i * 4, 0.1, 3, 1.6, 0x37506a));
    }
    s.light({ position: [0, 5, -3], color: 0xe8f0ff, intensity: 7, radius: 9, priority: 3, flicker: 'fluorescent' });
    s.light({ position: [0, 5, -9], color: 0xe8f0ff, intensity: 6, radius: 9, priority: 2 });
    s.light({ position: [0, 3.4, -5], color: 0xff5040, intensity: 3.5, radius: 8, priority: 2, flicker: 'pulse' });
    // Gurneys from the ferry.
    for (const [x, z, yaw] of [[-2.6, -4.6, 0.1], [2.4, -7, -0.1], [-2.3, -10, 0.05]]) {
      const g = new Group();
      g.add(box(0, 0.86, 0, 1, 0.1, 2.3, 0x94b0c2, { cast: true }), box(0, 1, 0, 0.9, 0.18, 2.1, 0x7fa8c2, { cast: true }), box(0, 1.14, -0.8, 0.5, 0.14, 0.4, 0xf2c9a2, { cast: true }));
      for (const [a, b] of [[-0.4, -1], [0.4, -1], [-0.4, 1], [0.4, 1]]) g.add(box(a, 0.42, b, 0.07, 0.84, 0.07, 0x566c86));
      g.position.set(x, 0, z);
      g.rotation.y = yaw;
      s.live(g);
    }
    s.wide = { position: [1.4, 2.4, 3.5], target: [0, 1.3, -7], fov: 44 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[-0.8, 0, -2.4, 0.2], [1.2, 0, -3.2, 0.2], [0.4, 0, -6, 0]];
  },
  atrium(s) {
    s.env({ sun: 1.1, sunDir: [-0.3, 1, 0.5], ambient: 0.9, ambientColor: 0xfff6e0, bg: 0xb9c6d4 });
    s.add(box(0, -0.25, 0, 28, 0.5, 22, 0xe8e2d0));
    for (let i = -6; i <= 6; i++) s.add(box(i * 2, 0.005, 0, 0.05, 0.01, 22, 0xd4c9a8));
    s.add(box(0, 4, -7, 28, 8, 0.3, 0xf4f4f4), box(-13, 4, 0, 0.3, 8, 22, 0xe8e8e8), box(13, 4, 0, 0.3, 8, 22, 0xe8e8e8));
    s.add(box(0, 6, -6.8, 8, 1.2, 0.12, 0xffcd75));
    s.add(box(0, 6, -6.72, 7.6, 0.9, 0.06, 0xf4f4f4));
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      s.add(cyl(i * 3.2, 3.5, -5.6, 0.34, 7, 0xf4f4f4, { cast: true, seg: 12 }), cyl(i * 3.2, 0.2, -5.6, 0.5, 0.4, 0xffcd75), cyl(i * 3.2, 6.9, -5.6, 0.5, 0.3, 0xffcd75));
      kenney(s.group, 'potted-plant', [i * 3.2 + 1, 0, -5.2], 0, { wood: 'white', woodDark: 'sand', plant: 'green' }, 1.8);
    }
    // Flowers: bright dots on stalks.
    for (let i = 0; i < 26; i++) {
      const x = -6 + (i % 13), z = -4.6 + (i > 12 ? 0.5 : 0);
      s.add(cyl(x * 0.8, 0.45, z, 0.03, 0.9, 0x38b764), box(x * 0.8, 0.96, z, 0.2, 0.2, 0.2, [0xffcd75, 0xf4f4f4, 0xef7d57][i % 3], { cast: true }));
    }
    s.add(box(0, 0.25, -4.3, 11, 0.5, 1, 0xf4f4f4));
    s.light({ position: [0, 6, -2], color: 0xfff4d8, intensity: 6, radius: 14, priority: 2 });
    s.wide = { position: [4.4, 3, 5.6], target: [0, 1.5, -3], fov: 42 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[-1.6, 0, -2.2, 0.4], [1.4, 0, -1.8, -0.4], [3, 0, -3, -0.7]];
  },
  helipad(s) {
    s.env({ sun: 0.28, sunDir: [-0.4, 0.8, 0.5], ambient: 0.3, ambientColor: 0x6078b0, bg: 0x070a14 });
    s.add(box(0, -0.25, -2, 26, 0.5, 22, 0x2c3444));
    s.add(cyl(0, 0.01, -3, 4.2, 0.02, 0x566c86, { seg: 28 }));
    s.add(cyl(0, 0.015, -3, 3.8, 0.02, 0x2c3444, { seg: 28 }));
    s.add(box(-1.1, 0.03, -3, 0.5, 0.03, 3, 0xffcd75), box(1.1, 0.03, -3, 0.5, 0.03, 3, 0xffcd75), box(0, 0.03, -3, 2, 0.03, 0.5, 0xffcd75));
    for (let i = -6; i <= 6; i++) s.add(box(i * 2, 0.6, -8.6, 0.1, 1.2, 0.1, 0x94b0c2));
    s.add(box(0, 1.2, -8.6, 26, 0.08, 0.08, 0x94b0c2), box(0, 0.7, -8.6, 26, 0.06, 0.06, 0x94b0c2));
    // The city below, the harbour, the lights.
    const lights = [0xffcd75, 0xef7d57, 0xa7f070, 0x73eff7];
    for (let i = 0; i < 60; i++) {
      const m = new Mesh(new BoxGeometry(0.22, 0.22, 0.02), glowMaterial(lights[i % 4]));
      m.position.set(-22 + ((i * 7.31) % 44), -2 + ((i * 3.7) % 6), -24 - ((i * 1.3) % 6));
      s.live(m);
      s.anim.push((dt, t) => { m.visible = Math.sin(t * (0.2 + (i % 7) * 0.13) + i) > -0.9; });
    }
    s.add(box(0, -4.5, -28, 80, 2, 10, 0x121a2c));
    // Ferry on the water.
    s.add(box(-7, -1.6, -22, 6, 0.8, 1.6, 0xf4f4f4), box(-7, -0.9, -22, 3.4, 0.6, 1.2, 0xc4d0d8));
    // The canister.
    const can = new Group();
    can.add(cyl(0, 0.55, 0, 0.3, 1.1, 0xf4f4f4, { cast: true }), box(0, 1.14, 0, 0.3, 0.1, 0.3, 0xffcd75, { cast: true }), box(0, 0.7, 0.3, 0.26, 0.26, 0.02, 0xffcd75));
    can.position.set(1.6, 0, -3.6);
    setLookLayer(can, 'actors');
    s.live(can);
    s.canister = can;
    s.addRain(1300, new THREE.Vector3(0, 3.5, -6), [20, 9, 8]);
    s.light({ position: [0, 4, -3], color: 0xa0c0ff, intensity: 4, radius: 10, priority: 2 });
    s.light({ position: [-5.5, 1.5, -6], color: 0xff5040, intensity: 4, radius: 7, flicker: 'pulse', priority: 1 });
    s.wide = { position: [4.5, 3.6, 5.8], target: [0, 1, -3], fov: 44 };
    s.close = { position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30 };
    s.spots = [[-2, 0, -2.4, 0.5], [0.4, 0, -1.6, 3], [2.8, 0, -4.2, -1.8], [-1, 0, -4.6, 0.2]];
  },
  morning(s) {
    SETS.helipad(s);
    s.env({ sun: 1.5, sunDir: [0.8, 0.5, 0.4], sunColor: 0xffd9a8, ambient: 0.8, ambientColor: 0xffd8c8, bg: 0xf0a878 });
    if (s.rain) { s.group.remove(s.rain); s.rain = null; }
    if (s.canister) s.canister.visible = false;
    for (const h of s.lights) h.release();
    s.lights.length = 0;
  },
};

/** The frame around an operating field: raised teal drapes, retractors, the steel dish. */
export function buildFieldFrame(ctx, x0, opts = {}) {
  const group = new Group();
  const parts = [];
  const d = (x, z, w, dd) => { const m = box(x0 + x, 0.4, z, w, 0.8, dd, 0x1f6a72, { cast: false }); parts.push(m); };
  d(-8.1, 0, 2.8, 12);
  d(8.1, 0, 2.8, 12);
  d(0, -5.1, 19, 2.2);
  d(0, 5.0, 19, 2.6);
  // Folds.
  for (const z of [-3, -1, 1, 3]) {
    parts.push(box(x0 - 7, 0.82, z, 0.5, 0.06, 0.5, 0x2a838c));
    parts.push(box(x0 + 7, 0.82, z, 0.5, 0.06, 0.5, 0x2a838c));
  }
  group.add(...mergeStaticMeshes(parts));
  ctx.scene.add(group);
  const place = (def, x, y, z, yaw = 0, s = 1) => {
    const m = buildModel(def).object;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    m.position.set(x0 + x, y, z);
    m.rotation.y = yaw;
    m.scale.setScalar(s);
    setLookLayer(m, 'actors');
    group.add(m);
    return m;
  };
  if (opts.retractors !== false) {
    place(retractorDef, -6.3, 0.45, -3.75, 0.1, 1);
    place(retractorDef, 6.3, 0.45, -3.75, -0.1, 1);
    place(retractorDef, -7, 0.45, 0, -Math.PI / 2, 1);
    place(retractorDef, 7, 0.45, 0, Math.PI / 2, 1);
  }
  const dish = place(dishDef, opts.dish?.[0] ?? -6.75, opts.dish?.[1] ?? 0.78, opts.dish?.[2] ?? -2.35, 0, 0.9);
  if (opts.ice) place(iceTrayDef, opts.ice[0], 0.6, opts.ice[1], 0, 1.05);
  return { group, dish, dishPos: dish.position.clone().add(new THREE.Vector3(0, 0.25, 0)) };
}
