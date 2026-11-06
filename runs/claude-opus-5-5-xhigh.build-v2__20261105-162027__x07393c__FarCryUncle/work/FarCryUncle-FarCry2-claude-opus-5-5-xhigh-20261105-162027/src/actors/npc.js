// People who stand where they stand: the givers, Tibor, Bakr, buddies at the bar.
import { makePerson } from './rig.js';
import { SITES } from '../content/sites.js';
const IDLE = { odile: 'SmokeIdle', tibor: 'Shrug', bakr: 'Idle', vance: 'CleanRifleIdle', ansa: 'TeachPoint', harrow: 'WriteAtDesk', ines: 'Idle', dov: 'Idle', mags: 'Idle' };
export class Npc {
  active = true;
  constructor(game, who, x, z, yaw) { this.game = game; this.who = who; this.x = x; this.z = z; this.yaw = yaw; this.y = game.world.heightAt(x, z); }
  build(ctx) {
    const g = this.game;
    if (!g.views) return;
    const p = makePerson(this.who);
    this.view = p;
    p.object.position.set(this.x, this.y, this.z);
    p.object.rotation.y = (this.yaw * Math.PI) / 180;
    ctx.scene.add(p.object);
    p.anim.set(IDLE[this.who] ?? 'Idle');
    p.anim.mixer.update(0.01);
  }
  place(x, z, yawDeg) { this.x = x; this.z = z; this.y = this.game.world.heightAt(x, z); if (this.view) { this.view.object.position.set(x, this.y, z); if (yawDeg != null) this.view.object.rotation.y = (yawDeg * Math.PI) / 180; } }
  setActive(v) { this.active = v; if (this.view) this.view.object.visible = v; }
  play(name) { this.view?.anim.set(name); }
  head() { return [this.x, this.y + 1.55, this.z]; }
  update(ctx, dt) {
    if (!this.active || !this.view) return;
    const cam = this.game.camPos;
    if (Math.hypot(this.x - cam.x, this.z - cam.z) < 90) this.view.anim.update(dt);
  }
}
export class Npcs {
  byWho = {};
  constructor(game) { this.game = game; }
  build(ctx) {
    const g = this.game;
    for (const site of Object.values(SITES)) {
      for (const n of site.npcs ?? []) {
        const npc = new Npc(g, n.who, site.at[0] + n.dx, site.at[1] + n.dz, n.yaw);
        npc.build(ctx);
        npc.siteKey = site.key;
        this.byWho[n.who] = npc;
      }
    }
    // Buddies at the bar, when you have met them.
    const bar = SITES['mile-forty'];
    [['ines', -26, -30, 20], ['dov', -18, -29, -20], ['mags', -38, -15, 80]].forEach(([who, dx, dz, yaw]) => {
      const npc = new Npc(g, who, bar.at[0] + dx, bar.at[1] + dz, yaw);
      npc.build(ctx);
      npc.setActive(false);
      this.byWho[who] = npc;
    });
  }
  update(ctx, dt) { for (const n of Object.values(this.byWho)) n.update(ctx, dt); }
  /** Who is around right now follows the story. */
  sync() {
    const g = this.game;
    for (const id of ['ines', 'dov', 'mags']) {
      const b = g.actors.buddy(id), n = this.byWho[id];
      n.setActive(!!b && b.met && !b.dead && !b.active && g.clock.abs >= b.woundedUntil);
    }
    if (this.byWho.harrow) this.byWho.harrow.setActive(!g.story.flags.harrowDead);
    const truceBroke = !g.story.truce;
    this.byWho.tibor.setActive(!truceBroke);
  }
}
