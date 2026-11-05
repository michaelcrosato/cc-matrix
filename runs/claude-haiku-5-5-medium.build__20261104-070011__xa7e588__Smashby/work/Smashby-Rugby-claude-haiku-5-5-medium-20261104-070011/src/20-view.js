// THE PRESENTATION: the pitch and stands (a TileMap per venue), the crowd, the posts, the rigs and the ball, the HUD, the
// prompts that follow the last device, the set-piece widgets and the event banners. It only reads SM.M.
const px = My3D2dge.px;

// the pitch's painted lines and the mown grass, as the floor's colours
SM.onLine = (x, y) => {
  const ex = Math.min(Math.abs(x - SM.X0), Math.abs(x - SM.X1)), ey = Math.min(Math.abs(y - SM.Y0), Math.abs(y - SM.Y1));
  if (ex < 1.5 || ey < 1.5 || Math.abs(x - SM.CX) < 1) return true;
  if (Math.abs(x - (SM.X0 + 225)) < 1 || Math.abs(x - (SM.X1 - 225)) < 1) return true;
  if (Math.abs(x - (SM.X0 + 51)) < 1 || Math.abs(x - (SM.X1 - 51)) < 1) return true;
  if (Math.abs(x - SM.CX) < 1) return true;
  if (Math.abs(Math.hypot(x - SM.CX, y - SM.CY) - 48) < 1) return true;
  return false;
};
SM.floorTex = function (venue) {
  return (x, y, tag) => {
    const n = My3D2dge.hash2(Math.floor(x), Math.floor(y)) - .5, m = My3D2dge.noise2(x * .05, y * .05) * .5;
    if (tag === 'ingoal') { const g = 92 + n * 12 + m * 14; return [g * .5, g * .9, g * .5]; }
    if (tag === 'mud') { const g = 60 + n * 14; return [g * 1.2, g * .8, g * .4]; }
    if (SM.onLine(x, y)) { const w = 226 + n * 16; return [w, w, w - 6]; }
    const stripe = Math.floor((x - SM.X0) / 32) % 2 ? 1 : 0;
    const g = (stripe ? 150 : 124) + n * 26 + m * 22;
    return [g * .45, g, g * .48];
  };
};

// a venue's TileMap: the north stand in three tiers, the end stands, the touch-line boards and the in-goals
SM.buildMap = function (venue) {
  if (SM.mapCache[venue.id]) return SM.mapCache[venue.id];
  const rows = [];
  for (let R = 0; R < SM.ROWS; R++) {
    let s = '';
    for (let C = 0; C < SM.COLS; C++) {
      if (C === 0 || C === SM.COLS - 1) s += '3';
      else if (R < 3) s += ['5', '4', '3'][R];
      else if (R === 3) s += '1';
      else if (R === 40) s += '6';
      else if (R >= 41) s += ' ';
      else s += (C >= 6 && C <= 69) ? '.' : ',';
    }
    rows.push(s);
  }
  const map = new My3D2dge.TileMap({
    rows: rows.slice(0, 41), legend: { '5': 5, '4': 4, '3': 3, '1': 1, '6': 6, '.': { floor: 'grass' }, ',': { floor: 'ingoal' }, ' ': { floor: 'outside' } },
    types: {
      1: { h: 12, cut: true, cutH: 4, face: 'stone', top: '#7a7088', side: '#4a4458', line: '#2a2a40' },
      3: { h: 34, face: venue.stand === 'plank' ? 'plank' : 'stone', top: '#5a5468', side: '#3c3850' },
      4: { h: 44, face: venue.stand === 'plank' ? 'plank' : 'stone', top: '#64607a', side: '#44405a' },
      5: { h: 54, face: venue.stand === 'plank' ? 'plank' : 'stone', top: '#6e6a84', side: '#4c4864' },
      6: { h: 14, cut: true, cutH: 4, face: 'plank', top: '#dcdfe8', side: '#2a3a6a' }
    },
    floorTex: SM.floorTex(venue), outside: '#1a1820', ao: 4
  });
  if (venue.mud) map.mudFloor = true;
  SM.mapCache[venue.id] = map;
  return map;
};
SM.mapCache = {};

