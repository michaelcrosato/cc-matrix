/* ---- LEVELS: a floor is def('floors', id, { rows, meta... }). The parser turns its rows into a TileMap and lists ---- */
// Wall type ids in every realm's TileMap
const WT = { wall: 1, accent: 2, cracked: 3, door: 4, trapA: 5, trapB: 6, table: 7, fake: 8 };
const WALL_H = 24;
/** realm looks: wall faces and tops, floor palettes, ambient light, props for the corners */
const REALM_LOOK = {
  larder: { wall: { face: 'stone', roof: 'slab', top: '#5e5650', side: '#86796c', course: 7 }, accent: { face: 'plank', roof: 'plain', top: '#5a3a22', side: '#7a5434' },
    floor: ['#7a5232', '#8a5e3a', '#9a6a42', '#6a4428', '#b07a4c'], mortar: '#3a2414', alt: ['#6a2e24', '#8a3a2e', '#a85a3a'], ambient: .6, light: '#ffb060', planks: true,
    props: ['barrel', 'keg', 'sacks', 'crate', 'rack', 'candles'] },
  ossuary: { wall: { face: 'ruin', roof: 'slab', top: '#b8ae98', side: '#a49a86', course: 8 }, accent: { face: 'stone', roof: 'slab', top: '#e0d6c0', side: '#ece2cc', course: 4 },
    floor: ['#3c4250', '#454c5c', '#4e5668', '#343a46', '#5e6678'], mortar: '#1c2028', alt: ['#6a6658', '#7a7464', '#8a8470'], ambient: .5, light: '#8ab0ff',
    props: ['coffin', 'bones', 'skull', 'jar', 'candles', 'urn'] },
  furnace: { wall: { face: 'brick', roof: 'slab', top: '#7a4436', side: '#8a4a3a', course: 6 }, accent: { face: 'stone', roof: 'plain', top: '#3a3a42', side: '#4a4a54', course: 5 },
    floor: ['#3a3438', '#443c40', '#4e4448', '#30292c', '#665a5e'], mortar: '#161214', alt: ['#3a3a42', '#46464e', '#52525c'], ambient: .44, light: '#ff8a3a',
    props: ['brazier', 'firedrum', 'anvil', 'chains', 'barrel'] },
  banquet: { wall: { face: 'stone', roof: 'slab', top: '#6a5a7a', side: '#7a6a8a', course: 8 }, accent: { face: 'plank', roof: 'plain', top: '#5a2a3a', side: '#6a3448' },
    floor: ['#b8aca0', '#c4b8ac', '#aca094', '#3a2a40', '#d8ccc0'], mortar: '#2a1e2e', alt: ['#6a5468', '#745e72', '#5a2a4a'], ambient: .55, light: '#ffd070',
    props: ['candelabra', 'banner', 'pillar'] }
};
/** the legend: what each character is. Walls (wall types), floors with things on them, and floor tags */
const WALL_CH = { '#': WT.wall, '%': WT.accent, 'X': WT.cracked, '+': WT.door, 'T': WT.trapA, 'Y': WT.trapB, '=': WT.table, 'P': WT.table, 'U': WT.table, '?': WT.fake };
const FLOOR_CH = '.,@E23456789O!s|-~^vkfbjzmua$*hlwBgnoiyxtGNLIFSK';
const LEGEND_CHARS = Object.keys(WALL_CH).join('') + FLOOR_CH;

