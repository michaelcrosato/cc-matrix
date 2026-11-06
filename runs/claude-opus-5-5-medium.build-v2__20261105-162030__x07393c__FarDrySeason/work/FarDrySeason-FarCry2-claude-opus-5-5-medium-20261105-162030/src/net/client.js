// The client side of a round: what it plays back from the host.
import { BURNING, BURNT } from '../world/fire.js';
const FACTIONS = ['concord', 'harvest', 'deserter'];
export class ClientPart {
  clientFixed(dt) {
    const g = this.game; if (this.inPlay()) g.frozen = false;
    const L = this.P[this.me];
    if (L.down) g.player.downT = 1e9; else if (g.player.downT > 1e6) g.player.downT = 0;
    void dt;
  }
  onSnapshot(d) {
    if (d.at < (this.lastAt ?? -1e12)) return; this.lastAt = d.at;
    const g = this.game;
    for (const row of d.p) {
      const P = this.P[row[0]]; if (!P) continue;
      const flags = row[6];
      P.left = !!(flags & 2); P.hp = row[5]; P.stones = row[7]; P.carrying = row[8];
      if (P.local) {
        const wasDown = P.down; P.down = !!(flags & 1); P.respawning = !!(flags & 4);
        if (P.down && !wasDown) this.downLocal();
        if (wasDown && !P.down && !P.respawning) this.upLocal();
        if (!P.down && this.wasRespawn && !P.respawning) { g.player.teleport(P.spawn[0], P.spawn[1]); g.player.downT = 0; }
        this.wasRespawn = P.respawning;
        continue;
      }
      P.down = !!(flags & 1); P.respawning = !!(flags & 4); P.crouched = !!(flags & 8);
      if ((flags & 16) && P.tx !== undefined) { g.audio.at('gun-rifle', P.tx, P.ty + 1.4, P.tz, 350, 0.8); P.view?.flashUpper('FireRecoil'); }
      P.tx = row[1] / 10; P.ty = row[2] / 10; P.tz = row[3] / 10; P.tyaw = row[4] / 100;
    }
    // Soldiers are puppets, interpolated 150 ms behind.
    const seen = new Set();
    for (const r of d.a) {
      seen.add(r[0]);
      let a = this.puppets.get(r[0]);
      const fired = r[4] >= 100; if (fired) r[4] -= 100;
      const faction = FACTIONS[Math.floor(r[4] / 10)] ?? 'concord';
      if (!a) { a = g.actors.spawn({ faction, role: 'rifle', x: r[1] / 10, z: r[2] / 10, puppet: true, duty: 'guard', yaw: r[3] / 10 }); a.tx = a.x; a.tz = a.z; this.puppets.set(r[0], a); }
      a.px = a.tx; a.pz = a.tz; a.tx = r[1] / 10; a.tz = r[2] / 10; a.tyaw = r[3] / 10; a.lerpT = 0;
      const code = r[4] % 10; a.state = ['idle', 'suspicious', 'alert', 'searching', 'burning'][code]; a.burning = code === 4 ? 1 : 0; a.hp = r[5];
      if (fired) { g.audio.at('gun-rifle', a.tx, g.world.land.heightAt(a.tx, a.tz) + 1.4, a.tz, 350, 0.75); a.view?.flashUpper('FireRecoil'); g.ctx.lights.request({ position: [a.tx, g.world.land.heightAt(a.tx, a.tz) + 1.5, a.tz], color: 0xffd090, intensity: 8, radius: 10, lifetime: 0.05, fadeIn: 0, fadeOut: 0.03 }); }
    }
    for (const [id, a] of this.puppets) if (!seen.has(id)) { g.actors.kill(a, { silent: true }); this.puppets.delete(id); }
    for (const r of d.c) { const k = this.cases[r[0]]; if (!k) continue; k.x = r[1]; k.z = r[2]; k.carrier = r[3]; k.banked = r[4] === 1; k.burned = r[4] === 2; k.y = g.world.land.heightAt(k.x, k.z); }
    if (d.fx) for (const f of d.fx) this.fxExplode(f);
  }
  onWorld(d) {
    const fire = this.game.world.fire;
    for (let k = 0; k + 1 < d.f.length; k += 2) { const i = d.f[k], st = d.f[k + 1]; if (st === BURNING) { fire.setCell(i, BURNING); fire.burning.push(i); fire.litCount++; } else { const n = fire.burning.indexOf(i); if (n >= 0) fire.burning.splice(n, 1); fire.setCell(i, BURNT); } }
    for (const x of d.x) this.fxExplode(x);
    for (const e of d.d) { if (e[0] === 'up' && e[1] === this.me) this.upLocal(); }
    for (const e of d.b) if (e[0] === 'bank' && e[2] === this.me) { this.game.audio.play('stone'); this.game.notice(`+${e[3]} STONES`); }
  }
  onExplosion(x, y, z, r, o) { if (this.isHost) this.wQ.x.push([Math.round(x), Math.round(y), Math.round(z), Math.round(r), o?.big ? 1 : 0]); }
  fxExplode([x, y, z, r, big]) { const g = this.game, ctx = g.ctx; ctx.particles.burst('blast', [x, y, z]); ctx.lights.request({ position: [x, y + 2, z], color: 0xffa040, intensity: big ? 70 : 34, radius: big ? 70 : 34, lifetime: 0.4, priority: 5 }); g.audio.at(big ? 'explosion' : 'explosion-small', x, y, z, 500, 1); ctx.engine.shake.add(0.3); void r; }
  queueShot(f, d, w) { this.evQ.push(['s', w, Math.round(f.x * 100), Math.round(f.y * 100), Math.round(f.z * 100), Math.round(d.x * 1000), Math.round(d.y * 1000), Math.round(d.z * 1000)]); }
}
