// ===================================================================
//  STAGES  -  themes, terrain streaming, designer-facing event scripts
//  A stage is plain data: { id, name, mode, speed, path, theme, ground, chunk(), bg(), events() }
//  Designers add content by pushing  at(s, fn) / st(s, fn)  entries - no engine changes needed.
// ===================================================================
const THEMES = {
  canyon: { skyTop: 0x3a86e0, skyHor: 0xffd9a8, skyBot: 0x6a5a70, sunDir: [0.5, 0.45, -0.7], sunColor: 0xfff0c0, fog: 0xf0c898, fogNear: 200, fogFar: 880, sunI: 2.7, hemiSky: 0xbcd8ff, hemiGround: 0x8a5a40, hemiI: 0.8, ambI: 0.45, stars: false },
  belt: { skyTop: 0x05040f, skyHor: 0x3a2070, skyBot: 0x05040f, sunDir: [-0.6, 0.45, -0.5], sunColor: 0xffe0b0, fog: 0x1a1038, fogNear: 280, fogFar: 1400, sunI: 2.5, hemiSky: 0x8a80d0, hemiGround: 0x20183a, hemiI: 0.9, ambI: 0.5, stars: true },
  rift: { skyTop: 0x150840, skyHor: 0x12b0a0, skyBot: 0x040418, sunDir: [0.3, 0.6, -0.5], sunColor: 0xaafff0, fog: 0x0b4058, fogNear: 260, fogFar: 1300, sunI: 2.3, hemiSky: 0x70f0e0, hemiGround: 0x401060, hemiI: 1.0, ambI: 0.5, stars: true },
  armada: { skyTop: 0x02020c, skyHor: 0x4a1438, skyBot: 0x02020a, sunDir: [0.7, 0.35, 0.3], sunColor: 0xffd0a0, fog: 0x1a0a24, fogNear: 500, fogFar: 2600, sunI: 2.5, hemiSky: 0x9080c0, hemiGround: 0x301030, hemiI: 0.9, ambI: 0.5, stars: true },
};
const GY = -16; // canyon ground height

// ---------------------------------------------------------------- terrain streaming
const Terrain = {
  CH: 80, chunks: new Map(), ground: null, bg: null,
  clear() {
    for (const g of this.chunks.values()) if (g.parent) g.parent.remove(g);
    this.chunks.clear();
    if (this.ground && this.ground.parent) this.ground.parent.remove(this.ground);
    if (this.bg && this.bg.parent) this.bg.parent.remove(this.bg);
    this.ground = null; this.bg = null;
  },
  setup(def) {
    this.clear();
    if (def.ground) {
      const wp = TSL.positionWorld;
      const band = TSL.step(0.5, TSL.fract(wp.z.mul(0.011).add(TSL.sin(wp.x.mul(0.017)).mul(0.2))));
      const patch = TSL.step(0.64, TSL.fract(TSL.sin(wp.x.mul(0.031)).mul(TSL.cos(wp.z.mul(0.027))).mul(3.0).add(0.5)));
      const m = new THREE.MeshToonNodeMaterial({ gradientMap: GRAD });
      m.colorNode = TSL.mix(TSL.mix(TSL.color(def.ground.c1), TSL.color(def.ground.c2), band), TSL.color(def.ground.c3), patch.mul(0.7));
      this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 2800), m);
      this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.ground.frustumCulled = false;
      G.world.add(this.ground);
    }
    if (def.bg) { this.bg = def.bg(); G.world.add(this.bg); }
  },
  update(s, cam) {
    const def = G.def;
    if (this.ground) this.ground.position.set(cam.x, def.ground.y, cam.z - 900);
    if (this.bg) this.bg.position.set(cam.x * 0.97, cam.y * 0.97, cam.z);
    if (!def.chunk) return;
    const ci = Math.floor(s / this.CH);
    for (let i = ci - 2; i <= ci + 12; i++) {
      if (i < -1 || this.chunks.has(i)) continue;
      const g = new THREE.Group();
      def.chunk(i, g, this.CH);
      G.world.add(g); this.chunks.set(i, g);
    }
    for (const [i, g] of this.chunks) if (i < ci - 3) { G.world.remove(g); this.chunks.delete(i); }
  },
};

