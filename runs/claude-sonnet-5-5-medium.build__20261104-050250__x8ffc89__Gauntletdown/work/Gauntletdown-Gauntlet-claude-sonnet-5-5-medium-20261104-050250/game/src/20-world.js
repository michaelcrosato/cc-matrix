/* World building: the run state, heroes, a floor's map and entities, rigs, the flow field. */
let game = null;                       // the E.Game (set in 90-main)
const RUN = {                          // one run (descent) across floors
  active: false, step: 0, seed: 1, descent2: false, heroes: [], continues: 0, diff: 'Normal', time: 0, ended: false, mode: 'solo', attract: false
};
let W = null;                          // the current floor's world
const SETTINGS_DEFAULT = { cameraView: 'Three-quarter', glyphs: 'PlayStation', difficulty: 'Normal', aimAssist: 'Low', stickFires: true, allyStun: true, captions: true, tips: true, names: true, hudSize: 'Normal', lighting: true };
const OPT = Object.assign({}, SETTINGS_DEFAULT, E.store.get('gauntletdown-opts', {}) || {});
const saveOpts = () => E.store.set('gauntletdown-opts', OPT);

// ---------- a multi-source flow field (distance by BFS over walkable cells) ----------
class Flow {
  constructor(map) { this.map = map; this.w = map.w; this.h = map.h; this.d = new Int32Array(this.w * this.h); this.key = ''; this.ver = -1; }
  update(srcs) {
    const m = this.map, w = this.w, h = this.h, k = srcs.map(s => s[0] + ',' + s[1]).join(';') + '|' + m.version;
    if (k === this.key) return false;
    this.key = k; this.d.fill(1e9); const q = [];
    for (const [cx, cy] of srcs) { if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue; this.d[cy * w + cx] = 0; q.push(cx, cy); }
    for (let i = 0; i < q.length; i += 2) {
      const x = q[i], y = q[i + 1], dd = this.d[y * w + x] + 1;
      for (let n = 0; n < 4; n++) {
        const nx = x + (n === 0) - (n === 1), ny = y + (n === 2) - (n === 3);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || this.d[ny * w + nx] <= dd || !m.walkable(nx, ny)) continue;
        this.d[ny * w + nx] = dd; q.push(nx, ny);
      }
    }
    return true;
  }
  // unit direction from world (x, y) down the field (null when unreached)
  dir(x, y) {
    const T = TS, cx = Math.floor(x / T), cy = Math.floor(y / T), w = this.w; if (cx < 0 || cy < 0 || cx >= w || cy >= this.h) return null;
    let best = this.d[cy * w + cx], bx = 0, by = 0;
    if (best >= 1e9) return null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= this.h) continue;
      if (dx && dy && (!this.map.walkable(cx + dx, cy) || !this.map.walkable(cx, cy + dy))) continue;   // no corner cutting
      const v = this.d[ny * w + nx] + (dx && dy ? .4 : 0); if (v < best) { best = v; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    const px0 = (cx + bx + .5) * T, py0 = (cy + by + .5) * T, l = Math.hypot(px0 - x, py0 - y) || 1;
    return [(px0 - x) / l, (py0 - y) / l];
  }
  at(x, y) { const cx = Math.floor(x / TS), cy = Math.floor(y / TS); return cx < 0 || cy < 0 || cx >= this.w || cy >= this.h ? 1e9 : this.d[cy * this.w + cx]; }
}

