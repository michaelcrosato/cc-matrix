// The parts of a mission step that need help: uses, spawns, targets, holds and talk.
import { siteById } from '../content/sites.js';
import { dist2 } from '../world/geom.js';
import { SCRIPTS } from './scripts.js';
const g2 = (id) => ({ odile: 'SISTER ODILE', tibor: 'TIBOR', vance: 'COL. VANCE', ansa: 'MOTHER ANSA', harrow: 'HARROW', bakr: 'OLD BAKR' })[id] ?? id.toUpperCase();
export class StepsPart {
  addUse(s) {
    const g = this.game; let x, z;
    if (s.at.length === 3) { const site = siteById[s.at[2]]; x = site.at[0] + s.at[0]; z = site.at[1] + s.at[1]; } else { x = s.at[0]; z = s.at[1]; }
    const u = { x, z, y: g.world.land.heightAt(x, z) + 1, label: s.label, hold: s.hold ?? 0, r: 3.2, anyAngle: true, tag: s.tag, fn: () => { g.prompt.missionUse = g.prompt.missionUse.filter((o) => o !== u); if (s.onDone) SCRIPTS[s.onDone]?.run?.(g, s); this.st.used = true; } };
    g.prompt.missionUse.push(u);
  }
  spawnFor(sp) {
    const g = this.game;
    if (sp.vehicle) { if (!g.vehicles.list.some((v) => v.tag === sp.tag)) g.vehicles.spawn(sp.vehicle, sp.at[0], sp.at[1], (sp.yaw * Math.PI) / 180, sp.tag); }
    if (sp.pickup === 'gun') g.spawnGunPickup(sp.gun, sp.cond, sp.at[0], sp.at[1], sp.tag);
  }
  /** Where the current step wants you. */
  target() {
    const s = this.step; if (!s) return null;
    const g = this.game;
    if (s.at && s.at.length === 3) { const site = siteById[s.at[2]]; return [site.at[0] + s.at[0], site.at[1] + s.at[1]]; }
    if (s.at) return s.at;
    if (s.to && g.people.npcs[s.to]) return [g.people.npcs[s.to].x, g.people.npcs[s.to].z];
    if (s.site) return siteById[s.site].at;
    if (s.do === 'steal') { const v = g.vehicles.list.find((o) => o.tag === s.tag); if (v) return [v.x, v.z]; }
    if (s.do === 'collect') { const q = g.prompt.pickups.find((o) => o.tag === s.tag); if (q) return s.tag === 'payroll-case' ? null : [q.x, q.z]; }
    return this.st.target ?? null;
  }
  tickHold(s, dt) {
    const g = this.game, site = siteById[s.site], at = s.at ?? site.at, p = g.player;
    const inside = dist2(at[0], at[1], p.x, p.z) < s.r;
    if (inside) this.st.left -= dt;
    this.st.waveT -= dt;
    if (this.st.waveT <= 0) { this.st.waveT = 16; g.spawnWave(at, s.waves); }
    if (s.site === 'mile-forty') { // Under the guns: both sets.
      this.st.shellT = (this.st.shellT ?? 3) - dt;
      if (this.st.shellT <= 0) { this.st.shellT = this.rng.range(5, 10); const a = this.rng.range(0, 6.283), r = this.rng.range(22, 48), x = at[0] + Math.cos(a) * r, z = at[1] + Math.sin(a) * r; g.audio.play('bullet-whip', { volume: 0.6 }); g.combat.explode(x, g.world.land.heightAt(x, z) + 0.5, z, 6, 60, null, { fire: 3, big: true, shell: true }); this.st.shells = (this.st.shells ?? 0) + 1; g.story.shellsFell = (g.story.shellsFell ?? 0) + 1; }
    }
    g.hud.holdTimer = inside ? this.st.left : null;
    if (this.st.left <= 0) { g.hud.holdTimer = null; return true; }
    return false;
  }
  ensureTalk(s) {
    const g = this.game;
    if (this.st.talkAdded) return; this.st.talkAdded = true;
    this.st.talkFn = () => { const alt = this.altTaken && s.linesAlt ? s.linesAlt : s.lines; g.talk.startScene({ lines: [alt], speaker: s.to, onDone: () => { this.st.talked = true; } }); };
  }
  /** The talk step's prompt, if this is the npc it wants. */
  talkStep(id) { const s = this.step; if (s && (s.do === 'talk' || s.do === 'report') && s.to === id && this.st.talkFn) return { label: `TALK TO ${g2(id)}`, fn: this.st.talkFn }; return null; }
}
