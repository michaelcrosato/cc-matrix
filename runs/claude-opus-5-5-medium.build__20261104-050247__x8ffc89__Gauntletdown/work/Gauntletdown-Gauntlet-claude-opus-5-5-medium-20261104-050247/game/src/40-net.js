/* 40-net: AI Hub shared world. The host's copy runs the world; each client moves its own hero at once (zero-lag
 * control), sends it (and its button presses) to the host, and shows everything else from the host's snapshots,
 * interpolated 100 ms behind. Events (items gone, doors, kills, lines...) travel reliably in batches. A token bucket
 * keeps every copy under the hub's 20 messages a second. */

const MTYPES = Object.keys(REG.monsters), PKINDS = ['axe', 'javelin', 'arrow', 'hex', 'crock', 'fireball', 'plate'], AMS = [null, ...Object.keys(AMULETS)];
const BSTATES = ['idle', 'roar', 'stomp', 'eat', 'walk', 'chargeWind', 'charge', 'fogWind', 'dead'];
const NET = {
  role: 'local', me: -1, host: -1, sent: 0, recv: 0, lastBytes: 0, maxBytes: 0, bucket: 40, lastTick: 0, snaps: [], evq: [], pending: [], sendT: 0, evT: 0, meT: 0, ended: false, perSec: [], dropped: 0,
  stats() { return { role: this.role, sent: this.sent, received: this.recv, lastSnapshotBytes: this.lastBytes, maxSnapshotBytes: this.maxBytes, dropped: this.dropped, peak: this.peak() }; },
  peak() { const now = game.real; this.perSec = this.perSec.filter(t => now - t < 1); return this.perSec.length; },
  canSend() { return this.bucket >= 1; },
  send(data, o = {}) {
    if (this.ended || !HUB) return false;
    if (this.bucket < 1) { this.dropped++; return false; }
    let ok = false;
    try { ok = HUB.send(data, o) !== false; } catch (e) { ok = false; }
    if (ok) { this.bucket -= 1; this.sent++; this.perSec.push(game.real); }
    return ok;
  },
  tick(dt) {
    this.bucket = Math.min(38, this.bucket + dt * 19);   // just under the hub's 20 a second, bursts under 40
    if (this.ended || !W) return;
    if (this.role === 'host' || this.role === 'server') this.hostTick(dt);
    else if (this.role === 'client') this.clientTick(dt);
  },
  /* ---- host ---- */
  hostTick(dt) {
    this.sendT -= dt; this.evT -= dt;
    if (this.evT <= 0 && (W.outbox.length || this.pending.length)) {
      this.evT = .125;
      const batch = this.pending.concat(W.outbox.splice(0).map(([type, d]) => [type, d]));
      this.pending = [];
      if (batch.length && !this.send({ t: 'e', e: batch.slice(0, 120) }, { reliable: true })) this.pending = batch; else if (batch.length > 120) this.pending = batch.slice(120);
    }
    if (this.sendT <= 0) { this.sendT = .1; const s = this.snapshot(), str = JSON.stringify(s); this.lastBytes = str.length; this.maxBytes = Math.max(this.maxBytes, str.length); this.send(s, { reliable: false }); }
  },
  snapshot() {
    const live = PARTY.filter(h => h.alive), r = (v) => Math.round(v), aoi = e => live.some(h => Math.abs(e.x - h.x) < 16 * T && Math.abs(e.y - h.y) < 11 * T) || !live.length;
    const h = PARTY.map(x => [x.pi, r(x.x), r(x.y), r(x.aim * 100), x.hp, x.score, x.keys, x.flasks, (x.alive ? 1 : 0) | (x.firing ? 2 : 0) | (x.stun > 0 ? 4 : 0) | (x.queasy > 0 ? 8 : 0) | (x.menu > 0 ? 16 : 0) | (x.plant ? 32 : 0) | (x.swing && W.t - x.swing.t0 < x.swing.dur ? 64 : 0) | (x.hurtT > 0 ? 128 : 0), AMS.indexOf(x.amulet) * 100 + Math.min(99, Math.ceil(x.amuletT)), x.stats.kills, x.stats.treasure, x.stats.food, x.stats.stairs]);
    let m = W.mons.filter(aoi);
    if (m.length > 140) m = m.slice(0, 140);
    const ms = m.map(x => [x.id, MTYPES.indexOf(x.type) * 4 + x.rank, r(x.x), r(x.y), r(x.face * 100), (x.wind > 0 ? 1 : 0) | (x.vis < .5 ? 2 : 0) | (x.emerge > 0 ? 4 : 0) | (x.hurtT > 0 ? 8 : 0) | (x.spit > 0 ? 16 : 0)]);
    const ps = W.shots.filter(aoi).slice(0, 70).map(s => [s.id, PKINDS.indexOf(s.kind), r(s.x), r(s.y), r(s.z), r(s.vx), r(s.vy), r(s.vz), s.owner ? s.owner.pi : -1, s.tx !== undefined ? r(s.tx) : 0, s.ty !== undefined ? r(s.ty) : 0]);
    const gs = W.gens.map(g => [g.id, g.rank, r(g.hp * 10)]);
    const B = W.boss, b = B ? [r(B.hp), B.phase, r(B.x), r(B.y), BSTATES.indexOf(B.state), r(B.face * 100), B.alive ? 1 : 0, r(B.intro * 10)] : 0;
    return { t: 's', q: W.serial, at: Math.round(W.t * 1000), h, m: ms, p: ps, g: gs, b, st: W.stage };
  },
  onMessage(data, from) {
    this.recv++;
    if (!data || this.ended) return;
    if (this.role === 'host' || this.role === 'server') {
      const h = PARTY.find(p => p.netId === from); if (!h) return;
      if (data.t === 'me' && W && data.q === W.serial) {
        // trust the client's own position, within reason: a speed clamp, and never inside a wall
        const dt = Math.max(.05, (data.at - (h.lastAt || data.at - 100)) / 1000); h.lastAt = data.at;
        let nx = data.x, ny = data.y; const d = Math.hypot(nx - h.x, ny - h.y), max = heroSpeed(h) * 1.5 * dt + 24;
        if (d > max && d < 200) { nx = h.x + (nx - h.x) / d * max; ny = h.y + (ny - h.y) / d * max; }
        if (W.map.walkable(Math.floor(nx / T), Math.floor(ny / T)) || d >= 200) { h.x = nx; h.y = ny; h.body.x = nx; h.body.y = ny; }
        h.intent = { mx: (data.mx || 0) / 100, my: (data.my || 0) / 100, aim: data.a / 100, fire: !!data.f, kbFire: false, magic: false, plant: !!data.p, rise: false };
      } else if (data.t === 'act' && data.k === 'magic' && W && h.alive && data.n !== h.lastAct) { h.lastAct = data.n; h.view = data.v ? [data.v[0] * T, data.v[1] * T] : null; useMagic(h); h.view = null; }
      return;
    }
    if (this.role === 'client') {
      if (data.t === 's') { this.snaps.push(data); if (this.snaps.length > 4) this.snaps.shift(); }
      else if (data.t === 'e') for (const ev of data.e) applyEvent(ev[0], ev[1]);
    }
  },
  /* ---- client ---- */
  clientTick(dt) {
    const me = PARTY.find(h => h.netId === this.me); if (!me) return;
    this.meT -= dt;
    if (this.meT <= 0) { this.meT = 1 / 12; const it = me.intent || IDLE_INTENT; this.send({ t: 'me', q: W.serial, at: Math.round(game.real * 1000), x: Math.round(me.x), y: Math.round(me.y), a: Math.round(me.aim * 100), f: it.fire ? 1 : 0, p: it.plant ? 1 : 0, mx: Math.round(it.mx * 100), my: Math.round(it.my * 100) }, { reliable: false }); }
    if (me.intent && me.intent.magic && me.alive) { me.actN = (me.actN || 0) + 1; this.send({ t: 'act', k: 'magic', n: me.actN, v: [Math.round(W.viewHalf[0] / T), Math.round(W.viewHalf[1] / T)] }, { reliable: true }); }
    // cosmetic shots of our own, at once (they stop at walls and spark, but deal no damage)
    if (me.firing && me.alive && (me.ccool = (me.ccool || 0) - dt) <= 0) { me.ccool = shotCool(me); const a = me.aim, sp = me.D.shot.speed; W.shots.push({ id: -1, team: 'cosmetic', kind: me.D.shot.kind, owner: me, x: me.x, y: me.y, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 3, life: SHOT_RANGE / sp, rot: 0, hits: new Set() }); sfx(SHOT_SFX[me.D.shot.kind], { vol: .6 }); }
    for (const s of W.shots) if (s.team === 'cosmetic') { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 14; if (s.life <= 0 || W.map.heightAt(s.x, s.y) > s.z) s.dead = true; }
    W.shots = W.shots.filter(s => !s.dead);
    this.applySnapshots(me);
  },
  applySnapshots(me) {
    if (!this.snaps.length) return;
    const latest = this.snaps[this.snaps.length - 1];
    if (latest.q !== W.serial) return;
    this.clock = (this.clock === undefined ? latest.at : this.clock + 1000 / 120);
    if (Math.abs(this.clock - (latest.at - 100)) > 300) this.clock = latest.at - 100;
    const tgt = this.clock;
    let a = latest, b = latest;
    for (let i = this.snaps.length - 1; i > 0; i--) if (this.snaps[i - 1].at <= tgt && this.snaps[i].q === W.serial) { a = this.snaps[i - 1]; b = this.snaps[i]; break; }
    const k = b.at > a.at ? clamp((tgt - a.at) / (b.at - a.at), 0, 1.5) : 1;
    const lerpBy = (arr, id, i) => { const o = arr.find(x => x[0] === id); return o ? o[i] : null; };
    // heroes: ours keeps its own position; the host's numbers are the truth for health, score and pockets
    for (const row of latest.h) {
      const h = PARTY[row[0]]; if (!h) continue;
      h.hp = row[4]; h.score = row[5]; h.keys = row[6]; h.flasks = row[7];
      const f = row[8]; const wasAlive = h.alive; h.alive = !!(f & 1); if (h === me && wasAlive && !h.alive) h.deadT = 0; if (h === me && !wasAlive && h.alive) { h.x = row[1]; h.y = row[2]; h.body.x = h.x; h.body.y = h.y; }
      h.stun = f & 4 ? .1 : 0; h.queasy = f & 8 ? .1 : 0; h.menu = f & 16 ? 1 : 0; h.hurtT = f & 128 ? .1 : h.hurtT;
      const am = Math.floor(row[9] / 100); h.amulet = AMS[am] || null; h.amuletT = row[9] % 100;
      h.stats.kills = row[10]; h.stats.treasure = row[11]; h.stats.food = row[12]; h.stats.stairs = row[13];
      if (h !== me) {
        const ax = lerpBy(a.h, row[0], 1), ay = lerpBy(a.h, row[0], 2), nx = ax === null ? row[1] : lerp(ax, lerpBy(b.h, row[0], 1), k), ny = ay === null ? row[2] : lerp(ay, lerpBy(b.h, row[0], 2), k);
        h.vx = (nx - h.x) * 120; h.vy = (ny - h.y) * 120; h.x = nx; h.y = ny; h.aim = row[3] / 100; h.firing = !!(f & 2); h.plant = !!(f & 32);
        if (Math.hypot(h.vx, h.vy) > 5) h.face = Math.atan2(h.vy, h.vx);
        if (f & 64 && !(h.swing && W.t - h.swing.t0 < h.swing.dur)) h.swing = { move: h.D.moves[0], n: 0, t0: W.t, dur: .4, at: .2, hit: true };
        if (h.firing && W.t - h.throwT > shotCool(h)) h.throwT = W.t;
      }
    }
    // monsters: puppets, interpolated
    const old = new Map(W.mons.map(m => [m.id, m])), next = [];
    for (const row of b.m) {
      const [id, tr, x, y, fc, fl] = row, type = MTYPES[Math.floor(tr / 4)], rank = tr % 4;
      let m = old.get(id);
      if (!m) { m = { id, type, D: get('monsters', type), rank, srank: rank, x, y, vx: 0, vy: 0, r: 5, face: fc / 100, t: 0, cd: {}, vis: 1 }; }
      const pa = a.m.find(o => o[0] === id), px0 = pa ? lerp(pa[2], x, k) : x, py0 = pa ? lerp(pa[3], y, k) : y;
      m.vx = (px0 - m.x) * 60; m.vy = (py0 - m.y) * 60; m.x = px0; m.y = py0; m.face = fc / 100; m.rank = rank; m.type = type; m.D = get('monsters', type);
      m.wind = fl & 1 ? .1 : 0; m.vis = fl & 2 ? 0 : 1; m.emerge = fl & 4 ? .1 : 0; m.hurtT = fl & 8 ? .1 : 0; m.spit = fl & 16 ? .1 : 0; m.t += 1 / 120;
      next.push(m);
    }
    W.mons = next;
    // projectiles (but our own hero's: we draw our own at once)
    const cos = W.shots.filter(s => s.team === 'cosmetic');
    W.shots = cos.concat(b.p.filter(p => p[8] !== me.pi).map(p => ({ id: p[0], team: p[8] >= 0 ? 'hero' : 'foe', kind: PKINDS[p[1]], x: p[2] + p[5] * (k * .1), y: p[3] + p[6] * (k * .1), z: p[4], vx: p[5], vy: p[6], vz: p[7], tx: p[9], ty: p[10], rot: game.real * 14, grav: p[1] === 4 || p[1] === 6 ? 300 : 0, land: p[1] === 4 || p[1] === 6 ? W.t + .3 : 0 })));
    const gm = new Map(b.g.map(g => [g[0], g]));
    for (const g of W.gens) { const row = gm.get(g.id); if (!row) g.dead = true; else { g.rank = row[1]; g.hp = row[2] / 10; } }
    W.gens = W.gens.filter(g => !g.dead);
    if (b.b && W.boss) { const B = W.boss; B.hp = b.b[0]; B.phase = b.b[1]; B.vx = (b.b[2] - B.x) * 10; B.vy = (b.b[3] - B.y) * 10; B.x = b.b[2]; B.y = b.b[3]; B.state = BSTATES[b.b[4]]; B.face = b.b[5] / 100; B.alive = !!b.b[6]; B.intro = b.b[7] / 10; }
    W.stage = latest.st;
  }
};
/* a client applies the host's events: the state they change and the effects they make */
function applyEvent(type, d) {
  if (!W) return;
  if (type === 'floor') { sessionFloor(d.idx, d.q); return; }
  if (d.q !== undefined && d.q !== W.serial && type !== 'over') return;
  switch (type) {
    case 'gone': { const it = W.items.find(i => i.id === d.id); if (it) it.gone = true; W.items = W.items.filter(i => !i.gone); break; }
    case 'drop': if (!W.items.some(i => i.id === d.id)) W.items.push({ id: d.id, kind: d.kind, sub: d.sub, x: d.x, y: d.y, cx: Math.floor(d.x / T), cy: Math.floor(d.y / T) }); break;
    case 'door': { const g = W.doorGroups[d.g]; if (g && !g.open) { g.open = true; for (const c of g.cells) W.map.set(c.cx, c.cy, 0); } break; }
    case 'wall': W.map.set(d.cx, d.cy, 0); { const c = W.cracked.find(c => c.cx === d.cx && c.cy === d.cy); if (c) c.open = true; } break;
    case 'secret': W.map.set(d.cx, d.cy, 0); { const f = W.fakes.find(f => f.cx === d.cx && f.cy === d.cy); if (f) f.open = true; } break;
    case 'trap': for (const c of (d.kind === 'T' ? W.p.trapT : W.p.trapY)) W.map.set(c.cx, c.cy, 0); for (const p of W.plates) if (p.kind === d.kind) p.used = true; break;
    case 'over': sessionOver(d); return;
  }
  bus.emit(type, d);
}
