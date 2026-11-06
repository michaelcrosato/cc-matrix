// What soldiers tell each other: shots heard, fire seen, barks.
import { BARKS } from '../content/dialogue.js';
export class SquadPart {
  hearShot(x, z, radius, faction) {
    for (const a of this.list) {
      if (!a.alive || !a.ctrl || a.friendly || a.burning > 0) continue;
      if (a.state === 'alert') continue;
      if (Math.hypot(a.x - x, a.z - z) < radius) { if (radius >= 30 && Math.hypot(a.x - x, a.z - z) < radius * 0.4) a.provokedBy = true; a.lastKnown = [x, z]; if (a.state === 'idle' || a.state === 'suspicious') { a.state = 'searching'; a.searchT = 20; } }
    }
    void faction;
  }
  fireNear(a) {
    const f = this.game.world.fire, w = this.game.world.wind;
    if (f.burning.length === 0) return false;
    if (f.isBurning(a.x, a.z)) return true;
    for (let d = 5; d <= 15; d += 5) if (f.isBurning(a.x - w.x * d, a.z - w.z * d)) return true;
    return false;
  }
  bark(a, kind, force) {
    if (a.friendly && !a.buddy) return; const set = BARKS[a.faction]?.[kind] ?? BARKS.concord[kind]; if (!set) return;
    if (!force && a.barkT > 0) return; a.barkT = 5;
    if (this.rng.next() > 0.65 && !force) return;
    if (a.buddy) return;
    const p = this.game.player, d = Math.hypot(a.x - p.x, a.z - p.z); if (d > 70) return;
    const text = this.rng.pick(set);
    this.game.audio.voiceAt('soldier', text, a, a.id);
    if (d < 40) this.game.talk.bark('SOLDIER', text);
  }
  barkNearby(a, kind) { for (const o of this.list) if (o.alive && o.faction === a.faction && Math.hypot(o.x - a.x, o.z - a.z) < 30) { this.bark(o, kind); break; } }
}
