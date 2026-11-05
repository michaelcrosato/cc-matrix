/* SIM CORE: state, queries, movement, features, wiring. Pure and deterministic; never touches the view or the page, and draws all randomness from B.rng. */
B.S = null;
const FLOOR_CH = '.@<>^SOoPTI';
B.F = id => B.S.floors[id || B.S.floor];
B.def = id => B.FLOORS[id || B.S.floor];
B.ev = (t, o) => { const S = B.S; if (S.events.length > 400) S.events.shift(); S.events.push(Object.assign({ t }, o)); };
B.log = (text, kind) => { const S = B.S; S.log.push(text); if (S.log.length > 100) S.log.shift(); B.ev('log', { text, kind: kind || '' }); };
B.key = (x, y) => x + ',' + y;
B._u = 0; B.uid = () => B.S ? ++B.S.uid : ++B._u;
B.ref = (id, o) => { const it = B.ITEMS[id]; const r = Object.assign({ id, uid: B.uid() }, o || {}); if (it.stack && !r.n) r.n = it.n0 || 1; if (it.t === 'wand' && r.charges == null) r.charges = it.charges; return r; };
B.chAt = (id, x, y) => { const d = B.FLOORS[id]; return x < 0 || y < 0 || x >= d.w || y >= d.h ? '#' : d.rows[y][x]; };
/** the cell character as it is NOW (secret walls sunk read as floor) */
B.cell = (x, y, id) => { id = id || B.S.floor; const c = B.chAt(id, x, y), F = B.S.floors[id]; if (c === 'H') return F.secrets[B.key(x, y)] ? '.' : '#'; return c; };
B.isGate = (x, y, id) => B.chAt(id || B.S.floor, x, y) === '=';
B.gateOpen = (x, y, id) => { const F = B.S.floors[id || B.S.floor], gid = B.FLOORS[id || B.S.floor].gates[B.key(x, y)]; return !!F.gates[gid]; };
B.doorState = (x, y) => B.F().doors[B.key(x, y)];
B.opaque = (x, y, id) => { id = id || B.S.floor; const c = B.cell(x, y, id); if (c === '#' || c === 'I') return true; if (c === '+' || c === 'L' || c === 'M') { const d = B.S.floors[id].doors[B.key(x, y)]; return !(d && d.open); } return false; };
/** can bodies stand on / pass through this cell? */
B.walkable = (x, y, id) => { id = id || B.S.floor; const c = B.cell(x, y, id), F = B.S.floors[id]; if (c === '#') return false; if (c === '+' || c === 'L' || c === 'M') { const d = F.doors[B.key(x, y)]; return !!(d && d.open); } if (c === '=') return B.gateOpen(x, y, id); return true; };
B.los = (x0, y0, x1, y1, id) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3; for (let i = 1; i < n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); if ((x !== x1 || y !== y1) && B.opaque(x, y, id)) return false; } return true; };
B.monsAt = (x, y) => B.F().mons.filter(m => m.hp > 0 && m.cx === x && m.cy === y);
B.unitsAt = (x, y, skip) => B.monsAt(x, y).reduce((a, m) => a + (m === skip ? 0 : m.size), 0);
B.npcAt = (x, y) => (B.F().npcs || []).find(n => n.cx === x && n.cy === y && !n.gone);
B.featureAt = (x, y, d) => B.def().features.find(f => f.at[0] === x && f.at[1] === y && f.at[2] === B.DIRS[d]);
B.fstate = f => B.F().fs[f.id || (f.at.join(','))] || (B.F().fs[f.id || (f.at.join(','))] = {});
B.front = () => { const p = B.S.party; return [p.cx + B.DX[p.dir], p.cy + B.DY[p.dir]]; };

