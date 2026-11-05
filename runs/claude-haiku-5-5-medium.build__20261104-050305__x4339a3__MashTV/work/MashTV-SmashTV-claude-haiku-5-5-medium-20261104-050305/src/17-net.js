/* MASH TV — 17-net: AI Hub Session Protocol v1, shared-world (the Lightning Round, §14.2–§14.4). The host's copy runs the world
 * (or a server copy runs it with no player); each other copy sends its player's intent to the host and mirrors the world the
 * host sends: a snapshot 15 times a second, the room on every change, the events as they happen. Only the host finishes. */

MT.NET = { on: false, info: null, host: false, server: false, me: -1, players: [], intents: {}, lastIntentAt: {}, evOut: [], sendT: 0,
  mirror: null, started: false, finished: false, card: null, room: null, goal: '', howto: '', endReason: null, endStandings: null, leftIds: {} };
MT.NET_KINDS = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'discoSmall', 'heckler', 'hecklerKing', 'tank', 'snake', 'snakeSeg', 'brute', 'lock', 'crate', 'paparazzo'];
MT.NET_SHOTS = ['orb', 'shard', 'beam', 'shell', 'tomato', 'butter', 'gravy', 'coin', 'card', 'static', 'tot', 'kernel', 'bolt'];
MT.NET_PICK = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'capsule', 'bomb', 'life', 'statuette'];
MT.NET_STATE = ['play', 'walk', 'drop', 'dead', 'out'];
MT.NET_PHASE = ['enter', 'intro', 'waves', 'clear', 'exit', 'left', 'boss', 'bossdone', 'bonus'];
MT.NET_WPN = ['blaster', 'spread', 'rockets', 'popcorn', 'laser'];
MT.NET_EV = ['kill', 'hurt', 'death', 'prime', 'prime-end', 'clear', 'key', 'boss-line', 'boss-dies', 'showstop', 'boom', 'stunt', 'out', 'encore', 'steal'];
MT.safeName = s => String(s || '').replace(/[^\x20-\x7e]/g, '?').slice(0, 12);
MT.hub = () => (typeof globalThis !== 'undefined' && globalThis.AIHub) || null;
MT.netSend = (data, o) => { const h = MT.hub(); return h ? h.send(data, o) : false; };

