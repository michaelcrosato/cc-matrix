/* ---- PRESENTATION: the stadium, the crowd, the posts, the players' rigs, the ball. Reads the match state only ---- */
E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);
TT.VIEW_IDS = ['broadcast', 'threequarter', 'topdown'];
/* behind the kicker: the posts straight up the screen (one view for each end) */
E.VIEWS.postsE = new E.View('postsE', 'Kicker', 270, 26, 1, 1);
E.VIEWS.postsW = new E.View('postsW', 'Kicker', 90, 26, 1, 1);
TT.pres = { rigs: [], maps: {}, crowd: null, t: 0 };
const PR = TT.pres;

/* ---- the stadium as a TileMap: a three-tier stand on the far side, stands behind each dead-ball line, boards on the
 * near side (they cut low when they would hide play) ---- */
function stadiumRows() {
  const rows = [];
  for (let r = 0; r < G.ROWS; r++) {
    let s = '';
    for (let c = 0; c < G.COLS; c++) {
      const x = c * 16 + 8, y = r * 16 + 8;
      if (r <= 2) s += ['5', '4', '3'][r];
      else if (r <= 44 && (c <= 1 || c >= G.COLS - 2)) s += c === 0 || c === G.COLS - 1 ? '6' : '7';
      else if (r === 45) s += c > 1 && c < G.COLS - 2 && !(c >= 42 && c <= 44) ? '8' : '.';
      else if (r > 45) s += ',';
      else if (x > G.X0 && x < G.X1 && y > G.Y0 && y < G.Y1) s += 'g';
      else if (x > G.DEAD[0] && x < G.DEAD[1] && y > G.Y0 && y < G.Y1) s += 'i';
      else s += 'a';
    }
    rows.push(s);
  }
  return rows;
}
const lineAt = (x, y) => {
  const near = (v, a, w = 1.1) => Math.abs(v - a) < w;
  const inF = y > G.Y0 - 1 && y < G.Y1 + 1, inX = x > G.DEAD[0] - 1 && x < G.DEAD[1] + 1;
  if (inF && (near(x, G.X0) || near(x, G.X1) || near(x, G.DEAD[0]) || near(x, G.DEAD[1]))) return 1;
  if (inX && (near(y, G.Y0) || near(y, G.Y1))) return 1;
  if (inF && (near(x, G.CX) || near(x, G.L22[0]) || near(x, G.L22[1]))) return 1;
  const dash = Math.floor(y / 16) % 2 === 0, dashX = Math.floor(x / 16) % 2 === 0;
  if (inF && dash && (near(x, G.L10[0]) || near(x, G.L10[1]) || near(x, G.L5[0]) || near(x, G.L5[1]))) return 1;
  if (x > G.X0 && x < G.X1 && dashX && (near(y, G.Y0 + 51) || near(y, G.Y1 - 51) || near(y, G.Y0 + 154) || near(y, G.Y1 - 154))) return .7;
  return 0;
};
function makeMap(venue, homeKit) {
  const gr = venue.grass, hc = E.hex(homeKit.cloth);
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
    if (tag === 'out') return [46 + n * 16, 44 + n * 16, 50 + n * 16];
    const l = tag !== 'apron' || true ? lineAt(x, y) : 0;
    if (l) { const w = 214 + n * 30 + m * 10; return [w, w + 3, w - 6].map(v => v * (l < 1 ? .9 : 1)); }
    const k = Math.floor((x - G.X0) / 32) % 2 ? 1.1 : .92, wear = Math.max(0, 1 - Math.abs(y - G.CY) / 300) * (Math.abs(x - G.CX) < 120 ? .12 : .04);
    let r = gr[0] * k + n * 18 + m * 14, g2 = gr[1] * k + n * 26 + m * 20, b = gr[2] * k + n * 14 + m * 10;
    if (tag === 'ingoal') { const st = (Math.floor((x + y) / 24) % 2) ? .1 : 0; r = lerp(r, hc[0], .14 + st); g2 = lerp(g2, hc[1], .14 + st); b = lerp(b, hc[2], .14 + st); }
    if (tag === 'apron') { r *= .78; g2 *= .8; b *= .78; }
    r = lerp(r, 120, wear); g2 = lerp(g2, 96, wear); b = lerp(b, 60, wear);
    return [r, g2, b];
  };
  const S = venue.standSide, Tp = venue.standTop, S2 = E.shade(S, -.12), S3 = E.shade(S, -.22);
  return new E.TileMap({
    rows: stadiumRows(), floorTex, outside: '#141218', ao: 4,
    legend: { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, g: { floor: 'grass' }, i: { floor: 'ingoal' }, a: { floor: 'apron' }, '.': { floor: 'apron' }, ',': { floor: 'out' } },
    types: {
      3: { h: 34, face: venue.stand, side: S, top: Tp }, 4: { h: 46, face: venue.stand, side: S2, top: Tp }, 5: { h: 58, face: venue.stand, side: S3, top: Tp },
      6: { h: 52, face: venue.stand, side: S, top: Tp }, 7: { h: 36, face: venue.stand, side: S, top: Tp },
      8: { h: 14, cut: true, cutH: 4, face: 'plank', side: '#2a3450', top: '#d8dce8' }
    }
  });
}
TT.pres.map = (venue, kit) => { const k = venue.id + kit.cloth; return PR.maps[k] || (PR.maps[k] = makeMap(venue, kit)); };

