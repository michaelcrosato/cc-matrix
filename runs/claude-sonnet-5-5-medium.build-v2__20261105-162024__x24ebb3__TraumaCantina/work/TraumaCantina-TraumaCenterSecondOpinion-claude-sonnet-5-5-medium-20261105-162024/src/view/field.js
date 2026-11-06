// The operating field: tissue canvas (the game's signature), surface mesh, drapes, entity meshes.
import { buildModel, THREE, toonMaterial, PALETTE, setLookLayer } from '../../pixel-engine.js';
import { paintBase, heightAt, W, H } from '../content/arenas.js';
import { pointAt } from '../sim/geom.js';
import { hookPos } from '../sim/tools.js';
import { entDefs, fieldFrameDef } from '../content/models/index.js';
const { Mesh, PlaneGeometry, DataTexture, RGBAFormat, CanvasTexture, NearestFilter, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, Group, OctahedronGeometry, TorusGeometry, Color } = THREE;
export const TB_DX = 24;
const PX = (x) => Math.round(x * 30 + 240), PZ = (z) => Math.round(z * 30 + 135);
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; };

function disc(g, cx, cy, r, col) { g.fillStyle = col; r = Math.max(1, Math.round(r)); for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function ring(g, cx, cy, r, col, th = 1) { g.fillStyle = col; for (let a = 0; a < 6.283; a += 1 / Math.max(4, r)) g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 1), th, th); }
function dline(g, x0, y0, x1, y1, col, step = 5, size = 1, on = 3) { g.fillStyle = col; const n = Math.hypot(x1 - x0, y1 - y0); for (let i = 0; i < n; i += 1) if ((i % step) < on) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), size, size); }

