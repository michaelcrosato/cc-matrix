import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { PALETTES } from '../data/palettes.js';
import { R } from './renderer.js';
const c = (h) => new THREE.Color(h);
export const PU = { skyTop: uniform(c('#6FC3E8')), skyMid: uniform(c('#BFE9F0')), skyLow: uniform(c('#FFF2D0')), sea: uniform(c('#16A8B0')), seaHi: uniform(c('#8CF0DD')) };
const cur = { name: 'noon', from: null, to: null, t: 1 };
const KEYS = ['skyTop', 'skyMid', 'skyLow', 'sea', 'seaHi'];
function snapshot(p) { const o = {}; for (const k of KEYS) o[k] = c(p[k]); o.sun = c(p.sun); o.hs = c(p.hemiSky); o.hg = c(p.hemiGround); o.sunI = p.sunI; o.hemiInt = p.hemiInt; return o; }
let live = snapshot(PALETTES.noon);
export function setPalette(name, instant = false) {
  if (!PALETTES[name]) return;
  cur.name = name; cur.to = snapshot(PALETTES[name]); cur.from = { ...live, ...Object.fromEntries(Object.entries(live).map(([k, v]) => [k, v.clone ? v.clone() : v])) };
  cur.t = instant ? 1 : 0; apply(cur.t);
}
export const paletteName = () => cur.name;
function apply(a) {
  const f = cur.from, t = cur.to; if (!t) return;
  for (const k of KEYS) { live[k].copy(f[k]).lerp(t[k], a); PU[k].value.copy(live[k]); }
  live.sun.copy(f.sun).lerp(t.sun, a); live.hs.copy(f.hs).lerp(t.hs, a); live.hg.copy(f.hg).lerp(t.hg, a);
  live.sunI = f.sunI + (t.sunI - f.sunI) * a; live.hemiInt = f.hemiInt + (t.hemiInt - f.hemiInt) * a;
  if (R.sun) { R.sun.color.copy(live.sun); R.sun.intensity = live.sunI; R.hemi.color.copy(live.hs); R.hemi.groundColor.copy(live.hg); R.hemi.intensity = live.hemiInt; }
}
export function tickPalette(dt) { if (cur.t < 1) { cur.t = Math.min(1, cur.t + dt / 3); apply(cur.t); } }