/** parse a floor def into its parts (pure data: the tests, the validator and the world all read it) */
function parseFloor(F) {
  const rows = F.rows, h = rows.length, w = rows[0].length, at = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w ? rows[cy][cx] : '#';
  const out = { id: F.id, w, h, starts: [], stairs: [], items: [], monsters: [], gens: [], doors: [], plates: [], trapWalls: { '^': [], 'v': [] }, pads: [], runes: [], spikes: [], beams: [],
    cracked: [], fake: [], lava: [], tables: [], bell: null, king: null, errors: [] };
  let sp = 0, am = 0, iid = 1;
  const ranks = F.ranks || {}, rankAt = (cx, cy, d) => ranks[cx + ',' + cy] || d;
  for (let cy = 0; cy < h; cy++) {
    if (rows[cy].length !== w) out.errors.push('row ' + cy + ' is ' + rows[cy].length + ' wide, not ' + w);
    for (let cx = 0; cx < w; cx++) {
      const c = rows[cy][cx];
      if (!LEGEND_CHARS.includes(c)) { out.errors.push('unknown character "' + c + '" at ' + cx + ',' + cy); continue; }
      if (c === '@') out.starts.push({ cx, cy });
      else if (c === 'E') out.stairs.push({ cx, cy, to: null });
      else if (c >= '2' && c <= '9') out.stairs.push({ cx, cy, to: +c });
      else if (c === 'O') out.pads.push({ cx, cy });
      else if (c === '!') out.runes.push({ cx, cy });
      else if (c === 's') out.spikes.push({ cx, cy });
      else if (c === '|' || c === '-') out.beams.push({ cx, cy, dir: c === '|' ? 'v' : 'h' });
      else if (c === '~') out.lava.push({ cx, cy });
      else if (c === '^' || c === 'v') out.plates.push({ cx, cy, kind: c });
      else if (c === 'T') out.trapWalls['^'].push({ cx, cy });
      else if (c === 'Y') out.trapWalls['v'].push({ cx, cy });
      else if (c === 'X') out.cracked.push({ cx, cy });
      else if (c === '?') out.fake.push({ cx, cy });
      else if (c === 'B') out.bell = { cx, cy };
      else if (c === 'K') out.king = { cx, cy };
      else if (c === '=' || c === 'P' || c === 'U') out.tables.push({ cx, cy });
      if (ITEM_BY_CH[c]) {
        const type = ITEM_BY_CH[c], it = { id: iid++, type, cx, cy };
        if (type === 'special') { it.sub = (F.specials || [])[sp++]; if (!it.sub) out.errors.push('a "u" at ' + cx + ',' + cy + ' has no entry in specials'); }
        if (type === 'amulet') { it.sub = (F.amulets || [])[am++]; if (!it.sub) out.errors.push('an "a" at ' + cx + ',' + cy + ' has no entry in amulets'); }
        out.items.push(it);
      } else if (c !== 'K' && c !== 'B') iid++;   // (ids in reading order: every copy derives the same ids from the same rows)
      if (MON_BY_CH[c]) out.monsters.push({ type: MON_BY_CH[c], cx, cy, rank: get('monsters', MON_BY_CH[c]).rank1 ? 1 : rankAt(cx, cy, F.rank || 1) });
      if (GEN_BY_CH[c]) out.gens.push({ type: GEN_BY_CH[c], cx, cy, rank: rankAt(cx, cy, F.genRank || 1) });
    }
  }
  if (sp !== (F.specials || []).length) out.errors.push('specials lists ' + (F.specials || []).length + ' but the rows have ' + sp + ' "u"');
  if (am !== (F.amulets || []).length) out.errors.push('amulets lists ' + (F.amulets || []).length + ' but the rows have ' + am + ' "a"');
  // door runs: 4-connected '+' cells open together
  const seen = new Set();
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    if (at(cx, cy) !== '+' || seen.has(cx + ',' + cy)) continue;
    const cells = [], q = [[cx, cy]]; seen.add(cx + ',' + cy);
    while (q.length) { const [x, y] = q.pop(); cells.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (at(x + dx, y + dy) === '+' && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } }
    out.doors.push({ id: out.doors.length, cells });
  }
  // starts padded to four on free neighbours
  const free = (cx, cy) => '.,'.includes(at(cx, cy)) && !out.starts.some(s => s.cx === cx && s.cy === cy);
  for (let i = 0; out.starts.length && out.starts.length < 4 && i < 40; i++) { const s = out.starts[i % out.starts.length]; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) if (out.starts.length < 4 && free(s.cx + dx, s.cy + dy)) out.starts.push({ cx: s.cx + dx, cy: s.cy + dy }); }
  return out;
}