function banded(c1, c2, c3, scale = 4) {
  const m = new THREE.MeshToonNodeMaterial({ gradientMap: GRAD, fog: false });
  const y = TSL.positionLocal.y;
  const b = TSL.fract(y.mul(scale).add(TSL.sin(TSL.positionLocal.x.mul(2.0)).mul(0.15)));
  m.colorNode = TSL.mix(TSL.mix(TSL.color(c1), TSL.color(c2), TSL.step(0.5, b)), TSL.color(c3), TSL.step(0.85, b));
  return m;
}
function gasPlanet(r, c1, c2, c3, ring) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(GEO.sph, banded(c1, c2, c3, 2.2)); p.scale.setScalar(r); g.add(p);
  const o = new THREE.Mesh(hullGeo(p.geometry), outlineMat(0.012, 0x0c0a1a)); p.add(o);
  if (ring) {
    const rm = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 64), new THREE.MeshToonNodeMaterial({ color: ring, gradientMap: GRAD, fog: false }));
    rm.scale.set(r * 1.7, r * 1.7, 0.02); rm.rotation.x = Math.PI / 2.4; rm.rotation.y = 0.3; g.add(rm);
  }
  return g;
}

// ---- chunk builders
function canyonChunk(i, g, CH) {
  const r = mulberry(i * 7919 + 11), s0 = i * CH, sm = s0 + CH / 2;
  const rust = [0xb8573a, 0xc4663f, 0xa84a38, 0xcf7a4a];
  for (const side of [-1, 1]) {
    const h = 52 + r() * 34, x = pathX(sm) + side * (47 + r() * 4);
    const c = pick2(r, rust);
    const wall = mk(GEO.box, tm(c), { p: [x, GY + h / 2, -sm], s: [16, h, CH + 3], out: 0.1 });
    const cap = mk(GEO.box, tm(0xe09a5a), { p: [x, GY + h + 0.6, -sm], s: [16.5, 1.4, CH + 3.5], out: 0.08 });
    const stripe = mk(GEO.box, tm(0x8a3a2c), { p: [x - side * 8.1, GY + h * 0.45, -sm], s: [0.5, h * 0.12, CH + 3], cast: false });
    g.add(wall, cap, stripe);
    for (let k = 0; k < 3; k++) {
      const hh = 25 + r() * 80, w = 8 + r() * 14, xx = pathX(sm) + side * (62 + r() * 70), zz = -(s0 + r() * CH);
      const sp = mk(GEO.box, tm(pick2(r, rust)), { p: [xx, GY + hh / 2, zz], s: [w, hh, w * (0.8 + r() * 0.8)], r: [0, r() * 3, 0], out: 0.1 });
      const sc = mk(GEO.box, tm(0xe09a5a), { p: [xx, GY + hh + 0.5, zz], s: [w * 1.05, 1.2, w * 1.1], r: [0, sp.rotation.y, 0], out: 0.07 });
      g.add(sp, sc);
    }
    for (let k = 0; k < 4; k++) {
      const sc = 1.5 + r() * 4, xx = pathX(sm) + side * (30 + r() * 12), zz = -(s0 + r() * CH);
      g.add(mk(GEO.dodeca, tm(pick2(r, [0x9a6a50, 0xa87a5a])), { p: [xx, GY + sc * 0.5, zz], s: [sc, sc * 0.7, sc], r: [r() * 3, r() * 3, 0], out: 0.07 }));
    }
    for (let k = 0; k < 5; k++) {
      const xx = pathX(sm) + side * (28 + r() * 70), zz = -(s0 + r() * CH), th = 4 + r() * 7;
      const t = new THREE.Group(); t.position.set(xx, GY, zz);
      t.add(mk(GEO.cyl, tm(0x6a4a30), { p: [0, th * 0.25, 0], s: [0.5, th * 0.5, 0.5] }));
      t.add(mk(GEO.cone, tm(0x3f9a4e), { p: [0, th * 0.75, 0], s: [th * 0.28, th * 0.9, th * 0.28], out: 0.08 }));
      t.add(mk(GEO.cone, tm(0x58b85c), { p: [0, th * 1.05, 0], s: [th * 0.2, th * 0.7, th * 0.2], out: 0.08 }));
      g.add(t);
    }
  }
  // river
  const rg = new THREE.Group(); rg.position.set(pathX(sm), GY + 0.1, -sm);
  rg.rotation.y = -Math.atan((pathX(s0 + CH) - pathX(s0)) / CH);
  const rv = new THREE.Mesh(GEO.plane, new THREE.MeshBasicNodeMaterial({ color: col(0x40b8ff, 1.1), fog: true })); rv.rotation.x = -Math.PI / 2; rv.scale.set(14 + r() * 4, CH + 2, 1);
  rg.add(rv); g.add(rg);
}
function pick2(r, arr) { return arr[Math.floor(r() * arr.length)]; }
function beltChunk(i, g, CH) {
  const r = mulberry(i * 6151 + 5), s0 = i * CH;
  const cols = [0x7a6a8a, 0x6a5a7a, 0x8a7a9a, 0x5a5070, 0x9a8aa8];
  for (let k = 0; k < 9; k++) {
    const sc = 4 + Math.pow(r(), 2) * 34;
    const ang = r() * TAU, rad = 62 + r() * 200 + sc;
    const s = s0 + r() * CH;
    const a = buildAsteroid(sc, pick2(r, cols), Math.floor(r() * 1000));
    a.position.set(pathX(s) + Math.cos(ang) * rad, pathY(s) + Math.sin(ang) * rad * 0.6, -s);
    a.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(a);
  }
  for (let k = 0; k < 14; k++) {
    const s = s0 + r() * CH, sc = 0.6 + r() * 1.6;
    const a = mk(GEO.ico, tm(pick2(r, cols)), { s: sc, r: [r() * 3, r() * 3, 0] });
    a.position.set(pathX(s) + (r() - 0.5) * 120, pathY(s) + (r() - 0.5) * 70, -s);
    g.add(a);
  }
  if (i % 9 === 4) { // derelict hull sections
    const s = s0 + 20, side = r() < 0.5 ? -1 : 1, x = pathX(s) + side * (110 + r() * 40);
    const h = new THREE.Group(); h.position.set(x, pathY(s) + (r() - 0.5) * 40, -s); h.rotation.set(r(), r() * 3, r());
    h.add(mk(GEO.box, tm(0x6a6a7a), { s: [20, 14, 70], out: 0.15 }), mk(GEO.box, tm(0x4a4a5a), { p: [0, 10, -10], s: [8, 10, 26], out: 0.12 }), mk(GEO.cyl, tm(0x3a3a4a), { p: [14, 0, 20], r: [Math.PI / 2, 0, 0], s: [5, 30, 5], out: 0.1 }));
    g.add(h);
  }
}
function riftChunk(i, g, CH) {
  const r = mulberry(i * 4421 + 9), s0 = i * CH;
  const cols = [[0x20d0c0, 0x108078], [0xe040a0, 0x802060], [0x7a50ff, 0x402a90]];
  for (let k = 0; k < 8; k++) {
    const c = pick2(r, cols), h = 20 + r() * 70, w = 3 + r() * 6;
    const ang = r() * TAU, rad = 58 + r() * 190, s = s0 + r() * CH;
    const m = toon(c[1], { emissive: col(c[0], 0.5) });
    const cr = mk(GEO.octa, m, { s: [w, h, w], out: 0.06 });
    cr.position.set(pathX(s) + Math.cos(ang) * rad, pathY(s) + Math.sin(ang) * rad * 0.7, -s);
    cr.rotation.set((r() - 0.5) * 0.8, r() * 3, (r() - 0.5) * 0.8);
    g.add(cr);
  }
  for (let k = 0; k < 3; k++) {
    const s = s0 + r() * CH, ang = r() * TAU, rad = 90 + r() * 170, sc = 8 + r() * 18;
    const isl = new THREE.Group(); isl.position.set(pathX(s) + Math.cos(ang) * rad, pathY(s) + Math.sin(ang) * rad * 0.6, -s);
    isl.add(mk(GEO.dodeca, tm(0x5a4a8a), { s: [sc, sc * 0.35, sc], out: 0.06 }), mk(GEO.cone, tm(0x3a2a6a), { p: [0, -sc * 0.5, 0], r: [Math.PI, 0, 0], s: [sc * 0.7, sc * 0.9, sc * 0.7], out: 0.06 }));
    isl.add(mk(GEO.cone, solidGlow(0x20ffe0, 1.2), { p: [0, sc * 0.55, 0], s: [sc * 0.12, sc * 0.5, sc * 0.12], cast: false }));
    g.add(isl);
  }
}

