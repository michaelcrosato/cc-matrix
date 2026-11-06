// Moods, fog, rain, water, backdrops. Everything cosmetic is skipped in Node, where nothing is drawn.
import { applySky, groundFog, PALETTE, Precipitation, skyAt, THREE, WaterSurface, WAVES_CALM, WAVES_CHOPPY, buildModel, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { HEADLESS } from '../config.js';

const { Color, Vector3 } = THREE;

export const MOODS = {
  dusk: { hour: 18.6, sun: 1.0, ambient: 1.1, fog: { color: 0x4a3a5a, top: 1.2, amount: 0.55, near: 12, far: 70 }, bg: PALETTE.plum, gulls: true, wind: 0.6 },
  rain: { hour: 21.5, sun: 0.5, ambient: 1.0, fog: { color: PALETTE.night, top: 2.0, amount: 0.7, near: 8, far: 46 }, bg: PALETTE.ink, rain: 900, wind: 0.8 },
  abbey: { hour: 2, sun: 0.25, ambient: 0.8, fog: { color: PALETTE.ink, top: 0.8, amount: 0.5, near: 10, far: 40 }, bg: PALETTE.ink, moon: [0.4, 0.8, -0.3] },
  moon: { hour: 2, sun: 0.5, ambient: 0.9, fog: { color: PALETTE.night, top: 1.2, amount: 0.5, near: 16, far: 70 }, bg: PALETTE.night, moon: [-0.5, 0.7, 0.4] },
  indoor: { hour: 21.5, sun: 0.2, ambient: 1.05, fog: { color: PALETTE.ink, top: 1.6, amount: 0.45, near: 14, far: 50 }, bg: PALETTE.ink },
  cold: { hour: 21.5, sun: 0.1, ambient: 1.25, fog: { color: PALETTE.navy, top: 1.5, amount: 0.5, near: 8, far: 30 }, bg: PALETTE.ink },
  crypt: { hour: 2, sun: 0.05, ambient: 0.55, fog: { color: PALETTE.ink, top: 2.2, amount: 0.75, near: 5, far: 26 }, bg: PALETTE.ink },
  dawn: { hour: 6.5, sun: 1.2, ambient: 1.2, fog: { color: 0x94b0c2, top: 0.5, amount: 0.25, near: 30, far: 120 }, bg: PALETTE.sky, sunTo: PALETTE.mist },
  storm: { hour: 21.5, sun: 0.35, ambient: 0.9, fog: { color: PALETTE.ink, top: 1.6, amount: 0.65, near: 12, far: 60 }, bg: PALETTE.ink, rain: 1100, wind: 1 },
};

export class WorldFx {
  constructor(ctx) {
    this.ctx = ctx;
    this.rain = null;
    this.water = null;
    this.waterY = 0;
    this.mist = null;
    this.loops = [];
  }

  setMood(name) {
    const m = MOODS[name];
    const { engine, scene } = this.ctx;
    this.moodName = name;
    applySky(engine, skyAt(m.hour));
    engine.sun.intensity = m.sun;
    engine.ambient.intensity = m.ambient;
    scene.background = new Color(m.bg);
    if (m.moon) engine.setSunDirection(m.moon);
    if (!HEADLESS) {
      this.mist = groundFog({ color: m.fog.color, top: m.fog.top, amount: m.fog.amount, near: m.fog.near, far: m.fog.far });
      scene.fogNode = this.mist.node;
    }
    if (m.rain) this.setRain(m.rain, m.wind ?? 0.8);
    else this.setRain(0);
  }

  /** A real dawn for the last scene: warm bands up from the horizon, a low sun, and the night gone over to the west. */
  addDawnSky() {
    if (HEADLESS || this.dawnSky) return;
    const { scene } = this.ctx;
    const g = new THREE.Group();
    const RING = Math.min(260, (this.ctx.camera?.camera?.far ?? 300) * 0.8);
    const k = RING / 260;
    const bands = [[PALETTE.orange, -30 * k, 52 * k], [PALETTE.sand, 22 * k, 16 * k], [PALETTE.mist, 38 * k, 34 * k], [PALETTE.sky, 72 * k, 60 * k]];
    for (const [color, y, h] of bands) {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: false });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(RING, RING, h, 48, 1, true), mat);
      ring.position.y = y + h / 2;
      ring.castShadow = false;
      g.add(ring);
    }
    const sun = new THREE.Mesh(new THREE.CircleGeometry(16 * k, 24), new THREE.MeshBasicMaterial({ color: PALETTE.white, fog: false }));
    sun.position.set(90 * k, 15 * k, 235 * k);
    sun.lookAt(0, 2, 0);
    g.add(sun);
    scene.add(g);
    this.dawnSky = g;
  }

  setRain(count, wind = 0.8) {
    if (HEADLESS) return;
    const { scene } = this.ctx;
    if (this.rain) { scene.remove(this.rain); this.rain.dispose?.(); this.rain = null; }
    if (!count) return;
    const rain = new Precipitation({ kind: 'rain', count, area: [36, 14, 36], color: PALETTE.slate });
    rain.wind.set(3 * wind, 1 * wind);
    scene.add(rain);
    this.rain = rain;
  }

  /** The sea: one big opaque sheet below the floors, or a see-through one on a flooding road. */
  addWater(o = {}) {
    const { y = -0.35, size = [240, 240], at = [0, 0], choppy = false, opacity = 1, deep = PALETTE.navy, shallow = PALETTE.teal, foam = PALETTE.mist } = o;
    this.waterY = y;
    if (HEADLESS) return null;
    const water = new WaterSurface({ size, at: [at[0], y, at[1]], segments: [80, 80], waves: choppy ? WAVES_CHOPPY : WAVES_CALM, deep, shallow, foam, opacity });
    water.receiveShadow = true;
    this.ctx.scene.add(water);
    this.water = water;
    return water;
  }

  setWaterLevel(y) {
    this.waterY = y;
    if (this.water) this.water.position.y = y;
  }

  /** Backdrops are plain library or game models with no colliders. */
  addBackdrop(list) {
    for (const [id, x, y, z, o = {}] of list) {
      const b = buildModel(id, { catalog: MODELS, params: o.params, palette: o.palette, seed: o.seed });
      b.object.position.set(x, y, z);
      if (o.turn) b.object.rotation.y = (o.turn * Math.PI) / 180;
      if (o.scale) b.object.scale.setScalar(o.scale);
      b.object.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      this.ctx.scene.add(b.object);
    }
  }

  update(dt, focus) {
    const { ctx } = this;
    if (this.rain) this.rain.update(dt, focus);
    if (this.water) this.water.update(ctx.time, ctx.engine.sunDir);
    const m = MOODS[this.moodName];
    if (m?.gulls && !HEADLESS) {
      this.gullT = (this.gullT ?? 3) - dt;
      if (this.gullT < 0) { this.gullT = 5 + (ctx.time * 7.3 % 9); ctx.audio.play('gulls', { volume: 0.5, pan: Math.sin(ctx.time) * 0.6 }); }
    }
  }

  dispose() {
    this.rain?.dispose?.();
    this.water?.dispose?.();
  }
}
export { Vector3 };
