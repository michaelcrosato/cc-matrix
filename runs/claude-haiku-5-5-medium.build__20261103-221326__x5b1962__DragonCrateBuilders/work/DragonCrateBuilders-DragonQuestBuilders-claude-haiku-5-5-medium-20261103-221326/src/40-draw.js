// Painting: the sky by the hour, the block world, the town border, the cursor on the block in front, the characters
// (the Builder, the residents, the monsters, Gnarlgrim) with their shadows and lights, the HUD, and the About pages.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = DQ.T;

const SKY = {
  day: ['#7cc8ff', '#d9f0ff'], dusk: ['#f4a46a', '#ffd6a0'], night: ['#141a3a', '#26305e'],
};
DQ.skyFor = hour => {
  if (hour >= 19 && hour < 21) return SKY.dusk;
  if (hour >= 21 || hour < 5.5) return SKY.night;
  if (hour >= 5.5 && hour < 7) return SKY.dusk;
  return SKY.day;
};

// the stitched border of the town: a line of patches round the Banner, as wide as the town level allows
const borderRadius = p => (DQ.LEVELS[Math.max(0, p.townLevel - 1)] || { border: 5 }).border;
DQ.drawBorder = (r, p) => {
  if (!p.banner) return;
  const R = borderRadius(p), bx = p.banner.x, by = p.banner.y;
  const t = DQ.game.time || 0, pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  const col = pulse > 0.5 ? '#9fe3ff' : '#69b8ec';
  for (let x = bx - R; x <= bx + R; x++) for (let y = by - R; y <= by + R; y++) {
    if (Math.max(Math.abs(x - bx), Math.abs(y - by)) !== R) continue;
    if (x < 0 || y < 0 || x >= p.world.W || y >= p.world.D) continue;
    const z = p.world.top(x, y);
    r.queue((x + 0.5) * T, (y + 0.5) * T, z * T, g => {
      const c = [r.w(x * T, y * T, z * T), r.w((x + 1) * T, y * T, z * T), r.w((x + 1) * T, (y + 1) * T, z * T), r.w(x * T, (y + 1) * T, z * T)];
      px.poly(g, c, col);
    }, { emissive: true });
  }
};

// the block in front, outlined: where a press would break or place
DQ.drawTarget = (r, p) => {
  const t = p.target; if (!t) return;
  const z = (t.cz + 1) * T;
  const col = t.placeOK ? '#ffffff' : '#ffb0b0';
  r.queue((t.cx + 0.5) * T, (t.cy + 0.5) * T, z, g => {
    const c = [r.w(t.cx * T, t.cy * T, z), r.w((t.cx + 1) * T, t.cy * T, z), r.w((t.cx + 1) * T, (t.cy + 1) * T, z), r.w(t.cx * T, (t.cy + 1) * T, z)];
    for (let i = 0; i < 4; i++) px.line(g, c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], col, 1);
  }, { emissive: true });
};

// the lanterns and the Builder's own lantern-light, every frame (the lights are per draw)
DQ.drawLights = (r, p) => {
  const b = p.builder, cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), R = 14;
  if (p.lanternsAt !== p.world.edits) {
    p.lanternsAt = p.world.edits; p.lanterns = [];
    for (let x = 0; x < p.world.W; x++) for (let y = 0; y < p.world.D; y++) for (let z = 0; z < p.world.H; z++) if (p.world.get(x, y, z) === DQ.B.LANTERN) p.lanterns.push([x, y, z]);
  }
  for (const [x, y, z] of p.lanterns) {
    if (Math.abs(x - cx) > R || Math.abs(y - cy) > R) continue;
    DQ.game.lights.add((x + 0.5) * T, (y + 0.5) * T, (z + 0.5) * T, 56, 0.9, { color: '#ffd27a' });
  }
  DQ.game.lights.add(b.x, b.y, b.z + 18, 34, 0.5, { color: '#fff1c8' });
};