B.initFloor = (id) => {
  const d = B.FLOORS[id], F = { doors: {}, gates: {}, secrets: {}, plates: {}, items: {}, alcoves: {}, mons: [], npcs: [], fs: {}, seen: new Array(d.w * d.h).fill(0), visited: false, teles: {}, flags: {}, disarmed: {}, seqs: {}, wanders: 0, time: 0, hinted: {}, unleashed: {}, groups: {} };
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const c = d.rows[y][x]; if (c === '+') F.doors[B.key(x, y)] = { open: false }; else if (c === 'L' || c === 'M') F.doors[B.key(x, y)] = { open: false, locked: true }; }
  for (const k in (d.gates || {})) F.gates[d.gates[k]] = false;
  for (const k in (d.plates || {})) F.plates[d.plates[k].id] = { down: false };
  for (const k in (d.tele || {})) F.teles[d.tele[k].id] = true;
  for (const ft of d.features) { if (ft.k === 'alcove') F.alcoves[ft.id] = (ft.holds || []).map(i => B.ref(i)); }
  for (const it of d.items) { const k = B.key(it[0], it[1]); (F.items[k] = F.items[k] || []).push(B.ref(it[2], it[3] ? { n: it[3] } : null)); }
  let mi = 0;
  for (const m of d.mons) F.mons.push(B.makeMon(m[2], m[0], m[1], m[3] || 'idle', m[4], id + (mi++)));
  for (const n of (d.npcs || [])) F.npcs.push({ id: n.id, cx: n.at[0], cy: n.at[1], face: n.face || 0, gone: false });
  return F;
};
B.makeMon = (type, cx, cy, state, o, id) => {
  const t = B.MONS[type], S = B.S; const hp = Math.max(1, Math.round(t.hp));
  return Object.assign({ id: id || ('m' + B.uid()), type, cx, cy, fx: cx, fy: cy, mt: 0, mdur: 0, slot: 0, hp, max: hp, size: t.size, state: state || 'idle', timer: 0, wind: 0, cool: 1 + (hash(type + cx * 7 + cy) % 10) / 10, aware: false, status: {}, dir: 0, lost: 0, home: [cx, cy], path: null, pathT: 0, face: 0, hurtT: 0, dieT: 0, summoned: false }, o || {});
  function hash(s) { return parseInt(B.hashStr(String(s)).slice(0, 4), 16); }
};
B.newState = (seed, members, diff) => {
  const S = B.S = { v: 1, seed, rng: { combat: seed >>> 0, ai: (seed * 7 + 1) >>> 0, loot: (seed * 13 + 5) >>> 0, world: (seed * 31 + 9) >>> 0 }, uid: B._u + 100, time: 0, playTime: 0, floor: 'f1', diff: diff || 'normal', events: [],
    party: { cx: 0, cy: 0, dir: 0, tween: null, queued: null, hand: null, selected: 0, members, formation: [0, 1, 2, 3, 4, 5].slice(0, members.length), light: 1, floating: 0, seeing: 0, bump: 0, fall: 0, raise: 0 },
    floors: {}, flags: {}, special: { d1: false, d2: false, d3: false }, secretsFound: [], notes: [], log: [], stats: { kills: 0, secrets: 0, deaths: 0, potions: 0, rests: 0, steps: 0 }, camp: null, boss: null, proj: [], cds: {}, loops: 0, hintT: 0, msgT: 0, race: null, over: false, ended: false, quest: {}, ghostSeen: {} };
  for (const id of B.ORDER) S.floors[id] = B.initFloor(id);
  S.floors.rr = B.initFloor('rr');
  const d = B.FLOORS.f1; Object.assign(S.party, { cx: d.start[0], cy: d.start[1], dir: d.start[2] });
  B.floorEnter('f1', true);
  return S;
};
/** a member from a build: race, class, stats (3..18), name, look, sex, lvl */
B.makeMember = (o) => {
  const S = B.S, r = B.RACES[o.race], c = B.CLASSES[o.cls], st = Object.assign({ str: 10, dex: 10, con: 10, int: 10, wis: 10 }, o.stats);
  const m = { id: o.id || ('p' + B.uid()), name: o.name, race: o.race, cls: o.cls, sex: o.sex || 'm', look: o.look || 0, lvl: 1, xp: 0, hp: 1, max: 1, food: 100, stats: st, state: 'ok', status: {},
    slots: { head: null, neck: null, body: null, arms: null, main: null, off: null, ring1: null, ring2: null, feet: null, quiver: null }, pack: new Array(12).fill(null), book: [], prep: { 1: [], 2: [], 3: [] }, spent: { 1: [], 2: [], 3: [] }, cool: { main: 0, off: 0 }, ward: 0, lay: 1, npc: o.npc || null, voice: o.voice || null, appearance: o.appearance || null, brace: 0 };
  m.max = c.die + B.mod(st.con) + 2; m.hp = m.max;
  const gear = o.gear || c.gear;
  for (const g of gear) B.equipStart(m, g);
  if (m.cls !== 'mage' && m.cls !== 'cleric' && m.cls !== 'paladin') { /* no book */ }
  if (m.cls === 'mage') { m.book = ['spark', 'seams', 'slumber']; B.autoPrep(m); }
  if (m.cls === 'cleric') { B.autoPrep(m); }
  if (!o.noRation) B.packAdd(m, B.ref('ration'));
  while (m.lvl < (o.lvl || 1)) B.levelUp(m, true);
  m.hp = m.max; return m;
};
B.equipStart = (m, id) => {
  const it = B.ITEMS[id]; let ref = B.ref(id);
  const put = s => { if (!m.slots[s]) { m.slots[s] = ref; return true; } return false; };
  if (it.t === 'ammo') { if (!put('quiver')) B.packAdd(m, ref); return; }
  if (it.slot === 'hand') { if (!put('main') && !put('off')) B.packAdd(m, ref); return; }
  if (it.slot === 'ring') { if (!put('ring1') && !put('ring2')) B.packAdd(m, ref); return; }
  if (it.slot && m.slots[it.slot] === null) { m.slots[it.slot] = ref; return; }
  B.packAdd(m, ref);
};
B.packAdd = (m, ref) => { const it = B.ITEMS[ref.id]; if (it.stack) { for (const p of m.pack) if (p && p.id === ref.id && p.n < it.stack) { const mv = Math.min(it.stack - p.n, ref.n); p.n += mv; ref.n -= mv; if (ref.n <= 0) return true; } } const i = m.pack.indexOf(null); if (i < 0) return false; m.pack[i] = ref; return true; };
B.partyAdd = (ref) => { const S = B.S, p = S.party, order = [p.selected, ...p.members.map((_, i) => i)]; for (const i of order) { const m = p.members[i]; if (m && m.state !== 'dead' && B.packAdd(m, ref)) return m; } return null; };

