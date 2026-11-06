// Dome, sun, moon, stars, weather and the look of the hour. The engine's applySky gives sun and ambient; the colours are ours.
import { THREE, applySky, skyAt, groundFog, glowMaterial, PALETTE, SpriteBatch, spriteSheet, Precipitation, TSL } from '../../pixel-engine.js';
import { starSprite } from '../art/textures.js';
import { clamp, lerp } from '../core/rng.js';
const { Mesh, SphereGeometry, BackSide, Color, BufferAttribute, MeshBasicNodeMaterial, Vector3 } = THREE;
const TABLE = [
  [5.5, '#3a4a6b', '#d99a6c', '#f0b070'], [9, '#6f9fb5', '#c9d6c4', '#e3cf9e'], [13, '#7fa6b8', '#d8dcc0', '#ecd9a6'],
  [16.5, '#7fa6b8', '#e9c98f', '#d98a4e'], [19, '#2b2f52', '#8a4f5c', '#c8643c'], [22, '#0b0f20', '#141a2e', '#1c2238'],
].map(([h, a, b, c]) => [h, new Color(a), new Color(b), new Color(c)]);
const _a = new Color(), _b = new Color(), _c = new Color();
const c1 = new Color(), c2 = new Color();
export function skyColors(hour, out) {
  const h = ((hour % 24) + 24) % 24;
  let i = TABLE.length - 1, j = 0, t = 0;
  for (let k = 0; k < TABLE.length; k++) {
    const a = TABLE[k], b = TABLE[(k + 1) % TABLE.length];
    const end = b[0] > a[0] ? b[0] : b[0] + 24, hh = h < a[0] ? h + 24 : h;
    if (hh >= a[0] && hh <= end) { i = k; j = (k + 1) % TABLE.length; t = (hh - a[0]) / (end - a[0]); break; }
  }
  out[0].copy(TABLE[i][1]).lerp(TABLE[j][1], t); out[1].copy(TABLE[i][2]).lerp(TABLE[j][2], t); out[2].copy(TABLE[i][3]).lerp(TABLE[j][3], t);
  return out;
}
export class Sky {
  dirty = 0; storm = false; dust = false; lastHour = -99; lightningIn = 8;
  constructor(game) { this.game = game; }
  build(ctx) {
    const { scene } = ctx;
    const geo = new SphereGeometry(900, 24, 16);
    const n = geo.attributes.position.count;
    geo.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
    this.domeGeo = geo;
    this.dome = new Mesh(geo, new MeshBasicNodeMaterial({ vertexColors: true, side: BackSide, fog: false }));
    this.dome.frustumCulled = false; this.dome.castShadow = this.dome.receiveShadow = false;
    scene.add(this.dome);
    this.sunMesh = new Mesh(new SphereGeometry(26, 10, 8), glowMaterial(PALETTE.sand)); this.sunMesh.frustumCulled = false;
    this.moonMesh = new Mesh(new SphereGeometry(16, 10, 8), glowMaterial(PALETTE.mist)); this.moonMesh.frustumCulled = false;
    scene.add(this.sunMesh, this.moonMesh);
    this.fog = groundFog({ color: 0xd9b48a, top: 1, amount: 0.55, near: 200, far: 950 });
    scene.fogNode = this.fog.node;
    if (this.game.views) {
      this.stars = new SpriteBatch(spriteSheet(starSprite), { capacity: 160 });
      const r = ctx.random.fork('stars');
      this.starDirs = [];
      for (let i = 0; i < 160; i++) {
        const a = r.range(0, Math.PI * 2), e = r.range(0.08, 1.5);
        this.starDirs.push(new Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(820));
        this.stars.spawn([0, -2000, 0], { size: r.range(5, 11), frame: 0 });
      }
      this.stars.frustumCulled = false;
      scene.add(this.stars);
      this.rain = new Precipitation({ kind: 'rain', count: 3000, area: [60, 34, 60], color: PALETTE.mist });
      this.rain.intensity = 0;
      scene.add(this.rain);
    }
    this.rainLoopOn = false;
  }
  setWeather(kind) {
    this.storm = kind === 'storm'; this.dust = kind === 'dust';
    this.kind = kind;
    if (this.rain) this.rain.intensity = this.storm ? 1 : 0;
    const g = this.game;
    g.fire.raining = this.storm;
    g.wind.weatherBoost = this.storm ? 3 : this.dust ? 2.5 : 0;
  }
  paint(hour) {
    const cols = skyColors(hour, [_a, _b, _c]);
    const pos = this.domeGeo.attributes.position, col = this.domeGeo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const v = clamp(pos.getY(i) / 900, -0.2, 1);
      if (v < 0.22) c1.copy(cols[2]).lerp(cols[1], clamp((v + 0.02) / 0.24, 0, 1));
      else c1.copy(cols[1]).lerp(cols[0], clamp((v - 0.22) / 0.6, 0, 1));
      if (this.storm) c1.lerp(c2.setHex(0x1c2238), 0.7);
      if (this.dust) c1.lerp(c2.setHex(0xc99a68), 0.5);
      col.setXYZ(i, c1.r, c1.g, c1.b);
    }
    col.needsUpdate = true;
    this.fog.color.value.copy(cols[2]);
    if (this.storm) this.fog.color.value.lerp(c2.setHex(0x1c2238), 0.75);
    if (this.dust) this.fog.color.value.lerp(c2.setHex(0xd8a878), 0.7);
    this.fog.amount.value = this.dust ? 1 : this.storm ? 1 : 0.55;
  }
  apply(ctx, hour) {
    const s = skyAt(hour);
    applySky(ctx.engine, s);
    ctx.scene.background = null;
    // Moonlight you can walk by: navy and ink, with fire the only warm thing.
    ctx.engine.ambient.intensity += s.night * 0.75;
    ctx.engine.sun.intensity += s.night * 0.5;
    if (this.storm) { ctx.engine.sun.intensity *= 0.35; ctx.engine.ambient.intensity *= 0.6; }
    this.night = s.night;
    this.sunDir = s.sunDir;
    this.paint(hour);
  }
  update(ctx, dt, hour, camPos) {
    this.dome.position.copy(camPos);
    const t = ((hour - 6) / 12) * Math.PI;
    const sx = Math.cos(t), sy = Math.sin(t);
    this.sunMesh.position.set(camPos.x + sx * 780, camPos.y + sy * 780, camPos.z + 180);
    this.sunMesh.visible = sy > -0.06 && !this.storm;
    this.moonMesh.position.set(camPos.x - sx * 760, camPos.y - sy * 760, camPos.z - 200);
    this.moonMesh.visible = sy < 0.1 && !this.storm;
    if (this.stars) {
      const on = (this.night ?? 0) > 0.45 && !this.storm;
      for (let i = 0; i < this.starDirs.length; i++) {
        const d = this.starDirs[i];
        if (on) this.stars.put(i, camPos.x + d.x, camPos.y + d.y, camPos.z + d.z, 0, false);
        else this.stars.put(i, 0, -3000, 0, 0, false);
      }
    }
    if (this.dust && (this.dustT = (this.dustT ?? 0) - dt) <= 0) {
      this.dustT = 0.06;
      const w = this.game.wind;
      ctx.particles.burst('dust-wind', [camPos.x - w.x * 18, camPos.y, camPos.z - w.z * 18], { direction: [w.x, 0.04, w.z], speed: 1.6 });
    }
    if (this.rain && this.storm) { this.rain.wind.set(this.game.wind.vx * 0.6, this.game.wind.vz * 0.6); this.rain.update(dt, camPos); }
  }
  /** Rain falls on game time; lightning throws a flash and thunder a moment after, from fixedUpdate. */
  stepStorm(ctx, dt, rng) {
    if (!this.storm) return;
    this.lightningIn -= dt;
    if (this.lightningIn <= 0) {
      this.lightningIn = rng.range(7, 18);
      if (!this.game.settings.reduceFlashes) ctx.engine.screen.flash('white', { duration: 0.12 });
      this.game.sfx?.play('thunder', { volume: rng.range(0.6, 1) });
    }
  }
}
