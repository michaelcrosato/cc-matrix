// Two wingmen fly in formation, call out, and shoot the nearest enemy ahead.
import { Vector3 } from 'three/webgpu';
import { wingman, engineGlows } from './models.js';

export class Wingman {
  constructor(game, { name, color, offset, callsign }) {
    this.game = game;
    this.name = name;
    this.callsign = callsign;
    this.offset = new Vector3(...offset);
    this.group = wingman(color);
    game.scene.add(this.group);
    this.glows = engineGlows(this.group);
    this.pos = new Vector3(offset[0], offset[1], offset[2]);
    this.alive = true;
    this.hp = 100;
    this.fireCd = 1 + Math.random();
    this.sway = Math.random() * 10;
  }

  update(dt) {
    const p = this.game.player.pos;
    this.sway += dt;
    if (!this.alive) return;
    const tx = p.x + this.offset.x + Math.sin(this.sway * 0.8) * 1.6;
    const ty = p.y + this.offset.y + Math.cos(this.sway * 0.6) * 0.8;
    const tz = p.z + this.offset.z;
    const k = 1 - Math.exp(-3.5 * dt);
    this.pos.set(this.pos.x + (tx - this.pos.x) * k, this.pos.y + (ty - this.pos.y) * k, tz);
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, 0, (tx - this.pos.x) * 0.2);
    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      this.fireCd = 1 + Math.random() * 0.8;
      this.shoot();
    }
  }

  shoot() {
    let best = null;
    let bestD = 190;
    for (const t of this.game.lockables()) {
      const d = this.pos.distanceTo(t.pos);
      if (t.pos.z < this.pos.z - 10 && d < bestD) {
        bestD = d;
        best = t;
      }
    }
    if (!best) return;
    this.game.fx.beam(this.pos, best.pos, 'player', 0.1, 0.1);
    this.game.audio.sfx('laser');
    if (Math.random() < 0.5) this.game.damageTarget(best, 1, 'wingman', best.pos);
  }

  hurt(dmg) {
    if (!this.alive) return;
    this.hp -= dmg;
    if (this.hp > 0) return;
    this.alive = false;
    this.group.visible = false;
    this.game.fx.explode(this.pos, true);
    this.game.audio.sfx('explode');
    this.game.onWingmanDown(this);
  }
}

