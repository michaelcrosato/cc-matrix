// The Quilting Bee: a co-op round on Bumblebee Meadow. Raise the Quilt Barn together, then hold off the raid.
// In an AI Hub session it is a shared world (the host runs it); on its own it is the same round, solo, with bots.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px, T = 16;
const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

// the in-process stand-in for AIHub's send/on (solo rounds): the local copy is the host and nobody else listens
class LoopbackNet { constructor() { this.h = {}; this.sent = 0; } send() { this.sent++; return true; } on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => {}; } }
DQ.LoopbackNet = LoopbackNet;

class Bee {
  // o: { net (AIHub or a loopback), me, players: [{ id, name, color }], host, server, bots, limitMs }
  constructor(game, o) {
    this.game = game; this.o = o; this.net = o.net; this.me = o.me; this.isHost = o.host === o.me || o.server; this.server = !!o.server;
    this.players = o.players.map((p, i) => Object.assign({ color: COLORS[i % 4] }, p));
    const ctx = this.ctx = DQ.makeSession(game, { mode: 'bee', noBuilder: true }); ctx.bee = this; DQ.current = ctx;
    ctx.netClient = { local: this.isHost, act: op => this.act(op) };
    this.builders = new Map(); this.scores = {}; this.stats = {}; this.gathered = {};
    const [bx, by] = DQ.BEE.banner;
    this.players.forEach((p, i) => {
      const b = new DQ.Builder(ctx, { x: (bx - 1 + i + .5) * T, y: (by + 3.5) * T, z: ctx.world.topZ(bx, by + 3) * T, name: DQ.safeName(p.name), color: p.color, id: p.id, local: p.id === this.me && !this.server, look: i % 2 ? 'B' : 'A', pal: i % 4 });
      b.take('darningStick', 1, { quiet: true }); b.take('cobbleClub', 1, { quiet: true }); b.setEquip('weapon', 'cobbleClub');
      b.hotbar = ['cobble', 'planks', 'feltRed', 'latticeDoor', 'torch', 'bun', null, null];
      this.builders.set(p.id, b); ctx.builders.push(b); if (b.local) ctx.builder = b; this.scores[p.id] = 0; this.stats[p.id] = { Blocks: 0, Monsters: 0 }; this.gathered[p.id] = 0;
      b.bag.add('cobble', 6); b.bag.add('planks', 6); b.bag.add('bun', 2);
    });
    if (!ctx.builder) ctx.builder = null;
    // bots in a solo round: builders driven by the Autopilot
    this.bots = [];
    for (const p of this.players) if (p.bot) { const b = this.builders.get(p.id); b.local = false; const ap = new DQ.Autopilot(ctx, b, { cheats: { infinite: true, fastPlace: false }, ui: false }); this.bots.push({ b, ap }); }
    // the barn scales with the players
    const n = this.players.length, pid = n <= 1 ? 'barn1' : n === 2 ? 'barn2' : 'barn3'; this.pid = pid;
    ctx.town.layPattern(pid, DQ.BEE.site[0], DQ.BEE.site[1], ctx.world.topZ(...DQ.BEE.site), 0);
    const ban = ctx.town.bannerObj(); if (ban) ban.hp = 200;
    const limit = Math.min(8 * 60, (o.limitMs || 8 * 60000) / 1000); this.total = limit; this.buildT = limit * 5 / 8;
    this.t = 0; this.phase = 'countdown'; this.ended = false; this.finished = false; this.remote = {}; this.out = []; this.outE = []; this._pT = 0; this._sT = 0; this._eT = 0; this._aT = 0; this.msgs = 0; this.bytes = 0; this.snapT = -1; this.left = new Set();
    this.unsubs = [];
    this.unsubs.push(this.net.on('message', (d, from) => this.recv(d, from)));
    // the host credits pattern blocks and kills
    ctx.events.on('blockPlaced', e => { if (!this.isHost) { return; } this.voxEvent(e.x, e.y, e.z, e.id, e.by); const c = this._patternCell(e.x, e.y, e.z); if (c && c.block === e.id && e.by !== undefined && this.scores[e.by] !== undefined) { this.scores[e.by] += 3; this.stats[e.by].Blocks++; } });
    ctx.events.on('blockBroken', e => { if (this.isHost) this.voxEvent(e.x, e.y, e.z, 0, e.by); });
    ctx.events.on('objectPlaced', e => { if (!this.isHost) return; const o2 = e.obj; this.event(['obj', o2.id, o2.x, o2.y, o2.z, o2.facing, o2.uid]); const c = this._patternCell(o2.x, o2.y, o2.z); if (c && c.obj === o2.id && this.scores[e.by] !== undefined) this.scores[e.by] += 5; });
    ctx.events.on('objectRemoved', e => { if (this.isHost) this.event(['unobj', e.obj.uid]); });
    ctx.events.on('monsterKilled', e => { if (!this.isHost) return; const by = e.by && e.by.id; if (by !== undefined && this.scores[by] !== undefined) { this.scores[by] += e.id === 'knotbrute' ? 15 : 5; this.stats[by].Monsters++; } });
    ctx.events.on('itemGained', e => { if (!this.isHost || !e.by) return; const id = e.by.id; this.gathered[id] = (this.gathered[id] || 0) + e.n; if (!e.by.local && !(this.bots.some(q => q.b === e.by))) this.event(['got', id, e.id, e.n]); });
    ctx.events.on('builderHurt', e => { if (this.isHost && e.by && !e.by.local && !this.bots.some(q => q.b === e.by)) this.event(['hurt', e.by.id, e.dmg, 0, 0]); });
    ctx.events.on('siegeWave', e => { if (this.isHost) this.event(['phase', e.phase === 'wave' ? 'raid' + e.wave : e.phase]); });
  }
  _patternCell(x, y, z) { const P = this.ctx.town.pattern; return P && P.cells.find(c => c.x === x && c.y === y && c.z === z); }
  score(id) { return (this.scores[id] || 0) + Math.floor((this.gathered[id] || 0) / 5); }
  // ---- network out ----
  send(d, o) { const s = JSON.stringify(d); this.msgs++; this.bytes += s.length; return this.net.send(d, o); }
  act(op) { this.out.push(op); }
  event(e) { this.outE.push(e); }
  voxEvent(x, y, z, id, by) { this.event(['vox', x, y, z, id, typeof by === 'number' ? by : -1]); }
  // ---- network in ----
  recv(d, from) {
    if (!d || typeof d !== 'object' || this.ended) return;
    const ctx = this.ctx;
    if (this.isHost) {
      if (d.k === 'p') { const b = this.builders.get(from); if (!b || this.left.has(from)) return; const [t, x, y, z, f, , , hp] = d.v; if (t < (this.remote[from] || -1)) return; this.remote[from] = t; Object.assign(b.body, { x, y, z, facing: f / 100 }); b.body.vx = 0; b.body.vy = 0; b.hp = hp; }
      else if (d.k === 'a') { const b = this.builders.get(from); if (!b) return; for (const op of d.ops || []) this.apply(b, op); }
    } else {
      if (d.k === 's') this.applySnapshot(d);
      else if (d.k === 'e') for (const e of d.ev || []) this.applyEvent(e);
    }
  }
  // the host applies a player's action
  apply(b, op) {
    const ctx = this.ctx, w = ctx.world, [kind] = op;
    if (kind === 'place') { const [, x, y, z, id, rot] = op; if (!w.get(x, y, z) && !w.objAt(x, y, z) && !ctx.builders.some(q => q !== b && q.blockedByBody(x, y, z, 1))) w.set(x, y, z, id, { by: b.id, rot }); else this.voxEvent(x, y, z, w.get(x, y, z), -1); }
    else if (kind === 'break') { const [, x, y, z] = op; if (w.get(x, y, z)) b.hitBlock(x, y, z); }
    else if (kind === 'obj') { const [, id, x, y, z, f] = op; ctx.objects.add({ id, x, y, z, facing: f }, { by: b.id }); }
    else if (kind === 'hit') { const [, uid, dmg, kx, ky] = op; const m = ctx.monsters.list.find(q => q.uid === uid && !q.dead); if (m) ctx.combat.hitMonster(m, E.clamp(dmg, 0, 60), { by: b, kx, ky }); }
    else if (kind === 'hitobj') { const [, uid] = op; const o2 = ctx.objects.byId.get(uid); if (o2) b.hitObject(o2); }
    else if (kind === 'use') { const [, uid] = op; const o2 = ctx.objects.byId.get(uid); if (o2 && o2.def.supply) { const now = this.game.time, k = 'supply' + b.id; if (now - (ctx[k] || -999) >= 60) { ctx[k] = now; for (const [it, n] of [['planks', 10]].concat(ctx['lint' + b.id] ? [] : [['lint', 2], ['branch', 2]])) this.event(['got', b.id, it, n]); ctx['lint' + b.id] = 1; } } }
  }
  // a client lays the host's snapshot over its copy
  applySnapshot(d) {
    const ctx = this.ctx; if (d.t < this.snapT) return; this.snapT = d.t;
    for (const [id, x, y, z, f, , , hp] of d.P || []) { if (id === this.me) continue; const b = this.builders.get(id); if (b) { b._to = [x, y, z, f / 100]; b.hp = hp; } }
    const seen = new Set();
    for (const [uid, kind, x, y, z, f, hp, st] of d.M || []) {
      seen.add(uid); let m = ctx.monsters.list.find(q => q.uid === uid);
      if (!m) { m = new DQ.Monster(ctx, kind, x, y, z, { uid }); m.puppet = true; ctx.monsters.list.push(m); }
      m._to = [x, y, z, f / 100]; m.hp = hp; m.state = ['idle', 'chase', 'wind', 'attack', 'recover', 'roll', 'dive', 'hurt', 'flee', 'notice'][st] || 'chase';
    }
    if (!d.half) for (const m of ctx.monsters.list) if (!seen.has(m.uid) && !m.dead) { m.dead = true; m.deadT = 0; }
    this.phase = d.ph; this.t = d.tt; const ban = ctx.town.bannerObj(); if (ban) ban.hp = d.bhp;
    if (d.sc) this.scores = d.sc;
  }
  applyEvent(e) {
    const ctx = this.ctx, w = ctx.world;
    switch (e[0]) {
      case 'vox': { const [, x, y, z, id] = e; w.set(x, y, z, id, { silent: true }); ctx.rooms.mark(); if (id) ctx.game.particles.glints((x + .5) * T, (y + .5) * T, (z + 1) * T, 2, '#f1e6c8'); break; }
      case 'obj': { const [, id, x, y, z, f, uid] = e; if (!w.objAt(x, y, z)) ctx.objects.add({ id, x, y, z, facing: f, uid }, { force: true, silent: true }); break; }
      case 'unobj': { const o2 = ctx.objects.byId.get(e[1]); if (o2) ctx.objects.remove(o2, { silent: true, noRegrow: true }); break; }
      case 'drop': { const [, id, item, n, x, y, z] = e; ctx.drops.spawn(item, n, x, y, z, { id, burst: false }); break; }
      case 'gone': { const i = ctx.drops.list.findIndex(q => q.id === e[1]); if (i >= 0) ctx.drops.list.splice(i, 1); break; }
      case 'got': { if (e[1] === this.me && ctx.builder) ctx.builder.take(e[2], e[3]); break; }
      case 'hurt': { if (e[1] === this.me && ctx.builder) ctx.builder.hurt(e[2]); break; }
      case 'phase': { this.phaseEvent(e[1]); break; }
      case 'kill': { const m = ctx.monsters.list.find(q => q.uid === e[1]); if (m && !m.dead) { m.dead = true; m.deadT = 0; ctx.game.particles.bits(m.body.x, m.body.y, m.body.z + 8, 10, [m.def.col, '#f8f4ec']); } break; }
    }
  }
  phaseEvent(ph) { const ctx = this.ctx; if (ph === 'raid') { ctx.hud.banner('The raid begins!'); ctx.audioX.sfx('roar'); ctx.audioX.A.layer('raid', 1, 1); } else if (ph && ph.startsWith('raid')) ctx.hud.banner('Raid wave ' + ph.slice(4) + '!'); else if (ph === 'cleared') ctx.hud.banner('Wave cleared!'); }
  // ---- the step ----
  update(dt) {
    const ctx = this.ctx, game = this.game, hubT = this.o.time ? this.o.time() : null;
    if (this.ended) return;
    if (this.phase === 'countdown') { if (hubT === null ? (this.t += dt) >= 3 : hubT >= 0) { this.phase = 'build'; this.t = 0; ctx.hud.banner('Raise the Quilt Barn!'); ctx.audioX.play('bee', { restart: true }); } else if (hubT !== null) this.cd = -hubT / 1000; else this.cd = 3 - this.t; }
    else if (this.isHost) this.t = hubT !== null ? hubT / 1000 : this.t + dt;
    const playing = this.phase === 'build' || this.phase === 'raid';
    // the local player's intent; remote builders on the host are placed by their messages; clients smooth others
    const local = ctx.builder;
    const intentFn = () => playing && local && !local.ko ? DQ.Controls.intent(game, ctx) : DQ.Controls.blank();
    for (const { b, ap } of this.bots) { b.intent = playing ? ap.intent() : DQ.Controls.blank(); }
    for (const b of ctx.builders) { if (b._to) { const [x, y, z, f] = b._to; b.body.x += (x - b.body.x) * Math.min(1, dt * 12); b.body.y += (y - b.body.y) * Math.min(1, dt * 12); b.body.z += (z - b.body.z) * Math.min(1, dt * 12); b.body.facing = f; } }
    // remote players: no physics of their own here, the rig only
    for (const b of ctx.builders) b.remote = !b.local && !this.bots.some(q => q.b === b);
    DQ.sessionUpdate(ctx, dt, intentFn);
    for (const b of ctx.builders) if (b.remote) b.rig.update(dt, { x: b.body.x, y: b.body.y, z: b.body.z, vx: (b._to ? b._to[0] - b.body.x : 0) * 6, vy: (b._to ? b._to[1] - b.body.y : 0) * 6, facing: b.body.facing });
    if (!this.isHost) for (const m of ctx.monsters.list) if (m._to) { const [x, y, z, f] = m._to; m.body.x += (x - m.body.x) * Math.min(1, dt * 10); m.body.y += (y - m.body.y) * Math.min(1, dt * 10); m.body.z += (z - m.body.z) * Math.min(1, dt * 10); m.body.facing = f; m.flash = Math.max(0, m.flash - dt); m.t += dt; if (m.dead) m.deadT += dt; m.rig.update(dt, m.def.body === 'blob' ? { squash: m.state === 'wind' ? .3 : 0, walk: 1, flap: 1 } : { x: m.body.x, y: m.body.y, z: m.body.z, vx: 0, vy: 0, facing: f }); }
    if (!this.isHost) ctx.monsters.list = ctx.monsters.list.filter(m => !m.dead || m.deadT < .3);
    // the host runs the round
    if (this.isHost && playing) {
      if (this.phase === 'build' && (this.t >= this.buildT || ctx.town.pattern.done)) { this.phase = 'raid'; this.raidAt = this.t; this.event(['phase', 'raid']); this.phaseEvent('raid'); this._startRaid(); }
      const ban = ctx.town.bannerObj();
      if (this.t >= this.total || (this.phase === 'raid' && (ban && ban.hp <= 0 || (!ctx.siege.active && ctx.siege.phase === 'done'))) || (this.o.hub && this.players.every(p => this.left.has(p.id)))) this.finish('time');
    }
    // the bots' work
    for (const q of this.bots) if (!q.task || q.task.done) q.task = q.ap.run(this._botTask(q));
    // the network
    this._net(dt);
  }
  _startRaid() {
    const n = this.players.length, ctx = this.ctx;
    ctx.siege.start({ prep: 0, bee: true, bannerHp: 200, waves: [[['lintling', 4 + 2 * n, 'north'], ['lintling', 2 + n, 'east']], [['pinhog', 2 + n, 'south'], ['lintling', 2 + n, 'rift']], [['knotbrute', Math.max(1, Math.round(n / 2)), 'east'], ['pinhog', 2, 'north']]] });
    ctx.siege.nextWave();
  }
  *_botTask(q) {
    const ap = q.ap, ctx = this.ctx;
    if (this.phase === 'raid' && ctx.monsters.list.some(m => !m.dead)) { yield* ap.fight({ timeout: 8, spin: false }); return; }
    const P = ctx.town.pattern; if (!P || P.done) { yield* ap.wait(1); return; }
    const cells = P.cells.filter(c => !c.ok && !ctx.world.get(c.x, c.y, c.z) && !ctx.world.objAt(c.x, c.y, c.z)).sort((a, b) => a.z - b.z);
    const k = this.bots.indexOf(q), c = cells[(k * 7) % Math.max(1, cells.length)]; if (!c) { yield* ap.wait(1); return; }
    const item = c.block ? DQ.BLOCKS[c.block].key : Object.keys(DQ.ITEMS).find(i => DQ.ITEMS[i].obj === c.obj);
    yield* ap.placeAt(c.x, c.y, c.z, item, { facing: c.obj && DQ.OBJECTS[c.obj].door ? undefined : undefined });
    yield* ap.wait(.6);
  }
  _net(dt) {
    const ctx = this.ctx;
    if (this.isHost) {
      this._sT -= dt; this._eT -= dt;
      if (this._sT <= 0) {
        this._sT = .1; const P = ctx.builders.map(b => [b.id, Math.round(b.body.x), Math.round(b.body.y), Math.round(b.body.z), Math.round(b.body.facing * 100), 0, 0, b.hp]);
        let M = ctx.monsters.list.filter(m => !m.dead).map(m => [m.uid, m.id, Math.round(m.body.x), Math.round(m.body.y), Math.round(m.body.z), Math.round(m.body.facing * 100), m.hp, ['idle', 'chase', 'wind', 'attack', 'recover', 'roll', 'dive', 'hurt', 'flee', 'notice'].indexOf(m.state)]);
        let half = false; if (M.length > 14) { this._half = !this._half; M = M.filter((q, i) => i % 2 === (this._half ? 1 : 0)); half = true; }
        const ban = ctx.town.bannerObj(), sc = {}; for (const p of this.players) sc[p.id] = this.score(p.id);
        this.send({ k: 's', t: Math.round(this.game.time * 1000), P, M, half, ph: this.phase, tt: +this.t.toFixed(2), bhp: ban ? ban.hp : 0, prog: ctx.town.pattern ? ctx.town.pattern.built : 0, sc }, { reliable: false });
      }
      // drops: tell clients about new and gone ones; kills
      for (const d of ctx.drops.list) if (!d._sent) { d._sent = true; this.event(['drop', d.id, d.item, d.n, Math.round(d.x), Math.round(d.y), Math.round(d.z)]); }
      const live = new Set(ctx.drops.list.map(d => d.id)); for (const id of this._drops || []) if (!live.has(id)) this.event(['gone', id]); this._drops = live;
      for (const m of ctx.monsters.list) if (m.dead && !m._sentKill) { m._sentKill = true; this.event(['kill', m.uid]); }
      if (this._eT <= 0 && this.outE.length) { this._eT = 1 / 6; while (this.outE.length) { const batch = []; let size = 0; while (this.outE.length && size < 12000) { const e = this.outE.shift(); size += JSON.stringify(e).length; batch.push(e); } this.send({ k: 'e', ev: batch }, { reliable: true }); if (this.outE.length) break; } }
    } else {
      this._pT -= dt; this._aT -= dt; const b = ctx.builder;
      if (this._pT <= 0 && b) { this._pT = .1; this.send({ k: 'p', v: [Math.round(this.game.time * 1000), Math.round(b.body.x), Math.round(b.body.y), Math.round(b.body.z), Math.round(b.body.facing * 100), 0, 0, b.hp] }, { reliable: false }); }
      if (this._aT <= 0 && this.out.length) { this._aT = 1 / 6; this.send({ k: 'a', ops: this.out.splice(0, 40) }, { reliable: true }); }
    }
  }
  standings() {
    const ids = this.players.filter(p => !this.left.has(p.id)).map(p => p.id), groups = new Map();
    for (const id of ids) { const s = this.score(id); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(id); }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(e => e[1]);
  }
  finish(why) {
    if (this.finished || !this.isHost) return; this.finished = true;
    const ctx = this.ctx, scores = {}, stats = {}; for (const p of this.players) { scores[p.id] = this.score(p.id); stats[p.id] = Object.assign({}, this.stats[p.id]); }
    const ban = ctx.town.bannerObj(), won = !!(ctx.town.pattern && ctx.town.pattern.done && ban && ban.hp > 0);
    const best = (k) => { let b = null, v = -1; for (const p of this.players) if (this.stats[p.id][k] > v) { v = this.stats[p.id][k]; b = p.id; } return v > 0 ? b : null; };
    const awards = []; const mq = best('Blocks'), kc = best('Monsters'); if (mq !== null) awards.push({ id: mq, title: 'Master Quilter', detail: 'Most barn blocks placed' }); if (kc !== null) awards.push({ id: kc, title: 'Knot Cutter', detail: 'Most monsters defeated' });
    this.result = { standings: this.standings(), scores, won, stats, awards };
    if (this.o.hub) { try { AIHub.finish(this.result); } catch (e) { DQ.fail('finish', e); } }
    else { this.endRound('finished'); const best2 = E.store.get('dqb-bee-best', 0); if (this.me !== undefined && scores[this.me] > best2) E.store.set('dqb-bee-best', scores[this.me]); }
  }
  endRound(reason) {
    if (this.ended) return; this.ended = true; this.endReason = reason; const g = this.game;
    if (this.o.hub) { g.input.clear(); g.audio.mute(true); g.audio.music(null); }
    for (const u of this.unsubs) try { u(); } catch (e) { /* gone */ }
  }
  leave(id) { this.left.add(id); const b = this.builders.get(id); if (b) { const i = this.ctx.builders.indexOf(b); if (i >= 0) this.ctx.builders.splice(i, 1); this.ctx.game.particles.smoke(b.body.x, b.body.y, b.body.z + 8, 8); } }
  snapshot() { return { phase: this.phase, t: +this.t.toFixed(1), host: this.isHost, pattern: this.ctx.town.pattern ? [this.ctx.town.pattern.built, this.ctx.town.pattern.total] : null, scores: Object.assign({}, this.scores), players: this.players.length, ended: this.ended, msgs: this.msgs, bytes: this.bytes, result: this.result || null }; }
  draw(r) {
    const ctx = this.ctx;
    DQ.sessionDraw(ctx, r);
    r.overlay(g => {
      const W = r.W, H = r.H, ui = DQ.UI, left = Math.max(0, (this.phase === 'build' ? this.buildT : this.total) - this.t);
      ui.panel(g, W / 2 - 70, 4, 140, 30, { alpha: .85, thread: '#f5b700' });
      ui.center(g, this.phase === 'build' ? 'Build the Quilt Barn' : this.phase === 'raid' ? 'Hold off the raid!' : this.phase === 'countdown' ? 'Get ready!' : 'Round over', W / 2, 8, '#ffd36a');
      ui.center(g, DQ.fmtTime(left) + (ctx.town.pattern ? '   Barn ' + ctx.town.pattern.built + '/' + ctx.town.pattern.total : ''), W / 2, 20, '#ffffff');
      this.players.forEach((p, i) => { const y = 40 + i * 12; px.rect(g, 6, y, 8, 8, p.color); ui.text(g, DQ.safeName(p.name) + (this.left.has(p.id) ? ' (left)' : '') + '  ' + (this.score(p.id) || this.scores[p.id] || 0), 18, y, '#ffffff'); });
      if (this.phase === 'countdown') { const n = Math.ceil(this.cd || 0); if (n > 0) E.font.title(g, String(n), W / 2, H / 2 - 20, { scale: 4, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' }); }
      if (this.ended || this.finished) { ui.panel(g, W / 2 - 110, H / 2 - 40, 220, 80, { thread: '#ffd36a' }); E.font.title(g, 'Round over', W / 2, H / 2 - 32, { scale: 2, colors: ['#fff0a0', '#e8b830'], outline: '#2a1a0a', align: 'center' }); const res = this.result; if (res) { ui.center(g, res.won ? 'The barn stands! Well stitched!' : 'The barn fell short...', W / 2, H / 2 - 8, res.won ? '#6ae06a' : '#ff9a9a'); if (!this.o.hub) DQ.Glyphs.text(g, this.game, '{btn:confirm} Back to the title', W / 2 - 60, H / 2 + 20, '#c8c0e0'); } }
    });
  }
}
DQ.Bee = Bee;

DQ.BEE_SCENES = (game) => ({
  bee: {
    input: DQ.Controls.PLAY, pausable: false, camera: { zoom: false },
    enter(data = {}) {
      const s = this; s.bee = null; s.card = null; s.t = 0; s.waiting = false; game.setView(DQ.VIEW_ISO); game.setZoom(1); game.input.wheelGame = true;
      if (DQ.inHub && !data.solo) { s.waiting = true; DQ.hubConnect(game, s); return; }
      // solo: you and up to three bots (Settings: bots on or off)
      const bots = E.store.get('dqb-bee-bots', 2), players = [{ id: 0, name: (DQ.current && DQ.current.builder && DQ.current.builder.name) || 'You' }];
      for (let i = 0; i < bots; i++) players.push({ id: i + 1, name: ['Bobbin', 'Thimble', 'Pinny'][i], bot: true });
      s.bee = new Bee(game, { net: new LoopbackNet(), me: 0, host: 0, players, limitMs: 8 * 60000 });
      s.ctx = s.bee.ctx; s.ctx.save = null;
      game.cam.bounds = v => s.ctx.world.bounds(v); game.cam.snap = true; game.lights.enabled = false;
      s.ctx.audioX.play('bee', { restart: true });
      s.ctx.hud.hint('Raise the Quilt Barn: fill every ghost block! Then defend it.', 5);
    },
    exit() { game.input.wheelGame = false; game.audio.mute(false); },
    update(dt) {
      const s = this; s.t += dt;
      if (s.card) { s.card.update(dt); return; }
      if (!s.bee) return;
      s.bee.update(dt);
      const I = game.input;
      if (!DQ.inHub && I.pressed('pause')) { if (!s.bee.ended) s.bee.finish('quit'); else game.go('title'); }
      if (!DQ.inHub && s.bee.ended && s.bee.result && (I.pressed('confirm') || I.clicked()) && s.t > 1) game.go('title');
      if (DQ.inHub && I.pressed('pause')) s.bee.ctx.hud.hint('Round in progress!');
    },
    draw(r) {
      const s = this;
      if (s.card) { s.card.draw(r); return; }
      if (s.bee) { if (s.bee.server) { r.sky(['#0c0a24', '#1a1640']); r.overlay(g => DQ.UI.center(g, 'Hosting the Bee', r.W / 2, r.H / 2, '#ffd36a')); return; } s.bee.draw(r); return; }
      r.sky(['#0c0a24', '#1a1640']); r.overlay(g => DQ.UI.center(g, 'Joining the Bee...', r.W / 2, r.H / 2, '#ffd36a'));
    }
  }
});

// ---- the AI Hub session flow ----
DQ.hubConnect = async (game, scene) => {
  let info = null;
  try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { DQ.fail('connect', e); }
  if (!info) { DQ.inHub = false; game.go('title'); return; }
  const players = (info.players || []).map(p => ({ id: p.id, name: p.name, color: p.color }));
  const bee = new Bee(game, { net: AIHub, me: info.me, host: info.host, server: !!info.server, players, limitMs: info.limitMs, hub: true, time: () => AIHub.time() });
  scene.bee = bee; scene.ctx = bee.ctx; bee.ctx.inHub = true; bee.ctx.save = null; game.lights.enabled = false;
  game.cam.bounds = v => bee.ctx.world.bounds(v); game.cam.snap = true;
  scene.card = new HubCard(game, bee, info);
  AIHub.on('card', c => { if (scene.card) scene.card.state = c; });
  AIHub.on('start', () => { scene.card = null; game.audio.mute(false); });
  AIHub.on('leave', e => bee.leave(e.id));
  AIHub.on('time-up', () => { if (bee.isHost) bee.finish('time-up'); });
  AIHub.on('end', e => { scene.card = null; bee.endRound(e && e.reason); bee.result = bee.result || { standings: e && e.standings }; });
  AIHub.ready();
};
class HubCard {
  constructor(game, bee, info) { this.game = game; this.bee = bee; this.info = info; this.state = { left: null, ready: [] }; this.t = 0; this.more = false; this.rigs = bee.players.map((p, i) => DQ.makeBuilderRig(i % 2 ? 'B' : 'A', i % 4, p.color)); this.rects = []; }
  update(dt) {
    this.t += dt; const I = this.game.input; this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t + i) * .4, pose: (this.state.ready || []).includes(this.bee.players[i].id) ? 'cheer' : undefined }));
    if (this.bee.server) return;
    const c = I.clicked(), hit = id => { const r = this.rects.find(q => q[4] === id); return c && r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]; };
    if (I.pressed('start') || I.pressed('confirm') || hit('ready')) { AIHub.answer('ready'); DQ.sfx(this.game, 'uiConfirm'); }
    if (I.pressed('place') || I.pressed('more') || hit('more')) { AIHub.answer('more'); this.more = !this.more; DQ.sfx(this.game, 'uiMove'); }
  }
  draw(r) {
    r.sky(['#1a1640', '#2a1f50', '#3a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H, ui = DQ.UI, st = this.state || {}; this.rects = [];
      DQ.UI.logo(g, W / 2, 6, 3, this.t);
      ui.center(g, 'QUILTING BEE', W / 2, 52, '#ffd36a');
      ui.center(g, 'Raise the Quilt Barn together, then defend it!', W / 2, 64, '#ffffff');
      const n = this.bee.players.length;
      this.bee.players.forEach((p, i) => { const x = W / 2 + (i - (n - 1) / 2) * 70; px.rect(g, x - 26, 78, 52, 70, '#1a1430'); this.rigs[i].draw(g, x, 132, DQ.VIEW_ISO); ui.center(g, DQ.safeName(p.name), x, 136, p.color); if ((st.ready || []).includes(p.id)) DQ.Glyphs.tick(g, x - 3, 82, true); });
      DQ.Glyphs.text(g, this.game, '{btn:move} Move  {btn:jump} Jump  {btn:swing} Break  {btn:place} Place  {btn:hotbar} Items', W / 2 - 150, 156, '#c8c0e0');
      const left = st.left === null || st.left === undefined ? (st.starting ? 'Starting...' : st.paused ? 'Paused' : '') : Math.ceil(st.left / 1000) + ' s';
      ui.center(g, left, W / 2, 170, '#ffd36a');
      if (!this.bee.server) {
        px.rect(g, W / 2 - 110, H - 40, 100, 18, '#3a3270'); DQ.Glyphs.text(g, this.game, '{btn:confirm} Ready', W / 2 - 96, H - 35, '#ffffff'); this.rects.push([W / 2 - 110, H - 40, 100, 18, 'ready']);
        px.rect(g, W / 2 + 10, H - 40, 100, 18, this.more || st.asked ? '#6a3a3a' : '#3a3270'); DQ.Glyphs.text(g, this.game, '{btn:place} More time (T)', W / 2 + 16, H - 35, '#ffffff'); this.rects.push([W / 2 + 10, H - 40, 100, 18, 'more']);
      }
    });
  }
}
DQ.HubCard = HubCard;
})();
