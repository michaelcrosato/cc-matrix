// Game state: inventory, hotbar, crafting and notions, clock, town (Banner, border, Cheer, rooms).
(() => {
const { E, T } = DQ;
const ev = DQ.events;

DQ.newState = function (mode) {
  const S = {
    mode, world: null, time: 0, bag: {}, hotbar: [null, null, null, null, null, null, null, null], sel: 0,
    equip: { weapon: 'stick', body: null, shield: null }, known: {}, flags: {}, name: 'Patch', look: 0, swatch: 0,
    stats: { broken: 0, placed: 0, crafted: {}, placedObj: {}, killed: {}, kills: 0, talked: {}, rooms: {}, buttons: 0, deaths: 0, discovered: {}, eaten: 0, hits: 0 },
    town: { planted: false, x: 37, y: 47, cheer: 0, level: 0, rooms: [], paid: {}, awards: {}, chestId: 0, name: 'Thimbleton' },
    clock: { day: 1, hour: 8, t: 0 }, quests: {}, residents: [], monsters: [], drops: [], bubbles: [], shots: [], fx: [], toasts: [], popups: [], bundle: null,
    cut: null, siege: { phase: 'none', wave: 0, t: 0, left: 0, hp: 0, ballistas: 0, checkpoint: null, tries: 0 }, boss: null, hero: null, played: 0, chapterClear: false, regionNow: 'glen'
  };
  return S;
};

// ---------- bag ----------
const inv = DQ.inv = {
  S() { return DQ.S; },
  count(id) { return DQ.S.bag[id] || 0; },
  slotsUsed() { return Object.keys(DQ.S.bag).filter(k => DQ.S.bag[k] > 0 && DQ.ITEMS[k].kind !== 'key').length; },
  canAdd(id) { const it = DQ.ITEMS[id]; if (!it) return false; const S = DQ.S; if (it.kind === 'key') return true; if ((S.bag[id] || 0) > 0) return (S.bag[id] || 0) < it.stack; return inv.slotsUsed() < 40; },
  add(id, n = 1, quiet) {
    const S = DQ.S, it = DQ.ITEMS[id]; if (!it || n <= 0) return 0;
    if (!inv.canAdd(id)) return 0;
    const room = it.kind === 'key' ? n : Math.min(n, it.stack - (S.bag[id] || 0)); if (room <= 0) return 0;
    const first = !(S.bag[id] > 0) && !S.flags['got_' + id];
    S.bag[id] = (S.bag[id] || 0) + room;
    S.flags['got_' + id] = 1;
    inv.autoSlot(id);
    if (!quiet) { DQ.toast('+' + room + ' ' + it.name, it.kind === 'key' ? '#ffd36a' : '#ffffff'); ev.emit('itemGained', { id, n: room }); }
    if (first || true) DQ.notionCheck('pickup', id);
    if (it.kind === 'weapon' || it.kind === 'body' || it.kind === 'shield') inv.equipBest();
    return room;
  },
  remove(id, n = 1) { const S = DQ.S; if ((S.bag[id] || 0) < n) return false; S.bag[id] -= n; if (S.bag[id] <= 0) { delete S.bag[id]; } return true; },
  has(needs) { return Object.entries(needs).every(([k, n]) => inv.count(k) >= n); },
  autoSlot(id) {
    const S = DQ.S, it = DQ.ITEMS[id]; if (!['block', 'obj', 'food', 'use'].includes(it.kind) && id !== 'banner') return;
    if (S.hotbar.includes(id)) return; const e = S.hotbar.indexOf(null); if (e >= 0) S.hotbar[e] = id;
  },
  equipBest() {
    const S = DQ.S; let best = null, bd = null, bs = null;
    for (const id of Object.keys(S.bag)) { const it = DQ.ITEMS[id]; if (!it || !(S.bag[id] > 0)) continue;
      if (it.kind === 'weapon' && (!best || it.atk > DQ.ITEMS[best].atk)) best = id;
      if (it.kind === 'body' && (!bd || it.def > DQ.ITEMS[bd].def)) bd = id;
      if (it.kind === 'shield' && (!bs || it.def > DQ.ITEMS[bs].def)) bs = id; }
    S.equip.weapon = best || S.equip.weapon; S.equip.body = bd; S.equip.shield = bs;
  },
  weapon() { return DQ.ITEMS[DQ.S.equip.weapon] || DQ.ITEMS.stick; },
  defense() { const S = DQ.S; return (S.equip.body ? DQ.ITEMS[S.equip.body].def : 0) + (S.equip.shield ? DQ.ITEMS[S.equip.shield].def : 0); },
  hotId() { const S = DQ.S; const id = S.hotbar[S.sel]; return id && (S.bag[id] > 0 || id === 'banner' && S.bag.banner) ? id : null; },
  cycle(d) { const S = DQ.S; S.sel = (S.sel + d + 8) % 8; DQ.audio && DQ.audio.sfx('select', { vol: .3 }); },
  // KO loses half of each material stack
  dropBundle() {
    const S = DQ.S, lost = {}; let any = false;
    for (const id of Object.keys(S.bag)) { const it = DQ.ITEMS[id]; if (!['mat', 'block'].includes(it.kind)) continue; const n = Math.floor(S.bag[id] / 2); if (n > 0) { lost[id] = n; S.bag[id] -= n; if (S.bag[id] <= 0) delete S.bag[id]; any = true; } }
    return any ? lost : null;
  }
};

// ---------- toasts, popups ----------
DQ.toast = (text, color = '#fff') => { const S = DQ.S; if (!S) return; S.toasts.push({ text, color, t: 0, life: 2.6 }); if (S.toasts.length > 7) S.toasts.shift(); };
DQ.popup = (kind, title, text, extra) => { const S = DQ.S; if (!S) return; S.popups.push({ kind, title, text, extra, t: 0, life: kind === 'level' ? 5 : 3.6 }); };

// ---------- crafting, notions ----------
DQ.recipeFor = out => DQ.RECIPES.find(r => r.out === out);
DQ.knowsRecipe = r => !!DQ.S.known[r.out];
DQ.learn = function (r, why) {
  const S = DQ.S; if (S.known[r.out]) return false; S.known[r.out] = 1;
  const it = DQ.ITEMS[r.out]; ev.emit('notion', { recipe: r, why });
  if (S.mode === 'story') DQ.popup('notion', "You've got a notion!", it.name + '. Craft it at ' + (r.station === 'pocket' ? 'your pocket' : 'a ' + DQ.STATIONS[r.station]) + '.', { icon: r.out });
  return true;
};
DQ.notionCheck = function (on, key) { for (const r of DQ.RECIPES) if (r.notion && r.notion.on === on && (on === 'start' || String(r.notion.key) === String(key))) DQ.learn(r, on + ':' + key); };
DQ.canCraft = r => DQ.inv.has(r.in);
DQ.craft = function (r, times = 1) {
  const S = DQ.S; let made = 0;
  for (let t = 0; t < times; t++) {
    if (!inv.has(r.in)) break; const out = DQ.ITEMS[r.out];
    if (!inv.canAdd(r.out)) { DQ.toast('Your bag is full!', '#ff8a8a'); break; }
    if (out.stack === 1 && inv.count(r.out) >= 1) { DQ.toast('You already have one.', '#ff8a8a'); break; }
    for (const [k, n] of Object.entries(r.in)) inv.remove(k, n);
    inv.add(r.out, r.n, true); made += r.n;
    S.stats.crafted[r.out] = (S.stats.crafted[r.out] || 0) + r.n;
  }
  if (made) { DQ.toast('Crafted ' + made + ' ' + DQ.ITEMS[r.out].name, '#ffe9a0'); ev.emit('crafted', { id: r.out, n: made }); }
  return made;
};
// which stations are within reach of the builder (placed workbench/hearth/forge within 3 blocks)
DQ.stationNear = function (station) {
  const S = DQ.S, h = S.hero; if (!h) return null; if (station === 'pocket') return true;
  for (const o of S.world.list) { if (DQ.OBJECTS[o.type].station !== station) continue; if (Math.hypot(o.x * T + 8 - h.x, o.y * T + 8 - h.y) < T * 3.6) return o; }
  return null;
};

// ---------- clock and light ----------
DQ.phase = h => h >= 19 || h < 5 ? 'night' : h < 7 ? 'dawn' : h < 17 ? 'day' : 'dusk';
DQ.ambient = h => {
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
  if (h >= 7 && h < 17) return { a: 1, c: [1, 1, 1] };
  if (h >= 17 && h < 19) { const t = (h - 17) / 2; return { a: lerp(1, .38, t), c: [lerp(1, 1, t), lerp(1, .78, t), lerp(1, .7, t)] }; }
  if (h >= 19 || h < 5) return { a: .32, c: [.62, .7, 1] };
  const t = (h - 5) / 2; return { a: lerp(.32, 1, t), c: [lerp(.62, 1, t), lerp(.7, 1, t), lerp(1, 1, t)] };
};
DQ.clockTick = function (dt, external) {
  const S = DQ.S, c = S.clock; const prev = c.hour;
  c.hour += dt * 24 / (DQ.tuning.dayMinutes * 60);
  if (c.hour >= 24) { c.hour -= 24; c.day++; ev.emit('newDay', { day: c.day }); }
  if (Math.floor(prev) !== Math.floor(c.hour)) ev.emit('hour', { hour: Math.floor(c.hour) });
  if (!external) S.time += dt;
};
DQ.sleepNow = function () { const S = DQ.S, c = S.clock; if (c.hour >= 5 && c.hour < 19) { c.day++; } c.hour = 6; S.hero.hp = S.hero.maxHp; S.hero.belly = Math.max(0, S.hero.belly - 10); ev.emit('newDay', { day: c.day }); ev.emit('slept', {}); };

// ---------- the town ----------
DQ.townRadius = () => { const L = DQ.LEVELS[Math.max(0, DQ.S.town.level - 1)] || DQ.LEVELS[0]; return L.radius; };
DQ.inBorder = (x, y) => { const t = DQ.S.town; if (!t.planted) return false; const r = DQ.townRadius(); return Math.abs(x - t.x) <= r && Math.abs(y - t.y) <= r; };
DQ.plantBanner = function (x, y) {
  const S = DQ.S, t = S.town; if (t.planted) return false;
  t.planted = true; t.x = x; t.y = y; t.level = 1;
  S.world.addObj('banner', x, y, { silent: true, extra: { born: 1 } });
  t.bannerHp = 300; ev.emit('bannerPlanted', {}); ev.emit('townLevel', { level: 1 });
  return true;
};
DQ.addCheer = function (n, why) {
  const S = DQ.S, t = S.town; if (!t.planted) return; n = Math.round(n * DQ.tuning.cheerMult); if (n <= 0) return;
  t.cheer += n; ev.emit('cheer', { n, why });
  const lv = DQ.cheerForLevel(t.cheer);
  while (t.level < lv) { t.level++; ev.emit('townLevel', { level: t.level }); DQ.notionCheck('level', t.level); }
};
DQ.townBannerObj = () => DQ.S.world.list.find(o => o.type === 'banner');

let roomDirty = 0;
ev.on('blockPlaced', () => { roomDirty = .3; }); ev.on('blockBroken', () => { roomDirty = .3; });
ev.on('objectPlaced', () => { roomDirty = .3; }); ev.on('objectRemoved', () => { roomDirty = .3; });
DQ.dirtyRooms = () => { roomDirty = .05; };
DQ.updateRooms = function (force) {
  const S = DQ.S, t = S.town, w = S.world; if (!t.planted && S.mode !== 'bee') return;
  const r = S.mode === 'bee' ? 30 : DQ.townRadius() + 2, cx = t.x, cy = t.y;
  const rooms = DQ.detectRooms(w, { x0: cx - r, x1: cx + r, y0: cy - r, y1: cy + r });
  const good = rooms.filter(x => x.ok); S.leaks = rooms.filter(x => !x.ok);
  const prev = t.rooms;
  for (const rm of good) {
    const old = prev.find(p => { let hit = 0; const set = new Set(p.cells.map(c => c[0] + c[1] * 99)); for (const c of rm.cells) if (set.has(c[0] + c[1] * 99)) hit++; return hit / Math.max(rm.size, p.size) >= .7; });
    rm.id = old ? old.id : (t.roomSeq = (t.roomSeq || 0) + 1);
    if (!old || old.type !== rm.type) {
      const inB = S.mode === 'bee' || DQ.inBorder(rm.cx, rm.cy);
      const key = rm.type + ':' + Math.round(rm.cx / 5) + ':' + Math.round(rm.cy / 5);
      ev.emit('roomFormed', { room: rm, type: rm.type, inBorder: inB });
      if (inB && !t.paid[key]) { const def = DQ.ROOMS.find(d => d.type === rm.type); if ((t.awards[rm.type] || 0) < def.max) { t.paid[key] = 1; t.awards[rm.type] = (t.awards[rm.type] || 0) + 1; DQ.addCheer(def.cheer, 'room'); } }
      S.stats.rooms[rm.type] = (S.stats.rooms[rm.type] || 0) + 1;
    }
  }
  for (const p of prev) if (!good.find(g => g.id === p.id)) ev.emit('roomLost', { room: p });
  t.rooms = good;
};
DQ.roomAt = (x, y) => { const t = DQ.S.town; return t.rooms.find(r => r.cells.some(c => c[0] === x && c[1] === y)); };
DQ.roomCount = type => DQ.S.town.rooms.filter(r => !type || r.type === type).length;
DQ.townTick = function (dt) {
  if (roomDirty > 0) { roomDirty -= dt; if (roomDirty <= 0) DQ.safe('rooms', () => DQ.updateRooms()); }
};
DQ.bedFree = () => { const S = DQ.S; const beds = S.world.list.filter(o => o.type === 'bed' && DQ.inBorder(o.x, o.y) && DQ.roomAt(o.x, o.y)); return beds; };
})();
