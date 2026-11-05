// The renderer: reads a Battle and paints it into the engine's pixel buffer (g) through px.*. Depth-sorted, far to near.
// Nothing here changes the battle; it only reads it (entities, booms, popups, the players).
(() => {
'use strict';
const WP = globalThis.WP;
const E = globalThis.My3D2dge;
const { proj, clamp, W, HZ, PLAY_H } = WP;
const px = E.px;

// a rectangle with both edges rounded, so neighbours meet with no gap
const box = (g, x, y, w, h, c) => {
  const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
  if (x1 > x0 && y1 > y0) px.rect(g, x0, y0, x1 - x0, y1 - y0, c);
};
// pixel-art sprites from rows of characters, scaled into the box (x, y, w, h). '.' is empty
const SPR = {
  soldier: { pal: { h: '#3d4a2a', s: '#c99a66', e: '#1a1410', u: '#5d6e3c', d: '#46542c', b: '#2a2418', g: '#1e1e1e', t: '#4a5230', k: '#17130f' }, rows: [
    '...hhhhh...', '..hhhhhhh..', '..hhhhhhh..', '..ssssssss.', '..sessesss.', '..ssssssss.',
    '.uuuuuuuuu.', 'guuuuuuuuug', '.uuuuuuuu..', '..uuuuuu...', '..bbbbbbb..', '..ttttttt..',
    '..tt...tt..', '..tt...tt..', '..kk...kk..', '.kkk...kkk.'] },
  civilian: { pal: { h: '#5a3a24', s: '#d6a676', e: '#1a1410', w: '#e9e4d6', c: '#2f6e7a', r: '#c4543a', k: '#2a2220' }, rows: [
    '....hhh....', '...hhhhh...', '...ssssss..', '...sesess..', '...ssssss..', '..wwwwwwww.',
    '.wwwwwwwww.', '.wwcccccww.', '..wcccccw..', '..wcccccw..', '..wwwwwww..', '..cccccc...',
    '..cc..cc...', '..cc..cc...', '..kk..kk...', '..kk..kk...'] },
  hostage: { pal: { h: '#6a4a2a', s: '#d6a676', e: '#1a1410', w: '#f0ead8', c: '#7a5a3a', k: '#2a2220' }, rows: [
    's.....h.....s', '.s...hhh...s.', '..s.hhhhh.s..', '...shhhhhs...', '...ssssss....', '...sesess....',
    '...ssssss....', '....wwww.....', '...wwwwwww...', '...wwccwww...', '...wwccwww...', '....cccc.....',
    '....cc.cc....', '....cc.cc....', '....kk.kk....', '....kk.kk....'] },
  brute: { pal: { h: '#8a7a4a', s: '#d8b080', e: '#1a1410', u: '#4a5a30', b: '#2a2418', g: '#1e1e1e', t: '#3a4228', k: '#17130f' }, rows: [
    '....hhhhh....', '...hhhhhhh...', '...ssssssss..', '...sesessss..', '...ssssssss..', '.uuuuuuuuuuu.',
    'guuuuuuuuuuug', '.uuuuuuuuuuu..', '..uuuuuuuu...', '..bbbbbbbbb..', '..tttttttt...', '..tt....tt...',
    '..tt....tt...', '..kk....kk...', '.kkk....kkk..'] },
  holt: { pal: { c: '#6a4a3a', d: '#4a3228', e: '#ffe050', t: '#1e1812', b: '#8a2a20', g: '#3a3a3a', s: '#b08a5a' }, rows: [
    '.....ddd......', '....dddddd....', '...ddsssdd....', '...dessesd....', '...ddssdd.....', '..ddddddddd...',
    '.dddcccccdd...', '.ddcccccccdd...', '.dcccccccc....', '.ddcccccdd....', '..dccdccd.....', '..ddd.ddd.....'] },
};
// draw a sprite, rows of characters, into the box
const sprite = (g, s, x, y, w, h, flip) => {
  const rows = s.rows, cols = Math.max(...rows.map(r => r.length)), cw = w / cols, ch = h / rows.length;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const ch0 = row[flip ? row.length - 1 - c : c];
      let n = 1;
      while (c + n < row.length && (flip ? row[row.length - 1 - c - n] : row[c + n]) === ch0) n++;
      const col = s.pal[ch0];
      if (col) {
        const fc = flip ? cols - (c + n) : c;
        box(g, x + fc * cw, y + r * ch, n * cw, ch + 0.5, col);
      }
      c += n;
    }
  }
};