/* ---- seeing ---- */
B.look = () => {
  const S = B.S, p = S.party, F = B.F(), d = B.def(), R = 4;
  for (let y = Math.max(0, p.cy - R); y <= Math.min(d.h - 1, p.cy + R); y++) for (let x = Math.max(0, p.cx - R); x <= Math.min(d.w - 1, p.cx + R); x++) {
    if (Math.abs(x - p.cx) + Math.abs(y - p.cy) > R + 1) continue;
    if (B.los(p.cx, p.cy, x, y)) F.seen[y * d.w + x] = 1;
  }
};
B.canSee = (x, y) => { const p = B.S.party; return B.los(p.cx, p.cy, x, y); };

/* ---- floors ---- */
B.floorEnter = (id, first) => {
  const S = B.S, F = S.floors[id]; S.floor = id; F.visited = true; F.time = 0; S.proj.length = 0; S.party.tween = null;
  const d = B.FLOORS[id]; if (d.boss && !S.boss) B.bossInit();
  B.look(); B.ev('floor', { id, first: !!first });
};
B.goStairs = (to, at) => {
  const S = B.S, p = S.party;
  if (to === 'end') { B.ev('ending', {}); S.ended = true; return; }
  if (to === 'finish') { if (B.raceFinish) B.raceFinish(); B.ev('raceDone', {}); return; }
  p.cx = at[0]; p.cy = at[1]; p.dir = at[2] != null ? at[2] : p.dir; p.tween = null; p.queued = null;
  B.floorEnter(to); B.ev('stairs', { to });
  B.autosave && B.autosave();
};
/** a fall to another floor (a pit): 1d6 to each, landing cell */
B.fall = (to, at) => {
  const S = B.S, p = S.party; if (!to) return;
  for (const m of p.members) if (m.state === 'ok') B.hurtMember(m, B.dice(S, 'world', 1, 6), 'fall', true);
  p.cx = at[0]; p.cy = at[1]; p.tween = null; p.queued = null; p.fall = 1; B.floorEnter(to); B.ev('fall', {}); B.log(B.MSG.pit, 'bad');
};

