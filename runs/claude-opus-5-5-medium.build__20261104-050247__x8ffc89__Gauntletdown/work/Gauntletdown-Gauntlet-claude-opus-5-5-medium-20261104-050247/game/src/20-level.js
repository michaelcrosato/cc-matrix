/* 20-level: realms (looks), the floor parser (legend -> TileMap, entities, door runs, traps, pads, beams) and
 * validateFloor(), the solvability check the floors test runs on every floor. */

/* ---- realms: palettes, wall materials, light ---- */
const rgb = h => E.hex(h);
const REALMS = {
  larder: { stones: ['#3e3028', '#463630', '#4e3c34', '#58443a', '#2e2420'], mortar: '#16100c', alt: '#5a3a26', wallTop: '#a48c6a', wallSide: '#76583e', face: 'stone', accent: { face: 'plank', top: '#8a6236', side: '#6a4626', h: 14 }, ambient: .5, torch: '#ffa050', props: ['barrel', 'crate', 'sack', 'jar', 'barrel'] },
  ossuary: { stones: ['#2e323e', '#343844', '#3a3e4c', '#424656', '#24262e'], mortar: '#121318', alt: '#5a5850', wallTop: '#aeb0bc', wallSide: '#6a6c7c', face: 'ruin', accent: { face: 'bone', top: '#d8d0b8', side: '#b8ae94', h: 14 }, ambient: .4, torch: '#8ab0ff', props: ['skull', 'bones', 'jar', 'pot', 'cobweb'] },
  furnace: { stones: ['#2a2222', '#302626', '#362a2a', '#3e3030', '#1e1818'], mortar: '#0e0a0a', alt: '#3a2218', wallTop: '#8a7468', wallSide: '#5a4640', face: 'iron', accent: { face: 'rusted', top: '#7a4a2e', side: '#5a3424', h: 14 }, ambient: .32, torch: '#ff7a30', props: ['anvil', 'barrel', 'firedrum', 'crate'] },
  banquet: { stones: ['#2e2440', '#4e4262'], mortar: '#1a1426', alt: '#5a1a34', wallTop: '#b8a8c8', wallSide: '#7a6a8a', face: 'marble', accent: { face: 'marble', top: '#e8e0f0', side: '#b0a6c0', h: 24 }, ambient: .45, torch: '#ffd070', props: ['candelabra', 'banner', 'statue'] }
};
const WT = { wall: 1, accent: 2, cracked: 3, door: 4, trapT: 5, trapY: 6, table: 7, fake: 8 };

function realmTypes(rm) {
  const base = { h: 24, cut: true, cutH: 6, face: rm.face, roof: 'slab', top: rm.wallTop, side: rm.wallSide };
  return {
    1: base,
    2: { h: rm.accent.h, cut: true, cutH: 6, face: rm.accent.face, roof: rm.accent.face === 'plank' ? 'plank' : 'slab', top: rm.accent.top, side: rm.accent.side },
    3: { ...base, face: 'ruin', top: E.shade(rm.wallTop, .12), side: E.shade(rm.wallSide, .18) },
    4: { h: 24, cut: true, cutH: 6, face: 'iron', roof: 'iron', top: '#5a5a66', side: '#3e3e4a' },
    5: { ...base, face: 'rusted', top: '#7a5a3a', side: '#6a4a2e' },
    6: { ...base, face: 'rusted', top: '#5a6a3a', side: '#4a5a2e' },
    7: { h: 10, cut: false, face: 'walnut', roof: 'velvet', top: '#7a1a2a', side: '#5a3420' },
    8: base
  };
}