// the colour of a sky band at a row: a gradient through the operation's four sky colours
const lerpHex = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
};

// the screen's sky and hills, the ground rows, and the rail's ground texture that slides past
function drawWorld(g, b) {
  const op = b.op, sky = op.sky;
  for (let y = 0; y < HZ; y += 2) {
    const t = y / HZ;
    const c = t < 0.33 ? lerpHex(sky[0], sky[1], t / 0.33) : t < 0.7 ? lerpHex(sky[1], sky[2], (t - 0.33) / 0.37) : lerpHex(sky[2], sky[3], (t - 0.7) / 0.3);
    box(g, 0, y, W, 2, c);
  }
  if (op.sun) {
    px.disc(g, W * 0.72, HZ * 0.42, 14, op.sun);
    px.disc(g, W * 0.72, HZ * 0.42, 9, '#fff8e0');
  } else {
    // the night: a moon and stars
    px.disc(g, W * 0.7, HZ * 0.35, 9, '#e8e8d0');
    for (let i = 0; i < 40; i++) px.dot(g, (i * 137) % W, (i * 53) % (HZ - 10), '#c8d0f0');
  }
  // hills: a silhouette that drifts a little slower than the ground (parallax)
  const off = b.camX * 0.18;
  const pts = [[0, HZ]];
  for (let x = 0; x <= W; x += 12) {
    const h = 16 + 10 * Math.sin((x + off) * 0.035) + 6 * Math.sin((x + off) * 0.11 + 1.3);
    pts.push([x, HZ - h]);
  }
  pts.push([W, HZ]);
  px.poly(g, pts, op.hill);
  // the ground: horizon to the bottom of the battlefield
  for (let y = HZ; y < PLAY_H; y++) {
    const t = (y - HZ) / (PLAY_H - HZ);
    box(g, 0, y, W, 1, lerpHex(op.ground[0], op.ground[2], t));
  }
  // the ground texture: strips at fixed world spacing, so they slide as the camera moves
  for (let y = HZ + 3; y < PLAY_H; y += 3) {
    const z = (WP.CAMH * WP.FOC) / (y - HZ), k = WP.FOC / z;
    const x0 = b.camX + ((0 - W / 2) * z) / WP.FOC, x1 = b.camX + ((W / 2) * z) / WP.FOC;
    const step = 34;
    for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
      const sx = W / 2 + (x - b.camX) * k;
      box(g, sx, y, Math.max(1, 14 * k), 1, op.ground[1]);
    }
  }
  // the river on the boat operations: a lane of water at the depth the boats run
  if (op.id === 'op2' || op.id === 'op5') {
    for (let y = HZ + 28; y < HZ + 60; y++) box(g, 0, y, W, 1, (y % 4 === 0) ? '#2a4a58' : '#33586a');
  }
}