/* ---- movement ---- */
B.stepTime = () => B.T.step * ({ smooth: 1, quick: .57, instant: 0 }[B.opt.anim || 'smooth']);
B.turnTime = () => B.T.turn * ({ smooth: 1, quick: .6, instant: 0 }[B.opt.anim || 'smooth']);
B.opt = { anim: 'smooth' };
B.busy = () => !!B.S.party.tween;
B.partyBlockedBy = (x, y) => {
  const S = B.S, c = B.cell(x, y);
  if (B.CHEATS.noclip) return null;
  if (c === '#') return 'wall';
  if (c === '+' || c === 'L' || c === 'M') { const d = B.F().doors[B.key(x, y)]; if (!(d && d.open)) return c === '+' ? 'door' : c === 'L' ? 'locked' : 'seal'; }
  if (c === '=' && !B.gateOpen(x, y)) return 'gate';
  if (B.monsAt(x, y).length) return 'mon';
  if (B.npcAt(x, y)) return 'npc';
  if (S.boss && S.boss.hp > 0 && B.bossBlocks(x, y)) return 'mon';
  return null;
};
B.cmdMove = (rel) => { // 'f' 'b' 'l' 'r'
  const S = B.S, p = S.party; if (p.tween) { p.queued = { c: 'move', d: rel }; return false; }
  if (S.camp || S.over) return false;
  if (B.heldAll()) return false;
  const d = ({ f: 0, r: 1, b: 2, l: 3 }[rel] + p.dir) % 4, nx = p.cx + B.DX[d], ny = p.cy + B.DY[d];
  const why = B.partyBlockedBy(nx, ny);
  if (why) { p.bump = .001; B.ev('bump', { why }); if (S.msgT <= 0) { S.msgT = 2; B.log({ wall: B.MSG.wall, door: 'The door is shut. Press ✕ to open it.', locked: B.MSG.locked, seal: B.MSG.seal, gate: B.MSG.gate, mon: B.MSG.mon, npc: 'Someone stands in the way.' }[why] || B.MSG.wall); } return false; }
  p.tween = { from: [p.cx, p.cy, p.dir], t: 0, dur: B.stepTime(), kind: 'step', to: [nx, ny, p.dir], bob: 1 };
  p.cx = nx; p.cy = ny; S.stats.steps++; B.ev('step', {}); B.look(); B.noise(p.cx, p.cy, 1, false); if (B.reengage) B.reengage();
  if (p.tween.dur <= 0) B.finishTween();
  return true;
};
B.cmdTurn = (s) => {
  const S = B.S, p = S.party; if (p.tween) { p.queued = { c: 'turn', s }; return false; }
  if (S.camp || S.over || B.heldAll()) return false;
  p.tween = { from: [p.cx, p.cy, p.dir], t: 0, dur: B.turnTime(), kind: 'turn', to: [p.cx, p.cy, (p.dir + s + 4) % 4], bob: 0 };
  p.dir = (p.dir + s + 4) % 4; B.ev('turn', {}); B.look();
  if (p.tween.dur <= 0) B.finishTween();
  return true;
};
B.heldAll = () => B.S.party.members.every(m => m.state !== 'ok' || m.status.held > 0);
B.finishTween = () => {
  const S = B.S, p = S.party, tw = p.tween; p.tween = null;
  if (tw && tw.kind === 'step') B.arrive();
  if (p.queued && !p.tween) { const q = p.queued; p.queued = null; if (q.c === 'move') B.cmdMove(q.d); else B.cmdTurn(q.s); }
};
/** the party has come into its cell: plates are recomputed per step; pits, traps, teleporters, spinners, stairs, items */
B.arrive = () => {
  const S = B.S, p = S.party, F = B.F(), d = B.def(), c = B.chAt(S.floor, p.cx, p.cy), k = B.key(p.cx, p.cy);
  B.ev('arrive', { x: p.cx, y: p.cy });
  B.signal('enter:' + k);
  if (c === 'I' && !F.fs['ill' + k]) { F.fs['ill' + k] = 1; }
  if (c === 'I') { B.ev('illusion', {}); B.log(B.MSG.illusion, 'good'); const sec = d.secrets && d.secrets[k]; if (sec) B.secret(sec); }
  if (c === 'T' && !F.disarmed[k]) { B.log(B.MSG.darts, 'bad'); B.ev('darts', {}); const al = p.members.filter(m => m.state === 'ok'); for (let i = 0; i < 2 && al.length; i++) { const m = al.splice(B.int(S, 'world', al.length), 1)[0]; B.hurtMember(m, Math.max(1, Math.round(B.dice(S, 'world', 1, 4) * B.T.trap)), 'darts', true); } }
  if (c === 'O' && !p.floating && !B.CHEATS.noclip) { const pit = d.pits && d.pits[k]; if (pit) { B.fall(pit.to, pit.at); return; } }
  if (c === 'o' && !p.floating && !B.CHEATS.noclip) { const pit = d.pits && d.pits[k]; if (pit) { B.log('The floor was never floor. A trapdoor!', 'bad'); B.fall(pit.to, pit.at); return; } }
  if (c === '^') { const tl = d.tele[k]; if (tl && F.teles[tl.id]) { S.loops++; if (!tl.silent) { B.ev('tele', {}); B.log(B.MSG.tele); } p.cx = tl.to[0]; p.cy = tl.to[1]; p.dir = tl.to[2]; B.look(); B.signal('loops:' + S.loops); } }
  if (c === 'S') { p.dir = B.int(S, 'world', 4); B.ev('spin', {}); B.log(B.MSG.twist); }
  if (c === '>' || c === '<') { const st = d.stairs[k]; if (st) { if (st.to === 'f1' && false) { } B.goStairs(st.to, st.at); return; } }
  B.checkHints();
};
B.secret = (sid) => { const S = B.S; if (S.secretsFound.includes(sid)) return; S.secretsFound.push(sid); S.stats.secrets++; B.ev('secretFound', {}); B.log('A secret is found!', 'good'); B.giveXP(25, 'secret'); };
B.checkHints = () => {};

