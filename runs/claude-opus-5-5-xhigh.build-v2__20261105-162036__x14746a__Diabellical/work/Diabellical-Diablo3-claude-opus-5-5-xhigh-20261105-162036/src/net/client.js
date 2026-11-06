// A client's copy: the same map from the same seed, a mirror of the world, intent going up.
import { MONSTERS } from '../data/monsters.js';
import { LEGENDARIES } from '../data/items.js';
import { slide } from '../sim/core.js';
import { recalcHero } from '../sim/hero.js';
import { CODE_STATE } from './codec.js';

export class NetClient {
  constructor(transport, world, seat) {
    this.t = transport;
    this.w = world;
    this.seat = seat;
    this.q = 0;
    this.targets = new Map();
    this.pending = [];
    this.pressQueue = 0;
    this.goal = null;
    this.reliableQueue = [];
    this.lastN = -1;
    this.acc = 0;
    this.stats = { s: 0, e: 0 };
    this.mono = new Map();
  }

  get me() { return this.w.heroes.find((h) => h.seat === this.seat); }

  onMessage(data) {
    switch (data.k) {
      case 's': this.applySnapshot(data); break;
      case 'e':
        this.stats.e++;
        for (const ev of data.e) { this.applyEvent(ev); this.pending.push(ev); }
        break;
      case 'd': this.applyHeroData(data.d); break;
      default: break;
    }
  }

  applySnapshot(s) {
    if (s.n <= this.lastN) return;
    this.lastN = s.n;
    this.stats.s++;
    this.w.t = s.n;
    this.w.time = s.n / 60;
    const w = this.w;
    for (let i = 0; i < s.h.length; i += 8) {
      const h = w.heroes.find((o) => o.id === s.h[i]);
      if (!h) continue;
      const isMe = h.seat === this.seat;
      const tx = s.h[i + 1] / 10, tz = s.h[i + 2] / 10;
      this.targets.set(h.id, { x: tx, z: tz, f: s.h[i + 3] / 10, e: h });
      if (!isMe) { h.facing = s.h[i + 3] / 10; h.moving = !!(s.h[i + 7] & 2); h.state = CODE_STATE[s.h[i + 4]] ?? 'idle'; }
      h.hp = s.h[i + 5];
      h.res = s.h[i + 6];
      h.dead = !!(s.h[i + 7] & 1);
      if (h.dead) h.state = 'dead';
      h.channel = s.h[i + 7] & 4 ? h.channel + 0.1 : 0;
      h.deadT = h.dead ? (h.deadT ?? 0) + 0.1 : 0;
    }
    for (let i = 0; i < s.m.length; i += 5) {
      const m = w.monsters.find((o) => o.id === s.m[i]);
      if (!m) continue;
      const tx = s.m[i + 1] / 10, tz = s.m[i + 2] / 10;
      this.targets.set(m.id, { x: tx, z: tz, f: s.m[i + 3] / 10, e: m });
      m.hp = s.m[i + 4];
    }
    for (let i = 0; i < s.a.length; i += 5) {
      const a = w.allies.find((o) => o.id === s.a[i]);
      if (!a) continue;
      this.targets.set(a.id, { x: s.a[i + 1] / 10, z: s.a[i + 2] / 10, f: s.a[i + 3] / 10, e: a });
      a.moving = !!s.a[i + 4];
    }
  }

