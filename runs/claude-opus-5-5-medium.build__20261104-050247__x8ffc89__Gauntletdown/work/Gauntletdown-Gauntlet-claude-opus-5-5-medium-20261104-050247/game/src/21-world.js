/* 21-world: the party, the world (W) of one floor, flow fields, the damage pipeline, scoring and happenings.
 * The sim runs in the roles solo/local, attract, host and server; a client runs only its own hero (40-net.js). */

let W = null;                 // the floor being played
const PARTY = [];             // the heroes, kept from floor to floor
const RUN = { loop: 1, floorIdx: 0, cheated: false, deepest: 1, started: 0, mode: 'local' };   // this descent
const CHEAT = { god: false, noclip: false, infinite: false, freeze: false, onehit: false, noGens: false, hitboxes: false, flow: false, net: false, bot: false, botP1: false };
const anyCheat = () => CHEAT.god || CHEAT.noclip || CHEAT.infinite || CHEAT.freeze || CHEAT.onehit || CHEAT.noGens || CHEAT.botP1 || RUN.cheated;

/* ---- happenings: one name for every event the HUD, sound, narrator and network care about ---- */
const NET_EVENTS = new Set(['gone', 'drop', 'door', 'trap', 'wall', 'kill', 'gen', 'magic', 'say', 'hurt', 'stolen', 'bell', 'boss', 'stairs', 'over', 'chest', 'eat', 'shotfood', 'pickup', 'spawnfx', 'rise', 'fall', 'secret', 'tele', 'stun', 'genhit', 'hoard', 'tithe', 'king']);
function happen(type, d = {}) {
  if (W && W.net === 'host' && NET_EVENTS.has(type)) W.outbox.push([type, d]);
  bus.emit(type, d);
}

/* ---- heroes (persistent across floors) ---- */
function makeHero(cls, pi, o = {}) {
  const D = get('heroes', cls);
  return {
    pi, cls, D, name: o.name || D.name, color: o.color || D.color, input: o.input || null, bot: null, remote: !!o.remote, netId: o.netId,
    hp: startHealth(), score: 0, keys: 0, flasks: 0, specials: {}, amulet: null, amuletT: 0, alive: true, continues: 0,
    stats: { kills: 0, treasure: 0, food: 0, foodShot: 0, gens: 0, stairs: 0 },
    x: 0, y: 0, vx: 0, vy: 0, r: 5, face: Math.PI / 2, aim: Math.PI / 2, cool: 0, swing: null, throwT: -9, stun: 0, runeImm: 0, queasy: 0, inv: 0, hurtT: 0,
    deadT: 0, stairT: 0, wallT: 0, padLock: -1, menu: 0, intent: null, lines: {}, hb: 0, cd: {}, firing: false, plant: false, joined: 0
  };
}
const startHealth = () => Math.round(TUNE.startHealth * DIFF().hp);
const limitOf = h => h.specials.deeppockets ? 12 : 9;
const living = () => W ? W.heroes.filter(h => h.alive) : [];

