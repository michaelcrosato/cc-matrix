// The operating field: a displaced plane with a painted 480x270 tissue canvas, drapes, and meshes for
// everything lying on it. Reads a plain state object, from a local sim or the network.
import { buildModel, createNoise, PALETTE, setLookLayer, THREE, toonMaterial, SpringChain, Squash, hologramMaterial } from '../../pixel-engine.js';
import { ARENAS, heightAt } from '../content/arenas.js';
import { CATALOG, CROWN_EYE, HALO_EYE, PROP_DEFS, WEEP_EYE } from '../content/models/index.js';

const { DataTexture, Group, Mesh, PlaneGeometry, RGBAFormat, NearestFilter, BoxGeometry, SphereGeometry, CylinderGeometry, RingGeometry, MeshBasicMaterial, DoubleSide, Vector3 } = THREE;

const W = 480, H = 270;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const PX = (x) => Math.round((x / 16 + 0.5) * W), PY = (z) => Math.round((z / 9 + 0.5) * H);
export const TABLE_GAP = 24;

const LOOK_MODEL = {
  hook: 'hook', key: 'key', coin: 'coin', card: 'card', magnet: 'magnet', debris: 'debris', tumor: 'tumor', clamp: 'clamp', oldKidney: 'oldKidney', newKidney: 'newKidney', frag0: 'frag0', frag1: 'frag1', frag2: 'frag2',
  polyp: 'polyp', shard: 'shard', nodule: 'nodule', egg: 'egg', cyst: 'cyst', clot: 'clot', plate: 'plate', tendril: 'tendril', stalk: 'stalk', introit: 'coreIntroit', miserere: 'coreMiserere', pale: 'corePale',
};