  /** Keep the mirror's lists true. The view reads them; effects come from the same events. */
  applyEvent(e) {
    const w = this.w;
    switch (e.t) {
      case 'spawn': {
        const def = MONSTERS[e.k];
        const base = { id: e.id, type: e.k, def, x: e.x, z: e.z, r: (def?.r ?? 0.4) * (e.s ?? 1), facing: e.f, hp: e.hp, maxHp: e.hp, status: {}, name: e.n, elite: e.e || null, aff: e.aff ?? [], scale: e.s ?? 1, level: 12, moving: false, state: 'chase', knellPts: 0 };
        if (e.ally) w.allies.push({ ...base, ally: true, owner: e.owner, def });
        else w.monsters.push(base);
        break;
      }
      case 'death': case 'remove':
        for (const list of [w.monsters, w.allies]) {
          const i = list.findIndex((m) => m.id === e.id);
          if (i >= 0) { list[i].dead = true; list.splice(i, 1); }
        }
        this.targets.delete(e.id);
        if (w.boss?.id === e.id) w.boss = null;
        break;
      case 'hit': { const m = w.monsters.find((o) => o.id === e.id); if (m && e.a) m.hp -= e.a; break; }
      case 'hide': { const m = w.monsters.find((o) => o.id === e.id); if (m) m.hidden = true; break; }
      case 'unhide': { const m = w.monsters.find((o) => o.id === e.id); if (m) { m.hidden = false; m.x = e.x; m.z = e.z; } break; }
      case 'boss': { const m = w.monsters.find((o) => o.id === e.id); if (m) { w.boss = m; m.bossState = { round: 1, phase: 1 }; m.def = MONSTERS[e.k]; } break; }
      case 'boss_round': { const m = w.monsters.find((o) => o.id === e.id); if (m?.bossState) m.bossState.round = e.round; break; }
      case 'boss_dead': w.boss = null; break;
      case 'knell': if (w.run) { w.run.meter = e.v; w.run.total = e.of; } break;
      case 'knell_tolls': if (w.run) w.run.state = 'warden'; break;
      case 'run_done': if (w.run) w.run.state = 'done'; break;
      case 'level': { const h = w.heroes.find((o) => o.id === e.id); if (h) { h.level = e.level; recalcHero(w, h); } break; }
      case 'gear': { const h = w.heroes.find((o) => o.id === e.id); if (h) h.gearLook = e.g; break; }
      case 'hero_class': { const h = w.heroes.find((o) => o.id === e.id); if (h) { h.cls = e.cls; recalcHero(w, h); } break; }
      case 'down': { const h = w.heroes.find((o) => o.id === e.id); if (h) { h.dead = true; h.state = 'dead'; h.deadT = 0; h.deathWait = 8; } break; }
      case 'up': { const h = w.heroes.find((o) => o.id === e.id); if (h) { h.dead = false; h.state = 'idle'; h.x = e.x; h.z = e.z; this.targets.delete(h.id); } break; }
      case 'pick3': { const h = w.heroes.find((o) => o.seat === e.seat); if (h) h.pick = { t: 10, opts: e.opts }; break; }
      case 'pick3x': { const h = w.heroes.find((o) => o.seat === e.seat); if (h) h.pick = null; break; }
      case 'obj': {
        const o = w.objects.find((q) => q.id === e.id);
        if (o) { o.state = e.state; if (e.hidden !== undefined) o.hidden = e.hidden; if (e.locked !== undefined) o.locked = e.locked; }
        break;
      }
      case 'objadd': if (!w.objects.some((q) => q.id === e.o.id)) w.objects.push({ ...e.o, r: 1 }); break;
      case 'objmove': { const o = w.objects.find((q) => q.id === e.id); if (o) { o.x = e.x; o.z = e.z; } break; }
      case 'prop': { const p = w.props.find((q) => q.id === e.id); if (p) p.broken = true; break; }
      case 'drop': w.drops.push({ id: e.id, kind: e.kind, x: e.x, z: e.z, owner: e.owner, t: 1 }); break;
      case 'dropx': { const i = w.drops.findIndex((d) => d.id === e.id); if (i >= 0) w.drops.splice(i, 1); break; }
      default: break;
    }
  }

  applyHeroData(d) {
    const h = this.me;
    if (!h) return;
    Object.assign(h, d);
    for (const it of h.inv) if (it?.power && !it.powerText) it.powerText = LEGENDARIES[it.power].power;
    recalcHero(this.w, h);
  }

  /** Per sim step: predict our own hero, smooth everyone else, send intent. */
  step(intent, dt) {
    const me = this.me;
    if (me && !me.dead) this.predict(me, intent, dt);
    const lerp = Math.min(1, dt * 9);
    for (const [id, t] of this.targets) {
      const e = t.e;
      if (e.dead && e !== me) { this.targets.delete(id); continue; }
      if (e === me) {
        const err = Math.hypot(t.x - e.x, t.z - e.z);
        if (err > 3) { e.x = t.x; e.z = t.z; }
        else if (err > 1) { e.x += (t.x - e.x) * 0.2; e.z += (t.z - e.z) * 0.2; }
        else if (err > 0.2 && !intent?.mx && !intent?.mz) { e.x += (t.x - e.x) * 0.1; e.z += (t.z - e.z) * 0.1; }
        continue;
      }
      const dx = t.x - e.x, dz = t.z - e.z;
      e.x += dx * lerp; e.z += dz * lerp;
      if (e.seat === undefined) { e.moving = Math.hypot(dx, dz) > 0.08; e.facing = t.f; }
    }
    this.acc += dt;
    if (this.acc >= 0.1) {
      this.acc -= 0.1;
      this.q++;
      const it = intent ?? {};
      this.t.send({ k: 'i', q: this.q, x: Math.round((it.mx ?? 0) * 100), z: Math.round((it.mz ?? 0) * 100), a: Math.round((it.ax ?? 0) * 10), b: Math.round((it.az ?? 0) * 10), m: it.aimed ?? 0, t: it.tgt ?? 0, h: it.held ?? 0 }, { reliable: false });
    }
    if (intent?.pressed || intent?.goal) { this.pressQueue |= intent.pressed ?? 0; if (intent.goal) this.goal = intent.goal; }
    if ((this.pressQueue || this.goal) && this.t.send({ k: 'p', b: this.pressQueue, g: this.goal ?? undefined }, { reliable: true })) { this.pressQueue = 0; this.goal = null; }
    while (this.reliableQueue.length) {
      if (!this.t.send(this.reliableQueue[0], { reliable: true })) break;
      this.reliableQueue.shift();
    }
  }

  predict(h, it, dt) {
    if (!it) { h.moving = false; return; }
    const mag = Math.hypot(it.mx, it.mz);
    h.moving = mag > 0.02 && !h.dead;
    if (!h.moving) { h.state = 'idle'; return; }
    const speed = (h.stats?.moveSpeed ?? 5) * Math.min(1, mag) * dt;
    slide(this.w, h, (it.mx / mag) * speed, (it.mz / mag) * speed);
    h.dirX = it.mx / mag; h.dirZ = it.mz / mag;
    h.facing = Math.atan2(h.dirX, h.dirZ);
    h.state = 'run';
  }

  sendCommand(c) { this.reliableQueue.push({ k: 'c', c }); }

  drain() {
    const p = this.pending;
    this.pending = [];
    return p;
  }
}
