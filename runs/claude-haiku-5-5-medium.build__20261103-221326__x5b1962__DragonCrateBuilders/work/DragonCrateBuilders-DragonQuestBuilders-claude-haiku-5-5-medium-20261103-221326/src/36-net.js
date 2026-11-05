// The shared-world round over AI Hub (mode shared-world). The host's copy runs the town. Every other copy sends its own
// player's input (what's pressed, the walk direction, craft and hotbar requests) to the host, and receives the world
// (in chunks, then block edits as they happen) and a state tick ten times a second: each player, monster and resident,
// the shared bag and the chapter, and the notes and speeches to show. Clients draw and animate; the host decides.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = DQ.T;
const ACT = ['jump', 'attack', 'place', 'use', 'dodge', 'hotPrev', 'hotNext', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6', 'slot7', 'slot8'];
const CHUNK = 10000, EDIT_BATCH = 1200, TICK = 0.1;
DQ.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

const N = DQ.net = {
  on: false, host: false, client: false, server: false, me: 0, info: null,
  pr: new Set(), cr: [], hot: [],        // a client's pending presses and requests (sent every 50 ms)
  inbox: {},                             // the host's latest input from each remote player
  chunks: [], pendingWorld: null,        // the world, as it arrives
  outPop: [], outSay: [],                // notes and speeches for the clients to show
  inAcc: 0, tickAcc: 0,
};
const send = d => { const h = globalThis.AIHub; if (h && h.active) h.send(d); };
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

// ---- the host ----------------------------------------------------------------------------------------------------------
N.hostStart = (p, info) => {
  N.on = true; N.host = !!info.isHost; N.server = !!info.server; N.me = info.me; N.info = info;
  p.serverOnly = N.server;
  p.builder.id = N.me;
  p.world.log = [];
  for (const pl of info.players) {
    if (pl.id === N.me) continue;
    const sp = p.spawn();
    const b = new DQ.Builder(sp.x + (pl.id % 2) * 16, sp.y + Math.floor(pl.id / 2) * 16, 0, pl.id);
    b.z = p.world.top(Math.floor(b.x / T), Math.floor(b.y / T)) * T;
    p.remotes.set(pl.id, b);
  }
  // the whole town, in order, before any tick
  const vox = p.world.toJSON().vox;
  const n = Math.ceil(vox.length / CHUNK);
  for (let i = 0; i < n; i++) send({ t: 'world', i, n, d: vox.slice(i * CHUNK, (i + 1) * CHUNK) });
};
// a remote player's input for this step: the presses since the last step, the walk, and their requests
N.takeInput = id => {
  const inb = N.inbox[id] || (N.inbox[id] = { pr: new Set(), mv: [0, 0], cr: [], hot: [] });
  const frame = inb.pr; inb.pr = new Set();
  return {
    move: () => inb.mv, pressed: a => frame.has(a), down: () => false, lastDevice: inb.mg ? 'mouse' : 'keyboard', mouseAt: () => inb.mg,
    label: () => '', anyPressed: () => frame.size > 0, repeat: () => false,
    requests: () => { const r = { cr: inb.cr, hot: inb.hot }; inb.cr = []; inb.hot = []; return r; },
  };
};
// the state a tick carries
N.snapshot = p => {
  const who = [];
  if (!p.serverOnly) who.push(p.builder);
  for (const b of p.remotes.values()) who.push(b);
  return {
    t: 'tick',
    pl: who.map(b => ({ id: b.id, x: r1(b.x), y: r1(b.y), z: r1(b.z), f: r2(b.facing), hp: b.hp, mh: b.maxHp, be: Math.round(b.belly), sel: b.sel, hb: b.hotbar, sc: b.score || 0, at: b.castT > 0 ? 1 : 0 })),
    m: p.monsters.filter(m => !m.dead).map(m => ({ n: m.nid, k: m.key, x: r1(m.x), y: r1(m.y), z: r1(m.z), f: r2(m.facing), hp: m.hp, mh: m.maxHp, ht: m.hurt > 0 ? 1 : 0 })),
    r: p.residents.map(res => ({ i: res.def.id, x: r1(res.x), y: r1(res.y), z: r1(res.z), f: r2(res.facing), md: res.mode, sl: res.sleeping ? 1 : 0, ct: res.cheerT > 0 ? 1 : 0 })),
    bag: p.bag, ch: Math.floor(p.cheer), tl: p.townLevel, q: p.quest, qd: p.questDone, dy: p.day, hr: r2(p.hour),
    bn: p.banner, sg: p.siege, st: p.stats, pop: N.outPop.splice(0), say: N.outSay.splice(0),
  };
};
N.hostStep = (dt, p) => {
  if (!N.host) return;
  N.tickAcc += dt;
  if (N.tickAcc < TICK) return;
  N.tickAcc = 0;
  send(N.snapshot(p));
  if (p.world.log && p.world.log.length) {
    const e = p.world.log.splice(0, EDIT_BATCH);
    send({ t: 'edits', e });
  }
};
// the round's end, from the host: standings best first, ties in one array (the hub's rule)
N.finish = p => {
  if (!(globalThis.AIHub && AIHub.active) || !N.host) return;
  const scores = {}, ids = [];
  if (!p.serverOnly) { scores[N.me] = p.builder.score || 0; ids.push(N.me); }
  for (const [id, b] of p.remotes) { scores[id] = b.score || 0; ids.push(id); }
  ids.sort((a, b) => scores[b] - scores[a]);
  const standings = [];
  for (const id of ids) {
    const last = standings[standings.length - 1];
    if (last && scores[last[0]] === scores[id]) last.push(id); else standings.push([id]);
  }
  AIHub.finish({ standings, scores });
};

// ---- a client ----------------------------------------------------------------------------------------------------------
// the client's presses and walk, sent every 50 ms; the requests (craft, hotbar) ride along
N.clientStep = (dt, p, I) => {
  for (const a of ACT) if (I.pressed(a)) N.pr.add(a);
  N.inAcc += dt;
  if (N.inAcc >= 0.05) {
    N.inAcc = 0;
    const mg = I.lastDevice === 'mouse' && DQ.game.mouseGround ? DQ.game.mouseGround() : null;
    send({ t: 'in', pr: [...N.pr], mv: I.move(), mg, cr: N.cr.splice(0), hot: N.hot.splice(0) });
    N.pr.clear();
  }
  // move each thing toward the last state the host sent: a smooth walk between ticks
  const k = Math.min(1, dt * 12);
  const things = [p.builder, ...p.remotes.values(), ...p.monsters, ...p.residents];
  for (const e of things) {
    if (e.tx === undefined) continue;
    e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.z += (e.tz - e.z) * k;
  }
  for (const b of [p.builder, ...p.remotes.values()]) {
    b.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, facing: b.facing, air: false, pose: b.castT > 0 ? 'cast' : undefined });
    b.castT = Math.max(0, (b.castT || 0) - dt);
  }
  for (const m of p.monsters) {
    if (m.key === 'gnarlgrim') m.rig.update(dt, { x: m.x, y: m.y, z: m.z, vx: 0, vy: 0, facing: m.facing, stance: 'guard' });
    else m.rig.update(dt, { squash: 0, look: [0, 0], walk: 0.5 });
  }
  for (const res of p.residents) res.rig.update(dt, { x: res.x, y: res.y, z: res.z, vx: 0, vy: 0, facing: res.facing, stance: 'ready', down: res.sleeping ? 1 : 0 });
  p.popups.forEach(q => { q.t -= dt; });
  p.popups = p.popups.filter(q => q.t > 0);
  p.target = p.targetBlock(false);
};