// the crowd: two figures on each stand tile, in the two sides' colours, bobbing on a try
SM.crowd = function () {
  const out = [];
  for (let R = 0; R < 3; R++) for (let c = 6; c <= 69; c += 2) for (const dx of [4, 12]) {
    const h = My3D2dge.hash2(c * 3 + dx, R * 7 + 1), side = h < .5 ? 0 : 1;
    out.push({ x: c * 16 + dx, y: R * 16 + 9, z: [54, 44, 34][R], side, shirt: side ? ['#c8502a', '#e07040', '#a83a1a'][(h * 30 | 0) % 3] : ['#4aa0e0', '#e8dcc0', '#24242a'][(h * 30 | 0) % 3], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 50 | 0) % 4], ph: h * 9 });
  }
  return out;
};

// the ball's sprites, and the figures of the stand
SM.BALL = My3D2dge.sprite(['.www.', 'wwkww', 'wkkkw', 'wwkww', '.www.'], { w: '#c8a070', k: '#3a2410' });
SM.BALL2 = My3D2dge.sprite(['.www.', 'wkwkw', 'wwwww', 'wkwkw', '.www.'], { w: '#c8a070', k: '#3a2410' });
SM.CHEV = My3D2dge.sprite(['.w.', 'wcw', '.c.'], { w: '#ffffff', c: '#ffe08a' });

// the three-letter names and the kit colours as they read on the HUD
SM.teamName = s => SM.M.teams[s].short;
SM.kitHex = s => SM.M.teams[s].colors.cloth;

// the glyph for an action on the device in use: a coloured badge with a letter (the font has no ✕ ○ □ △)
SM.glyph = function (action, input) {
  const dev = input ? input.lastDevice : 'keyboard';
  if (dev === 'gamepad') {
    const xbox = (SM.setting && SM.setting('glyphs')) === 'xbox';
    const map = {
      x: xbox ? ['A', '#5ac85a'] : ['X', '#6a9cf0'], ci: xbox ? ['B', '#e8503a'] : ['O', '#f05a64'],
      sq: xbox ? ['X', '#3a86e8'] : ['S', '#e07ac8'], tri: xbox ? ['Y', '#f0c830'] : ['T', '#4ad0a0'],
      l1: xbox ? ['LB', '#8a8aa0'] : ['L1', '#8a8aa0'], r1: xbox ? ['RB', '#8a8aa0'] : ['R1', '#8a8aa0'], turbo: xbox ? ['RT', '#8a8aa0'] : ['R2', '#8a8aa0']
    };
    return map[action] || [action.toUpperCase(), '#8a8aa0'];
  }
  const keys = { x: 'SPACE', ci: 'C', sq: 'F', tri: 'R', l1: 'Q', r1: 'E', turbo: 'SHIFT' };
  return [keys[action] || action.toUpperCase(), '#d8d8e0'];
};
// draw a badge at (x, y): a disc with the letter, or a keycap for the keyboard
SM.badge = function (g, action, input, x, y) {
  const [label, col] = SM.glyph(action, input);
  const dev = input ? input.lastDevice : 'keyboard';
  if (dev === 'gamepad') {
    px.disc(g, x, y, 5, col);
    E.font.text(g, label, x, y - 2, '#101018', { font: 'tiny', outline: false, align: 'center' });
    return 12;
  }
  const w = Math.max(9, label.length * 4 + 5);
  px.rect(g, x - w / 2, y - 5, w, 10, '#c8c8d0');
  px.rect(g, x - w / 2, y + 4, w, 1, '#50505a');
  E.font.text(g, label, x, y - 3, '#101018', { font: 'tiny', outline: false, align: 'center' });
  return w + 3;
};

// the score bug, the clock, the hype bars, the sin-bin timers
SM.drawBug = function (g, r) {
  const M = SM.M;
  E.ui.box(g, 4, 4, 150, 30, { bg: '#10141c', border: '#e8c070', alpha: .86 });
  for (let s = 0; s < 2; s++) {
    const x = 8 + s * 74;
    px.rect(g, x, 8, 8, 8, M.teams[s].colors.cloth);
    px.rect(g, x, 16, 8, 2, M.teams[s].colors.trim);
    E.font.text(g, M.teams[s].short, x + 11, 8, '#f0ecdc', { font: 'tiny', outline: false });
    E.font.text(g, String(M.score[s]), x + 11, 16, '#ffe08a', { font: 'tiny', outline: false });
    E.ui.bar(g, x, 28, 60, 3, M.hype[s] / 100, M.hype[s] >= 100 ? '#ffd36a' : M.teams[s].chip);
    // the sin bin: the seconds left for each of the side's binned players, shown as small timers
    let k = 0;
    for (const p of M.players) if (p.side === s && p.bin > 0) { E.font.text(g, Math.ceil(p.bin) + 's', x + 40 - k * 16, 8, '#ff8a6a', { font: 'tiny', outline: false }); k++; }
  }
  const clock = M.golden ? 'GOLDEN POINT' : (M.half === 1 ? '1ST ' : '2ND ') + SM.mmss(M.run / M.halfLen * 420);
  const shown = M.hooter ? 'HOOTER' : clock;
  E.font.text(g, shown, 81, 17, M.hooter ? '#ff6a4a' : '#c8d0e8', { font: 'tiny', outline: false, align: 'center' });
};