/** the rows as a TileMap legend: walls by type; every floor char a floor tag the floor texture paints */
function mapLegend() {
  const L = {};
  for (const c in WALL_CH) L[c] = WALL_CH[c];
  for (const c of FLOOR_CH) L[c] = { floor: c === ',' ? 'alt' : c === '~' ? 'lava' : c === 'E' || (c >= '2' && c <= '9') ? 'stairs' : 'floor', block: c === '~' };
  return L;
}
/** a realm's wall types for its TileMap */
function realmTypes(realm) {
  const R = REALM_LOOK[realm], cut = { cut: true, cutH: 6 };
  const bars = face => { const s = face.side; if (s !== 's' && s !== 'n' && s !== 'e' && s !== 'w') return; for (let u = Math.ceil(face.u0 / 3) * 3; u < face.u1; u += 3) face.quad(u, face.z0, u + 1.2, face.z1, '#2a2a30'); face.quad(face.u0, face.z1 - 3, face.u1, face.z1 - 1.6, '#6a6a78'); face.quad(face.u0, face.z0 + 4, face.u1, face.z0 + 5.4, '#6a6a78'); };
  const runes = color => face => { const mz = (face.z0 + face.z1) / 2, mu = (face.u0 + face.u1) / 2; face.quad(mu - 3, mz - .6, mu + 3, mz + .6, color); face.quad(mu - .6, mz - 3, mu + .6, mz + 3, color); };
  return {
    [WT.wall]: Object.assign({ h: WALL_H }, cut, R.wall),
    [WT.fake]: Object.assign({ h: WALL_H }, cut, R.wall),
    [WT.accent]: Object.assign({ h: WALL_H }, cut, R.accent),
    [WT.cracked]: Object.assign({ h: WALL_H }, cut, R.wall, { face: 'ruin', top: E.shade(R.wall.top, -.15), side: E.shade(R.wall.side, -.2) }),
    [WT.door]: { h: WALL_H, cut: true, cutH: 8, face: 'none', roof: 'plain', top: '#4a4a56', side: '#14141a', decorate: bars },
    [WT.trapA]: Object.assign({ h: WALL_H }, cut, R.wall, { top: E.shade(R.wall.top, .08), side: E.shade(R.wall.side, -.1), decorate: runes('#e8c060') }),
    [WT.trapB]: Object.assign({ h: WALL_H }, cut, R.wall, { top: E.shade(R.wall.top, .08), side: E.shade(R.wall.side, -.1), decorate: runes('#6ae8e0') }),
    [WT.table]: { h: 10, face: 'plank', roof: 'plain', top: '#8a5a32', side: '#6a4224' }
  };
}

/* ---- the validator: every floor is checked by the tests (and by Dev Tools' warp): shape, legend, and SOLVABLE ---- */
function validateFloor(F) {
  const p = parseFloor(F), errs = p.errors.slice(), w = p.w, h = p.h, rows = F.rows, at = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w ? rows[cy][cx] : '#';
  if (w < 24 || w > 72 || h < 16 || h > 48) errs.push('size ' + w + 'x' + h + ' is outside 24-72 x 16-48');
  for (let cx = 0; cx < w; cx++) if (!'#%'.includes(at(cx, 0)) || !'#%'.includes(at(cx, h - 1))) { errs.push('the top and bottom rows must be walls (column ' + cx + ')'); break; }
  for (let cy = 0; cy < h; cy++) if (!'#%'.includes(at(0, cy)) || !'#%'.includes(at(w - 1, cy))) { errs.push('the side columns must be walls (row ' + cy + ')'); break; }
  if (!p.starts.length || p.starts.length > 4) errs.push('a floor needs 1-4 starts (@)');
  if (!p.stairs.length && !F.treasure && !F.boss) errs.push('no stairs');
  if (p.pads.length % 2) errs.push('transporter pads come in pairs');
  for (const s of p.stairs) if (s.to && !FLOOR_ORDER.some(id => get('floors', id) && get('floors', id).no === s.to)) errs.push('skip stairs to floor ' + s.to + ' lead nowhere');
  for (const g of p.gens) for (const s of p.starts) if (Math.abs(g.cx - s.cx) + Math.abs(g.cy - s.cy) < 4) errs.push('a generator at ' + g.cx + ',' + g.cy + ' is within 4 tiles of a start');
  for (const b of p.beams) { const [dx, dy] = b.dir === 'v' ? [0, 1] : [1, 0]; let ok = 0; for (const s of [-1, 1]) { let x = b.cx, y = b.cy; while ('|-'.includes(at(x, y))) { x += dx * s; y += dy * s; } if ('#%'.includes(at(x, y))) ok++; } if (ok < 2) { errs.push('the force field at ' + b.cx + ',' + b.cy + ' must run wall to wall'); break; } }
  // SOLVABLE: flood from the starts; plates drop their walls; pads carry; doors open while keys found exceed keys spent
  const key = (x, y) => x + ',' + y, open = new Set(), walls = new Set(), keys = new Set(p.items.filter(i => i.type === 'key').map(i => key(i.cx, i.cy)));
  const solid = c => '#%=PU'.includes(c);
  const blockedDeco = new Set(decorate(F, p).deco.map(d => key(d.cx, d.cy)));
  const walk = (x, y) => { const c = at(x, y); if (blockedDeco.has(key(x, y))) return false; if (walls.has(key(x, y))) return true; return !(solid(c) || c === '+' || c === 'T' || c === 'Y' || c === '~'); };
  const reach = new Set(); let got = 0, spent = 0, plates = new Set();
  const padOf = (x, y) => { const i = p.pads.findIndex(q => q.cx === x && q.cy === y); return i < 0 ? null : p.pads[i ^ 1]; };
  const flood = () => {
    const q = [...reach].map(k => k.split(',').map(Number));
    if (!q.length) for (const s of p.starts) { reach.add(key(s.cx, s.cy)); q.push([s.cx, s.cy]); }
    while (q.length) {
      const [x, y] = q.pop(), c = at(x, y);
      if (keys.has(key(x, y))) { keys.delete(key(x, y)); got++; }
      if ((c === '^' || c === 'v') && !plates.has(c)) { plates.add(c); for (const t of p.trapWalls[c]) walls.add(key(t.cx, t.cy)); for (const t of p.trapWalls[c]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (reach.has(key(t.cx + dx, t.cy + dy))) { if (!reach.has(key(t.cx, t.cy))) { reach.add(key(t.cx, t.cy)); q.push([t.cx, t.cy]); } } }
      const pad = c === 'O' && padOf(x, y); if (pad && pad.cx !== undefined && !reach.has(key(pad.cx, pad.cy))) { reach.add(key(pad.cx, pad.cy)); q.push([pad.cx, pad.cy]); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (!reach.has(k) && walk(nx, ny)) { reach.add(k); q.push([nx, ny]); } }
    }
  };
  flood();
  for (let guard = 0; guard < 60; guard++) {   // open the door run next to the filled area, while keys remain
    if (got - spent <= 0) break;
    const d = p.doors.find(d => !open.has(d.id) && d.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(key(x + dx, y + dy)))));
    if (!d) break;
    open.add(d.id); spent++; for (const [x, y] of d.cells) { walls.add(key(x, y)); reach.add(key(x, y)); }
    flood();
  }
  const stairsOk = F.treasure || F.boss || p.stairs.some(s => !s.to && reach.has(key(s.cx, s.cy)));
  if (!stairsOk) errs.push('the stairs cannot be reached with the floor\'s own keys');
  if (F.boss && p.king && !reach.has(key(p.king.cx, p.king.cy + 2)) && !reach.has(key(p.king.cx, p.king.cy))) errs.push('the King cannot be reached');
  // NO DEAD CONTENT: with every door and trap open, every item, monster and generator can be reached
  for (const d of p.doors) for (const [x, y] of d.cells) walls.add(key(x, y));
  for (const c of '^v') for (const t of p.trapWalls[c]) walls.add(key(t.cx, t.cy));
  flood();
  if (!F.sealedOk) for (const t of [...p.items, ...p.monsters, ...p.gens]) {
    const ok = reach.has(key(t.cx, t.cy)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(key(t.cx + dx, t.cy + dy)));
    if (!ok) { errs.push('dead content: ' + (t.type || '?') + ' at ' + t.cx + ',' + t.cy + ' cannot be reached'); break; }
  }
  return { ok: !errs.length, errors: errs, parsed: p, keys: got, doors: p.doors.length };
}

