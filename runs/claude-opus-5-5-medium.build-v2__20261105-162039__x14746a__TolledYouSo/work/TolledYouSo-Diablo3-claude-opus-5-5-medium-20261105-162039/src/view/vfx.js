// Effects are views of events: they never touch the sim. Each lives in a list until its update says it's done.
import { buildModel, glowMaterial, PALETTE, setLookLayer, THREE, toonMaterial, Trail } from '../../pixel-engine.js';
import { MODELS } from './models/props.js';

const { BoxGeometry, CircleGeometry, Group, Mesh, RingGeometry, SphereGeometry, CylinderGeometry, Vector3 } = THREE;
const RING = new RingGeometry(0.93, 1, 40).rotateX(-Math.PI / 2);
const RING_THICK = new RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2);
const DISC = new CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const BOX = new BoxGeometry(1, 1, 1);
const BALL = new SphereGeometry(1, 8, 6);
const COL = (n) => glowMaterial(PALETTE[n]);
export const ELEMENT_COLORS = { sound: ['sand', 'white'], flame: ['orange', 'red', 'sand'], grave: ['lime', 'plum'], phys: ['mist', 'white'] };
const RINGS = { ring_bronze: ['orange', 'sand'], ring_fire: ['red', 'orange'], ring_grave: ['lime', 'plum'], ring_chain: ['mist', 'slate'] };
const FIELD = { fire: { c: 'orange', p: 'ember', light: 0xff7020 }, poison: { c: 'lime', p: 'grave_smoke', light: 0x90ff50 }, shock: { c: 'sand', p: 'shock' }, hallowed: { c: 'sand', p: 'shock', light: 0xffe0a0 }, beacon: { c: 'orange', p: 'ember', light: 0xffa040, pillar: true }, curse: { c: 'plum', p: 'grave_smoke' }, blue: { c: 'sky', p: 'shock', light: 0x60a0ff } };
const PROJ = { spark: { c: 'orange', s: 0.16, p: 'ember', light: 0xff8030 }, wave: { c: 'sand', s: 0.5, flat: true, p: 'shock' }, bone: { c: 'white', s: 0.15, p: 'bone_chips' }, skull: { c: 'lime', s: 0.2, p: 'grave_smoke' }, note: { c: 'cyan', s: 0.16, p: 'shock' }, bolt: { c: 'mist', s: 0.1 } };

export function registerParticles(ctx) {
  const P = ctx.particles;
  P.register('ember', { count: [3, 6], life: [0.4, 0.9], speed: [1, 3], gravity: -2, size: [1, 1], colors: ['sand', 'orange', 'red'] });
  P.register('shock', { count: [3, 5], life: [0.25, 0.5], speed: [2, 4], gravity: 0, size: [1, 1], colors: ['white', 'sand'] });
  P.register('grave_smoke', { count: [3, 5], life: [0.5, 1.1], speed: [0.4, 1.2], gravity: -1, size: [1, 2], colors: ['lime', 'plum', 'night'] });
  P.register('coin_spray', { count: [6, 10], life: [0.4, 0.8], speed: [2, 5], gravity: 9, size: [1, 1], colors: ['sand', 'orange'] });
  P.register('bone_chips', { count: [6, 10], life: [0.4, 0.8], speed: [2, 5], gravity: 9, size: [1, 2], colors: ['white', 'mist'] });
  P.register('wax', { count: [4, 6], life: [0.3, 0.6], speed: [1, 2], gravity: 6, size: [1, 1], colors: ['white', 'sand'] });
  P.register('peat', { count: [8, 12], life: [0.4, 0.9], speed: [2, 5], gravity: 10, size: [1, 2], colors: ['night', 'teal', 'plum'] });
  P.register('flesh', { count: [3, 5], life: [0.25, 0.5], speed: [1.5, 3], gravity: 8, size: [1, 1], colors: ['plum', 'red'] });
  P.register('rain_splash', { count: [1, 2], life: [0.15, 0.25], speed: [0.5, 1.2], gravity: 4, size: [1, 1], colors: ['sky', 'white'] });
  P.register('emberfall', { count: [1, 2], life: [1, 2], speed: [0.2, 0.7], gravity: -0.8, size: [1, 1], colors: ['sand', 'orange', 'red'] });
  P.register('rift_spark', { count: [1, 2], life: [0.5, 1], speed: [0.5, 1.5], gravity: -1.5, size: [1, 1], colors: ['cyan', 'white', 'sky'] });
}