// the host's snapshot: integers only, the lists capped so the message stays well under the 16 KB limit (§ the README)
MT.netEncode = (W, run) => {
  const q = Math.round;
  const P = W.players.map(c => [c.slot, q(c.x), q(c.y), q(((c.aim !== null ? c.aim : c.face) || 0) * 100), c.hp, c.lives, c.cash, c.bombs, MT.NET_STATE.indexOf(c.state), MT.NET_WPN.indexOf(c.weapon.id) < 0 ? 0 : MT.NET_WPN.indexOf(c.weapon.id), (c.shielded ? 1 : 0) | (c.addonsOn && c.addonsOn.includes('speed') ? 2 : 0) | (c.addonsOn && c.addonsOn.includes('records') ? 4 : 0), q(c.dropZ || 0), c.showT > 0 ? 1 : 0, c.hurtT > 0 ? 1 : 0, c.kills, c.deaths, c.prizes.length]);
  let E = W.enemies.filter(e => e.alive && MT.NET_KINDS.includes(e.kind)).map(e => [e.id, MT.NET_KINDS.indexOf(e.kind), q(e.x), q(e.y), q((e.face || 0) * 100), q((e.hp / e.maxHp || 0) * 100), (e.wind > 0 ? 1 : 0) | (e.entering ? 2 : 0) | (e.flash > 0 ? 4 : 0) | (e.alpha !== undefined ? 8 : 0) | (e.blast !== undefined ? 16 : 0) | (e.fuse !== undefined ? 32 : 0), q(e.z || 0), e.parent ? e.parent.id : 0, e.seg || 0]);
  let B = W.fShots.map(s => [MT.NET_SHOTS.indexOf(s.kind) < 0 ? 0 : MT.NET_SHOTS.indexOf(s.kind), q(s.x), q(s.y), q(s.z || 0)]);
  let M = W.pShots.map(s => [q(s.x), q(s.y)]);
  let K = W.pickups.map(p => [MT.NET_PICK.indexOf(p.kind) < 0 ? 0 : MT.NET_PICK.indexOf(p.kind), q(p.x), q(p.y), p.persist ? 0 : q(p.life), p.cap ? MT.NET_SHOTS.length + Math.max(0, MT.CAPSULES.indexOf(p.cap)) : 0]);
  const bo = W.boss ? MT.netEncodeBoss(W.boss) : null;
  const pl = { t: 's', a: q(W.time * 100), rm: W.id, ph: MT.NET_PHASE.indexOf(W.phase), R: q(run.ratings.R), X: W.multiplier, k: run.keys, pm: W.primeOn ? 1 : 0, P, E, B, M, K,
    V: (W.vents || []).map(v => (v.state === 'idle' ? 0 : v.state === 'telegraph' ? 1 : 2)), C: (W.conveyors || []).map(c => c.dir), Sp: W.splats.map(s => [q(s.x), q(s.y), q(s.t)]), Bo: bo,
    Be: (W.beams || []).map(b => b.vertical ? [1, q(b.x), q(b.tele || 0)] : [0, q(b.x0), q(b.y0), q((b.a || 0) * 100), b.active ? 1 : 0]), ev: MT.NET.evOut.splice(0, 40) };
  // stay under 12 KB: trim the longest lists first
  let txt = JSON.stringify(pl);
  for (let guard = 0; txt.length > 11800 && guard < 20; guard++) { if (pl.E.length > 40) pl.E.length = Math.floor(pl.E.length * .8); else if (pl.B.length > 40) pl.B.length = Math.floor(pl.B.length * .8); else if (pl.K.length > 10) pl.K.length = 10; else break; txt = JSON.stringify(pl); }
  return pl;
};
MT.netEncodeBoss = (b) => {
  const parts = b.parts.map(p => [Math.round(p.hp), p.alive ? 1 : 0, p.open === false ? 0 : 1, Math.round((p.armor || 1) * 100), Math.round(p.ox || 0), Math.round(p.oy || 0)]);
  return { k: b.kind, x: Math.round(b.x), y: Math.round(b.y), al: b.alive ? 1 : 0, dy: b.dying > 0 ? 1 : 0, st: b.stance || b.phaseName || '', an: Math.round((b.angle || 0) * 100), pa: parts, ph: b.phaseName || '' };
};
// the mirror world: the same room data, with the entities the host sends in place of its own
MT.netApplyBoss = (W, bo) => {
  if (!bo) { W.boss = null; return; }
  if (!W.boss || W.boss.kind !== bo.k) W.boss = new MT.BOSS_CLASS[bo.k](W);
  const b = W.boss; b.x = bo.x; b.y = bo.y; b.alive = !!bo.al; b.dying = bo.dy ? 1 : 0; b.stance = bo.st; b.phaseName = bo.ph || b.phaseName; b.angle = bo.an / 100;
  bo.pa.forEach((p, i) => { const q = b.parts[i]; if (!q) return; q.hp = p[0]; q.alive = !!p[1]; q.open = p[2] === 1; q.armor = p[3] / 100; q.ox = p[4]; q.oy = p[5]; });
  if (b.kind === 'mashy') { b.hatch.open = b.parts[3] ? b.parts[3].open : b.hatch.open; b.body2.armor = b.body2.armor; }
  if (b.kind === 'lance') b.eye && (b.eye.open = !!(b.parts[b.parts.length - 1] && b.parts[b.parts.length - 1].open));
  if (b.kind === 'wheel') b.hub && (b.hub.armor = b.hub.armor);
};
MT.netApply = (W, s, run) => {
  if (!W) return;
  // players: the mirrors by slot; this copy's own player keeps its own position (prediction)
  for (const row of s.P) {
    const slot = row[0]; let c = W.players.find(q => q.slot === slot);
    if (!c) { c = new MT.Contestant(W, slot, { lives: 99, hp: 3 }); c.input = null; W.players.push(c); c.W = W; }
    const own = MT.NET.me === slot && !MT.NET.server;
    if (!own) { c.x = row[1]; c.y = row[2]; c.face = row[3] / 100; c.aim = null; }
    c.hp = row[4]; c.lives = row[5]; c.cash = row[6]; c.bombs = row[7]; c.state = MT.NET_STATE[row[8]] || 'play';
    c.weapon = { id: MT.NET_WPN[row[9]] || 'blaster', t: Infinity }; c.dropZ = row[11]; c.showT = row[12] ? .3 : 0; c.hurtT = row[13] ? .2 : 0;
    c.kills = row[14]; c.deaths = row[15]; c.netFlags = row[10];
    c.addons = {}; if (row[10] & 1) c.addons.shield = { t: 1 }; if (row[10] & 2) c.addons.speed = { t: 1 }; if (row[10] & 4) c.addons.records = { t: 1 };
    c.netSeen = true;
  }
  W.players = W.players.filter(c => s.P.some(r => r[0] === c.slot));
  // enemies: the mirror objects by host id
  const byId = MT.NET.mirror.enemies || (MT.NET.mirror.enemies = new Map()), seen = new Set(), list = [];
  for (const r of s.E) {
    const id = r[0]; seen.add(id);
    let e = byId.get(id);
    const kind = MT.NET_KINDS[r[1]];
    if (!e || e.kind !== kind) { e = { id, kind, D: MT.ENEMY[kind], r: MT.ENEMY[kind].r, counted: MT.ENEMY[kind].counted !== false, alive: true, rig: null, t: 0 }; byId.set(id, e); }
    const f = r[6];
    Object.assign(e, { x: r[2], y: r[3], face: r[4] / 100, hpPct: r[5] / 100, wind: f & 1 ? .3 : 0, entering: !!(f & 2), flash: f & 4 ? .1 : 0, alpha: f & 8 ? .45 : undefined, blast: f & 16 ? .5 : undefined, fuse: f & 32 ? .5 : undefined, z: r[7], alive: true, parentId: r[8], seg: r[9] });
    if (e.kind === 'snakeSeg') { const h = byId.get(e.parentId); e.parent = h || null; }
    list.push(e);
  }
  for (const id of [...byId.keys()]) if (!seen.has(id)) byId.delete(id);
  W.enemies = list;
  // every enemy's hp fraction stands as max hp for the health look
  for (const e of list) { e.maxHp = 1; e.hp = e.hpPct; }
  W.fShots = s.B.map(b => ({ kind: MT.NET_SHOTS[b[0]], x: b[1], y: b[2], z: b[3], team: 'f' }));
  W.pShots = s.M.map(m => ({ x: m[0], y: m[1], team: 'p' }));
  W.pickups = s.K.map(k => { const kind = MT.NET_PICK[k[0]]; const p = { kind, x: k[1], y: k[2], life: k[3] || 9, persist: k[3] === 0, age: W.time, cap: k[4] >= MT.NET_SHOTS.length ? MT.CAPSULES[k[4] - MT.NET_SHOTS.length] : undefined, val: 0 }; return p; });
  if (W.vents) W.vents.forEach((v, i) => { const st = s.V[i]; v.state = st === 1 ? 'telegraph' : st === 2 ? 'flame' : 'idle'; });
  if (W.conveyors) W.conveyors.forEach((cv, i) => { if (s.C[i] !== undefined) cv.dir = s.C[i]; });
  W.splats = s.Sp.map(p => ({ x: p[0], y: p[1], t: p[2], r: 14 }));
  W.beams = s.Be.map(b => b[0] ? { vertical: true, x: b[1], tele: b[2] } : { x0: b[1], y0: b[2], a: b[3] / 100, active: !!b[4] });
  W.phase = MT.NET_PHASE[s.ph] || W.phase;
  W.primeOn = !!s.pm;
  MT.netApplyBoss(W, s.Bo);
  run.ratings.R = s.R; run.keys = s.k;
  for (const ev of s.ev) MT.netReact(W, ev);
};
// events as they happen: the copy reacts to them as it would at home
MT.netEvent = (ev) => {
  const d = ev.data || {};
  const row = { ty: ev.type };
  if (ev.type === 'kill' && d.e) { row.k = MT.NET_KINDS.indexOf(d.e.kind); row.big = !!d.big; row.x = Math.round(d.e.x); row.y = Math.round(d.e.y); }
  if (ev.type === 'hurt' && d.c) row.s = d.c.slot;
  if (ev.type === 'death' && d.c) row.s = d.c.slot;
  if (ev.type === 'key' && d.n !== undefined) row.n = d.n;
  if (ev.type === 'boss-line') row.key = d.key;
  if (ev.type === 'showstop' && d.c) row.s = d.c.slot;
  if (ev.type === 'boom' || ev.type === 'stunt') { row.x = Math.round(d.x || 0); row.y = Math.round(d.y || 0); }
  if (ev.type === 'out' && d.c) row.s = d.c.slot;
  if (!MT.NET_EV.includes(ev.type)) return;
  MT.NET.evOut.push(row);
};
MT.netReact = (W, row) => {
  const cOf = s => W.players.find(c => c.slot === s);
  const data = {};
  if (row.ty === 'kill') data.e = { kind: MT.NET_KINDS[row.k], x: row.x, y: row.y }, data.big = row.big;
  if (row.s !== undefined) data.c = cOf(row.s) || W.players[0];
  if (row.n !== undefined) data.n = row.n;
  if (row.key !== undefined) data.key = row.key;
  if (row.x !== undefined && row.ty !== 'kill') { data.x = row.x; data.y = row.y; }
  if (row.ty === 'prime' || row.ty === 'clear') {}
  MT.reactTo({ type: row.ty, data });
};
// remote contestants: their last intent, held for up to a second; the host runs them
MT.netRemoteIntent = (c) => {
  const row = MT.NET.intents[c.slot]; const at = MT.NET.lastIntentAt[c.slot] || -1e9;
  if (!row || (MT.G.time - at) > 1) return { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
  return row;
};
// a copy's own player, sent to the host 15 times a second (the host also runs it: the copy sends, the host decides)
MT.netSendIntent = (I) => {
  MT.netSend({ t: 'i', m: I.move.map(v => Math.round(v * 100) / 100), a: I.aim === null ? null : Math.round(I.aim * 100) / 100, f: I.fire ? 1 : 0, sl: I.slide ? 1 : 0, bo: I.bomb ? 1 : 0, sb: I.showboat ? 1 : 0 }, { reliable: false });
};
MT.netOnMessage = (data, from) => {
  if (!data || typeof data !== 'object') return;
  if (data.t === 'i' && MT.NET.host) {
    MT.NET.intents[from] = { move: data.m || [0, 0], aim: data.a, fire: !!data.f, slide: !!data.sl, bomb: !!data.bo, showboat: !!data.sb, source: 'remote' };
    MT.NET.lastIntentAt[from] = MT.G.time;
  } else if (data.t === 's' && !MT.NET.host) {
    MT.NET.lastSnap = data;
  } else if (data.t === 'room' && !MT.NET.host) {
    MT.netMirrorRoom(data.rm);
  }
};
// the copy's room: a mirror World on each change (the host's room message comes first, reliable)
MT.netMirrorRoom = (rm) => {
  const run = MT.run, G = MT.G; if (!run) return;
  if (MT.PLAY.W && MT.PLAY.W.id === rm && MT.NET.mirror) return;
  const W = new World(run, rm, { entry: 'S', players: run.players.map(p => p.c).filter(Boolean) });
  W.mirror = true; MT.NET.mirror = { enemies: new Map() };
  MT.PLAY.W = W; MT.NET.room = rm; run.roomsSeen = (run.roomsSeen || 0) + 1;
  MT.banner(MT.ROOMS[rm].name, '#ffcc33', 2);
};
// the host's messages for the room and the snapshot, and the events of each step
MT.netHostStep = (G, W, run, dt) => {
  MT.NET.sendT -= dt;
  if (MT.NET.sendT > 0) return;
  MT.NET.sendT = 1 / 15;
  MT.netSend(MT.netEncode(W, run), { reliable: false });
};
MT.netRoomMessage = (rm) => MT.netSend({ t: 'room', rm }, { reliable: true });

// the host's session flow: the four rooms in order, the boss last; then the finish (§14.4)
MT.sessionFlow = function* (G, run) {
  const S = MT.PLAY;
  for (const [id] of MT.LIGHTNING) {
    const W = MT.spawnWorld(G, run, id, 'S');
    MT.netRoomMessage(id);
    MT.netEvent({ type: 'room', data: {} });
    yield E.until(() => W.phase === 'left' || W.bossOver || (MT.allDownInSession(run)));
    if (W.bossOver) { yield 3; MT.netFinish(run, true); return; }
    if (MT.allDownInSession(run)) { MT.netFinish(run, false); return; }
    S.mapCard = { ep: 0, roomId: id, t: 0 };
    yield E.any([2.5, () => false]);
    S.mapCard = null;
  }
  MT.netFinish(run, false);
};
MT.allDownInSession = (run) => run.players.length > 0 && run.players.every(p => p.c && p.c.state === 'out');
// the standings: by cash, ties together; the scores; the stats; the awards; once, from the host
MT.netFinish = (run, won) => {
  if (MT.NET.finished || !MT.NET.host) return;
  MT.NET.finished = true;
  const cs = run.players.map(p => p.c).filter(Boolean);
  const order = [...new Set(cs.map(c => c.cash))].sort((a, b) => b - a);
  const standings = order.map(v => cs.filter(c => c.cash === v).map(c => c.slot));
  const scores = {}, stats = {};
  for (const c of cs) { scores[c.slot] = c.cash; stats[c.slot] = { Kills: c.kills, Prizes: c.prizes.length, Deaths: c.deaths }; }
  const top = cs.slice().sort((a, b) => b.cash - a.cash)[0];
  const awards = top ? [{ id: top.slot, title: 'BIGGEST EARNER', detail: '$' + top.cash.toLocaleString('en-US') }] : [];
  const h = MT.hub(); if (h) h.finish({ standings, scores, won, stats, awards });
  MT.banner(won ? 'SIGNAL LOST: MASH TV WINS!' : 'THAT\'S OUR SHOW!', '#ffcc33', 4);
};
