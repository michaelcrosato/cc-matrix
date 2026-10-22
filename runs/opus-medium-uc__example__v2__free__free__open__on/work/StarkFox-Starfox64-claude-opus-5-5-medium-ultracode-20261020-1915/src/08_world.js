// ===== 08_world.js — rail paths (branching / looping), terrain, water, sky, scenery =====
class RailSeg {
  constructor(id, def) {
    this.id = id;
    this.def = def;
    this.closed = !!def.closed;
    this.curve = new THREE.CatmullRomCurve3(def.points.map((p) => V3(...p)), this.closed, 'centripetal');
    this.curve.arcLengthDivisions = 3000;
    this.length = this.curve.getLength();
    this.events = (def.events || []).slice().sort((a, b) => a.at - b.at);
    this.profile = def.profile || 'open';
    this.s0 = 0; // global start distance, assigned when chained
  }
}

const Rail = {
  segs: {}, chain: [], speed: 60, s: 0, fired: new Set(),
  build(defs, startId) {
    this.segs = {};
    for (const [id, d] of Object.entries(defs)) this.segs[id] = new RailSeg(id, d);
    this.chain = []; this.fired = new Set(); this.s = 0;
    this.push(startId);
  },
  push(id) {
    const seg = this.segs[id];
    const last = this.chain[this.chain.length - 1];
    seg.s0 = last ? last.s0 + last.length : 0;
    this.chain.push(seg);
    return seg;
  },
  segAt(s) {
    for (let i = this.chain.length - 1; i >= 0; i--) if (s >= this.chain[i].s0) return this.chain[i];
    return this.chain[0];
  },
  get seg() { return this.segAt(this.s); },
  /** Frame at global distance s: {pos, tan, right, up}. Extrapolates past the last known segment. */
  frame(s, out = { pos: V3(), tan: V3(), right: V3(), up: V3() }) {
    const seg = this.segAt(s);
    let local = s - seg.s0;
    let extra = 0;
    if (seg.closed) local = ((local % seg.length) + seg.length) % seg.length;
    else if (local > seg.length) { extra = local - seg.length; local = seg.length; }
    else if (local < 0) { extra = local; local = 0; }
    const u = clamp(local / seg.length, 0, 1);
    seg.curve.getPointAt(u, out.pos);
    seg.curve.getTangentAt(u, out.tan);
    if (extra) out.pos.addScaledVector(out.tan, extra);
    out.right.crossVectors(out.tan, _v3.set(0, 1, 0)).normalize();
    out.up.crossVectors(out.right, out.tan).normalize();
    return out;
  },
  /** World position from rail-local coords (x right, y up, s distance). */
  toWorld(s, x, y, out = V3()) {
    const f = this.frame(s, this._f || (this._f = { pos: V3(), tan: V3(), right: V3(), up: V3() }));
    return out.copy(f.pos).addScaledVector(f.right, x).addScaledVector(f.up, y);
  },
  /** Advance; resolves segment transitions (forks are decided by `chooser`). Returns list of new events. */
  advance(ds, chooser) {
    this.s += ds;
    const out = [];
    let seg = this.chain[this.chain.length - 1];
    while (!seg.closed && this.s >= seg.s0 + seg.length - 1e-6) {
      const nx = typeof seg.def.next === 'function' ? seg.def.next(chooser) : seg.def.next;
      if (!nx) break;
      const nseg = this.push(nx);
      out.push({ type: '_enterSeg', seg: nseg });
      seg = nseg;
    }
    for (const sg of this.chain) {
      for (let i = 0; i < sg.events.length; i++) {
        const e = sg.events[i];
        const key = sg.id + ':' + i;
        if (this.fired.has(key)) continue;
        if (this.s >= sg.s0 + e.at) { this.fired.add(key); out.push(e); }
      }
    }
    return out;
  },
  /** Jump to a checkpoint (segment id + local distance), rebuilding the chain from a recorded route. */
  restore(route, segId, local) {
    this.chain = []; this.fired = new Set();
    for (const id of route) { this.push(id); if (id === segId) break; }
    const seg = this.chain[this.chain.length - 1];
    this.s = seg.s0 + local;
    for (const sg of this.chain) sg.events.forEach((e, i) => { if (sg.s0 + e.at <= this.s) this.fired.add(sg.id + ':' + i); });
  },
};