// Shatter chunks: cosmetic boxes with gravity and a floor bounce. Light on purpose: hundreds can fly at once.
export class Chunks {
  constructor(ctx, fx) { this.ctx = ctx; this.fx = fx; this.rng = ctx.random.fork('chunks'); this.alive = 0; }
  burst(at, size, color, cuts, from, speed, linger = 2.2) {
    const mat = toonMaterial(PALETTE[color] ?? PALETTE.slate); const r = this.rng; const list = [];
    for (let ix = 0; ix < cuts[0]; ix++) for (let iy = 0; iy < cuts[1]; iy++) for (let iz = 0; iz < cuts[2]; iz++) {
      const sx = size[0] / cuts[0]; const sy = size[1] / cuts[1]; const sz = size[2] / cuts[2];
      const m = new Mesh(BOX, mat); m.castShadow = true; m.scale.set(sx * r.range(0.7, 1), sy * r.range(0.7, 1), sz * r.range(0.7, 1));
      const x = at[0] - size[0] / 2 + sx * (ix + 0.5); const y = at[1] - size[1] / 2 + sy * (iy + 0.5); const z = at[2] - size[2] / 2 + sz * (iz + 0.5);
      m.position.set(x, y, z); setLookLayer(m, 'actors'); this.fx.root.add(m);
      const dx = x - from[0] + r.range(-0.2, 0.2); const dy = y - from[1] + r.range(0, 0.4); const dz = z - from[2] + r.range(-0.2, 0.2); const d = Math.hypot(dx, dy, dz) || 1; const v = speed * r.range(0.5, 1);
      list.push({ m, vx: (dx / d) * v, vy: (dy / d) * v + 2, vz: (dz / d) * v, sx: r.range(-9, 9), sz: r.range(-9, 9), rest: false });
    }
    this.alive += list.length; let t = 0;
    this.fx.add({ update: (dt) => {
      t += dt;
      for (const c of list) {
        if (c.rest) continue;
        c.vy -= 16 * dt; c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt; c.m.rotation.x += c.sx * dt; c.m.rotation.z += c.sz * dt;
        if (c.m.position.y < 0.06) { c.m.position.y = 0.06; c.vy *= -0.35; c.vx *= 0.55; c.vz *= 0.55; c.sx *= 0.5; c.sz *= 0.5; if (Math.abs(c.vy) < 0.8) c.rest = true; }
      }
      if (t > linger) { const k = 1 - (t - linger) / 0.4; for (const c of list) c.m.scale.multiplyScalar(k > 0 ? 0.92 : 0); }
      return t < linger + 0.4;
    }, end: () => { this.alive -= list.length; for (const c of list) this.fx.root.remove(c.m); } });
  }
}

