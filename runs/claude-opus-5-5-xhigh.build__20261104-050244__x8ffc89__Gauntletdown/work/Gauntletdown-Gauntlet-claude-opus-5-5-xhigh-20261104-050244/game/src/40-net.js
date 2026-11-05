/* ---- NET: AI Hub shared world (Session Protocol v1). The host's copy runs the world; every copy moves its own hero at
   once and never waits for the network. Messages (JSON, compact arrays of integers):
     me  client -> host, unreliable, 12/s: { t, at, x, y, a (aim, centiradians), f (fire), p (plant), q (floor serial) }
     act client -> host, reliable, on a press: { t, k: 'magic', n, v: [half width, half depth] (its view, in tiles) }
     s   host -> all, unreliable, 10/s: heroes, monsters near any hero, enemy missiles, generators, the King
     e   host -> all, reliable, batched every 125 ms: what happened (kills, pickups, doors, lines ...)
   At most 20 messages a second leave a copy (a token bucket: 20/s, bursts of 40) ---- */
const NET = {
  role: 'local', sent: 0, received: 0, bytes: 0, lastSnapBytes: 0, maxBytes: 0, perSec: [], dropped: 0,
  bucket: 20, bucketT: 0, sendT: 0, snapT: 0, evT: 0, queue: [], snaps: [], actN: 0, ended: false,
  stats() { return { role: this.role, sent: this.sent, received: this.received, lastSnapshotBytes: this.lastSnapBytes, maxBytes: this.maxBytes, dropped: this.dropped, maxPerSec: Math.max(0, ...this.perSec) }; },
  reset(role) { Object.assign(this, { role, sent: 0, received: 0, queue: [], snaps: [], perSec: [], bucket: 20, sendT: 0, snapT: 0, evT: 0, actN: 0, ended: false, lastSnapBytes: 0, maxBytes: 0, dropped: 0 }); }
};
/** send through the hub, inside the rate budget; reliable messages that can't go now wait in the queue */
function netSend(data, o = {}) {
  if (!HUB || NET.ended || !SESS.info) return false;
  const now = game.real;
  NET.bucket = Math.min(40, NET.bucket + (now - NET.bucketT) * 20); NET.bucketT = now;
  if (NET.bucket < 1) { if (o.reliable !== false) NET.queue.push([data, o]); else NET.dropped++; return false; }
  const ok = HUB.send(data, o);
  if (!ok) { if (o.reliable !== false) NET.queue.push([data, o]); else NET.dropped++; return false; }
  NET.bucket -= 1; NET.sent++;
  const sec = Math.floor(now); NET.perSec[sec] = (NET.perSec[sec] || 0) + 1;
  const n = JSON.stringify(data).length; NET.bytes += n; NET.maxBytes = Math.max(NET.maxBytes, n); if (data.t === 's') NET.lastSnapBytes = n;
  return true;
}
function netFlush() { if (!NET.queue.length) return; const q = NET.queue; NET.queue = []; for (const [d, o] of q) if (!netSend(d, o)) break; }
const R0 = v => Math.round(v), CA = a => Math.round((a || 0) * 100);
const KIND = { ghost: 0, gnasher: 1, lobber: 2, imp: 3, fryar: 4, snatcher: 5, tithe: 6 }, KIND_OF = Object.keys(KIND);
const EKIND = { fireball: 0, crock: 1, plate: 2 }, EKIND_OF = Object.keys(EKIND);
const STATE = { move: 0, wind: 1, strike: 2, recover: 3, spit: 4, throw: 5 }, STATE_OF = Object.keys(STATE);
const BSTATE = { throne: 0, move: 1, stomp: 2, eat: 3, aim: 4, charge: 5, dead: 6 }, BSTATE_OF = Object.keys(BSTATE);