/* ---- the crowd: two on each stand tile, in both teams' colours (home 70%), bobbing; up on scores, down on cards ---- */
function makeCrowd(kits) {
  const out = [];
  const tiers = [[0, 58], [1, 46], [2, 34]];
  for (const [r, z] of tiers) for (let c = 0; c < G.COLS; c++) for (const dx of [4, 12]) {
    const h = E.hash2(c * 7 + dx, r * 13 + 3);
    out.push({ x: c * 16 + dx, y: r * 16 + 8, z, side: h < .7 ? 0 : 1, h, ph: h * 9 });
  }
  for (let r = 3; r <= 44; r++) for (const c of [0, 1, G.COLS - 2, G.COLS - 1]) for (const dy of [5, 12]) {
    const h = E.hash2(c * 5 + dy, r * 11 + 1);
    out.push({ x: c * 16 + 8, y: r * 16 + dy, z: c === 0 || c === G.COLS - 1 ? 52 : 36, side: h < .7 ? 0 : 1, h, ph: h * 7 });
  }
  const skins = Object.values(SKIN);
  for (const f of out) { const kit = kits[f.side]; f.shirt = f.h * 10 % 1 < .7 ? kit.cloth : (f.h * 17 % 1 < .5 ? kit.trim : '#e8e4dc'); f.skin = skins[Math.floor(f.h * 50) % skins.length]; f.hair = ['#2a1a10', '#6a4a2a', '#c8a050', '#1a1410', '#a0a0a0'][Math.floor(f.h * 31) % 5]; f.flag = f.h * 97 % 1 < .06; }
  return out;
}

/* ---- the rigs: one Humanoid per player, dressed in the kit, its own hair, skin, build and headgear ---- */
function rigFor(p, kit) {
  const d = p.data;
  return new E.Humanoid({ weapon: null, build: d.build, size: d.size * .95, hair: d.hair, hat: d.hat || undefined, outfit: 'shirt', sleeves: 'short', hunch: d.hunch || 0,
    colors: { cloth: kit.cloth, trim: kit.trim, pants: kit.pants, boot: kit.boot, belt: kit.trim, hair: d.hairColor, skin: d.skin }, speedRef: 80 });
}
TT.pres.rigFor = rigFor;
TT.pres.setup = m => {
  PR.rigs = m.players.map(p => rigFor(p, m.kits[p.team]));
  PR.baseC = PR.rigs.map(r => ({ cloth: r.C.cloth, pants: r.C.pants }));
  PR.ref = new E.Humanoid(Object.assign({ weapon: null }, TT.CAST.nigel.o));
  PR.crowd = makeCrowd(m.kits);
  PR.chicken = new E.Blob({ R: 13, colors: { dk: '#c8b878', base: '#f4f0e0', lt: '#ffffff', spec: '#ffffff', eye: '#141010', pupil: '#000' }, wings: true, feet: true, mouth: true });
  PR.cheer = 0; PR.boo = 0; PR.scorer = -1;
  PR.cur = TT.pres.map(m.venue, m.kits[0]);
  PR.lastAnim = {};
};
const MUD = E.hex('#5a3a1e');
const mixHex = (a, b, k) => { const A = E.hex(a); return '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], b[i], k)).toString(16).padStart(2, '0')).join(''); };

/** what a player's rig shows: from his state (and his anim timers) */
function rigState(p, m) {
  const s = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing };
  const t = p.stT;
  switch (p.st) {
    case 'tackled': case 'ground': s.down = 1; s.hurt = p.st === 'tackled'; break;
    case 'stunned': s.down = p.zapped > 0 || p.toasted > 0 ? 1 : .0; s.hurt = true; break;
    case 'getup': s.down = clamp(1 - t / .45, 0, 1); break;
    case 'diving': s.down = 1; s.z = p.z + 3; break;
    case 'launched': s.air = true; s.hurt = true; s.flip = (t * 1.6) % 1; s.expr = 'wince'; break;
    case 'ruck': s.pose = 'crouch'; s.run = 1; s.expr = 'angry'; break;
    case 'scrum': s.pose = 'crouch'; s.run = m.sub === 'push' ? 1 : 0; s.expr = 'angry'; break;
    case 'lift': s.pose = 'cheer'; s.air = true; break;
    case 'celebrate': s.pose = ['cheer', 'hips', 'guard', 'wave', 'cheer', 'kneel'][p.celeb]; s.expr = 'shout'; break;
    case 'pass': s.attack = E.move('cast', clamp(t / .22, 0, 1), t < .06 ? 'wind' : t < .14 ? 'active' : 'recover'); break;
    case 'kick': s.attack = E.move('kick', clamp(t / .35, 0, 1), t < .08 ? 'wind' : t < .18 ? 'active' : 'recover'); break;
    case 'fend': s.attack = E.move('jab', clamp(t / .45, 0, 1), t < .05 ? 'wind' : t < .3 ? 'active' : 'recover'); s.expr = 'angry'; break;
    case 'charge': s.stance = 'guard'; s.expr = p.charge > 1.2 ? 'shout' : 'angry'; s.sprint = true; break;
    case 'tackling': s.attack = E.move('bash', clamp(t / .35, 0, 1), t < .1 ? 'active' : 'recover'); s.down = clamp((t - .15) / .2, 0, 1); break;
    case 'sidestep': s.sprint = true; break;
    case 'spin': s.attack = E.move('spin', clamp(t / .45, 0, 1), 'active'); break;
    case 'held': s.run = 1; s.expr = 'shout'; break;
    case 'binned': s.pose = 'kneel'; s.expr = 'angry'; break;
  }
  if (p.flex && p.st === 'run' && t < 1) { s.pose = 'guard'; s.expr = 'shout'; } else p.flex = 0;
  if (p.turboOn) s.sprint = true;
  if (m.phase === 'kickoff' && m.ph.kicker === p.id) s.pose = 'crouch';
  if (m.phase === 'setkick' && m.ph.kicker === p.id && (m.sub === 'aim' || m.sub === 'place')) s.pose = 'crouch';
  return s;
}
TT.pres.rigState = rigState;

