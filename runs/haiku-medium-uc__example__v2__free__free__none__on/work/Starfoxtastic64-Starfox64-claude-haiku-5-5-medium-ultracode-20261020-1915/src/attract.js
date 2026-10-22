// Attract-mode pilot: a simple autopilot that flies stages on the title screen.
// It cheats (god mode is set by the game) and only exists to show off the stage.
import { clamp } from './util.js';

export class AttractPilot {
  constructor(rand = Math.random) {
    this.rand = rand;
    this.t = 0;
    this.cycle = 0;
    this.lastBomb = -99;
    this.lastRoll = -99;
    this.rollDir = 1;
  }

  // Same shape as Input.gameControls(), so the game does not care who is flying.
  controls(game, dt) {
    const p = game.player;
    this.t += dt;
    this.cycle += dt;

    // Aim at the closest threat ahead; otherwise drift back toward the centre line.
    let tx = 0;
    let ty = 0;
    let best = null;
    let bestD = Infinity;
    for (const e of game.enemies) {
      if (!e.alive || e.type === 'asteroid') continue;
      const ahead = e.s - p.s;
      if (ahead < -30 || ahead > 260) continue;
      const d = Math.abs(e.lx - p.px) + Math.abs(e.ly - p.py) + ahead * 0.2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (game.boss && game.boss.alive && game.boss.dying === 0) {
      const b = game.boss;
      if (b.core.alive && !b.podsAlive) {
        tx = b.bx;
        ty = b.by;
      } else {
        const open = b.pods.find((pod) => pod.alive) || b.top;
        const off = open.offset;
        tx = b.bx + off.x;
        ty = b.by + off.y;
      }
    } else if (best) {
      tx = best.lx;
      ty = best.ly;
    }
    const ax = clamp((tx - p.px) * 0.9, -1, 1);
    const ay = clamp((ty - p.py) * 0.9, -1, 1);

    // Hold fire for a beat to build a lock, release to launch the volley, repeat.
    const fire = this.cycle % 2.4 < 1.6;

    // Nova bomb when a crowd builds up ahead.
    const crowd = game.enemies.filter((e) => e.alive && e.s > p.s && e.s < p.s + 500).length;
    const bomb = crowd >= 6 && p.bombs > 0 && this.t - this.lastBomb > 4;
    if (bomb) this.lastBomb = this.t;

    // Occasional barrel roll so the deflection gets shown.
    let rollL = false;
    let rollR = false;
    if (this.t - this.lastRoll > 5.5 && !p.rolling) {
      this.lastRoll = this.t;
      this.rollDir = this.rand() < 0.5 ? -1 : 1;
      if (this.rollDir < 0) rollL = true;
      else rollR = true;
    }

    return {
      ax,
      ay,
      fire,
      fireEdge: fire && this.cycle % 2.4 < dt * 1.5,
      bomb,
      boost: !!best && best.s - p.s > 200,
      brake: false,
      rollL,
      rollR,
      pause: false,
    };
  }
}
