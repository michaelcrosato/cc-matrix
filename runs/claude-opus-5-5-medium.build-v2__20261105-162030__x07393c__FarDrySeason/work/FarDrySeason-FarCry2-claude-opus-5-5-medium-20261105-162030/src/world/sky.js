// Time of day: the engine's sun and ambient, our own dome, sun disc, moon and stars (section 6).
import { applySky, glowMaterial, groundFog, PALETTE, skyAt, THREE } from '../../pixel-engine.js';
import { clamp, lerp } from './geom.js';
const { BackSide, BufferAttribute, Color, Mesh, MeshBasicNodeMaterial, SphereGeometry, BoxGeometry, Group } = THREE;
const TABLE = [
  [0, '#0b0f20', '#141a2e', '#1c2238'], [5.5, '#3a4a6b', '#d99a6c', '#f0b070'], [9, '#6f9fb5', '#c9d6c4', '#e3cf9e'], [13, '#7fa6b8', '#d8dcc0', '#ecd9a6'],
  [16.5, '#7fa6b8', '#e9c98f', '#d98a4e'], [19, '#2b2f52', '#8a4f5c', '#c8643c'], [22, '#0b0f20', '#141a2e', '#1c2238'], [24, '#0b0f20', '#141a2e', '#1c2238'],
].map(([h, a, b, c]) => [h, new Color(a), new Color(b), new Color(c)]);
const tmpA = new Color(), tmpB = new Color(), tmpC = new Color();
export function skyColours(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < TABLE.length - 2 && TABLE[i + 1][0] <= h) i++;
  const a = TABLE[i], b = TABLE[i + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  tmpA.copy(a[1]).lerp(b[1], t); tmpB.copy(a[2]).lerp(b[2], t); tmpC.copy(a[3]).lerp(b[3], t);
  return [tmpA, tmpB, tmpC];
}
export class Sky {
  hour = 16.5;
  storm = 0; dust = 0;
  build(ctx) {
    this.ctx = ctx;
    const geo = new SphereGeometry(1100, 24, 16);
    this.pos = geo.getAttribute('position');
    this.cols = new BufferAttribute(new Float32Array(this.pos.count * 3), 3);
    geo.setAttribute('color', this.cols);
    this.dome = new Mesh(geo, new MeshBasicNodeMaterial({ vertexColors: true, side: BackSide, fog: false }));
    this.dome.frustumCulled = false; this.dome.castShadow = this.dome.receiveShadow = false;
    ctx.scene.add(this.dome);
    this.sun = new Mesh(new BoxGeometry(70, 70, 1), glowMaterial(PALETTE.sand));
    this.moon = new Mesh(new BoxGeometry(46, 46, 1), glowMaterial(PALETTE.mist));
    this.stars = new Group();
    const star = glowMaterial(PALETTE.white), r = ctx.random.fork('stars'), geoS = new BoxGeometry(3, 3, 1);
    for (let i = 0; i < 90; i++) { const m = new Mesh(geoS, star), a = r.range(0, 6.283), e = r.range(0.12, 1.4); m.position.set(Math.cos(a) * Math.cos(e) * 1000, Math.sin(e) * 1000, Math.sin(a) * Math.cos(e) * 1000); m.lookAt(0, 0, 0); this.stars.add(m); }
    for (const m of [this.sun, this.moon, this.stars]) { m.castShadow = false; ctx.scene.add(m); }
    this.fog = groundFog({ color: 0xd98a4e, top: 0.01, amount: 0.8, near: 160, far: 950 });
    ctx.scene.fogNode = this.fog.node;
    this.lastApply = -1;
    this.apply(this.hour, true);
  }
  /** At most 10 Hz (the caller throttles). */
  apply(hour, force) {
    this.hour = hour;
    const s = skyAt(hour);
    const eng = this.ctx.engine;
    applySky(eng, s);
    if (this.storm > 0) { eng.sun.intensity *= 1 - 0.6 * this.storm; eng.ambient.intensity *= 1 - 0.35 * this.storm; }
    const night = s.night;
    this.night = night;
    const [top, mid, hor] = skyColours(hour);
    const grey = 0.75 * this.storm;
    const arr = this.cols.array, P = this.pos;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i) / 1100;
      const c = y > 0.25 ? tmpA.clone().lerp(top, 1) : null;
      let r, g, b;
      if (y >= 0.28) { const t = clamp((y - 0.28) / 0.5, 0, 1); r = lerp(mid.r, top.r, t); g = lerp(mid.g, top.g, t); b = lerp(mid.b, top.b, t); }
      else { const t = clamp(y / 0.28, 0, 1); r = lerp(hor.r, mid.r, t); g = lerp(hor.g, mid.g, t); b = lerp(hor.b, mid.b, t); }
      const v = (r + g + b) / 3 * 0.55;
      arr[i * 3] = lerp(r, v, grey) + this.dust * 0.08; arr[i * 3 + 1] = lerp(g, v, grey) + this.dust * 0.03; arr[i * 3 + 2] = lerp(b, v, grey) - this.dust * 0.05;
      void c;
    }
    this.cols.needsUpdate = true;
    this.fog.color.value.copy(hor);
    this.fog.amount.value = clamp(0.8 + this.dust * 0.5 + this.storm * 0.4, 0, 1.6);
    // Discs on the sun's own direction.
    const d = s.sunDir, up = d[1];
    this.sun.visible = night < 0.5 && this.storm < 0.5; this.moon.visible = night >= 0.5 && this.storm < 0.5;
    this.stars.visible = night > 0.4 && this.storm < 0.5;
    this.sunDir = d; void up;
  }
  follow(camPos) {
    this.dome.position.copy(camPos);
    this.stars.position.copy(camPos);
    const d = this.sunDir; if (!d) return;
    for (const m of [this.sun, this.moon]) { m.position.set(camPos.x + d[0] * 1040, camPos.y + d[1] * 1040, camPos.z + d[2] * 1040); m.lookAt(camPos); }
  }
}