function basePaint(arena, tableIndex, seed) {
  const a = ARENAS[arena] ?? ARENAS.forearm;
  const ramp = (a.tints?.[tableIndex] ?? a.ramp).map(rgb), cav = rgb(a.cavity);
  const buf = new Uint8Array(W * H * 4), noise = createNoise(seed), fbm = (x, z) => noise.fbm2(x, z) * 0.5 + 0.5;
  const put = (px, py, c) => { if (px < 0 || py < 0 || px >= W || py >= H) return; const i = (py * W + px) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const x = (px / W - 0.5) * 16, z = (py / H - 0.5) * 9, m = a.shape(x, z);
    if (m <= 0.02) {
      const b = fbm(x * 1.6, z * 1.6) > 0.62 ? ramp[0] : cav;
      put(px, py, b);
      continue;
    }
    const tilt = (-x * 0.012 - z * 0.03);
    const light = 0.14 + 0.46 * m + (fbm(x * 0.9, z * 0.9) - 0.5) * 1.5 + (fbm(x * 2.6 + 3, z * 2.6) - 0.5) * 0.45 + tilt + a.height(x, z) * 0.1;
    let idx = Math.floor(Math.max(0, Math.min(0.999, light)) * 5 + (BAYER[(px & 3) + (py & 3) * 4] / 16) * 0.9 - 0.2);
    idx = Math.max(0, Math.min(4, idx));
    put(px, py, ramp[idx]);
  }
  const rng = ((s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; })(seed * 31 + 7);
  const inside = (x, z) => a.shape(x, z) > 0.1;
  // fat
  if (a.fat || a.fat2) {
    const fat = rgb(a.fat ? 0xf8e7a2 : 0xe9c46a);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const x = (px / W - 0.5) * 16, z = (py / H - 0.5) * 9;
      const nearEdge = a.fat2 ? a.shape(x, z) < 0.75 : true;
      if (inside(x, z) && nearEdge && fbm(x * 1.6 + 9, z * 2.4) > (a.fat ? 0.6 : 0.66)) put(px, py, fat);
    }
  }
  // vessels
  const walk = (x, z, heading, n, col, w) => {
    for (let i = 0; i < n; i++) {
      heading += (noise.fbm2(x * 3 + 5, z * 3) * 0.55);
      x += Math.cos(heading) * 0.09; z += Math.sin(heading) * 0.09;
      if (!inside(x, z)) return;
      const px = PX(x), py = PY(z);
      for (let k = 0; k < w; k++) for (let j = 0; j < w; j++) put(px + k, py + j, col);
      if (rng() < 0.045 && w > 1) walk(x, z, heading + (rng() < 0.5 ? 0.9 : -0.9), n * 0.5, col, 1);
    }
  };
  if (a.vessels) {
    for (let i = 0; i < 4; i++) walk(-5 + i * 3, -3.4, 1.2 + rng(), 80, rgb(0xf08a5d), 2);
    for (let i = 0; i < 4; i++) walk(-4.5 + i * 3, 2.4, -1.4 + rng(), 70, rgb(0x2e1a52), 2);
  }
  if (a.rugae) for (let i = 0; i < 12; i++) { let x = -6 + i, z = -3 + rng() * 0.5; const c = rgb(a.ramp[0]); for (let n = 0; n < 110; n++) { z += 0.06; x += Math.sin(z * 2.4 + i) * 0.05; if (inside(x, z)) put(PX(x), PY(z), c); } }
  if (a.hair) { const c = rgb(0x4a2c1c); for (let i = 0; i < 240; i++) { const x = (rng() - 0.5) * 15, z = (rng() - 0.5) * 8; if (inside(x, z)) { const px = PX(x), py = PY(z); put(px, py, c); put(px + 1, py + 1, c); } } }
  if (a.alveoli) { const c = rgb(a.ramp[1]); for (let py = 3; py < H; py += 7) for (let px = 3 + (py % 2) * 3; px < W; px += 7) { const x = (px / W - 0.5) * 16, z = (py / H - 0.5) * 9; if (inside(x, z) && rng() < 0.75) { put(px, py, c); put(px + 1, py, c); } } }
  if (a.bone) {
    const bone = rgb(0xece5d2), shade = rgb(0xbdb39c), line = rgb(0x8a7f6c);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const x = (px / W - 0.5) * 16, z = (py / H - 0.5) * 9;
      const w = 0.5 + 0.28 * Math.abs(Math.sin(x * 0.35)) ** 3 + (Math.abs(x) > 4.4 ? (Math.abs(x) - 4.4) * 0.3 : 0);
      const d = Math.abs(z + 0.3);
      if (Math.abs(x) < 5.4 && d < w) { const edge = w - d < 0.07; const sh = z > -0.3 + w * 0.45; put(px, py, edge ? line : sh ? shade : bone); }
    }
  }
  if (a.ribs) {
    const rib = rgb(0xe8dfc8), rib2 = rgb(0xb6aa90);
    for (let i = -3; i <= 3; i++) for (let px = 0; px < W; px++) {
      const x = (px / W - 0.5) * 16; if (Math.abs(x) > 7) continue;
      const z = -0.3 + i * 1.1 + (x * x) * 0.03; const py = PY(z);
      if (a.shape(x, z) > 0.2 && Math.abs(x) > 1.1) for (let j = 0; j < 5; j++) put(px, py + j, j === 4 ? rib2 : rib);
    }
  }
  if (a.spine) {
    const v = rgb(0xf6f0dc), v2 = rgb(0xc9c0a8), line = rgb(0x8f8a84);
    for (let k = -4; k <= 3; k++) {
      const cz = k * 0.95 + 0.2;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const x = (px / W - 0.5) * 16, z = (py / H - 0.5) * 9, d = Math.hypot(x / 0.95, (z - cz) / 0.36);
        if (d < 1) put(px, py, d > 0.86 ? line : z - cz > 0.14 ? v2 : v);
      }
    }
  }
  if (a.sheen || a.vessels || a.alveoli || a.rugae) {
    const c = rgb(a.sheen ?? 0xf6d0c0);
    for (let i = 0; i < 380; i++) { const x = (rng() - 0.6) * 12, z = (rng() - 0.7) * 6.5; if (a.shape(x, z) > 0.35) put(PX(x), PY(z), c); }
  }
  return buf;
}