// the stitch animation: a needle runs round the top edge of a block just placed, leaving a thread behind it
DQ.drawFx = r => {
  const S = DQ.session, p = S && S.play; if (!p) return;
  for (const f of p.fx) {
    if (f.type === 'bolt') {
      // a ballista's bolt: a bright line from the turret to its mark, fading
      r.queue(f.to[0], f.to[1], f.to[2], g => {
        const a = r.w(f.from[0], f.from[1], f.from[2]), b = r.w(f.to[0], f.to[1], f.to[2]);
        px.line(g, a[0], a[1], b[0], b[1], f.t > f.max / 2 ? '#fff6e0' : '#ffd27a', 1);
      }, { emissive: true });
      continue;
    }
    const u = 1 - f.t / f.max, z = (f.z + 1) * T;
    r.queue((f.x + 0.5) * T, (f.y + 0.5) * T, z, g => {
      const c = [r.w(f.x * T, f.y * T, z), r.w((f.x + 1) * T, f.y * T, z), r.w((f.x + 1) * T, (f.y + 1) * T, z), r.w(f.x * T, (f.y + 1) * T, z)];
      const s = u * 4, k = Math.floor(s) % 4, a = c[k], b = c[(k + 1) % 4], q = s - Math.floor(s);
      const nx = a[0] + (b[0] - a[0]) * q, ny = a[1] + (b[1] - a[1]) * q;
      for (let i = 0; i < 4; i++) px.line(g, c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], '#fff6e0', 1);
      px.rect(g, Math.round(nx) - 1, Math.round(ny) - 1, 3, 3, '#ffe27a');
    }, { emissive: true });
  }
};

// the frame: the world, the things in it, the lights, and (unless attract) the HUD
DQ.drawPlay = (r, attract) => {
  const S = DQ.session, p = S && S.play;
  if (!p) { r.sky(SKY.day); return; }
  r.sky(DQ.skyFor(p.hour));
  DQ.drawWorld(r, p.world, p.builder.x / T, p.builder.y / T, 13);
  DQ.drawBorder(r, p);
  DQ.drawTarget(r, p);
  DQ.drawFx(r);
  const things = [];
  for (const m of p.monsters) if (!m.dead) things.push(m);
  for (const res of p.residents) things.push(res);
  for (const b of p.remotes.values()) things.push(b);
  if (!p.serverOnly) things.push(p.builder);
  for (const t of things) {
    if (t === p.builder && !p.builder.alive) continue;
    r.shadow(t.x, t.y, t.hw ? t.hw * 1.6 : 6, 0.35, undefined, t.z);
    r.actor(t.x, t.y, t.z, (g, ox, oy) => t.rig.draw(g, ox, oy, r.view), { flash: t.hurt > 0 ? '#ff8a9a' : undefined, flashMix: 0.6 });
  }
  // the cheer hearts over the residents who've just been thanked
  for (const res of p.residents) if (res.cheerT > 0) r.textAt(res.x, res.y, res.z + 52, '♥', '#ff9ad0', { scale: 2 });
  // the ghosts of the patterns still to build: outlines of each empty cell
  for (const pat of p.patterns) for (const c of pat.cells) {
    if (p.world.get(c.x, c.y, c.z) !== 0) continue;
    r.queue((c.x + 0.5) * T, (c.y + 0.5) * T, (c.z + 0.5) * T, g => {
      const x0 = c.x * T, y0 = c.y * T, z0 = c.z * T, x1 = x0 + T, y1 = y0 + T, z1 = z0 + T;
      const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(q => r.w(q[0], q[1], q[2]));
      const E12 = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [a, b] of E12) px.line(g, P[a][0], P[a][1], P[b][0], P[b][1], '#9fe3ff', 1);
    }, { emissive: true });
  }
  DQ.drawLights(r, p);
  if (!attract) DQ.drawHUD(r, p);
};

// the About & Credits pages, as text (see the report module for the words)
DQ.drawAbout = r => {
  const page = DQ.REPORT_PAGES[DQ.aboutPage || 0];
  r.overlay(g => {
    E.font.title(g, 'ABOUT & CREDITS', r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ffe27a', '#ffb3d9'] });
    E.ui.box(g, 10, 34, r.W - 20, r.H - 48, { bg: ['#1c1a34', '#0e0c1c'], border: '#d9b77c', alpha: 0.95 });
    E.font.text(g, page.title + '   (' + (DQ.aboutPage + 1) + '/' + DQ.REPORT_PAGES.length + ')', 18, 42, '#ffe27a', { shadow: '#000' });
    let y = 58;
    for (const line of page.lines) {
      const wrapped = E.font.wrap ? E.font.wrap(line, r.W - 44, { font: 'tiny' }) : [line];
      for (const w of wrapped) { E.font.text(g, w, 18, y, '#e8e4ff', { shadow: '#000', font: 'tiny' }); y += 9; }
      y += 2;
    }
    E.font.text(g, 'Left/right turn pages. Confirm or cancel leaves.', 18, r.H - 22, '#9c96c4', { shadow: '#000', font: 'tiny' });
  });
};
})();