// ---------- heroes ----------
function makeHero(slot, clsIdx, input) {
  const C = CLASSES[clsIdx];
  const h = Object.assign(new E.Body({ x: 0, y: 0, r: 5, friction: 0 }), {
    slot, cls: clsIdx, C, input, rig: C.rig(), combo: new E.Combo(C.moves, { window: .45 }), name: C.name,
    hp: Math.round(TUNE.startHealth * DIFF[OPT.difficulty].hp), score: 0, keys: 0, flasks: 1, kills: 0, treasure: 0, food: 0, shotFood: 0, gensKilled: 0, floors: 0, specials: {}, amulet: null, amuletT: 0,
    facing: Math.PI / 2, aim: [0, 1], int: { mx: 0, my: 0, ax: 0, ay: 1, fire: false, magic: false, plant: false, rise: false }, cd: 0, grace: 0, stun: 0, queasy: 0, runeImmune: 0, tele: 0, invuln: 0, flash: 0,
    remote: false, puppet: false, down: false, downT: 0, rise: 0, lowSaid: 0, hurtT: 0, firing: false, swing: 0, stairT: 0, menuMark: false, ghostAlpha: 1, hunger: 0, net: null, bot: null, lastX: 0, lastY: 0, shotsFired: 0, awards: {}, bossDmg: 0, joined: true, kick: 0
  });
  h.maxKeys = 9; h.maxFlasks = 9;
  return h;
}
const heroSpeed = h => h.C.speed * TUNE.heroSpeed * (h.specials.featherfoot ? 1.12 : 1) * (h.queasy > 0 ? .6 : 1) * (h.tele > 0 ? 1 : 1);
const livingHeroes = () => W ? W.heroes.filter(h => !h.down && !h.gone) : [];
const heroLimit = h => h.specials.deeppockets ? 12 : 9;

// ---------- a floor ----------
const TYPES = realm => {
  const R = REALMS[realm], T = E.tones(R.top).sh, D = E.tones(R.side).deep;
  return {
    1: { h: 24, top: T, side: R.side, face: R.face, roof: 'plain', cut: true, cutH: 6 },
    3: { h: 24, top: T, side: R.side, face: R.face, roof: 'plain', cut: true, cutH: 6 },
    4: { h: 24, top: T, side: R.side, face: R.face, roof: 'plain', cut: true, cutH: 6 },
    5: { h: 24, top: '#8a7a6a', side: '#5a4a3a', face: 'stone', roof: 'slab', cut: true, cutH: 6 },
    6: { h: 20, top: '#707078', side: '#383840', face: 'none', roof: 'plain', cut: true, cutH: 6 },
    7: { h: 10, top: '#a0703a', side: '#6a4624', face: 'plank', roof: 'plank', cut: false }
  };
};
function floorTexFor(realm) {
  const R = REALMS[realm], st = R.floor.map(E.hex), mortar = E.hex(R.mortar);
  const pal = { stones: st, mortar, hi: st[1].map(v => Math.min(255, v + 22)), lo: st[0].map(v => Math.max(0, v - 18)), speck: mortar };
  return (x, y, tag) => {
    if (tag === 'lava') { const t = (Math.sin(x * .21 + y * .13) + Math.sin(y * .27 - x * .09) + 2) / 4; return [Math.floor(190 + t * 60), Math.floor(60 + t * 90), 20, 1]; }
    if (tag === 'rug') return E.tex.plain(x, y, { base: E.hex('#6a2a34'), amount: 8 });
    return E.tex.flagstone(x, y, pal, 16);
  };
}