// a palm tree, a hut or a radio mast, at a depth, as scenery. Drawn as one depth-sorted item
function drawScenery(g, b, d) {
  const a = proj(d.x, d.z, b.camX), k = a.k;
  if (a.sx < -120 || a.sx > W + 120) return;
  if (d.kind === 'palm') {
    const h = 96 * k, x = a.sx, base = a.gy;
    for (let i = 0; i < 6; i++) {
      const ang = -2.6 + i * 0.5, tx = x + Math.cos(ang) * 30 * k, ty = base - h + Math.sin(ang) * 14 * k;
      px.line(g, x, base - h, tx, ty, '#2a5a2a', Math.max(1, Math.round(3 * k)));
    }
    px.line(g, x, base, x + 3 * k, base - h, '#6a4a2a', Math.max(1, Math.round(4 * k)));
  } else if (d.kind === 'hut') {
    const w = 60 * k, h = 34 * k, x = a.sx - w / 2, base = a.gy;
    box(g, x, base - h, w, h, '#c8a878');
    px.poly(g, [[x - 4 * k, base - h], [a.sx, base - h - 28 * k], [x + w + 4 * k, base - h]], '#8a4a30');
    box(g, a.sx - 6 * k, base - 14 * k, 12 * k, 14 * k, '#3a2a1a');
  } else if (d.kind === 'plane') {
    // a cargo plane, high over the strip: fuselage, wings and tail
    const y = a.gy - 70 * k, w = 120 * k;
    box(g, a.sx - w / 2, y, w, 9 * k, '#d8d8d0');
    box(g, a.sx - w * 0.15, y - 6 * k, w * 0.3, 16 * k, '#b8b8b0');
    box(g, a.sx - w * 0.5, y + 3 * k, w, 2 * k, '#8a8a80');
    box(g, a.sx + w * 0.42, y - 8 * k, w * 0.1, 12 * k, '#8a2a20');
  } else if (d.kind === 'mast') {
    const base = a.gy, h = 110 * k;
    px.line(g, a.sx, base, a.sx, base - h, '#9aa0a8', Math.max(1, Math.round(3 * k)));
    px.line(g, a.sx - 10 * k, base - h * 0.6, a.sx + 10 * k, base - h * 0.6, '#9aa0a8', Math.max(1, Math.round(2 * k)));
    px.disc(g, a.sx, base - h, Math.max(1, 2 * k), '#ff4a3a');
  }
}

// a boss: a big hull with its turret, cab, rotor or hatch, and the head zone brighter (the weak point)
function drawBoss(g, b, e, a) {
  const up = clamp(e.rise, 0, 1), k = a.k, w = e.w * k, h = e.h * k * up, x = a.sx - w / 2, y = a.gy - h;
  if (up <= 0.02) return;
  const flash = e.flash > 0 ? '#ffffff' : null;
  const hull = e.sprite === 'crocodile' ? '#3a4a2a' : e.sprite === 'ironHog' ? '#3a3a40' : e.sprite === 'hyenaOne' ? '#5a5a52' : e.sprite === 'tusk' ? '#2a2a34' : e.sprite === 'warthog' ? '#6a5a30' : '#4a5a3a';
  const trim = '#1a1a1a';
  if (e.sprite === 'hyenaOne') {
    box(g, x, y + h * 0.3, w, h * 0.5, hull);
    box(g, x + w * 0.2, y, w * 0.6, h * 0.35, trim);
    box(g, x - w * 0.15, y + h * 0.4, w * 0.15, h * 0.2, '#2a2a28');
    box(g, x + w, y + h * 0.4, w * 0.15, h * 0.2, '#2a2a28');
    px.line(g, a.sx - w * 0.6, y + h * 0.5, a.sx + w * 0.6, y + h * 0.5, '#4a4a48', Math.max(1, Math.round(2 * k)));
  } else if (e.sprite === 'tusk') {
    box(g, x + w * 0.25, y, w * 0.5, h, hull);
    box(g, x, y + h * 0.35, w * 0.25, h * 0.65, '#50505e');
    box(g, x + w * 0.2, y, w * 0.6, h * 0.2, trim);
    box(g, a.sx - w * 0.35, y + h * 0.2, w * 0.4, h * 0.45, '#9aa0b0');
  } else {
    box(g, x, y + h * 0.4, w, h * 0.6, hull);
    box(g, x + w * 0.1, y + h * 0.1, w * 0.6, h * 0.35, trim);
    box(g, x + w * 0.62, y, w * 0.2, h * 0.25, '#2a2a2a');
    if (e.sprite === 'bigEar') px.disc(g, a.sx - w * 0.15, y + h * 0.1, Math.max(3, w * 0.22), '#9aa0a8');
    if (e.sprite === 'crocodile') for (let i = 0; i < 5; i++) box(g, x + w * (0.08 + i * 0.18), y + h * 0.4, w * 0.08, h * 0.12, '#d8d0a0');
    if (e.sprite === 'ironHog') { px.disc(g, x + w * 0.15, y + h * 0.5, h * 0.3, '#2a2a2a'); px.disc(g, x + w * 0.5, y + h * 0.5, h * 0.3, '#2a2a2a'); }
  }
  // the head zone (the weak point): the top third, lit
  box(g, x + w * 0.3, y + h * 0.05, w * 0.4, h * 0.2, flash || '#ffb060');
  if (flash) box(g, x, y, w, h, 'rgba(255,255,255,0.4)');
  if (e.shield && e.shieldUp) box(g, a.sx - w * 0.55, y + h * 0.2, w * 0.22, h * 0.75, '#7a8aa0');
}