/* ---- the host: a snapshot for everyone, and the events in batches ---- */
function hostTick(dt) {
  netFlush();
  NET.snapT -= dt; NET.evT -= dt;
  if (NET.snapT <= 0) { NET.snapT = .1; netSend(snapshotMsg(), { reliable: false }); }
  if (NET.evT <= 0 && W.events.length) { NET.evT = .125; const e = W.events.splice(0, 60); netSend({ t: 'e', q: W.serial, e }); }
}
function snapshotMsg() {
  const hs = W.heroes.filter(h => !h.gone), inAOI = q => hs.some(h => Math.abs(q.x - h.x) < 16 * T && Math.abs(q.y - h.y) < 11 * T);
  let ms = W.monsters.filter(m => !m.dead && inAOI(m));
  if (ms.length > 220) ms = ms.slice(0, 220);
  const msg = {
    t: 's', at: R0(HUB.time()), q: W.serial, w: R0(W.t * 10),
    h: hs.map(h => [h.id, R0(h.x), R0(h.y), CA(h.aim), R0(h.hp), h.score, h.keys, h.flasks, (h.alive ? 1 : 0) | (h.intent.fire && h.alive ? 2 : 0) | (h.stun > 0 ? 4 : 0) | (h.hurtT > 0 ? 8 : 0) | (h.castT > 0 ? 16 : 0) | (h.queasy > 0 ? 32 : 0) | (h.onMenu > 0 ? 64 : 0), h.amulet ? [h.amulet.type, R0(h.amulet.t * 10)] : 0, Object.keys(h.specials).join(',')]),
    m: ms.map(m => [m.id, KIND[m.type] * 4 + m.rank, R0(m.x), R0(m.y), (CA(m.facing) + 400) % 629 * 8 + (STATE[m.state] || 0), (m.hidden ? 1 : 0) | (m.rise > 0 ? 2 : 0) | (m.hitT > 0 ? 4 : 0) | (m.loot ? 8 : 0) | (m.draining ? 16 : 0)]),
    p: W.eshots.list.filter(b => !b.dead && inAOI(b)).slice(0, 60).map(b => [b.id || 0, EKIND[b.kind] || 0, R0(b.x), R0(b.y), R0(b.z), R0(b.vx), R0(b.vy), R0(b.vz), R0((b.life - b.t) * 100), R0(b.lx || 0), R0(b.ly || 0)]),
    g: W.gens.map(g => g.dead ? 0 : Math.ceil(g.hp * 10))
  };
  if (W.boss) { const K = W.boss; msg.b = [R0(K.hp), K.phase, R0(K.x), R0(K.y), BSTATE[K.state] || 0, CA(K.facing), K.open ? 1 : 0, K.fog ? CA(K.fog.a) : -999, K.charge ? CA(K.charge.a) : -999, R0(K.stateT * 100)]; }
  if (W.treasure) msg.tr = R0(W.treasure.t * 10);
  if (W.bell) msg.bl = W.bell.target ? W.bell.target.id : -1;
  return msg;
}
/** the host hears a client: where its hero is (trusted within reason), its aim and trigger; its magic */
function hostHear(from, d) {
  const h = W.heroes.find(q => q.hubId === from); if (!h) return;
  if (d.t === 'me') {
    if (d.q !== W.serial || !(d.at > (h.netAt || -1e9))) return;
    const dtS = h.netAt === undefined ? 1 : clamp((d.at - h.netAt) / 1000, .02, 1); h.netAt = d.at;
    if (h.alive) {
      const max = h.D.speed * TUNE.heroSpeed * 1.25 * 1.5 * dtS + 6, dx = d.x - h.x, dy = d.y - h.y, dd = Math.hypot(dx, dy);
      let nx = d.x, ny = d.y; if (dd > max && dd < 200) { nx = h.x + dx / dd * max; ny = h.y + dy / dd * max; }
      if (dd >= 200 && h.pads !== undefined) { /* a transporter jump: the host saw it too */ }
      if (W.map.walkable(cellOf(nx), cellOf(ny)) && !W.map.cell(cellOf(nx), cellOf(ny)) || dd >= 200) { if (dd > .3) h.facing = Math.atan2(ny - h.y, nx - h.x); h.vx = (nx - h.x) / dtS; h.vy = (ny - h.y) / dtS; h.x = nx; h.y = ny; }
    }
    h.intent.aim = d.a / 100; h.intent.fire = !!d.f; h.intent.plant = !!d.p; h.intent.move = [0, 0];
  } else if (d.t === 'act' && d.k === 'magic' && h.alive) { h.intent.view = d.v; useMagic(h, d.v); }
}