// the radar: the pitch small, the players in their colours, the ball white, the seats ringed
SM.drawRadar = function (g, r) {
  const M = SM.M, s = 0.0345, w = Math.round((SM.X1 - SM.X0) * s), h = Math.round((SM.Y1 - SM.Y0) * s), x0 = r.W - w - 8, y0 = 8;
  E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#183a1e', border: '#6a9070', alpha: .8 });
  for (const p of M.players) if (p.bin <= 0) px.rect(g, Math.round(x0 + (p.x - SM.X0) * s) - 1, Math.round(y0 + (p.y - SM.Y0) * s) - 1, 2, 2, M.teams[p.side].chip);
  px.rect(g, Math.round(x0 + (M.ball.x - SM.X0) * s), Math.round(y0 + (M.ball.y - SM.Y0) * s), 1, 1, '#ffffff');
  for (const seat of M.seats) if (seat.p) px.rect(g, Math.round(x0 + (seat.p.x - SM.X0) * s) - 2, Math.round(y0 + (seat.p.y - SM.Y0) * s) - 2, 4, 4, '#ffe08a');
};

// the banners: a big word in the top centre for a moment (TRY!, MONSTER HIT!, OFFSIDE...)
SM.banner = function (text, color, t) { SM.banners.push({ text, color: color || '#ffe08a', t: t || 1.6, age: 0 }); if (SM.banners.length > 4) SM.banners.shift(); };
SM.banners = [];
SM.drawBanners = function (g, r, dt) {
  const b = SM.banners[0];
  if (!b) return;
  b.age += dt;
  if (b.age > b.t) { SM.banners.shift(); return; }
  const scale = b.text.length > 12 ? 2 : 3;
  E.font.title(g, b.text, r.W / 2, r.H * .22, { align: 'center', scale, colors: ['#fffbe8', b.color, '#e0662a'], depth: 2, outline: true });
};

// the prompts at the bottom: badges for the device in use, with a word
SM.drawPrompts = function (g, r, input, seat) {
  const M = SM.M;
  const items = [];
  if (!seat || !seat.p) return;
  const p = seat.p;
  if (M.ball.owner === p) items.push(['x', 'STEP'], ['sq', 'FEND'], ['ci', 'KICK'], ['l1', 'PASS'], ['r1', 'PASS']);
  else if (M.phase === 'play') items.push(['x', 'TACKLE'], ['sq', 'DIVE'], ['ci', 'SWITCH'], ['l1', 'UP'], ['r1', 'DOWN']);
  else if (M.phase === 'scrum' && p.pos <= 2) items.push(['x', 'PUSH ON SET']);
  else if (M.phase === 'ruck') items.push(['x', 'MASH'], ['sq', 'JACKAL']);
  else if (M.phase === 'conv' && M.conv && M.conv.kicker === p) items.push(['ci', 'HOLD AND LET GO']);
  if (M.superT && items.length && M.hype[p.side] >= 100) items.push(['tri', 'SUPER']);
  if (!items.length) return;
  let total = 0;
  for (const [a, w] of items) total += SM.glyphWidth(a, w, input) + 8;
  let x = r.W / 2 - total / 2;
  const y = r.H - 16;
  E.ui.box(g, x - 6, y - 8, total + 4, 16, { bg: '#10141c', border: '#6a7090', alpha: .75 });
  for (const [a, w] of items) {
    x += SM.badge(g, a, input, x + 4, y) + 2;
    E.font.text(g, w, x + 4, y - 3, '#f0ecdc', { font: 'tiny', outline: false });
    x += E.font.width(w, { font: 'tiny' }) + 8;
  }
};
SM.glyphWidth = (a, w, input) => 14 + E.font.width(w, { font: 'tiny' });