/** automatic decoration: torches on wall faces, realm props in room corners (deterministic: E.hash2). Corner props block
 *  their cell (map.block), so the validator checks them too */
function decorate(F, p) {
  const rows = F.rows, w = p.w, h = p.h, at = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w ? rows[cy][cx] : '#', wall = c => '#%'.includes(c), R = REALM_LOOK[F.realm || 'larder'];
  const busy = new Set([...p.starts, ...p.stairs, ...p.items, ...p.monsters, ...p.gens, ...p.plates, ...p.pads, ...p.runes, ...p.spikes, ...p.beams].map(t => t.cx + ',' + t.cy));
  const torches = [], deco = [];
  for (let cy = 1; cy < h - 1; cy++) for (let cx = 1; cx < w - 1; cx++) {
    const c = at(cx, cy), v = E.hash2(cx * 13 + 7, cy * 7 + 3);
    if (wall(c) && '.,'.includes(at(cx, cy + 1)) && wall(at(cx - 1, cy)) && wall(at(cx + 1, cy)) && v < .2 && !torches.some(t => Math.abs(t.cx - cx) < 3 && t.cy === cy)) torches.push({ cx, cy });
    if (c !== '.' && c !== ',') continue; if (busy.has(cx + ',' + cy)) continue;
    const n = wall(at(cx, cy - 1)), s = wall(at(cx, cy + 1)), e = wall(at(cx + 1, cy)), wv = wall(at(cx - 1, cy));
    const corner = (n || s) && (e || wv) && !(n && s) && !(e && wv), across = at(cx + (e ? -1 : 1), cy + (n ? 1 : -1));
    const roomy = '.,'.includes(across) && '.,'.includes(at(cx + (e ? -2 : 2), cy)) && '.,'.includes(at(cx, cy + (n ? 2 : -2)));
    if (corner && roomy && v < .55) deco.push({ cx, cy, prop: R.props[Math.floor(E.hash2(cx, cy * 3) * R.props.length)], facing: (n ? Math.PI / 2 : -Math.PI / 2) });
  }
  return { torches, deco };
}
