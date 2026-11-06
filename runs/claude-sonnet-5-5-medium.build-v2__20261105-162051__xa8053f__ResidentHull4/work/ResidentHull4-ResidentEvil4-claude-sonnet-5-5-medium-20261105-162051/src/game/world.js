// Moods: sky, light, fog, rain. Water. Backdrops.
import { THREE, PALETTE, applySky, skyAt, groundFog, Precipitation, WaterSurface, WAVES_CALM, WAVES_CHOPPY, buildModel, setLookLayer } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';

export const MOODS = {
  dusk: { hour: 18.6, sun: 1.0, amb: 1.1, fog: [0x4a3a5a, 1.2, 0.55], bg: 'plum', rain: false },
  rain: { hour: 21.5, sun: 0.5, amb: 1.0, fog: [PALETTE.night, 2.0, 0.7], bg: 'ink', rain: true },
  abbey: { hour: 2, sun: 0.25, amb: 0.8, fog: [PALETTE.ink, 0.8, 0.5], bg: 'ink', rain: false },
  moon: { hour: 1, sun: 0.35, amb: 0.9, fog: [PALETTE.night, 1.0, 0.45], bg: 'ink', rain: false },
  dawn: { hour: 6.5, sun: 1.2, amb: 1.2, fog: [0x94b0c2, 1, 0.3], bg: 'sky', rain: false },
  title: { hour: 19.5, sun: 0.9, amb: 1.0, fog: [0x3a2c4a, 1.4, 0.6], bg: 'plum', rain: false },
};
export function applyMood(ctx, name) {
  const m = MOODS[name] || MOODS.dusk;
  const eng = ctx.engine;
  applySky(eng, skyAt(m.hour));
  eng.sun.intensity = m.sun; eng.ambient.intensity = m.amb;
  const bg = PALETTE[m.bg] ?? PALETTE.ink;
  ctx.scene.background = new THREE.Color(bg);
  const mist = groundFog({ color: m.fog[0], top: m.fog[1], amount: m.fog[2], near: m.near ?? 12, far: m.far ?? 70 });
  ctx.scene.fogNode = mist.node;
  const out = { name, mood: m, mist, rain: null };
  if (m.rain) {
    out.rain = new Precipitation({ kind: 'rain', count: 900, area: [36, 14, 36], color: PALETTE.slate });
    out.rain.wind.set(3, 1);
    ctx.scene.add(out.rain);
  }
  return out;
}
export function updateMood(w, dt, focus) { if (w?.rain) w.rain.update(dt, focus); }

/** Water over a rectangle: [minX, minZ, maxX, maxZ]. */
export function makeWater(ctx, rect, y = -0.25, chop = false) {
  const w = rect[2] - rect[0], d = rect[3] - rect[1];
  const water = new WaterSurface({ size: [w, d], at: [(rect[0] + rect[2]) / 2, y, (rect[1] + rect[3]) / 2], waves: chop ? WAVES_CHOPPY : WAVES_CALM, deep: PALETTE.navy, shallow: PALETTE.teal, foam: PALETTE.white });
  ctx.scene.add(water);
  return water;
}
/** Far silhouettes so the world never ends at a plane. */
export function addBackdrop(ctx, cx, cz, radius, kinds = ['sea-stack'], count = 14, seed = 1) {
  const rnd = ctx.random.fork('backdrop' + seed);
  const list = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd.range(-0.15, 0.15);
    const id = kinds[i % kinds.length];
    const b = buildModel(id, { catalog: MODELS });
    const r = radius + rnd.range(0, 25);
    b.object.position.set(cx + Math.cos(a) * r, rnd.range(-1, 0), cz + Math.sin(a) * r);
    b.object.rotation.y = rnd.range(0, 6.28);
    b.object.scale.setScalar(rnd.range(0.9, 2.4));
    ctx.scene.add(b.object);
    list.push(b.object);
  }
  return list;
}
