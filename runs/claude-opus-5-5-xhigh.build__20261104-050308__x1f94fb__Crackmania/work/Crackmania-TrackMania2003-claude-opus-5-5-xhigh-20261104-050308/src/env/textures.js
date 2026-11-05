// CRACKMANIA textures (PLAN §7.2): pixel-art tiles baked by code (nearest filtered, repeating), per environment
import { ENVS } from './envs.js';
const E = globalThis.My3D2dge;
const hx = c => { const v = parseInt(c.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const h2 = (x, y) => E.hash2(x, y), n2 = (x, y) => E.noise2(x, y);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
/** a w x h tile: fn(x, y) -> [r, g, b] (0..255); a THREE texture, or null without a renderer */
export function bake(w, h, fn, o = {}) {
  const T = E.THREE; if (!T || !E.World3D.renderer || typeof document === 'undefined' || !document.createElement) return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); if (!g || !g.createImageData) return null;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; img.data[i] = Math.max(0, Math.min(255, c[0])); img.data[i + 1] = Math.max(0, Math.min(255, c[1])); img.data[i + 2] = Math.max(0, Math.min(255, c[2])); img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(cv); t.magFilter = T.NearestFilter; t.minFilter = o.mip ? T.NearestMipmapLinearFilter : T.NearestFilter; t.generateMipmaps = !!o.mip;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = o.mip ? 4 : 1; t.needsUpdate = true; return t;
}
/** a canvas of the tile (for UI icons); same fn */
export function texturesFor(env) {
  const e = ENVS[env], W = 64, line = hx(e.line), edge = hx(e.edge);
  const roadBase = { asphalt: [62, 62, 68], tarmac: [92, 92, 96], snowroad: [206, 216, 232] }[e.road];
  const roadFn = (x, y, centre = true) => {
    const s = h2(x * 3 + 1, y * 7 + 2), n = n2(x / 6, y / 6);
    let c = shade(roadBase, .9 + n * .16 + (s < .1 ? -.12 : s > .94 ? .14 : 0));
    if (e.road === 'snowroad') { const tr = (x > 14 && x < 19) || (x > 44 && x < 49); if (tr) c = shade(c, .9); }
    if (e.road === 'tarmac' && n2(x / 11 + 5, y / 9) > .72) c = shade(c, .82);   // patches
    if (x === 2 || x === 61 || (env === 'dustbowl' && (x === 3 || x === 60))) c = mix(edge, c, .08);
    if (centre && (x === 31 || x === 32) && y < 24) c = mix(line, c, .1);
    return c;
  };
  const T = {};
  T.road = bake(W, W, (x, y) => roadFn(x, y));
  T.dirt = bake(W, W, (x, y) => { const n = n2(x / 5, y / 5), s = h2(x, y), rut = Math.abs(((x + 2) % 32) - 16) < 3 ? .85 : 1; return shade([150, 112, 72], (.85 + n * .25) * rut * (s < .08 ? .7 : s > .95 ? 1.3 : 1)); });
  T.ice = bake(W, W, (x, y) => { const n = n2(x / 9, y / 4), s = h2(x + 9, y), str = Math.abs(Math.sin((x * .7 + y * .35) * .5)) > .96 ? 1.12 : 1; return shade([150, 200, 236], (.88 + n * .2) * str * (s > .985 ? 1.25 : 1)); });
  T.boost = bake(W, W, (x, y) => { const c = roadFn(x, y, false), u = Math.abs(x - 31.5), v = (y + u * .9) % 32; return v < 9 && u < 26 ? (v < 2 ? [255, 250, 200] : [255, 150 + (v * 8 | 0), 30]) : c; });
  const ca = hx(e.curb[0]), cb = hx(e.curb[1]);
  T.curb = bake(16, 32, (x, y) => shade(y < 16 ? ca : cb, .92 + h2(x, y) * .1));
  if (env === 'dustbowl') T.rail = bake(16, 32, (x, y) => { const k = (y % 8) < 4 ? 1 : .82; return shade(hx(e.rail), k * (.95 + h2(x, y) * .08)); });
  else if (env === 'hedgerow') T.rail = bake(32, 32, (x, y) => { const row = Math.floor(y / 6), off = row % 2 ? 4 : 0, joint = (y % 6 === 0) || ((x + off) % 9 === 0); const s = h2(Math.floor((x + off) / 9), row); return joint ? [70, 64, 56] : shade([150, 142, 126], .8 + s * .35); });
  else T.rail = bake(16, 32, (x, y) => { const n = n2(x / 4, y / 6); return mix([240, 246, 255], [190, 206, 232], n * .6 + (y > 26 ? .3 : 0)); });
  T.side = bake(32, 32, (x, y) => { const base = env === 'dustbowl' ? [200, 186, 162] : env === 'hedgerow' ? [122, 96, 66] : [130, 136, 150], n = n2(x / 5, y / 3); const jt = y % 16 === 0 ? .75 : 1; return shade(base, (.82 + n * .3) * jt); });
  T.under = bake(16, 16, (x, y) => shade(hx(e.under), .9 + h2(x, y) * .15));
  T.pillar = bake(16, 32, (x, y) => { const s = h2(x, y), band = y % 16 === 0 ? .8 : 1; return shade(hx(e.pillar), (.86 + s * .2) * band * (x === 0 || x === 15 ? .85 : 1)); });
  const pa = hx(e.plate[0]), pb = hx(e.plate[1]), pc = hx(e.plate[2]);
  if (env === 'dustbowl') T.plate = bake(128, 128, (x, y) => { const rip = Math.sin((x * .35 + Math.sin(y * .09) * 4 + y * .12)) * .5 + .5, s = h2(x, y); return s > .985 ? shade(pb, .7) : mix(pa, pb, rip * .55 + n2(x / 20, y / 20) * .3); }, { mip: true });
  else if (env === 'hedgerow') T.plate = bake(128, 128, (x, y) => { const stripe = Math.floor(x / 32) % 2 ? 1 : .9, s = h2(x, y), n = n2(x / 8, y / 8); return s > .992 ? pc : s < .01 ? [230, 120, 160] : shade(mix(pa, pb, n * .5), stripe * (.92 + h2(x >> 1, y >> 1) * .1)); }, { mip: true });
  else T.plate = bake(128, 128, (x, y) => { const n = n2(x / 16, y / 16), s = h2(x, y); return s > .993 ? pc : mix(pa, pb, n * .5 + (h2(x >> 2, y >> 2) < .1 ? .2 : 0)); }, { mip: true });
  const RC = e.rock.colors.map(hx);
  T.rock = bake(32, 64, (x, y) => { const b = Math.floor((y + n2(x / 8, 1) * 4) / 6) % RC.length, n = n2(x / 4, y / 4); return shade(RC[b], .82 + n * .3); });
  T.bank = bake(32, 32, (x, y) => shade([112, 92, 64], .8 + n2(x / 3, y / 3) * .35));
  T.water = bake(64, 64, (x, y) => { const w = Math.sin(x * .3 + Math.sin(y * .2) * 2) * Math.sin(y * .25), s = w > .7 ? 1.25 : 1; return shade([46, 116, 188], (.9 + n2(x / 10, y / 10) * .15) * s); });
  const ba = hx(e.boundary[0]), bb = hx(e.boundary[1]);
  T.boundary = bake(32, 16, (x, y) => env === 'hedgerow' ? (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 3) % 7 === 0 ? [80, 74, 64] : shade(ba, .85 + h2(x, y) * .3)) : shade((Math.floor((x + y) / 8) % 2) ? ba : bb, .92 + h2(x, y) * .1));
  return T;
}
export { hx, mix, shade };