/** each update: rigs follow the state; the crowd's mood; kit mud */
TT.pres.update = (dt, m) => {
  PR.t += dt; PR.cheer = Math.max(0, PR.cheer - dt); PR.boo = Math.max(0, PR.boo - dt);
  if (!m || !PR.rigs.length) return;
  m.players.forEach((p, i) => {
    const rig = PR.rigs[i]; if (!rig) return;
    if (p.st === 'off') return;
    rig.update(dt, rigState(p, m));
    if (p.mud > .02) { rig.C.cloth = mixHex(PR.baseC[i].cloth, MUD, p.mud); rig.C.pants = mixHex(PR.baseC[i].pants, MUD, p.mud * .8); }
  });
  const r = m.ref;
  PR.ref.update(dt, { x: r.x, y: r.y, z: 0, vx: r.vx, vy: r.vy, facing: r.facing, down: r.down > 0 ? 1 : 0, hurt: r.down > 0, pose: r.signalT > 0 ? (r.signal === 'try' || r.signal === 'adv' ? 'wave' : 'cast') : (r.cardT > 0 ? 'cheer' : null) });
  for (const h of m.hazards) if (h.kind === 'chicken') PR.chicken.update(dt, { walk: 1, flap: 1, squash: Math.sin(PR.t * 20) * .15 });
};

/* ---- the oval ball (laces and panels), cached at 16 turns ---- */
const BALL_SPR = E.sprite(['..bbbbb..', '.bwwbwwb.', 'bbbwwwbbb', '.bwwbwwb.', '..bbbbb..'], { b: '#8a4a22', w: '#f0e8d8' });
const BALL_SPR2 = E.sprite(['...bbb...', '..bbwbb..', '.bbbwbbb.', '..bbwbb..', '...bbb...'], { b: '#8a4a22', w: '#f0e8d8' });