// ---- backgrounds
function bgBelt() {
  const g = new THREE.Group();
  const p = gasPlanet(520, 0xd08a60, 0xb86a4a, 0xf0c090, 0xe8c8a0); p.position.set(-900, 260, -2100); g.add(p);
  const m = gasPlanet(120, 0x8a8aa0, 0x6a6a80, 0xaaaac0); m.position.set(700, 380, -2000); g.add(m);
  return g;
}
function bgRift() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(700, 18, 8, 80), glowMat(0x30ffe0, 0.85, false, 1.5)); ring.position.set(0, 120, -2200); g.add(ring);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(700, 70, 8, 80), glowMat(0x30ffe0, 0.14, true, 1.2)); halo.position.copy(ring.position); g.add(halo);
  const p = gasPlanet(260, 0x6a50d0, 0x4a38a0, 0xa090ff); p.position.set(-1100, 500, -2000); g.add(p);
  return g;
}
function bgArmada() {
  const g = new THREE.Group();
  const p = gasPlanet(900, 0x3a6ad0, 0x2a4aa0, 0x80b0ff, 0xc0d0ff); p.position.set(-1100, -700, -1800); g.add(p);
  const n1 = new THREE.Mesh(GEO.sph, glowMat(0xa030c0, 0.1, true, 1)); n1.scale.setScalar(900); n1.position.set(900, 300, -2000); g.add(n1);
  const n2 = new THREE.Mesh(GEO.sph, glowMat(0x3050ff, 0.08, true, 1)); n2.scale.setScalar(700); n2.position.set(-300, 500, 1800); g.add(n2);
  return g;
}

