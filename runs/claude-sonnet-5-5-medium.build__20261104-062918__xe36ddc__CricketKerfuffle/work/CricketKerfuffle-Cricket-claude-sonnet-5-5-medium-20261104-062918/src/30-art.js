/* ---------- art: the ground, the people, the props. Everything is drawn by code with the engine's primitives ---------- */
const px = E.px;
const hx = E.hex;
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const SKINS = ['#e8b890', '#d8a074', '#a8703c', '#f0c8a0', '#8a5a38', '#c68a5a'];
const HAIRS = ['#3a2a20', '#7a4a2a', '#c8b070', '#a0a0a8', '#181818', '#9a3a1a'];
const HAIRSTYLES = ['short', 'spiky', 'ponytail', 'long', 'bald', 'short'];

/* ----- the floor: stripes, pitch, creases, rope, hoardings and a crowd, all as a texture ----- */
let floorGround = GROUNDS.green;
function floorTex(x, y) {
  const rx = bndRX(), ry = bndRY(), dx = x - CX, dy = y - MY, p = Math.hypot(dx / rx, dy / ry);
  const n = hash2(x | 0, y | 0);
  // pitch strip and creases
  if (Math.abs(dx) < 25 && y > SY - 36 && y < BY + 36 && p < 1) {
    const wear = Math.min(1, Math.abs(y - MY) / 160);
    let c = hx(wear > .55 ? '#b49560' : '#c8aa72'); const k = .94 + n * .1;
    const line = (yy, hw) => Math.abs(y - yy) < .9 && Math.abs(dx) < hw;
    if (line(CR0, 38) || line(CR1, 38) || line(SY, 36) || line(BY, 36) || (Math.abs(Math.abs(dx) - 21) < .9 && ((y > SY - 2 && y < CR0 + 8) || (y < BY + 2 && y > CR1 - 8)))) return [236, 232, 220];
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  if (p < .985) {
    const a = hx(floorGround.grass[0]), b = hx(floorGround.grass[1]);
    const c = Math.floor(y / 30) % 2 ? a : b, k = .93 + n * .14;
    // the 30-yard circle, dotted
    if (Math.abs(p - .52) < .006 && ((x / 6 | 0) + (y / 6 | 0)) % 2 === 0) return [220, 230, 210];
    return [c[0] * k, c[1] * k, c[2] * k];
  }
  if (p < 1.0) return [244, 244, 238];
  if (p < 1.012) return [40, 70, 36];
  if (p < 1.07) {   // hoardings
    const ang = Math.atan2(dy, dx), seg = Math.floor((ang + Math.PI) * 9) % 5, cols = ['#d83a2a', '#2a5ad8', '#f0c020', '#2aa84a', '#d8d8e0'];
    return hx(cols[seg]);
  }
  if (p < 1.4) {   // the stands: coarse blocks of colourful spectators (kept big so it stays calm when the camera pulls back)
    const ang = Math.atan2(dy, dx), seg = Math.floor((ang + Math.PI) * 60), row = Math.floor((p - 1.07) * 22);
    const h = hash2(seg, row), cols = ['#d8503e', '#3a72d0', '#e8b830', '#3ea860', '#e8e8e0', '#b45ab4', '#e08030'];
    const base = row % 2 ? [66, 60, 82] : [56, 50, 72];
    if (h < .62) { const c = hx(cols[Math.floor(h * 97) % cols.length]), k = .5 + ((x | 0) % 6 < 3 ? .14 : 0); return [c[0] * k, c[1] * k, c[2] * k]; }
    return base;
  }
  return [24, 40, 26];
}
let map = null;
function buildMap(groundId) {
  floorGround = GROUNDS[groundId] || GROUNDS.green;
  const rows = []; for (let j = 0; j < GH; j++) rows.push('.'.repeat(GW));
  map = new E.TileMap({ rows, legend: {}, types: {}, floorTex, outside: '#18281a', ao: 0 });
  return map;
}
function rebakeFloor() { if (map) { map.floors = {}; } }

/* ----- people ----- */
function mkRig(teamId, kind, i) {
  const tm = TEAMS[teamId], sk = SKINS[(i * 5 + 1) % SKINS.length], hr = HAIRS[(i * 3 + 2) % HAIRS.length];
  const o = { size: 1.5, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: HAIRSTYLES[(i * 2 + 1) % HAIRSTYLES.length],
    colors: { skin: sk, hair: hr, cloth: tm.cloth, pants: tm.pants, boot: '#f2eee4', trim: tm.trim, belt: tm.trim, glove: '#f2eee4' } };
  if (kind === 'bat') { o.weapon = 'bat'; o.bladeLen = 15; o.hat = { style: 'helmet', color: tm.trim }; o.colors.metal = '#e2bc78'; o.colors.hilt = '#b8302c'; o.colors.glove = '#f2eee4'; o.stance = 'ready'; }
  else if (kind === 'keeper') { o.hat = { style: 'cap', color: tm.hat }; o.colors.cloth = tm.trim; o.colors.glove = '#e8c040'; }
  else if (kind === 'umpire') { o.hat = { style: 'cap', color: '#f4f0e8' }; o.outfit = 'coat'; o.colors.cloth = '#f4f0e8'; o.colors.coat = '#f4f0e8'; o.colors.pants = '#2a2a38'; o.hair = 'bald'; o.colors.hair = '#a0a0a8'; o.size = 1.55; }
  else if (kind === 'bowler') { o.hat = { style: 'band', color: tm.hat }; }
  else o.hat = i % 3 === 0 ? { style: 'cap', color: tm.hat } : (i % 3 === 1 ? { style: 'band', color: tm.hat } : null);
  return new E.Humanoid(o);
}
const rigs = { bat: [null, null], field: [], umpire: null, key: '' };
function buildRigs(batTeam, fieldTeam) {
  const key = batTeam + ':' + fieldTeam;
  rigs.bat = [mkRig(batTeam, 'bat', 0), mkRig(batTeam, 'bat', 3)];
  rigs.field = [mkRig(fieldTeam, 'bowler', 1), mkRig(fieldTeam, 'keeper', 2)];
  for (let i = 0; i < 9; i++) rigs.field.push(mkRig(fieldTeam, 'field', i + 4));
  rigs.umpire = mkRig('rain', 'umpire', 7); rigs.key = key;
}

/* ----- the set: stumps, buildings, cow, crowd ----- */
function drawStumps(r, y, M, towardCamera) {
  const bails = M && M.bailsOff > 0 && M.ball && ((y === SY && M.stumpEnd !== 1) || (y !== SY && M.stumpEnd === 1)) ? M.bailsOff : 0;
  r.queue(CX, y, 0, g => {
    for (const dx of [-2.6, 0, 2.6]) {
      const lean = bails ? (dx === 0 ? 7 : dx < 0 ? -3 : 4) * Math.min(1, (1.4 - bails) * 2) : 0;
      const a = r.w(CX + dx, y, 0), b = r.w(CX + dx + lean * .3, y - lean * .4, 13 - Math.abs(lean) * .5);
      px.line(g, a[0], a[1], b[0], b[1], '#e8d8a8', 1); px.line(g, a[0] + 1, a[1], b[0] + 1, b[1], '#a89868', 1);
    }
    if (!bails) { const a = r.w(CX - 2.6, y, 13), b = r.w(CX + 2.6, y, 13); px.line(g, a[0], a[1] - 1, b[0], b[1] - 1, '#ffd860', 1); }
    else for (let k = 0; k < 2; k++) { const t = 1.4 - bails, bx = CX + (k ? 1 : -1) * (2 + t * 26), bz = 14 + Math.sin(t * 5) * 18 - t * 8, p = r.w(bx, y - t * 30, Math.max(0, bz)); px.line(g, p[0] - 2, p[1], p[0] + 2, p[1] - 1, '#ffd860', 1); }
  });
}
function drawBuilding(r, x, y, w, d, h, wall, roof, o = {}) {
  r.queue(x, y, 0, g => {
    r.box(g, x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, h, roof, wall);
    const a = r.w(x - w / 2, y + d / 2, 0), roofTop = r.w(x, y, h + (o.peak || 10));
    px.poly(g, [r.w(x - w / 2 - 3, y + d / 2 + 2, h), r.w(x + w / 2 + 3, y + d / 2 + 2, h), roofTop], roof);
    for (const wx of (o.windows || [])) {
      const p0 = r.w(x + wx - 6, y + d / 2 + .5, h * .3), p1 = r.w(x + wx + 6, y + d / 2 + .5, h * .3), p2 = r.w(x + wx + 6, y + d / 2 + .5, h * .75), p3 = r.w(x + wx - 6, y + d / 2 + .5, h * .75);
      px.poly(g, [p0, p1, p2, p3], o.lit ? '#ffe9a0' : '#7ac0e0'); px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a1c10');
      if (o.broken && o.broken === wx) { const m = r.w(x + wx, y + d / 2 + .6, h * .5); px.line(g, m[0] - 4, m[1] - 3, m[0] + 4, m[1] + 3, '#1a1a20'); px.line(g, m[0] + 3, m[1] - 3, m[0] - 3, m[1] + 4, '#1a1a20'); }
    }
    if (o.sign) { const s = r.w(x, y + d / 2 + 1, h + 2); E.font.text(g, o.sign, s[0], s[1] - 8, '#fff6d0', { align: 'center', font: 'tiny', shadow: '#000' }); }
  });
}
const SET_BROKEN = { window: false };
function drawSet(r, M) {
  const tp = id => targetPos(TARGETS.find(t => t.id === id));
  const w = tp('window'), u = tp('urn'), c = tp('clock'), b = tp('bell');
  drawBuilding(r, w[0] + 50, w[1] - 14, 70, 36, 34, '#9a5a3a', '#6a3a2a', { windows: [-20, 0, 20], sign: 'THE KERFUFFLE ARMS', lit: floorGround.night, broken: SET_BROKEN.window ? 0 : undefined, peak: 14 });
  drawBuilding(r, u[0] + 46, u[1] + 12, 50, 34, 22, '#f0e8d0', '#c83a3a', { sign: 'TEA', peak: 10 });
  drawBuilding(r, c[0], c[1] + 52, 22, 22, 64, '#c8b890', '#7a5a3a', { windows: [0], peak: 22, sign: 'CLOCK' });
  drawBuilding(r, b[0] - 52, b[1] + 10, 36, 40, 44, '#b0a8a0', '#5a5060', { windows: [0], peak: 28, sign: 'ST BELL' });
  // floodlight pylons at night
  for (const [px_, py_] of [[CX - 330, MY - 360], [CX + 330, MY - 360], [CX - 330, MY + 360], [CX + 330, MY + 360]]) {
    r.queue(px_, py_, 0, g => { const a = r.w(px_, py_, 0), t = r.w(px_, py_, 96); px.line(g, a[0], a[1], t[0], t[1], '#707080', 2); px.rect(g, t[0] - 5, t[1] - 3, 10, 4, floorGround.night ? '#fff8d0' : '#a0a0b0'); if (floorGround.night) px.glow(g, 1); });
  }
}
function drawCow(r, cow, t) {
  r.shadow(cow.x, cow.y, 11, .35);
  r.actor(cow.x, cow.y, 0, (g, ox, oy) => {
    const bob = Math.sin(t * 2 + cow.x) * .6, face = cow.vx < -0.5 ? -1 : 1;
    px.ell(g, ox, oy - 9 + bob, 10, 6, '#f4f2ec'); px.ell(g, ox - 3 * face, oy - 10 + bob, 3.5, 3, '#2a2a30'); px.ell(g, ox + 4 * face, oy - 7 + bob, 3, 2.4, '#2a2a30');
    px.ell(g, ox + 10 * face, oy - 11 + bob, 4, 3.4, '#f4f2ec'); px.rect(g, ox + 12 * face - (face < 0 ? 3 : 0), oy - 10 + bob, 3, 2, '#e8a0a8');
    px.dot(g, ox + 10 * face, oy - 12 + bob, '#101010'); px.line(g, ox + 8 * face, oy - 15 + bob, ox + 7 * face, oy - 17 + bob, '#e8d8a0', 1);
    for (const lx of [-6, -3, 3, 6]) px.line(g, ox + lx, oy - 5 + bob, ox + lx, oy, '#d8d4c8', 1);
    px.line(g, ox - 10 * face, oy - 11 + bob, ox - 13 * face, oy - 5 + bob + Math.sin(t * 5) * 1.5, '#f4f2ec', 1);
    if (cow.moo > 0) E.font.text(g, 'MOO!', ox, oy - 26, '#fff', { align: 'center', shadow: '#000', font: 'tiny' });
  });
}
function drawCrowd(r, M, t) {
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1.045 + hash2(i, 3) * .02, x = CX + Math.cos(a) * bndRX() * k, y = MY + Math.sin(a) * bndRY() * k;
    if (!r.visible(x, y, 0, 30, 60, 60)) continue;
    const cheer = M && M.cheerT > 0 ? 1 : 0, hop = Math.max(0, Math.sin(t * 7 + i * 1.7)) * (cheer ? 5 : .6) * (hash2(i, 9) > .3 ? 1 : 0);
    const cols = ['#e04a3a', '#3a7ae0', '#f0c030', '#40b860', '#f0f0f0', '#c060c0'], col = cols[i % cols.length];
    r.queue(x, y, 0, g => { const p = r.w(x, y, hop); px.rect(g, p[0] - 2, p[1] - 6, 4, 5, col); px.disc(g, p[0], p[1] - 8, 2, SKINS[i % SKINS.length]); if (cheer) px.line(g, p[0] + 2, p[1] - 6, p[0] + 4, p[1] - 11, SKINS[i % SKINS.length], 1); });
  }
}

/* ----- the ball and its flourishes ----- */
function drawBall(r, M, t) {
  const b = M.ball; if (!b || b.phase === 'dead' && !M.hit) return;
  if (b.phase === 'held' && b.holder) return;
  r.shadow(b.x, b.y, 2.5 + b.z * .02, .45);
  const night = floorGround.night, col = night ? '#f4f4f0' : '#c8242c';
  const trail = b.trail || [];
  r.queue(b.x, b.y, b.z, g => {
    for (let i = 0; i < trail.length; i++) { const q = trail[i], p = r.w(q[0], q[1], q[2]), k = (i + 1) / trail.length; if (b.fire || M.sideBat().fire > 0) px.disc(g, p[0], p[1], 1 + k * 1.5, i % 2 ? '#ffb020' : '#ff5020'); else if (k > .5) px.dot(g, p[0], p[1], '#e8e8e8'); }
    const p = r.w(b.x, b.y, b.z);
    px.disc(g, p[0], p[1], 3, '#ffffff'); px.disc(g, p[0], p[1], 2.2, col); px.dot(g, p[0] - 1, p[1] - 1, '#ffd0d0');
    if (night) px.glow(g, 1);
  }, { emissive: night });
}