function monRig(ch, rank) {
  const sz = rank === 3 ? 1.15 : rank === 2 ? 1 : .88, tint = (a, b, c) => [c, b, a][rank - 1] || a;
  switch (ch) {
    case 'g': return { kind: 'b', rig: new E.Blob({ R: 5 * sz, colors: { dk: '#7a8aa8', base: tint('#d8e4f8', '#b8c8e8', '#9aaed8'), lt: '#f4faff', eye: '#101020', pupil: '#101020' }, mouth: true, face: 'front' }) };
    case 'n': return { kind: 'h', rig: new E.Humanoid({ size: .95 * sz, build: 'bulky', weapon: 'sword', outfit: 'tunic', hair: 'bald', colors: { skin: tint('#9ad070', '#7ab858', '#5a9840'), cloth: tint('#a08060', '#8a6a48', '#704a30'), pants: '#4a3a28', metal: '#7a5a38', hilt: '#4a3018' }, eyeGlow: '#ffd84a' }) };
    case 'o': return { kind: 'h', rig: new E.Humanoid({ size: .95 * sz, build: 'chibi', weapon: null, outfit: 'tunic', hat: { style: 'band', color: '#c8a050' }, hair: 'short', colors: { skin: '#e0b890', cloth: tint('#e8e0c8', '#d0c8a8', '#b8a888'), pants: '#6a5a40', hair: '#503020' } }) };
    case 'i': return { kind: 'b', rig: new E.Blob({ R: 4.6 * sz, colors: { dk: '#8a1a10', base: tint('#ff7040', '#f05030', '#d83020'), lt: '#ffc070', eye: '#fff0a0', pupil: '#200808', wing: '#a02818' }, wings: true, horns: true, mouth: 'fangs', face: 'front' }) };
    case 'y': return { kind: 'h', rig: new E.Humanoid({ size: 1 * sz, weapon: 'staff', outfit: 'robe', hood: true, sleeves: 'long', hunch: .2, colors: { cloth: tint('#a08868', '#8a7050', '#705838'), hair: tint('#a08868', '#8a7050', '#705838'), metal: '#505058', trim: '#e8c860' }, eyeGlow: '#ff8040' }) };
    case 'x': return { kind: 'h', rig: new E.Humanoid({ size: .85, build: 'chibi', weapon: null, outfit: 'coat', hood: true, sleeves: 'long', colors: { cloth: '#3a3048', coat: '#2a2038', hair: '#2a2038', trim: '#c8a050', boot: '#201828' }, eyeGlow: '#f0e060' }) };
    case 't': return { kind: 'h', rig: new E.Humanoid({ size: 1.5, build: 'heroic', weapon: 'staff', outfit: 'robe', hood: true, sleeves: 'long', hunch: .1, colors: { cloth: '#1a1220', hair: '#1a1220', skin: '#d8d4c8', metal: '#a0a0a8', trim: '#6a3a8a' }, eyeGlow: '#c050ff' }) };
    case 'K': return { kind: 'h', rig: new E.Humanoid({ size: 2.3, build: 'bulky', weapon: 'sword', hat: 'crown', outfit: 'tunic', colors: { skin: '#e8b890', cloth: '#a02838', pants: '#401820', hair: '#d0c0a0', metal: '#d8c060', trim: '#f0d060', hilt: '#d8c060' }, eyeGlow: '#ff6040' }) };
  }
}

function newMonster(ch, x, y, rank, o = {}) {
  const T = MON[ch] || (ch === 'K' ? { id: 'king', hp: 400, spd: [30, 30, 30], dmg: [12, 12, 12], pts: 10000, r: 12, name: 'KING FAMISH' } : null);
  const rk = clamp(rank, 1, 3);
  const m = Object.assign(new E.Body({ x, y, r: T.r, friction: 0 }), {
    ch, T, rank: rk, rank0: rk, hp: T.hp * rk, maxhp: T.hp * rk, state: 'chase', t: rnd(1), atk: 0, atkT: 0, tell: 0, cool: rnd(.5, 1.2), facing: rnd(TAU), dying: 0, flash: 0, home: o.home || null,
    stun: 0, vis: 2, fadeT: 0, rigD: monRig(ch, rk), emerge: o.emerge || 0, id: ++W.nid, dead: false, drained: new Map(), swing: new E.Attack('overhead'), alpha: 1, targetId: -1, spawnRank: rk, stolen: null, escape: null, grav: 0
  });
  if (T.ghost) { m.gravity = 0; m.z = 4; }
  return m;
}

const GENDEF = { G: { c: ['#6a6a78', '#9a9aa8', '#d8e4f8'], hp: 4 }, N: { c: ['#6a4a2a', '#8a6a3a', '#9ad070'], hp: 4 }, L: { c: ['#8a6a4a', '#c8a870', '#e8e0c8'], hp: 4 }, I: { c: ['#4a2018', '#802818', '#ff7040'], hp: 4 }, F: { c: ['#6a6048', '#a09068', '#ffd860'], hp: 4 }, S: { c: ['#5a4a38', '#8a7458', '#c8a050'], hp: 4 }, U: { c: ['#7a7a88', '#b0b0c0', '#ff8040'], hp: 4 } };