/* ---- the floor texture: flagstones per realm, with painted features ---- */
function makeFloorTex(rm, realmId) {
  const S = rm.stones.map(rgb), pal = { stones: S.slice(0, 4), mortar: rgb(rm.mortar), hi: S[3], lo: S[4] || S[0], speck: S[0] }, ALT = rgb(rm.alt);
  const LAVA = [rgb('#ff6a1a'), rgb('#ffb43a'), rgb('#c02a0a')], STAIR = [rgb('#120c10'), rgb('#2a2228'), rgb('#4a3e44')];
  const RUNE = rgb('#b05ae8'), PAD = rgb('#4ae0d0'), PLATE = rgb('#8a8a96'), METAL = rgb('#5a5a64');
  return (x, y, tag) => {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T;
    let c;
    if (realmId === 'banquet') c = ((cx + cy) & 1) ? S[1] : S[0];
    else c = E.tex.flagstone(x, y, pal);
    if (tag === 'alt') { const k = E.hash2(Math.floor(x / 3), Math.floor(y / 3)); c = k < .5 ? ALT : c.map((v, i) => (v + ALT[i]) >> 1); }
    else if (tag === 'lava') { const n = E.noise2(x / 9, y / 7); return [...LAVA[n < .35 ? 2 : n < .7 ? 0 : 1], .8]; }
    else if (tag === 'stair') {   // a stairwell: steps going down, darker toward the middle
      const d = Math.max(Math.abs(lx - 8), Math.abs(ly - 8));
      if (d > 7) return METAL;
      const step = Math.floor(d / 2); return (Math.floor(d * 2) % 4 === 0) ? STAIR[2] : STAIR[Math.min(1, 3 - step < 0 ? 0 : 1)].map(v => v - (3 - step) * 4);
    }
    else if (tag === 'rune') { const d = Math.hypot(lx - 8, ly - 8); if (Math.abs(d - 5.5) < .7 || (d < 4 && (Math.abs(lx - 8) < .6 || Math.abs(ly - 8) < .6))) return [...RUNE, .6]; c = c.map(v => v * .8); }
    else if (tag === 'pad') { const d = Math.hypot(lx - 8, ly - 8); if (d < 7.5) return Math.abs(d - 6) < .8 || Math.abs(d - 3) < .6 ? [...PAD, .7] : c.map(v => v * .6); }
    else if (tag === 'plate') { if (lx > 2 && lx < 14 && ly > 2 && ly < 14) return (lx < 3 || ly < 3) ? PLATE.map(v => v + 30) : (lx > 13 || ly > 13) ? PLATE.map(v => v - 30) : PLATE; }
    else if (tag === 'spike') { if (lx > 1 && lx < 15 && ly > 1 && ly < 15) return ((Math.floor(lx) % 4 === 2) && (Math.floor(ly) % 4 === 2)) ? STAIR[0] : METAL; }
    else if (tag === 'beam') c = c.map(v => v * .7);
    // painted light: soft darkening near walls to the north and west (contact shading)
    return c;
  };
}

/* ---- the parser ---- */
const WALLISH = { '#': '#', '%': '%', 'X': 'X', '+': '+', 'T': 'T', 'Y': 'Y', '?': '?', '~': '~', '=': '=', 'P': '=', 'U': '=' };
const FLOORISH = { ',': 'alt', 's': 'spike', '!': 'rune', 'O': 'pad', '^': 'plate', 'v': 'plate', '|': 'beam', '-': 'beam', 'E': 'stair', '2': 'stair', '3': 'stair', '4': 'stair', '5': 'stair', '6': 'stair', '7': 'stair', '8': 'stair', '9': 'stair' };
const TM_LEGEND = { '#': 1, '%': 2, 'X': 3, '+': 4, 'T': 5, 'Y': 6, '=': 7, '?': 8, '~': { floor: 'lava', block: true },
  ',': { floor: 'alt' }, 's': { floor: 'spike' }, '!': { floor: 'rune' }, 'O': { floor: 'pad' }, '^': { floor: 'plate' }, 'v': { floor: 'plate' }, '|': { floor: 'beam' }, '-': { floor: 'beam' }, 'E': { floor: 'stair' } };
for (let d = 2; d <= 9; d++) TM_LEGEND[String(d)] = { floor: 'stair' };

