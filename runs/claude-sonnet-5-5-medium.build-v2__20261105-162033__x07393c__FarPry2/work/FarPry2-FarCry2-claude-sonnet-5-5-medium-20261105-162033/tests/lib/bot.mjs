// A bot that plays through the real input layer: keys, aim, holds; it teleports only between objectives.
export class Bot {
  constructor(e, g) { this.e = e; this.g = g; g.godMode = true; }
  step(n = 1) { this.e.step(n); }
  tp(x, z, yaw = 0) { this.g.player.teleport(x, z, yaw); this.step(8); }
  press(code, frames = 3) { this.e.input.setKey(code, true); this.step(frames); this.e.input.setKey(code, false); this.step(2); }
  hold(code, frames) { this.e.input.setKey(code, true); this.step(frames); this.e.input.setKey(code, false); this.step(1); }
  until(cond, max = 3000, stride = 10) { for (let i = 0; i < max; i += stride) { if (cond()) return true; this.step(stride); } return cond(); }
  aim(x, y, z) { const f = this.g.player.feet, dx = x - f.x, dz = z - f.z, c = this.g.ctx.camera; c.yaw = Math.atan2(-dx, -dz); c.pitch = Math.atan2(y - (f.y + 1.55), Math.hypot(dx, dz)); this.step(2); }
  skipTalk(max = 6000) { return this.until(() => { if (this.g.dialogueOn) { this.press('Enter', 2); return false; } return !this.g.ui.screen || this.g.ui.screen.id === 'ending'; }, max, 6); }
  ignoreAlt() { if (this.waitChoice(1300)) this.choose(1); this.step(5); }
  choose(i) { this.step(5); for (let k = 0; k < i; k++) this.press('ArrowDown', 2); this.press('Enter', 2); }
  waitChoice(max = 4000) { return this.until(() => this.g.ui.screen && this.g.ui.screen.id === 'choice', max, 8); }
  /** use the nearest interactable of a kind: stand beside it and press Use (hold for hold-to-use) */
  use(kind, holdFrames = 3) { const it = this.g.sitesSys.interactables.find((q) => q.kind === kind); this.tp(it.x + 1.2, it.z + 1.2); this.aim(it.x, this.g.world.heightAt(it.x, it.z) + 1, it.z); this.step(5); this.hold('KeyE', holdFrames); this.step(3); }
  fire(frames = 8) { const gs = this.g.weapons.gunState(); for (let i = 0; i < 5 && gs && gs.jammed; i++) { this.press('KeyR', 2); this.step(45); } this.hold('MouseLeft', frames); }
  drive(v, x, z, max = 1800) {
    const g = this.g; let stuck = 0, last = 0;
    for (let i = 0; i < max; i += 6) {
      const dx = x - v.pos.x, dz = z - v.pos.z, d = Math.hypot(dx, dz); if (d < 26) { this.e.input.setKey('KeyW', false); this.e.input.setKey('KeyA', false); this.e.input.setKey('KeyD', false); return true; }
      let err = Math.atan2(dx, dz) - v.yaw; while (err > Math.PI) err -= 6.283; while (err < -Math.PI) err += 6.283;
      this.e.input.setKey('KeyW', true); this.e.input.setKey('KeyA', err < -0.12); this.e.input.setKey('KeyD', err > 0.12);
      this.step(6); if (Math.abs(v.speed()) < 1.5) { stuck += 6; } else stuck = 0;
      if (stuck > 90) { v.v.reset([v.pos.x + dx / d * 6, g.world.heightAt(v.pos.x, v.pos.z) + 1.4, v.pos.z + dz / d * 6], v.yaw); stuck = 0; }
    }
    for (const k of ['KeyW', 'KeyA', 'KeyD']) this.e.input.setKey(k, false); return false;
  }
}