/* ---- the world of one floor ---- */
function newWorld(floorId, o = {}) {
  const fd = get('floors', floorId), p = parseFloor(fd), map = p.map;
  const w = {
    id: floorId, fd, no: fd.no, realm: fd.realm, p, map, t: 0, serial: (W ? W.serial : 0) + 1, nextId: 100000,
    heroes: PARTY, mons: [], gens: [], items: [], shots: [], fx: [], outbox: [],
    doorGroups: p.doorGroups, pads: p.pads, runes: p.runes, spikes: p.spikes, beams: p.beams, plates: p.plates, cracked: p.cracked, fakes: p.fakes, exits: p.exits,
    field: null, fieldKey: '', bell: null, bellRung: false, stage: 0, titheDue: fd.no >= 5 && !fd.hoard && !fd.boss, titheCame: false,
    hoard: fd.hoard ? { t: TUNE.hoardTime, total: 0, taken: 0 } : null, boss: null, done: null, net: o.net || 'local', attract: !!o.attract,
    viewHalf: [14 * T, 8 * T], cam: { x: 0, y: 0 }, foundSecret: false, lines: {}, ranks: o.loop > 1 ? 1 : 0, seenKinds: {}
  };
  W = w;
  const rk = r => clamp(r + w.ranks, 1, 3);
  for (const it of p.items) w.items.push({ ...it, kind: it.kind, sub: it.sub, open: false });
  if (fd.lchest) for (const it of w.items) if (it.kind === 'lchest') it.sub = fd.lchest;
  if (w.hoard) w.hoard.total = w.items.filter(i => get('items', i.kind).treasure).length;
  for (const m of p.mons) spawnMon(m.type, m.x, m.y, rk((fd.ranks && fd.ranks[m.cx + ',' + m.cy]) || fd.rank || 1), { id: m.id, placed: true });
  for (const g of p.gens) w.gens.push({ id: g.id, type: g.type, x: g.x, y: g.y, cx: g.cx, cy: g.cy, r: 7, rank: rk(g.type === 'tureen' ? 2 : fd.genRank || 1), hp: 0, t: 1 + E.hash2(g.cx, g.cy) * 2, kids: 0, shake: 0, onTable: g.onTable });
  for (const g of w.gens) { g.hp = genMaxHp(g.rank); g.rank0 = g.rank; }
  // heroes to the starts
  PARTY.forEach((h, i) => placeHero(h, p.starts[i % p.starts.length] || p.starts[0], i));
  if (fd.boss) setupBoss(w);
  return w;
}
function placeHero(h, s, i) {
  h.x = s.x + (i >= 4 ? (i - 3) * 6 : 0); h.y = s.y; h.vx = h.vy = 0; h.stairT = 0; h.wallT = 0; h.padLock = -1; h.swing = null; h.stun = 0; h.inv = 1; h.menu = 0;
  h.body = new E.Body({ x: h.x, y: h.y, r: 5, gravity: 0 });
}
const genMaxHp = rank => 4 * rank * TUNE.generatorHp;
const nid = () => W.nextId++;

function spawnMon(type, x, y, rank, o = {}) {
  const D = get('monsters', type);
  const m = { id: o.id || nid(), type, D, rank, srank: rank, hp: D.hp * rank, x, y, vx: 0, vy: 0, r: D.r, face: Math.PI / 2, t: R() * 2, atk: 0, wind: 0, state: 'go', vis: 1, visT: 2, carry: null, drained: {}, emerge: o.emerge ? .4 : 0, home: o.home || null, gen: o.gen || null, hurtT: 0, cd: {}, wake: !!o.awake, shrink: 0 };
  m.body = new E.Body({ x, y, r: D.r, gravity: 0 });
  W.mons.push(m);
  return m;
}

