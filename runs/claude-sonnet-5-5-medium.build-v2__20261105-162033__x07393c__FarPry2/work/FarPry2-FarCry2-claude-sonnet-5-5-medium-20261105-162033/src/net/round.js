// Cash Run: a six-minute shared-world round in the valley around the Cut. The host runs the world; every copy moves its own player.
import { THREE, buildModel, toonMaterial, PALETTE, CharacterController } from '../../pixel-engine.js';
import { PersonView } from '../actors/rig.js';
import { CATALOG } from '../art/catalog.js';
import { TUNING } from '../core/tuning.js';
import { consume, held } from '../core/actions.js';
import { drawPrompt } from '../ui/glyphs.js';
import { SOLO_START, ROUND_CASES, TRUCK_AT } from '../content/round.js';

const V3 = THREE.Vector3;
const MODELS = ['ines', 'dov', 'mags', 'pell'];
class RPlayer {
  constructor(sys, p, seat) {
    const g = sys.g; this.sys = sys; this.g = g; this.id = p.id; this.name = p.name; this.color = p.color; this.bot = !!p.bot; this.seat = seat; this.kind = 'rplayer';
    this.hp = 100; this.state = 'alive'; this.downT = 0; this.respT = 0; this.carry = -1; this.stones = 0; this.downs = 0; this.revives = 0; this.kills = 0; this.lit = 0; this.alive = true; this.crouched = false; this.speedNow = 0;
    const [x, z] = SOLO_START[seat % SOLO_START.length]; const y = g.world.heightAt(x, z);
    this.pos = new V3(x, y, z); this.yaw = 0; this.start = [x, z]; this.hurtT = 0;
    this.isLocal = p.id === sys.session.me && !sys.session.server;
    if (!this.isLocal) {
      this.ctrl = new CharacterController(g.ctx.physics, { position: [x, y + 0.4, z], radius: 0.35, halfHeight: 0.55, speed: 5, gravity: -24 });
      this.collider = this.ctrl.collider; g.ctx.physics.tag(this.collider, 'npc'); this.pos = this.ctrl.feet;
      if (!g.headlessNoView) { this.view = new PersonView(MODELS[seat % 4], g.ctx); g.ctx.scene.add(this.view.object); this.view.layered('Idle', 'AimIdle'); }
      g.register(this);
    }
  }
  get pos() { return this.ctrl ? this.ctrl.feet : this._pos; }
  set pos(v) { this._pos = v; }
  takeHit(d, type, from) { this.sys.damage(this, d, type); }
  onHit() {}
  hear() {}
  ignite() {}
  get collide() { return this.collider; }
}
export class RoundSystem {
  name = 'round';
  players = []; cases = []; ended = false; started = false; clock = 0; banked = 0; puppets = new Map(); sent = 0; botT = 0; snapAt = -1; evq = []; wq = [];
  constructor(session) { this.session = session; }
  setup(g) {
    this.g = g; g.round = this; const S = this.session;
    g.mode = 'round'; g.hudHidden = false; g.noFever = true; g.carryPenalty = () => (this.local && this.local.carry >= 0 ? 0.85 : 1);
    g.world.hour = 15.5; g.world.wind.pin = true; g.world.wind.dir = [0.8, -0.6]; g.world.wind.speed = 4;
    S.players.forEach((p, i) => this.players.push(new RPlayer(this, p, i)));
    this.local = this.players.find((p) => p.isLocal) || null;
    ROUND_CASES.forEach(([x, z, n], i) => { const r = g.sitesSys.place('stone-case', x, z, i * 50, { collide: false, light: false }); this.cases.push({ i, x, z, stones: n, taken: false, burnt: false, carrier: -1, obj: r }); });
    this.truck = g.sitesSys.place('cargo-truck', TRUCK_AT[0], TRUCK_AT[1], 0.3, {});
    if (S.isHost) this.spawnSoldiers();
    if (this.local) { g.player.teleport(this.local.start[0], this.local.start[1], 0); g.weapons.give('tractor', 70); g.weapons.give('flare', 100); g.weapons.equipSlot('main', true); g.weapons.syrettes = 2; g.weapons.throwables.molotov = 2; g.weapons.throwables.charge = 0; g.weapons.addAmmo('flare', 7); }
    const baseExtra = g.extraPrompts; g.extraPrompts = () => [...(baseExtra ? baseExtra() : []), ...this.extraPrompts()];
    S.on('message', (d, from) => this.onMessage(d, from));
    S.on('start', () => { this.started = true; });
    this.cardData = null; S.on('card', (d) => { this.cardData = d; });
    if (S.kind === 'hub' && !S.server && typeof window !== 'undefined') {
      window.addEventListener('keydown', (ev) => { if (this.started) return; if (ev.code === 'Enter') S.answer('ready'); else if (ev.code === 'KeyM') S.answer('more'); });
      window.addEventListener('pointerdown', () => { if (!this.started) S.answer('ready'); });
    }
    S.on('leave', (m) => { const p = this.players.find((q) => q.id === m.id); if (p) p.left = true; });
    g.events.on('ignite', (x, z, n) => { if (this.local) this.local.lit += n; this.wq.push(['i', Math.round(x), Math.round(z)]); });
    g.events.on('kill', (a, info) => { if (info && info.by === 'player' && this.local) this.local.kills++; });
    if (typeof setInterval !== 'undefined') { this.timers = [setInterval(() => this.netSend(), 100)]; this.timers.forEach((t) => t.unref?.()); }
    g.camState.enabled = true;
    // the world around the Cut only
    g.world.sky.update(g.world.hour, g.ctx.camera.camera.position, true);
  }
  dispose() { for (const t of this.timers || []) clearInterval(t); }
  spawnSoldiers() {
    const g = this.g, rng = this.session.rng('soldiers'); const spots = [['the-cut', 8], ['p5', 4], ['ranger-post', 4], ['the-cut', 4]];
    let n = 0; for (const [id, k] of spots) { const s = g.sitesSys.find(id); for (let i = 0; i < k; i++) { const a = rng() * 6.283, d = 5 + rng() * 22; const f = id === 'the-cut' ? (n % 2 ? 'concord' : 'harvest') : s.faction || 'concord'; g.spawnSoldier({ faction: f, role: n % 6 === 3 ? 'mg' : n % 7 === 5 ? 'sniper' : 'rifle', at: [s.x + Math.cos(a) * d, s.z + Math.sin(a) * d], yaw: a, site: null, duty: n % 3 === 0 ? 'patrol' : 'guard', patrol: [[s.x + Math.cos(a) * d, s.z + Math.sin(a) * d], [s.x + Math.cos(a + 1) * d, s.z + Math.sin(a + 1) * d]] }); n++; } }
    this.soldierIds = new Map(); g.soldierSys.list.forEach((s, i) => { s.netId = i + 1; });
  }
  clockMs() { return this.session.time(); }
  playing() { return this.started && this.clockMs() >= 0 && !this.ended; }
  over() { if (!this.started) return false; const all = this.cases.every((c) => c.taken && c.banked || c.burnt); return this.clockMs() > 5000 && all; }
  // ---- damage and downs ----
  damage(p, d, type) { if (!this.session.isHost && p !== this.local) return; if (p.state !== 'alive') return; p.hp -= d; p.hurtT = 0.3; if (p.hp <= 0) this.down(p); if (p.isLocal) { this.g.body.hp = Math.max(1, p.hp); } }
  down(p) {
    p.state = 'down'; p.downT = 25; p.downs++; if (p.carry >= 0) { const c = this.cases[p.carry]; c.carrier = -1; c.taken = false; c.x = p.pos.x; c.z = p.pos.z; if (c.obj) { c.obj.object.visible = true; c.obj.object.position.set(c.x, this.g.world.heightAt(c.x, c.z), c.z); } p.carry = -1; }
    this.wq.push(['d', p.id]); if (p.isLocal) { this.g.say('DOWN. SOMEONE MAY HOLD USE TO BRING YOU UP.', 'player', 3); }
    this.g.events.emit('rounddown', p.id);
  }
  onPlayerDown() { const p = this.local; if (p && p.state === 'alive') { p.hp = 0; this.down(p); } }
  revive(p, by) { p.state = 'alive'; p.hp = 35; p.downT = 0; if (by) by.revives++; this.wq.push(['r', p.id]); if (p.isLocal) { this.g.body.hp = 35; } this.g.events.emit('roundrevive', p.id); }
  bank(p) { const c = this.cases[p.carry]; if (!c) return; p.stones += c.stones; c.banked = true; c.carrier = -1; p.carry = -1; this.wq.push(['b', p.id, c.i]); this.g.sfx('bank'); if (p.isLocal) this.g.say(`BANKED ${c.stones} STONES.`, 'player', 2); this.g.events.emit('roundbank', p.id, c.stones); }
  take(p, c) { if (c.taken || p.carry >= 0 || p.state !== 'alive') return; c.taken = true; c.carrier = p.id; p.carry = c.i; if (c.obj) c.obj.object.visible = false; this.wq.push(['t', p.id, c.i]); this.g.sfx('pickup'); }
  // ---- fixed ----
  fixed(g, dt) {
    const S = this.session; if (S.tick) S.tick(dt * 1000);
    this.clock = this.clockMs();
    const L = this.local;
    if (L && !this.ended) {
      const frozen = !this.playing(); g.cutscene = frozen; L.pos.copy(g.player.feet); L.yaw = g.ctx.camera.yaw; L.speedNow = Math.sqrt(g.player.speed2 || 0); L.crouched = g.player.crouched;
      if (S.isHost || true) { L.hp = L.state === 'alive' ? Math.min(100, g.body.hp) : 0; }
      if (L.state === 'down') {
        g.body.hp = 1; L.downT -= dt; g.mode = 'round'; g.player.ctrl.setInput(new V3(), false, false); this.freezeDown = true;
        if (L.downT <= 0) { L.state = 'alive'; L.respT = 0; g.player.teleport(L.start[0], L.start[1], 0); g.body.hp = 100; L.hp = 100; this.freezeDown = false; g.say('BACK AT YOUR ROAD END.', 'player', 2); this.wq.push(['r', L.id]); }
      }
      // cases and banking
      const f = g.player.feet;
      if (L.state === 'alive' && this.playing()) {
        if (L.carry >= 0 && Math.hypot(f.x - TRUCK_AT[0], f.z - TRUCK_AT[1]) < 7) this.bankLocal();
      }
    }
    if (S.isHost && this.playing()) {
      for (const p of this.players) {
        if (p.state === 'down') { p.downT -= dt; if (p.downT <= 0 && !p.isLocal) { p.state = 'alive'; p.hp = 100; p.carry = -1; p.ctrl.teleport([p.start[0], g.world.heightAt(...p.start) + 0.4, p.start[1]]); } }
        if (p.bot && p.state === 'alive') this.botStep(p, dt);
        if (p.carry >= 0 && p.state === 'alive' && Math.hypot(p.pos.x - TRUCK_AT[0], p.pos.z - TRUCK_AT[1]) < 7) this.bank(p);
        if (!p.isLocal && p.ctrl && !p.bot) { /* remote players are placed from their `me` messages */ }
      }
      // fire burns cases
      for (const c of this.cases) if (!c.taken && !c.banked && !c.burnt && g.fire.burningAt(c.x, c.z)) { c.burnt = true; if (c.obj) c.obj.object.visible = false; this.wq.push(['x', c.i]); }
      // friendly fire from fire: players standing in flames handled by body.burn for local only
      if (this.clockMs() > this.session.limitMs - 100 && this.session.isHost) { /* the lifecycle finishes on time-up */ }
    }
    if (this.local && this.local.state === 'alive') this.useLogic(g, dt);
  }
  bankLocal() { const p = this.local; if (this.session.isHost) this.bank(p); else { this.evq.push({ k: 'bank' }); const c = this.cases[p.carry]; if (c) { p.stones += c.stones; p.carry = -1; c.banked = true; } this.g.sfx('bank'); } }
  useLogic(g, dt) {
    const L = this.local, f = g.player.feet; let tgt = null;
    if (L.carry < 0 && this.playing()) for (const c of this.cases) if (!c.taken && !c.banked && !c.burnt && Math.hypot(c.x - f.x, c.z - f.z) < 2.6) tgt = { kind: 'case', c };
    for (const p of this.players) if (p !== L && p.state === 'down' && Math.hypot(p.pos.x - f.x, p.pos.z - f.z) < 2.6) tgt = { kind: 'revive', p };
    this.tgt = tgt;
    if (!tgt) { this.holdT = 0; return; }
    if (held(g.ctx.input, 'use')) { this.holdT = (this.holdT || 0) + dt; const need = tgt.kind === 'case' ? 1 : 3; if (this.holdT >= need) { this.holdT = 0; this.act(tgt); } } else this.holdT = 0;
  }
  act(t) {
    const L = this.local;
    if (t.kind === 'case') { if (this.session.isHost) this.take(L, t.c); else { this.evq.push({ k: 'take', i: t.c.i }); L.carry = t.c.i; t.c.taken = true; if (t.c.obj) t.c.obj.object.visible = false; } }
    else if (t.kind === 'revive') { if (this.session.isHost) this.revive(t.p, L); else this.evq.push({ k: 'revive', id: t.p.id }); }
  }
  extraPrompts() { const t = this.tgt; if (!t) return []; return [{ action: 'use', verb: t.kind === 'case' ? 'TAKE THE CASE (HOLD)' : 'REVIVE (HOLD)', progress: Math.min(1, (this.holdT || 0) / (t.kind === 'case' ? 1 : 3)) }]; }
  // ---- bots (hired guns) ----
  botStep(p, dt) {
    const g = this.g; let goal = null;
    if (p.carry >= 0) goal = TRUCK_AT; else { let best = null, bd = 1e9; for (const c of this.cases) if (!c.taken && !c.banked && !c.burnt) { const d = Math.hypot(c.x - p.pos.x, c.z - p.pos.z); if (d < bd) { bd = d; best = c; } } if (best) { goal = [best.x, best.z]; if (bd < 2.2) this.take(p, best); } }
    let tgt = null, td = 45; for (const s of g.soldierSys.list) { if (!s.alive) continue; const d = Math.hypot(s.pos.x - p.pos.x, s.pos.z - p.pos.z); if (d < td) { td = d; tgt = s; } }
    const mv = new V3(); if (goal) { const dx = goal[0] - p.pos.x, dz = goal[1] - p.pos.z, d = Math.hypot(dx, dz) || 1; if (d > 1.5) mv.set(dx / d, 0, dz / d); }
    p.ctrl.speed = p.carry >= 0 ? 4.6 : 5.4; p.ctrl.setInput(mv, false, false); p.ctrl.fixedUpdate(dt); p.speedNow = Math.hypot(p.ctrl.velocity.x, p.ctrl.velocity.z);
    if (mv.lengthSq() > 0) p.yaw = Math.atan2(-mv.x, -mv.z);
    p.shotT = (p.shotT || 0) - dt;
    if (tgt && p.shotT <= 0) { p.shotT = 0.3; const o = new V3(p.pos.x, p.pos.y + 1.5, p.pos.z), to = new V3(tgt.pos.x, tgt.pos.y + 1.2, tgt.pos.z), dir = to.clone().sub(o).normalize(); p.yaw = Math.atan2(-dir.x, -dir.z); const hit = g.ctx.physics.castRay(o, dir, td + 1, [], p.ctrl.body); g.sfx('shot_tractor', { pos: p.pos }); g.noise(p.pos, 110, 'buddy'); if ((!hit || hit.collider === tgt.collider) && g.ctx.random.chance(0.4)) g.damageActor(tgt, 9, 'torso', { by: 'bot', from: p.pos }); }
  }
  // ---- network ----
  netSend() {
    const S = this.session, g = this.g; if (this.ended || g.life?.ended) return;
    if (S.kind === 'solo') return;
    this.tick10 = (this.tick10 || 0) + 1; const slow = this.tick10 % 3 === 0;
    if (this.local && !S.isHost) { const L = this.local; S.send({ k: 'me', n: ++this.sent, x: +L.pos.x.toFixed(2), z: +L.pos.z.toFixed(2), y: +L.yaw.toFixed(2), hp: Math.round(L.hp), st: L.state }, { to: S.host, reliable: false }); if (slow && this.evq.length) { S.send({ k: 'ev', list: this.evq.splice(0, 20) }, { to: S.host }); } }
    if (S.isHost) {
      if (this.local) { const L = this.local; L.pos.copy(g.player.feet); }
      const sol = g.soldierSys.list.filter((s) => s.alive).slice(0, 30).map((s) => [s.netId || 0, Math.round(s.pos.x * 10) / 10, Math.round(s.pos.z * 10) / 10, +s.yaw.toFixed(1), s.state === 'alert' ? 2 : s.state === 'idle' ? 0 : 1, Math.round(s.hp)]);
      const pl = this.players.map((p) => [p.id, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1), +p.yaw.toFixed(1), Math.round(p.hp), p.state === 'alive' ? 0 : 1, p.carry, p.stones]);
      S.send({ k: 's', at: S.time(), t: this.clock, p: pl, so: sol, c: this.cases.map((c) => (c.banked ? 2 : c.burnt ? 3 : c.taken ? 1 : 0)) }, { reliable: false });
      if (slow && this.wq.length) S.send({ k: 'w', list: this.wq.splice(0, 40) });
    }
  }
  onMessage(d, from) {
    const S = this.session, g = this.g; if (!d || this.ended) return;
    if (S.isHost) {
      if (d.k === 'me') { const p = this.players.find((q) => q.id === from); if (p && (!p.seq || d.n > p.seq)) { p.seq = d.n; if (p.ctrl) { p.ctrl.teleport([d.x, g.world.heightAt(d.x, d.z) + 0.4, d.z]); } p.yaw = d.y; p.hp = Math.min(p.hp, d.hp); if (d.st === 'alive' && p.state === 'alive') p.hp = d.hp; } }
      else if (d.k === 'ev') for (const e of d.list) this.hostEvent(from, e);
    } else if (d.k === 's') { if (!this.snapAt || d.at > this.snapAt) { this.snapAt = d.at; this.snap = d; this.applySnapshot(d); } }
    else if (d.k === 'w') for (const e of d.list) this.worldEvent(e);
  }
  hostEvent(from, e) {
    const p = this.players.find((q) => q.id === from); if (!p) return;
    if (e.k === 'take') this.take(p, this.cases[e.i]); else if (e.k === 'bank') this.bank(p); else if (e.k === 'revive') { const t = this.players.find((q) => q.id === e.id); if (t && t.state === 'down') this.revive(t, p); }
  }
  worldEvent(e) {
    const g = this.g, L = this.local;
    if (e[0] === 'i') g.fireSys.grid.ignite(e[1], e[2], 2); else if (e[0] === 'b') { const p = this.players.find((q) => q.id === e[1]); const c = this.cases[e[2]]; if (c) { c.banked = true; if (p && !p.isLocal) p.stones += c.stones; } g.sfx('bank'); }
    else if (e[0] === 't') { const c = this.cases[e[2]]; if (c) { c.taken = true; if (c.obj) c.obj.object.visible = false; } } else if (e[0] === 'x') { const c = this.cases[e[1]]; if (c) { c.burnt = true; if (c.obj) c.obj.object.visible = false; } }
    else if (e[0] === 'd') { const p = this.players.find((q) => q.id === e[1]); if (p) { p.state = 'down'; if (p === L) { L.downT = 25; L.downs++; g.say('DOWN. BLEEDING.', 'player', 2); } } } else if (e[0] === 'r') { const p = this.players.find((q) => q.id === e[1]); if (p) { p.state = 'alive'; if (p === L) { g.body.hp = 35; L.hp = 35; } } }
  }
  applySnapshot(d) {
    const g = this.g, L = this.local;
    for (const q of d.p) { const p = this.players.find((x) => x.id === q[0]); if (!p) continue; if (p === L) { p.stones = q[7]; if (q[5] === 1 && p.state === 'alive') { p.state = 'down'; p.downT = 25; } p.hp = Math.min(p.hp, q[4]); if (q[4] < g.body.hp) g.body.hp = q[4]; p.carry = q[6]; continue; } p.target = [q[1], q[2], q[3]]; p.hp = q[4]; p.state = q[5] ? 'down' : 'alive'; p.carry = q[6]; p.stones = q[7]; }
    d.c.forEach((s, i) => { const c = this.cases[i]; if (!c) return; if (s === 2) c.banked = true; if (s === 3) c.burnt = true; c.taken = s >= 1 && s !== 0; if (c.obj) c.obj.object.visible = s === 0; });
    // soldier puppets
    const seen = new Set();
    for (const s of d.so) { seen.add(s[0]); let pp = this.puppets.get(s[0]); if (!pp) { pp = g.spawnSoldier({ faction: s[0] % 2 ? 'concord' : 'harvest', role: 'rifle', at: [s[1], s[2]], yaw: s[3], puppet: true }); this.puppets.set(s[0], pp); } pp.target = [s[1], s[2], s[3]]; pp.state = s[4] === 2 ? 'alert' : s[4] === 1 ? 'searching' : 'idle'; pp.hp = s[5]; }
    for (const [id, pp] of this.puppets) if (!seen.has(id)) { g.soldierSys.remove(pp); this.puppets.delete(id); }
  }
  // ---- frame ----
  frame(g, dt) {
    for (const [, pp] of this.puppets) if (pp.target) { const k = Math.min(1, dt / 0.15); pp.pos.x += (pp.target[0] - pp.pos.x) * k; pp.pos.z += (pp.target[1] - pp.pos.z) * k; pp.pos.y = g.world.heightAt(pp.pos.x, pp.pos.z); pp.yaw = pp.target[2]; pp.view?.object.position.copy(pp.pos); if (pp.view) pp.view.object.rotation.y = pp.yaw + Math.PI; pp.view?.update(dt); }
    for (const p of this.players) { if (p.isLocal) continue; if (p.target && !this.session.isHost) { const k = Math.min(1, dt / 0.15); p.pos.x += (p.target[0] - p.pos.x) * k; p.pos.z += (p.target[1] - p.pos.z) * k; p.pos.y = g.world.heightAt(p.pos.x, p.pos.z); p.yaw = p.target[2]; } if (p.view) { p.view.object.position.copy(p.pos); p.view.object.rotation.y = p.yaw + Math.PI; p.view.layered(p.speedNow > 3.5 ? 'Run' : p.speedNow > 0.4 ? 'Walk' : 'Idle', 'AimIdle'); if (p.state === 'down') p.view.full('WoundedSit', true); p.view.update(dt); } }
    if (this.local) g.hudExtra = (hud) => this.hud(hud);
    if (!this.started && g.device === 'pad' && this.session.kind === 'hub') { const pad = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (pad) { if (pad.buttons[0]?.pressed && !this.p0) this.session.answer('ready'); if (pad.buttons[3]?.pressed && !this.p3) this.session.answer('more'); this.p0 = pad.buttons[0]?.pressed; this.p3 = pad.buttons[3]?.pressed; } }
  }
  card(hud) {
    const g = this.g, S = this.session, W = hud.width, H = hud.height, d = this.cardData || {};
    hud.rect(0, 0, W, H, 0x0d1020);
    const t = 'FAR PRY 2'; hud.text(Math.round((W - hud.measure(t, 4).width) / 2), 24, t, { scale: 4, color: 'orange', shadow: 'red' });
    hud.text(0, 70, 'CASH RUN', { anchor: 'top', scale: 2, color: 'sand' });
    S.players.forEach((p, i) => { const y = 100 + i * 16; hud.rect(W / 2 - 100, y, 12, 12, parseInt(p.color.slice(1), 16)); hud.text(W / 2 - 82, y + 3, `${p.name.slice(0, 12)}${p.id === S.me ? ' (YOU)' : ''}`, { color: 'white' }); if ((d.ready || []).includes(p.id)) hud.text(W / 2 + 70, y + 3, 'READY', { color: 'lime' }); });
    hud.text(0, 176, 'CARRY THE MOST DIAMOND CASES OUT OF THE BURNING MINE', { anchor: 'top', color: 'sand' });
    hud.text(0, 188, 'TAKE A CASE, WALK IT TO THE TRUCK. LIGHT THE GRASS. REVIVE FRIENDS OR ROB THEM.', { anchor: 'top', color: 'mist' });
    const secs = d.left != null ? Math.ceil(d.left / 1000) : null; hud.text(0, 204, secs != null ? `STARTS IN ${secs}` : d.paused ? 'WAITING FOR MORE TIME' : 'GET READY', { anchor: 'top', scale: 2, color: 'white' });
    let x = 40; for (const [a, l] of [['@PadCross', 'READY'], ['@Enter', 'READY'], ['@PadTriangle', 'MORE TIME'], ['@KeyM', 'MORE TIME']]) { const dev = a.startsWith('@Pad') ? 'pad' : 'kbm'; if (dev !== g.device) continue; x += drawPrompt(hud, x, H - 24, a, l, g.device, g.glyphSet) + 16; }
    hud.text(0, H - 44, 'MOVE STICK OR WASD   FIRE R2 OR MOUSE   USE SQUARE OR E', { anchor: 'top', color: 'mist' });
  }
  hud(hud) {
    if (!this.started && this.session.kind === 'hub') return this.card(hud);
    const g = this.g, S = this.session, W = hud.width; const t = Math.max(0, Math.ceil((S.limitMs - Math.max(0, this.clockMs())) / 1000));
    if (this.clockMs() < 0 && this.started) { const n = Math.ceil(-this.clockMs() / 1000); hud.text(0, 90, String(n), { anchor: 'top', scale: 6, color: 'orange' }); }
    hud.text(0, 4, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, { anchor: 'top', scale: 2, color: 'white' });
    this.players.forEach((p, i) => { const y = 24 + i * 11; hud.rect(W - 120, y, 8, 8, parseInt(p.color.slice(1), 16)); hud.text(W - 108, y + 1, `${p.name.slice(0, 8)} ${p.stones}${p.state === 'down' ? ' DOWN' : ''}${p.carry >= 0 ? ' *' : ''}`, { color: 'white' }); });
    if (this.local?.state === 'down') hud.text(0, 120, `BLEEDING ${Math.ceil(this.local.downT)}`, { anchor: 'top', scale: 2, color: 'red' });
  }
  // ---- results ----
  results() {
    const ps = this.players.filter((p) => !p.left || true); const sorted = ps.slice().sort((a, b) => b.stones - a.stones); const standings = []; let last = null;
    for (const p of sorted) { if (last !== null && p.stones === last) standings[standings.length - 1].push(p.id); else standings.push([p.id]); last = p.stones; }
    const scores = {}, stats = {}; for (const p of ps) { scores[p.id] = p.stones; stats[p.id] = { Stones: p.stones, Downs: p.downs, Revives: p.revives, Kills: p.kills }; }
    const best = (k) => ps.slice().sort((a, b) => b[k] - a[k])[0];
    const awards = []; const r = best('revives'); if (r && r.revives > 0) awards.push({ id: r.id, title: 'Last Friend', detail: `${r.revives} revives` }); const s = best('stones'); if (s && s.stones > 0) awards.push({ id: s.id, title: 'Paid in Full', detail: `${s.stones} stones` }); const l = best('lit'); if (l && l.lit > 0) awards.push({ id: l.id, title: 'Arsonist', detail: `${l.lit} cells lit` });
    return { standings, scores, stats, awards: awards.slice(0, 3) };
  }
  onEnd() { this.ended = true; this.dispose(); }
  showResults(res) { const g = this.g; if (this.session.kind === 'hub') return; g.ended = true; g.ui.stack.length = 0; g.ui.open('roundend', res); }
  state() { return { round: { clock: Math.round(this.clockMs()), stones: this.players.map((p) => p.stones), states: this.players.map((p) => p.state), carry: this.players.map((p) => p.carry), banked: this.cases.filter((c) => c.banked).length, burnt: this.cases.filter((c) => c.burnt).length } }; }
}
