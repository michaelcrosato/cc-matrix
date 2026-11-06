// A bot that plays with the real action layer: keys, buttons and the same steps a player sees.
export class Bot {
  constructor(e, game) { this.e = e; this.g = game; this.i = e.input; }
  step(n = 1) { this.e.step(n); }
  key(code, frames = 2) { this.i.setKey(code, true); this.e.step(frames); this.i.setKey(code, false); this.e.step(1); }
  hold(code, seconds) { this.i.setKey(code, true); this.e.step(Math.ceil(seconds * 60)); this.i.setKey(code, false); this.e.step(1); }
  dismissScene(maxFrames = 6000) { let n = 0; while (((this.g.talk.scene && !this.g.talk.scene.choosing) || this.g.scenes.locks) && n < maxFrames) { this.key('Enter', 1); n += 2; } return !this.g.talk.scene || this.g.talk.scene.choosing; }
  choose(i) { const s = this.g.talk.scene; if (!s?.choosing) return false; s.focusI = i; this.key('Enter', 1); return true; }
  to(x, z) { this.g.dev.teleport(x, z); this.e.step(2); }
  look(x, y, z) { this.g.player.lookAt(x, y, z); this.e.step(1); }
  /** Stand beside a thing, face it and press or hold Use. */
  use(x, z, y, hold = 0) {
    const g = this.g;
    this.waitFor(() => !g.frozen, 5);
    if (g.player.vehicle) this.exit();
    this.to(x + 1.1, z + 0.7); this.look(x, y ?? g.world.land.heightAt(x, z) + 1, z); this.e.step(10);
    if (hold) this.hold('KeyE', hold + 0.2); else this.key('KeyE', 2);
    this.e.step(3);
  }
  exit() { if (this.g.player.vehicle) { this.key('KeyE', 2); this.e.step(2); } }
  talkTo(id) { this.waitFor(() => !this.g.frozen, 5); const n = this.g.people.npcs[id]; this.g.player.vehicle && this.exit(); this.to(n.x + 1, n.z + 1); this.look(n.x, n.y + 1.5, n.z); this.e.step(10); this.key('KeyE', 2); this.e.step(2); this.dismissScene(); }
  accept() { return this.choose(0); }
  waitFor(fn, seconds = 60) { let f = 0; const max = seconds * 60; while (!fn() && f < max) { this.e.step(1); f++; } return fn(); }
  waitStep(id, seconds = 60) { return this.waitFor(() => this.g.missions.step?.script === id || this.g.missions.step?.do === id, seconds); }
  /** Press fire at a point, a few rounds. */
  shootAt(x, y, z, shots = 3) { for (let k = 0; k < shots; k++) { this.look(x, y, z); this.i.setKey('MouseLeft', true); this.e.step(2); this.i.setKey('MouseLeft', false); this.e.step(14); } }
  /** Kill a target with real shots: walks into range. */
  killNear(pred, seconds = 40) {
    const g = this.g; let f = 0; const max = seconds * 60;
    while (f < max) {
      const list = g.actors.list.filter((a) => a.alive && pred(a)); if (!list.length) return true;
      list.sort((u, v) => (u.stationary ? 1 : 0) - (v.stationary ? 1 : 0)); const a = list[0]; const d = Math.hypot(a.x - g.player.x, a.z - g.player.z);
      if (a.stationary ? d > 45 || d < 25 : d > 22) { const k = a.stationary ? 30 : 8; this.to(a.x + k, a.z + k * 0.4); f += 3; } // Never exactly 45 degrees to a tower: its corner posts are in the way there.
      this.look(a.x, a.y + 1.2, a.z); this.i.setKey('MouseLeft', true); this.e.step(3); this.i.setKey('MouseLeft', false); this.e.step(5); f += 8;
      if (!g.player.guns.main) g.combat.give('tractor', 90, true);
      const gun = g.combat.current(); if (gun?.jammed) { this.key('KeyR', 2); this.e.step(50); f += 50; }
      if (gun && gun.mag <= 0) { gun.reserve = 60; this.key('KeyR', 2); this.e.step(130); f += 130; }
    }
    return false;
  }
}