// the bits of the world that move and fight: soldiers, civilians, vehicles, boats, aircraft, props and projectiles
function drawEntity(g, b, e) {
  const a = proj(e.x, e.z, b.camX), k = a.k;
  const flashC = e.flash > 0 ? 'rgba(255,255,255,0.45)' : null;
  const t = WP.TYPES[e.type] || {};
  switch (e.kind) {
    case 'soldier': {
      if (e.rise <= 0.02) return;
      const w = (t.w || 9) * k, h = (t.h || 20) * k * e.rise;
      if (e.type === 'mortar') {
        box(g, a.sx - w / 2, a.gy - h, w, h, '#3a4a2a');
        box(g, a.sx - w * 0.2, a.gy - h * 1.6, w * 0.4, h * 0.8, '#2a2a2a');
        break;
      }
      sprite(g, e.type === 'brute' ? SPR.brute : SPR.soldier, a.sx - w * 0.6, a.gy - h, w * 1.2, h, e.vx < 0);
      if (flashC) box(g, a.sx - w / 2, a.gy - h, w, h, flashC);
      break;
    }
    case 'civilian': {
      sprite(g, SPR.civilian, a.sx - 4.8 * k, a.gy - 18 * k, 9.6 * k, 18 * k, e.vx < 0);
      break;
    }
    case 'hostage': {
      sprite(g, SPR.hostage, a.sx - 6.3 * k, a.gy - 20 * k, 12.6 * k, 20 * k, e.vx < 0);
      break;
    }
    case 'vehicle': {
      const w = t.w * k, h = t.h * k, x = a.sx - w / 2, y = a.gy - h;
      const body = e.type === 'tank' ? '#4a5a3a' : e.type === 'apc' ? '#5a6a4a' : e.type === 'truck' ? '#6a6a50' : '#5a5a2a';
      box(g, x, y + h * 0.35, w, h * 0.65, body);
      if (e.type === 'tank') { box(g, x + w * 0.3, y, w * 0.4, h * 0.4, '#3a4a2a'); px.line(g, a.sx, y + h * 0.2, a.sx + w * 0.6, y + h * 0.2, '#2a2a2a', Math.max(1, Math.round(3 * k))); }
      else if (e.type === 'truck') { box(g, x, y, w * 0.35, h, '#4a4a3a'); box(g, x + w * 0.4, y + h * 0.15, w * 0.6, h * 0.6, '#3a3a2a'); }
      else { box(g, x + w * 0.22, y, w * 0.5, h * 0.4, '#3a3a22'); box(g, x + w * 0.25, y + h * 0.05, w * 0.22, h * 0.25, '#7ab0c8'); }
      box(g, x + w * 0.1, a.gy - h * 0.12, w * 0.2, h * 0.24, '#151515');
      box(g, x + w * 0.7, a.gy - h * 0.12, w * 0.2, h * 0.24, '#151515');
      if (e.tg > 0 || e.type === 'jeep') px.line(g, a.sx, y, a.sx - w * 0.5, y - h * 0.3, '#2a2a2a', Math.max(1, Math.round(2 * k)));
      if (flashC) box(g, x, y, w, h, flashC);
      break;
    }
    case 'boat': {
      const w = t.w * k, h = t.h * k, x = a.sx - w / 2, y = a.gy - h;
      box(g, x, y + h * 0.3, w, h * 0.7, e.type === 'gunboat' ? '#4a4a40' : '#5a4a30');
      box(g, x + w * 0.2, y, w * 0.4, h * 0.4, '#3a3a2a');
      px.line(g, x, a.gy - h * 0.1, x + w, a.gy - h * 0.1, '#2a5a6a', 1);
      if (flashC) box(g, x, y, w, h, flashC);
      break;
    }
    case 'air': {
      const w = t.w * k, h = t.h * k, y = a.sy - h / 2;
      box(g, a.sx - w / 2, y, w, h, '#4a4a40');
      box(g, a.sx - w * 0.45, y + h * 0.2, w * 0.25, h * 0.4, '#7ab0c8');
      px.line(g, a.sx - w * 0.7, y - 2 * k, a.sx + w * 0.7, y - 2 * k, '#2a2a2a', Math.max(1, Math.round(2 * k)));
      px.line(g, a.sx, y - 4 * k, a.sx, a.gy, 'rgba(0,0,0,0.25)', 1);
      if (flashC) box(g, a.sx - w / 2, y, w, h, flashC);
      break;
    }
    case 'boss': drawBoss(g, b, e, a); break;
    case 'crate': {
      const s = 12 * k;
      box(g, a.sx - s / 2, a.gy - s, s, s, e.dyn ? '#a02a1a' : '#7a5a2a');
      box(g, a.sx - s / 2, a.gy - s * 0.5, s, 1, e.dyn ? '#601a10' : '#4a3418');
      box(g, a.sx - s / 2, a.gy - s, 1, s, e.dyn ? '#601a10' : '#4a3418');
      if (e.dyn) box(g, a.sx - 1, a.gy - s - 2 * k, 2, 2 * k, '#ffd060');
      break;
    }
    case 'cover': {
      const w = 26 * k, h = 8 * k;
      for (let i = 0; i < 4; i++) box(g, a.sx - w / 2 + (i * w) / 4, a.gy - h, w / 4 + 0.5, h, i % 2 ? '#b8a878' : '#a09060');
      break;
    }
    case 'animal': {
      const w = 11 * k, h = 9 * k;
      box(g, a.sx - w / 2, a.gy - h, w, h * 0.7, '#c8c0a8');
      box(g, a.sx + w * 0.3, a.gy - h, w * 0.3, h * 0.5, '#c8c0a8');
      box(g, a.sx - w / 2, a.gy - h * 0.3, w * 0.2, h * 0.3, '#8a7a60');
      break;
    }
    case 'pickup': {
      const s = Math.max(4, 7 * k), bob = Math.sin(b.t * 5 + e.id) * 2 * k, yy = a.gy - s - bob;
      const col = e.item === 'mag' ? '#e0c060' : e.item === 'grenade' ? '#7ac060' : e.item === 'fury' ? '#60b0ff' : '#ff6a6a';
      if (e.t > 7 && Math.floor(e.t * 8) % 2) return;
      box(g, a.sx - s / 2, yy, s, s, '#2a2a2a');
      box(g, a.sx - s / 2 + 1, yy + 1, s - 2, s - 2, col);
      if (e.item === 'fury') box(g, a.sx - 1, yy + s / 2 - 1, 2, 2, '#ffffff');
      break;
    }
    case 'rocket': {
      const y = (e.y || 10) * k, s = Math.max(2, 3 * k), col = WP.PROJ[e.pk] ? WP.PROJ[e.pk].color : '#ffb040';
      px.disc(g, a.sx, a.gy - y, s, col);
      px.disc(g, a.sx, a.gy - y, Math.max(1, s * 0.5), '#fff4c0');
      px.line(g, a.sx, a.gy - y, a.sx, a.gy - y + 12 * k, 'rgba(255,160,60,0.6)', 1);
      break;
    }
    default: break;
  }
}

