// Own sky dome, hour table, sun disc, moon, stars; engine owns sun/ambient light via applySky.
import { applySky, skyAt, THREE, SpriteBatch, drawSheet } from '../../pixel-engine.js';
const { Color, Mesh, SphereGeometry, MeshBasicNodeMaterial, BackSide, Float32BufferAttribute } = THREE;
const TABLE = [
  [5.5, '#3a4a6b', '#d99a6c', '#f0b070'], [9, '#6f9fb5', '#c9d6c4', '#e3cf9e'], [13, '#7fa6b8', '#d8dcc0', '#ecd9a6'],
  [16.5, '#7fa6b8', '#e9c98f', '#d98a4e'], [19, '#2b2f52', '#8a4f5c', '#c8643c'], [22, '#0b0f20', '#141a2e', '#1c2238'],
].map(([h, a, b, c]) => [h, new Color(a), new Color(b), new Color(c)]);
export function skyColors(hour, out) {
  const T = TABLE; let i = T.length - 1;
  for (let k = 0; k < T.length; k++) if (hour < T[k][0]) { i = k - 1; break; }
  const a = T[(i + T.length) % T.length], b = T[(i + 1 + T.length) % T.length];
  let span = b[0] - a[0]; if (span <= 0) span += 24;
  let off = hour - a[0]; if (off < 0) off += 24;
  const f = Math.max(0, Math.min(1, off / span));
  for (let c = 0; c < 3; c++) out[c].copy(a[c + 1]).lerp(b[c + 1], f);
  return out;
}
export class Sky {
  constructor(ctx) {
    this.ctx = ctx;
    const geo = new SphereGeometry(900, 24, 16);
    const n = geo.getAttribute('position').count;
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3), 3));
    this.dome = new Mesh(geo, new MeshBasicNodeMaterial({ vertexColors: true, side: BackSide, fog: false }));
    this.dome.frustumCulled = false; this.dome.castShadow = this.dome.receiveShadow = false;
    ctx.scene.add(this.dome);
    this.cols = [new Color(), new Color(), new Color()];
    this.hour = -1; this.last = -99;
    this.fogCol = new Color();
  }
  /** repaint dome when the hour moved enough; follows the camera each frame */
  update(hour, camPos, force) {
    this.dome.position.copy(camPos);
    if (!force && Math.abs(hour - this.hour) < 0.02) return;
    this.hour = hour;
    const [top, mid, hor] = skyColors(hour, this.cols);
    const g = this.dome.geometry, pos = g.getAttribute('position'), col = g.getAttribute('color');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 900;
      const c = y > 0.25 ? top : null;
      let r, gg, b;
      if (y >= 0.35) { r = top.r; gg = top.g; b = top.b; }
      else if (y >= 0.08) { const f = (y - 0.08) / 0.27; r = mid.r + (top.r - mid.r) * f; gg = mid.g + (top.g - mid.g) * f; b = mid.b + (top.b - mid.b) * f; }
      else { const f = Math.max(0, (y + 0.1) / 0.18); r = hor.r + (mid.r - hor.r) * f; gg = hor.g + (mid.g - hor.g) * f; b = hor.b + (mid.b - hor.b) * f; }
      col.setXYZ(i, r, gg, b);
    }
    col.needsUpdate = true;
    this.fogCol.copy(hor).lerp(mid, 0.3);
    const st = skyAt(hour); applySky(this.ctx.engine, st);
    const eng = this.ctx.engine; eng.ambient.intensity = Math.max(eng.ambient.intensity, 0.55 + st.night * 0.75); eng.sun.intensity = Math.max(eng.sun.intensity, 0.5);
    // applySky sets scene.background; the dome covers it, keep the fog colour in step
    return true;
  }
}
