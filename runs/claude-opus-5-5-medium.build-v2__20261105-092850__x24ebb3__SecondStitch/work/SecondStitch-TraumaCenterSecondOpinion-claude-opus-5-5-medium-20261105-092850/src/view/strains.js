// The strains as creatures on the actors layer: crown, weeper body, halo. Their working parts are sim entities.
import { LegStepper, PALETTE, SpringChain, setLookLayer, THREE, toonMaterial, twoBoneIK } from '../../pixel-engine.js';
import { PROP_DEFS, CATALOG } from '../content/models/index.js';
import { buildModel } from '../../pixel-engine.js';

const { BoxGeometry, ConeGeometry, Group, Mesh, SphereGeometry, TorusGeometry, CylinderGeometry, Vector3 } = THREE;
const mat = (c, rim) => toonMaterial(c, rim ? { rim } : {});
const actor = (o) => { setLookLayer(o, 'actors'); o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return o; };

class Tendrils {
  constructor(root, n, color, len = 0.3, segs = 6, thick = 0.14) {
    this.items = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const chain = new SpringChain({ segments: segs, length: len, stiffness: 5, gravity: 2.5, rest: [Math.cos(a), -0.15, Math.sin(a)], keep: 0.92 });
      const bits = Array.from({ length: segs }, (_, k) => { const b = new Mesh(new BoxGeometry(thick - k * 0.012, thick - k * 0.012, len + 0.05), mat(color)); actor(b); root.add(b); return b; });
      return { chain, bits, a };
    });
  }
  update(dt, x, y, z, ground, wig = 0) {
    for (const it of this.items) {
      it.chain.update(dt, [x + Math.cos(it.a) * 0.3, y, z + Math.sin(it.a) * 0.3 + Math.sin(wig + it.a * 3) * 0.05], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
      it.bits.forEach((b, i) => {
        const p = it.chain.points[i + 1], q = it.chain.points[i];
        const gy = ground(p[0], p[2]) + 0.08;
        if (p[1] < gy) p[1] = gy;
        b.position.set((p[0] + q[0]) / 2, Math.max(gy, (p[1] + q[1]) / 2), (p[2] + q[2]) / 2);
        b.lookAt(p[0], p[1], p[2]);
      });
    }
  }
  setVisible(v) { for (const it of this.items) for (const b of it.bits) b.visible = v; }
  remove(root) { for (const it of this.items) for (const b of it.bits) root.remove(b); }
}