// the closing ring of a telegraph: it starts wide and shrinks onto the head until the shot lands
function drawRing(g, b, e) {
  if (!(e.tg > 0)) return;
  const a = proj(e.x, e.z, b.camX), k = a.k;
  let hy, rad;
  if (e.kind === 'boss') { hy = a.sy - e.h * k * 0.6; rad = 26 * k; }
  else if (e.kind === 'vehicle' || e.kind === 'boat') { hy = a.gy - 24 * k; rad = 22 * k; }
  else if (e.kind === 'air') { hy = a.sy - 10 * k; rad = 16 * k; }
  else { hy = a.gy - 20 * k * Math.max(0.5, e.rise) - 4; rad = 12 * k; }
  const f = clamp(e.tg, 0, 1);
  const r = Math.max(2, rad * (1 - f) + 3);
  const col = f > 0.75 ? '#ff2a1a' : '#ff8a3a';
  const n = 16 + Math.round(r);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    px.dot(g, a.sx + Math.cos(t) * r, hy + Math.sin(t) * r, col);
  }
}

// explosions: a flash that opens and a smoke ring that fades, both in the blast's screen size
function drawBoom(g, b, q) {
  const a = proj(q.x, q.z, b.camX), k = a.k;
  const R = q.r * k * clamp(q.t * 5, 0, 1) * 1.1 + 2;
  const f = clamp(q.t / 1.0, 0, 1);
  px.disc(g, a.sx, a.gy - 6 * k, R, f < 0.25 ? '#ffe9a0' : f < 0.6 ? '#ff8a30' : '#4a3a40');
  if (f < 0.4) px.disc(g, a.sx, a.gy - 6 * k, R * 0.5, '#fff8e0');
}

