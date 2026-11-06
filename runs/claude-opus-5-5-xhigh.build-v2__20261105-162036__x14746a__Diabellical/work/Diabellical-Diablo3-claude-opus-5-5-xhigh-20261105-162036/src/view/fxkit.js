// Flat, unlit shapes on the ground: rings, sectors, bolts, pillars. All cheap and all palette.
import { glowMaterial, PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';

const { BoxGeometry, CircleGeometry, Group, Mesh, RingGeometry, BufferGeometry, BufferAttribute } = THREE;

const flat = (g) => { g.rotateX(-Math.PI / 2); return g; };
const GEO = {
  ring: flat(new RingGeometry(0.88, 1, 40)),
  thin: flat(new RingGeometry(0.95, 1, 48)),
  disc: flat(new CircleGeometry(1, 32)),
  box: new BoxGeometry(1, 1, 1),
  quad: flat(new THREE.PlaneGeometry(1, 1)),
};
const glow = (c) => glowMaterial(typeof c === 'number' ? c : PALETTE[c] ?? PALETTE.white);
export const mat = glow;

const ease = (t) => 1 - (1 - t) ** 3;

export class FxKit {
  constructor(scene) {
    this.group = new Group();
    this.group.name = 'fx';
    scene.add(this.group);
    this.live = [];
  }

  _add(mesh, o) {
    this.group.add(mesh);
    const e = { mesh, t: 0, dur: 0.3, ...o };
    this.live.push(e);
    return e;
  }

  ring(x, z, r, color, dur = 0.35, o = {}) {
    const m = new Mesh(GEO[o.thin ? 'thin' : 'ring'], glow(color));
    m.position.set(x, o.y ?? 0.08, z);
    m.scale.setScalar(0.1);
    return this._add(m, { dur, grow: r, kind: 'ring' });
  }

  disc(x, z, r, color, dur = 0.3, o = {}) {
    const m = new Mesh(GEO.disc, glow(color));
    m.position.set(x, o.y ?? 0.06, z);
    m.scale.setScalar(o.grow ? 0.1 : r);
    return this._add(m, { dur, grow: o.grow ? r : 0, shrink: o.shrink ? r : 0, kind: 'disc' });
  }

  /** A pie slice, facing (dx, dz). */
  sector(x, z, dx, dz, r, angleDeg, color, dur = 0.14, o = {}) {
    const a = (Math.min(angleDeg || 120, 359) * Math.PI) / 180;
    const inner = o.inner ?? 0.55;
    const g = new RingGeometry(inner, 1, 16, 1, -a / 2, a);
    g.rotateX(-Math.PI / 2);
    g.rotateY(-Math.atan2(dz, dx));
    const m = new Mesh(g, glow(color));
    m.position.set(x, o.y ?? 0.5, z);
    m.scale.setScalar(r * 0.6);
    return this._add(m, { dur, grow: r, own: true, kind: 'sector' });
  }

  bolt(x1, z1, x2, z2, color, dur = 0.1, o = {}) {
    const m = new Mesh(GEO.box, glow(color));
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 0.01;
    m.position.set((x1 + x2) / 2, o.y ?? 0.9, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    m.scale.set(o.w ?? 0.1, o.w ?? 0.1, L);
    return this._add(m, { dur, kind: 'bolt', thin: o.w ?? 0.1 });
  }

  pillar(x, z, color, h, dur = 0.4, o = {}) {
    const m = new Mesh(GEO.box, glow(color));
    const w = o.w ?? 0.4;
    m.position.set(x, h / 2, z);
    m.scale.set(w, h, w);
    return this._add(m, { dur, kind: 'pillar', w, h });
  }

  /** A prop or pillar flying apart: boxes on ballistic arcs that bounce once or twice and shrink away. */
  shatter(x, y, z, colorHex, fromX, fromZ, rng, o = {}) {
    const n = o.count ?? 10;
    const size = o.size ?? 0.22;
    const spread = o.spread ?? 0.35;
    const speed = o.speed ?? 5;
    const mat = toonMaterial(colorHex);
    for (let i = 0; i < n; i++) {
      const m = new Mesh(GEO.box, mat);
      m.castShadow = true;
      const px = x + rng.range(-spread, spread), py = y + rng.range(0, o.height ?? 0.7), pz = z + rng.range(-spread, spread);
      m.position.set(px, py, pz);
      const s = size * rng.range(0.6, 1.3);
      m.scale.set(s, s * rng.range(0.6, 1.2), s);
      let dx = px - fromX, dz = pz - fromZ;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      const v = speed * rng.range(0.35, 1);
      this._add(m, { dur: o.life ?? 1.8, kind: 'chunk', vx: dx * v, vy: rng.range(1.5, 4.5) * (speed / 5), vz: dz * v, spin: rng.range(-9, 9), s });
    }
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      e.t += dt;
      if (e.kind === 'chunk') {
        const m = e.mesh;
        e.vy -= 15 * dt;
        m.position.x += e.vx * dt; m.position.y += e.vy * dt; m.position.z += e.vz * dt;
        m.rotation.x += e.spin * dt; m.rotation.z += e.spin * 0.7 * dt;
        if (m.position.y < e.s / 2) { m.position.y = e.s / 2; e.vy = Math.abs(e.vy) * 0.3; e.vx *= 0.55; e.vz *= 0.55; e.spin *= 0.5; }
        if (e.t > e.dur - 0.4) { const k = Math.max(0.02, (e.dur - e.t) / 0.4) * e.s; m.scale.setScalar(k); }
        if (e.t >= e.dur) { this.group.remove(m); this.live.splice(i, 1); }
        continue;
      }
      const f = Math.min(1, e.t / e.dur);
      const m = e.mesh;
      if (e.kind === 'ring') m.scale.setScalar(Math.max(0.05, ease(f) * e.grow));
      else if (e.kind === 'sector') m.scale.setScalar(e.grow * (0.6 + 0.4 * ease(f)));
      else if (e.kind === 'disc' && e.grow) m.scale.setScalar(Math.max(0.05, ease(f) * e.grow));
      else if (e.kind === 'disc' && e.shrink) m.scale.setScalar(Math.max(0.01, (1 - f) * e.shrink));
      else if (e.kind === 'bolt') { const th = e.thin * (1 - f * 0.8); m.scale.x = th; m.scale.y = th; }
      else if (e.kind === 'pillar') { const w = e.w * (1 - f); m.scale.x = Math.max(0.01, w); m.scale.z = Math.max(0.01, w); }
      if (f >= 1) {
        this.group.remove(m);
        if (e.own) m.geometry.dispose();
        this.live.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.live) { this.group.remove(e.mesh); if (e.own) e.mesh.geometry.dispose(); }
    this.live.length = 0;
  }
}

/** A ring with a gap whose radius changes each frame (a stored, updated strip). */
export class WaveRing {
  constructor(color, gapA, gapW, segs = 48) {
    this.segs = segs;
    this.gapA = gapA; this.gapW = gapW;
    const n = (segs + 1) * 2;
    const g = new BufferGeometry();
    this.pos = new Float32Array(n * 3);
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(n * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    const idx = [];
    for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new Mesh(g, glow(color));
    this.mesh.frustumCulled = false;
  }
  set(x, z, r, thick) {
    const full = Math.PI * 2 - this.gapW;
    const start = this.gapA + this.gapW / 2;
    for (let i = 0; i <= this.segs; i++) {
      const a = start + (i / this.segs) * full;
      const c = Math.cos(a), s = Math.sin(a);
      this.pos.set([x + c * (r + thick), 0.1, z + s * (r + thick), x + c * Math.max(0, r - thick), 0.1, z + s * Math.max(0, r - thick)], i * 6);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  dispose() { this.mesh.geometry.dispose(); }
}

export const GROUND_GEO = GEO;