/* ---- skylines: each venue's silhouettes above the far stand ---- */
function drawSkyline(r, m) {
  const v = m.venue, sky = v.sky;
  const tod = m.o.time && m.o.time !== 'venue' ? m.o.time : v.time;
  const skyCols = tod === 'day' ? sky : tod === 'dusk' ? ['#2a2048', '#c8504a', '#f0a050'] : ['#05040c', '#141030', '#2a1a40'];
  r.sky(v.time === tod ? sky : skyCols);
  const [, topY] = r.w(G.CX, 0, 58);
  const baseY = Math.round(topY) + 2;
  PR.skyY = baseY;
  const W = r.W, ox = -r.w(0, 0, 0)[0];
  const t = PR.t;
  const draw = gg => {
    const col = tod === 'day' ? '#56606a' : tod === 'dusk' ? '#3a2438' : '#10101c';
    const col2 = tod === 'day' ? '#6a747c' : tod === 'dusk' ? '#4a2c40' : '#181828';
    if (v.skyline === 'hills') {
      for (let x = 0; x < W; x += 2) { const wx = x + ox * .3, h = 16 + Math.sin(wx * .012) * 8 + Math.sin(wx * .031) * 4; px.rect(gg, x, baseY - h, 2, h, col2); }
      const sx = Math.round(W * .7 - ox * .3 % W); px.rect(gg, sx, baseY - 40, 4, 24, col); px.poly(gg, [[sx - 1, baseY - 40], [sx + 2, baseY - 54], [sx + 5, baseY - 40]], col);
    } else if (v.skyline === 'docks') {
      for (let i = 0; i < 6; i++) { const cx = Math.round((i * 120 - ox * .4) % (W + 120)) - 40; px.rect(gg, cx, baseY - 50, 3, 50, col); px.rect(gg, cx - 18, baseY - 50, 40, 3, col); px.line(gg, cx + 20, baseY - 48, cx + 20, baseY - 30, col, 1); }
      const lx = Math.round(W * .85 - (ox * .2) % W); px.rect(gg, lx, baseY - 44, 6, 44, '#e8e0d0'); px.rect(gg, lx, baseY - 36, 6, 4, '#c83a2a'); px.rect(gg, lx - 1, baseY - 48, 8, 4, '#2a2a30');
      if (Math.sin(t * 2) > 0) px.rect(gg, lx + 1, baseY - 47, 4, 2, '#fff0a0');
      for (let i = 0; i < 5; i++) { const gx = Math.round((t * (20 + i * 5) + i * 90) % W), gy = baseY - 70 - i * 6 + Math.sin(t * 3 + i) * 3; px.line(gg, gx - 3, gy, gx, gy + 2, '#e8e8e8', 1); px.line(gg, gx, gy + 2, gx + 3, gy, '#e8e8e8', 1); }
    } else if (v.skyline === 'chimneys') {
      for (let i = 0; i < 7; i++) { const cx = Math.round((i * 90 - ox * .35) % (W + 90)) - 20, h = 40 + (i * 37 % 30); px.rect(gg, cx, baseY - h, 10, h, col); px.rect(gg, cx - 1, baseY - h, 12, 3, '#2a1818'); }
      px.blend(gg, .35, 'add', () => px.rect(gg, 0, baseY - 30, W, 30, '#6a1808'));
    } else if (v.skyline === 'city') {
      for (let i = 0; i < 14; i++) { const cx = Math.round((i * 46 - ox * .3) % (W + 46)) - 20, h = 30 + (i * 53 % 50); px.rect(gg, cx, baseY - h, 30, h, col); for (let wy = baseY - h + 4; wy < baseY - 4; wy += 6) for (let wx = cx + 3; wx < cx + 27; wx += 6) if (E.hash2(wx + i, wy) > .55) px.rect(gg, wx, wy, 2, 2, '#e8c860'); }
      const sx = Math.round(W * .4 - (ox * .3) % W); E.font.text(gg, 'GOLDBRICK HOLDINGS', sx, baseY - 92, '#e8c040', { outline: false, shadow: '#3a1a5a' });
    }
  };
  PR.drawSky = draw;
}

