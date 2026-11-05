// SNIPEOUT HD: the four themes (sky, fog, sun, terrain, scenery) and the overclock skin. The terrain is each theme's
// natural ground carved round the track by a corridor grid (it falls away under elevated decks, stays well below open
// edges, rises over tunnels). Scenery is instanced meshes in node materials, placed off the track, made with the world.
(() => {
const E = My3D2dge, SN = globalThis.SN, U = 16, M = 16;   // M: units per metre
const fbm = (x, y, oct = 4) => { let v = 0, a = .5, t = 0, f = 1; for (let o = 0; o < oct; o++) { v += a * E.noise2(x * f, y * f); t += a; a *= .5; f *= 2.03; } return v / t; };
SN.fbm = fbm;

SN.THEMES = {
  coast: { sky: { top: '#2a1a4a', horizon: '#ffb070', ground: '#c8506a', haze: .35 }, sun: { dir: [-.8, .3, -.35], color: '#ffc890', intensity: 2.4 }, ambient: ['#ffd0c0', '#4a3a5a', 1.6],
    fog: { color: '#e89878', near: 12000, far: 26000 }, neon: '#29c8e8', tint: '#2a2e36', panel: ['#22252c', '#2a2e36'], rock: { colors: ['#9a8a7a', '#b8a890', '#7a6a5a', '#c8b8a0'], band: 40 }, weather: 'spray' },
  desert: { sky: { top: '#3a78d8', horizon: '#f0e0c0', ground: '#9cc8f0', haze: .25 }, sun: { dir: [-.3, .2, -.93], color: '#fff2d0', intensity: 3.0 }, ambient: ['#fff0d8', '#8a5a3a', 1.7],
    fog: { color: '#e8d0a0', near: 14000, far: 30000 }, neon: '#ffb347', tint: '#2e2a26', panel: ['#2a2622', '#332e28'], rock: { colors: ['#b85a30', '#d8884a', '#8a3a20', '#e8b070'], band: 48 }, weather: 'dust' },
  city: { sky: { top: '#05030f', horizon: '#3a1a5a', ground: '#1a0f3a', haze: .2 }, sun: { dir: [.4, .5, -.75], color: '#8090ff', intensity: .55 }, ambient: ['#3a3a8a', '#100818', 1.1],
    fog: { color: '#1a1035', near: 6000, far: 22000 }, neon: '#ff3ab4', tint: '#1e1e28', panel: ['#1a1a22', '#22222c'], rock: { colors: ['#2a2a34', '#34343e', '#222228', '#3a3a44'], band: 32 }, bloom: true, weather: 'rain' },
  arctic: { sky: { top: '#020814', horizon: '#1a4a6a', ground: '#0a2a4a', haze: .3 }, sun: { dir: [.5, -.3, -.8], color: '#a0c8ff', intensity: .9 }, ambient: ['#8ab0e0', '#20304a', 1.4],
    fog: { color: '#9ab8d8', near: 9000, far: 26000 }, neon: '#7af0ff', tint: '#262c34', panel: ['#20262e', '#28303a'], rock: { colors: ['#3a4250', '#4a5260', '#2a3240', '#5a6270'], band: 40 }, weather: 'snow' },
  overclock: { sky: '#000000', sun: { dir: [-.3, .4, -.85], color: '#ffffff', intensity: .6 }, ambient: ['#606080', '#101010', 1.2],
    fog: { color: '#000000', near: 2400, far: 9600 }, neon: '#ff3ab4', tint: '#05050a', panel: ['#05050a', '#0a0a10'], rock: { colors: ['#050505', '#0a0a0a', '#050505', '#0a0a0a'], band: 40 }, bloom: true }
};

/* ---- the corridor grid: for every 8 m cell near the track, the nearest deck's distance and height ---- */
function corridor(T) {
  if (T._corridor) return T._corridor;
  const cell = 8 * M, n = 512, D = new Float32Array(n * n).fill(1e9), Z = new Float32Array(n * n), K = new Uint8Array(n * n), TZ = new Float32Array(n * n).fill(-1e9);
  const R = 110 * M;
  for (let i = 0; i < T.N; i += 2) {
    const cx = T.Cx[i], cy = T.Cy[i], hw = T.hw[i], fl = T.flags[i];
    const gap = fl & SN.TFLAG.GAP, drop = fl & SN.TFLAG.DROP, tun = fl & SN.TFLAG.TUNNEL, open = fl & (SN.TFLAG.OPEN_L | SN.TFLAG.OPEN_R);
    const z = drop ? T.dropZ[i] : T.Cz[i];
    const g0 = Math.max(0, Math.floor((cx - R) / cell)), g1 = Math.min(n - 1, Math.ceil((cx + R) / cell)), h0 = Math.max(0, Math.floor((cy - R) / cell)), h1 = Math.min(n - 1, Math.ceil((cy + R) / cell));
    for (let gy = h0; gy <= h1; gy++) for (let gx = g0; gx <= g1; gx++) {
      const x = gx * cell, y = gy * cell, d = Math.hypot(x - cx, y - cy) - hw, k = gy * n + gx;
      if (d > R) continue;
      if (tun && d < 14 * M) TZ[k] = Math.max(TZ[k], T.Cz[i] + 16 * M);
      // the lowest deck wins (an overpass: the ground goes under the lower one)
      const want = z - (gap ? 60 * M : open ? 10 * M : 3 * M);
      const cap = want + Math.max(0, d - 26 * M) * .85;
      if (cap < Z[k] || D[k] > 1e8) { Z[k] = cap; }
      if (d < D[k]) { D[k] = d; K[k] = (gap ? 1 : 0) | (open ? 2 : 0) | (tun ? 4 : 0); }
    }
  }
  return (T._corridor = { cell, n, D, Z, K, TZ });
}
function corridorAt(C, x, y) {
  const gx = x / C.cell, gy = y / C.cell, i = Math.floor(gx), j = Math.floor(gy);
  if (i < 0 || j < 0 || i >= C.n - 1 || j >= C.n - 1) return null;
  const fx = gx - i, fy = gy - j, k = j * C.n + i, n = C.n;
  const d = Math.min(C.D[k], C.D[k + 1], C.D[k + n], C.D[k + n + 1]); if (d > 1e8) return null;
  const z = (C.Z[k] * (1 - fx) + C.Z[k + 1] * fx) * (1 - fy) + (C.Z[k + n] * (1 - fx) + C.Z[k + n + 1] * fx) * fy;
  const tz = Math.max(C.TZ[k], C.TZ[k + 1], C.TZ[k + n], C.TZ[k + n + 1]);
  return { d, z, tz };
}

/* ---- each theme's natural ground (engine units in, engine units out) and colour ---- */
const NATURAL = {
  coast(lx, ly) {   // the sea to the south, a beach, hills rising north, the old town plateau over the tunnel
    if (ly > 120) return -6 * M;
    const hills = fbm(lx / 380, ly / 380) * 80 + Math.max(0, -ly - 200) * .12;
    const town = Math.exp(-(((lx - 420) / 260) ** 2 + ((ly + 690) / 160) ** 2)) * 30;
    const beach = SN.smooth01((120 - ly) / 160);
    return (hills * beach + town * 1.2 + (beach - 1) * 6) * M;
  },
  desert(lx, ly) {   // dunes, mesas with flat tops, a canyon floor
    const dunes = fbm(lx / 140, ly / 90, 3) * 10;
    const m = fbm(lx / 700 + 3, ly / 700 - 2, 3), mesa = SN.smooth01((m - .5) * 9) * (45 + fbm(lx / 300, ly / 300) * 30);
    return (dunes + mesa) * M;
  },
  city(lx, ly) { return -40 * M; },
  arctic(lx, ly) {   // snowy ridges, a glacier valley, the frozen lake
    const ridge = fbm(lx / 500, ly / 500, 5) * 160 + Math.abs(fbm(lx / 230 + 7, ly / 230) - .5) * 60;
    const lake = Math.exp(-(((lx - 480) / 330) ** 2 + ((ly - 1000) / 230) ** 2));
    return (ridge * (1 - lake) + 6 * lake - 20) * M;
  },
  overclock() { return -400 * M; }
};
const COLOR = {
  coast(x, y, z, nz, lx, ly, out) {
    const zm = z / M, n = E.hash2(Math.floor(x / 48), Math.floor(y / 48));
    if (zm < .5) return set(out, 196, 178, 132, n * 18);   // sand
    if (zm < 3) return set(out, 212, 190, 140, n * 20);
    const g = fbm(x / 900, y / 900); return nz < .82 ? set(out, 150, 130, 104, n * 20) : set(out, 112 + g * 40, 132 + g * 30, 72, n * 22);
  },
  desert(x, y, z, nz, lx, ly, out) { const n = E.hash2(Math.floor(x / 48), Math.floor(y / 48)), d = fbm(x / 600, y / 600); return set(out, 214 - d * 30, 150 - d * 30, 96 - d * 20, n * 18); },
  city(x, y, z, nz, lx, ly, out) { const n = E.hash2(Math.floor(x / 64), Math.floor(y / 64)), lane = (Math.floor(x / 320) + Math.floor(y / 320)) & 1; return set(out, 28 + lane * 6, 28 + lane * 6, 38 + lane * 8, n * 10); },
  arctic(x, y, z, nz, lx, ly, out) {
    const n = E.hash2(Math.floor(x / 48), Math.floor(y / 48)), lake = Math.exp(-(((lx - 480) / 330) ** 2 + ((ly - 1000) / 230) ** 2));
    if (lake > .5) return set(out, 150, 196, 226, n * 14);
    return nz < .8 ? set(out, 72, 82, 98, n * 16) : set(out, 222, 232, 246, n * 16);
  },
  overclock(x, y, z, nz, lx, ly, out) { return set(out, 4, 4, 8, 0); }
};
function set(out, r, g, b, j = 0) { out[0] = Math.max(0, Math.min(255, r + j)); out[1] = Math.max(0, Math.min(255, g + j)); out[2] = Math.max(0, Math.min(255, b + j)); return out; }

/** the terrain options for World3D: the theme's ground carved round the track */
SN.terrainFor = (T, themeId) => {
  const C = corridor(T), org = T.def.origin, nat = NATURAL[themeId] || NATURAL.coast, col = COLOR[themeId] || COLOR.coast, ox = org[0] * M, oy = org[1] * M;
  const height = (x, y) => {
    const lx = (x - ox) / M, ly = (y - oy) / M; let h = nat(lx, ly);
    const c = corridorAt(C, x, y);
    if (c) { if (c.tz > -1e8) h = Math.max(h, c.tz); else h = Math.min(h, c.z); }
    return h;
  };
  return { size: 65536, height, color: (x, y, z, nz, out) => col(x, y, z, nz, (x - ox) / M, (y - oy) / M, out), far: 26000, cell: 64, rock: SN.THEMES[themeId].rock, bottom: -3000, speckle: .18, mottle: .25 };
};
SN.natural = (T, themeId, x, y) => (NATURAL[themeId] || NATURAL.coast)((x - T.def.origin[0] * M) / M, (y - T.def.origin[1] * M) / M);

/* ---- signage: sponsor boards drawn with the engine's pixel font ---- */
SN.SPONSORS = [
  ['QWIK-FUEL', 'FILL UP. FALL UP.', '#ffb000', '#1a1a20'], ['OKTA NOODLE', 'EAT AT 600 KM/H', '#ff4a6a', '#fff2e0'], ['HALCYON BANK', 'YOUR MONEY, FASTER', '#7af0ff', '#0a1a30'],
  ['AXON AIR', 'BREATHE PREMIUM', '#bff8ff', '#2a4a8a'], ['VANTA PAINTS', 'DARKER THAN NOTHING', '#ffffff', '#000000'], ['MERIDIAN TELECOM', 'ALWAYS ON. ALWAYS.', '#ff3ab4', '#12081e'],
  ['POLARIS COLD STORAGE', 'WE KEEP IT FROM YOU', '#a0d8ff', '#0c1830'], ['NOVA-CHROME', 'SHINE RESPONSIBLY', '#e8e8f0', '#3a3a48'], ['KIBO TEA', 'STEEPED IN THE FUTURE', '#7ad87a', '#14280e'],
  ['ORBIT SOCKS', 'KEEP YOUR FEET IN ORBIT', '#ffd23f', '#3a1a5a'], ['THE AUTHORITY', 'DO NOT LOOK DIRECTLY AT THE FUTURE', '#ffffff', '#c8202a'], ['SOLENNE TOURISM', 'COME FOR THE SEA. STAY FOR THE SPEED.', '#ffe0b0', '#1a4a6a']
];
/** a sponsor board as a canvas: its mark, name and slogan in the pixel font */
SN.signCanvas = (k, w = 256, h = 64) => {
  const [name, slogan, fg, bg] = SN.SPONSORS[k % SN.SPONSORS.length], cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  // the mark: a geometric glyph per brand
  const mx = 8, my = 10, ms = h - 20; g.fillStyle = fg;
  const shape = k % 4; if (shape === 0) g.fillRect(mx, my, ms, ms); else if (shape === 1) { for (let y = 0; y < ms; y++) g.fillRect(mx + Math.abs(ms / 2 - y) * 0, my + y, Math.max(1, ms - Math.abs(ms / 2 - y) * 2), 1); }
  else if (shape === 2) { for (let y = 0; y < ms; y++) { const r = Math.sqrt(Math.max(0, (ms / 2) ** 2 - (y - ms / 2) ** 2)); g.fillRect(mx + ms / 2 - r, my + y, r * 2, 1); } } else { for (let y = 0; y < ms; y++) g.fillRect(mx + (ms - y) / 2, my + y, y, 1); }
  g.fillStyle = bg; g.fillRect(mx + ms / 2 - 3, my + ms / 2 - 3, 6, 6);
  E.font.text(g, name, mx + ms + 8, 10, fg, { scale: 2, outline: false });
  E.font.text(g, slogan, mx + ms + 8, 36, fg, { scale: slogan.length > 22 ? 1 : 2, outline: false });
  return cv;
};
SN.canvasTex = (cv, repeat = false) => { const THREE = E.THREE, t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; return t; };

/* ---- instanced scenery ---- */
/** an instanced mesh of one geometry: items [{ x, y, z (base, engine units), sx, sy, sz (engine units), yaw, color }] */
SN.instanced = (world, geo, mat, items, o = {}) => {
  const THREE = E.THREE; if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  items.forEach((it, i) => {
    p.set(it.x / U, (it.z + (o.center ? 0 : (it.sz || 16) / 2)) / U, it.y / U); q.setFromAxisAngle(up, -(it.yaw || 0)); s.set((it.sx || 16) / U, (it.sz || 16) / U, (it.sy || 16) / U);
    M4.compose(p, q, s); m.setMatrixAt(i, M4); c.set(it.color || '#ffffff'); m.setColorAt(i, c);
  });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = o.shadow !== false; m.receiveShadow = true; m.frustumCulled = false;
  world.scene.add(m); return m;
};

/** is (x, y) clear of the track (and its walls, with margin m metres)? */
SN.offTrack = (T, x, y, margin = 6) => { for (const i of T.bucketAt(x, y)) if (Math.hypot(x - T.Cx[i], y - T.Cy[i]) < T.hw[i] + margin * M) return false; if (!T.bucketAt(x, y).length) { /* far from the track */ } return true; };
/** the nearest distance from (x, y) to the centre line (coarse) */
SN.trackDist = (T, x, y) => { let d = 1e9; for (let i = 0; i < T.N; i += 8) d = Math.min(d, Math.hypot(x - T.Cx[i], y - T.Cy[i])); return d; };

/** build the theme's scenery into a world: returns { animate(t, dt) } for the moving parts */
SN.buildScenery = (world, T, themeId, terrain) => {
  const THREE = E.THREE, rnd = SN.rng('scenery:' + T.id), org = T.def.origin, ox = org[0] * M, oy = org[1] * M;
  const lam = world._own ? world._own(new THREE.MeshLambertNodeMaterial({ color: '#ffffff' })) : new THREE.MeshLambertNodeMaterial({ color: '#ffffff' });
  const glow = world._own(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }));
  const box = world._own(new THREE.BoxGeometry(1, 1, 1)), cyl = world._own(new THREE.CylinderGeometry(.5, .5, 1, 10)), cone = world._own(new THREE.ConeGeometry(.5, 1, 8)), sph = world._own(new THREE.SphereGeometry(.5, 10, 8));
  const H = (x, y) => terrain.height(x, y), W = (lx, ly) => [ox + lx * M, oy + ly * M];
  const anim = [], items = { box: [], glow: [], cyl: [], cone: [], sph: [], gcyl: [], gsph: [] };
  const put = (kind, x, y, z, sx, sy, sz, color, yaw = 0) => items[kind].push({ x, y, z, sx, sy, sz, color, yaw });
  const scatter = (n, fn, tries = 8) => { let k = 0; for (let a = 0; a < n * tries && k < n; a++) if (fn(rnd) !== false) k++; };
  const near = (x, y, minM, maxM) => { const d = SN.trackDist(T, x, y); return d > minM * M && d < maxM * M; };
  const signs = [];
  if (themeId === 'coast') {
    // the promenade's palm pylons and boards along the main straight (s 0..600 m), crowd stands at the start
    for (let s = -200 * M; s < 560 * M; s += 14 * M) {
      for (const side of [-1, 1]) {
        const fr = T.frameAt(s), hw = fr.hw, x = fr.C[0] + fr.R[0] * side * (hw + 6 * M), y = fr.C[1] + fr.R[1] * side * (hw + 6 * M), z = H(x, y);
        if (side > 0) { put('cyl', x, y, z, 10, 10, 9 * M, '#8a6a4a'); for (let k = 0; k < 5; k++) { const a = k * 1.256 + s; put('box', x + Math.cos(a) * 28, y + Math.sin(a) * 28, z + 9 * M - 8, 64, 10, 6, '#3a8a3a', a); } }
      }
    }
    // crowd stands at the start line
    for (const side of [-1, 1]) for (let k = 0; k < 6; k++) { const s = (-60 + k * 22) * M, fr = T.frameAt(s), d = fr.hw + (side > 0 ? 18 : 14) * M, x = fr.C[0] + fr.R[0] * side * d, y = fr.C[1] + fr.R[1] * side * d, z = Math.max(H(x, y), fr.C[2] - 3 * M), yaw = Math.atan2(fr.F[1], fr.F[0]);
      for (let r = 0; r < 5; r++) { put('box', x + fr.R[0] * side * r * 40, y + fr.R[1] * side * r * 40, z, 22 * M, 36, 32 + r * 40, r % 2 ? '#5a6a8a' : '#4a5a7a', yaw); for (let c = 0; c < 18; c++) put('box', x + fr.R[0] * side * r * 40 + fr.F[0] * (c - 9) * 18, y + fr.R[1] * side * r * 40 + fr.F[1] * (c - 9) * 18, z + 32 + r * 40, 8, 8, 14, ['#ff4a4a', '#ffd23f', '#4a9aff', '#ffffff', '#ff7ad8'][(c + r) % 5], yaw); } }
    // the old town: white, ochre and pink houses with terracotta roofs on the hill
    scatter(320, r => { const lx = 120 + r() * 640, ly = -540 - r() * 360, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 10) || !near(x, y, 24, 420)) return false; const z = H(x, y), w = (6 + r() * 8) * M, d = (6 + r() * 7) * M, h = (5 + r() * 9) * M, yaw = Math.floor(r() * 4) * Math.PI / 2 + (r() - .5) * .3;
      put('box', x, y, z - 2 * M, w, d, h + 2 * M, ['#f4ecdc', '#e8c890', '#f0c0b8', '#f8f0e8', '#e0b878'][Math.floor(r() * 5)], yaw); put('box', x, y, z + h, w * 1.06, d * 1.06, 3 * M, ['#b8502a', '#c86a3a', '#a84a2a'][Math.floor(r() * 3)], yaw); });
    // cliff villas with pools, harbour cranes, marina boats, the lighthouse, the Ferris wheel, beach umbrellas
    scatter(40, r => { const lx = 600 + r() * 400, ly = -100 - r() * 400, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 14) || !near(x, y, 30, 260)) return false; const z = H(x, y); put('box', x, y, z, 20 * M, 14 * M, 7 * M, '#fafaf4', r() * 6); put('glow', x + 12 * M, y, z + 1, 10 * M, 7 * M, 6, '#4ad8ff'); });
    for (let k = 0; k < 5; k++) { const [x, y] = W(-480 + k * 70, 420 + (k % 2) * 40), z = -2 * M; put('box', x, y, z, 2 * M, 2 * M, 40 * M, '#ffb000'); put('box', x + 14 * M, y, z + 38 * M, 30 * M, 2 * M, 2 * M, '#ffb000'); put('box', x - 6 * M, y, z + 36 * M, 6 * M, 4 * M, 4 * M, '#2a2a30'); }
    scatter(40, r => { const lx = -420 + r() * 380, ly = 380 + r() * 260, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 10)) return false; const yaw = r() * Math.PI; put('box', x, y, -1 * M, 10 * M, 3.4 * M, 2 * M, '#f4f4f8', yaw); put('cyl', x, y, 1 * M, 6, 6, 12 * M, '#c8c8d0'); });
    { const [x, y] = W(-200, 470), z = -2 * M; for (let k = 0; k < 8; k++) put('cyl', x, y, z + k * 6 * M, 7 * M, 7 * M, 6 * M, k % 2 ? '#ffffff' : '#d82020'); put('gcyl', x, y, z + 48 * M, 6 * M, 6 * M, 5 * M, '#fff2c0'); signs.lighthouse = { x, y, z: z + 50 * M }; }
    { const [x, y] = W(-560, 300), z = H(x, y); signs.wheel = { x, y, z: z + 60 * M, r: 50 * M }; }
    scatter(70, r => { const lx = -340 + r() * 1300, ly = 130 + r() * 90, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 8)) return false; const z = H(x, y); put('cyl', x, y, z, 2, 2, 2.2 * M, '#e8e8e8'); put('cone', x, y, z + 2.2 * M, 3 * M, 3 * M, .8 * M, ['#ff4a4a', '#ffd23f', '#4a9aff', '#ffffff'][Math.floor(r() * 4)]); });
  }
  if (themeId === 'desert') {
    // the Spire: a stacked rock column inside the spiral
    { const [x, y] = W(762, 72), z = H(x, y); const cols = SN.THEMES.desert.rock.colors; for (let k = 0; k < 11; k++) put('cyl', x, y, z + k * 20 * M, (40 - k * 2.6) * M, (40 - k * 2.6) * M, 20 * M, cols[k % 4]); }
    // wind turbines with turning rotors, solar fields, a buried old craft at the gorge, canyon banners
    const rotors = [];
    scatter(24, r => { const lx = -200 + r() * 1400, ly = -1000 + r() * 1500, [x, y] = W(lx, ly); if (!near(x, y, 60, 700)) return false; const z = H(x, y); put('cyl', x, y, z, 1.4 * M, 1.4 * M, 46 * M, '#f0f0f0'); put('box', x, y, z + 46 * M, 4 * M, 3 * M, 3 * M, '#e0e0e0'); rotors.push({ x, y, z: z + 47.5 * M, a: r() * 7, yaw: r() * 6 }); });
    signs.rotors = rotors;
    scatter(16, r => { const lx = 100 + r() * 1000, ly = 420 + r() * 300, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 14) || !near(x, y, 30, 400)) return false; const z = H(x, y); for (let k = 0; k < 6; k++) put('box', x + k * 7 * M, y, z + 1 * M, 6 * M, 4 * M, .4 * M, '#1a2a5a', 0); });
    { const J = T.jumps[0], fr = T.frameAt(J.s0 + 28 * M), x = fr.C[0] + fr.R[0] * 30 * M, y = fr.C[1] + fr.R[1] * 30 * M, z = H(x, y); put('box', x, y, z - 4 * M, 30 * M, 9 * M, 6 * M, '#5a5a62', 0.6); put('box', x + 8 * M, y + 4 * M, z, 14 * M, 4 * M, 4 * M, '#8a3a2a', 0.6); }
    for (let s = 0; s < T.L; s += 260 * M) { const fr = T.frameAt(s), d = fr.hw + 12 * M, x = fr.C[0] + fr.R[0] * d, y = fr.C[1] + fr.R[1] * d, z = H(x, y); if (z < fr.C[2] - 6 * M) continue; put('box', x, y, z, .6 * M, 8 * M, 14 * M, ['#ffb347', '#d8361c', '#1a1a20'][Math.floor(s) % 3], Math.atan2(fr.F[1], fr.F[0])); }
    scatter(90, r => { const lx = -300 + r() * 1600, ly = -1100 + r() * 1700, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 10)) return false; const z = H(x, y); put('cone', x, y, z, (3 + r() * 5) * M, (3 + r() * 5) * M, (2 + r() * 4) * M, ['#b8703a', '#9a5a30'][Math.floor(r() * 2)], r() * 6); });
  }
  if (themeId === 'city') {
    // megatowers with window-grid emissive bands, the Meridian Spire, rooftop helipads
    const pal = [['#141a2e', '#ff3ab4'], ['#1a1424', '#7af0ff'], ['#101418', '#ffd36a']];
    scatter(280, r => { const lx = -1300 + r() * 2400, ly = -1200 + r() * 1900, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 16)) return false; const z = -40 * M, w = (20 + r() * 40) * M, d = (20 + r() * 40) * M, h = (60 + r() * r() * 300) * M, P = pal[Math.floor(r() * 3)], yaw = (r() - .5) * .4;
      put('box', x, y, z, w, d, h, P[0], yaw);
      for (let k = 1; k < h / (14 * M); k += 1 + Math.floor(r() * 3)) put('glow', x, y, z + k * 14 * M, w * 1.01, d * 1.01, .9 * M, r() < .7 ? P[1] : '#ffffff', yaw);
      if (r() < .3) put('gcyl', x, y, z + h, 6, 6, 4 * M, '#ff2020'); });
    { const [x, y] = W(-120, -60), z = -40 * M; put('box', x, y, z, 40 * M, 40 * M, 500 * M, '#181c2a'); for (let k = 0; k < 30; k++) put('glow', x, y, z + k * 17 * M, 40.5 * M, 40.5 * M, 1.2 * M, k % 3 ? '#7af0ff' : '#ff3ab4'); put('gsph', x, y, z + 506 * M, 10 * M, 10 * M, 10 * M, '#ffffff'); signs.beacon = { x, y, z: z + 506 * M }; }
    // maglev rails on loops with trains, flying traffic lanes
    const trains = [], traffic = [];
    for (let k = 0; k < 3; k++) { const r0 = (600 + k * 260) * M, [cx, cy] = W(-100, -300), z = (k * 30 - 10) * M; trains.push({ cx, cy, r: r0, z, a: k * 2, w: .05 + k * .02 }); for (let a = 0; a < Math.PI * 2; a += .05) { const x = cx + Math.cos(a) * r0, y = cy + Math.sin(a) * r0; if (SN.offTrack(T, x, y, 8)) put('glow', x, y, z, 2 * M, 2 * M, .6 * M, '#ff3ab4', a); } }
    for (let k = 0; k < 40; k++) traffic.push({ lane: k % 4, a: rnd() * Math.PI * 2, r: (500 + (k % 4) * 200) * M, z: (80 + (k % 4) * 40) * M, w: .08 + rnd() * .06, c: ['#ff3ab4', '#7af0ff', '#ffd36a', '#ffffff'][k % 4] });
    signs.trains = trains; signs.traffic = traffic;
  }
  if (themeId === 'arctic') {
    // the research station: domes, a turning radar dish, masts with red lights; ice spikes; a frozen-in icebreaker
    { const fr = T.frameAt(-30 * M), base = fr.hw + 40 * M; for (let k = 0; k < 6; k++) { const x = fr.C[0] - fr.R[0] * (base + k * 22 * M) + fr.F[0] * (k % 2) * 30 * M, y = fr.C[1] - fr.R[1] * (base + k * 22 * M) + fr.F[1] * (k % 2) * 30 * M, z = H(x, y); put('sph', x, y, z - 4 * M, 18 * M, 18 * M, 14 * M, '#e8eef4'); put('gcyl', x, y, z + 7 * M, 2 * M, 2 * M, .6 * M, '#7af0ff'); }
      const x = fr.C[0] - fr.R[0] * (base + 4 * M) - fr.F[0] * 60 * M, y = fr.C[1] - fr.R[1] * (base + 4 * M) - fr.F[1] * 60 * M, z = H(x, y); put('cyl', x, y, z, 2 * M, 2 * M, 18 * M, '#b0b8c0'); signs.radar = { x, y, z: z + 18 * M, a: 0 };
      for (let k = 0; k < 4; k++) { const mx = x + fr.F[0] * (k * 50 - 60) * M, my = y + fr.F[1] * (k * 50 - 60) * M, mz = H(mx, my); put('cyl', mx, my, mz, .8 * M, .8 * M, 40 * M, '#c8c8d0'); put('gsph', mx, my, mz + 40 * M, 1.6 * M, 1.6 * M, 1.6 * M, '#ff2020'); } }
    scatter(160, r => { const lx = -1000 + r() * 2100, ly = -100 + r() * 1300, [x, y] = W(lx, ly); if (!SN.offTrack(T, x, y, 12)) return false; const z = H(x, y); put('cone', x, y, z - 2 * M, (2 + r() * 4) * M, (2 + r() * 4) * M, (8 + r() * 22) * M, ['#bfe8ff', '#9ad0f0', '#e0f4ff'][Math.floor(r() * 3)], r() * 6); });
    { const [x, y] = W(560, 1090), z = 6 * M; put('box', x, y, z - 4 * M, 80 * M, 18 * M, 12 * M, '#c82a2a', .4); put('box', x - 10 * M, y, z + 8 * M, 26 * M, 14 * M, 12 * M, '#f0f0f0', .4); put('cyl', x - 16 * M, y - 4 * M, z + 20 * M, 4 * M, 4 * M, 10 * M, '#202020'); }
    // the aurora: tall translucent ribbons high in the sky (animated)
    signs.aurora = true;
  }
  // sponsor gantries over the track every ~350 m, boards beside it
  const signMats = [];
  for (let k = 0; k < 12; k++) signMats.push(world._own(new THREE.MeshBasicNodeMaterial({ map: world._own(SN.canvasTex(SN.signCanvas(k))), side: THREE.DoubleSide, fog: themeId !== 'overclock' })));
  const plane = world._own(new THREE.PlaneGeometry(1, 1));
  const boards = [];
  for (let s = 180 * M, k = 0; s < T.L - 100 * M; s += 350 * M, k++) {
    const i = T.idx(s); if (T.flags[i] & (SN.TFLAG.GAP | SN.TFLAG.DROP | SN.TFLAG.TUNNEL)) continue;
    const fr = T.frameAt(s), hw = fr.hw + 2 * M, top = 9 * M;
    for (const side of [-1, 1]) put('box', fr.C[0] + fr.R[0] * side * hw, fr.C[1] + fr.R[1] * side * hw, fr.C[2] - 1 * M, 1.2 * M, 1.2 * M, top + 3 * M, '#3a3e4a');
    put('box', fr.C[0], fr.C[1], fr.C[2] + top, 1.4 * M, hw * 2 + 2 * M, 1.2 * M, '#3a3e4a', Math.atan2(fr.F[1], fr.F[0]) + Math.PI / 2 - Math.PI / 2);
    boards.push({ fr, w: hw * 1.6, h: hw * .4, z: fr.C[2] + top - hw * .2 - 4, k });
  }
  for (const b of boards) {
    const m = new THREE.Mesh(plane, signMats[b.k % 12]), fr = b.fr;
    m.position.set((fr.C[0] - fr.F[0] * 12) / U, b.z / U, (fr.C[1] - fr.F[1] * 12) / U);
    m.lookAt((fr.C[0] - fr.F[0] * 400) / U, b.z / U, (fr.C[1] - fr.F[1] * 400) / U);
    m.scale.set(b.w / U, b.h / U, 1); world.scene.add(m);
  }
  // the instanced batches
  const out = { animate: [] };
  SN.instanced(world, box, lam, items.box, {}); SN.instanced(world, cyl, lam, items.cyl, {}); SN.instanced(world, cone, lam, items.cone, {}); SN.instanced(world, sph, lam, items.sph, {});
  SN.instanced(world, box, glow, items.glow, { shadow: false }); SN.instanced(world, cyl, glow, items.gcyl, { shadow: false });
  SN.instanced(world, sph, glow, items.gsph, { shadow: false });
  // animated set pieces: the Ferris wheel, the lighthouse beam, rotors, trains and traffic, the radar, the aurora
  const pen = world.pen;
  if (signs.wheel) { const W0 = signs.wheel; out.animate.push(t => { for (let k = 0; k < 16; k++) { const a = t * .12 + k * Math.PI / 8, x = W0.x + Math.cos(a) * W0.r, z = W0.z + Math.sin(a) * W0.r; world.glow(x, W0.y, z, 14, ['#ff4a6a', '#ffd23f', '#7af0ff', '#ffffff'][k % 4]); } }); }
  if (signs.lighthouse) { const L0 = signs.lighthouse; out.animate.push(t => { const a = t * 1.4; for (let k = 1; k < 9; k++) world.glow(L0.x + Math.cos(a) * k * 60, L0.y + Math.sin(a) * k * 60, L0.z, 10 + k * 3, '#fff2a0'); }); }
  if (signs.rotors) out.animate.push(t => { pen.at(); for (const r of signs.rotors) { const a = r.a + t * 2.2; for (let b = 0; b < 3; b++) { const ang = a + b * 2.094; pen.slab(r.x, r.y, r.z, r.x - Math.sin(r.yaw) * Math.cos(ang) * 300, r.y + Math.cos(r.yaw) * Math.cos(ang) * 300, r.z + Math.sin(ang) * 300, Math.cos(r.yaw), Math.sin(r.yaw), 0, 18, 4, '#f4f4f4'); } } });
  if (signs.trains) out.animate.push(t => { for (const tr of signs.trains) { const a = tr.a + t * tr.w; for (let c = 0; c < 6; c++) { const b = a - c * .012; world.glow(tr.cx + Math.cos(b) * tr.r, tr.cy + Math.sin(b) * tr.r, tr.z + 24, 16, c ? '#ffd36a' : '#ffffff'); } } for (const f of signs.traffic) { const a = f.a + t * f.w; world.glow(SN._cityC[0] + Math.cos(a) * f.r, SN._cityC[1] + Math.sin(a) * f.r * .7, f.z, 10, f.c); } });
  if (themeId === 'city') SN._cityC = [ox - 100 * M, oy - 300 * M];
  if (signs.beacon) out.animate.push(t => { if (Math.sin(t * 3) > 0) world.glow(signs.beacon.x, signs.beacon.y, signs.beacon.z + 20, 60, '#ff3030', { light: false }); });
  if (signs.radar) out.animate.push(t => { const R0 = signs.radar, a = t * .8; pen.at(R0.x, R0.y, R0.z, a); pen.box(-6, -30, 0, 12, 60, 40, '#e0e4ea'); pen.at(); });
  if (signs.aurora) {
    const mat = world._own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    const ribbons = [];
    for (let k = 0; k < 5; k++) {
      const n = 60, pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 3), idx = [];
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length), 3)); g.setIndex(idx);
      const m = new THREE.Mesh(world._own(g), mat); m.frustumCulled = false; world.scene.add(m); ribbons.push({ m, pos, col, n, k });
    }
    out.animate.push(t => { for (const R0 of ribbons) { const { pos, col, n, k } = R0, cx = ox + (k - 2) * 900 * M, cy = oy - 1400 * M - k * 200 * M, len = 2600 * M;
      for (let i = 0; i < n; i++) { const f = i / (n - 1), x = cx + (f - .5) * len, y = cy + Math.sin(f * 6 + t * .3 + k) * 300 * M, z0 = 900 * M, z1 = z0 + (260 + Math.sin(f * 9 + t * .7 + k * 2) * 90) * M, c = [.1 + .2 * Math.sin(f * 5 + k), .9, .5 + .3 * Math.sin(f * 3 + t * .2)];
        pos.set([x / U, z0 / U, y / U, x / U, z1 / U, y / U], i * 6); col.set([c[0] * .5, c[1] * .5, c[2] * .5, 0, .05, .1], i * 6); }
      R0.m.geometry.attributes.position.needsUpdate = R0.m.geometry.attributes.color.needsUpdate = true; } });
  }
  // the sea (coast): a plane at 0 m with gradient bands and a sun-glint strip
  if (themeId === 'coast') {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d');
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = E.hash2(x, y), v = (Math.sin((y + Math.sin(x * .3) * 2) * .6) + 1) / 2; g.fillStyle = n > .97 ? '#ffe0b0' : v > .7 ? '#3a7a9a' : '#2a5a7a'; g.fillRect(x, y, 1, 1); }
    const tex = world._own(SN.canvasTex(cv, true)); tex.repeat.set(160, 160);
    const sea = new THREE.Mesh(world._own(new THREE.PlaneGeometry(8192, 8192)), world._own(new THREE.MeshLambertNodeMaterial({ map: tex })));
    sea.rotation.x = -Math.PI / 2; sea.position.set(org[0], 0, org[1] - 100 + 4096); sea.receiveShadow = true; world.scene.add(sea);
    out.animate.push(t => { tex.offset.set(t * .002, t * .004); });
  }
  return out;
};
})();