// ---------------------------------------------------------------- script helpers (shared by all stages)
const Script = {
  L: null,
  begin() { Script.L = []; },
  at: (s, fn) => { Script.L.push({ s, at: s, fn, done: false }); },
  st: (s, fn) => { Script.L.push({ s: Math.max(0, s - LEAD), at: s, fn, done: false }); },
  end() { Script.L.sort((a, b) => a.s - b.s); return Script.L; },
};
const hint = (fn) => () => Hint.show(fn);
function sV(n, x = 0, y = 2, o = {}) { for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1); spawnRel('drone', x + k * 9, y + Math.abs(k) * 1.5, -300 - Math.abs(k) * 12, Object.assign({ amp: 5, ph: i, move: 'sine' }, o)); } }
function sLine(n, y = 2, o = {}) { for (let i = 0; i < n; i++) spawnRel('drone', n === 1 ? 0 : -30 + (i * 60) / (n - 1), y + (i % 2) * 4, -290 - (i % 2) * 14, Object.assign({ amp: 4, ph: i * 0.8 }, o)); }
function sRow(n, y, o = {}) { for (let i = 0; i < n; i++) spawnRel('drone', -22 + (i * 44) / Math.max(1, n - 1), y, -300 - i * 6, Object.assign({ move: 'loop', amp: 7, ph: i * 0.7 }, o)); }
function sSwoop(n, side, y = 2, o = {}) { for (let i = 0; i < n; i++) spawnRel('swooper', side * 90, y + i * 2, -240 - i * 38, Object.assign({ x1: -side * 70, T: 4.4 + i * 0.1, dy: 8 - i }, o)); }
function sMines(n, o = {}) { for (let i = 0; i < n; i++) spawnRel('mine', rnd(-24, 24), rnd(-4, 14), -320 - i * 24, Object.assign({}, o)); }
function chase(id, offsetZ = 14) {
  const w = wingmanById(id);
  if (!w || w.state !== 'ok' || (w.chaser && w.chaser.alive)) return;
  const c = spawn('chaser', w.pos.clone().add(new V3(0, 1, offsetZ)), { wing: w });
  w.chaser = c;
  Radio.say(id, id === 'newt' ? 'Fob, help! Someone\'s on my tail!' : id === 'bolt' ? 'Ugh — I\'ve got a tail! Get him off me, Fob!' : 'Bandit locked on me! Cover me!');
}
function setCheckpoint(s) { G.cp = s; G.cpScore = G.score; HUD.toast('CHECKPOINT', 'good', 1.2); Snd.play('pickup', { vol: 0.5 }); }
function silverRing(s, x, y) { Script.st(s, () => spawn('pickup', W(s, x, y), { type: 'silver' })); }
function goldRing(s, x, y) { Script.st(s, () => spawn('pickup', W(s, x, y), { type: 'gold' })); }
function pickupAt(s, x, y, type) { Script.st(s, () => spawn('pickup', W(s, x, y), { type })); }
function gnd(s, x, h) { return W(s, x, GY + h / 2); }

