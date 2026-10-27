// ---------------------------------------------------------------- Scenery: instanced, chunked dressing along the rail; space arena
const SCT = {
  foliage: { g: () => G.cone(1, 2.6, 7), m: () => toon(0xffffff), o: 0.07, col: 1 }, trunk: { g: () => G.cyl(0.2, 0.28, 1.5, 5), m: () => toon(0x8a5a3a), o: 0.05 },
  rock: { g: () => G.dod(1), m: () => toon(0xffffff), o: 0.05, col: 1 }, hbody: { g: () => G.box(3, 2, 3), m: () => toon(0xffffff), o: 0.07, col: 1 }, hroof: { g: () => G.cone(2.7, 1.7, 4), m: () => toon(0xd8553a), o: 0.07 },
  silo: { g: () => G.cyl(2.2, 2.2, 6, 10), m: () => toon(0xdfe6ff), o: 0.08 }, dome: { g: () => G.sph(2.2, 10, 6), m: () => toon(0xff7a2a), o: 0.08 },
  chim: { g: () => G.cyl(1.2, 1.5, 16, 8), m: () => toon(0xb0a4c8), o: 0.1 }, band: { g: () => G.cyl(1.3, 1.6, 1.8, 8), m: () => toon(0xff7a2a), o: 0.1 },
  wall: { g: () => G.box(1, 1, 1), m: () => toon(0xffffff), o: 0.012, col: 1 }, crystal: { g: () => G.oct(1), m: () => toon(0xffffff), o: 0.05, col: 1 },
  pipe: { g: () => G.cyl(0.9, 0.9, 1, 8), m: () => toon(0x9d93b8), o: 0.06 }, cloud: { g: () => G.ico(1, 1), m: () => unlit(0xffffff), o: 0 }, post: { g: () => G.cyl(0.25, 0.25, 4, 5), m: () => toon(0xff7a2a), o: 0.04 },
};
class Scatter {
  constructor(rail) { this.rail = rail; this.b = new Map(); this.dummy = new THREE.Object3D(); }
  add(type, s, x, y, sx = 1, sy = 1, sz = 1, ry = 0, color = 0xffffff, rx = 0, rz = 0) {
    const key = Math.floor(s / 350) + '|' + type; let a = this.b.get(key); if (!a) this.b.set(key, a = { type, chunk: Math.floor(s / 350), items: [] });
    const p = this.rail.toWorld(s, x, y); a.items.push({ p, ry: this.rail.heading(s) + ry, sx, sy, sz, color, rx, rz });
  }
  build(parent) {
    const chunks = new Map(), d = this.dummy;
    for (const a of this.b.values()) {
      const T = SCT[a.type], mesh = new THREE.InstancedMesh(T.g(), T.m(), a.items.length); mesh.castShadow = a.type !== 'cloud'; mesh.receiveShadow = true;
      a.items.forEach((it, i) => { d.position.copy(it.p); d.rotation.set(it.rx, it.ry, it.rz, 'YXZ'); d.scale.set(it.sx, it.sy, it.sz); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); if (T.col) mesh.setColorAt(i, new THREE.Color(it.color)); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      let grp = chunks.get(a.chunk); if (!grp) { grp = new THREE.Group(); grp.userData.chunk = a.chunk; chunks.set(a.chunk, grp); parent.add(grp); }
      grp.add(mesh);
      if (T.o > 0) { const hull = new THREE.InstancedMesh(hullGeo(T.g()), outlineMat(T.o), a.items.length); hull.instanceMatrix = mesh.instanceMatrix; hull.computeBoundingSphere(); grp.add(hull); }
    }
    return chunks;
  }
}
function zoneAt(st, s) { for (const z of st.zones) if (s >= z[0] && s < z[1]) return z[2]; return 'coast'; }
const TREE_COLS = [0x3fb36a, 0x4cc37a, 0x2f9e6a, 0x7cc94a, 0xff9ec4], WALL_COLS = [0xd98a5a, 0xc9744f, 0xe8a070, 0xb8643f], ROCK_COLS = [0x9a90b8, 0x8a80a8, 0xb0a8c8], HOUSE_COLS = [0xfff0c8, 0xffd8e0, 0xd8f0ff, 0xe8ffd0];
function buildRailScenery(st, rail) {
  const sc = new Scatter(rail), rng = mulberry(11), R2 = (a, b) => a + rng() * (b - a), PK = (arr) => arr[Math.floor(rng() * arr.length)];
  const tree = (s, x, k) => { sc.add('trunk', s, x, 0.75 * k, k, k, k); sc.add('foliage', s, x, 2.4 * k, 1.5 * k, 1.3 * k, 1.5 * k, 0, PK(TREE_COLS)); sc.add('foliage', s, x, 4.1 * k, 1.1 * k, 1.1 * k, 1.1 * k, 0, PK(TREE_COLS)); };
  for (let s = -40; s < st.length + 700; s += 13) {
    const zone = zoneAt(st, s), bx = boundsAt(st, s);
    for (const side of [-1, 1]) {
      if (zone === 'coast') {
        for (let i = 0; i < 2; i++) if (rng() < 0.7) tree(s + R2(-6, 6), side * (bx + R2(5, 90)), R2(1.2, 2.8));
        if (rng() < 0.18) { const x = side * (bx + R2(10, 60)), sc2 = R2(1.2, 2); sc.add('hbody', s, x, 1 * sc2, sc2, sc2, sc2, R2(-0.3, 0.3), PK(HOUSE_COLS)); sc.add('hroof', s, x, 2.85 * sc2, sc2, sc2, sc2, Math.PI / 4, 0xd8553a); }
        if (rng() < 0.25) sc.add('rock', s, side * (bx + R2(3, 70)), 0.6, R2(1, 3), R2(0.7, 2), R2(1, 3), R2(0, 3), PK(ROCK_COLS));
        if (rng() < 0.05) { const x = side * (bx + R2(20, 60)); sc.add('silo', s, x, 4.2, 1.4, 1.4, 1.4); sc.add('dome', s, x, 8.9, 1.4, 1, 1.4); }
      } else if (zone === 'canyon') {
        const w = R2(18, 34), hgt = R2(34, 80), x = side * (bx + 6 + w / 2 + R2(0, 6));
        sc.add('wall', s, x, hgt / 2, w, hgt, 16, R2(-0.08, 0.08), PK(WALL_COLS));
        if (rng() < 0.5) sc.add('wall', s + 4, side * (bx + 4 + R2(0, 3)), R2(2, 6), R2(3, 7), R2(4, 12), R2(6, 12), R2(-0.5, 0.5), PK(WALL_COLS));
        if (rng() < 0.25) sc.add('rock', s, side * R2(bx - 1, bx + 3), 0.5, R2(0.8, 1.6), R2(0.6, 1.2), R2(0.8, 1.6), R2(0, 3), PK(ROCK_COLS));
        if (rng() < 0.18) tree(s, side * (bx + R2(2, 4)), R2(1.2, 1.8));
      } else {
        if (rng() < 0.28) { const x = side * (bx + R2(8, 70)), k = R2(1, 2.1); sc.add('silo', s, x, 3 * k, k, k, k); sc.add('dome', s, x, 6 * k + 0.5, k, 0.7 * k, k); }
        if (rng() < 0.2) { const x = side * (bx + R2(10, 80)), k = R2(1, 1.8); sc.add('chim', s, x, 8 * k, k, k, k); sc.add('band', s, x, 14 * k, k, k, k); sc.add('band', s, x, 9 * k, k, k, k); }
        if (rng() < 0.2) sc.add('rock', s, side * (bx + R2(3, 70)), 0.6, R2(1, 3), R2(0.7, 2), R2(1, 3), R2(0, 3), PK(ROCK_COLS));
        if (rng() < 0.12) sc.add('pipe', s, side * (bx + R2(3, 30)), R2(8, 28), 1, R2(30, 90), 1, 0, 0xffffff, Math.PI / 2, 0);
        if (rng() < 0.2) tree(s, side * (bx + R2(30, 110)), R2(1.5, 3));
      }
    }
    if (rng() < 0.4) sc.add('rock', s, R2(-bx, bx), 0.2, R2(0.4, 1.2), R2(0.3, 0.6), R2(0.4, 1.2), R2(0, 3), PK(ROCK_COLS)); // low rocks inside the lane give a sense of speed
    if (s % 52 < 13) sc.add('cloud', s, R2(-300, 300), R2(70, 150), R2(10, 28), R2(3, 8), R2(8, 20));
  }
  return sc.build(R.world);
}

function buildSpaceEnv(rng = mulberry(5)) {
  const out = { stars: null, rocks: [], planet: null };
  const N = 900, stars = new THREE.InstancedMesh(G.oct(1), new THREE.MeshBasicNodeMaterial({ color: 0xffffff, fog: false }), N), d = new THREE.Object3D();
  for (let i = 0; i < N; i++) { const v = V3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize().multiplyScalar(850), k = 0.8 + rng() * 2.4; d.position.copy(v); d.scale.setScalar(k); d.rotation.set(rng() * 3, rng() * 3, 0); d.updateMatrix(); stars.setMatrixAt(i, d.matrix); stars.setColorAt(i, new THREE.Color().setHSL(rng() * 0.2 + 0.55, 0.5, 0.8 + rng() * 0.2)); }
  stars.frustumCulled = false; R.world.add(stars); out.stars = stars;
  // banded gas planet (cel-shaded bands) with ring
  const pm = new THREE.MeshToonNodeMaterial({ gradientMap: gradientMap() }); const bandN = floor(positionLocal.y.mul(0.012).add(20)).mod(3);
  pm.colorNode = mix(mix(vec3(0.95, 0.55, 0.45), vec3(0.98, 0.78, 0.5), step(0.5, bandN)), vec3(0.75, 0.4, 0.55), step(1.5, bandN));
  const planet = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 20), pm); planet.position.set(-700, 160, -1000); planet.castShadow = false; R.world.add(planet);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(340, 14, 3, 64), toon(0xffe0b0)); ring.position.copy(planet.position); ring.rotation.set(1.3, 0.2, 0.3); ring.scale.set(1, 1, 0.12); R.world.add(ring); out.planet = planet;
  // asteroids with static colliders
  for (let i = 0; i < 70; i++) {
    const r = 5 + rng() * rng() * 28, a = rng() * TAU, dist = 70 + rng() * 300, y = (rng() - 0.5) * 160;
    const m = buildAsteroid(r, i * 7 + 1); m.position.set(Math.cos(a) * dist, y, Math.sin(a) * dist); m.rotation.set(rng() * 3, rng() * 3, rng() * 3); R.world.add(m);
    const e = { kind: 'rock', pos: m.position.clone(), r }; Phys.attach(e, { r: r * 0.92, group: GRP.OBST, kind: 'fixed', pos: e.pos }); out.rocks.push({ m, e, spin: V3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.12) });
  }
  // derelict kibble station: stacked rings, decoration + big collider
  const st = new THREE.Group(), hullM = toon(0x8c82b4), accM = toon(0xff7a2a);
  st.add(mk(G.cyl(14, 14, 50, 14), hullM, { outline: 0.4 })); for (let i = -2; i <= 2; i++) st.add(mk(G.tor(20, 2.2, 6, 24), i % 2 ? accM : hullM, { pos: [0, i * 12, 0], rot: [Math.PI / 2, 0, 0], outline: 0.3 }));
  st.add(mk(G.sph(9), toon(0x38e8ff, 0x0a5a80), { pos: [0, 30, 0], outline: 0.3 })); st.position.set(260, -40, -240); st.rotation.z = 0.4; R.world.add(st);
  const se = { kind: 'rock', pos: st.position.clone(), r: 30 }; Phys.attach(se, { r: 30, group: GRP.OBST, kind: 'fixed', pos: se.pos }); out.station = st;
  return out;
}