// a state tick from the host: the town's numbers, and every thing's place (smoothed in clientStep)
N.applyTick = (p, s) => {
  Object.assign(p, { bag: s.bag, cheer: s.ch, townLevel: s.tl, quest: s.q, questDone: s.qd, day: s.dy, hour: s.hr, banner: s.bn, siege: s.sg, stats: s.st });
  const seen = new Set();
  for (const pl of s.pl) {
    let b = pl.id === N.me ? p.builder : p.remotes.get(pl.id);
    if (!b) { b = new DQ.Builder(pl.x, pl.y, pl.z, pl.id); b.x = pl.x; b.y = pl.y; b.z = pl.z; p.remotes.set(pl.id, b); }
    Object.assign(b, { tx: pl.x, ty: pl.y, tz: pl.z, facing: pl.f, hp: pl.hp, maxHp: pl.mh, belly: pl.be, sel: pl.sel, hotbar: pl.hb, score: pl.sc });
    if (pl.at) b.castT = 0.45;
    seen.add(pl.id);
  }
  for (const id of [...p.remotes.keys()]) if (!seen.has(id)) p.remotes.delete(id);
  const old = p.monsterMap || new Map(), mm = new Map();
  for (const ms of s.m) {
    let m = old.get(ms.n);
    if (!m) { m = new DQ.Monster(DQ.MONSTERS[ms.k], ms.k, ms.x, ms.y, ms.z); m.nid = ms.n; m.x = ms.x; m.y = ms.y; m.z = ms.z; }
    Object.assign(m, { tx: ms.x, ty: ms.y, tz: ms.z, facing: ms.f, hp: ms.hp, maxHp: ms.mh, hurt: ms.ht ? 0.25 : 0 });
    mm.set(ms.n, m);
  }
  p.monsterMap = mm; p.monsters = [...mm.values()];
  p.boss = p.monsters.find(m => m.key === 'gnarlgrim') || null;
  const oldR = new Map(p.residents.map(x => [x.def.id, x])), rr = [];
  for (const rs of s.r) {
    let res = oldR.get(rs.i);
    if (!res) { const def = DQ.NPCS.find(n => n.id === rs.i); res = new DQ.Resident(def, rs.x, rs.y, rs.z, { x: 0, y: 0, z: 0 }); res.x = rs.x; res.y = rs.y; res.z = rs.z; }
    Object.assign(res, { tx: rs.x, ty: rs.y, tz: rs.z, facing: rs.f, mode: rs.md, sleeping: !!rs.sl, cheerT: rs.ct ? 1 : 0 });
    rr.push(res);
  }
  p.residents = rr;
  for (const q of s.pop) p.popups.push({ text: q[0], color: q[1], t: q[2], max: q[2] });
  if (DQ.session) for (const sp of s.say) DQ.session.queue.push({ lines: sp.lines, o: { name: sp.name } });
};
N.applyEdits = (p, e) => { for (const [idx, id] of e) p.world.vox[idx] = id; p.world.edits++; };
N.applyWorld = (p, vox) => { p.world.fromJSON({ vox, hp: [] }); };