// a crosshair: four ticks around a centre dot that opens with bloom and reloads, in the player's seat colour
function drawCrosshair(g, pl) {
  const col = WP.SEAT[pl.id - 1] || WP.SEAT[0];
  const gap = 3 + 7 * pl.bloom * WP.T.bloom + (pl.reload > 0 ? 3 : 0);
  const x = Math.round(pl.cx), y = Math.round(pl.cy);
  px.rect(g, x - gap - 6, y, 5, 1, col); px.rect(g, x + gap + 1, y, 5, 1, col);
  px.rect(g, x, y - gap - 6, 1, 5, col); px.rect(g, x, y + gap + 1, 1, 5, col);
  px.rect(g, x, y, 1, 1, '#ffffff');
}

// the gun in the bottom of the screen for player 1: an SMG seen over the shoulder, with recoil and the muzzle flash
function drawGun(g, p) {
  const rec = p.muzzle * 6 + (p.reload > 0 ? 6 * Math.sin(Math.min(1, p.reload) * Math.PI) : 0);
  const x = W * 0.5 + 20, y = PLAY_H - 40 + rec;
  box(g, x - 12, y, 92, 16, '#2a2c30');
  box(g, x - 14, y + 2, 16, 12, '#383a40');
  box(g, x + 56, y + 2, 26, 9, '#1a1b1e');
  box(g, x + 22, y + 14, 14, 26, '#202226');
  box(g, x + 30, y - 3, 10, 4, '#48505a');
  if (p.muzzle > 0.2) {
    const fx = x + 84, fy = y + 6, s = 4 + 10 * p.muzzle;
    px.poly(g, [[fx, fy - s], [fx + s * 1.6, fy], [fx, fy + s], [fx - s * 0.5, fy]], '#ffd060');
    px.poly(g, [[fx, fy - s * 0.5], [fx + s * 0.8, fy], [fx, fy + s * 0.5]], '#fff8e0');
  }
}