/* ---- wiring ---- */
B.signal = (name) => {
  const d = B.def(), F = B.F();
  for (const w of d.wires) if (w.when === name) for (const a of w.do) B.act(a);
};
B.act = (a) => {
  const S = B.S, F = B.F(), d = B.def(), op = a[0];
  if (op === 'gate') { const was = F.gates[a[1]]; F.gates[a[1]] = a[2] === 'open'; if (was !== F.gates[a[1]]) B.ev('gate', { id: a[1], open: F.gates[a[1]] }); }
  else if (op === 'secret') { F.secrets[a[1]] = true; B.ev('secretOpen', { key: a[1] }); const s = d.secrets[a[1]]; if (s) B.secret(s); }
  else if (op === 'special') B.special(a[1]);
  else if (op === 'msg') B.log(a[1], 'good');
  else if (op === 'tele') { F.teles[a[1]] = a[2] === 'on'; }
  else if (op === 'reset') { for (const ft of d.features) if (ft.k === 'candle') { B.fstate(ft).lit = false; } F.seqs[a[1]] = []; B.ev('candlesOut', {}); }
  else if (op === 'hurt') { for (const m of S.party.members) if (m.state === 'ok') B.hurtMember(m, a[1], 'trap', true); }
  else if (op === 'flag') S.flags[a[1]] = a[2];
  else if (op === 'give') { const k = B.key(a[2][0], a[2][1]); (F.items[k] = F.items[k] || []).push(B.ref(a[1])); }
};
B.special = (id) => { const S = B.S; if (S.special[id]) return; S.special[id] = true; B.ev('deed', { id }); B.log('A hidden deed is done!', 'good'); B.giveXP(100, 'deed'); };

