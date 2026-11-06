// World: sky, track, dressing, lights, rain, cones. Shared by RaceScene, ReplayScene and the attract clips.
import { THREE, toonMaterial, PALETTE, applySky, skyAt, Precipitation, setLookLayer } from '../../pixel-engine.js';
import { buildTrackMesh, Skids } from './trackmesh.js';
import { dressTrack } from './dressing.js';
import { App } from '../app.js';
const { Group, Mesh, BoxGeometry, CircleGeometry, ConeGeometry } = THREE;
export class World {
  constructor(ctx, tr, id, { hour = 12, rain = false, test = null } = {}) {
    this.ctx = ctx; this.scene = ctx.scene; this.tr = tr; this.id = id; this.hour = hour; this.rain = rain; this.animated = []; this.cones = []; this.t = 0;
    this.root = new Group(); ctx.scene.add(this.root); this.mesh = buildTrackMesh(tr, id); this.root.add(this.mesh); this.groundY = this.mesh.userData.groundY;
    this.skids = new Skids(); ctx.scene.add(this.skids.mesh);
    this.setHour(hour); // in a hub round the props arrive just after ready(), so the copy is ready fast
    if (App.hubActive) setTimeout(() => { try { dressTrack(ctx, id, tr, this.mesh, this); } catch (e) { /* decoration only */ } }, 8000); else dressTrack(ctx, id, tr, this.mesh, this);
    this.sky();
    if (rain) { this.precip = new Precipitation({ kind: 'rain', count: 1800, area: [60, 30, 60] }); this.precip.intensity = 0.8; ctx.scene.add(this.precip); }
  }
  setHour(h) {
    this.hour = h; const s = skyAt(h), e = this.ctx.engine; applySky(e, s); this.night = s.night;
    if (this.rain) { e.sun.intensity *= 0.55; e.ambient.intensity = Math.max(e.ambient.intensity, 0.9); this.ctx.scene.background = new THREE.Color(PALETTE.slate); if (this.hour > 6 && this.hour < 19) e.sun.color.setHex(PALETTE.mist); }
    if (s.night > 0.2) { e.ambient.intensity = Math.max(e.ambient.intensity, 1.0 + 1.5 * s.night); e.ambient.color.setHex(PALETTE.sky); }
    this.skyState = s;
  }
  sky() { // a far ring of flat silhouettes is in dressing(horizon); here: a sun/moon disc and chunky clouds
    const s = this.skyState, d = new THREE.Vector3(...s.sunDir).multiplyScalar(4800), disc = new Mesh(new CircleGeometry(s.night > 0.5 ? 120 : 190, 16), new THREE.MeshBasicMaterial({ color: s.night > 0.5 ? PALETTE.white : PALETTE.sand, fog: false })); disc.position.set(d.x, Math.max(d.y, 250), d.z);
    this.disc = disc; this.scene.add(disc); this.clouds = [];
    if (!this.rain) for (let i = 0; i < 9; i++) { const g = new Group(); for (let q = 0; q < 3; q++) { const m = new Mesh(new BoxGeometry(160 + q * 40, 30, 60), new THREE.MeshBasicMaterial({ color: s.night > 0.5 ? PALETTE.navy : PALETTE.white, fog: false })); m.position.set(q * 90, q % 2 * 14, 0); g.add(m); } const a = (i / 9) * 6.28; g.position.set(Math.cos(a) * 3500, 520 + (i % 3) * 80, Math.sin(a) * 3500); g.rotation.y = -a; this.scene.add(g); this.clouds.push(g); }
  }
  follow(cam) { this.disc.lookAt(cam.position); this.disc.position.set(cam.position.x + this.skyState.sunDir[0] * 4800, Math.max(cam.position.y + this.skyState.sunDir[1] * 4800, cam.position.y + 250), cam.position.z + this.skyState.sunDir[2] * 4800); }
  addCones(list) { for (const k of list) { const c = new Mesh(new ConeGeometry(0.4, 1.1, 8), toonMaterial(PALETTE.orange)); const i = Math.round(k.s / this.tr.ds) % this.tr.N; c.position.set(this.tr.x[i], this.tr.y[i] + 0.55, this.tr.z[i]); c.castShadow = true; this.scene.add(c); const base = new Mesh(new BoxGeometry(0.9, 0.1, 0.9), toonMaterial(PALETTE.white)); base.position.set(c.position.x, c.position.y - 0.52, c.position.z); this.scene.add(base); this.cones.push({ k, mesh: c, base, vel: null, t: 0 }); } }
  hitCone(s) { const c = this.cones.find((q) => Math.abs(q.k.s - s) < 1); if (c) { c.vel = { x: (Math.random() - 0.5) * 6, y: 7, z: (Math.random() - 0.5) * 6 }; c.t = 0; } }
  update(dt, t, cam, focus) {
    this.t = t; for (const f of this.animated) f(t, dt); if (cam) this.follow(cam); for (const c of this.clouds) c.position.x += dt * 2;
    for (const c of this.cones) if (c.vel) { c.t += dt; c.vel.y -= 20 * dt; c.mesh.position.x += c.vel.x * dt; c.mesh.position.y += c.vel.y * dt; c.mesh.position.z += c.vel.z * dt; c.mesh.rotation.x += dt * 8; if (c.mesh.position.y < 0.3 && c.t > 0.2) { c.mesh.position.y = 0.3; c.vel = null; c.mesh.rotation.z = 1.4; } }
    if (this.precip && focus) this.precip.update(dt, focus);
  }
}