// ================================================================ STAGE 1 : SUNHAVEN CANYON (rail)
STAGES.s1 = {
  id: 's1', name: 'SUNHAVEN CANYON', sub: 'Stage 1 — Hold the line', mode: 'rail', speed: 52, lat: 30, bx: 27, by0: -11, by1: 15,
  theme: 'canyon', music: 'stage1', ground: { y: GY, c1: 0xd9a95c, c2: 0xc79448, c3: 0x6ab060 }, gravity: -22,
  path: { x: (s) => 38 * Math.sin(s * 0.0028) + 16 * Math.sin(s * 0.0071 + 1), y: () => 0 },
  chunk: canyonChunk, bg: null, medalHits: 60, checkpoints: [2400], bossAt: 4300, bossKind: 'walker', next: 's2',
  events() {
    const { at, st } = Script; Script.begin();
    at(0, () => { Radio.say('kestrel', 'Fob Squadron — Sunhaven Canyon is the Gloom Fleet\'s front door. Stay sharp!'); later(4.5, () => Radio.say('bolt', 'Try to keep up, Fob! I\'m not carrying you through this one.')); });
    at(35, hint(() => `Steer with ${glyphSet().move}`));
    at(75, () => sV(3, 0, 3));
    at(135, hint(() => `Press / hold ${glyphSet().fire} to fire lasers`));
    at(150, () => sLine(5, 3));
    st(300, () => { for (const x of [-16, 14]) spawn('pillar', gnd(300, x, 44), { h: 44, w: 7, d: 7 }); });
    at(360, hint(() => `Double-tap ${glyphSet().bank} to BARREL ROLL — it reflects enemy fire`));
    at(380, () => { sV(5, -6, 4); later(3, () => sSwoop(3, 1, 3)); });
    st(520, () => { for (let i = 0; i < 4; i++) spawn('turret', W(520 + i * 30, (i % 2 ? 1 : -1) * 20, GY + 0.1)); });
    at(560, hint(() => `Hold ${glyphSet().charge} to lock on up to 8 targets — release to launch`));
    at(600, () => { sRow(6, 5); later(2, () => sRow(5, 8)); });
    goldRing(700, 0, 5); silverRing(760, -14, 0);
    at(740, hint(() => `${glyphSet().boost} boosts · ${glyphSet().brake} brakes — watch the boost gauge`));
    at(820, () => chase('newt'));
    at(860, () => sLine(4, 6, { move: 'loop', amp: 6 }));
    st(950, () => { spawn('pillar', gnd(950, 0, 50), { h: 50, w: 9, d: 9 }); spawn('tower', gnd(990, -18, 16), { h: 16, w: 6 }); spawn('tower', gnd(1010, 17, 20), { h: 20, w: 6 }); });
    at(1000, hint(() => `${glyphSet().bomb} launches a NOVA BOMB — clears the screen`));
    at(1040, () => { sV(7, 0, 4, { amp: 8 }); later(2.5, () => sSwoop(4, -1, 4)); });
    pickupAt(1150, 12, 4, 'laser'); silverRing(1190, 0, 4);
    st(1250, () => { for (let i = 0; i < 6; i++) spawn('turret', W(1250 + i * 26, (i % 2 ? 1 : -1) * rnd(14, 24), GY + 0.1)); });
    at(1320, () => { sRow(7, 4, { amp: 9 }); });
    at(1420, () => sMines(4));
    at(1520, () => { Radio.say('kestrel', 'Fob, heavy contact ahead! Bolt, Newt — flank him!'); });
    at(1560, () => spawnRel('gunship', 0, 4, -320, { drop: 'bomb' }));
    at(1900, () => { sLine(5, 2); later(3, () => sSwoop(3, 1, 5)); });
    goldRing(1950, -18, 9); pickupAt(1990, 0, 5, 'wrench'); silverRing(2060, 8, 2);
    st(2040, () => { for (const [x, h] of [[-20, 52], [-5, 20], [10, 52], [22, 20]]) spawn('pillar', gnd(2040 + Math.abs(x), x, h), { h, w: 8, d: 8 }); });
    at(2150, () => chase('bolt'));
    at(2180, () => sV(5, 0, 5));
    at(2400, () => { setCheckpoint(2400); });
    at(2420, () => { sRow(8, 5, { amp: 10 }); later(2, () => sLine(6, 8)); });
    st(2520, () => { for (let i = 0; i < 7; i++) spawn('turret', W(2520 + i * 24, (i % 2 ? 1 : -1) * rnd(10, 25), GY + 0.1)); for (let i = 0; i < 3; i++) spawn('tower', gnd(2600 + i * 40, (i - 1) * 16, 14 + i * 3), { h: 14 + i * 3, w: 6 }); });
    at(2700, () => { sSwoop(4, -1, 3); later(1.5, () => sSwoop(4, 1, 6)); });
    pickupAt(2780, -10, 4, 'health');
    // the arch gallery
    for (let k = 0; k < 4; k++) {
      const s = 2900 + k * 110, x = [-14, 12, -6, 16][k];
      st(s, () => {
        spawn('pillar', gnd(s, x - 12, 54), { h: 54, w: 6, d: 6 });
        spawn('pillar', gnd(s, x + 12, 54), { h: 54, w: 6, d: 6 });
        spawn('pillar', W(s, x, GY + 40), { w: 30, h: 4.5, d: 6, cap: false, hex: 0xa84a38 });
      });
      silverRing(s, x, 0);
    }
    goldRing(3150, 0, 8);
    at(3250, () => { sV(9, 0, 5, { amp: 10 }); later(2, () => sMines(5)); });
    at(3500, () => { Radio.say('newt', 'Whoa — that\'s a lot of Gloom fighters! Fob, use your bombs!'); sRow(8, 5); later(1, () => sRow(8, 9, { amp: 12 })); later(3, () => sSwoop(5, 1, 4)); });
    pickupAt(3560, 0, 3, 'bomb'); silverRing(3620, 12, 4); silverRing(3660, -12, 2);
    at(3900, () => { sLine(7, 4, { move: 'loop', amp: 9 }); chase('kestrel'); });
    pickupAt(4100, 0, 5, 'health');
    at(4300, () => startBoss('walker'));
    return Script.end();
  },
};

