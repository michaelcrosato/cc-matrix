// Moods: sky, sun, ambient, fog, rain, water, backdrops.
import { applySky, groundFog, PALETTE, Precipitation, skyAt, THREE, WAVES_CALM, WAVES_CHOPPY, WaterSurface } from '../../pixel-engine.js';
import { buildProp } from './actor.js';
export const MOODS = {
  dusk: { hour: 18.6, sun: 1.0, ambient: 1.1, fog: [0x4a3a5a, 1.2, 0.55, 12, 70], bg: PALETTE.plum, gulls: true },
  rain: { hour: 21.5, sun: 0.5, ambient: 1.0, fog: [PALETTE.night, 2.0, 0.7, 8, 46], bg: PALETTE.ink, rain: true },
  abbey: { hour: 2, sun: 0.25, ambient: 0.8, fog: [PALETTE.ink, 0.8, 0.5, 10, 40], bg: PALETTE.ink, moon: [0.4, 0.8, 0.3] },
  moon: { hour: 2, sun: 0.45, ambient: 0.95, fog: [PALETTE.navy, 1.2, 0.55, 14, 60], bg: PALETTE.ink, moon: [-0.5, 0.7, -0.4] },
  indoor: { hour: 21.5, sun: 0.12, ambient: 1.05, fog: [PALETTE.ink, 0.6, 0.45, 12, 44], bg: PALETTE.ink },
  cold: { hour: 21.5, sun: 0.1, ambient: 1.25, fog: [PALETTE.navy, 1.2, 0.5, 8, 30], bg: PALETTE.ink },
  dawn: { hour: 6.5, sun: 1.2, ambient: 1.2, fog: [0x94b0c2, 1, 0.3, 30, 120], bg: PALETTE.sky },
  title: { hour: 19.4, sun: 0.5, ambient: 0.9, fog: [PALETTE.night, 2, 0.75, 10, 60], bg: PALETTE.night },
};
export function applyMood(area, name) {
  const { ctx } = area, m = MOODS[name], e = ctx.engine; area.moodName = name;
  applySky(e, skyAt(m.hour)); e.sun.intensity = m.sun; e.ambient.intensity = m.ambient; ctx.scene.background = new THREE.Color(m.bg);
  if (m.moon) e.setSunDirection(m.moon);
  const [color, top, amount, near, far] = m.fog;
  area.mist = groundFog({ color, top, amount, near, far }); ctx.scene.fogNode = area.mist.node;
  if (m.rain && !area.rain) { area.rain = new Precipitation({ kind: 'rain', count: 900, area: [36, 14, 36], color: PALETTE.slate }); area.rain.wind.set(3, 1); ctx.scene.add(area.rain); }
}
export function addWater(area, w, d, y = -0.35, o = {}) {
  const water = new WaterSurface({ size: [w, d], at: [o.x ?? 0, y, o.z ?? 0], segments: [Math.min(160, Math.ceil(w)), Math.min(160, Math.ceil(d))], waves: o.choppy ? WAVES_CHOPPY : WAVES_CALM, deep: o.deep ?? PALETTE.navy, shallow: o.shallow ?? PALETTE.blue, foam: PALETTE.mist });
  area.ctx.scene.add(water); area.waters.push(water); return water;
}
export function place(area, id, x, y, z, turn = 0, opts = {}) { const b = buildProp(id, opts); b.object.position.set(x, y, z); b.object.rotation.y = turn; area.ctx.scene.add(b.object); return b; }
/** Far silhouettes so the world doesn't end at a plane. */
export function addBackdrops(area, list) { for (const [id, x, y, z, t, s] of list) { const b = place(area, id, x, y, z, t ?? 0, { shadow: false }); if (s) b.object.scale.setScalar(s); } }