export class FieldView {
  constructor(ctx, arena, nTables = 1) {
    this.ctx = ctx; this.arena = arena; this.n = nTables; this.tables = []; this.ents = new Map(); this.t = 0; this.state = { thump: 0 };
    this.root = new Group(); ctx.scene.add(this.root);
    for (let tb = 0; tb < nTables; tb++) this.tables.push(this.buildTable(ctx, tb));
    this.mats = {};
  }
  X0(tb) { return tb * TB_DX; }
  h(x, z) { return heightAt(this.arena, x, z, this.t, this.state); }
  buildTable(ctx, tb) {
    const base = paintBase(this.arena, 5 + tb * 3), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const data = new Uint8Array(W * H * 4), tex = new DataTexture(data, W, H, RGBAFormat); tex.magFilter = NearestFilter; tex.minFilter = NearestFilter; tex.generateMipmaps = false;
    const geo = new PlaneGeometry(16, 9, 64, 36); geo.rotateX(-Math.PI / 2); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    const mesh = new Mesh(geo, toonMaterial(PALETTE.white, { map: tex })); mesh.receiveShadow = true; mesh.position.x = this.X0(tb); this.root.add(mesh);
    const fr = buildModel(fieldFrameDef).object; fr.position.x = this.X0(tb); fr.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); this.root.add(fr);
    return { base, cv, g, tex, data, mesh, geo, pos: geo.attributes.position, last: -1 };
  }
  dispose() { this.root.removeFromParent?.(); }
  /** y of the surface at world field coords (x,z local to table). */
  surf(tb, x, z) { return this.h(x, z); }
  worldPos(tb, x, z, off = 0) { return [this.X0(tb) + x, this.h(x, z) + off, z]; }
  // ---- per-frame ----
  update(sim, t, dt) {
    this.t = t; this.sim = sim;
    this.state.thump = sim.heart ? (sim.heart.sys ? Math.sin((sim.heart.phase / 0.35) * Math.PI) * 1.0 : 0) : 0;
    for (let tb = 0; tb < this.n; tb++) { this.displace(tb, sim); this.paint(sim, tb); }
    this.sync3D(sim);
  }
  displace(tb, sim) {
    const T = this.tables[tb], p = T.pos; const bul = sim.ents.filter((e) => e.k === 'strain' && e.sk === 'introit' && e.tb === tb);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); let y = this.h(x, z);
      for (const b of bul) { const d2 = (x - b.x) ** 2 + (z - b.z) ** 2; y += 0.38 * Math.exp(-d2 / 0.5) * (b.st === 'travel' ? 1 : 0.6); }
      p.setY(i, y);
    }
    p.needsUpdate = true; if (this.arena === 'heart' || this.arena === 'lung' || bul.length) T.geo.computeVertexNormals();
  }
  paint(sim, tb) {
    const T = this.tables[tb], g = T.g, t = this.t; g.drawImage(T.base, 0, 0);
    const ents = sim.ents.filter((e) => e.tb === tb);
    // pass 1: ground marks
    for (const e of ents) {
      switch (e.k) {
        case 'film': g.globalAlpha = 0.5; disc(g, PX(e.x), PZ(e.z), e.r * 30, '#9ff0e0'); g.globalAlpha = 1; break;
        case 'mask': this.paintMask(g, e, t); break;
        case 'pool': { if (e.hid) break; const cx = PX(e.x), cy = PZ(e.z), r = e.r * 30; disc(g, cx, cy, r, '#6f0f1e'); disc(g, cx, cy, r * 0.82, '#a41a2b'); disc(g, cx - r * 0.2, cy - r * 0.2, r * 0.45, '#cf3a46'); g.fillStyle = '#f6d0c0'; const h = hash(e.id); for (let i = 0; i < 3; i++) { const a = h + i * 2.1 + Math.floor(t * 2 + i) * 1.7; g.fillRect(Math.round(cx + Math.cos(a) * r * 0.5), Math.round(cy + Math.sin(a) * r * 0.5), 1, 1); } break; }
        case 'nick': { const cx = PX(e.x), cy = PZ(e.z); g.fillStyle = '#4a0a14'; g.fillRect(cx - 4, cy - 1, 8, 3); g.fillStyle = '#c42a36'; g.fillRect(cx - 3, cy, 6, 1); if ((t * 3 | 0) % 2 === 0) { g.fillStyle = '#e8a090'; g.fillRect(cx + 1, cy - 1, 1, 1); } break; }
        case 'lac': this.paintLac(g, e, t); break;
        case 'cut': if (!e.hid) this.paintCut(g, e, t, sim); break;
        case 'dress': this.paintDress(g, e, t); break;
        case 'drop': disc(g, PX(e.x), PZ(e.z), 4, '#8fd8ff'); g.fillStyle = '#fff'; g.fillRect(PX(e.x) - 1, PZ(e.z) - 2, 2, 1); break;
        case 'marker': if (!e.hid) { const cx = PX(e.x), cy = PZ(e.z), p = 14 + Math.sin(t * 5) * 2; ring(g, cx, cy, p, '#fff3a0', 2); } break;
        case 'hook': if (!e.hid && !e.tether && !e.held) this.paintArrow(g, e, t); break;
        case 'plate': if (e.hid !== 'round' && e.st === 'whole' && !e.hid) { } break;
      }
    }
    // introit blotch + pores
    for (const e of ents) if (e.k === 'strain' && e.sk === 'introit') { const cx = PX(e.x), cy = PZ(e.z); g.globalAlpha = (e.mark && t - e.mark < 3) ? 0.9 : 0.3; disc(g, cx, cy, 16, '#2a0612'); g.globalAlpha = 1; if (e.st === 'knock' || e.st === 'exposed') { ring(g, cx, cy, 10 + Math.sin(t * 8) * 2, '#f6d0c0', 1); } }
    // hint-less: syringe rings
    const rg = sim.rings[tb]; if (rg) { const cx = PX(rg.x), cy = PZ(rg.z); ring(g, cx, cy, 21, '#fff6b0', 2); ring(g, cx, cy, 15 + Math.sin(t * 8) * 2, '#f5b700', 1); }
    // bone targets
    if (this.arena === 'bone') for (const e of ents) if (e.k === 'drag' && e.to && !e.hid) { const cx = PX(e.to[0]), cy = PZ(e.to[1]); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(cx - 22, cy - 12, 44, 24); ring(g, cx, cy, 26, '#cfd8e0', 1); }
    // scanner reveals / cysts / eyes / polyps painted as flat shapes under the 3D bits
    for (const e of ents) {
      if (e.k === 'polyp' || e.k === 'egg' || e.k === 'cyst') {
        const cx = PX(e.x), cy = PZ(e.z), hot = e.heat > 0 ? e.heat : 0;
        if (e.k === 'cyst') { const col = !e.shown ? '#8a98ac' : e.real ? '#5ad0a0' : '#d05a9a'; disc(g, cx, cy, 13, '#3a4658'); disc(g, cx, cy, 11, col); disc(g, cx - 3, cy - 3, 3, '#e8f0ff'); if (e.shown) ring(g, cx, cy, 15, e.real ? '#b8ffe0' : '#ffb0e0', 1); }
        else if (e.k === 'egg') { disc(g, cx, cy, 11, '#8a7a50'); disc(g, cx, cy, 9, '#e8d8a0'); disc(g, cx - 2, cy - 3, 3, '#fff8e0'); }
        else { disc(g, cx, cy, 12, '#6a2a5a'); disc(g, cx, cy, 10, '#c45a8a'); disc(g, cx - 3, cy - 3, 3, '#f8c0d8'); }
        if (hot) { g.globalAlpha = 0.4 + hot * 0.5; disc(g, cx, cy, 6 + hot * 8, '#ffb050'); g.globalAlpha = 1; }
        if (e.mark && t - e.mark < 2.5) ring(g, cx, cy, 18 + (t - e.mark) * 6, '#90f0ff', 1);
      }
      if (e.k === 'eyeT' && e.sk === 'lacrimosa') this.paintEye(g, e, t);
    }
    { const px = g.getImageData(0, 0, W, H).data, row = W * 4; for (let y = 0; y < H; y++) T.data.set(px.subarray(y * row, (y + 1) * row), (H - 1 - y) * row); }
    T.tex.needsUpdate = true;
  }
  paintEye(g, e, t) {
    const cx = PX(e.x), cy = PZ(e.z), open = !e.hid;
    if (!open) { disc(g, cx, cy, 12, '#5a3a48'); g.fillStyle = '#2a1420'; g.fillRect(cx - 12, cy, 25, 2); return; }
    const lid = Math.min(1, e.openT * 4);
    disc(g, cx, cy, 17, '#3a1a2a'); disc(g, cx, cy, 15, '#f0f0f8'); disc(g, cx, cy + 1, 8, '#2a6ac0'); disc(g, cx, cy + 1, 4, '#101020'); g.fillStyle = '#fff'; g.fillRect(cx - 3, cy - 3, 2, 2);
    if (e.heat > 0) { g.globalAlpha = e.heat * 0.8; disc(g, cx, cy, 15, '#ff7030'); g.globalAlpha = 1; }
    g.fillStyle = '#4a2a38'; const lh = Math.round(15 * (1 - lid)); if (lh > 0) g.fillRect(cx - 15, cy - 16, 31, lh);
    // hp pips
    for (let i = 0; i < e.hp; i++) { g.fillStyle = '#ff5060'; g.fillRect(cx - 6 + i * 5, cy - 22, 3, 3); }
    // weep
    if (e.wt < 0.3) { g.fillStyle = '#8fd8ff'; g.fillRect(cx + 10, cy + 8, 2, 4); }
  }
  paintArrow(g, e, t) {
    const steps = 14, pts = []; for (let i = 0; i <= steps; i++) pts.push(hookPos(e, (e.pull * i) / steps));
    g.fillStyle = e.vmax ? '#ff9a6a' : '#fff3a0';
    for (let i = 1; i < pts.length; i++) if (i % 2) { const a = pts[i - 1], b = pts[i]; for (let k = 0; k < 4; k++) g.fillRect(Math.round(PX(a[0] + (b[0] - a[0]) * k / 4)), Math.round(PZ(a[1] + (b[1] - a[1]) * k / 4)), 1, 1); }
    const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const da of [2.5, -2.5]) for (let k = 0; k < 6; k++) g.fillRect(Math.round(PX(b[0]) - Math.cos(ang + da) * k), Math.round(PZ(b[1]) - Math.sin(ang + da) * k), 1, 1);
  }
  paintLac(g, e, t) {
    if (e.hid) return; const c = Math.cos(e.a), s = Math.sin(e.a), x0 = PX(e.x), y0 = PZ(e.z), x1 = PX(e.x + c * (e.len + 0.2)), y1 = PZ(e.z + s * (e.len + 0.2));
    dline(g, x0, y0, x1, y1, '#3a0610', 1, 3, 1); dline(g, x0, y0, x1, y1, '#d0303c', 1, 1, 1);
    for (let i = 0; i < e.n; i++) {
      const u = i * 0.45 + (e.n === 1 ? e.len / 2 : 0), px = PX(e.x + c * u), py = PZ(e.z + s * u);
      if (i < e.tied) { g.fillStyle = '#dff0ff'; for (let k = -3; k <= 3; k++) { g.fillRect(px + k, py - k, 1, 1); g.fillRect(px + k, py + k, 1, 1); } }
      else { g.fillStyle = i === e.tied ? '#fff3a0' : '#e8a8a0'; g.fillRect(px - 1, py - 1, 3, 3); }
    }
    if (e.urgent) { g.fillStyle = (t * 6 | 0) % 2 ? '#ff4050' : '#a01020'; g.fillRect(x0 - 2, y0 - 7, 3, 3); }
  }
  paintCut(g, e, t, sim) {
    const L = e.L, pts = []; for (let s = 0; s <= L; s += 0.1) pts.push(pointAt(e.path, s));
    const gl = !e.needs || sim.flags['done:' + e.needs];
    g.fillStyle = gl ? '#fff3a0' : 'rgba(255,243,160,0.35)';
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (i % 2) for (let k = 0; k < 3; k++) g.fillRect(Math.round(PX(a[0] + (b[0] - a[0]) * k / 3)), Math.round(PZ(a[1] + (b[1] - a[1]) * k / 3)), 1, 1); }
    g.fillStyle = '#5a0a18'; for (let i = 0; i < pts.length; i++) if (i * 0.1 <= e.s) { g.fillRect(PX(pts[i][0]) - 1, PZ(pts[i][1]) - 1, 3, 3); }
    const [px, pz] = pointAt(e.path, e.s); if (gl) ring(g, PX(px), PZ(pz), 8 + Math.sin(t * 6), '#ffffff', 1);
  }
  paintMask(g, e, t) {
    if (e.hid) return;
    const pts = e.pts || (e.shape.line ? null : null); if (!pts) { // not yet sampled by the sim: sample for display
      if (!e._v) { import('../sim/tools.js').then(() => {}); } }
    const arr = e.pts || this.samp(e); const col = e.id === 'rust' ? '#9a5a2a' : e.id === 'seam' ? '#9aa0a8' : e.shape.line && e.limit ? '#7ab0ff' : '#b8c8a0';
    for (let i = 0; i < arr.length; i++) {
      const got = e.got && e.got[i], x = PX(arr[i][0]), y = PZ(arr[i][1]);
      if (got) { g.fillStyle = '#a8f0e4'; g.fillRect(x - 7, y - 7, 14, 14); g.fillStyle = '#e0fff8'; g.fillRect(x - 4, y - 5, 4, 2); }
      else if (e.shape.line) { disc(g, x, y, 3, col); } else { g.globalAlpha = 0.85; g.fillStyle = col; g.fillRect(x - 7, y - 7, 14, 14); g.globalAlpha = 1; }
    }
  }
  samp(e) { if (e._pts) return e._pts; const { cx, cz, rx, rz, line } = e.shape; const pts = []; if (line) { let acc = 0; for (let i = 1; i < line.length; i++) { const l = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); for (let s = 0; s < l; s += 0.3) pts.push([line[i - 1][0] + (line[i][0] - line[i - 1][0]) * s / l, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * s / l]); } } else for (let x = cx - rx; x <= cx + rx; x += 0.45) for (let z = cz - rz; z <= cz + rz; z += 0.45) if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1) pts.push([x, z]); return (e._pts = pts); }
  paintDress(g, e, t) { const pts = []; for (let s = 0; s <= e.L; s += 0.2) pts.push(pointAt(e.path, s)); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], done = i * 0.2 <= e.s; g.fillStyle = done ? '#f4f4f0' : 'rgba(255,255,255,0.4)'; const x = Math.min(PX(a[0]), PX(b[0])), y = PZ(a[1]) - 5, w = Math.abs(PX(b[0]) - PX(a[0])) + 1; g.fillRect(x, y, w, done ? 10 : 2); if (done) { g.fillStyle = '#e0e4e0'; g.fillRect(x, y + 4, w, 2); } } }

  // ---- 3D entity meshes ----
  mat(c) { return (this.mats[c] ??= toonMaterial(c)); }
  make(e) {
    let key = null;
    switch (e.k) {
      case 'hook': key = e.tether ? 'core' : (entDefs[e.what] ? e.what : 'hook'); break;
      case 'hook2': key = 'hook2'; break;
      case 'drag': key = e.id === 'oldK' || e.id === 'newK' ? 'kidney' : (e.kind === 'clamp' || e.what === 'CLAMP') ? 'clamp' : 'fragment'; break;
      case 'placed': key = e.id === 'newK' ? 'kidney' : e.id.startsWith('f') ? 'fragment' : 'clamp'; break;
      case 'plate': key = 'plate'; break;
      case 'eyeT': key = e.sk === 'wrath' ? 'eyeW' : e.sk === 'miserere' ? 'core2' : null; break;
      case 'marker': key = 'marker'; break;
    }
    const g = key ? buildModel(entDefs[key]).object : new Group();
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    setLookLayer(g, 'actors'); g.userData.kind = e.k; this.root.add(g); return g;
  }
  sync3D(sim) {
    const seen = new Set(); const t = this.t;
    for (const e of sim.ents) {
      if (!['hook', 'drag', 'plate', 'eyeT', 'marker', 'placed', 'hook2'].includes(e.k)) continue;
      if (e.k === 'eyeT' && e.sk === 'lacrimosa') continue;
            const key = e.id + ':' + e.k; seen.add(key);
      let m = this.ents.get(key); if (!m) { m = this.make(e); this.ents.set(key, m); }
      const vis = !(e.hid && e.hid !== 'whole' && e.hid !== 'lifted' && e.hid !== 'round'); m.visible = vis && !(e.k === 'plate' && e.hid === 'lifted');
      if (!vis) continue;
      let y = this.h(e.x, e.z), lift = e.k === 'marker' ? 0 : 0.08;
      if (e.k === 'hook' && !e.tether) lift += 0.18 + (e.held ? 0.5 : 0);
      if (e.k === 'drag') lift += e.held ? 0.7 : 0.15;
      if (e.k === 'plate') lift += (e.hid === 'round' ? 0.02 : 0.2) + (e.lp || 0) * 0.5;
      if (e.k === 'eyeT' && e.sk === 'miserere') lift += 0.3 + Math.sin(t * 2) * 0.15;
      if (e.k === 'marker') lift = 0.2 + Math.sin(t * 4) * 0.1;
      m.position.set(this.X0(e.tb) + e.x, y + lift, e.z);
      m.rotation.y = e.k === 'hook' ? -(e.a || 0) : e.k === 'drag' || e.k === 'placed' ? -(e.rot || 0) : e.k === 'plate' ? -(e.an || 0) : t * (e.k === 'marker' ? 2 : 0);
      if (e.id === 'newK') { const tgt = sim.flags['done:unart'] ? 1 : 0; m.userData.pk = (m.userData.pk || 0) + (tgt - (m.userData.pk || 0)) * 0.03; const st = Math.round(m.userData.pk * 6); if (st !== m.userData.st) { m.userData.st = st; const a = [0x6a, 0x4a, 0x6a], b = [0xd6, 0x5c, 0x4f], f = st / 6, col = (Math.round(a[0] + (b[0] - a[0]) * f) << 16) | (Math.round(a[1] + (b[1] - a[1]) * f) << 8) | Math.round(a[2] + (b[2] - a[2]) * f); m.traverse((o) => { if (o.isMesh) o.material = toonMaterial(col); }); } }
      if (e.k === 'eyeT' && e.sk === 'wrath') { m.scale.setScalar(1 + (e.heat || 0) * 0.5); }
    }
    for (const [k, m] of this.ents) if (!seen.has(k)) { m.removeFromParent(); this.ents.delete(k); }
  }
}