// ================================================================ STAGE 2A : RUBBLE BELT (rail, space)
function asteroidField(s, n, spread = 26, rmax = 7) {
  Script.st(s, () => { for (let i = 0; i < n; i++) { const z = s + i * (160 / n); const r = 1.6 + Math.pow(Math.random(), 2) * rmax; spawn('asteroid', W(z, rnd(-spread, spread), rnd(-12, 16)), { r, hex: pick([0x7a6a8a, 0x8a7a9a, 0x6a5a7a]), seed: rndi(1, 999) }); } });
}
function beam(s, y, w = 80, hex = 0x6a6a7a) { Script.st(s, () => spawn('pillar', W(s, 0, y), { w, h: 3.2, d: 4, cap: false, hex })); }
STAGES.s2a = {
  id: 's2a', name: 'RUBBLE BELT', sub: 'Stage 2 — Through the wreckage', mode: 'rail', speed: 56, lat: 32, bx: 30, by0: -16, by1: 18,
  theme: 'belt', music: 'stage2', ground: null, gravity: 0,
  path: { x: (s) => 26 * Math.sin(s * 0.0021) + 10 * Math.sin(s * 0.006), y: (s) => 10 * Math.sin(s * 0.0017 + 1) },
  chunk: beltChunk, bg: bgBelt, medalHits: 70, checkpoints: [2200], bossAt: 4000, bossKind: 'rotor', next: 's3',
  events() {
    const { at, st } = Script; Script.begin();
    at(0, () => { Radio.say('kestrel', 'Rubble Belt — wrecks and rocks everywhere. Weave, don\'t brake!'); later(4.5, () => Radio.say('newt', 'The Gloom love hiding in the asteroids. Keep your eyes open!')); });
    at(50, () => sV(5, 0, 4));
    asteroidField(160, 14);
    at(240, () => sLine(5, 4)); at(300, () => sSwoop(3, 1, 4));
    beam(420, -8); beam(480, 10);
    at(450, () => sV(7, 0, 5));
    asteroidField(560, 18, 28);
    at(600, () => { sMines(5); });
    at(700, () => { sRow(7, 4); later(2, () => sSwoop(4, -1, 6)); });
    goldRing(760, 0, 6); silverRing(800, 14, 2);
    at(850, () => chase('bolt'));
    asteroidField(900, 20, 30);
    at(960, () => sV(7, 0, 4, { move: 'loop', amp: 7 }));
    beam(1080, 0, 70); beam(1130, -10, 70); beam(1180, 12, 70);
    pickupAt(1250, 0, 3, 'laser');
    at(1300, () => { sRow(8, 6); later(2, () => sRow(8, 10)); });
    at(1500, () => { Radio.say('bolt', 'Fob — bandit command ship on the scope! Handle him!'); });
    at(1540, () => spawnRel('gunship', 0, 4, -330, { drop: 'bomb', leaveT: 60 }));
    asteroidField(1850, 22, 30, 8);
    goldRing(1960, 16, 8); silverRing(2000, -12, 0);
    pickupAt(2080, 0, 5, 'wrench');
    at(2200, () => setCheckpoint(2200));
    at(2260, () => { sSwoop(5, 1, 4); later(1.5, () => sSwoop(5, -1, 6)); });
    asteroidField(2380, 22, 32, 9); at(2420, () => sMines(6));
    at(2560, () => chase('newt'));
    at(2600, () => sV(9, 0, 5, { amp: 9 }));
    beam(2750, 6, 90); beam(2800, -6, 90); beam(2850, 12, 90); beam(2900, -12, 90);
    goldRing(2960, 0, 0);
    at(3050, () => { sRow(9, 5, { amp: 12 }); later(1.5, () => sLine(7, 9)); later(3, () => sSwoop(5, 1, 3)); });
    pickupAt(3160, 0, 4, 'bomb'); silverRing(3200, -16, 4);
    asteroidField(3300, 26, 32, 9);
    at(3480, () => { sMines(6); later(2, () => sV(9, 0, 5)); chase('kestrel'); });
    pickupAt(3700, 0, 4, 'health'); silverRing(3760, 12, 6);
    at(3880, () => sRow(9, 6, { move: 'loop', amp: 10 }));
    at(4000, () => startBoss('rotor'));
    return Script.end();
  },
};