/* ---- flow fields: a multi-source BFS toward every hero a monster can track (own code: the engine's has one target) ---- */
function buildField(sources) {
  const map = W.map, w = map.w, h = map.h, d = new Int32Array(w * h).fill(1e9), src = new Int8Array(w * h).fill(-1), q = new Int32Array(w * h);
  let qh = 0, qt = 0;
  for (const s of sources) { const k = s.cy * w + s.cx; if (s.cx < 0 || s.cy < 0 || s.cx >= w || s.cy >= h) continue; if (d[k] === 0) continue; d[k] = 0; src[k] = s.i; q[qt++] = k; }
  while (qh < qt) {
    const k = q[qh++], cx = k % w, cy = (k / w) | 0, nd = d[k] + 1;
    for (let n = 0; n < 4; n++) {
      const nx = cx + (n === 0 ? 1 : n === 1 ? -1 : 0), ny = cy + (n === 2 ? 1 : n === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nk = ny * w + nx; if (d[nk] <= nd || !map.walkable(nx, ny)) continue;
      d[nk] = nd; src[nk] = src[k]; q[qt++] = nk;
    }
  }
  return { d, src, w, h };
}
const cellOf = e => [Math.floor(e.x / T), Math.floor(e.y / T)];
function heroField() {
  const tr = W.heroes.filter(h => h.alive && !(h.amulet === 'veil'));
  const key = W.map.version + ':' + tr.map(h => cellOf(h).join(',') + h.pi).join('|') + (W.bell ? 'b' + W.bell.pi : '');
  if (key !== W.fieldKey || !W.field) {
    const list = W.bell ? tr.filter(h => h.pi === W.bell.pi) : tr;
    W.field = buildField((list.length ? list : tr).map(h => { const [cx, cy] = cellOf(h); return { cx, cy, i: h.pi }; }));
    W.fieldKey = key;
  }
  return W.field;
}
// the way to walk from (x, y) down a field: toward the best neighbouring cell (diagonals only past open corners)
function fieldDir(F, x, y, away) {
  const map = W.map, cx = Math.floor(x / T), cy = Math.floor(y / T), k0 = cy * F.w + cx, d0 = F.d[k0];
  if (d0 >= 1e9) return null;
  let best = null, bd = away ? -1 : d0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= F.w || ny >= F.h) continue;
    if (dx && dy && (!map.walkable(cx + dx, cy) || !map.walkable(cx, cy + dy))) continue;
    const nd = F.d[ny * F.w + nx] + (dx && dy ? .4 : 0);
    if (nd >= 1e9) continue;
    if (away ? nd > bd : nd < bd) { bd = nd; best = [nx, ny]; }
  }
  if (!best) return null;
  const tx = (best[0] + .5) * T, ty = (best[1] + .5) * T, l = Math.hypot(tx - x, ty - y) || 1;
  return [(tx - x) / l, (ty - y) / l];
}