// the HUD strip: player 1's ammo and grenades, the quotas, the workers, the damage meter and the score. With more
// players, a panel for each of the others (their damage, score and streak) sits at the right.
function drawHud(g, b) {
  const p = b.p, y0 = PLAY_H, h = WP.H - PLAY_H;
  box(g, 0, y0, W, h, '#0b0814');
  box(g, 0, y0, W, 1, '#3a3050');
  const fury = p.fury > 0;
  E.font.text(g, 'MAG', 6, y0 + 2, '#c8b8ff', { shadow: '#000' });
  E.font.text(g, fury ? 'FURY' : String(p.mag).padStart(2, '0'), 6, y0 + 9, fury ? '#60b0ff' : p.mag < 6 ? '#ff6a4a' : '#ffe9a0', { scale: 2, shadow: '#000' });
  for (let i = 0; i < 8; i++) box(g, 56 + i * 6, y0 + 12, 4, 7, i < p.spares ? '#e0c060' : '#2a2430');
  E.font.text(g, 'GREN', 56, y0 + 22, '#c8b8ff', { shadow: '#000' });
  for (let i = 0; i < 8; i++) px.disc(g, 60 + i * 6, y0 + 30, 2, i < p.grenades ? '#7ac060' : '#2a2430');
  // quotas: each counter is a label, a fraction and a bar
  const q = b.quota, d = b.done;
  const labels = { soldier: 'SOLDIERS', vehicle: 'VEHICLES', boat: 'BOATS', air: 'AIR' };
  let qx = 104;
  for (const k of ['soldier', 'vehicle', 'boat', 'air']) {
    if (!q[k]) continue;
    const n = Math.min(d[k], q[k]);
    E.font.text(g, labels[k], qx, y0 + 4, '#c8b8ff', { shadow: '#000' });
    E.font.text(g, n + '/' + q[k], qx, y0 + 13, '#ffffff', { shadow: '#000' });
    box(g, qx, y0 + 24, 56, 4, '#2a2430');
    box(g, qx, y0 + 24, 56 * clamp(n / q[k], 0, 1), 4, k === 'soldier' ? '#c8e060' : k === 'vehicle' ? '#60c8e0' : '#e0a060');
    qx += 66;
  }
  // workers: a slot each; filled when a worker is on the truck, red when lost
  const hTotal = b.op.hostages.length;
  if (hTotal && qx < 300) {
    E.font.text(g, 'WORKERS', 262, y0 + 4, '#c8b8ff', { shadow: '#000' });
    for (let i = 0; i < hTotal; i++) box(g, 262 + i * 8, y0 + 15, 5, 9, i < b.saved ? '#7ae0a0' : i < b.saved + b.lost ? '#c04040' : '#3a3450');
  }
  // the damage meter: it fills as you are hit, and empties on a medical pickup
  E.font.text(g, p.down ? 'DOWN' : 'DAMAGE', 330, y0 + 4, p.down ? '#ff6a4a' : '#c8b8ff', { shadow: '#000' });
  box(g, 330, y0 + 15, 90, 8, '#2a2430');
  const dm = clamp(p.damage / 100, 0, 1);
  box(g, 330, y0 + 15, 90 * dm, 8, dm > 0.7 ? '#ff4a3a' : dm > 0.4 ? '#ffb040' : '#7ac060');
  E.font.text(g, 'SCORE', 330, y0 + 26, '#c8b8ff', { shadow: '#000' });
  E.font.text(g, String(p.score).padStart(6, '0'), 378, y0 + 26, '#ffe9a0', { shadow: '#000' });
  const mult = b.multiplier(p);
  E.font.text(g, 'x' + mult, 436, y0 + 4, mult > 1 ? '#ffe060' : '#8a7ca8', { shadow: '#000' });
  E.font.text(g, WP.rankFor(p.score), 436, y0 + 14, '#c8b8ff', { shadow: '#000' });
  E.font.text(g, p.streak >= 5 ? 'STREAK ' + p.streak : '', 436, y0 + 24, '#7ae0a0', { shadow: '#000' });
}