function parseFloor(fd, o = {}) {
  const rows = fd.rows, h = rows.length, w = rows[0].length, rm = REALMS[fd.realm] || REALMS.larder;
  const clean = rows.map(r => [...r].map(ch => WALLISH[ch] || (FLOORISH[ch] ? ch : '.')).join(''));
  const map = o.noMap ? null : new E.TileMap({ rows: clean, legend: TM_LEGEND, types: realmTypes(rm), floorTex: makeFloorTex(rm, fd.realm), ao: 6, outside: '#05040a' });
  const out = { w, h, map, rows, starts: [], exits: [], pads: [], runes: [], spikes: [], beams: [], plates: [], items: [], mons: [], gens: [], doors: [], cracked: [], fakes: [], trapT: [], trapY: [], boss: null, tables: [] };
  let id = 1, si = 0, ai = 0;
  const C = (cx, cy) => ({ cx, cy, x: (cx + .5) * T, y: (cy + .5) * T });
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const ch = rows[cy][cx], c = C(cx, cy);
    if (ch === '@') out.starts.push(c);
    else if (ch === 'E') out.exits.push({ ...c, to: null });
    else if (ch >= '2' && ch <= '9') out.exits.push({ ...c, to: +ch });
    else if (ch === 'O') out.pads.push({ ...c, id: id++ });
    else if (ch === '!') out.runes.push(c);
    else if (ch === 's') out.spikes.push({ ...c, ph: E.hash2(cx, cy) * 1.6 });
    else if (ch === '|' || ch === '-') out.beams.push({ ...c, dir: ch === '|' ? 'v' : 'h' });
    else if (ch === '^' || ch === 'v') out.plates.push({ ...c, kind: ch === '^' ? 'T' : 'Y', used: false });
    else if (ch === '+') out.doors.push(c);
    else if (ch === 'X') out.cracked.push({ ...c, hp: 4 });
    else if (ch === '?') out.fakes.push(c);
    else if (ch === 'T') out.trapT.push(c);
    else if (ch === 'Y') out.trapY.push(c);
    else if (ch === 'K') out.boss = c;
    else if (ch === '=') out.tables.push(c);
    else if (ch === 'P') { out.tables.push(c); out.items.push({ ...c, id: id++, kind: 'platter', onTable: true }); }
    else if (ch === 'U') { out.tables.push(c); out.gens.push({ ...c, id: id++, type: 'tureen', onTable: true }); }
    else if (ITEM_CHAR[ch]) {
      const it = { ...c, id: id++, kind: ITEM_CHAR[ch] };
      if (it.kind === 'special') it.sub = (fd.specials || [])[si++] || 'ironbrew';
      if (it.kind === 'amulet') it.sub = (fd.amulets || [])[ai++] || 'veil';
      out.items.push(it);
    }
    else if (MON_CHAR[ch]) out.mons.push({ ...c, id: id++, type: MON_CHAR[ch] });
    else if (GEN_CHAR[ch]) out.gens.push({ ...c, id: id++, type: GEN_CHAR[ch] });
  }
  // pair transporters in reading order
  for (let i = 0; i + 1 < out.pads.length; i += 2) { out.pads[i].pair = i + 1; out.pads[i + 1].pair = i; }
  // door runs: 4-connected groups of door cells
  const seen = new Set(), key = (cx, cy) => cx + ',' + cy, doorAt = new Map(out.doors.map(d => [key(d.cx, d.cy), d]));
  out.doorGroups = [];
  for (const d of out.doors) {
    if (seen.has(key(d.cx, d.cy))) continue;
    const g = [], q = [d]; seen.add(key(d.cx, d.cy));
    while (q.length) { const c = q.pop(); g.push(c); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = key(c.cx + dx, c.cy + dy); if (doorAt.has(k) && !seen.has(k)) { seen.add(k); q.push(doorAt.get(k)); } } }
    out.doorGroups.push({ id: out.doorGroups.length, cells: g, open: false });
  }
  // pad the starts to four on free neighbours
  const free = (cx, cy) => { const ch = rows[cy] && rows[cy][cx]; return ch === '.' || ch === ','; };
  for (let i = 0; out.starts.length && out.starts.length < 4 && i < 40; i++) {
    const s = out.starts[i % out.starts.length];
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) { if (out.starts.length >= 4) break; if (free(s.cx + dx, s.cy + dy) && !out.starts.some(t => t.cx === s.cx + dx && t.cy === s.cy + dy)) out.starts.push(C(s.cx + dx, s.cy + dy)); }
  }
  return out;
}

