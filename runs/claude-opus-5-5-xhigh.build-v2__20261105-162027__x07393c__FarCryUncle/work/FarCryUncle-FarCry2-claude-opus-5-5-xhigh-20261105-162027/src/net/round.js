// Cash Run: four mercs in one burning valley, friends until the stones are counted. The host runs the world; each copy moves its own player.
import { THREE, CharacterController, RAPIER, buildModel, setLookLayer } from '../../pixel-engine.js';
import { GAME_TITLE } from '../content/title.js';
import { SITES, POSTS } from '../content/sites.js';
import { WEAPONS } from '../content/weapons.js';
import { makePerson } from '../actors/rig.js';
import { MODELS } from '../art/models.js';
import { Soldier } from '../actors/soldier.js';
import { S as FS, FN } from '../world/fire.js';
import { clamp, lerp, wrapAngle } from '../core/rng.js';
import { drawGlyph, glyphWidth } from '../ui/glyphs.js';
import { wrap } from '../ui/pixfont.js';
const { Vector3 } = THREE;
const CUT = SITES['the-cut'].at, P5 = POSTS.p5.at, RANGER = SITES['ranger-post'].at;
export const CASE_SPOTS = [[CUT[0] + 60, CUT[1] - 26], [CUT[0] - 52, CUT[1] + 30], [CUT[0] + 22, CUT[1] + 60], [P5[0] + 8, P5[1] - 7], [RANGER[0] - 10, RANGER[1] - 9], [RANGER[0] + 14, RANGER[1] + 11]];
export const CASE_STONES = [5, 4, 3, 4, 3, 5];
export const TRUCK_AT = [150, -204];
export const ROAD_ENDS = [[60, -128], [320, -205], [60, -402], [250, -334]];
const BANK_R = 6, REVIVE_T = 3, BLEED = 25, RESPAWN = 15, ROUND_MS = 360000;
const COLOR_NAMES = { '#e8443a': 'red', '#3b82f6': 'blue', '#22c55e': 'green', '#f5b700': 'sand' };
const clean = (s) => String(s).toUpperCase().replace(/[^A-Z0-9 .,:;!?'"\-+=/()%#&*_]/g, '').slice(0, 12) || 'MERC';
const round2 = (v) => Math.round(v * 10) / 10;
export class Merc {
  hp = 100; down = false; downT = 0; respawnT = 0; carrying = -1; stones = 0; downs = 0; revives = 0; kills = 0; cells = 0; x = 0; y = 0; z = 0; yaw = 0; pitch = 0; weapon = 'tractor'; stance = 0; left = false; lastSeq = -1; syrettes = 2; speed = 0;
  buf = [];
  constructor(round, p) { this.round = round; this.id = p.id; this.name = clean(p.name); this.color = p.color; this.ai = !!p.ai; }
  targetInfo() { const m = this; const eye = () => (this.local ? this.round.game.player.feet.y : m.y); return { kind: 'merc', ref: m, x: m.x, y: m.y, z: m.z, eyeY: m.y + 1.4, fast: m.speed > 5, refresh() { this.x = m.x; this.y = m.y; this.z = m.z; this.eyeY = m.y + 1.4; this.fast = m.speed > 5; } }; }
}
export class Round {
  mercs = []; cases = []; phase = 'card'; card = null; over = false; ended = false; netT = 0; seq = 0; evQ = []; wI = []; wB = []; wX = []; wSnd = []; wDmg = []; lastSnap = -Infinity; puppets = new Map(); snapA = null; snapB = null; reviveT = 0; downView = 0; finished = false; carrying = false; lit = 0; beepT = 0;
  constructor(game, session) {
    this.game = game; this.s = session;
    this.isHost = session.isHost; this.isClient = !session.isHost; this.server = !!session.server;
    if (session.kind === 'hub') this.limit = session.limitMs || ROUND_MS; else this.limit = ROUND_MS;
  }
  get local() { return this.mercs.find((m) => m.local) ?? null; }
  liveMercs() { return this.mercs.filter((m) => !m.down && !m.left && m.hp > 0 && m.respawnT <= 0); }
  build(ctx) {
    const g = this.game;
    this.rng = this.s.rng('round');
    // Only the valley around the Cut is live.
    for (const [k, sq] of g.actors.squads) { sq.disabled = !(k === 'the-cut' || k === 'p5' || k === 'ranger-post'); if (!sq.disabled && this.isHost) sq.forceLive = true; }
    if (this.isClient) for (const sq of g.actors.squads.values()) sq.disabled = true;
    g.story.war = false; g.story.truce = false; g.story.pass = null;
    g.story.noPatrols = true; g.story.feverRunning = false;
    g.wind.dir = this.rng() * 6.28; g.wind.speed = 3 + this.rng() * 3;
    g.clock.set(9 + this.rng() * 8);
    for (const p of this.s.players) this.addMerc(ctx, p);
    this.cases = CASE_SPOTS.map(([x, z], id) => ({ id, x, z, stones: CASE_STONES[id], state: 'free', by: -1, burn: 0 }));
    if (g.views) {
      this.caseObjs = this.cases.map((c) => { const b = buildModel('stone-case', { catalog: MODELS }); b.object.position.set(c.x, g.world.heightAt(c.x, c.z) + 0.05, c.z); setLookLayer(b.object, 'actors'); ctx.scene.add(b.object); return b.object; });
      const t = buildModel('truck', { catalog: MODELS, palette: { paint: 'green', hood: 'teal', roof: 'teal' } });
      t.object.position.set(TRUCK_AT[0], g.world.heightAt(TRUCK_AT[0], TRUCK_AT[1]) + 1.05, TRUCK_AT[1]); t.object.rotation.y = 1.55;
      setLookLayer(t.object, 'actors'); ctx.scene.add(t.object);
      this.truckLight = ctx.lights.request({ position: [TRUCK_AT[0], t.object.position.y + 3, TRUCK_AT[1]], color: 0xa7f070, intensity: 8, radius: 14, name: 'bank' });
    }
    ctx.physics.addStaticBox({ position: [TRUCK_AT[0], g.world.heightAt(TRUCK_AT[0], TRUCK_AT[1]) + 1.2, TRUCK_AT[1]], halfExtents: [1.2, 1.2, 3.2], rotationY: 1.55 });
    this.buildUsables();
    this.hook();
    if (g.hasPlayer) this.placeLocal();
    if (!g.hasPlayer || this.isHost) g.actors.updateBubble(ctx);
  }
  addMerc(ctx, p) {
    const g = this.game, m = new Merc(this, p);
    const [x, z] = ROAD_ENDS[p.id % 4];
    m.x = x; m.z = z; m.y = g.world.heightAt(x, z); m.yaw = Math.atan2(CUT[0] - x, CUT[1] - z);
    m.local = g.hasPlayer && p.id === this.s.me;
    this.mercs.push(m);
    if (m.local) { g.hitMap.set(g.player.cc.collider.handle, { kind: 'player', ref: g.player }); return m; }
    if (this.isHost) {
      if (m.ai) {
        m.cc = new CharacterController(ctx.physics, { position: [x, m.y + 0.1, z], radius: 0.32, halfHeight: 0.56, speed: 5.2, jumpSpeed: 0, gravity: -24 });
        ctx.physics.tag(m.cc.collider, 'npc');
        g.hitMap.set(m.cc.collider.handle, { kind: 'merc', ref: m });
      } else {
        const body = ctx.physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, m.y + 0.9, z));
        const col = ctx.physics.world.createCollider(RAPIER.ColliderDesc.capsule(0.56, 0.32), body);
        m.body = body;
        g.hitMap.set(col.handle, { kind: 'merc', ref: m });
      }
    }
    if (g.views) {
      const col = COLOR_NAMES[p.color] ?? 'red';
      const v = makePerson('soldier-b', { cloth: col, dark: 'night', hat: col, strap: 'white', skin: ['plum', 'orange', 'sand', 'red'][p.id % 4] });
      const gun = buildModel('npc-rifle', { catalog: MODELS });
      setLookLayer(gun.object, 'actors');
      gun.object.rotation.x = Math.PI / 2; gun.object.position.set(0, -0.08, 0.04);
      v.object.getObjectByName('HandR').add(gun.object);
      ctx.scene.add(v.object);
      v.anim.set('Idle', 'AimIdle');
      m.view = v;
    }
    return m;
  }
  placeLocal() {
    const g = this.game, m = this.local; if (!m) return;
    g.player.teleport(m.x, m.z);
    g.player.setYaw(Math.atan2(-(CUT[0] - m.x), -(CUT[1] - m.z)), 0);
    const w = g.weapons;
    w.resetLoadout();
    w.give('flare', 100, false);
    w.give('tractor', 70, true);
    w.bottles = 2;
    g.body.syrettes = 2; g.body.maxSyrettes = 2; g.body.hp = 100; g.body.dead = false;
    g.story.flags.arrived = false;
    g.vm.showGun('tractor', false);
  }
  buildUsables() {
    const g = this.game, I = g.interact;
    if (!g.hasPlayer) return;
    this.cases.forEach((c) => {
      I.add({ tag: 'round', x: c.x, y: g.world.heightAt(c.x, c.z) + 0.4, z: c.z, r: 2.6, wide: true, when: () => c.state === 'free' && !this.localDown_ && !this.carrying && this.playing(), liveAt: () => [c.x, g.world.heightAt(c.x, c.z) + 0.4, c.z], verb: () => `TAKE THE CASE (${c.stones})`, onUse: () => this.request(['take', c.id]) });
    });
    I.add({ tag: 'round', x: TRUCK_AT[0], y: g.world.heightAt(TRUCK_AT[0], TRUCK_AT[1]) + 1.2, z: TRUCK_AT[1], r: BANK_R, wide: true, when: () => this.carrying && !this.localDown_ && this.playing(), verb: () => 'BANK THE STONES', onUse: () => this.request(['bank']) });
    this.mercs.filter((m) => !m.local).forEach((m) => {
      I.add({ tag: 'round', x: m.x, y: m.y, z: m.z, r: 2.8, wide: true, hold: REVIVE_T, liveAt: () => [m.x, m.y + 0.6, m.z], when: () => m.down && !this.localDown_ && this.playing(), verb: () => `BRING UP ${m.name}`, onUse: () => this.request(['revive', m.id]) });
    });
  }
  playing() { return this.phase === 'play'; }
  hook() {
    const s = this.s, g = this.game;
    this.offs = [
      s.on('card', (c) => { this.card = c; }),
      s.on('start', () => { this.phase = 'countdown'; g.events.emit('round-start'); }),
      s.on('message', (d, from) => this.onMessage(d, from)),
      s.on('leave', ({ id }) => this.onLeave(id)),
      s.on('time-up', () => { if (this.isHost) this.finish('time'); }),
      s.on('end', (e) => this.onEnd(e)),
    ];
    if (typeof window !== 'undefined' && !this.server && s.kind === 'hub') {
      this.keydown = (e) => {
        if (this.phase !== 'card') return;
        if (e.code === 'Enter') s.answer('ready');
        else if (e.code === 'KeyM') s.answer('more');
      };
      window.addEventListener('keydown', this.keydown);
    }
    // Sends are driven from setInterval, not the render loop: on a software-rendered copy update runs about twice a second.
    if (s.kind !== 'solo' && typeof setInterval !== 'undefined') this.timer = setInterval(() => this.netTick(), 25);
  }
  now() { const t = this.s.time(); return t === -Infinity ? -1e9 : t; }
  request(ev) { if (this.isHost) this.handleEvent(this.local, ev); else this.evQ.push(ev); }
  // ---- the network, every 25 ms ----
  netTick() {
    if (this.ended) return;
    const t = (typeof performance !== 'undefined' ? performance.now() : 0);
    const s = this.s, g = this.game;
    if (s.kind === 'link') s.advance?.();
    if (this.isHost) {
      if (this.netLastS === undefined || t - this.netLastS >= 100) { this.netLastS = t; if (this.now() > -1e8) this.sendSnapshot(); else s.send({ t: 'hb' }, { reliable: false }); }
      if (this.netLastW === undefined || t - this.netLastW >= 250) { this.netLastW = t; this.sendWorld(); }
    } else {
      if (g.hasPlayer && (this.netLastM === undefined || t - this.netLastM >= 84)) {
        this.netLastM = t;
        const f = g.player.feet, m = this.local;
        if (f) s.send({ t: 'me', q: ++this.seq, x: round2(f.x), y: round2(f.y), z: round2(f.z), yw: round2(g.player.yaw), p: round2(g.player.pitch), st: g.player.stance === 'crouch' ? 1 : 0, w: g.weapons.gun?.id ?? 'cane', sp: round2(g.player.speedNow) }, { to: s.host, reliable: false });
      }
      if (this.evQ.length && (this.netLastE === undefined || t - this.netLastE >= 200)) { this.netLastE = t; s.send({ t: 'ev', e: this.evQ.splice(0, 40) }, { to: s.host, reliable: true }); }
    }
  }
  sendSnapshot() {
    const g = this.game;
    const so = [];
    for (const x of g.actors.soldiers) { if (so.length >= 26) break; if (!x.active) continue; const st = x.dead ? 3 : x.burning > 0 ? 4 : x.state === 'alert' ? 2 : x.moveWanted > 0 ? 1 : 0; so.push([x.id, Math.round(x.x * 2) / 2, Math.round(x.z * 2) / 2, Math.round(x.yaw * 10), st, Math.max(0, Math.round(x.hp))]); }
    const msg = { t: 's', at: Math.round(this.now()), p: this.mercs.filter((m) => !m.left).map((m) => [m.id, round2(m.x), round2(m.y), round2(m.z), round2(m.yaw), Math.round(m.hp), (m.down ? 1 : 0) | (m.respawnT > 0 ? 2 : 0), m.carrying, m.stones]), so, c: this.cases.map((c) => [c.id, c.state === 'free' ? 0 : c.state === 'carried' ? 1 : c.state === 'banked' ? 2 : 3, Math.round(c.x), Math.round(c.z)]) };
    this.s.send(msg, { reliable: false });
  }
  sendWorld() {
    if (!this.wI.length && !this.wB.length && !this.wX.length && !this.wSnd.length && !this.wDmg.length) return;
    const msg = { t: 'w', i: this.wI.splice(0, 300), b: this.wB.splice(0, 300), x: this.wX.splice(0, 8), n: this.wSnd.splice(0, 8), d: this.wDmg.splice(0, 8) };
    this.s.send(msg, { reliable: true });
  }
  onMessage(d, from) {
    if (!d || this.ended) return;
    if (this.isHost) {
      const m = this.mercs.find((x) => x.id === from);
      if (!m) return;
      if (d.t === 'me') { if (d.q <= m.lastSeq) return; m.lastSeq = d.q; m.x = d.x; m.y = d.y; m.z = d.z; m.yaw = d.yw + Math.PI; m.pitch = d.p; m.stance = d.st; m.weapon = d.w; m.speed = d.sp; m.body?.setNextKinematicTranslation({ x: d.x, y: d.y + 0.9, z: d.z }); m.buf.push({ at: this.now(), x: d.x, y: d.y, z: d.z, yaw: d.yw + Math.PI }); if (m.buf.length > 6) m.buf.shift(); }
      else if (d.t === 'ev') for (const e of d.e) this.handleEvent(m, e);
    } else {
      if (d.t === 's') this.onSnapshot(d);
      else if (d.t === 'w') this.onWorld(d);
    }
  }
  /** On the host: what a player did. */
  handleEvent(m, e) {
    const g = this.game;
    if (!m || m.left) return;
    switch (e[0]) {
      case 'shot': {
        if (m.down) break;
        const [, ox, oy, oz, dx, dy, dz, wid] = e;
        const def = WEAPONS[wid] ?? WEAPONS.tractor;
        g.damage.bullet(ox, oy, oz, dx, dy, dz, def.range, def.damage, m.cc ? m : m, { seat: m.id, silent: false });
        this.noiseFrom(ox, oz, def.hear);
        break;
      }
      case 'pr': { if (!m.down) g.projectiles.spawn(e[1], e[2], e[3], e[4], e[5], e[6], e[7], m, { seat: m.id }); break; }
      case 'ignite': { const n = g.fire.ignite(e[1], e[2], e[3], 'player'); m.cells += n; break; }
      case 'blast': g.damage.blast(e[1], e[2], e[3], 7, 220, m, { fire: 6, seat: m.id }); break;
      case 'take': {
        const c = this.cases[e[1]];
        if (c && c.state === 'free' && m.carrying < 0 && !m.down && Math.hypot(c.x - m.x, c.z - m.z) < 5) { c.state = 'carried'; c.by = m.id; m.carrying = c.id; this.wSnd.push(['ui-stone', c.x, c.z]); g.events.emit('case-taken', m.id, c.id); this.syncLocalCarry(); }
        break;
      }
      case 'bank': {
        const c = this.cases[m.carrying];
        if (c && Math.hypot(TRUCK_AT[0] - m.x, TRUCK_AT[1] - m.z) < BANK_R + 3) { c.state = 'banked'; m.stones += c.stones; m.carrying = -1; this.wSnd.push(['ui-stone', TRUCK_AT[0], TRUCK_AT[1]]); g.events.emit('banked', m.id, c.stones); this.syncLocalCarry(); this.checkAllDone(); }
        break;
      }
      case 'revive': {
        const o = this.mercs.find((x) => x.id === e[1]);
        if (o && o.down && !m.down && Math.hypot(o.x - m.x, o.z - m.z) < 4.5) { this.reviveMerc(o, m); }
        break;
      }
      case 'heal': if (m.syrettes > 0 && !m.down) { m.syrettes--; m.hp = Math.min(100, m.hp + 40); } break;
      case 'patched': if (!m.down) m.hp = Math.max(m.hp, 40); break;
      default: break;
    }
  }
  noiseFrom(x, z, r) { this.game.actors.heardGunshot(x, z, r); }
  reviveMerc(o, by) {
    o.down = false; o.hp = 40; o.downT = 0;
    if (by) by.revives++;
    if (o.local) { this.game.body.hp = 40; this.setLocalDown(false); }
    this.game.events.emit('revived', o.id, by?.id);
  }
  syncLocalCarry() { const m = this.local; if (!m) return; this.carrying = m.carrying >= 0; this.game.player.carrying = this.carrying ? 'case' : null; }
  setLocalDown(v) { const g = this.game; this.localDown_ = v; g.player.frozen = v; if (v) g.map.raise(false); g.vm.setVisible(!v); }
  checkAllDone() { if (this.cases.every((c) => c.state === 'banked' || c.state === 'burned') && this.isHost) this.finish('cases'); }
  // ---- host-side damage for mercs ----
  hitMerc(m, damage, opts, who) {
    if (this.isClient || m.down || m.left || m.respawnT > 0) return;
    m.hp -= damage;
    if (m.local) { this.game.body.hp = m.hp; }
    const seat = opts?.seat ?? who?.id;
    if (m.hp <= 0) this.downMerc(m, seat);
  }
  /** Called by Body.down for the local player on the host. */
  localDown() {
    const m = this.local;
    if (!m) return;
    if (this.isHost) { m.hp = 0; this.downMerc(m); }
  }
  downMerc(m, seat) {
    const g = this.game;
    if (m.down) return;
    m.down = true; m.downT = BLEED; m.hp = 0; m.downs++;
    // Drop the case. Anyone can take it.
    if (m.carrying >= 0) { const c = this.cases[m.carrying]; c.state = 'free'; c.by = -1; c.x = m.x; c.z = m.z; m.carrying = -1; if (m.local) this.syncLocalCarry(); }
    if (m.local) this.setLocalDown(true);
    g.events.emit('merc-down', m.id, seat);
    if (seat != null) { const k = this.mercs.find((x) => x.id === seat); if (k && k !== m) k.kills++; }
  }
  onSoldierHurt(s, a, who, opts) {
    if (s.hp - 0 <= 0) { const seat = opts?.seat ?? (who === 'player' ? this.s.me : who?.id); const k = this.mercs.find((m) => m.id === seat); if (k) k.kills++; }
  }
  // ---- fixed step ----
  fixedUpdate(ctx, dt) {
    const g = this.game, s = this.s;
    if (s.kind === 'solo') s.advance(this.phase === 'card' ? 0 : dt * 1000);
    const t = this.now();
    if (this.phase === 'countdown' && t >= 0) { this.phase = 'play'; g.events.emit('round-play'); }
    if (this.phase === 'card' && s.kind === 'solo') { s.advance(0); }
    if (!this.isHost) return;
    if (this.phase === 'over') return;
    // Local merc mirrors the real player.
    const lm = this.local;
    if (lm && g.player.cc) {
      const f = g.player.feet;
      lm.x = f.x; lm.y = f.y; lm.z = f.z; lm.yaw = g.player.yaw + Math.PI; lm.speed = g.player.speedNow;
      if (lm.respawnT <= 0 && !lm.down) lm.hp = g.body.hp;
    }
    for (const m of this.mercs) {
      if (m.left) continue;
      if (m.ai) this.stepAI(ctx, m, dt);
      // Bleeding out, then back at your road end.
      if (m.down) {
        m.downT -= dt;
        if (m.downT <= 0) { m.down = false; m.respawnT = RESPAWN; if (m.local) { g.body.hp = 0; } g.events.emit('merc-out', m.id); }
      } else if (m.respawnT > 0) {
        m.respawnT -= dt;
        if (m.respawnT <= 0) this.respawn(m);
      } else if (!m.local && g.fire.isBurning(m.x, m.z)) { this.hitMerc(m, 8 * dt, {}, 'fire'); }
    }
    // Cases burn when left in fire too long.
    for (const c of this.cases) {
      if (c.state !== 'free') continue;
      if (g.fire.isBurning(c.x, c.z)) { c.burn += dt; if (c.burn > 12) { c.state = 'burned'; g.events.emit('case-burned', c.id); this.checkAllDone(); } }
    }
  }
  respawn(m) {
    const g = this.game, [x, z] = ROAD_ENDS[m.id % 4];
    m.x = x; m.z = z; m.y = g.world.heightAt(x, z); m.hp = 100; m.down = false; m.respawnT = 0;
    if (m.local) { g.player.teleport(x, z); g.body.hp = 100; g.body.burning = 0; this.setLocalDown(false); }
    m.cc?.teleport([x, m.y + 0.1, z]);
    m.body?.setNextKinematicTranslation({ x, y: m.y + 0.9, z });
  }
  /** The buddy brain, for hire: go to the nearest case, bank it, shoot what shoots you. */
  stepAI(ctx, m, dt) {
    const g = this.game;
    if (m.down || m.respawnT > 0) { m.speed = 0; return; }
    if (this.phase !== 'play') return;
    if (g.tick % 6 === (m.id % 6)) {
      m.aiGoal = null;
      if (m.carrying >= 0) m.aiGoal = { x: TRUCK_AT[0], z: TRUCK_AT[1] };
      else {
        let bd = 1e9;
        for (const c of this.cases) { if (c.state !== 'free') continue; const d = Math.hypot(c.x - m.x, c.z - m.z); if (d < bd) { bd = d; m.aiGoal = { x: c.x, z: c.z, caseId: c.id }; } }
      }
      m.aimAt = null; let ba = 55;
      for (const s of g.actors.soldiers) { if (!s.active || s.dead) continue; const d = Math.hypot(s.x - m.x, s.z - m.z); if (d < ba) { ba = d; m.aimAt = s; } }
      // Now and then it is a business decision.
      if (!m.aimAt) { for (const o of this.mercs) { if (o === m || o.down || o.left || o.carrying < 0) continue; const d = Math.hypot(o.x - m.x, o.z - m.z); if (d < 26) { m.aimAtMerc = o; } } } else m.aimAtMerc = null;
    }
    if (m.aiGoal) {
      const dx = m.aiGoal.x - m.x, dz = m.aiGoal.z - m.z, l = Math.hypot(dx, dz) || 1;
      if (l < 2.4) {
        if (m.carrying >= 0) this.handleEvent(m, ['bank']);
        else if (m.aiGoal.caseId != null) this.handleEvent(m, ['take', m.aiGoal.caseId]);
      }
      this._mv = this._mv ?? new Vector3();
      this._mv.set(dx / l, 0, dz / l);
      m.cc.speed = m.carrying >= 0 ? 4.4 : 5.2;
      m.cc.setInput(this._mv, false, false);
      m.yaw = Math.atan2(dx, dz); m.speed = m.cc.speed;
    } else { this._mv = this._mv ?? new Vector3(); this._mv.set(0, 0, 0); m.cc.setInput(this._mv, false, false); m.speed = 0; }
    m.cc.fixedUpdate(dt);
    const f = m.cc.feet; m.x = f.x; m.y = f.y; m.z = f.z;
    m.fireCool = (m.fireCool ?? 0) - dt;
    const tgt = m.aimAt ?? m.aimAtMerc;
    if (tgt && m.fireCool <= 0) {
      m.fireCool = 0.22 + this.rng() * 0.3;
      const tx = tgt.x, ty = (tgt.y ?? m.y) + 1.1, tz = tgt.z, dx = tx - m.x, dy = ty - (m.y + 1.4), dz = tz - m.z, l = Math.hypot(dx, dy, dz) || 1, e = 0.06;
      const hit = g.damage.bullet(m.x + (dx / l) * 0.6, m.y + 1.4, m.z + (dz / l) * 0.6, dx / l + (this.rng() - 0.5) * e, dy / l + (this.rng() - 0.5) * e, dz / l + (this.rng() - 0.5) * e, 90, 14, m, { seat: m.id });
      if (hit) g.fx.tracer(m.x, m.y + 1.4, m.z, hit.x, hit.y, hit.z);
      g.sfx.at('gun-tractor-far', m.x, m.z, { max: 200, volume: 0.8 });
      m.view?.anim.shot('FireRecoil');
    }
  }
  /** Fire events on the host become net lists. */
  fireEvent(kind, id) { if (kind === 'i') this.wI.push(id); else this.wB.push(id); }
  blastAt(x, y, z, r, damage, who, opts) {
    this.wX.push([Math.round(x), Math.round(y), Math.round(z), r]);
    const g = this.game;
    for (const m of this.mercs) {
      if (m.local || m.left || m.down) continue;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < r * 1.2) this.hitMerc(m, damage * clamp(1 - d / (r * 1.2), 0.1, 1) * 0.42, opts, who);
    }
  }
  // ---- client ----
  onSnapshot(d) {
    const g = this.game;
    if (d.at < this.lastSnap) return;
    this.lastSnap = d.at;
    for (const row of d.p) {
      const [id, x, y, z, yaw, hp, flags, carry, stones] = row;
      const m = this.mercs.find((q) => q.id === id);
      if (!m) continue;
      m.stones = stones; m.carrying = carry;
      const wasDown = m.down;
      m.down = !!(flags & 1); m.respawnT = (flags & 2) ? 1 : 0;
      if (m.local) {
        const was = g.body.hp;
        if (hp < was - 0.5) { g.body.hurtFlash = 1; g.body.lastHit = g.time; g.sfx.play('grunt', { volume: 0.5 }); g.rumble(0.5, 0.1); g.hudTouch('health'); }
        g.body.hp = hp;
        m.hp = hp;
        if (m.down && !this.localDown_) this.setLocalDown(true);
        if (!m.down && !(flags & 2) && this.localDown_) { this.setLocalDown(false); g.player.teleport(x, z); }
        if (flags & 2 && !this.wasOut) { this.wasOut = true; }
        if (!(flags & 2) && this.wasOut) { this.wasOut = false; const [rx, rz] = ROAD_ENDS[m.id % 4]; g.player.teleport(rx, rz); }
        this.syncLocalCarry();
        continue;
      }
      m.hp = hp;
      m.buf.push({ at: d.at, x, y, z, yaw });
      if (m.buf.length > 6) m.buf.shift();
    }
    for (const row of d.c) {
      const c = this.cases[row[0]];
      c.state = ['free', 'carried', 'banked', 'burned'][row[1]]; c.x = row[2]; c.z = row[3];
    }
    const seen = new Set();
    for (const [id, x, z, yawI, st, hp] of d.so) {
      seen.add(id);
      let p = this.puppets.get(id);
      if (!p) {
        p = new Soldier(g, id); p.puppet = true;
        p.spawn(g.ctx, { faction: id % 2 ? 'concord' : 'harvest', x, z, yaw: yawI / 10 });
        this.puppets.set(id, p);
        g.actors.soldiers.push(p);
        p.buf = [];
      }
      p.buf.push({ at: d.at, x, z, yaw: yawI / 10 });
      if (p.buf.length > 5) p.buf.shift();
      p.netState = st;
      if (st === 3 && !p.dead) { p.dead = true; if (p.view) { p.view.anim.stop(); p.view.anim.set('Death', 'Death'); } }
      else if (st !== 3 && p.dead) { p.dead = false; }
    }
  }
  onWorld(d) {
    const g = this.game, fire = g.fire;
    for (const id of d.i) { if (fire.state[id] === FS.FRESH) { fire.state[id] = FS.BURNING; fire.burning.push(id); fire.counts.burning++; const t = fire.tile(id); fire.clusters.set(t, (fire.clusters.get(t) || 0) + 1); g.grass.burnCell(id); g.fireView.onIgnite(id); } }
    for (const id of d.b) {
      if (fire.state[id] === FS.BURNING) { const i = fire.burning.indexOf(id); if (i >= 0) { fire.burning[i] = fire.burning[fire.burning.length - 1]; fire.burning.pop(); } fire.counts.burning--; const t = fire.tile(id), c = (fire.clusters.get(t) || 1) - 1; if (c <= 0) fire.clusters.delete(t); else fire.clusters.set(t, c); }
      if (fire.state[id] !== FS.BURNT) { fire.state[id] = FS.BURNT; fire.counts.burnt++; fire.burntList.push(id); fire.onBurnt?.(id); }
    }
    for (const [x, y, z, r] of d.x) g.fx.explosion(x, y, z, r);
    for (const [n, x, z] of d.n) g.sfx.at(n, x, z, { max: 120 });
  }
  onLeave(id) {
    const g = this.game, m = this.mercs.find((x) => x.id === id);
    if (m) {
      m.left = true;
      if (m.view) m.view.object.visible = false;
      if (m.carrying >= 0) { const c = this.cases[m.carrying]; c.state = 'free'; c.x = m.x; c.z = m.z; m.carrying = -1; }
    }
    if (this.isHost && this.mercs.every((x) => x.left || x.ai)) this.finish('empty');
  }
  /** The host calls finish directly from the time-up handler, within the grace period. */
  finish(why) {
    if (this.finished) return;
    this.finished = true;
    const present = this.mercs.filter((m) => !m.left);
    const groups = new Map();
    for (const m of present) { if (!groups.has(m.stones)) groups.set(m.stones, []); groups.get(m.stones).push(m.id); }
    const standings = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([, ids]) => ids);
    const scores = {}, stats = {};
    for (const m of present) { scores[m.id] = m.stones; stats[m.id] = { Stones: m.stones, Downs: m.downs, Revives: m.revives, Kills: m.kills }; }
    const most = (k) => present.reduce((a, b) => (b[k] > (a?.[k] ?? -1) ? b : a), null);
    const awards = [];
    const rev = most('revives'); if (rev && rev.revives > 0) awards.push({ id: rev.id, title: 'Last Friend', detail: `${rev.revives} brought back up` });
    const pay = most('stones'); if (pay && pay.stones > 0) awards.push({ id: pay.id, title: 'Paid in Full', detail: `${pay.stones} stones` });
    const lit = most('cells'); if (lit && lit.cells > 0) awards.push({ id: lit.id, title: 'Arsonist', detail: `${lit.cells} cells lit` });
    this.outcome = { standings, scores, stats, awards };
    this.s.finish(this.outcome);
    this.phase = 'over';
    this.game.events.emit('round-finished', this.outcome);
  }
  onEnd(e) {
    const g = this.game;
    this.ended = true; this.phase = 'over';
    if (this.timer) clearInterval(this.timer);
    if (this.keydown && typeof window !== 'undefined') window.removeEventListener('keydown', this.keydown);
    const audio = g.ctx?.audio;
    if (this.s.kind === 'hub') { audio?.stopMusic(); audio?.stopLoops(); audio?.setMuted(true); g.ended = true; }
    this.endInfo = e;
    g.events.emit('round-end', e);
    if (this.s.kind !== 'hub') g.onRoundOver(this.outcome ?? this.s.outcome);
  }
  dispose() {
    for (const f of this.offs ?? []) f?.();
    if (this.timer) clearInterval(this.timer);
    if (this.keydown && typeof window !== 'undefined') window.removeEventListener('keydown', this.keydown);
    this.s.close?.();
  }
  // ---- per frame ----
  update(ctx, dt) {
    const g = this.game;
    const rt = this.now() - 150;
    for (const m of this.mercs) {
      if (m.local || m.left) continue;
      if (!m.view && this.isHost) { continue; }
      let x = m.x, y = m.y, z = m.z, yaw = m.yaw;
      if (m.buf.length >= 2) {
        const a = m.buf[Math.max(0, m.buf.length - 2)], b = m.buf[m.buf.length - 1];
        const k = clamp((rt - a.at) / Math.max(1, b.at - a.at), 0, 1.2);
        x = lerp(a.x, b.x, k); y = lerp(a.y, b.y, k); z = lerp(a.z, b.z, k); yaw = a.yaw + wrapAngle(b.yaw - a.yaw) * k;
        if (!this.isHost) { m.x = x; m.y = y; m.z = z; m.yaw = yaw; }
      }
      if (m.view) {
        m.view.object.visible = m.respawnT <= 0;
        m.view.object.position.set(x, y, z); m.view.object.rotation.y = yaw;
        const moving = m.speed > 0.2 || (m.buf.length >= 2 && Math.hypot(m.buf[m.buf.length - 1].x - m.buf[m.buf.length - 2].x, m.buf[m.buf.length - 1].z - m.buf[m.buf.length - 2].z) > 0.05);
        if (m.down) m.view.anim.set('WoundedSit', 'WoundedSit');
        else m.view.anim.set(moving ? 'Run' : 'Idle', moving ? 'AimWalk' : 'AimIdle');
        m.view.anim.update(dt);
      }
    }
    if (this.isClient) {
      for (const p of this.puppets.values()) {
        if (p.buf.length >= 2 && !p.dead) {
          const a = p.buf[p.buf.length - 2], b = p.buf[p.buf.length - 1];
          const k = clamp((rt - a.at) / Math.max(1, b.at - a.at), 0, 1.2);
          p.x = lerp(a.x, b.x, k); p.z = lerp(a.z, b.z, k); p.yaw = a.yaw + wrapAngle(b.yaw - a.yaw) * k;
          p.y = g.world.heightAt(p.x, p.z);
          p.moveWanted = Math.hypot(b.x - a.x, b.z - a.z) > 0.05 ? 3.5 : 0;
          p.state = p.netState === 2 ? 'alert' : 'idle';
          if (p.view) p.view.anim.set(p.netState === 4 ? 'BurnPanic' : p.moveWanted > 0 ? 'Run' : 'Idle', p.netState === 4 ? 'BurnPanic' : p.netState === 2 ? 'AimIdle' : 'Idle');
        }
      }
    }
    // Case props.
    if (this.caseObjs) for (const c of this.cases) { const o = this.caseObjs[c.id]; o.visible = c.state === 'free'; if (c.state === 'free') o.position.set(c.x, g.world.heightAt(c.x, c.z) + 0.05, c.z); }
    // The tracker's beep and a marker when close.
    if (g.hasPlayer && this.playing() && !this.carrying) {
      let bd = Infinity; const f = g.player.feet;
      for (const c of this.cases) if (c.state === 'free') bd = Math.min(bd, Math.hypot(c.x - f.x, c.z - f.z));
      if (bd < 140) { this.beepT -= dt; if (this.beepT <= 0) { this.beepT = Math.max(0.12, (bd / 60) * 0.7); g.sfx.play(bd < 60 ? 'tracker-near' : 'tracker-beep', { volume: 0.18 }); } }
    }
    // Card: pad buttons poll here; Enter and M are window listeners.
    if (this.phase === 'card' && !this.server && this.s.kind === 'hub') {
      const inp = ctx.input;
      if (inp.wasPressed('PadCross')) this.s.answer('ready');
      if (inp.wasPressed('PadTriangle')) this.s.answer('more');
      for (const ev of inp.buttonEvents) {
        if (!ev.down) continue;
        const hud = ctx.hud, x = ((ev.x + 1) / 2) * hud.width, y = ((1 - ev.y) / 2) * hud.height;
        if (this.btnReady && x >= this.btnReady.x && x < this.btnReady.x + this.btnReady.w && y >= this.btnReady.y && y < this.btnReady.y + this.btnReady.h) this.s.answer('ready');
        else if (this.btnMore && x >= this.btnMore.x && x < this.btnMore.x + this.btnMore.w && y >= this.btnMore.y && y < this.btnMore.y + this.btnMore.h) this.s.answer('more');
      }
    }
  }
  // ---- shots from this copy ----
  /** Called by the weapon system on a client: local tracer now, the host decides hits. */
  sendShot(ox, oy, oz, dx, dy, dz, wid) { this.evQ.push(['shot', round2(ox), round2(oy), round2(oz), Math.round(dx * 1000) / 1000, Math.round(dy * 1000) / 1000, Math.round(dz * 1000) / 1000, wid]); }
  // ---- drawing ----
  draw(ctx) {
    const g = this.game, h = ctx.hud;
    if (this.phase === 'card') { this.drawCard(h); return; }
    if (this.phase === 'countdown') {
      const t = Math.ceil(-this.now() / 1000);
      const s = String(clamp(t, 0, 3));
      h.text(((h.width - s.length * 6 * 4) / 2) | 0, 90, s, { scale: 4, color: 'sand', shadow: 'plum' });
    }
    // Clock and standings, top right; one line per seat.
    const left = Math.max(0, Math.ceil((this.limit - this.now()) / 1000));
    const clock = this.phase === 'play' ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
    h.text(h.width - 24 - clock.length * 6 * 2, 14, clock, { scale: 2, color: 'white' });
    let y = 34;
    for (const m of this.mercs) {
      if (m.left) continue;
      h.rect(h.width - 24 - 82, y, 6, 6, seatColor(m.color));
      h.text(h.width - 24 - 72, y, `${m.name.slice(0, 7)} ${m.stones}`, { color: m.local ? 'sand' : 'white' });
      if (m.down) h.text(h.width - 24 - 6, y, '+', { color: 'red' });
      if (m.carrying >= 0) h.text(h.width - 24 - 12, y, '$', { color: 'lime' });
      y += 10;
    }
    if (this.carrying) { const t = 'CARRYING A CASE. WALK IT TO THE TRUCK.'; h.text(((h.width - t.length * 6) / 2) | 0, 14, t, { color: 'lime' }); }
    if (this.localDown_) {
      const m = this.local, t1 = 'YOU ARE BLEEDING OUT', t2 = `${Math.ceil(m?.downT ?? 0)}`;
      h.text(((h.width - t1.length * 12) / 2) | 0, 110, t1, { scale: 2, color: 'red' });
      h.text(((h.width - t2.length * 12) / 2) | 0, 130, t2, { scale: 2, color: 'white' });
    } else if (this.local?.respawnT > 0) {
      const t1 = 'BACK ON THE ROAD SOON';
      h.text(((h.width - t1.length * 12) / 2) | 0, 110, t1, { scale: 2, color: 'mist' });
    }
    if (this.phase === 'over' && this.s.kind === 'hub') { const t = 'THE STONES ARE COUNTED'; h.text(((h.width - t.length * 12) / 2) | 0, 110, t, { scale: 2, color: 'sand' }); }
  }
  drawWorldHud(ctx, project) {
    const g = this.game, h = ctx.hud, f = g.hasPlayer ? g.player.feet : null;
    if (!f) return;
    for (const c of this.cases) {
      if (c.state !== 'free') continue;
      const d = Math.hypot(c.x - f.x, c.z - f.z);
      if (d > 45) continue;
      const p = project(c.x, g.world.heightAt(c.x, c.z) + 1.2, c.z);
      if (p) { h.rect(p[0] - 2, p[1] - 2, 5, 5, 'lime'); h.text(p[0] + 5, p[1] - 3, `${Math.round(d)}M`, { color: 'lime' }); }
    }
    if (this.carrying) { const p = project(TRUCK_AT[0], g.world.heightAt(TRUCK_AT[0], TRUCK_AT[1]) + 4, TRUCK_AT[1]); if (p) { h.rect(p[0] - 2, p[1] - 2, 5, 5, 'sand'); h.text(p[0] + 5, p[1] - 3, 'TRUCK', { color: 'sand' }); } }
    for (const m of this.mercs) {
      if (m.local || m.left || m.respawnT > 0) continue;
      const p = project(m.x, m.y + 2.1, m.z);
      if (p) { h.text(p[0] - m.name.length * 3, p[1] - 4, m.name, { color: seatColor(m.color) }); if (m.down) { h.rect(p[0] - 1, p[1] + 5, 3, 9, 'red'); h.rect(p[0] - 4, p[1] + 8, 9, 3, 'red'); } }
    }
  }
  drawCard(h) {
    const g = this.game, card = this.card ?? {}, W = h.width;
    h.rect(0, 0, W, h.height, 'ink');
    const t = GAME_TITLE.toUpperCase();
    let scale = 3; if (t.length * 6 * scale > W - 40) scale = 2;
    h.text(((W - t.length * 6 * scale) / 2) | 0, 18, t, { scale, color: 'sand', shadow: 'plum' });
    const goal = 'CARRY THE MOST DIAMOND CASES OUT OF THE BURNING MINE';
    let y = 52;
    for (const l of wrap(goal, W - 60)) { h.text(((W - l.length * 6) / 2) | 0, y, l, { color: 'white' }); y += 10; }
    // Players in their seat colours with ready marks.
    y += 6;
    for (const m of this.mercs) {
      const rd = (card.ready ?? []).includes(m.id);
      h.rect(60, y, 8, 8, seatColor(m.color));
      h.text(74, y + 1, m.name, { color: 'white' });
      h.text(W - 60 - 5 * 6, y + 1, rd ? 'READY' : '', { color: 'lime' });
      y += 12;
    }
    y += 6;
    // Controls in this player's glyphs.
    const a = g.actions, x = g.settings.glyphs === 'xb';
    const rows = [['fire', 'FIRE'], ['use', 'TAKE, BANK, REVIVE'], ['next', 'SWITCH']];
    let cx = 60;
    for (const [act, txt] of rows) { const nm = a.glyph(act, x); g.ui.menu.note(act, nm, txt); const w = drawGlyph(h, cx, y, nm); h.text(cx + w + 3, y + 2, txt, { color: 'mist' }); cx += w + 8 + txt.length * 6; }
    y += 20;
    const secs = card.left != null ? `${Math.ceil(card.left / 1000)}` : card.paused ? 'HOLD' : '';
    h.text(W - 24 - secs.length * 12, 14, secs, { scale: 2, color: 'white' });
    const bw = 150, by = h.height - 44;
    const ready = (card.ready ?? []).includes(this.s.me);
    this.btnReady = { x: 60, y: by, w: bw, h: 24 };
    this.btnMore = { x: W - 60 - bw, y: by, w: bw, h: 24 };
    h.rect(60, by, bw, 24, ready ? 'green' : 'orange');
    g.ui.menu.note('confirm', a.glyph('confirm', x), 'READY'); g.ui.menu.note(null, a.device === 'pad' ? (x ? 'Y' : 'TRIANGLE') : 'M', 'MORE TIME');
    drawGlyph(h, 68, by + 6, a.glyph('confirm', x));
    h.text(68 + glyphWidth(a.glyph('confirm', x)) + 8, by + 6, 'READY', { scale: 2, color: 'ink', shadow: false });
    h.rect(W - 60 - bw, by, bw, 24, card.asked ? 'plum' : 'night');
    drawGlyph(h, W - 60 - bw + 8, by + 6, a.device === 'pad' ? (x ? 'Y' : 'TRIANGLE') : 'M');
    h.text(W - 60 - bw + 30, by + 8, 'MORE TIME', { color: 'white' });
  }
}
const seatColor = (hex) => COLOR_NAMES[hex] ?? 'white';