/* ---- damage: one pipeline for everything ---- */
function heroArmor(h) { return h.D.armor * DIFF().dmg * (h.specials.ironbrew ? .8 : 1) * TUNE.monsterDamage; }
function hurtHero(h, amt, o = {}) {
  if (!h.alive || W.net === 'client') return 0;
  if (o.kind !== 'drain' && o.kind !== 'tithe' && (h.inv > 0 || h.amulet === 'ironskin')) return 0;
  if (CHEAT.god || (W.attract && !o.real)) return 0;
  const dmg = o.raw ? amt : Math.max(1, Math.round(amt * heroArmor(h)));
  h.hp -= dmg;
  if (o.kind !== 'drain') { h.hurtT = .25; happen('hurt', { pi: h.pi, dmg, kind: o.kind || 'hit', x: h.x, y: h.y }); if (o.from) { const a = Math.atan2(h.y - o.from.y, h.x - o.from.x); h.kx = Math.cos(a) * 90; h.ky = Math.sin(a) * 90; } }
  if (h.hp <= 0) heroFalls(h);
  return dmg;
}
function heroFalls(h) {
  h.hp = 0; h.alive = false; h.deadT = 0; h.amulet = null; h.swing = null; h.stairT = 0;
  if (W.bell && W.bell.pi === h.pi) W.bell = null;
  happen('fall', { pi: h.pi, x: h.x, y: h.y });
  say('eaten', h, 3);
}
function riseHero(h, o = {}) {
  const ally = W.heroes.find(a => a.alive && a !== h) || null, s = ally || W.p.starts[h.pi % W.p.starts.length];
  h.alive = true; h.hp = o.hp || startHealth(); h.inv = 2; h.deadT = 0;
  if (!o.free) h.continues++;
  let x = s.x, y = s.y;
  for (const [dx, dy] of [[14, 0], [-14, 0], [0, 14], [0, -14], [10, 10], [0, 0]]) if (W.map.walkable(Math.floor((s.x + dx) / T), Math.floor((s.y + dy) / T))) { x = s.x + dx; y = s.y + dy; break; }
  h.x = x; h.y = y; h.body.x = x; h.body.y = y; h.vx = h.vy = 0;
  happen('rise', { pi: h.pi, x, y });
  say('rise', h, 2);
}
function hurtMon(m, amt, o = {}) {
  if (m.dead || W.net === 'client') return false;
  if (m.D.immune && o.kind !== 'magic' && o.kind !== 'blast') { if (o.kind === 'shot') happen('clink', { x: m.x, y: m.y }); return false; }
  if (m.type === 'fryar' && m.vis < .5 && o.kind !== 'magic' && o.kind !== 'blast') return false;
  if (m.emerge > 0 && o.kind !== 'magic' && o.kind !== 'blast') return false;
  const before = Math.ceil(m.hp / m.D.hp - 1e-6);
  m.hp -= CHEAT.onehit ? 999 : amt; m.hurtT = .15; m.wake = true;
  if (o.by && o.by.x !== undefined && m.type !== 'tithe') { const a = Math.atan2(m.y - o.by.y, m.x - o.by.x); m.kx = Math.cos(a) * 60; m.ky = Math.sin(a) * 60; }
  if (m.hp <= 0 || m.D.immune) { killMon(m, o.by); return true; }
  const after = Math.ceil(m.hp / m.D.hp - 1e-6);
  if (after < before) { m.rank = after; m.shrink = .25; happen('rankdown', { id: m.id, x: m.x, y: m.y, type: m.type }); }
  happen('monhit', { id: m.id, x: m.x, y: m.y, kind: o.kind });
  return true;
}
function killMon(m, by) {
  if (m.dead) return; m.dead = true;
  const pts = m.D.points * m.srank;
  if (by && by.pi !== undefined) { addScore(by, pts, m); by.stats.kills++; }
  if (m.carry) dropItem(m.carry.kind, m.x, m.y, m.carry.sub);
  if (m.type === 'tithe' && by) say('tithe_slain', by, 3);
  if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1);
  happen('kill', { id: m.id, type: m.type, x: m.x, y: m.y, by: by ? by.pi : -1, pts, rank: m.srank });
}
function hurtGen(g, amt, by, kind) {
  if (g.dead || W.net === 'client') return;
  if (CHEAT.onehit) amt = 999;
  g.hp -= amt; g.shake = .2;
  g.rank = Math.max(1, Math.ceil(g.hp / (4 * TUNE.generatorHp) - 1e-6));
  happen('genhit', { id: g.id, x: g.x, y: g.y, dmg: amt, rank: g.rank });
  if (g.hp <= 0) {
    g.dead = true;
    const pts = 25 * (g.rank0 || 1);
    if (by && by.pi !== undefined) { addScore(by, pts, g); by.stats.gens++; }
    if (R() < .1) dropItem('loaf', g.x, g.y);
    happen('gen', { id: g.id, x: g.x, y: g.y, type: g.type, by: by ? by.pi : -1 });
    if (g.type === 'tureen' && W.boss) happen('say', { k: 'tip_generator' });
  }
}
function addScore(h, pts, at) {
  if (!h || pts <= 0) return;
  h.score += Math.round(pts);
  if (at) happen('score', { pi: h.pi, pts: Math.round(pts), x: at.x, y: at.y });
}
function dropItem(kind, x, y, sub) {
  const it = { id: nid(), kind, sub, x, y, cx: Math.floor(x / T), cy: Math.floor(y / T), drop: true, open: false };
  W.items.push(it);
  happen('drop', { id: it.id, kind, sub, x, y });
  return it;
}

/* ---- the narrator's say: the host decides lines about events; tips are once per game ---- */
function say(key, h, pri = 2) {
  if (!W) return;
  happen('say', { k: key, pi: h ? h.pi : -1, pri });
}
