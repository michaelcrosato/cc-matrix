// A client: the same map from the same seed, a mirror of the world, and only intent sent back.
import { DT, moveCircle } from '../sim/world.js';
import { spawnMonster } from '../sim/monsters.js';
import { SKILLS } from '../data/classes.js';
import { compactIntent, HERO_FLAGS, POS } from './codec.js';
import { MONSTERS } from '../data/monsters.js';
import { refresh } from '../sim/hero.js';
import { removePropBy } from './mirror.js';

export class NetClient {
  constructor(transport, world, seat) {
    this.t = transport; this.w = world; this.seat = seat; this.isHost = false; this.pressQ = {}; this.cmdQ = []; this.iidQ = undefined; this.tickN = 0; this.correct = 0; this.applied = 0; this.lastSnap = 0; this.onEvent = null; this.msgs = 0; this.errorMax = 0;
    transport.on((data) => this.onMessage(data));
  }
  sendCommand(c) { this.cmdQ.push(c); }
  heartbeat() { this.t.send(compactIntent({ moveX: 0, moveZ: 0, held: {} }), { reliable: false }); this.msgs++; }
  // Collects this step's intent; sends at 10 Hz, presses on change at up to 8 Hz.
  step(intent) {
    this.tickN++;
    for (const k of Object.keys(intent.pressed ?? {})) this.pressQ[k] = true;
    if (intent.interactId !== undefined) this.iidQ = intent.interactId;
    this.lastIntent = intent;
    if (this.tickN % 6 === 0) { this.t.send(compactIntent(intent), { reliable: false }); this.msgs++; }
    if (this.tickN % 8 === 0 && (Object.keys(this.pressQ).length || this.cmdQ.length || this.iidQ !== undefined)) {
      const ok = this.t.send({ k: 'c', p: Object.keys(this.pressQ), cmd: this.cmdQ, iid: this.iidQ }, { reliable: true });
      this.msgs++;
      if (ok !== false) { this.pressQ = {}; this.cmdQ = []; this.iidQ = undefined; }
    }
    this.predict(intent);
    this.w.tick++; this.w.time += DT;
    this.interp();
  }
  predict(it) {
    const h = this.w.heroes.find((q) => q.seat === this.seat); if (!h || h.dead || h.left) return;
    h.px = h.x; h.pz = h.z;
    const mag = Math.hypot(it.moveX, it.moveZ);
    if (mag > 0.15 && h.castT <= 0) { const sp = h.stats.speed * Math.min(1, mag); moveCircle(this.w, h, (it.moveX / mag) * sp * DT, (it.moveZ / mag) * sp * DT); h.moving = true; h.speedNow = sp; if (!it.hardAim) h.facing = Math.atan2(it.moveX, it.moveZ); }
    else h.moving = false;
    if (it.hardAim) h.facing = Math.atan2(it.aimX, it.aimZ);
    if (h.castT > 0) h.castT -= DT;
    // Correct smoothly past 1 m of error.
    if (h.netX !== undefined) { const ex = h.netX - h.x; const ez = h.netZ - h.z; const e = Math.hypot(ex, ez); this.errorMax = Math.max(this.errorMax, e); if (e > 1) { h.x += ex * 0.1; h.z += ez * 0.1; this.correct++; } if (e > 6) { h.x = h.netX; h.z = h.netZ; } }
  }
  interp() {
    // Everyone else eases toward the last snapshot, about 120 ms behind.
    const k = 0.14;
    for (const h of this.w.heroes) { if (h.seat === this.seat || h.netX === undefined) continue; h.px = h.x; h.pz = h.z; h.x += (h.netX - h.x) * k; h.z += (h.netZ - h.z) * k; }
    for (const m of this.w.monsters) { if (m.dead || m.netX === undefined) continue; m.px = m.x; m.pz = m.z; m.x += (m.netX - m.x) * k; m.z += (m.netZ - m.z) * k; }
    for (const a of this.w.allies) { if (a.netX === undefined) continue; a.px = a.x; a.pz = a.z; a.x += (a.netX - a.x) * k; a.z += (a.netZ - a.z) * k; }
  }
  onMessage(m) {
    if (m.k === 's') this.applySnapshot(m);
    else if (m.k === 'e') for (const ev of m.v) this.applyEvent(ev);
    else if (m.k === 'sheet') this.applySheet(m.d);
  }
  applySnapshot(s) {
    if (s.t < this.lastSnap) return; this.lastSnap = s.t; this.applied++;
    const w = this.w;
    for (const [id, x, z, f, seq, hp, res, fl] of s.h) {
      const h = w.heroes.find((q) => q.id === id); if (!h) continue;
      h.netX = x / POS; h.netZ = z / POS; if (h.seat !== this.seat) { h.facing = f / 10; h.moving = (fl & HERO_FLAGS.moving) !== 0; h.speedNow = h.stats.speed; }
      h.hp = hp; h.res = res; const dead = (fl & HERO_FLAGS.dead) !== 0; h.dead = dead; h.state = (fl & HERO_FLAGS.dodge) ? 'dodge' : dead ? 'dead' : 'idle'; h.left = (fl & HERO_FLAGS.left) !== 0;
      h.castSeq = seq;
    }
    const map = this.mmap ?? (this.mmap = new Map());
    if (map.size !== w.monsters.length) { map.clear(); for (const m of w.monsters) map.set(m.id, m); }
    for (const [id, x, z, f, hp] of s.m) { const m = map.get(id); if (!m || m.dead) continue; if (m.dormant) { m.dormant = false; m.x = x / POS; m.z = z / POS; m.px = m.x; m.pz = m.z; } m.netX = x / POS; m.netZ = z / POS; m.facing = f / 10; m.hp = hp; }
    for (const [id, x, z, f] of s.a) { const a = w.allies.find((q) => q.id === id); if (a) { a.netX = x / POS; a.netZ = z / POS; a.facing = f / 10; } }
    w.active = w.monsters.filter((q) => !q.dead && !q.dormant);
  }
  applySheet(d) {
    const h = this.w.heroes.find((q) => q.id === d.id); if (!h) return;
    Object.assign(h, { level: d.level, xp: d.xp, gold: d.gold, gear: d.gear, inv: d.inv, mats: d.mats, gems: d.gems, slots: d.slots, vows: d.vows, reliquary: d.reliquary, levelPicks: d.levelPicks, cls: d.cls, newest: d.newest });
    h._skillCache = null; const hp = h.hp; refresh(this.w, h); h.hp = hp;
  }
  applyEvent(ev) {
    const w = this.w;
    switch (ev.t) {
      case 'mspawn': {
        let m = w.monsters.find((q) => q.id === ev.id);
        if (!m) { const nid = w.nextId; w.nextId = ev.id; m = spawnMonster(w, ev.type, ev.x, ev.z, { dormant: false, elite: ev.elite, affl: ev.affl, name: ev.name, tint: ev.tint, level: ev.level }); w.nextId = Math.max(nid, ev.id + 1); m.maxHp = ev.maxHp; m.hp = ev.hp; m.scale = ev.sm ?? m.scale; w.events.pop?.call; this.mmap = null; }
        else { m.dormant = false; m._woke = true; m.x = ev.x; m.z = ev.z; m.px = m.x; m.pz = m.z; m.maxHp = ev.maxHp; m.hp = ev.hp; m.name = ev.name; m.level = ev.level; }
        m.defn = MONSTERS[ev.type]; break;
      }
      case 'death': { const m = w.monsters.find((q) => q.id === ev.id); if (m) { m.dead = true; } w.stats.kills++; break; }
      case 'hit': { const m = w.monsters.find((q) => q.id === ev.id); if (m) { m.hp = Math.max(0, m.hp - ev.amt); m.flash = 2; } break; }
      case 'drop': w.drops.push({ id: ev.id, kind: ev.kind, x: ev.x, z: ev.z, rarity: ev.rarity, name: ev.name, seat: ev.seat, slot: ev.slot, fx: ev.fx, fz: ev.fz, amount: ev.amount }); break;
      case 'pickup': { const i = w.drops.findIndex((d) => d.id === ev.id); if (i >= 0) w.drops.splice(i, 1); break; }
      case 'break': case 'chest': case 'shrine': case 'relic': case 'lever': case 'propgone': removePropBy(w, ev); break;
      case 'propadd': if (!w.props.some((p) => p.id === ev.id)) w.props.push({ id: ev.id, kind: ev.kind, x: ev.x, z: ev.z, model: ev.model, label: ev.label, interact: true, r: 1.2 }); break;
      case 'boss': if (ev.on) { const m = w.monsters.find((q) => q.id === ev.id); w.boss = { id: ev.id, name: ev.name, ticks: ev.ticks ?? [], m }; } else w.boss = null; break;
      case 'meter': if (w.knell) w.knell.meter = ev.v * w.knell.total; break;
      case 'knell': if (w.knell && ev.total) { w.knell.total = ev.total; w.knell.mods = ev.mods; } break;
      case 'banner': if (ev.text === 'THE KNELL TOLLS' && w.knell) { w.knell.stage = 'warden'; w.knell.meter = w.knell.total; } break;
      case 'cast': { const h = w.heroes.find((q) => q.id === ev.id); if (h && !ev.dodge && ev.skill) { const sk = SKILLS[ev.skill]; if (sk?.cd) h.cds[ev.skill] = w.time + sk.cd * (1 - Math.min(50, h.stats.cdr) / 100); if (h.seat === this.seat && !sk.moving) h.castT = ev.dur * 0.75; } break; }
      case 'classswap': { const h = w.heroes.find((q) => q.id === ev.id); if (h) { h.cls = ev.cls; } break; }
      case 'ally': if (!w.allies.some((a) => a.id === ev.id)) w.allies.push({ id: ev.id, kind: ev.kind, x: ev.x, z: ev.z, px: ev.x, pz: ev.z, facing: 0, owner: ev.owner, seat: ev.seat, big: ev.big, minion: true }); break;
      case 'allygone': { const i = w.allies.findIndex((a) => a.id === ev.id); if (i >= 0) w.allies[i].dead = true; w.allies = w.allies.filter((a) => !a.dead || a.id === ev.id); break; }
      default: break;
    }
    this.onEvent?.(ev);
  }
}