// ================================================================ STAGE 2B : NEBULA RIFT (rail, space, route B)
function gate(s, x, y, r = 11, color = 0x40ffe0) {
  Script.st(s, () => {
    const c = W(s, x, y);
    const R2 = r + 3.5;
    spawn('gateBar', c.clone().add(new V3(0, R2, 0)), { box: [R2 + 4, 2, 2.2], visual: true, gr: r + 1.5, color }).mesh.position.copy(c);
    spawn('gateBar', c.clone().add(new V3(0, -R2, 0)), { box: [R2 + 4, 2, 2.2] });
    spawn('gateBar', c.clone().add(new V3(R2, 0, 0)), { box: [2, R2 + 4, 2.2] });
    spawn('gateBar', c.clone().add(new V3(-R2, 0, 0)), { box: [2, R2 + 4, 2.2] });
  });
}
STAGES.s2b = {
  id: 's2b', name: 'NEBULA RIFT', sub: 'Stage 2 (Route B) — The hidden lane', mode: 'rail', speed: 60, lat: 34, bx: 32, by0: -17, by1: 19,
  theme: 'rift', music: 'stage2b', ground: null, gravity: 0,
  path: { x: (s) => 50 * Math.sin(s * 0.0023) + 14 * Math.sin(s * 0.0067), y: (s) => 14 * Math.sin(s * 0.0031) },
  chunk: riftChunk, bg: bgRift, medalHits: 80, checkpoints: [2100], bossAt: 3800, bossKind: 'leviathan', next: 's3', hard: true,
  events() {
    const { at, st } = Script; Script.begin();
    at(0, () => { Radio.say('kestrel', 'The Nebula Rift... nobody flies this lane. Expect heavier resistance!'); later(5, () => Radio.say('bolt', 'Heavier? Great. More targets.')); });
    at(50, () => sV(5, 0, 4, { v: 70 }));
    gate(260, 0, 2); gate(340, -14, 6); gate(420, 12, 0);
    at(300, () => sLine(6, 4)); at(380, () => sSwoop(4, 1, 4)); at(460, () => sMines(5));
    goldRing(500, 0, 4);
    at(560, () => { sRow(8, 5, { v: 70 }); later(1.5, () => sSwoop(4, -1, 7)); });
    gate(700, 10, 8); gate(780, -12, -2); gate(860, 0, 6, 10);
    at(800, () => chase('newt'));
    at(900, () => sV(9, 0, 5, { v: 72, amp: 9 }));
    silverRing(960, 0, 4); pickupAt(1010, 12, 5, 'laser');
    at(1050, () => { sMines(7); later(2, () => sRow(8, 6, { move: 'loop' })); });
    gate(1200, -10, 4); gate(1260, 12, 10); gate(1320, 0, -4); gate(1380, -14, 6);
    at(1250, () => sSwoop(5, 1, 5));
    at(1450, () => { Radio.say('kestrel', 'Fob — an elite gunship is dropping out of the rift! Hit him hard!'); });
    at(1490, () => spawnRel('gunship', 0, 4, -330, { drop: 'bomb', leaveT: 62 }));
    goldRing(1900, 0, 0); silverRing(1950, 14, 4);
    pickupAt(2000, 0, 5, 'wrench');
    at(2100, () => setCheckpoint(2100));
    gate(2200, 12, 4); gate(2270, -12, 8); gate(2340, 8, -2); gate(2410, -8, 10); gate(2480, 0, 4, 9);
    at(2250, () => { sRow(9, 6); later(1.5, () => sLine(8, 9)); });
    at(2450, () => chase('bolt'));
    at(2550, () => { sMines(8); later(2, () => sSwoop(6, -1, 5)); });
    pickupAt(2700, 0, 4, 'bomb'); silverRing(2740, -14, 2);
    at(2800, () => { sV(11, 0, 5, { v: 74, amp: 11 }); later(2, () => sRow(10, 8, { move: 'loop', amp: 11 })); });
    gate(3000, 0, 4, 9); gate(3070, 14, 8, 9); gate(3140, -14, 0, 9);
    at(3150, () => { sSwoop(6, 1, 5); later(1.5, () => sSwoop(6, -1, 7)); chase('kestrel'); });
    pickupAt(3400, 0, 4, 'health'); silverRing(3450, 10, 6);
    at(3650, () => sRow(10, 6, { move: 'loop', amp: 12 }));
    at(3800, () => startBoss('leviathan'));
    return Script.end();
  },
};

