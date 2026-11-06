// Time of day, weather you can see, seasonal air. Interiors keep their own sky.
import { applySky, skyAt, Precipitation, groundFog, PALETTE, THREE, toonMaterial } from '../engine.js';
import { weatherNow, hourNow, calendarNow } from './time.js';
import { tuning } from '../dev/tuning.js';

const { Mesh, TorusGeometry, Group } = THREE;
const ROOM_SKY = { sunDir: [0.45, 0.8, 0.55], sunColor: 0xfff0d8, sunIntensity: 1.9, ambientColor: 0xfff0e0, ambientIntensity: 1.5, sky: PALETTE.ink, night: 0 };
const ROOM_DIM = { sunDir: [0.45, 0.8, 0.55], sunColor: 0xc8c0e8, sunIntensity: 1.5, ambientColor: 0x9090c8, ambientIntensity: 1.5, sky: PALETTE.ink, night: 1 };

export class Sky {
  constructor(g) {
    this.g = g;
    this.lastMinute = -1;
    this.rain = new Precipitation({ kind: 'rain', count: 1800, area: [34, 16, 34], color: PALETTE.sky });
    this.snow = new Precipitation({ kind: 'snow', count: 900, area: [34, 12, 34], color: PALETTE.white });
    this.rain.intensity = 0; this.snow.intensity = 0;
    g.ctx.scene.add(this.rain, this.snow);
    this.mist = groundFog({ color: PALETTE.mist, top: 1.4, amount: 0, near: 200, far: 400 });
    g.ctx.scene.fogNode = this.mist.node;
    this.kind = 'sun';
    this.thunderT = 8;
    this.airT = 0;
    this.rainbow = new Group();
    const colors = [PALETTE.red, PALETTE.orange, PALETTE.sand, PALETTE.lime, PALETTE.sky, PALETTE.plum];
    colors.forEach((c, i) => { const m = new Mesh(new TorusGeometry(12 - i * 0.5, 0.25, 4, 24, Math.PI), toonMaterial(c)); this.rainbow.add(m); });
    this.rainbow.visible = false;
    g.town.group.add(this.rainbow);
    this.rainbowT = 0;
    this.prevWet = false;
  }
  setSeason() {}
  placeChanged() { this.lastMinute = -1; this.apply(); }
  apply() {
    const g = this.g;
    const place = g.place;
    if (place?.kind === 'room' && !place.outdoors) { applySky(g.engine, place.def?.dim ? ROOM_DIM : ROOM_SKY); return; }
    const w = g.world;
    const h = w.clock.minute / 60;
    const c = calendarNow(g);
    let s = skyAt(h);
    const k = this.kind;
    if (c.festival === 'longNight' && h >= 16) s = skyAt(Math.max(h, 21));
    if (k === 'rain' || k === 'storm' || k === 'fog' || k === 'snow') {
      s = { ...s, sunIntensity: s.sunIntensity * 0.62, ambientIntensity: s.ambientIntensity * 0.95 };
    }
    applySky(g.engine, s);
    this.night = s.night;
    g.town.applyLit(s.night);
    g.isNightNow = s.night > 0.35;
    if (place === g.city) { place.setLook?.(place.isNight()); }
  }
  update(dt) {
    const g = this.g;
    const w = g.world;
    const minute = Math.floor(w.clock.minute);
    this.kind = weatherNow(g);
    const out = g.place?.kind !== 'room' || !!g.place?.outdoors;
    if (minute !== this.lastMinute) { this.lastMinute = minute; this.apply(); }
    const p = g.player;
    const k = this.kind;
    const wet = k === 'rain' || k === 'storm';
    const focus = this.focus ??= new THREE.Vector3();
    focus.set(p.x + (g.place?.ox ?? 0), 8, p.z + (g.place?.oz ?? 0));
    const rainI = out && wet ? (k === 'storm' ? 1 : 0.65) : 0;
    const snowI = out && k === 'snow' ? 0.8 : 0;
    this.rain.intensity = rainI;
    this.snow.intensity = snowI;
    this.rain.visible = rainI > 0;
    this.snow.visible = snowI > 0;
    const wind = k === 'wind' ? 5 : k === 'storm' ? 4 : k === 'snow' ? 1 : 1.2;
    g.windNow = wind;
    this.rain.wind.set(wind * 0.5, 0.5);
    this.snow.wind.set(wind * 0.4, 0.3);
    if (rainI > 0) this.rain.update(dt, focus);
    if (snowI > 0) this.snow.update(dt, focus);
    const fogAmt = out && k === 'fog' ? 0.7 : out && g.season === 2 && (w.clock.minute < 9 * 60 || k === 'fog') ? 0.35 : 0;
    this.mist.amount.value += (fogAmt - this.mist.amount.value) * Math.min(1, dt * 0.5);
    // Rainbow after rain, in spring
    if (this.prevWet && !wet && g.season === 0) { this.rainbowT = 60; }
    this.prevWet = wet;
    if (this.rainbowT > 0) { this.rainbowT -= dt; this.rainbow.position.set(p.x, 0, p.z - 8); }
    this.rainbow.visible = this.rainbowT > 0 && g.place === g.town;
    // Thunder evenings
    if (k === 'storm' && out) {
      this.thunderT -= dt;
      if (this.thunderT <= 0) {
        this.thunderT = 7 + ((w.clock.minute * 13) % 11);
        g.engine.screen.flash('white', { duration: 0.12 });
        g.sound('thunder');
        g.rumble(0.7, 400);
        g.events.emit('thunder', {});
      }
    }
    if (out) this.seasonalAir(dt);
    // Rain waters flowers
    if (wet && g.place) { g.world.flags.rainedDay = w.clock.day; }
  }
  seasonalAir(dt) {
    const g = this.g;
    this.airT -= dt;
    if (this.airT > 0 || g.place !== g.town) return;
    this.airT = 0.35;
    const p = g.player;
    const r = g.cosmetic;
    const at = [p.x + r.range(-8, 8), p.y + r.range(3, 7), p.z + r.range(-9, 3)];
    if (g.season === 0) g.ctx.particles.burst('petal', at, { direction: [1, -0.2, 0.4] });
    else if (g.season === 2) g.ctx.particles.burst('fall', at, { direction: [1, -0.3, 0.3] });
    else if (g.season === 1 && (this.night ?? 0) > 0.5) g.ctx.particles.burst('fly', [p.x + r.range(-8, 8), p.y + r.range(0.4, 2), p.z + r.range(-8, 4)]);
  }
}
export { hourNow, tuning };