// ---------------------------------------------------------------- environment builders
const World = {
  root: null, terrainCollider: null, waterMesh: null, sky: null, clouds: [], dust: null, terrainMesh: null, timeU: TSL.uniform(0), animated: [],
  begin() {
    this.root = new THREE.Group();
    R.scene.add(this.root);
    this.clouds = []; this.animated = []; this.dust = null; this.waterMesh = null; this.terrainCollider = null; this.heightAt = () => -999;
  },
  update(dt) {
    this.timeU.value += dt;
    for (const a of this.animated) a(dt, this.timeU.value);
    if (this.dust) this.dust.position.copy(R.camera.position).sub(this.dust.userData.wrap(R.camera.position));
  },
  // ---------- skies ----------
  skyDome(top, horizon, bottom, opts = {}) {
    const { positionLocal, normalize, mix, smoothstep, vec3, color, float, abs, sin, fract, dot, floor, step } = TSL;
    const geo = new THREE.SphereGeometry(7000, 48, 24);
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    const d = normalize(positionLocal);
    const up = smoothstep(-0.02, 0.45, d.y);
    const dn = smoothstep(0.0, -0.25, d.y);
    let col = mix(color(new THREE.Color(horizon)), color(new THREE.Color(top)), up);
    col = mix(col, color(new THREE.Color(bottom)), dn);
    if (opts.stars) {
      // hashed star field + soft nebula bands
      const cell = floor(d.mul(220));
      const h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
      const star = step(0.9965, h).mul(float(1.6));
      const neb = sin(d.x.mul(3.1).add(d.y.mul(5.7))).mul(sin(d.z.mul(4.3).sub(d.y.mul(2.1)))).max(0).pow(3);
      col = col.add(color(new THREE.Color(opts.nebula || 0x6a2a8a)).mul(neb.mul(0.55))).add(vec3(star));
    }
    if (opts.sunDir) {
      const sd = vec3(...opts.sunDir.toArray()).normalize();
      const s = dot(d, sd).max(0);
      col = col.add(color(new THREE.Color(0xfff2c0)).mul(step(0.997, s).mul(3).add(s.pow(40).mul(0.6))));
    }
    m.colorNode = col;
    const sky = new THREE.Mesh(geo, m);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    this.sky = sky;
    this.animated.push(() => sky.position.copy(R.camera.position));
    this.root.add(sky);
    return sky;
  },
  cloudField(rng, count, area, yRange) {
    const mat = toon(0xffffff, { rim: 0.0 });
    const shadeMat = toon(0xdfe8f5, { rim: 0 });
    const geo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const n = 4 + Math.floor(rng() * 5);
      for (let j = 0; j < n; j++) {
        const m = mkMesh(geo, j % 3 === 0 ? shadeMat : mat, { cast: false, receive: false, thickness: 0.035 });
        const s = 18 + rng() * 26;
        m.scale.set(s * 1.3, s * 0.75, s);
        m.position.set((j - n / 2) * 22 + rng() * 10, rng() * 10, rng() * 20 - 10);
        g.add(m);
      }
      g.position.set(area.x0 + rng() * (area.x1 - area.x0), yRange[0] + rng() * (yRange[1] - yRange[0]), area.z0 + rng() * (area.z1 - area.z0));
      g.userData.drift = 2 + rng() * 3;
      this.root.add(g);
      this.clouds.push(g);
    }
    this.animated.push((dt) => { for (const c of this.clouds) c.position.x += c.userData.drift * dt; });
  },
  spaceDust(color = 0xbfd8ff, count = 1400, size = 380) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) p[i] = (Math.random() - 0.5) * size;
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsNodeMaterial({ color, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false });
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    // wrap: keep points around camera by snapping the cloud origin to a grid
    pts.userData.wrap = (cam) => _v4.set(((cam.x % size) + size) % size - size / 2, ((cam.y % size) + size) % size - size / 2, ((cam.z % size) + size) % size - size / 2);
    this.dust = pts;
    this.root.add(pts);
  },
  // ---------- water ----------
  makeWater(y = 0, size = 16000, deep = 0x1d6fb8, light = 0x5fc6f0) {
    const { positionWorld, sin, mix, color, step, float, vec3 } = TSL;
    const t = this.timeU;
    const geo = new THREE.PlaneGeometry(size, size, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.MeshToonNodeMaterial({ color: deep, gradientMap: TOON_RAMP });
    const x = positionWorld.x, z = positionWorld.z;
    const w1 = sin(x.mul(0.045).add(t.mul(1.3))).mul(sin(z.mul(0.037).sub(t.mul(0.9))));
    const w2 = sin(x.mul(0.11).sub(z.mul(0.07)).add(t.mul(2.1)));
    const foam = step(0.9, w1.mul(0.7).add(w2.mul(0.3)));
    const band = step(0.55, w1);
    m.colorNode = mix(mix(color(new THREE.Color(deep)), color(new THREE.Color(light)), band.mul(0.45)), vec3(0.95, 0.98, 1), foam.mul(0.8));
    m.transparent = true; m.opacity = 0.92;
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    this.waterMesh = mesh;
    this.root.add(mesh);
    return mesh;
  },
  // ---------- terrain shaped around rail segments ----------
  terrain(segs, opts) {
    const { x0, x1, z0, z1, cell = 12 } = opts;
    // sample rails into a bucket grid for nearest-distance lookups
    const B = 220, buckets = new Map();
    const bkey = (bx, bz) => bx * 100003 + bz;
    for (const seg of segs) {
      const n = Math.ceil(seg.length / 8);
      for (let i = 0; i <= n; i++) {
        const p = seg.curve.getPointAt(i / n);
        const k = bkey(Math.floor(p.x / B), Math.floor(p.z / B));
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push({ x: p.x, y: p.y, z: p.z, prof: seg.profile });
      }
    }
    const nearest = (x, z) => {
      const bx = Math.floor(x / B), bz = Math.floor(z / B);
      let best = null, bd = 1e9;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const L = buckets.get(bkey(bx + i, bz + j));
        if (!L) continue;
        for (const s of L) { const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z); if (d < bd) { bd = d; best = s; } }
      }
      return best ? { d: Math.sqrt(bd), s: best } : { d: 999, s: null };
    };
    const PROF = {
      // floor below rail, half-width of flat corridor, wall rise
      open: { floor: 32, flat: 70, ramp: 260, peak: 150 },
      coast: { floor: 34, flat: 90, ramp: 300, peak: 120 },
      ocean: { floor: 60, flat: 400, ramp: 500, peak: 60, water: true },
      city: { floor: 30, flat: 330, ramp: 260, peak: 120 },
      canyon: { floor: 36, flat: 36, ramp: 34, peak: 190 },
      plains: { floor: 30, flat: 260, ramp: 360, peak: 110 },
      boss: { floor: 30, flat: 900, ramp: 300, peak: 160 },
    };
    const height = (x, z) => {
      const { d, s } = nearest(x, z);
      const mount = 70 + Noise.fbm(x / 380, z / 380, 5) * 170 + Math.abs(Noise.n2(x / 140, z / 140)) * 50;
      if (!s) return mount;
      const P = PROF[s.prof] || PROF.open;
      let floorY = P.water ? -14 + Noise.fbm(x / 90, z / 90, 3) * 4 : Math.max(7, s.y - P.floor) + Math.abs(Noise.fbm(x / 90, z / 90, 3)) * 7;
      let mountK = 1;
      if (opts.seaZ !== undefined) {
        const sea = smooth(clamp((z - opts.seaZ) / 320, 0, 1));
        floorY = lerp(floorY, -14 + Noise.fbm(x / 70, z / 70, 3) * 5, sea);
        mountK = 1 - sea * 0.75;
      }
      if (d <= P.flat) return floorY;
      const k = smooth(clamp((d - P.flat) / P.ramp, 0, 1));
      return lerp(floorY, Math.max(floorY + 10, (mount * (P.peak / 150) + s.y * 0.4) * mountK), k);
    };
    const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z0 - z1) / cell);
    const geo = new THREE.PlaneGeometry(x1 - x0, z0 - z1, nx, nz);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.getAttribute('position');
    const cols = new Float32Array(pos.count * 3);
    const hs = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) { const h = height(pos.getX(i), pos.getZ(i)); hs[i] = h; pos.setY(i, h); }
    geo.computeVertexNormals();
    const nrm = geo.getAttribute('normal');
    const pal = opts.palette || { sand: 0xe8d39a, grass: 0x5cb84a, grass2: 0x3f9a3c, rock: 0x8a7d6e, snow: 0xf4f6fb, under: 0xb9a77a };
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = hs[i], slope = 1 - nrm.getY(i);
      const n = Noise.n2(pos.getX(i) / 60, pos.getZ(i) / 60);
      if (h < 2) c.set(pal.under);
      else if (h < 7) c.set(pal.sand);
      else if (slope > 0.32) c.set(pal.rock);
      else if (h > 175 + n * 20) c.set(pal.snow);
      else c.set(n > 0.05 ? pal.grass : pal.grass2);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = new THREE.MeshToonNodeMaterial({ vertexColors: true, gradientMap: TOON_RAMP });
    mat.flatShading = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.root.add(mesh);
    this.terrainMesh = mesh;
    this.terrainCollider = Phys.addStaticTrimesh(geo);
    this.heightAt = height;
    return { mesh, height, nearest };
  },
  heightAt: () => 0,
  // ---------- placement helpers ----------
  place(obj, x, y, z, rotY = 0, scale = 1) {
    obj.position.set(x, y, z); obj.rotation.y = rotY; obj.scale.setScalar(scale);
    this.root.add(obj);
    return obj;
  },
  /** Box collider matching an object's world-space bounding box (axis-aligned around its own yaw). */
  colliderFor(obj, shrink = 0.9) {
    obj.updateMatrixWorld(true);
    const rotY = obj.rotation.y;
    obj.rotation.y = 0; obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj, true);
    obj.rotation.y = rotY; obj.updateMatrixWorld(true);
    const size = box.getSize(V3()).multiplyScalar(0.5 * shrink);
    const center = box.getCenter(V3());
    const off = center.sub(obj.position).applyAxisAngle(V3(0, 1, 0), rotY).add(obj.position);
    return Phys.addStaticBox(off, size, _q1.setFromAxisAngle(V3(0, 1, 0), rotY));
  },
};