// the set pieces' widgets: the scrum's SET ring, the ruck's tug bar, the lineout's pods, the kick meter, the penalty
SM.drawSetPieces = function (g, r) {
  const M = SM.M;
  if (M.scrum) {
    const sc = M.scrum;
    const bx = r.W / 2, by = r.H * .78;
    const phase = sc.t < 1.2 ? 'CROUCH' : sc.t < sc.setAt ? 'BIND' : 'SET!';
    E.font.text(g, phase, bx, by - 22, sc.t >= sc.setAt ? '#ffe08a' : '#c8d0e8', { align: 'center', scale: 2, outline: false });
    const f = SM.clamp((sc.t - sc.setAt + .4) / .4, 0, 1);
    E.ui.bar(g, bx - 60, by - 6, 120, 6, Math.max(0, Math.min(1, f)), '#ffe08a');
  }
  if (M.ruck) {
    const r2 = M.ruck, bx = r.W / 2;
    E.ui.bar(g, bx - 60, r.H * .72, 120, 5, (r2.bar + 1) / 2, M.teams[r2.attack].chip);
    E.font.text(g, 'THE BREAKDOWN', bx, r.H * .72 - 12, '#c8d0e8', { align: 'center', font: 'tiny', outline: false });
    if (r2.jackal) E.font.text(g, 'JACKAL!', bx, r.H * .72 + 9, '#ff8a6a', { align: 'center', font: 'tiny', outline: false });
  }
  if (M.lineout) {
    const lo = M.lineout, bx = r.W / 2, by = r.H * .6;
    ['FRONT', 'MIDDLE', 'BACK'].forEach((t, i) => {
      const on = lo.pick[0] === i || lo.pick[1] === i;
      E.font.text(g, t, bx - 60 + i * 60, by, on ? '#ffe08a' : '#8a92aa', { align: 'center', font: 'tiny', outline: false });
    });
    E.font.text(g, 'LINEOUT', bx, by - 12, '#f0ecdc', { align: 'center', font: 'tiny', outline: false });
  }
  if (M.conv && (M.phase === 'conv')) {
    const c = M.conv, bx = r.W / 2, by = r.H * .6;
    E.font.text(g, (c.kind === 'drop' ? 'DROP GOAL' : c.kind === 'pen' ? 'PENALTY' : 'CONVERSION') + '   ' + Math.round(c.dist / 10.24) + ' M', bx, by - 14, '#ffe7a8', { align: 'center', font: 'tiny', outline: false });
    E.ui.bar(g, bx - 4, by - 2, 8, 60, 1, '#26283a');
    const fill = Math.round(c.meter * 60);
    px.rect(g, bx - 4, by - 2 + 60 - fill, 8, fill, '#ffd36a');
    const need = SM.clamp(c.dist / (SM.TUNE.v.kickMax * .9), .2, .95), ny = by - 2 + 60 - Math.round(need * 60);
    px.rect(g, bx - 10, ny, 20, 1, '#8aff9a');
  }
};

// a player's rig from his state: the stance, the down poses and the sulk of a binned player
SM.rigState = function (p) {
  const down = (p.st === 'tackled' || p.st === 'stun') ? 1 : 0;
  return { x: p.x, y: p.y, z: p.z || 0, vx: p.vx, vy: p.vy, facing: p.facing, hurt: p.st === 'stun' || p.stunT > 0 ? 1 : 0,
    down: p.st === 'bin' ? 0 : down, pose: p.st === 'bin' ? 'kneel' : (p.cheer > 0 ? 'cheer' : null), expr: p.cheer > 0 ? 'shout' : (p.st === 'bin' ? 'angry' : null), run: (p.st === 'run' && Math.hypot(p.vx, p.vy) > 40) ? 1 : 0 };
};