// ---- requests from a client, taken by the host -------------------------------------------------------------------
N.onMessage = (d, from) => {
  if (!d || !d.t) return;
  if (d.t === 'in' && N.host) {
    const inb = N.inbox[from] || (N.inbox[from] = { pr: new Set(), mv: [0, 0], cr: [], hot: [] });
    for (const a of d.pr || []) if (ACT.includes(a) || a === 'craft') inb.pr.add(a);
    inb.mv = Array.isArray(d.mv) ? d.mv : [0, 0];
    inb.mg = Array.isArray(d.mg) ? d.mg : null;
    inb.cr.push(...(d.cr || []));
    inb.hot.push(...(d.hot || []));
  } else if (d.t === 'world' && N.client) {
    N.chunks[d.i] = d.d;
    if (N.chunks.filter(c => c !== undefined).length === d.n) { N.pendingWorld = N.chunks.join(''); N.chunks = []; }
    if (N.pendingWorld && DQ.session) { N.applyWorld(DQ.session.play, N.pendingWorld); N.pendingWorld = null; }
  } else if (d.t === 'tick' && N.client && DQ.session) {
    N.applyTick(DQ.session.play, d);
  } else if (d.t === 'edits' && N.client && DQ.session) {
    N.applyEdits(DQ.session.play, d.e);
  }
};
})();