/* ---- a client: apply the host's snapshots (puppets, eased) and events ---- */
function clientHear(d) {
  if (d.t === 's') { if (d.q !== W.serial) return; if (NET.snaps.length && d.at <= NET.snaps[NET.snaps.length - 1].at) return; NET.snaps.push(d); if (NET.snaps.length > 3) NET.snaps.shift(); applySnapshot(d); }
  else if (d.t === 'e') { for (const ev of d.e) applyEvent(ev, d.q); }
}
const PUP = new Map();
function applySnapshot(s) {
  // heroes: the host's numbers; the others' places (this copy's own hero stays where its player put it)
  for (const [id, x, y, a, hp, score, keys, flasks, fl, am, sp] of s.h) {
    const h = W.heroes.find(q => q.id === id); if (!h) continue;
    const was = h.hp, wasAlive = h.alive;
    h.hp = hp; h.score = score; h.keys = keys; h.flasks = flasks; h.alive = !!(fl & 1); h.amulet = am ? { type: am[0], t: am[1] / 10 } : null; h.onMenu = fl & 64 ? 1 : 0;
    h.specials = {}; if (sp) for (const k of sp.split(',')) h.specials[k] = true;
    if (!wasAlive && h.alive && !h.remote) { h.x = x; h.y = y; }
    if (h.remote) { h.netA = h.netB || { x, y, at: s.at }; h.netB = { x, y, at: s.at }; h.aim = a / 100; h.firing = !!(fl & 2); h.stun = fl & 4 ? .1 : 0; h.hurtT = fl & 8 ? .1 : 0; h.castT = fl & 16 ? .2 : 0; h.queasy = fl & 32 ? .2 : 0; }
    else if (was - hp > 4 && h.alive) { h.hurtT = .25; emit('hurt', { h, amount: was - hp, kind: 'contact' }); }
    if (wasAlive && !h.alive) emit('fall', { h });
  }
  // monsters: puppets eased between snapshots
  const seen = new Set();
  for (const [id, kr, x, y, ds, fl] of s.m) {
    seen.add(id);
    let m = PUP.get(id);
    const type = KIND_OF[Math.floor(kr / 4)], rank = kr % 4 || 1;
    if (!m) { m = { id, type, D: get('monsters', type), ai: get('monsters', type).ai, rank, spawnRank: rank, x, y, vx: 0, vy: 0, r: get('monsters', type).r, facing: 0, state: 'move', stateT: 0, grace: {}, isMonster: true, gape: 0 }; PUP.set(id, m); W.monsters.push(m); m.netA = { x, y, at: s.at }; }
    m.netA = m.netB || { x, y, at: s.at }; m.netB = { x, y, at: s.at };
    if (rank !== m.rank) { m.rank = rank; emit('shrink', { m }); }
    const st = STATE_OF[ds % 8] || 'move'; if (st !== m.state) { m.state = st; m.stateT = 0; }
    m.facing = (Math.floor(ds / 8) - 400) / 100; m.hidden = !!(fl & 1); m.rise = fl & 2 ? .2 : 0; m.hitT = fl & 4 ? .1 : 0; m.loot = fl & 8 ? { type: 'flask' } : null; m.draining = fl & 16 ? .2 : 0; m.dead = false; m.unseen = 0;
  }
  for (const m of W.monsters) if (!seen.has(m.id)) { m.unseen = (m.unseen || 0) + 1; if (m.unseen > 3) { m.dead = true; PUP.delete(m.id); } }
  E.prune(W.monsters, m => m.dead);
  // enemy missiles: as the host has them now; the client moves them until the next snapshot
  W.eshots.list.length = 0;
  for (const [id, k, x, y, z, vx, vy, vz, left, lx, ly] of s.p) { const kind = EKIND_OF[k], grav = kind === 'fireball' ? 0 : 260; W.eshots.list.push({ id, kind, x, y, z, vx, vy, vz, grav, life: left / 100, t: 0, lx, ly, r: 3, team: 'foe', dead: false, color: '#ff7a2a', core: '#ffffff' }); }
  s.g.forEach((v, i) => { const g = W.gens[i]; if (!g) return; if (!v) { if (!g.dead) { g.dead = true; } return; } const hp = v / 10; if (hp < g.hp) g.shake = .2; g.hp = hp; g.rank = Math.max(1, Math.ceil(hp / (4 * TUNE.generatorHp))); const f = hp / g.max; g.dmg = f > .67 ? 0 : f > .34 ? 1 : 2; });
  if (s.b && W.boss) { const K = W.boss, [hp, ph, x, y, st, fa, open, fog, ch, stT] = s.b; if (hp < K.hp) K.hitT = .1; K.hp = hp; K.phase = ph; K.netA = K.netB || { x, y, at: s.at }; K.netB = { x, y, at: s.at }; K.state = BSTATE_OF[st]; K.facing = fa / 100; K.open = !!open; K.fog = fog > -999 ? { x: K.x, y: K.y, a: fog / 100, t: 1 } : null; K.charge = ch > -999 ? { a: ch / 100 } : null; K.stateT = stT / 100; K.dead = K.state === 'dead'; }
  if (s.tr !== undefined && W.treasure) W.treasure.t = s.tr / 10;
  if (s.bl !== undefined && W.bell) W.bell.target = s.bl >= 0 ? W.heroes.find(h => h.id === s.bl) || null : null;
  W.hostT = s.w / 10;
}
/** each client step: ease the puppets to the host's time minus 100 ms (up to 100 ms ahead of the last, then hold) */
function clientEase(dt) {
  const now = HUB.time() - 100;
  const ease = q => { const a = q.netA, b = q.netB; if (!a || !b) return; const span = Math.max(1, b.at - a.at), u = clamp((now - a.at) / span, 0, 1 + Math.min(100, span) / span), x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u; q.vx = (x - q.x) / Math.max(dt, 1e-3); q.vy = (y - q.y) / Math.max(dt, 1e-3); if (Math.hypot(q.vx, q.vy) > 400) { q.vx = q.vy = 0; } q.x = x; q.y = y; };
  for (const m of W.monsters) { ease(m); m.stateT += dt; m.hitT = Math.max(0, (m.hitT || 0) - dt); }
  for (const h of W.heroes) if (h.remote) { ease(h); if (Math.hypot(h.vx, h.vy) > 4) h.facing = Math.atan2(h.vy, h.vx); }
  if (W.boss) ease(W.boss);
  // the others' throws, drawn here from their trigger and aim (cosmetic)
  for (const h of W.heroes) if (h.remote && h.alive && h.firing) { h.netCool = (h.netCool || 0) - dt; if (h.netCool <= 0) { h.netCool = h.D.shot.cd; clientShot(h, h.aim); h.throwT = .18; } }
}
/** a host event on a client */
function applyEvent(ev, q) {
  const [type, a, b, c, d2, e2, f2] = ev;
  if (type === 'floor') { sessionFloor(a, b); return; }
  if (q !== undefined && q !== W.serial) return;
  switch (type) {
    case 'gone': { const it = W.items.find(i => i.id === a); if (it && !it.gone) { it.gone = true; const h = W.heroes.find(x => x.id === b); if (b >= 0 && h) emit('take', { h, it }); else if (b === -4) emit('kingAte', { it }); else emit('shotItem', { it, h }); } break; }
    case 'drop': if (!W.items.some(i => i.id === a)) { const D = get('items', b); if (D) W.items.push({ id: a, type: b, D, x: c, y: d2, z: 0, cx: cellOf(c), cy: cellOf(d2), sub: e2 || undefined, gone: false, t: 0 }); } break;
    case 'door': { const dr = W.doors[a]; if (dr && !dr.open) { dr.open = true; dr.openT = W.t; for (const [cx, cy] of dr.cells) W.map.set(cx, cy, 0); emit('door', { d: dr }); } break; }
    case 'wall': if (W.map.cell(a, b)) { W.map.set(a, b, 0); W.fake.delete(a + ',' + b); W.cracked.delete(a + ',' + b); emit('wall', { cx: a, cy: b, kind: 'cracked' }); } break;
    case 'trap': { for (const t of W.p.trapWalls[a]) W.map.set(t.cx, t.cy, 0); for (const p of W.plates) if (p.kind === a) p.used = true; emit('trap', { p: { kind: a } }); break; }
    case 'kill': { const m = PUP.get(a); if (m) { m.dead = true; PUP.delete(a); if (b !== -2 && b !== -3) emit('kill', { m, by: null }); else if (b === -2) emit('escaped', { m }); else emit('tithePaid', { m }); E.prune(W.monsters, x => x.dead); } break; }
    case 'gen': { const g = W.gens.find(x => x.id === a); if (g && !g.dead) { g.dead = true; emit('genDead', { g }); } break; }
    case 'magic': { const h = W.heroes.find(x => x.id === a); if (h && h.remote) emit('magic', { h, x: b, y: c, r: d2 || null }); else if (h) { game.shake(4); } break; }
    case 'say': bus.emit('say', { key: a, hero: W.heroes.find(x => x.id === b) || null, vars: c ? { thing: c } : null }); break;
    case 'king': bus.emit('kingSays', { text: STORY[a] }); break;
    case 'hurt': break;
    case 'rise': { const h = W.heroes.find(x => x.id === a); if (h) emit('rise', { h }); break; }
    case 'fall': break;
    case 'stolen': emit('stolen', {}); break;
    case 'bell': emit('bell', {}); break;
    case 'boss': emit('boss', { phase: a }); break;
    case 'tele': { const h = W.heroes.find(x => x.id === a); if (h && h.remote) h.netA = h.netB; break; }
    case 'imp': W.impatience = a; emit('impatience', { stage: a }); if (a >= 2) for (const d of W.doors) if (!d.open) { d.open = true; for (const [cx, cy] of d.cells) W.map.set(cx, cy, 0); } break;
    case 'hoard': emit('hoardShut', {}); break;
    case 'stairs': emit('descend', {}); break;
  }
}
/** a client's own hero, to the host: where, its aim and trigger */
function clientTick(dt) {
  netFlush();
  const h = W.heroes.find(q => !q.remote); if (!h) return;
  NET.sendT -= dt;
  if (NET.sendT <= 0) { NET.sendT = 1 / 12; netSend({ t: 'me', at: R0(HUB.time()), x: R0(h.x), y: R0(h.y), a: CA(h.aim), f: h.intent.fire && h.alive ? 1 : 0, p: h.intent.plant ? 1 : 0, q: W.serial }, { to: SESS.info.host, reliable: false }); }
  if (h.wantMagic) { h.wantMagic = false; const R = screenRect(h); netSend({ t: 'act', k: 'magic', n: ++NET.actN, v: [Math.round((R.x1 - R.x0) / 2 / T), Math.round((R.y1 - R.y0) / 2 / T)] }, { to: SESS.info.host }); }
}
