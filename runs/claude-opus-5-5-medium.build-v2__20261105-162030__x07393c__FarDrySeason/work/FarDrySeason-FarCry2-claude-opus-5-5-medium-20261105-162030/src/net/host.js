// The host side of a round: its messages, its tick and its snapshots.
import { THREE } from '../../pixel-engine.js';
import { dist2 } from '../world/geom.js';
import { TUNING } from '../core/tuning.js';
const { Vector3 } = THREE;
const ROUND_MS = 360000;
const TRUCK = [150, -225];
const STATE_CODE = { idle: 0, suspicious: 1, alert: 2, searching: 3, burning: 4 };
const FACTIONS = ['concord', 'harvest', 'deserter'];
const from = new Vector3(), dir = new Vector3();
export class HostPart {
  // ----- Host: the world's messages -----
  onMessage(d, from) {
    if (this.ended) return;
    if (d.t === 'me' && this.isHost) { const P = this.P[from]; if (!P || P.left) return; if (P.seq !== undefined && d.q < P.seq) return; P.seq = d.q; P.gx = P.x = d.x / 10; P.gy = P.y = d.y / 10; P.gz = P.z = d.z / 10; P.yaw = d.w / 100; P.pitch = d.h / 100; P.crouched = !!d.c; P.lit = !!d.l; P.speed2 = d.v ?? 0; }
    if (d.t === 'ev' && this.isHost) for (const e of d.e) this.onEvent(e, from);
    if (d.t === 's' && !this.isHost) this.onSnapshot(d);
    if (d.t === 'w' && !this.isHost) this.onWorld(d);
  }
  hostFixed(dt) {
    const g = this.game, f = g.world.fire;
    if (!this.inPlay()) return;
    g.frozen = false;
    for (const id of this.order) {
      const P = this.P[id]; if (P.left) continue;
      if (P.actor) this.mercBrain(P, dt);
      if (!P.local && !P.ai) { // A remote player: their puppet and collider follow their own report.
        if (P.gx !== undefined) { P.x = P.gx; P.y = P.gy; P.z = P.gz; }
        if (P.collider) { P.collider.setTranslation?.({ x: P.x, y: P.y + 0.85, z: P.z }); }
      }
      if (P.down) { P.downT -= dt; if (P.downT <= 0) { P.down = false; P.respawning = true; P.respawnT = 15; this.wQ.d.push(['gone', P.id]); } continue; }
      if (P.respawning) { P.respawnT -= dt; if (P.respawnT <= 0) { P.respawning = false; P.hp = 100; this.wQ.d.push(['back', P.id]); if (P.local) { g.player.teleport(P.spawn[0], P.spawn[1]); g.player.downT = 0; g.player.hp = 100; } if (P.ai) { this.spawnMerc(P); } } continue; }
      // Fire.
      if (!P.ai && f.isBurning(P.x, P.z)) { P.burning = 2; }
      if (P.burning > 0) { P.burning -= dt; this.hurt(P, TUNING.fireDamage * dt, { fire: true }); }
      // Regenerate to the segment top.
      P.regenT = (P.regenT ?? 0) + dt;
      if (P.regenT > 5 && P.hp < Math.ceil(P.hp / 20 - 1e-6) * 20) P.hp = Math.min(100, P.hp + dt * 8);
      // Bank.
      if (P.carrying >= 0 && dist2(P.x, P.z, TRUCK[0], TRUCK[1]) < 6) this.bank(P);
    }
    for (const c of this.cases) {
      if (c.banked || c.burned) continue;
      if (c.carrier >= 0) { const P = this.P[c.carrier]; c.x = P.x; c.z = P.z; c.y = P.y; continue; }
      if (f.isBurning(c.x, c.z)) { c.burnT += dt; if (c.burnT > 6) { c.burned = true; this.wQ.b.push(['burn', c.i]); g.audio.at('explosion-small', c.x, c.y, c.z, 80); } }
    }
    if (this.cases.every((c) => c.banked || c.burned) || (this.time() >= ROUND_MS)) this.finish();
  }
  bank(P) { const c = this.cases[P.carrying]; c.banked = true; c.carrier = -1; P.carrying = -1; P.stones += c.stones; this.wQ.b.push(['bank', c.i, P.id, c.stones]); if (P.local) { this.game.audio.play('stone'); this.game.notice(`+${c.stones} STONES`); } else this.game.audio.at('stone', c.x, c.y, c.z, 40); }
  // ----- The network tick (a timer, or the fixed step for solo) -----
  netTick() {
    if (this.ended) return;
    const now = this.s.time(); if (now === -Infinity) return;
    const t = this.nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
    if (this.s.kind === 'solo') return;
    const due = (k, ms) => { if (t - (this.tSend[k] ?? -1e9) >= ms) { this.tSend[k] = t; return true; } return false; };
    if (this.isHost) {
      if (due('s', 100)) this.s.send(this.snapshot(), { reliable: false });
      if (due('w', 250) && (this.wQ.f.length || this.wQ.x.length || this.wQ.d.length || this.wQ.b.length)) { this.s.send({ t: 'w', ...this.wQ }, { reliable: true }); this.wQ = { f: [], x: [], d: [], b: [] }; }
    } else {
      if (due('me', 83)) { const L = this.P[this.me]; this.seq = (this.seq ?? 0) + 1; if (L) this.s.send({ t: 'me', q: this.seq, x: Math.round(L.x * 10), y: Math.round(L.y * 10), z: Math.round(L.z * 10), w: Math.round((L.yaw ?? 0) * 100), h: Math.round((L.pitch ?? 0) * 100), c: L.crouched ? 1 : 0, l: L.lit ? 1 : 0, v: Math.round(L.speed2 ?? 0) }, { to: this.s.host, reliable: false }); }
      if (due('ev', 200) && this.evQ.length) { this.s.send({ t: 'ev', e: this.evQ.splice(0, 40) }, { to: this.s.host, reliable: true }); }
    }
  }
  snapshot() {
    const g = this.game, p = this.order.map((id) => { const P = this.P[id]; const flags = (P.down ? 1 : 0) | (P.left ? 2 : 0) | (P.respawning ? 4 : 0) | (P.crouched ? 8 : 0) | (g.world.time - (P.firedT ?? -9) < 0.12 ? 16 : 0); return [id, Math.round(P.x * 10), Math.round(P.y * 10), Math.round(P.z * 10), Math.round((P.yaw ?? 0) * 100), Math.round(P.hp), flags, P.stones, P.carrying]; });
    const a = g.actors.list.filter((x) => x.ctrl && x.kind !== 'merc').slice(0, 26).map((x) => [x.id, Math.round(x.x * 10), Math.round(x.z * 10), Math.round(x.yaw * 10), (STATE_CODE[x.state] ?? 0) + 10 * Math.max(0, FACTIONS.indexOf(x.faction)) + (g.world.time - (x.firedT ?? -9) < 0.12 ? 100 : 0), Math.round(x.hp)]);
    const c = this.cases.map((k) => [k.i, Math.round(k.x), Math.round(k.z), k.carrier, k.banked ? 1 : k.burned ? 2 : 0]);
    return { t: 's', at: Math.round(this.s.time()), p, a, c };
  }
  queueEv(e) { this.evQ.push(e); }
}