function disc(buf, cx, cy, r, c, a = 255) {
  const r2 = r * r, x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy > r2) continue;
    const i = (y * W + x) * 4;
    if (a >= 255) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; } else { const k = a / 255; buf[i] += (c[0] - buf[i]) * k; buf[i + 1] += (c[1] - buf[i + 1]) * k; buf[i + 2] += (c[2] - buf[i + 2]) * k; }
  }
}
function plot(buf, x, y, c, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = ((y | 0) * W + (x | 0)) * 4;
  if (a >= 255) { buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; } else { const k = a / 255; buf[i] += (c[0] - buf[i]) * k; buf[i + 1] += (c[1] - buf[i + 1]) * k; buf[i + 2] += (c[2] - buf[i + 2]) * k; }
}
function line(buf, ax, ay, bx, by, c, w = 1, dash = 0, phase = 0) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let i = 0; i <= n; i++) {
    if (dash && ((i + phase) % (dash * 2)) >= dash) continue;
    const x = Math.round(ax + ((bx - ax) * i) / n), y = Math.round(ay + ((by - ay) * i) / n);
    for (let k = 0; k < w; k++) for (let j = 0; j < w; j++) plot(buf, x + k, y + j, c);
  }
}
function polyDraw(buf, pts, c, w, dash, phase, from = 0, to = Infinity) {
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1], l = Math.hypot(bx - ax, bz - az);
    const s0 = Math.max(from, walked), s1 = Math.min(to, walked + l);
    if (s1 > s0 && l > 0) {
      const t0 = (s0 - walked) / l, t1 = (s1 - walked) / l;
      line(buf, PX(ax + (bx - ax) * t0), PY(az + (bz - az) * t0), PX(ax + (bx - ax) * t1), PY(az + (bz - az) * t1), c, w, dash, phase);
    }
    walked += l;
  }
}

const C = {
  blood: rgb(0x8c0f1e), blood2: rgb(0xb5202a), bloodHi: rgb(0xff5a5a), cut: rgb(0x4a0612), cutEdge: rgb(0xd65c5c), guide: rgb(0xffffff), guideOn: rgb(0xfff27a), stitch: rgb(0x20262e), stitchHi: rgb(0xe8f4ff), bruise: rgb(0x5b3a76), burn: rgb(0x241410), burnEdge: rgb(0x5a3020), gel: rgb(0x7ff0d8), gel2: rgb(0xc8fff0), maskDot: rgb(0x46e0c0), film: rgb(0x8ff5e0), slot: rgb(0xffe07a), arrow: rgb(0x9cf0ff), arrowDim: rgb(0x3aa0c0), dressing: rgb(0xf4f0e0), dressing2: rgb(0xbdb6a0), goal: rgb(0x6bf0ff), nick: rgb(0xa01824), port: rgb(0x8ad0ff), portHi: rgb(0xffffff), tear: rgb(0x7fd8ff), tearHi: rgb(0xe8fbff), blotch: rgb(0x2a0a22), hide: rgb(0x64e0ff),
};

export class FieldView {
  constructor(ctx, arena, tableCount = 1, seedBase = 5) {
    this.ctx = ctx; this.arena = arena; this.tableCount = tableCount;
    this.root = new Group();
    ctx.scene.add(this.root);
    this.tables = [];
    this.meshes = new Map();
    this.placed = [];
    this.t = 0; this.beat = 0; this.breath = 0;
    this.scanFx = [];
    this.pulse = 0;
    this.seats = [];
    for (let i = 0; i < tableCount; i++) this.buildTable(i, seedBase + i * 11);
    this.holo = new Mesh(new CylinderGeometry(2.2, 2.2, 0.05, 28), hologramMaterial({ color: PALETTE.cyan }));
    this.holo.visible = false;
    this.root.add(this.holo);
    this.holoHidden = new Map();
    this.ghostGeo = new SphereGeometry(0.3, 8, 6);
  }