function buildWorld(step, opts = {}) {
  const gen = opts.rows ? { rows: opts.rows, meta: opts.meta } : genFloor(step, RUN.seed, RUN.descent2);
  const { rows, meta } = gen, P = PLAN[step];
  const w = rows[0].length, h = rows.length, realm = meta.realm, R = REALMS[realm];
  const cells = new Array(w * h).fill(0), floor = new Array(w * h).fill(null), blocked = new Array(w * h).fill(0);
  const WL = { W: null };
  W = { step, meta, rows, w, h, realm, R, kind: meta.kind, time: 0, nid: 0, heroes: [], mons: [], gens: [], items: [], doors: [], pads: [], beams: [], plates: [], runes: [], spikes: [], fakes: [], cracked: [], trapWalls: { T: [], Y: [] }, bellObj: null,
    shots: [], foe: [], fx: [], texts: [], rubble: [], bars: [], decor: [], lights: [], speech: [], queue: [], stairs: [], skips: [], cellsRef: cells, lastSay: {}, done: false, descend: null, stairBy: -1,
    patience: 0, tithe: null, titheNext: null, bellT: 0, menuHero: null, hoard: { t: 0, on: false, total: 0, left: 0 }, boss: null, killsTotal: 0, flow: null, bellFlow: null, contT: -1, overT: -1, ghostCount: 0, shake: 0, fog: 0, net: null, attract: !!opts.attract, flowTick: 0, wallStairs: false, doorsOpen: false, secretFound: false, lobs: [] };
  const rankOf = (ch, x, y) => (meta.ranks && meta.ranks[x + ',' + y]) || meta.rank;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = rows[y][x], i = y * w + x, cx = (x + .5) * TS, cy = (y + .5) * TS;
    switch (c) {
      case '#': case '%': cells[i] = 1; break;
      case 'X': cells[i] = 3; W.cracked.push({ x, y, hp: 4 }); break;
      case 'T': cells[i] = 4; W.trapWalls.T.push({ x, y }); break;
      case 'Y': cells[i] = 4; W.trapWalls.Y.push({ x, y }); break;
      case '+': cells[i] = 6; break;
      case '=': case 'P': case 'U': cells[i] = 7; break;
      case '?': W.fakes.push({ x, y, found: 0 }); break;
      case '~': floor[i] = 'lava'; blocked[i] = 1; break;
      case ',': floor[i] = 'rug'; break;
    }
    const add = (kind, extra) => W.items.push(Object.assign({ kind, x: cx, y: cy, z: 0, id: W.items.length, t: rnd(6), gone: false }, extra));
    switch (c) {
      case 'k': add('key'); break; case 'f': add('roast'); break; case 'b': add('loaf'); break; case 'j': add('cider'); break; case 'z': add('stew'); break; case 'm': add('flask'); break;
      case 'u': add('potion', { sub: (meta.specials || [])[0] || 'ironbrew' }); break; case 'a': add('amulet', { sub: (meta.amulets || [])[0] || 'veil' }); break;
      case '$': add('gold'); break; case '*': add('gem'); break; case 'h': add('chest'); break; case 'l': add('lchest'); break; case 'w': add('crown'); break;
      case 'P': add('platter', { z: 10 }); break; case 'B': W.bellObj = { x: cx, y: cy, rung: false, t: 0, id: 0 }; break;
      case '@': W.starts = W.starts || []; W.starts.push({ x: cx, y: cy }); break;
      case 'E': W.stairs.push({ x: cx, y: cy, cx: x, cy: y }); break;
      case 'O': W.pads.push({ x: cx, y: cy, cd: 0 }); break;
      case '!': W.runes.push({ x: cx, y: cy }); break;
      case 's': W.spikes.push({ x: cx, y: cy, ph: ((x * 7 + y * 3) % 10) / 10 * 1.6 }); break;
      case '^': W.plates.push({ x: cx, y: cy, kind: 'T', hit: false }); break;
      case 'v': W.plates.push({ x: cx, y: cy, kind: 'Y', hit: false }); break;
      case '|': case '-': W.beams.push({ x: cx, y: cy, vert: c === '|', ph: ((x + y) % 2) * 2 }); break;
      case 'K': W.bossStart = { x: cx, y: cy }; break;
      default:
        if (c >= '2' && c <= '9') W.skips.push({ x: cx, y: cy, to: +c });
        else if (MON[c]) { W.pendingMons = W.pendingMons || []; W.pendingMons.push([c, cx, cy, rankOf(c, x, y)]); }
        else if (GEN[c]) { const gd = GENDEF[c]; W.gens.push({ ch: c, G: GEN[c], x: cx, y: cy, r: 7, rank: meta.genRank, rank0: meta.genRank, hp: Math.ceil(gd.hp * meta.genRank * TUNE.generatorHp), maxhp: Math.ceil(gd.hp * meta.genRank * TUNE.generatorHp), t: rnd(1, 2), kids: 0, flash: 0, id: W.gens.length, dead: false, breathe: rnd(TAU), table: c === 'U' }); }
    }
  }
  // doors: 4-connected runs open together
  const seen = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rows[y][x] === '+' && !seen.has(y * w + x)) {
    const grp = [], st = [[x, y]];
    while (st.length) { const [a, b] = st.pop(); if (seen.has(b * w + a)) continue; seen.add(b * w + a); grp.push({ x: a, y: b }); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rows[b + dy] && rows[b + dy][a + dx] === '+') st.push([a + dx, b + dy]); }
    W.doors.push({ cells: grp, open: 0, t: 0 });
  }
  // fake-wall alcoves hold a secret pocket: floor already; transporter pairs
  W.pads.forEach((p, i) => { p.pair = W.pads[i ^ 1] || null; });
  W.map = new E.TileMap({ w, h, cells, floor, blocked, types: TYPES(realm), floorTex: floorTexFor(realm), ao: 6, block: ['lava'] });
  W.map.outside = '#0a0710';
  for (let i = 0; i < w * h; i++) if (blocked[i]) W.map.blocked && (W.map.blocked[i] = 1);
  W.flow = new Flow(W.map); W.bellFlow = new Flow(W.map);
  W.grid = new E.SpatialHash(32);
  // monsters
  for (const [ch, x, y, rk] of W.pendingMons || []) W.mons.push(newMonster(ch, x, y, rk));
  // the boss
  if (meta.kind === 'boss') {
    const kHP = 400 * (1 + .5 * (Math.max(1, opts.players || 1) - 1));
    const k = newMonster('K', W.bossStart.x, W.bossStart.y, 1); k.hp = k.maxhp = kHP; k.T = Object.assign({}, k.T, { immune: false }); k.isBoss = true; k.phase = 1; k.state = 'sleep';
    W.boss = k; W.mons.push(k);
  }
  // lights from decoration
  decorate();
  if (meta.kind === 'treasure') { W.hoard.on = true; W.hoard.t = TUNE.hoardTime; W.hoard.total = W.items.filter(i => ['gold', 'gem', 'chest', 'crown'].includes(i.kind)).length; W.hoard.left = W.hoard.total; }
  return W;
}

