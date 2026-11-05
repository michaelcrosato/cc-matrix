// Networking for AI Hub shared-world rounds (the Quilting Bee). Every copy runs the voxel world; the host owns monsters,
// drops, Pattern progress, the clock and scores; each client owns its own builder's movement and bag. Messages (compact
// arrays): p client->host 10 Hz unreliable, a client->host ops (reliable, batched <= 6 Hz), s host->all snapshots 10 Hz
// unreliable, e host->all events (reliable, batched <= 6 Hz). Only AIHub.send / on: no sockets, no fetch.
(() => {
const DQ = globalThis.DQ, E = DQ.E, T = 16;
const R1 = v => Math.round(v), R100 = v => Math.round(v * 100);
class Net {
  constructor(ctx, hub, o = {}) {
    this.ctx = ctx; this.hub = hub; this.host = !!hub.isHost; this.client = !this.host; this.server = !!hub.server; this.me = hub.me;
    this.outA = []; this.outE = []; this.tP = 0; this.tS = 0; this.tA = 0; this.tE = 0; this.t = 0; this.stats = { sent: 0, recv: 0, bytes: 0, maxBytes: 0, perSec: [] };
    this.remote = new Map(); this.lastS = -1; this.half = 0; this.ended = false; this.round = o.round || null; this.offs = [];
    ctx.net = this; this.left = new Set();
    // the host's word is law: every edit of its world goes out (its own builder's, helpers', monsters', Tangles)
    if (this.host) {
      const w = ctx.world, ev = ctx.events;
      ev.on('blockPlaced', e => { if (e.by !== 'net') this.event(['vox', e.x, e.y, e.z, e.id, w.rot(e.x, e.y, e.z)]); });
      ev.on('blockBroken', e => { if (e.by !== 'net') this.event(['vox', e.x, e.y, e.z, 0, 0]); });
      ev.on('objectPlaced', e => { if (e.by !== 'net') this.event(['obj', e.id, e.x, e.y, e.z, e.obj.facing]); });
      ev.on('objectRemoved', e => { if (e.by !== 'net') this.event(['unobj', e.x, e.y, e.z]); });
      ev.on('objectBroken', e => { this.event(['unobj', e.x, e.y, e.z]); });
    }
    this.offs.push(hub.on('message', (d, from) => { try { this.recv(d, from); } catch (e) { DQ.fail('net recv', e); } }));
  }
  send(data, o = {}) {
    if (this.ended) return false; const s = JSON.stringify(data); this.stats.bytes += s.length; this.stats.maxBytes = Math.max(this.stats.maxBytes, s.length); this.stats.sent++; this.stats.perSec.push(this.t);
    return this.hub.send(data, o);
  }
  sendOp(op) { if (this.client) this.outA.push(op); }
  event(ev) { if (this.host) this.outE.push(ev); }
  /** a remote player's builder (on the host and on other clients) */
  builderFor(id) {
    let b = this.remote.get(id); if (b) return b; if (this.left.has(id)) return null; const p = (this.hub.players || []).find(q => q.id === id); if (!p) return null;
    const ctx = this.ctx, sp = this.round ? this.round.spawnFor(id) : ctx.spawnPoint;
    b = new DQ.Builder(ctx, { id, name: p.name, color: p.color, x: sp[0], y: sp[1], z: sp[2], local: false }); b.remote = true; b.target = [sp[0], sp[1], sp[2], 0]; b.bag.infinite = false;
    b.netUpdate = dt => { const t = b.target; if (!t) return; const k = Math.min(1, dt * 10); const vx = (t[0] - b.x) * 10, vy = (t[1] - b.y) * 10; b.body.x += (t[0] - b.body.x) * k; b.body.y += (t[1] - b.body.y) * k; b.body.z += (t[2] - b.body.z) * k; b.facing = E.lerpAng ? E.lerpAng(b.facing, t[3], k) : t[3]; b.body.vx = vx; b.body.vy = vy; b.body.onGround = true; b.netHeld = t[5]; b.rigUpdate(dt); };
    this.remote.set(id, b); ctx.builders.push(b); return b;
  }
  removePlayer(id) { this.left.add(id); const b = this.remote.get(id); if (!b) return; this.remote.delete(id); this.ctx.builders = this.ctx.builders.filter(x => x !== b); }
  update(dt) {
    this.t += dt; const ctx = this.ctx, b = ctx.builder; this.stats.perSec = this.stats.perSec.filter(t => this.t - t < 1);
    if (this.ended) return;
    if (this.client && b && !this.server) {
      this.tP += dt; if (this.tP >= .1) { this.tP = 0; this.send({ k: 'p', d: [R1(this.t * 1000), R1(b.x), R1(b.y), R1(b.z), R100(b.facing), b.combo.busy || (b.breakAtk && b.breakAtk.busy) ? 1 : 0, b.held || 0, R1(b.hp)] }, { reliable: false }); }
      this.tA += dt; if (this.tA >= 1 / 6 && this.outA.length) { this.tA = 0; this.send({ k: 'a', ops: this.outA.splice(0, 40) }); }
    }
    if (this.host) {
      this.tS += dt; if (this.tS >= .1) { this.tS = 0; this.send({ k: 's', d: this.snapshot() }, { reliable: false }); }
      this.tE += dt; if (this.tE >= 1 / 6 && this.outE.length) { this.tE = 0; this.send({ k: 'e', ev: this.outE.splice(0, 60) }); }
    }
  }
  snapshot() {
    const ctx = this.ctx, P = [], M = [];
    for (const b of ctx.builders) P.push([b.id, R1(b.x), R1(b.y), R1(b.z), R100(b.facing), b.combo.busy ? 1 : 0, b.held || b.netHeld || 0, R1(b.hp)]);
    let ms = ctx.monsters.list.filter(m => !m.dead); if (ms.length > 24) { this.half ^= 1; ms = ms.filter((m, i) => (i & 1) === this.half); }
    for (const m of ms) M.push([m.uid, m.kind, R1(m.x), R1(m.y), R1(m.z), R100(m.facing), R1(m.hp), m.move && m.move.phase === 'wind' ? 1 : 0]);
    const r = this.round; return { t: R1(this.t * 1000), P, M, ph: r ? r.phase : '', left: r ? R1(r.left * 1000) : 0, prog: r ? r.progress() : 0, bhp: ctx.town.banner ? R1(ctx.town.banner.hp) : 0, sc: r ? r.scores : {} };
  }
  recv(d, from) {
    if (this.ended || !d || typeof d !== 'object') return; this.stats.recv++; const ctx = this.ctx, w = ctx.world;
    if (d.k === 'p' && this.host) { const b = this.builderFor(from); if (!b) return; const a = d.d; if (b.lastT !== undefined && a[0] < b.lastT) return; b.lastT = a[0]; b.target = [a[1], a[2], a[3], a[4] / 100, a[5], a[6]]; b.hp = a[7]; }
    else if (d.k === 'a' && this.host) { const b = this.builderFor(from); for (const op of d.ops || []) this.applyOp(op, from, b); }
    else if (d.k === 's' && this.client) {
      const s = d.d; if (s.t <= this.lastS) return; this.lastS = s.t;
      for (const p of s.P) { if (p[0] === this.me) continue; const b = this.builderFor(p[0]); if (b) { b.target = [p[1], p[2], p[3], p[4] / 100, p[5], p[6]]; b.hp = p[7]; } }
      const seen = new Set();
      for (const q of s.M) { seen.add(q[0]); let m = ctx.monsters.list.find(x => x.uid === q[0] && x.puppet); if (!m) { m = new DQ.Monster(ctx, q[1], Math.floor(q[2] / T), Math.floor(q[3] / T), Math.floor(q[4] / T)); m.uid = q[0]; m.puppet = true; ctx.monsters.list.push(m); } m.ptarget = [q[2], q[3], q[4], q[5] / 100]; m.hp = q[6]; m.tele = q[7]; m.seenT = this.t; }
      for (const m of ctx.monsters.list) if (m.puppet && !seen.has(m.uid) && this.t - (m.seenT || 0) > .5) { m.dead = true; m.deadT = 1; }
      if (this.round) this.round.fromSnapshot(s);
    }
    else if (d.k === 'e' && this.client) for (const ev of d.ev || []) this.applyEvent(ev);
  }
  /** host: a client's action */
  applyOp(op, from, b) {
    const ctx = this.ctx, w = ctx.world, [k] = op;
    if (k === 'place') { const [, x, y, z, id, rot] = op; if (!w.inside(x, y, z) || DQ.SOLID[w.get(x, y, z)] || !DQ.BLOCKS[id] || !DQ.BLOCKS[id].placeable) { this.event(['vox', x, y, z, w.get(x, y, z), w.rot(x, y, z)]); return; } w.set(x, y, z, id, { by: b, rot }); }
    else if (k === 'break') { const [, x, y, z] = op, id = w.get(x, y, z); if (!id || DQ.BLOCKS[id].tier >= 99) { this.event(['vox', x, y, z, id, w.rot(x, y, z)]); return; } w.set(x, y, z, 0, { by: b }); DQ.dropsFor(ctx, DQ.BLOCKS[id].drop, x * T + 8, y * T + 8, z * T + 8, b); }
    else if (k === 'obj') { const [, id, x, y, z, f] = op; if (!ctx.objects.canPlace(id, x, y, z, f)) ctx.objects.add(id, x, y, z, f, { by: b }); }
    else if (k === 'unobj') { const [, x, y, z] = op, o = ctx.objects.at(x, y, z); if (o && o.def.removable) ctx.objects.remove(o, { by: b }); }
    else if (k === 'hit') { const [, uid, dmg] = op, m = ctx.monsters.list.find(q => q.uid === uid && !q.dead); if (m && b && Math.hypot(m.x - b.x, m.y - b.y) < 60) ctx.combat.damageMonster(m, Math.min(60, Math.max(1, dmg | 0)), b, {}); }
    else if (k === 'harvest') { const [, x, y, z] = op, o = ctx.objects.at(x, y, z); if (o && o.def.plant) { ctx.objects.harvest(o, b); this.event(['unobj', x, y, z]); } }
    else if (k === 'craft') { if (this.round) this.round.crafted(from, op[1]); }
    else if (k === 'take') { if (this.round) this.round.crate(b, null, true); }
  }
  /** client: the host's word */
  applyEvent(ev) {
    const ctx = this.ctx, w = ctx.world, [k] = ev, me = ctx.builder;
    if (k === 'vox') { const [, x, y, z, id, rot] = ev; if (w.get(x, y, z) !== id) w.set(x, y, z, id, { rot, by: 'net' }); }
    else if (k === 'obj') { const [, id, x, y, z, f] = ev; if (!ctx.objects.at(x, y, z)) ctx.objects.add(id, x, y, z, f, { by: 'net' }); }
    else if (k === 'unobj') { const [, x, y, z] = ev, o = ctx.objects.at(x, y, z); if (o) ctx.objects.remove(o, { by: 'net' }); }
    else if (k === 'drop') { const [, uid, id, n, x, y, z] = ev; const d = ctx.drops.spawn(id, n, x, y, z, { uid }); if (d) d.netOnly = true; }
    else if (k === 'gone') { const i = ctx.drops.list.findIndex(d => d.uid === ev[1]); if (i >= 0) ctx.drops.list.splice(i, 1); }
    else if (k === 'got') { const [, to, id, n] = ev; if (to === this.me && me) { me.bag.add(id, n); DQ.sfx('pickup', { vol: .4 }); ctx.hud.pickup(id, n); ctx.events.emit('itemGained', { id, n, by: me }); } }
    else if (k === 'hurt') { const [, to, dmg, kx, ky] = ev; if (to === this.me && me) me.hurt(dmg, { x: kx, y: ky }); }
    else if (k === 'fx') { const [, kind, x, y, z] = ev; if (kind === 'kill') DQ.game.particles.bits(x, y, z, 10, ['#cfcad6', '#9a94a8']); }
    else if (k === 'phase') { if (this.round) this.round.setPhase(ev[1], true); }
    else if (k === 'score') { if (this.round) this.round.scores[ev[1]] = ev[2]; }
    else if (k === 'kit') { if (me && ev[1] === this.me) for (const [id, n] of ev[2]) me.bag.add(id, n); }
  }
  /** stop everything (the hub's end) */
  end() { this.ended = true; for (const f of this.offs) if (typeof f === 'function') f(); }
  msgRate() { return this.stats.perSec.length; }
}
DQ.Net = Net;
// monster puppets on clients: interpolate to the host's snapshots
const up = DQ.Monster.prototype.update;
DQ.Monster.prototype.update = function (dt) {
  if (!this.puppet) return up.call(this, dt);
  const t = this.ptarget; if (!t) return; const k = Math.min(1, dt * 10), b = this.body;
  const vx = (t[0] - b.x) * 10, vy = (t[1] - b.y) * 10; b.x += (t[0] - b.x) * k; b.y += (t[1] - b.y) * k; b.z += (t[2] - b.z) * k; b.vx = vx; b.vy = vy; this.facing = t[3];
  this.move = this.tele ? { phase: 'wind', t: DQ.game.time % .2, name: 'x', spec: {} } : null; this.flashT = Math.max(0, this.flashT - dt);
  this.rigUpdate(dt);
};
})();