  buildTable(i, seed) {
    const base = basePaint(this.arena, i, seed);
    const buf = new Uint8Array(base.length);
    const tex = new DataTexture(buf, W, H, RGBAFormat);
    tex.magFilter = tex.minFilter = NearestFilter;
    tex.needsUpdate = true;
    const geo = new PlaneGeometry(16, 9, 192, 108).rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k));
    const mesh = new Mesh(geo, toonMaterial(PALETTE.white, { map: tex }));
    mesh.receiveShadow = true;
    const g = new Group();
    g.position.x = i * TABLE_GAP;
    g.add(mesh);
    const a = ARENAS[this.arena] ?? ARENAS.forearm;
    const drapeC = toonMaterial(PALETTE[a.drape] ?? PALETTE.teal), drapeD = toonMaterial(PALETTE.night), clamp = toonMaterial(PALETTE.mist);
    // raised drapes frame the window; steel clamps hold them.
    for (const [x, z, w, d] of [[0, -5.3, 18, 2.2], [0, 5.2, 18, 2.2], [-8.9, 0, 2.2, 11.4], [8.9, 0, 2.2, 11.4]]) {
      const b = new Mesh(new BoxGeometry(w, 0.8, d), drapeC);
      b.position.set(x, 0.3, z); b.castShadow = true; b.receiveShadow = true; g.add(b);
      const fold = new Mesh(new BoxGeometry(w * (w > d ? 1 : 0.1), 0.05, d * (d > w ? 1 : 0.1)), drapeD);
      fold.position.set(x, 0.72, z); g.add(fold);
    }
    for (const [x, z] of [[-7.6, -4.3], [7.6, -4.3], [-7.6, 4.2], [7.6, 4.2], [0, -4.4]]) {
      const b = new Mesh(new BoxGeometry(0.5, 0.3, 0.9), clamp);
      b.position.set(x, 0.75, z); b.castShadow = true; setLookLayer(b, 'actors'); g.add(b);
    }
    // the steel dish, top left
    const dish = new Mesh(new CylinderGeometry(1, 0.8, 0.26, 12), toonMaterial(PALETTE.mist));
    dish.position.set(6.6, 0.95, -4.3); dish.castShadow = true; setLookLayer(dish, 'actors'); g.add(dish);
    const dishIn = new Mesh(new CylinderGeometry(0.82, 0.7, 0.05, 12), toonMaterial(PALETTE.slate));
    dishIn.position.set(6.6, 1.08, -4.3); g.add(dishIn);
    this.dish = new Vector3(6.6 + i * TABLE_GAP, 1.1, -4.3);
    this.root.add(g);
    const tbl = { i, base, buf, tex, mesh, geo, group: g, h: new Float32Array(geo.attributes.position.count), lastBeat: -1, baseY: new Float32Array(geo.attributes.position.count) };
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) { const y = heightAt(this.arena, pos.getX(k), pos.getZ(k)); pos.setY(k, y); tbl.baseY[k] = y; }
    geo.computeVertexNormals();
    this.tables.push(tbl);
  }

  /** The height the tool sits at. */
  surface(x, z) { return heightAt(this.arena, x, z, this.beat, this.breath); }

  displace(tbl, state) {
    const a = ARENAS[this.arena];
    const animate = a?.beats || a?.breathes;
    const strain = state.ents.find((e) => e.k === 'strain' && e.table === tbl.i && e.type === 'introit' && e.x != null);
    const bulging = !!strain && strain.mode !== 'gone';
    if (!animate && !bulging && !tbl.wasBulging) return;
    tbl.wasBulging = bulging;
    const pos = tbl.geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k);
      let y = animate ? heightAt(this.arena, x, z, this.beat, this.breath) : tbl.baseY[k];
      if (bulging) { const d = ((x - strain.x) ** 2 + (z - strain.z) ** 2) / 0.8; if (d < 8) y += 0.75 * Math.exp(-d) * (strain.mode === 'knock' ? 1.3 : 1); }
      pos.setY(k, y);
    }
    pos.needsUpdate = true;
    tbl.geo.computeVertexNormals();
  }

  paint(tbl, state) {
    const buf = tbl.buf, t = this.t, table = tbl.i;
    buf.set(tbl.base);
    const sparkle = Math.floor(t * 8);
    // Port ring: where the syringe goes.
    const [px, pz] = state.port;
    const pr = 1.1 * 30, syr = state.seats.some((s) => s.tool === 'syringe' && s.table === table);
    if (state.tools.includes('syringe')) {
      const col = syr ? C.portHi : C.port;
      for (let i = 0; i < 40; i++) { if ((i + sparkle) % 4 === 0 && !syr) continue; const a = (i / 40) * Math.PI * 2; plot(buf, PX(px) + Math.cos(a) * pr * 0.5, PY(pz) + Math.sin(a) * pr * 0.5, col); }
      disc(buf, PX(px), PY(pz), 3, col, syr ? 255 : 170);
    }
    // Old damage.
    for (const s of state.scars) {
      if (s.table !== table) continue;
      switch (s.k) {
        case 'bruise': disc(buf, PX(s.x), PY(s.z), 6, C.bruise, 150); break;
        case 'burn': disc(buf, PX(s.x), PY(s.z), 7, C.burnEdge, 220); disc(buf, PX(s.x), PY(s.z), 4, C.burn); break;
        case 'cut': polyDraw(buf, s.pts, C.cutEdge, 3, 0, 0); polyDraw(buf, s.pts, C.cut, 2, 0, 0); break;
        case 'sutured': { const n = s.n; line(buf, PX(s.a[0]), PY(s.a[1]), PX(s.b[0]), PY(s.b[1]), C.cut, 1); for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, x = s.a[0] + (s.b[0] - s.a[0]) * f, z = s.a[1] + (s.b[1] - s.a[1]) * f, L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) || 1, nx = -(s.b[1] - s.a[1]) / L, nz = (s.b[0] - s.a[0]) / L; line(buf, PX(x - nx * 0.18), PY(z - nz * 0.18), PX(x + nx * 0.18), PY(z + nz * 0.18), C.stitch, 1); } break; }
        case 'gel': for (let i = 0; i < s.dots.length; i += 2) if (i % 4 === 0) disc(buf, PX(s.dots[i]), PY(s.dots[i + 1]), 4, C.gel, 70); break;
        case 'dressing': polyDraw(buf, s.pts, C.dressing2, 8, 0, 0); polyDraw(buf, s.pts, C.dressing, 6, 0, 0); break;
        default: break;
      }
    }
    // Film.
    for (const f of state.films) if (f.table === table) disc(buf, PX(f.x), PY(f.z), 15 + Math.sin(t * 4 + f.x) * 1, C.film, 80 + f.t * 8);
    // Entities that are paint.
    for (const e of state.ents) {
      if (e.table !== table) continue;
      switch (e.k) {
        case 'pool': case 'bleeder': {
          const r = e.r * 30;
          disc(buf, PX(e.x), PY(e.z), r + 1.5, C.blood, 255);
          disc(buf, PX(e.x), PY(e.z), r * 0.72, C.blood2, 255);
          for (let i = 0; i < Math.max(3, r / 2); i++) { const a = i * 2.4 + sparkle * 0.7, q = ((i * 37 + sparkle * 13) % 100) / 100 * r * 0.8; plot(buf, PX(e.x) + Math.cos(a) * q, PY(e.z) + Math.sin(a) * q, C.bloodHi); }
          if (e.k === 'bleeder') disc(buf, PX(e.x), PY(e.z), 2 + (sparkle % 2), C.bloodHi);
          break;
        }
        case 'nick': { const x = PX(e.x), y = PY(e.z); line(buf, x - 5, y - 2, x + 5, y + 2, C.nick, 2); plot(buf, x + (sparkle % 3), y, C.bloodHi); break; }
        case 'laceration': {
          const ax = PX(e.a[0]), ay = PY(e.a[1]), bx = PX(e.b[0]), by = PY(e.b[1]);
          line(buf, ax, ay, bx, by, C.cutEdge, 4);
          line(buf, ax, ay, bx, by, C.cut, 3);
          const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) || 1, ux = (e.b[0] - e.a[0]) / L, uz = (e.b[1] - e.a[1]) / L;
          for (let i = 0; i < e.slots; i++) {
            const f = (i + 0.5) / e.slots, x = e.a[0] + (e.b[0] - e.a[0]) * f, z = e.a[1] + (e.b[1] - e.a[1]) * f;
            if (i < e.tied) { line(buf, PX(x + uz * 0.22), PY(z - ux * 0.22), PX(x - uz * 0.22), PY(z + ux * 0.22), C.stitch, 2); line(buf, PX(x + uz * 0.22), PY(z - ux * 0.22), PX(x - uz * 0.22), PY(z + ux * 0.22), C.stitchHi, 1); }
            else { const hot = i === e.tied; const col = hot && sparkle % 2 ? C.guide : C.slot; disc(buf, PX(x + uz * 0.28), PY(z - ux * 0.28), hot ? 1.8 : 1, col); disc(buf, PX(x - uz * 0.28), PY(z + ux * 0.28), hot ? 1.8 : 1, col); }
          }
          break;
        }
        case 'incision': {
          if (e.hiddenBy || (e.scan && !e.seen)) break;
          if (e.look === 'pore') { disc(buf, PX(e.x), PY(e.z), 8 + Math.sin(t * 16) * 2, C.cut); disc(buf, PX(e.x), PY(e.z), 5, C.bloodHi, 200); }
          polyDraw(buf, e.pts, C.guide, 2, 3, sparkle, e.s);
          polyDraw(buf, e.pts, C.cutEdge, 3, 0, 0, 0, e.s); polyDraw(buf, e.pts, C.cut, 2, 0, 0, 0, e.s);
          break;
        }
        case 'dressing': {
          polyDraw(buf, e.pts, C.dressing, 2, 4, sparkle, e.s);
          polyDraw(buf, e.pts, C.dressing2, 9, 0, 0, 0, e.s); polyDraw(buf, e.pts, C.dressing, 7, 0, 0, 0, e.s);
          break;
        }
        case 'mask': {
          if (e.hiddenBy) break;
          const sob = e.look === 'sob';
          for (let i = 0; i < e.dots.length; i += 3) {
            if (e.dots[i + 2]) { disc(buf, PX(e.dots[i]), PY(e.dots[i + 1]), 5, C.gel, 170); plot(buf, PX(e.dots[i]) + (i % 3), PY(e.dots[i + 1]), C.gel2); } else if ((i / 3 + sparkle) % 3 === 0 || sob) disc(buf, PX(e.dots[i]), PY(e.dots[i + 1]), sob ? 2 : 1.4, sob ? C.tearHi : C.maskDot);
          }
          break;
        }
        case 'fragment': if (e.goal && !e.hiddenBy) { const a = (e.goal[2] * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), gx = e.goal[0], gz = e.goal[1], w = 0.68, h = 0.34; const pts = [[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]].map(([u, v]) => [gx + u * c - v * s, gz + u * s + v * c]); polyDraw(buf, pts, C.goal, 1, 2, sparkle); } break;
        case 'clamp': case 'graft': if (e.goal) { const r = e.k === 'graft' ? 36 : 12; for (let i = 0; i < 28; i++) { if ((i + sparkle) % 3) { const a = (i / 28) * Math.PI * 2; plot(buf, PX(e.goal[0]) + Math.cos(a) * r, PY(e.goal[1]) + Math.sin(a) * r * 0.75, C.goal); } } } break;
        default: break;
      }
      // Pull arrows: which way it comes out.
      if ((e.k === 'hook' || e.k === 'prop' || e.k === 'magnet' || e.k === 'tumor' || e.k === 'core' || e.k === 'stalk' || e.k === 'plate' || e.k === 'organ') && !e.hiddenBy && !(e.scan && !e.seen) && !e.free) {
        const col = e.maxSpeed ? rgb(0xffb04d) : e.tether ? rgb(0xff6bff) : C.arrow;
        polyDraw(buf, e.pts, col, e.tether ? 2 : 1, 3, -sparkle, e.s);
        const end = e.pts[e.pts.length - 1], prev = e.pts[e.pts.length - 2], dx = end[0] - prev[0], dz = end[1] - prev[1], m = Math.hypot(dx, dz) || 1, ux = dx / m, uz = dz / m;
        line(buf, PX(end[0]), PY(end[1]), PX(end[0] - ux * 0.32 - uz * 0.2), PY(end[1] - uz * 0.32 + ux * 0.2), col, 2);
        line(buf, PX(end[0]), PY(end[1]), PX(end[0] - ux * 0.32 + uz * 0.2), PY(end[1] - uz * 0.32 - ux * 0.2), col, 2);
        if (e.k === 'tumor' || e.k === 'core') disc(buf, PX(e.x), PY(e.z), 16, C.blood, 150);
      }
      // A hidden thing is a faint blotch, so a keen eye can guess where to scan.
      if (e.scan && !e.seen) { disc(buf, PX(e.x), PY(e.z), 10, C.blotch, 46); }
      if (e.k === 'strain' && e.type === 'introit' && e.x != null) { disc(buf, PX(e.x), PY(e.z), 16, C.blotch, 110); disc(buf, PX(e.x), PY(e.z), 8, C.blotch, 150); }
    }
    // The thread, from the last stitch to the needle.
    for (const s of state.seats) {
      if (s.table !== table || s.tool !== 'suture' || !s.useHeld) continue;
      const lac = state.ents.find((e) => e.k === 'laceration' && e.table === table && e.tied > 0);
      if (lac) { const f = (lac.tied - 0.5) / lac.slots, x = lac.a[0] + (lac.b[0] - lac.a[0]) * f, z = lac.a[1] + (lac.b[1] - lac.a[1]) * f; line(buf, PX(x), PY(z), PX(s.x), PY(s.z), C.stitchHi, 1); }
    }
    // Droplets.
    for (const d of state.drops) { if (d.table === table) { disc(buf, PX(d.x), PY(d.z), 4, C.tear); plot(buf, PX(d.x) - 1, PY(d.z) - 1, C.tearHi); line(buf, PX(d.x), PY(d.z), PX(d.x), PY(d.z) - 7, C.tear, 1); } }
    tbl.tex.needsUpdate = true;
  }

  /** A mesh for an entity with a body. */
  makeMesh(e) {
    const key = e.look && LOOK_MODEL[e.look] ? LOOK_MODEL[e.look] : LOOK_MODEL[e.k];
    let obj;
    if (e.k === 'eye') {
      const def = e.look === 'wrath' ? CROWN_EYE : e.look === 'halo' ? HALO_EYE : WEEP_EYE;
      obj = buildModel(def, { catalog: CATALOG }).object.clone(true);
    } else if (key && PROP_DEFS[key]) {
      obj = buildModel(PROP_DEFS[key], { catalog: CATALOG }).object.clone(true);
    } else return null;
    setLookLayer(obj, 'actors');
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
    const entry = { obj, squash: new Squash(), e, chain: null, grabbed: false, lid: obj.getObjectByName('lid') };
    obj.scale.setScalar(e.k === 'eye' ? (e.look === 'wrath' ? 1.3 : 1) : e.big ? 1.25 : 1);
    if (e.k === 'tendril' || e.look === 'tendril' || e.k === 'stalk') {
      const n = 5;
      entry.chain = new SpringChain({ segments: n, length: 0.3, stiffness: 7, gravity: 2, rest: [0.4, -0.2, 0.9] });
      entry.bits = Array.from({ length: n }, (_, i) => { const b = new Mesh(new BoxGeometry(0.16 - i * 0.015, 0.16 - i * 0.015, 0.3), toonMaterial(e.look === 'tendril' ? PALETTE.white : PALETTE.plum)); setLookLayer(b, 'actors'); b.castShadow = true; this.root.add(b); return b; });
    }
    this.root.add(obj);
    return entry;
  }

  syncEntities(state, dt) {
    const seen = new Set();
    for (const e of state.ents) {
      const hiddenByScan = e.scan && !e.seen;
      if (e.hiddenBy || hiddenByScan) { const m = this.meshes.get(e.id); if (m) m.obj.visible = false; continue; }
      seen.add(e.id);
      let m = this.meshes.get(e.id);
      if (!m) {
        m = this.makeMesh(e);
        if (!m) { this.meshes.set(e.id, { obj: new Group(), none: true, e }); continue; }
        m.squash.kick(4);
        this.meshes.set(e.id, m);
      }
      if (m.none) continue;
      m.e = e;
      m.obj.visible = true;
      const x = e.x + (e.table ?? 0) * TABLE_GAP, y = this.surface(e.x, e.z);
      const held = state.seats.some((s) => s.grab === e.id);
      const lift = held ? 0.5 : 0.05;
      m.obj.position.set(x, y + lift, e.z);
      if (e.rot != null) m.obj.rotation.y = -(e.rot * Math.PI) / 180;
      else if (e.pts && e.k !== 'incision') { const a = e.pts[0], b = e.pts[Math.min(1, e.pts.length - 1)]; m.obj.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); }
      m.squash.update(dt);
      const [h, v] = m.squash.scale();
      const pulse = 1 + Math.sin(this.t * 5 + e.id) * 0.04 + (state.heart && e.onBeat && state.heart.phase < 0.35 ? 0.12 : 0);
      const base = e.k === 'eye' ? (e.look === 'wrath' ? 1.3 : 1) : e.big ? 1.25 : 1;
      m.obj.scale.set(base * h * pulse, base * v * pulse, base * h * pulse);
      if (held && !m.grabbed) m.squash.kick(-3);
      m.grabbed = held;
      if (m.lid) { // eyes: closed lids fall over; heat flushes it
        const target = e.shut ? 0 : 1;
        m.lidA = (m.lidA ?? 0) + (target - (m.lidA ?? 0)) * Math.min(1, dt * 10);
        m.lid.scale.y = 1 - m.lidA * 0.92;
        m.lid.position.y = 0.4 + m.lidA * -0.32;
      }
      if (m.chain) {
        const bas = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        m.chain.update(dt, [x, y + 0.2, e.z], bas);
        m.bits.forEach((b, i) => { const p = m.chain.points[i + 1], q = m.chain.points[i]; b.position.set((p[0] + q[0]) / 2, Math.max(y + 0.1, (p[1] + q[1]) / 2), (p[2] + q[2]) / 2); b.lookAt(p[0], p[1], p[2]); });
      }
    }
    for (const [id, m] of this.meshes) {
      if (seen.has(id)) continue;
      if (state.ents.some((e) => e.id === id)) continue;
      if (!m.none) { this.root.remove(m.obj); m.bits?.forEach((b) => this.root.remove(b)); }
      this.meshes.delete(id);
    }
  }

  /** Keeps a placed bone chip or kidney on the field after its entity is gone. */
  addPlaced(ev) {
    const key = ev.look && LOOK_MODEL[ev.look];
    if (!key || !PROP_DEFS[key]) return;
    const obj = buildModel(PROP_DEFS[key], { catalog: CATALOG }).object.clone(true);
    setLookLayer(obj, 'actors');
    obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    obj.position.set(ev.x + (ev.table ?? 0) * TABLE_GAP, this.surface(ev.x, ev.z) + 0.03, ev.z);
    obj.rotation.y = -((ev.rot ?? 0) * Math.PI) / 180;
    this.root.add(obj);
    this.placed.push({ obj, look: ev.look, ev });
  }
  pinkUp() {
    const p = this.placed.find((q) => q.look === 'newKidney');
    if (!p) return;
    const pink = buildModel(PROP_DEFS.pinkKidney, { catalog: CATALOG }).object.clone(true);
    setLookLayer(pink, 'actors');
    pink.position.copy(p.obj.position); pink.rotation.copy(p.obj.rotation);
    this.root.add(pink);
    this.root.remove(p.obj);
    p.obj = pink; p.look = 'pinkKidney';
    pink.scale.setScalar(0.92);
    this.ctx.tweens.to(pink.scale, { x: 1.1, y: 1.1, z: 1.1 }, { duration: 0.6, ease: 'outBack' });
  }

  update(state, dt) {
    this.t += dt;
    // heart + lungs
    const a = ARENAS[this.arena];
    if (state.heart || a?.beats) {
      const phase = state.heart ? state.heart.phase : (this.t * 1.2) % 1;
      this.beat = phase < 0.35 ? Math.sin((phase / 0.35) * Math.PI) : 0;
    } else this.beat = 0;
    this.breath = 0.5 + 0.5 * Math.sin(this.t * 1.5);
    for (const tbl of this.tables) { this.displace(tbl, state); this.paint(tbl, state); }
    this.syncEntities(state, dt);
    // hologram disc
    this.holo.visible = false;
    for (const s of state.seats) {
      if (s.tool === 'scanner' && s.useHeld) {
        this.holo.visible = true;
        this.holo.position.set(s.x + s.table * TABLE_GAP, this.surface(s.x, s.z) + 0.5, s.z);
        this.showHidden(state, s);
      }
    }
    if (!this.holo.visible) for (const v of this.holoHidden.values()) v.visible = false;
  }

  /** Under the disc you see x-rays of what's hidden. */
  showHidden(state, seat) {
    for (const v of this.holoHidden.values()) v.visible = false;
    for (const e of state.ents) {
      if (!e.scan || e.seen || e.table !== seat.table) continue;
      if (Math.hypot(e.x - seat.x, e.z - seat.z) > 3) continue;
      let v = this.holoHidden.get(e.id);
      if (!v) { v = new Mesh(new SphereGeometry(0.34, 8, 6), hologramMaterial({ color: PALETTE.lime })); this.root.add(v); this.holoHidden.set(e.id, v); }
      v.visible = true;
      v.position.set(e.x + e.table * TABLE_GAP, this.surface(e.x, e.z) + 0.5, e.z);
    }
  }
}
void RingGeometry; void MeshBasicMaterial; void DoubleSide;