// deterministic decoration: torches on wall faces, realm props beside walls (never on anything)
function decorate() {
  const { map, rows, w, h, R } = W, busy = new Set();
  for (const o of [...W.items, ...W.gens, ...W.pads, ...W.runes, ...W.spikes, ...W.plates, ...W.beams, ...W.stairs, ...(W.starts || []), ...W.skips, ...(W.mons)]) busy.add(Math.floor(o.y / TS) * w + Math.floor(o.x / TS));
  const solid = (x, y) => map.solidCell(x, y);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (rows[y][x] !== '.' || busy.has(y * w + x)) continue;
    const s = E.hash2(x * 3 + 1, y * 5 + 2);
    // torch on the wall face north of open floor
    if (solid(x, y - 1) && !solid(x, y + 1) && s < .1) W.decor.push({ type: 'torch', x: (x + .5) * TS, y: y * TS + 2, z: 10, light: true });
    else if (solid(x, y - 1) && s > .8 && s < .9 && rows[y][x + 1] === '.' ) { const name = R.props[Math.floor(E.hash2(x, y) * R.props.length)]; if (!busy.has(y * w + x + 1)) { W.decor.push({ type: name, x: (x + .5) * TS, y: (y + .62) * TS, z: 0, solid: false }); busy.add(y * w + x); } }
  }
}

function placeHeroes(heroes, starts) {
  heroes.forEach((hh, i) => {
    const s = starts[i % starts.length], j = i >= starts.length ? Math.floor(i / starts.length) * 4 : 0;
    hh.x = s.x + j; hh.y = s.y; hh.vx = hh.vy = 0; hh.z = 0;
  });
}