export class StrainViews {
  constructor(ctx, field) { this.ctx = ctx; this.field = field; this.root = new Group(); ctx.scene.add(this.root); this.items = new Map(); this.dying = []; this.eyes = new Map(); this.t = 0; }
  make(e) {
    const g = new Group(); this.root.add(g);
    const o = { g, e, parts: [] };
    if (e.type === 'irae') {
      const orb = new Mesh(new SphereGeometry(0.7, 12, 8), mat(PALETTE.plum, 0xff3a3a));
      actor(orb); orb.position.y = 0.3; g.add(orb); o.orb = orb;
      const glow = new Mesh(new SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: PALETTE.red })); glow.position.set(0, 0.86, 0.1); g.add(glow); o.glow = glow;
      o.tendrils = new Tendrils(this.root, 7, PALETTE.red, 0.34, 6, 0.16);
    } else if (e.type === 'lacrimosa') {
      const body = new Mesh(new SphereGeometry(0.65, 10, 7), mat(PALETTE.plum, 0x8ad0ff)); body.scale.y = 0.45; actor(body); body.position.y = 0.15; g.add(body); o.body = body;
      o.legs = new Map();
    } else if (e.type === 'miserere') {
      const m = buildModel(PROP_DEFS.coreMiserere, { catalog: CATALOG }).object.clone(true); actor(m); m.scale.setScalar(1.5); g.add(m); o.halo = m;
      o.tendrils = new Tendrils(this.root, 5, PALETTE.sand, 0.3, 5, 0.1);
    } else if (e.type === 'introit') {
      o.tendrils = new Tendrils(this.root, 4, PALETTE.plum, 0.3, 4, 0.15);
      o.tendrils.setVisible(false);
    }
    return o;
  }
  update(state, dt) {
    this.t += dt;
    const f = this.field, ground = (x, z) => f.surface(x, z);
    const seen = new Set();
    for (const e of state.ents) {
      if (e.k !== 'strain' || e.x == null || !e.type || e.type === 'pileup') continue;
      seen.add(e.id);
      let o = this.items.get(e.id);
      if (!o) { o = this.make(e); this.items.set(e.id, o); }
      o.e = e;
      const y = f.surface(e.x, e.z);
      o.g.position.set(e.x, y, e.z);
      if (e.type === 'irae') {
        const beat = f.beat;
        // The sim makes the ring on its first step, which can come after this view's first frame.
        if (!o.plateMeshes && e.ring) o.plateMeshes = e.ring.map(() => { const m = buildModel(PROP_DEFS.plate, { catalog: CATALOG }).object.clone(true); actor(m); this.root.add(m); return m; });
        o.plateMeshes?.forEach((m, i) => {
          const r = e.ring?.[i];
          if (!r) return;
          const ent = state.ents.find((q) => q.k === 'plate' && q.ringIx === i);
          m.visible = r[2] === 1 && !ent;
          m.position.set(r[0], f.surface(r[0], r[1]) + 0.05 + beat * 0.1, r[1]);
          m.rotation.y = Math.atan2(r[0] - e.x, r[1] - e.z) + Math.PI;
          m.scale.setScalar(0.85 * (1 + beat * 0.1));
        });
        const hasEye = state.ents.some((q) => q.k === 'eye' && q.owner === e.id) || state.ents.some((q) => q.k === 'eye' && q.look === 'wrath');
        o.orb.visible = !hasEye; o.glow.visible = !hasEye;
        o.orb.scale.setScalar(1 + beat * 0.12);
        o.tendrils.update(dt, e.x, y + 0.3, e.z, ground, this.t * 3);
      } else if (e.type === 'lacrimosa') {
        o.body.rotation.y += dt * 0.3;
        const eyes = state.ents.filter((q) => q.k === 'eye' && q.look === 'weeper');
        for (const q of eyes) this.eyeLegs(o, q, f, dt);
        for (const [id, L] of o.legs) if (!eyes.some((q) => q.id === id)) { L.bits.forEach((b) => this.root.remove(b)); o.legs.delete(id); }
      } else if (e.type === 'miserere') {
        const hover = e.mode === 'pull' ? 0 : 0.5 + Math.sin(this.t * 2) * 0.1;
        o.g.position.y = y + hover;
        o.halo.rotation.y += dt * 0.8;
        o.halo.visible = e.mode !== 'pull';
        o.tendrils.setVisible(e.mode !== 'pull');
        o.tendrils.update(dt, e.x, y + hover + 0.3, e.z, ground, this.t * 2);
      } else if (e.type === 'introit') {
        const up = e.mode === 'knock' || e.mode === 'exposed';
        o.tendrils.setVisible(up);
        if (up) o.tendrils.update(dt, e.x, y + 0.5, e.z, ground, this.t * 8);
      }
    }
    for (const [id, o] of this.items) {
      if (seen.has(id)) continue;
      this.dispose(o);
      this.items.delete(id);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i];
      d.t += dt / 1.1;
      d.mats.forEach((m) => { m.dissolve = d.t; });
      d.obj.position.y += dt * 0.3;
      if (d.t >= 1) { this.root.remove(d.obj); this.dying.splice(i, 1); }
    }
  }
  eyeLegs(o, eye, f, dt) {
    if (!eye.crawl) return;
    let L = o.legs.get(eye.id);
    if (!L) {
      const legs = [[-0.7, 0.5], [0.7, 0.5], [-0.7, -0.5], [0.7, -0.5]];
      const stepper = new LegStepper({ legs: legs.map((rest, i) => ({ rest, partners: [(i + 1) % 4] })), lift: 0.3, threshold: 0.35 });
      const bits = [];
      for (let i = 0; i < 8; i++) { const b = new Mesh(new BoxGeometry(0.1, 0.1, 0.5), mat(PALETTE.plum)); actor(b); this.root.add(b); bits.push(b); }
      L = { stepper, bits, last: [eye.x, eye.z] };
      o.legs.set(eye.id, L);
    }
    const body = [eye.x, f.surface(eye.x, eye.z) + 0.5, eye.z];
    const v = [(eye.x - L.last[0]) / Math.max(dt, 1e-3), 0, (eye.z - L.last[1]) / Math.max(dt, 1e-3)];
    L.last = [eye.x, eye.z];
    L.stepper.update(dt, body, 0, v, (x, z) => f.surface(x, z));
    L.stepper.feet.forEach((foot, i) => {
      const hip = [body[0] + (i % 2 ? 0.35 : -0.35), body[1], body[2] + (i < 2 ? 0.25 : -0.25)];
      const knee = twoBoneIK(hip, foot.at, 0.5, 0.5, [hip[0] * 1.2, hip[1] + 1, hip[2]]);
      const seg = (b, a, c) => { b.position.set((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2); b.lookAt(c[0], c[1], c[2]); };
      seg(L.bits[i * 2], hip, knee); seg(L.bits[i * 2 + 1], knee, foot.at);
    });
  }
  /** Pixel dissolve when it dies. */
  deathAt(e) {
    const o = [...this.items.values()].find((q) => q.e.type === e.type);
    const shape = e.type === 'miserere' ? new SphereGeometry(0.9, 10, 7) : e.type === 'lacrimosa' ? new SphereGeometry(0.9, 10, 7) : new SphereGeometry(0.8, 10, 7);
    const m = toonMaterial(e.type === 'miserere' ? PALETTE.sand : PALETTE.plum, { dissolve: true, rim: e.type === 'miserere' ? 0xffffff : 0xff4060 }).clone();
    m.dissolve = 0;
    const mesh = new Mesh(shape, m);
    actor(mesh);
    const x = e.x ?? o?.e.x ?? 0, z = e.z ?? o?.e.z ?? 0;
    mesh.position.set(x, this.field.surface(x, z) + 0.5, z);
    this.root.add(mesh);
    this.dying.push({ obj: mesh, mats: [m], t: 0 });
  }
  dispose(o) {
    this.root.remove(o.g);
    o.plateMeshes?.forEach((m) => this.root.remove(m));
    o.tendrils?.remove(this.root);
    if (o.legs) for (const L of o.legs.values()) L.bits.forEach((b) => this.root.remove(b));
  }
}
void ConeGeometry; void TorusGeometry; void CylinderGeometry; void Vector3;