/* ---- plates: recomputed each step ---- */
B.updatePlates = () => {
  const S = B.S, p = S.party, F = B.F(), d = B.def();
  for (const k in (d.plates || {})) {
    const pl = d.plates[k], [x, y] = k.split(',').map(Number); let w = false;
    if (p.cx === x && p.cy === y && !p.floating && !(p.tween && p.tween.kind === 'step' && p.tween.t < p.tween.dur * .98 && false)) w = true;
    if ((F.items[k] || []).length) w = true;
    if (B.monsAt(x, y).some(m => m.size >= 2 && !B.MONS[m.type].fly)) w = true;
    const st = F.plates[pl.id]; if (w !== st.down) { st.down = w; B.ev('plate', { id: pl.id, down: w }); B.signal('plate:' + pl.id + ':' + (w ? 'down' : 'up')); }
  }
};

/* ---- using what is in front ---- */
B.cmdUse = () => {
  const S = B.S, p = S.party, F = B.F(), d = B.def(); if (S.over || S.camp || p.tween) return false;
  const [fx, fy] = B.front(), fc = B.cell(fx, fy), fk = B.key(fx, fy), hand = p.hand;
  const ft = B.featureAt(p.cx, p.cy, p.dir);
  if (hand && ft) {
    if (ft.k === 'alcove') return B.alcovePlace(ft);
    if (ft.k === 'clock' && B.ITEMS[hand.id].gear) return B.clockInsert(ft);
    if (ft.k === 'undergate' && B.ITEMS[hand.id].key && /^ward/.test(B.ITEMS[hand.id].key)) return B.undergateInsert(ft);
  }
  if (fc === 'T' && !F.disarmed[fk]) { const th = p.members.find(m => m.state === 'ok' && m.cls === 'thief'); if (th) { const ch = .5 + .1 * B.mod(th.stats.dex) + .05 * th.lvl; if (B.rng(S, 'world') < ch) { F.disarmed[fk] = true; B.log(th.name + ' disarms the dart trap.', 'good'); B.ev('catch', {}); } else { B.log(th.name + ' slips. The trap fires!', 'bad'); B.ev('darts', {}); for (const m of p.members.filter(x => x.state === 'ok').slice(0, 2)) B.hurtMember(m, Math.max(1, Math.round(B.dice(S, 'world', 1, 4) * B.T.trap)), 'darts', true); F.disarmed[fk] = true; } return true; } }
  const npc = B.npcAt(fx, fy); if (npc) { B.ev('talk', { id: npc.id }); return true; }
  // the door or seal ahead
  if (fc === '+' || fc === 'L' || fc === 'M') {
    const ds = F.doors[fk];
    if (ds.open) { ds.open = false; B.ev('door', { x: fx, y: fy, open: false }); return true; }
    if (!ds.locked) { ds.open = true; B.ev('door', { x: fx, y: fy, open: true }); B.noise(fx, fy, 3, true); return true; }
    if (fc === 'M') { B.log(B.MSG.seal); B.ev('lockfail', {}); return true; }
    return B.tryUnlock(fx, fy, hand);
  }
  if (ft) { const r = B.useFeature(ft); if (r) return true; }
  if (hand) { return B.stowHand(); }
  // pick up from the front cell (if open and free of monsters), else from our own
  const tryCell = (x, y) => { const arr = F.items[B.key(x, y)]; if (arr && arr.length && !B.monsAt(x, y).length) { p.hand = arr.pop(); if (!arr.length) delete F.items[B.key(x, y)]; B.ev('pickup', {}); return true; } return false; };
  if (B.walkable(fx, fy) && tryCell(fx, fy)) return true;
  if (tryCell(p.cx, p.cy)) return true;
  B.log('Nothing here to use.'); return false;
};
B.stowHand = () => { const S = B.S, p = S.party, h = p.hand; if (!h) return false; const m = B.partyAdd(h); if (m) { p.hand = null; B.ev('stow', {}); return true; } B.log('The packs are full.'); return false; };
B.keyHolder = (kid) => { const p = B.S.party; if (p.hand && B.ITEMS[p.hand.id].key === kid) return { hand: true }; for (const m of p.members) { for (let i = 0; i < 12; i++) if (m.pack[i] && B.ITEMS[m.pack[i].id].key === kid) return { m, i }; } return null; };
B.takeKey = (h) => { const p = B.S.party; if (h.hand) p.hand = null; else h.m.pack[h.i] = null; };
B.tryUnlock = (x, y) => {
  const S = B.S, d = B.def(), F = B.F(), lk = d.locks[B.key(x, y)], ds = F.doors[B.key(x, y)]; if (!lk) { B.log(B.MSG.locked); return true; }
  const h = B.keyHolder(lk.key);
  if (h) { B.takeKey(h); ds.open = true; ds.locked = false; B.ev('door', { x, y, open: true, unlock: true }); B.log(B.MSG.unlock, 'good'); return true; }
  const th = S.party.members.find(m => m.state === 'ok' && m.cls === 'thief' && B.hasItem(m, 'lockpicks'));
  if (th && lk.kind === 'simple') { const ch = .5 + .1 * B.mod(th.stats.dex) + .05 * th.lvl; if (B.rng(S, 'world') < ch + .25) { ds.open = true; ds.locked = false; B.ev('door', { x, y, open: true, unlock: true, pick: true }); B.log(th.name + ' picks the lock.', 'good'); } else { B.ev('lockfail', { snap: true }); B.log(th.name + '\'s pick scratches and slips. Again.'); } return true; }
  B.ev('lockfail', {}); B.log(B.MSG.locked + ' ' + B.MSG.noKey); return true;
};
B.hasItem = (m, id) => Object.values(m.slots).some(r => r && r.id === id) || m.pack.some(r => r && r.id === id);
B.useFeature = (ft) => {
  const S = B.S, F = B.F(), st = B.fstate(ft);
  switch (ft.k) {
    case 'lever': st.on = !st.on; B.ev('lever', { id: ft.id, on: st.on }); B.noise(S.party.cx, S.party.cy, 4, true); B.signal('lever:' + ft.id + ':' + (st.on ? 'on' : 'off')); return true;
    case 'button': { B.ev('button', { id: ft.id }); B.signal('button:' + ft.id); const bt = F.fs.btn = F.fs.btn || {}; bt[ft.id] = S.time; for (const w of B.def().wires) if (w.when.startsWith('buttons:')) { const ids = w.when.slice(8).split('+'); if (ids.includes(ft.id) && ids.every(i => bt[i] != null && S.time - bt[i] <= B.T.btn) && !F.fs['done:' + w.when]) { F.fs['done:' + w.when] = true; B.signal(w.when); } } return true; }
    case 'catch': if (st.done) { B.log('The stone is already pressed.'); return true; } st.done = true; B.ev('catch', {}); B.signal('catch:' + ft.id); if (ft.secret) B.secret(ft.secret); return true;
    case 'plaque': { const n = B.NOTES[ft.text]; B.readNote(ft.text); return true; }
    case 'alcove': return B.alcoveTake(ft);
    case 'candle': return B.candleLight(ft);
    case 'clock': B.log('The great clock has ' + (F.fs.clock ? F.fs.clock.n || 0 : 0) + ' of 4 gears. It wants gears in the hand.'); return true;
    case 'undergate': B.log('Three keyholes: iron, brass, bone. ' + ((F.fs.ug && F.fs.ug.n) || 0) + ' of 3 wards are home.'); return true;
    case 'greatLock': return B.lockTurn(ft);
    case 'shrine': return B.shrineUse(ft);
    default: return false;
  }
};
B.readNote = (id) => { const S = B.S, n = B.NOTES[id]; if (!n) return; if (!S.notes.includes(id)) S.notes.push(id); B.ev('read', { id }); B.log(n[0] + ': ' + n[1]); };
B.alcoveTake = (ft) => { const S = B.S, F = B.F(), p = S.party, arr = F.alcoves[ft.id]; if (!arr || !arr.length) { B.log('The niche is empty.'); return true; } p.hand = arr.pop(); B.ev('alcoveTake', {}); return true; };
B.alcovePlace = (ft) => {
  const S = B.S, F = B.F(), p = S.party, h = p.hand; if (!h) return false;
  if (ft.accepts && h.id !== ft.accepts) { B.log('It does not fit the niche.'); B.ev('lockfail', {}); return true; }
  F.alcoves[ft.id].push(h); p.hand = null; B.ev('alcovePlace', {}); B.signal('alcove:' + ft.id + ':in'); return true;
};
B.clockInsert = (ft) => { const S = B.S, F = B.F(), p = S.party, st = F.fs.clock = F.fs.clock || { n: 0 }; p.hand = null; st.n++; B.ev('gear', { n: st.n }); B.log('The gear meshes. ' + st.n + ' of 4.', 'good'); if (st.n >= 4) { st.whole = true; B.ev('clockWhole', {}); B.signal('clock:whole'); } return true; };
B.undergateInsert = (ft) => {
  const S = B.S, F = B.F(), p = S.party, st = F.fs.ug = F.fs.ug || { n: 0, got: [] }, h = p.hand;
  if (st.got.includes(h.id)) { B.log('That ward is already home.'); return true; } st.got.push(h.id); st.n++; p.hand = null; B.ev('ward', { n: st.n }); B.log('A ward slides home. ' + st.n + ' of 3.', 'good');
  if (st.n >= 3) { B.ev('ugOpen', {}); B.signal('ug:open'); } return true;
};
B.candleLight = (ft) => {
  const S = B.S, F = B.F(), st = B.fstate(ft), d = B.def(); if (st.lit) { B.log('Already burning.'); return true; } st.lit = true; B.ev('candle', { id: ft.id });
  const seq = F.seqs.cands = F.seqs.cands || []; seq.push(ft.id); const want = d.seqs.cands;
  if (seq.length === want.length) { if (seq.every((v, i) => v === want[i])) B.signal('seq:cands:ok'); else B.signal('seq:cands:fail'); }
  else if (seq[seq.length - 1] !== want[seq.length - 1]) { B.signal('seq:cands:fail'); }
  return true;
};
B.shrineUse = (ft) => { const S = B.S, p = S.party, st = B.fstate(ft); const dead = p.members.find(m => m.state === 'dead'); if (st.used) { B.log('The rat-statues are still. The shrine has given what it had.'); return true; } if (!dead) { B.log('A ring of tiny rat statues watches you. It can raise one fallen friend, once.'); return true; } st.used = true; B.raise(dead, 'the Shrine of the Threshold'); return true; };
B.noise = (x, y, r, loud) => { const F = B.F(); for (const m of F.mons) if (m.hp > 0 && m.state === 'asleep' && Math.abs(m.cx - x) + Math.abs(m.cy - y) <= (loud ? r + 2 : 1)) { if (loud) B.wake(m); } };