/* ---- the frame: sky and skyline, pitch and stands, crowd, posts, props, players, ball ---- */
TT.pres.drawWorld = (r, m) => {
  if (!m || !PR.cur) return;
  const v = m.venue, tod = m.o.time && m.o.time !== 'venue' ? m.o.time : v.time;
  drawSkyline(r, m);
  // the skyline sits behind the stand: drawn first, straight onto the buffer
  if (PR.drawSky && r.tgt) PR.drawSky(r.tgt);
  PR.cur.drawFloor(r);
  // mud patches, scorch marks, flame grates
  for (const md of m.mud) r.groundDisc(md.x, md.y, md.r, '#4a3018', .55 * md.k);
  for (const md of m.mud) r.groundDisc(md.x + 6, md.y - 4, md.r * .5, '#6a7a8a', .25);
  for (const s of (m.scorch || [])) r.groundDisc(s[0], s[1], 20, '#141010', .6);
  if (v.hazard === 'flames') for (const gr of TT.FLAME_GRATES) { r.groundDisc(gr.x, gr.y, 9, '#2a2a2a', 1); r.groundDisc(gr.x, gr.y, 6, '#7a2a10', .8); }
  PR.cur.queueWalls(r);
  // the crowd
  const scoreT = PR.cheer, booT = PR.boo, wave = m.phase !== 'play' && m.phaseT > 8;
  for (const f of PR.crowd) {
    let up = Math.sin(PR.t * 2 + f.ph) * .6;
    if (scoreT > 0 && f.side === PR.cheerSide) up = Math.abs(Math.sin(PR.t * 9 + f.ph)) * 5;
    if (wave) { const w = Math.sin(f.x * .02 - PR.t * 4); if (w > .85) up += 5; }
    if (booT > 0 && f.side !== PR.cheerSide) up = -1;
    const z = f.z + up;
    r.queue(f.x, f.y, z, g => {
      const [x, y] = r.w(f.x, f.y, z), X = Math.round(x), Y = Math.round(y);
      px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); px.rect(g, X - 1, Y - 9, 3, 1, f.hair);
      if (scoreT > 0 && f.side === PR.cheerSide) { px.rect(g, X - 3, Y - 10, 1, 4, f.skin); px.rect(g, X + 2, Y - 10, 1, 4, f.skin); }
      if (f.flag) { px.rect(g, X + 2, Y - 14, 1, 10, '#d8d8d8'); px.rect(g, X + 3, Y - 14, 6, 4, f.shirt); }
    });
  }
  // the posts on each try line, pads in the home colours
  for (const tl of [G.X0, G.X1]) {
    for (const py of [G.CY - G.POST, G.CY + G.POST]) r.queue(tl, py, 0, g => {
      const [x, y] = r.w(tl, py, 0), [, y1] = r.w(tl, py, G.UPRIGHT), [, yp] = r.w(tl, py, 20);
      px.rect(g, Math.round(x) - 1, Math.round(y1), 2, Math.round(y - y1), '#f4f4f0'); px.rect(g, Math.round(x), Math.round(y1), 1, Math.round(y - y1), '#c8c8c8');
      px.rect(g, Math.round(x) - 3, Math.round(yp), 6, Math.round(y - yp), m.kits[0].cloth); px.rect(g, Math.round(x) - 3, Math.round(yp), 2, Math.round(y - yp), m.kits[0].trim);
    });
    r.queue(tl, G.CY + G.POST, G.BAR, g => { const [x0, y0] = r.w(tl, G.CY - G.POST, G.BAR), [x1, y1] = r.w(tl, G.CY + G.POST, G.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
    for (const cy of [G.Y0, G.Y1]) for (const cx of [tl, tl + (tl === G.X0 ? -G.IN : G.IN)]) r.queue(cx, cy, 0, g => { const [x, y] = r.w(cx, cy, 0); px.rect(g, Math.round(x), Math.round(y) - 12, 1, 12, '#e8e8e8'); px.rect(g, Math.round(x) + 1, Math.round(y) - 12, 4, 3, cx === tl ? '#e83a3a' : '#f0e040'); });
  }
  // sponsor boards on the near side: text on their faces
  const boards = v.boards;
  for (let i = 0; i < 9; i++) {
    const bx = 48 + i * 152, by = 45 * 16 + 1;
    r.queue(bx + 60, by, 8, g => { const [x, y] = r.w(bx + 60, by, 8); E.font.text(g, boards[i % boards.length], Math.round(x), Math.round(y) - 4, i % 2 ? '#ffe070' : '#ffffff', { align: 'center', outline: '#101020', font: 'tiny' }); }, { bias: 2 });
  }
  // props: benches, water bottles, kit bags, cones, the sin bin, cameramen, floodlights
  r.shape('bench', G.CX - 140, G.Y1 + 34, 0, { scale: 1.3 }); r.shape('bench', G.CX + 200, G.Y1 + 34, 0, { scale: 1.3 });
  for (let i = 0; i < 4; i++) r.prop('crate', G.CX - 260 + i * 160, G.Y1 + 26, 0, { size: .8 });
  for (const cx of [G.X0 + 150, G.X1 - 150]) r.prop('barrel', cx, G.Y1 + 36, 0, { size: .7, color: '#3a8ad0' });
  drawSinBin(r, m);
  if (tod !== 'day') for (const [fx, fy] of [[40, 40], [G.COLS * 16 - 40, 40], [40, G.Y1 + 50], [G.COLS * 16 - 40, G.Y1 + 50]]) {
    r.queue(fx, fy, 0, g => { const [x, y] = r.w(fx, fy, 0), [, yt] = r.w(fx, fy, 150); px.rect(g, Math.round(x) - 1, Math.round(yt), 3, Math.round(y - yt), '#5a5a64'); px.rect(g, Math.round(x) - 9, Math.round(yt) - 6, 19, 7, '#3a3a44'); for (let k = 0; k < 4; k++) px.rect(g, Math.round(x) - 8 + k * 5, Math.round(yt) - 5, 3, 4, '#fff8d0'); }, { emissive: true });
    TT.game.lights.add(fx, fy, 150, 420, .9, { color: '#fff4d8' });
  }
  if (tod !== 'day') { TT.game.lights.add(G.CX, G.CY, 60, 700, .55, { color: '#f8f0e0' }); TT.game.lights.add(G.X0 + 200, G.CY, 60, 500, .4); TT.game.lights.add(G.X1 - 200, G.CY, 60, 500, .4); }
  drawActors(r, m);
};
function drawSinBin(r, m) {
  const { x: bx, y: by } = G.BIN;
  r.queue(bx, by, 0, g => {
    const [x, y] = r.w(bx, by, 0), [, yt] = r.w(bx, by, 18), X = Math.round(x), Y = Math.round(y), H = Math.round(y - yt);
    px.rect(g, X - 16, Y - H, 32, H, '#2a6a3a'); px.rect(g, X - 16, Y - H, 32, 2, '#3a8a4a'); px.rect(g, X - 17, Y - H - 2, 34, 3, '#1e4a2a');
    E.font.text(g, 'SIN BIN', X, Y - H + 4, '#e8e8d0', { align: 'center', font: 'tiny', outline: false });
  });
  m.players.filter(p => p.st === 'binned').forEach((p, i) => {
    const rig = PR.rigs[p.id]; if (!rig) return;
    r.actor(bx - 8 + i * 8, by - 2, 4, (g, ox, oy) => rig.draw(g, ox, oy, E.charView(r.view)));
  });
}

/** the players, the referee, the chicken, the ball, the power-up, every marker on the grass */
function drawActors(r, m) {
  const view = E.charView(r.view);
  const b = m.ball;
  // the referee's eyes on the grass (Settings, Show the ref's view)
  if (TT.settings.refCone !== false && TT.settings.refCone !== 'Off' && m.ref.down <= 0 && (m.phase === 'play' || m.phase === 'ruck') || PR.dbg && PR.dbg.cone) r.sightCone({ x: m.ref.x, y: m.ref.y, facing: m.ref.facing }, { range: TUNE.v.refRange, fov: TUNE.v.refFov, alpha: .12, color: '#fff0a0' });
  // the landing marker of every kick in the air
  if (b.st === 'air' && b.landing && b.kind !== 'pass') { const k = (Math.sin(PR.t * 10) + 1) / 2; r.groundRing(b.landing.x, b.landing.y, 8 + k * 3, '#ffe060', .8); r.groundRing(b.landing.x, b.landing.y, 3, '#ffffff', .8); }
  // offside lines at rucks, scrums and lineouts
  if (m.phase === 'ruck' || m.phase === 'scrum' || (m.phase === 'lineout')) {
    for (const t of [0, 1]) {
      const d = dirOf(t), lx = m.phase === 'ruck' ? b.x - d * (t === m.ph.team ? 12 : -12) * -1 : (m.phase === 'scrum' ? m.ph.cx - d * 20 : m.ph.x - d * 51);
      const col = m.kits[t].cloth;
      r.decal(g => { for (let y = G.Y0; y < G.Y1; y += 12) { const [x0, y0] = r.w(lx, y, 0), [x1, y1] = r.w(lx, y + 6, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col, 1); } });
    }
  }
  // the use-it ring
  if (m.useIt) { const u = m.useIt; r.groundRing(u.x, u.y, 16 - u.t * 3, u.t > 2 ? '#ff5040' : '#ffe080', .8); }
  // seats' rings and chevrons
  TT.seats.forEach((s, i) => {
    if (s.pid < 0) return; const p = m.players[s.pid]; if (!p || p.st === 'binned' || p.st === 'off') return;
    r.groundRing(p.x, p.y, 9, s.color, .9); r.groundRing(p.x, p.y, 10, s.color, .5);
    r.queue(p.x, p.y, 56 * p.data.size, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size + 8), X = Math.round(x), Y = Math.round(y); px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], s.color); E.font.text(g, s.label, X, Y - 13, s.color, { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true, bias: 50 });
  });
  // the pass badges over the two receivers (L1 up the screen, R1 down)
  const h = b.st === 'held' ? m.players[b.holder] : null;
  if (h && h.ctl >= 0 && m.phase === 'play') {
    const seat = TT.seats[h.ctl], I = seat && seat.input;
    for (const side of [-1, 1]) {
      const list = receivers(h, side); const q = list.filter(x => Math.abs(x.y - h.y) < 110)[0] || list[0];
      if (q) r.queue(q.x, q.y, 50, g => { const [x, y] = r.w(q.x, q.y, 40 * q.data.size + 6); TT.glyph(g, side < 0 ? 'l1' : 'r1', Math.round(x), Math.round(y) - 6, I, true); }, { emissive: true, bias: 40 });
    }
  }
  // mouse hover: the teammate under the cursor (green: a legal pass; red: forward)
  if (TT.mouse && TT.mouse.hoverId >= 0 && m.players[TT.mouse.hoverId]) {
    const q = m.players[TT.mouse.hoverId], fwd = h && h.team === q.team && (q.x - h.x) * dirOf(h.team) > 4;
    r.groundRing(q.x, q.y, 12, fwd ? '#ff4040' : '#60ff80', 1);
  }
  // players
  for (const p of m.players) {
    if (p.st === 'binned' || p.st === 'off') continue;
    const rig = PR.rigs[p.id]; if (!rig) continue;
    r.shadow(p.x, p.y, 6 * p.data.size, .4);
    const opts = { xray: p.ctl >= 0 || b.holder === p.id ? { actors: true, color: p.ctl >= 0 && TT.seats[p.ctl] ? TT.seats[p.ctl].color : '#ffffff' } : undefined, pick: p };
    if (p.flash > 0) { opts.flash = '#ffffff'; opts.flashMix = .6; }
    if (p.fire > 0 || p.superK) opts.ghost = { color: p.superK === 'hurricane' ? '#80c0ff' : '#ff8030', life: .2, alpha: .5, owner: p };
    if (p.toasted > 0) { opts.flash = '#1a1008'; opts.flashMix = .7; }
    if (p.zapped > 0 && Math.floor(PR.t * 20) % 2 === 0) { if (!PR.skel) PR.skel = new E.Humanoid({ build: 'skeleton', weapon: null, size: 1.2 }); const sk = PR.skel; sk.update(0, { x: p.x, y: p.y, z: p.z, facing: p.facing, vx: 0, vy: 0 }); r.actor(p.x, p.y, p.z, (g, ox, oy) => sk.draw(g, ox, oy, view), { emissive: true }); continue; }
    r.actor(p.x, p.y, p.z, (g, ox, oy) => rig.draw(g, ox, oy, view), opts);
    if (p.st === 'stunned' || p.st === 'ground' && p.stun > .9 || p.held > 0) {
      r.queue(p.x, p.y, 30, g => { const [x, y] = r.w(p.x, p.y, 16 * p.data.size); for (let k = 0; k < 3; k++) { const a = PR.t * 6 + k * 2.1; px.rect(g, Math.round(x + Math.cos(a) * 7), Math.round(y - 6 + Math.sin(a) * 2), 2, 2, '#ffe040'); } }, { bias: 30 });
    }
    if (p.fire > 0 || p.superK === 'thunder') r.queue(p.x, p.y, 20, g => { const [x, y] = r.w(p.x, p.y, 10); px.blend(g, .7, 'add', () => { for (let k = 0; k < 5; k++) { const fx = x + Math.sin(PR.t * 13 + k * 2) * 5, fy = y - k * 5 - Math.abs(Math.sin(PR.t * 9 + k)) * 4; px.disc(g, Math.round(fx), Math.round(fy), 3 - k * .4, k < 2 ? '#ffd040' : '#ff6020'); } }); }, { emissive: true });
    if (p.power) { const ic = { pie: '#c88a3a', iron: '#a0a8b8', grease: '#e8e070' }[p.power.kind] || '#fff'; r.queue(p.x, p.y, 50, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size + 18); px.disc(g, Math.round(x), Math.round(y), 2, ic); }, { emissive: true }); }
    // the charge glow and its meter
    if (p.st === 'charge' && p.ctl >= 0) r.queue(p.x, p.y, 50, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size); const u = clamp(p.charge / TUNE.v.bigHitCharge, 0, 1); E.ui.bar(g, Math.round(x) - 10, Math.round(y) - 8, 20, 3, u, p.charge > 1.2 ? '#ff3020' : u >= 1 ? '#ffe040' : '#ff9040'); }, { emissive: true, bias: 40 });
    if (p.kickHold > .2 && p.ctl >= 0 && b.holder === p.id) r.queue(p.x, p.y, 50, g => { const [x, y] = r.w(p.x, p.y, 44 * p.data.size); const u = clamp(p.kickHold / .9, 0, 1); E.ui.bar(g, Math.round(x) - 10, Math.round(y) - 8, 20, 3, u, u > .9 ? '#60ff80' : '#80c0ff'); }, { emissive: true, bias: 40 });
  }
  // the referee: his speech balloon, his card held high
  const rf = m.ref;
  r.shadow(rf.x, rf.y, 6, .4);
  r.actor(rf.x, rf.y, 0, (g, ox, oy) => PR.ref.draw(g, ox, oy, view));
  if (rf.callT > 0 && rf.call) r.queue(rf.x, rf.y, 60, g => { const [x, y] = r.w(rf.x, rf.y, 50); const w = E.font.width(rf.call) + 8; E.ui.box(g, Math.round(x - w / 2), Math.round(y) - 14, w, 12, { bg: '#ffffff', border: '#141010', gradient: false }); E.font.text(g, rf.call, Math.round(x), Math.round(y) - 11, '#141010', { align: 'center', outline: false }); }, { bias: 60 });
  if (rf.cardT > 0) r.queue(rf.x, rf.y, 50, g => { const [x, y] = r.w(rf.x, rf.y, 48); px.rect(g, Math.round(x) + 4, Math.round(y) - 6, 5, 7, rf.card === 'red' ? '#e02020' : '#f0d020'); }, { emissive: true, bias: 55 });
  // the chicken and the hazards' warnings
  for (const hz of m.hazards) {
    if (hz.kind === 'chicken') { r.shadow(hz.x, hz.y, 12, .4); r.actor(hz.x, hz.y, 4 + Math.abs(Math.sin(PR.t * 14)) * 3, (g, ox, oy) => { PR.chicken.draw(g, ox, oy, view); px.rect(g, ox - 2, oy - 34, 5, 4, '#e02020'); px.rect(g, ox + 4, oy - 24, 4, 2, '#f0a020'); }); }
    else if (hz.kind === 'flame') {
      if (hz.t < hz.warn) r.groundDisc(hz.x, hz.y, 12, '#ff8020', .3 + .3 * Math.sin(PR.t * 20));
      else if (hz.t < hz.warn + 1.2) { r.queue(hz.x, hz.y, 0, g => { const [x, y] = r.w(hz.x, hz.y, 0); px.blend(g, .85, 'add', () => { for (let k = 0; k < 8; k++) { const fy = y - k * 6 - (PR.t * 60 + k * 9) % 8; px.disc(g, Math.round(x + Math.sin(PR.t * 17 + k) * 3), Math.round(fy), 6 - k * .6, k < 3 ? '#fff0a0' : k < 6 ? '#ff9020' : '#c83010'); } }); }, { emissive: true }); TT.game.lights.add(hz.x, hz.y, 20, 80, 1, { color: '#ff8030' }); }
    } else if (hz.kind === 'lightning') {
      if (!hz.struck) { r.groundRing(hz.x, hz.y, 36, '#a0c0ff', .5 + .5 * Math.sin(PR.t * 25)); r.groundRing(hz.x, hz.y, 36 * (1 - hz.t / 1.4), '#ffffff', .6); }
      else if (hz.t < 1.6) r.queue(hz.x, hz.y, 0, g => { const [x, y] = r.w(hz.x, hz.y, 0); let cx = x, cy = 0; while (cy < y) { const nx = cx + (E.hash2(cy | 0, hz.x | 0) - .5) * 16, ny = cy + 14; px.line(g, Math.round(cx), Math.round(cy), Math.round(nx), Math.round(ny), '#ffffff', 2); cx = nx; cy = ny; } }, { emissive: true });
    }
  }
  // the power-up (and its shadow), blinking in its last three seconds
  if (m.pu) { const pu = m.pu; if (pu.landed || pu.z < 60) r.shadow(pu.x, pu.y, 5, .4); if (!(pu.landed && pu.t > 12 && Math.floor(PR.t * 8) % 2)) r.queue(pu.x, pu.y, pu.z, g => { const [x, y] = r.w(pu.x, pu.y, pu.z + 4 + (pu.landed ? Math.sin(PR.t * 4) * 2 : 0)); TT.drawPowerup(g, pu.kind, Math.round(x), Math.round(y)); }, { emissive: true }); }
  // the ball
  if (b.st !== 'dead' || m.phase === 'kickoff' || m.phase === 'setkick' || m.phase === 'stop') {
    r.shadow(b.x, b.y, 3, .45);
    const spr = Math.floor(b.rot * 4) % 2 ? BALL_SPR2 : BALL_SPR;
    r.sprite(b.x, b.y, b.z + 2, b.kind === 'pass' && b.st === 'air' ? BALL_SPR : spr, { anchor: 'center', rot: b.st === 'air' && b.kind === 'pass' ? 0 : (b.st === 'air' ? b.rot : Math.atan2(b.vy, b.vx)) });
    if (b.st === 'held' || b.st === 'placed' || b.st === 'loose') r.groundRing(b.x, b.y, 4, '#ffffff', .25);
  }
  // off-screen arrows for the ball and each seat's player
  if (m.phase === 'play' && b.st !== 'held') r.marker(b.x, b.y, b.z, { offscreen: 'arrow', color: '#ffffff', label: '' });
}