/* ---- validateFloor: shape, legend and a solvability flood fill (keys versus doors, plates, pads) ---- */
const LEGEND_CHARS = new Set('#%X+TY?~.,@E23456789O!s|-^vkfbjzmua$*hlwBgnoiyxtGNLIFSK=PU');
function validateFloor(fd) {
  const errs = [], rows = fd.rows, h = rows.length, w = rows[0] && rows[0].length;
  if (!h || !w) return ['empty'];
  if (rows.some(r => r.length !== w)) errs.push('rows are not all the same width');
  if (w < 24 || w > 72 || h < 16 || h > 48) errs.push('size ' + w + 'x' + h + ' out of range');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][x]; if (!LEGEND_CHARS.has(ch)) errs.push('unknown char ' + ch + ' at ' + x + ',' + y); if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && ch !== '#' && ch !== '%') errs.push('border open at ' + x + ',' + y); }
  const p = parseFloor(fd, { noMap: true });
  if (!p.starts.length) errs.push('no start');
  if (!p.exits.length && !fd.boss) errs.push('no stairs');
  if (fd.boss && !p.boss) errs.push('boss floor without K');
  const goals = fd.boss ? [p.boss] : p.exits;
  if (p.pads.length % 2) errs.push('odd transporter count');
  const cnt = (k) => p.items.filter(i => i.kind === k).length;
  if (cnt('special') !== (fd.specials || []).length) errs.push('special count ' + cnt('special') + ' != meta ' + (fd.specials || []).length);
  if (cnt('amulet') !== (fd.amulets || []).length) errs.push('amulet count mismatch');
  for (const g of p.gens) for (const s of p.starts) if (Math.abs(g.cx - s.cx) + Math.abs(g.cy - s.cy) < 4 && !fd.boss) errs.push('generator near start at ' + g.cx + ',' + g.cy);
  for (const e of p.exits) if (e.to && !FLOOR_ORDER.some(id => get('floors', id).no === e.to)) errs.push('skip target ' + e.to + ' missing');
  // flood fill
  const solid = new Set('#%+TY~=PU'.split('')), open = new Set();
  const K = (x, y) => y * w + x;
  const doorCells = new Map(); p.doorGroups.forEach(g => g.cells.forEach(c => doorCells.set(K(c.cx, c.cy), g.id)));
  const isWalk = (x, y) => { const ch = rows[y][x]; if (open.has(K(x, y))) return true; return !solid.has(ch); };
  let keys = 0, used = 0;
  const reached = new Set(), takenKeys = new Set();
  const opened = new Set();
  for (let pass = 0; pass < 200; pass++) {
    const q = p.starts.map(s => [s.cx, s.cy]).filter(([x, y]) => !reached.has(K(x, y)));
    q.forEach(([x, y]) => reached.add(K(x, y)));
    const all = [...reached].map(k => [k % w, Math.floor(k / w)]);
    const stack = all.slice();
    while (stack.length) {
      const [x, y] = stack.pop(), ch = rows[y][x];
      if (ch === 'k' && !takenKeys.has(K(x, y))) { takenKeys.add(K(x, y)); keys++; }
      if (ch === '^' || ch === 'v') for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (rows[yy][xx] === (ch === '^' ? 'T' : 'Y') && !open.has(K(xx, yy))) open.add(K(xx, yy));
      if (ch === 'O') { const i = p.pads.findIndex(d => d.cx === x && d.cy === y), o2 = p.pads[p.pads[i].pair]; if (o2 && !reached.has(K(o2.cx, o2.cy))) { reached.add(K(o2.cx, o2.cy)); stack.push([o2.cx, o2.cy]); } }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = K(nx, ny); if (reached.has(k) || !isWalk(nx, ny)) continue;
        reached.add(k); stack.push([nx, ny]);
      }
    }
    // the locked chests hand out a key when they are reachable and a key is spare
    if (goals.some(e => e && reached.has(K(e.cx, e.cy)))) return errs;
    // open the next door run next to the filled area if a key is spare
    let did = false;
    if (keys > used) for (const g of p.doorGroups) {
      if (opened.has(g.id)) continue;
      if (g.cells.some(c => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reached.has(K(c.cx + dx, c.cy + dy))))) { opened.add(g.id); used++; g.cells.forEach(c => open.add(K(c.cx, c.cy))); did = true; break; }
    }
    if (!did) { errs.push('stairs not reachable (keys ' + keys + ', doors opened ' + used + ')'); return errs; }
  }
  return errs;
}
// everything that should be reachable once every door is open (no dead content)
function deadContent(fd) {
  const p = parseFloor(fd, { noMap: true }), rows = fd.rows, h = rows.length, w = rows[0].length, solid = new Set('#%~=PU'.split('')), reached = new Set(), K = (x, y) => y * w + x;
  const st = p.starts.map(s => [s.cx, s.cy]); st.forEach(([x, y]) => reached.add(K(x, y)));
  while (st.length) {
    const [x, y] = st.pop(), ch = rows[y][x];
    if (ch === 'O') { const i = p.pads.findIndex(d => d.cx === x && d.cy === y), o2 = p.pads[p.pads[i].pair]; if (o2 && !reached.has(K(o2.cx, o2.cy))) { reached.add(K(o2.cx, o2.cy)); st.push([o2.cx, o2.cy]); } }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const k = K(nx, ny); if (reached.has(k) || solid.has(rows[ny][nx])) continue; reached.add(k); st.push([nx, ny]); }
  }
  const bad = [];
  for (const e of [...p.items.filter(i => !i.onTable), ...p.mons, ...p.gens.filter(g => !g.onTable), ...p.exits]) if (!reached.has(K(e.cx, e.cy))) bad.push((e.kind || e.type || 'exit') + '@' + e.cx + ',' + e.cy);
  return bad;
}
