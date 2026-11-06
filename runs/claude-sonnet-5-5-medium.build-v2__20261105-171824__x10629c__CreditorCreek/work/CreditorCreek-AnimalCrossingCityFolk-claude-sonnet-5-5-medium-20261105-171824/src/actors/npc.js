// Neighbours and hosts: routines (bedtime, wake, hangouts), NavGrid paths, bubbles, memory-aware talk.
import { THREE, NavGrid } from '../engine.js';
import { Actor } from './actor.js';
import { NEIGHBOURS, HOSTS, EXTRA_NPCS } from '../data/neighbours.js';
import { TW, TD, BUILDINGS } from '../world/townMap.js';
import { tuning } from '../data/tuning.js';
import { hourOf, isWet } from '../core/calendar.js';
const byId = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export class Npc {
  constructor(def, g, kind = 'neighbour') {
    this.def = def; this.id = def.id; this.kind = kind; this.g = g; this.name = def.name; this.type = def.type; this.pitch = def.pitch; this.slow = def.slow; this.voice = def.voice;
    this.actor = new Actor({ species: def.species, c: def.color, a: def.accent, name: def.name }); this.actor.name = def.name; this.state = 'idle'; this.path = null; this.pi = 0; this.timer = 2 + Math.random() * 4; this.pos = { x: 0, z: 0 }; this.yaw = 0; this.indoors = false; this.busy = false; this.nameColor = def.color;
    this.umbrella = false; this.sleeping = false; this.talkingTo = null; this.bubble = null; this.home = def.home;
  }
  get doorTile() { const b = byId[this.def.house ?? this.def.id]; return b ? [b.door[0] + 0.5, b.door[1] + 1.5] : [this.pos.x, this.pos.z]; }
}
export class NpcManager {
  constructor(g) { this.g = g; this.list = []; this.byId = {}; this.nav = null; this.group = new THREE.Group(); g.ctx.scene.add(this.group); }
  rebuildNav() { const g = this.g; const rows = []; for (let z = 0; z < TD; z++) { let r = ''; for (let x = 0; x < TW; x++) r += g.grid.bl[z * TW + x] ? '#' : '.'; rows.push(r); } this.nav = NavGrid.fromRows(rows, { blocked: '#', cell: 1, origin: [0, 0, 0] }); }
  reset() {
    for (const n of this.list) this.group.remove(n.actor.root); this.list = []; this.byId = {}; const g = this.g, w = g.world;
    const defs = NEIGHBOURS.filter(n => !(n.id === 'fitch' && (w.day < 9 && w.year === 1 && !w.movedOut.fitch)) && !(n.id === 'rocco' && w.movedOut.rocco));
    defs.push(...EXTRA_NPCS.map(x => x.id === 'trundle' ? { ...x, hang: [[16 + ((w.day - 1) % 16) * 0.6, 24], [16 + ((w.day - 1) % 16) * 0.6, 20]] } : x));
    for (const d of defs) { const n = new Npc(d, g); const dt = n.doorTile; n.pos.x = dt[0]; n.pos.z = dt[1] + 0.2; this.byId[d.id] = n; this.list.push(n); this.group.add(n.actor.root); n.actor.setPos(n.pos.x, n.pos.z); }
    this.rebuildNav(); this.schedule(true);
  }
  setVisible(v) { this.group.visible = v; }
  /** Place everybody sensibly for the current hour (used at load, wake, teleports). */
  schedule(snap) {
    const g = this.g, h = g.hour;
    for (const n of this.list) {
      const d = n.def; const asleep = this.isAsleep(n, h);
      if (asleep) { n.sleeping = true; n.indoors = true; n.actor.show(false); n.state = 'asleep'; n.path = null; const dt = n.doorTile; n.pos.x = dt[0]; n.pos.z = dt[1]; }
      else if (n.sleeping || snap) { n.sleeping = false; n.indoors = false; n.actor.show(true); const spots = d.hang; const sp = spots[(Math.floor(this.g.rng() * spots.length))]; if (snap) { n.pos.x = sp[0] + 0.5; n.pos.z = sp[1] + 0.5; const f = g.grid.free(n.pos.x, n.pos.z); n.pos.x = f[0]; n.pos.z = f[1]; } n.state = 'idle'; n.timer = 1 + g.rng() * 3; }
    }
  }
  isAsleep(n, h) { const { bed, wake } = n.def; if (bed >= 24) { const b = bed - 24; return h >= b && h < wake; } return h >= bed || h < wake; }
  fixed(dt) {
    const g = this.g; if (g.mode === 'title') return; this.chat(dt); const h = g.hour; this.sched = (this.sched ?? 0) + dt;
    if (this.sched > 2) { this.sched = 0; this.checkSleep(h); }
    for (const n of this.list) {
      if (n.sleeping || n.busy) continue;
      const sp = tuning.npcSpeed * (n.def.speedMult ?? 1) * (n.def.type === 'gogetter' ? 1.3 : n.def.type === 'grouch' ? 0.8 : 1);
      if (n.state === 'walk' && n.path) {
        const t = n.path[n.pi]; if (!t) { this.arrive(n); continue; }
        let dx = t[0] - n.pos.x, dz = t[2] - n.pos.z; const d = Math.hypot(dx, dz);
        if (d < 0.2) { n.pi++; if (n.pi >= n.path.length) this.arrive(n); continue; }
        dx /= d; dz /= d; const px = n.pos.x, pz = n.pos.z; n.pos.x += dx * sp * dt; n.pos.z += dz * sp * dt; n.yaw = Math.atan2(dx, dz); n.speed = sp;
      } else {
        n.speed = 0; n.timer -= dt * (tuning.chatRate > 0 ? 1 : 1);
        if (n.timer <= 0) this.decide(n, h);
      }
    }
  }
  chat(dt) {
    const BUB = ['Mm-hm.', 'Isn\'t it?!', 'Hm.', 'Darling dear.', 'Let\'s roll!', 'Hon.', 'No refunds.', 'The moon says so.', 'You didn\'t hear it from me.'];
    for (const n of this.list) { if (n.bubble) n.bubble.t -= dt; }
    this.chatT = (this.chatT ?? 0) - dt; if (this.chatT > 0) return; this.chatT = 4 / Math.max(0.1, tuning.chatRate);
    const a = this.list.filter(n => !n.sleeping && !n.busy && n.state === 'idle'); for (const n of a) { const o = a.find(m => m !== n && Math.hypot(m.pos.x - n.pos.x, m.pos.z - n.pos.z) < 2.2); if (o && this.g.rng() < 0.5) { n.bubble = { text: n.def.tic.length < 18 ? n.def.tic : BUB[Math.floor(this.g.rng() * BUB.length)], t: 3 }; o.bubble = { text: BUB[Math.floor(this.g.rng() * BUB.length)], t: 3 }; n.yaw = Math.atan2(o.pos.x - n.pos.x, o.pos.z - n.pos.z); o.yaw = n.yaw + Math.PI; n.timer = o.timer = 5; break; } }
  }
  checkSleep(h) {
    const g = this.g; for (const n of this.list) {
      const asleep = this.isAsleep(n, h);
      if (asleep && !n.sleeping && !n.busy) { // walk home then vanish
        if (n.state !== 'gohome') { const dt = n.doorTile; this.goto(n, dt[0], dt[1], 'gohome'); }
      } else if (!asleep && n.sleeping) { n.sleeping = false; n.indoors = false; n.actor.show(true); const dt = n.doorTile; n.pos.x = dt[0]; n.pos.z = dt[1]; n.state = 'idle'; n.timer = 1; }
    }
  }
  goto(n, x, z, why = 'walk') {
    const p = this.nav.path([n.pos.x, 0, n.pos.z], [x, 0, z]); if (!p) { n.state = 'idle'; n.timer = 3; return false; }
    n.path = p; n.pi = 1; n.state = 'walk'; n.why = why; return true;
  }
  arrive(n) {
    n.path = null; n.speed = 0;
    if (n.why === 'gohome') { n.sleeping = true; n.indoors = true; n.actor.show(false); n.state = 'asleep'; return; }
    n.state = 'idle'; n.timer = 4 + this.g.rng() * 9; n.doing = null;
    const r = this.g.rng(); n.doing = r < 0.25 ? 'Hum' : r < 0.4 ? 'Sway' : r < 0.5 ? 'IdleBored' : null; if (n.festival) { n.timer = 9999; n.doing = n.festival; }
  }
  decide(n, h) {
    const g = this.g, d = n.def; const wet = isWet(g.weather);
    if (wet && n.def.type !== 'grouch' && g.rng() < 0.3) { n.umbrella = true; }
    const r = g.rng();
    if (r < 0.12 && n.doing == null) { n.timer = 3; n.doing = 'Hum'; return; }
    let tx, tz; if (r < 0.55) { const s = d.hang[Math.floor(g.rng() * d.hang.length)]; tx = s[0] + 0.5 + (g.rng() - 0.5) * 2; tz = s[1] + 0.5 + (g.rng() - 0.5) * 2; } else if (r < 0.8) { tx = n.pos.x + (g.rng() - 0.5) * 8; tz = n.pos.z + (g.rng() - 0.5) * 8; } else { const o = this.list[Math.floor(g.rng() * this.list.length)]; if (o && !o.sleeping) { tx = o.pos.x + 1.2; tz = o.pos.z + 0.5; } else { tx = 21; tz = 23; } }
    const f = g.grid.free(Math.max(2, Math.min(TW - 3, tx)), Math.max(3, Math.min(TD - 8, tz)));
    if (!this.goto(n, f[0], f[1])) n.timer = 2;
  }
  updateVisual(dt, t) {
    const g = this.g;
    for (const n of this.list) {
      const a = n.actor; a.setPos(n.pos.x, n.pos.z, g.place === 'town' ? 0 : -999); a.yaw = n.yaw; if (n.sleeping || g.place !== 'town') { a.root.visible = false; continue; } a.root.visible = !n.hidden;
      if (!n.busy || n.walkAnim) { if (n.state === 'walk') { if (n.id === 'trundle') a.play('Slide'); else a.locomote(n.speed, 'walk'); } else if (n.talkingTo) a.play('Talk'); else a.play(n.doing ?? 'Idle'); }
      a.update(dt, t);
    }
  }
  near(x, z, r) { let best = null, bd = r; for (const n of this.list) { if (n.sleeping || !n.actor.root.visible) continue; const d = Math.hypot(n.pos.x - x, n.pos.z - z); if (d < bd) { bd = d; best = n; } } return best; }
}