// the other players, in co-op: one line each at the top right, in their seat colour, with their damage and score
function drawSeats(g, b) {
  b.players.slice(1).forEach((o, i) => {
    const y = 4 + i * 11, col = WP.SEAT[o.id - 1];
    box(g, W - 142, y, 138, 9, 'rgba(8,6,16,0.7)');
    E.font.text(g, 'P' + o.id, W - 139, y + 1, o.down ? '#666' : col, { shadow: '#000' });
    box(g, W - 124, y + 3, 40, 4, '#2a2430');
    box(g, W - 124, y + 3, 40 * clamp(o.damage / 100, 0, 1), 4, o.down ? '#ff4a3a' : '#c8c0e8');
    E.font.text(g, o.down ? 'DOWN' : String(o.score).padStart(6, '0'), W - 80, y + 1, '#ffffff', { shadow: '#000' });
  });
}

// the popups that float up from a hit, the damage flash that washes the screen red, and the night and the storm
function drawFx(g, b) {
  for (const q of b.popups) {
    const y = q.y - q.t * 26;
    E.font.text(g, q.text, q.x, y, q.color || '#ffffff', { align: 'center', shadow: '#000' });
  }
  const p = b.p;
  if (p.dmgFlash > 0) px.blend(g, 0.35 * p.dmgFlash, 'normal', () => box(g, 0, 0, W, PLAY_H, '#ff1a10'));
  if (p.hitFlash > 0.6) px.blend(g, 0.12, 'add', () => box(g, 0, 0, W, PLAY_H, '#ffffff'));
  if (b.op.night) {
    px.blend(g, 0.55, 'multiply', () => box(g, 0, 0, W, PLAY_H, '#3a4a78'));
    // the searchlights: a pool of light at each mast
    for (const d of b.decor) if (d.kind === 'mast') {
      const a = proj(d.x, d.z, b.camX);
      if (a.sx > -80 && a.sx < W + 80) px.blend(g, 0.18, 'add', () => px.disc(g, a.sx, a.gy - 96 * a.k, 26 * a.k, '#ffe9a0'));
    }
  }
  if (b.op.storm) {
    for (let i = 0; i < 46; i++) {
      const x = (i * 97 + b.t * 260) % W, y = (i * 53 + b.t * 420) % PLAY_H;
      px.line(g, x, y, x - 3, y + 6, 'rgba(200,220,255,0.5)', 1);
    }
  }
}

// the whole frame: the world, then the sprites far to near, then the crosshairs and the HUD
WP.drawBattle = (g, b) => {
  drawWorld(g, b);
  const items = [];
  for (const d of b.decor || []) items.push({ z: d.z, fn: () => drawScenery(g, b, d) });
  for (const e of b.ents) {
    if (e.gone) continue;
    items.push({ z: e.z, fn: () => { drawEntity(g, b, e); if (!e.dead) drawRing(g, b, e); } });
  }
  items.sort((p, q) => q.z - p.z);
  for (const it of items) it.fn();
  for (const q of b.booms) drawBoom(g, b, q);
  for (const gr of b.grens) {
    const f = clamp(gr.t / gr.dur, 0, 1), sx = W * 0.5 + (gr.sx - W * 0.5) * f, sy = PLAY_H + (gr.sy - PLAY_H) * f - Math.sin(f * Math.PI) * 80;
    px.disc(g, sx, sy, 3, '#3a4a2a'); px.disc(g, sx, sy, 1.5, '#9ac060');
  }
  drawGun(g, b.p);
  for (const pl of b.players) if (!pl.down) drawCrosshair(g, pl);
  drawFx(g, b);
  drawSeats(g, b);
  drawHud(g, b);
};
})();