// ================================================================ STAGE 3 : GLOOM ARMADA (all-range)
function armadaDecor() {
  const g = new THREE.Group();
  const r = mulberry(4242);
  // distant debris clusters and derelicts for parallax inside the arena
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, rad = 120 + r() * 320, sc = 5 + r() * 18;
    const m = buildAsteroid(sc, pick2(r, [0x6a5a7a, 0x7a6a8a, 0x5a5070]), Math.floor(r() * 999));
    m.position.set(Math.cos(a) * rad, (r() - 0.5) * 200, Math.sin(a) * rad); m.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(m);
  }
  for (let i = 0; i < 6; i++) { // beacon pylons marking the arena
    const a = (i / 6) * TAU, rad = 400;
    const p = new THREE.Group(); p.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    p.add(mk(GEO.cyl, tm(0x5a5a7a), { p: [0, 0, 0], s: [4, 160, 4], out: 0.1 }), mk(GEO.sph, solidGlow(0xff4060, 2), { p: [0, 82, 0], s: 5, cast: false }), mk(GEO.sph, solidGlow(0xff4060, 2), { p: [0, -82, 0], s: 5, cast: false }));
    g.add(p);
  }
  // allied carrier (visual anchor)
  const c = new THREE.Group(); c.position.set(-260, -60, 160); c.rotation.y = 0.8;
  c.add(mk(GEO.box, tm(0xdde4f0), { s: [34, 16, 150], out: 0.12 }), mk(GEO.box, tm(0x2a62d8), { p: [0, 12, 20], s: [16, 10, 40], out: 0.1 }), mk(GEO.box, tm(0xdde4f0), { p: [0, 20, 30], s: [6, 8, 10], out: 0.08 }));
  for (const sx of [-1, 1]) c.add(mk(GEO.box, tm(0xc8d0e0), { p: [28 * sx, -2, 20], s: [22, 3, 50], out: 0.1 }), mk(GEO.cyl, solidGlow(0x5ad0ff, 1.6), { p: [10 * sx, 0, 76], r: [Math.PI / 2, 0, 0], s: [4, 3, 4], cast: false }));
  g.add(c);
  return g;
}
STAGES.s3 = {
  id: 's3', name: 'GLOOM ARMADA', sub: 'Stage 3 — All-range showdown', mode: 'ar', speed: 62, arena: 420, theme: 'armada', music: 'stage3', ground: null, gravity: 0,
  chunk: null, bg: bgArmada, decor: armadaDecor, medalHits: 40, checkpoints: [], bossKind: 'dreadnought', next: null, arTarget: 20,
  events() { Script.begin(); return Script.end(); },
};