export class Fx {
  constructor(ctx) { this.ctx = ctx; this.list = []; this.root = new Group(); ctx.scene.add(this.root); this.tele = new Map(); this.proj = new Map(); this.fields = new Map(); this.obst = new Map(); this.beams = new Map(); }
  clear() { for (const f of this.list) f.end?.(); this.list = []; this.tele.clear(); this.proj.clear(); for (const f of this.fields.values()) f.light?.release?.(); this.fields.clear(); this.obst.clear(); this.beams.clear(); this.root.clear(); }
  add(f) { this.list.push(f); return f; }
  mesh(geo, mat, x, y, z) { const m = new Mesh(geo, mat); m.position.set(x, y, z); this.root.add(m); return m; }
  ring(kind, x, z, r, dur = 0.35) {
    const cols = RINGS[kind] ?? ['white', 'sand'];
    const a = this.mesh(RING_THICK, COL(cols[0]), x, 0.08, z); const b = this.mesh(RING, COL(cols[1]), x, 0.1, z);
    let t = 0;
    this.add({ update: (dt) => { t += dt; const k = Math.min(1, t / dur); const e = 1 - (1 - k) * (1 - k); a.scale.setScalar(Math.max(0.01, r * e)); b.scale.setScalar(Math.max(0.01, r * e * 0.8)); if (k > 0.7) { a.visible = Math.floor(t * 40) % 2 === 0; } return k < 1; }, end: () => { this.root.remove(a, b); } });
    if (r >= 2.5) this.ctx.engine.screen.shockwave?.([x, 0.2, z], { radius: Math.min(0.5, r * 0.05) });
    this.ctx.particles.burst(kind === 'ring_fire' ? 'ember' : kind === 'ring_grave' ? 'grave_smoke' : 'shock', [x, 0.4, z], { count: Math.round(4 + r * 2) });
  }
  cone(x, z, ax, az, range, angle) {
    const steps = 7; const half = (angle / 2) * Math.PI / 180; const base = Math.atan2(ax, az); const meshes = [];
    for (let i = 0; i < steps; i++) { const a = base - half + (i / (steps - 1)) * half * 2; const m = this.mesh(BOX, COL(i % 2 ? 'orange' : 'sand'), x, 0.6, z); m.rotation.y = a; m.userData.a = a; meshes.push(m); }
    let t = 0;
    this.add({ update: (dt) => { t += dt; const k = Math.min(1, t / 0.22); for (const m of meshes) { const d = range * k; m.position.set(x + Math.sin(m.userData.a) * d * 0.5, 0.6, z + Math.cos(m.userData.a) * d * 0.5); m.scale.set(0.16 + k * 0.5, 0.16, Math.max(0.1, d)); m.visible = t < 0.2 || Math.floor(t * 50) % 2 === 0; } return t < 0.28; }, end: () => { this.root.remove(...meshes); } });
    for (let i = 0; i < 12; i++) { const a = base + (i / 12 - 0.5) * half * 2; this.ctx.particles.burst('ember', [x + Math.sin(a) * range * 0.6, 0.6, z + Math.cos(a) * range * 0.6], { count: 2 }); }
  }
  swing(x, z, ax, az, element = 'phys') {
    const col = ELEMENT_COLORS[element]?.[0] ?? 'white'; const base = Math.atan2(ax, az); const R = 1.9; const segs = [];
    for (let i = 0; i < 2; i++) { const m = this.mesh(BOX, COL(col), x, 0.9, z); m.scale.set(0.3, 0.12, 0.12); segs.push(m); }
    const trail = new Trail({ width: 0.4, life: 0.16, color: PALETTE[col], tail: PALETTE.ink, points: 16 }); this.root.add(trail); const p = new Vector3();
    let t = 0;
    this.add({ update: (dt) => { t += dt; const k = Math.min(1, t / 0.14); const a = base - 1 + 2 * k; p.set(x + Math.sin(a) * R, 0.9, z + Math.cos(a) * R); segs[0].position.copy(p); segs[0].visible = t < 0.15; segs[1].visible = false; trail.push(p, t); trail.update(t, this.ctx.camera.camera); return t < 0.3; }, end: () => { this.root.remove(...segs); this.root.remove(trail); trail.dispose(); } });
  }
  burst(kind, x, z, r) {
    const p = kind === 'burst_fire' ? 'ember' : kind === 'burst_grave' ? 'grave_smoke' : 'shock';
    this.ctx.particles.burst(p, [x, 0.5, z], { count: Math.round(6 + r * 3) });
  }
  telegraph(ev) {
    const col = COL(ev.color && PALETTE[ev.color] ? ev.color : 'red'); const parts = []; const id = ev.id; let t = 0; const dur = ev.dur;
    let upd;
    if (ev.kind === 'circle' || ev.kind === 'ring') {
      const outer = this.mesh(RING, col, ev.x, 0.07, ev.z); outer.scale.setScalar(ev.r); const inner = this.mesh(RING_THICK, col, ev.x, 0.09, ev.z); parts.push(outer, inner);
      upd = (k) => { inner.scale.setScalar(Math.max(0.02, ev.r * k)); outer.visible = k > 0.85 ? Math.floor(t * 30) % 2 === 0 : true; };
    } else {
      const dx = ev.x2 - ev.x; const dz = ev.z2 - ev.z; const L = Math.hypot(dx, dz) || 1; const a = Math.atan2(dx, dz); const w = ev.width ?? 1;
      const mid = (s) => [ev.x + (dx / L) * s, ev.z + (dz / L) * s];
      const edge1 = this.mesh(BOX, col, 0, 0.07, 0); const edge2 = this.mesh(BOX, col, 0, 0.07, 0); const fill = this.mesh(BOX, col, 0, 0.09, 0); parts.push(edge1, edge2, fill);
      for (const p of parts) p.rotation.y = a;
      const [mx, mz] = mid(L / 2); const px = Math.cos(a) * w; const pz = -Math.sin(a) * w;
      edge1.position.set(mx + px, 0.07, mz + pz); edge2.position.set(mx - px, 0.07, mz - pz); edge1.scale.set(0.1, 0.02, L); edge2.scale.set(0.1, 0.02, L);
      upd = (k) => { const [fx, fz] = mid((L * k) / 2); fill.position.set(fx, 0.09, fz); fill.scale.set(w * 2 * 0.9, 0.02, Math.max(0.05, L * k)); };
    }
    const f = this.add({ update: (dt) => { t += dt; upd(Math.min(1, t / dur)); return t < dur + 0.05 && !f.done; }, end: () => { this.root.remove(...parts); } });
    this.tele.set(id, f);
  }
  telefire(ev) {
    const f = this.tele.get(ev.id); if (f) f.done = true; this.tele.delete(ev.id);
    if (ev.vfx === 'hook') { this.lineFlash(ev.x, ev.z, ev.x2, ev.z2, 'mist'); return; }
    if (ev.vfx && ev.kind !== 'line') this.ring(ev.vfx, ev.x, ev.z, ev.r);
    else if (ev.kind === 'line') this.lineFlash(ev.x, ev.z, ev.x2, ev.z2, 'red');
  }
  lineFlash(x, z, x2, z2, c = 'mist') {
    const dx = x2 - x; const dz = z2 - z; const L = Math.hypot(dx, dz) || 1; const m = this.mesh(BOX, COL(c), (x + x2) / 2, 0.7, (z + z2) / 2); m.rotation.y = Math.atan2(dx, dz); m.scale.set(0.16, 0.16, L);
    let t = 0; this.add({ update: (dt) => { t += dt; m.scale.x = 0.16 * (1 - t / 0.16); return t < 0.16; }, end: () => this.root.remove(m) });
  }
  arc(x, z, x2, z2, element) { this.lineFlash(x, z, x2, z2, ELEMENT_COLORS[element]?.[0] ?? 'sand'); }
  projectile(ev) {
    const s = PROJ[ev.look] ?? PROJ.spark; const col = ev.hostile ? (ev.look === 'note' ? 'cyan' : 'red') : s.c;
    const m = this.mesh(s.flat ? BOX : BALL, COL(col), ev.x, 0.9, ev.z);
    if (s.flat) { m.scale.set(ev.w * 2, 0.2, 0.3); m.rotation.y = Math.atan2(ev.vx, ev.vz); } else m.scale.setScalar(s.s);
    const f = { x: ev.x, z: ev.z, vx: ev.vx, vz: ev.vz, m, t: 0, s, range: ev.range, travelled: 0 };
    f.light = s.light ? this.ctx.lights.request({ follow: m, color: s.light, intensity: 5, radius: 4, priority: 3 }) : null;
    const trail = s.flat ? null : new Trail({ width: Math.max(0.12, s.s), life: 0.25, color: PALETTE[col], tail: PALETTE.ink, points: 12 }); if (trail) this.root.add(trail);
    f.update = (dt) => { f.x += f.vx * dt; f.z += f.vz * dt; f.travelled += Math.hypot(f.vx, f.vz) * dt; m.position.set(f.x, 0.9, f.z); f.t += dt; if (trail) { trail.push(m.position, f.t); trail.update(f.t, this.ctx.camera.camera); } if (s.p && Math.floor(f.t * 30) % 2 === 0) this.ctx.particles.burst(s.p, m.position, { count: 1 }); return !f.done && f.travelled < f.range + 2; };
    f.end = () => { this.root.remove(m); f.light?.release(); if (trail) { this.root.remove(trail); trail.dispose(); } };
    this.add(f); this.proj.set(ev.id, f);
  }
  projEnd(ev) { const f = this.proj.get(ev.id); if (f) { f.done = true; this.proj.delete(ev.id); if (f.s.p) this.ctx.particles.burst(f.s.p, [ev.x, 0.8, ev.z], { count: 5 }); } }
  projTurn(ev) { const f = this.proj.get(ev.id); if (f) { f.x = ev.x; f.z = ev.z; f.vx = ev.vx; f.vz = ev.vz; if (f.s.flat) f.m.rotation.y = Math.atan2(ev.vx, ev.vz); } }
  lob(ev) {
    let obj;
    if (ev.look === 'coffin') { const b = buildModel('pallbearer_coffin', { catalog: MODELS }); obj = b.object; this.root.add(obj); }
    else { obj = this.mesh(BALL, COL(ev.look === 'comet' ? 'orange' : 'sand'), ev.x, 1, ev.z); obj.scale.setScalar(ev.look === 'comet' ? 0.5 : 0.22); }
    const light = this.ctx.lights.request({ follow: obj, color: 0xff8030, intensity: ev.look === 'comet' ? 10 : 4, radius: 6, priority: 3 });
    let t = 0; const H = ev.high ? 14 : ev.look === 'coffin' ? 9 : 3.5;
    this.add({ update: (dt) => { t += dt; const k = Math.min(1, t / ev.dur); const x = ev.x + (ev.x2 - ev.x) * k; const z = ev.z + (ev.z2 - ev.z) * k; const y = ev.high || ev.look === 'coffin' ? H * (1 - k) + 0.3 : 1 + Math.sin(k * Math.PI) * H; obj.position.set(x, y, z); if (ev.look !== 'coffin') this.ctx.particles.burst('ember', obj.position, { count: 1 }); return k < 1; }, end: () => { this.root.remove(obj); light.release(); } });
  }
  field(ev, followFn) {
    const s = FIELD[ev.look] ?? FIELD.shock; const m = this.mesh(RING, COL(s.c), ev.x, 0.06, ev.z); m.scale.setScalar(ev.r);
    const m2 = this.mesh(RING, COL(s.c), ev.x, 0.06, ev.z); m2.scale.setScalar(ev.r * 0.5);
    let pillar = null; if (s.pillar) { pillar = this.mesh(BOX, COL('sand'), ev.x, 4, ev.z); pillar.scale.set(0.6, 8, 0.6); }
    const light = s.light ? this.ctx.lights.request({ position: [ev.x, 1.2, ev.z], color: s.light, intensity: 6, radius: ev.r + 3, flicker: 'torch', priority: 2 }) : null;
    const f = { ev, t: 0, x: ev.x, z: ev.z, light };
    f.update = (dt) => {
      f.t += dt; if (ev.follow) { const p = followFn(ev.follow); if (p) { f.x = p.x; f.z = p.z; if (light) light.position?.set?.(f.x, 1.2, f.z); } }
      m.position.set(f.x, 0.06, f.z); m2.position.set(f.x, 0.06, f.z); m2.scale.setScalar(ev.r * (0.3 + ((f.t * 0.7) % 0.7))); if (pillar) pillar.position.set(f.x, 4, f.z);
      if (s.p && Math.floor(f.t * 12) !== Math.floor((f.t - dt) * 12)) { const a = f.t * 7.3; const R = ev.r * ((f.t * 3.1) % 1); this.ctx.particles.burst(s.p, [f.x + Math.cos(a) * R, 0.2, f.z + Math.sin(a) * R], { count: 2 }); }
      return !f.done && f.t < ev.dur + 0.5;
    };
    f.end = () => { this.root.remove(m, m2); if (pillar) this.root.remove(pillar); light?.release(); };
    this.add(f); this.fields.set(ev.id, f);
  }
  fieldEnd(id) { const f = this.fields.get(id); if (f) { f.done = true; this.fields.delete(id); } }
  obstacle(ev) {
    const model = ev.look === 'coffin' ? 'pallbearer_coffin' : ev.look === 'pillar' ? 'belfry_pillar' : 'bone_wall';
    const b = buildModel(model, { catalog: MODELS }); b.object.position.set(ev.x, ev.look === 'bone' ? -1.4 : 0, ev.z); b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); setLookLayer(b.object, 'actors'); this.root.add(b.object);
    let t = 0; const o = { obj: b.object, update: (dt) => { t += dt; if (ev.look === 'bone') b.object.position.y = Math.min(0, -1.4 + t * 8); return !o.done; }, end: () => { this.root.remove(b.object); } };
    this.add(o); this.obst.set(ev.id, o);
  }
  obstacleEnd(ev) { const o = this.obst.get(ev.id); if (o) { o.done = true; this.obst.delete(ev.id); if (ev.burst) { this.ctx.particles.burst('bone_chips', o.obj.position, { count: 30 }); } } }
  beam(ev, getM) {
    const m = this.mesh(BOX, COL('cyan'), 0, 0.9, 0); const f = { a: ev.a, t: 0 };
    f.update = (dt) => { f.t += dt; f.a += ev.spin * dt; const o = getM(ev.m); if (!o) return false; const dx = Math.cos(f.a); const dz = Math.sin(f.a); m.position.set(o.x + dx * ev.len / 2, 0.9, o.z + dz * ev.len / 2); m.rotation.y = Math.atan2(dx, dz); m.scale.set(0.2, 0.2, ev.len); return !f.done && f.t < ev.dur; };
    f.end = () => this.root.remove(m); this.add(f); this.beams.set(ev.id, f);
  }
  beamEnd(id) { const f = this.beams.get(id); if (f) f.done = true; this.beams.delete(id); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) { const f = this.list[i]; if (!f.update(dt)) { f.end?.(); this.list.splice(i, 1); } }
  }
}
export { CylinderGeometry, Vector3, toonMaterial, DISC };