/* ---- the power-up sprites (12-14 px, with a glint) ---- */
const PU_SPR = {
  pie: E.sprite(['..yyyyyy..', '.yYYYYYYy.', 'yYbbbbbbYy', 'yYbBBBBbYy', 'sssssssss.', '.ssssssss.'], { y: '#c8822a', Y: '#e8a848', b: '#8a4a1a', B: '#a85a22', s: '#c8c8d0' }),
  iron: E.sprite(['.mmm..mmm.', 'mMMMmmMMMm', 'mMrMmmMrMm', '.mmm..mmm.', '..mmmmmm..'], { m: '#7a8290', M: '#b8c0cc', r: '#3a3a44' }),
  boot: E.sprite(['w...gggg..', 'ww.gGGGg..', '.wwgGGGg..', '..gGGGGggg', '..gGGGGGGg', '..gggggggg'], { g: '#c89a20', G: '#f0d050', w: '#ffffff' }),
  grease: E.sprite(['.jj....jj.', 'jJjjjjjjJj', '.jjJjjJjj.', '.jjjjjjjj.', '.jjJjjjjj.', '.jjjjjjjj.'], { j: '#d8c840', J: '#fff8a0' }),
  horn: E.sprite(['..........rr', '.....rrrrRRr', 'kkkrrRRRRRRr', 'kkkrrRRRRRRr', '.....rrrrRRr', '..........rr'], { r: '#c82020', R: '#f04040', k: '#2a2a30' })
};
TT.drawPowerup = (g, kind, x, y) => { const s = PU_SPR[kind]; if (!s) return; px.sprite(g, s, x - (s.width >> 1), y - (s.height >> 1)); if (Math.sin(PR.t * 5) > .7) px.rect(g, x + 2, y - 3, 1, 1, '#ffffff'); };