// the draw of the pitch: floor, walls, crowd, posts, the grates and the lightning, the players by depth, the ball
SM.drawWorld = function (r, map, venue) {
  const M = SM.M, view = E.charView(r.view);
  map.drawFloor(r); map.queueWalls(r);
  for (const f of SM.CROWD) {
    const up = M.phase === 'try' && M.scorer && f.side === M.scorer.side ? Math.abs(Math.sin(M.t * 9 + f.ph)) * 5 : Math.sin(M.t * 2 + f.ph) * .6;
    r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
  }
  for (const gx of [SM.POST0, SM.POST1]) {
    r.queue(gx, SM.CY - SM.GOALW, 0, g => { const [x0, y0] = r.w(gx, SM.CY - SM.GOALW, 0), [, y1] = r.w(gx, SM.CY - SM.GOALW, 120); px.rect(g, Math.round(x0) - 1, Math.round(y1), 2, Math.round(y0 - y1), '#f4f4f0'); });
    r.queue(gx, SM.CY + SM.GOALW, 0, g => { const [x0, y0] = r.w(gx, SM.CY + SM.GOALW, 0), [, y1] = r.w(gx, SM.CY + SM.GOALW, 120); px.rect(g, Math.round(x0) - 1, Math.round(y1), 2, Math.round(y0 - y1), '#f4f4f0'); });
    r.queue(gx, SM.CY - SM.GOALW, SM.BAR, g => { const [x0, y0] = r.w(gx, SM.CY - SM.GOALW, SM.BAR), [x1, y1] = r.w(gx, SM.CY + SM.GOALW, SM.BAR); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#f4f4f0', 2); }, { bias: 1 });
  }
  if (venue.id === 'furnace') for (const g2 of M.grates) {
    const col = g2.state === 'burn' ? '#ff7a2a' : g2.state === 'warn' ? '#ffb34a' : '#3a2a22';
    r.decal(() => r.groundDisc(g2.x, g2.y, 14, col, g2.state === 'cold' ? .35 : .8));
    if (g2.state === 'burn') r.queue(g2.x, g2.y, 6, gg => { const [x, y] = r.w(g2.x, g2.y, 6); px.disc(gg, x, y - 3, 6, '#ffb34a'); }, { emissive: true });
  }
  if (M.lightning) {
    const L = M.lightning;
    r.decal(() => r.groundDisc(L.x, L.y, 36, '#ffffff', L.struck ? .6 : .25));
    if (L.struck) r.queue(L.x, L.y, 0, gg => { const [x0, y0] = r.w(L.x, L.y, 0), [x1, y1] = r.w(L.x, L.y, 200); px.line(gg, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#fff6c0', 3); }, { emissive: true });
  }
  for (const m of M.mud) r.decal(() => r.groundDisc(m.x, m.y, m.r, '#4a2a14', .45));
  if (M.clucky) {
    const c = M.clucky;
    if (!SM.cluckyBlob) SM.cluckyBlob = new My3D2dge.Blob({ R: 14, colors: { dk: '#c8b890', base: '#f4f0e8', lt: '#ffffff', spec: '#ffffff', eye: '#ffffff', pupil: '#101010' }, wings: true, feet: true, mouth: true });
    r.shadow(c.x, c.y, 12, .4);
    r.actor(c.x, c.y, 0, (g, ox, oy) => SM.cluckyBlob.draw(g, ox, oy, view));
  }
  for (const p of M.players) {
    if (p.bin > 0) continue;
    const b = p;
    r.shadow(b.x, b.y, 6, .35);
    r.actor(b.x, b.y, b.z || 0, (g, ox, oy) => p.rig.draw(g, ox, oy, view));
    if (p.seat) r.queue(b.x, b.y, 40, g => { const [x, y] = r.w(b.x, b.y, 40); px.poly(g, [[x - 4, y - 5], [x + 4, y - 5], [x, y]], p.seat.color || '#ffe08a'); }, { emissive: true });
    if (p.onFire) r.queue(b.x, b.y, 22, g => { const [x, y] = r.w(b.x, b.y, 22); px.disc(g, x, y, 3, '#ff6a2a'); }, { emissive: true });
  }
  // the binned players stand in the sin bin on the touchline's far side of the team's own bench
  for (const p of M.players) if (p.bin > 0) r.actor(p.x, p.y, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, view));
  // the ball: in the air it is drawn above its shadow; on the ground it is a flat oval
  const b = M.ball;
  r.shadow(b.x, b.y, 3 - Math.min(1.5, b.z * .05), .4);
  if (b.state !== 'placed' || b.z > 0) r.sprite(b.x, b.y, b.z + 3, Math.floor((b.roll || 0) / 8) % 2 ? SM.BALL2 : SM.BALL, { anchor: 'center' });
  else r.sprite(b.x, b.y, 3, SM.BALL, { anchor: 'center' });
};

// the pitch's sky, the stand's lights and the venue's props
SM.drawVenue = function (r, venue) {
  r.sky(venue.sky);
  if (venue.id === 'megadome') r.queue(SM.CX, SM.Y0 - 20, 40, g => { const [x, y] = r.w(SM.CX, SM.Y0 - 20, 40); px.rect(g, x - 26, y - 8, 52, 16, '#2a1040'); E.font.text(g, 'GOLDBRICK', x, y - 4, '#e8c040', { align: 'center', font: 'tiny', outline: false }); });
};
