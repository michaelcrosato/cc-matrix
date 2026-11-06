import { Standing } from './base.js';
import { medalOf } from '../game/score.js';
import { rng } from '../core/rng.js';
import { DEG } from '../physics/balancer.js';
import { clamp } from './lean.js';

export class Raft extends Standing {
  static id = 'raft';
  static title = 'Tippy Raft';
  static discipline = 'Balance Play';
  static instructor = 'trudy';
  static couch = true;
  static session = false;
  static can = 'Walk, hop, and flail to shove. Last one on the raft takes the round.';
  static cant = 'You cannot win by standing in the middle forever. The raft shrinks, and the sea takes a side.';
  static verbs = ['weight', 'hop', 'flail'];
  static tiers = {
    1: { blurb: 'Best of three. The sea is already choosing.' },
    2: { blurb: 'The swells come a little meaner.' },
    3: { blurb: 'The raft forgets its edges quickly.' },
  };

  constructor(opts = {}) {
    const lanes = opts.lanes && opts.lanes.length >= 2 ? opts.lanes : [
      { id: 0, kind: 'local', x: 0, z: 0, name: 'You' },
      { id: 1, kind: 'bot', x: 3.2, z: 0, skill: 'average', name: 'Kevin' },
      { id: 2, kind: 'bot', x: 6.4, z: 0, skill: 'clumsy', name: 'Paul' },
      { id: 3, kind: 'bot', x: 9.6, z: 0, skill: 'sharp', name: 'Sandra' },
    ];
    super({ ...opts, lanes });
    this.players = this.lanes.map((lane, i) => ({
      x: Math.cos((i / this.lanes.length) * Math.PI * 2) * 1.2,
      z: Math.sin((i / this.lanes.length) * Math.PI * 2) * 1.2,
      vx: 0, vz: 0, out: false, shove: 0, cool: 0,
      skill: lane.kind === 'local' ? (opts.skill || 'sharp') : (['average', 'clumsy', 'average'][i - 1] || 'average'),
    }));
    this.round = 0;
    this.wins = this.lanes.map(() => 0);
    this.radius = 6;
    this.tx = 0;
    this.tz = 0;
    this.vxT = 0;
    this.vzT = 0;
    this.nextSwell = 4;
    this.roundT = 0;
    this.roundTimes = [];
    this.over = false;
    this.label = opts.label ?? 'raft';
    this.god = true;
    this.targetRounds = 3;
  }

  build() { this.buildWorld(8, 20); }

  resetRound() {
    this.radius = 6;
    this.tx = 0;
    this.tz = 0;
    this.vxT = 0;
    this.vzT = 0;
    this.roundT = 0;
    this.nextSwell = 3 + rng(this.label) * 2;
    this.players.forEach((p, i) => {
      const a = (i / this.players.length) * Math.PI * 2;
      p.x = Math.cos(a) * 1.1;
      p.z = Math.sin(a) * 1.1;
      p.vx = 0;
      p.vz = 0;
      p.out = false;
      p.shove = 0;
      p.cool = 0;
    });
  }

  fixed(dt, inputs) {
    if (this.over) return;
    if (this.round === 0 && this.roundT === 0 && this.players.every((p) => p.x === p.x)) {
      if (!this.started) {
        this.resetRound();
        this.started = true;
      }
    }
    this.roundT += dt;
    this.radius = Math.max(2, 6 - this.roundT / 12);
    const alive = this.players.filter((p) => !p.out);
    let px = 0;
    let pz = 0;
    for (const p of alive) { px += p.x; pz += p.z; }
    const K = 6;
    const C = 3.5;
    const W = (K * (14 * DEG)) / 6;
    this.vxT += (W * px - K * this.tx - C * this.vxT) * dt;
    this.vzT += (W * pz - K * this.tz - C * this.vzT) * dt;
    this.tx += this.vxT * dt;
    this.tz += this.vzT * dt;
    const cap = 26 * DEG;
    const mag = Math.hypot(this.tx, this.tz);
    if (mag > cap) {
      this.tx *= cap / mag;
      this.tz *= cap / mag;
    }
    if (this.roundT >= this.nextSwell) {
      const a = rng(this.label) * Math.PI * 2;
      this.vxT += Math.cos(a) * 2.5;
      this.vzT += Math.sin(a) * 2.5;
      this.nextSwell += 5 + rng(this.label) * 2;
    }
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.out) continue;
      const input = inputs[i] || this.botMove(i);
      const wishX = input.wishX || input.x || 0;
      const wishZ = input.wishZ != null ? input.wishZ : -(input.y || 0);
      if (this.states[i] && !this.states[i].fallen) {
        this.states[i].wishX = wishX;
        this.states[i].wishZ = wishZ;
      }
      p.vx += (wishX * 3 - p.vx) * (1 - Math.exp(-dt * 4));
      p.vz += (wishZ * 3 - p.vz) * (1 - Math.exp(-dt * 4));
      p.vx += this.tx * 10 * dt * 8;
      p.vz += this.tz * 10 * dt * 8;
      if (input.hop) { p.vx *= 0.6; p.vz *= 0.6; }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (p.cool > 0) p.cool -= dt;
      if (input.flail && p.cool <= 0) {
        p.cool = 2;
        for (let j = 0; j < this.players.length; j++) {
          if (j === i || this.players[j].out) continue;
          const dx = this.players[j].x - p.x;
          const dz = this.players[j].z - p.z;
          const d = Math.hypot(dx, dz);
          if (d < 1.3 && d > 0.05) {
            this.players[j].vx += (dx / d) * 6;
            this.players[j].vz += (dz / d) * 6;
          }
        }
      }
      p.vx *= Math.exp(-3 * dt * 0.15);
      p.vz *= Math.exp(-3 * dt * 0.15);
      if (Math.hypot(p.x, p.z) > this.radius) p.out = true;
    }
    const still = this.players.map((p, i) => p.out ? -1 : i).filter((i) => i >= 0);
    if (still.length <= 1 || this.roundT > 85) {
      this.roundTimes.push(this.roundT);
      const winner = still[0] ?? 0;
      if (still.length === 1) this.wins[winner] += 1;
      else if (this.roundT > 85 && still.length) {
        let best = still[0];
        for (const i of still) {
          if (Math.hypot(this.players[i].x, this.players[i].z) < Math.hypot(this.players[best].x, this.players[best].z)) best = i;
        }
        this.wins[best] += 1;
      }
      this.round += 1;
      if (this.round >= this.targetRounds) this.over = true;
      else this.resetRound();
    }
    this.stepCores(dt, { margin: 1 });
    if (this.over) this.done = true;
  }

  botMove(i) {
    const p = this.players[i];
    const skill = p.skill;
    const clumsy = skill === 'clumsy';
    const grip = skill === 'sharp' ? 1.6 : skill === 'average' ? 0.85 : 0.2;
    const highX = -Math.sign(this.tx || 0.0001);
    const highZ = -Math.sign(this.tz || 0.0001);
    let x = clamp(-p.x * grip + highX * (clumsy ? 0.9 : 0.15), -1, 1);
    let z = clamp(-p.z * grip + highZ * (clumsy ? 0.9 : 0.15), -1, 1);
    let flail = false;
    if (!clumsy) {
      for (let j = 0; j < this.players.length; j++) {
        if (j === i || this.players[j].out) continue;
        const d = Math.hypot(this.players[j].x - p.x, this.players[j].z - p.z);
        if (d < 1.25 && p.cool <= 0) flail = true;
      }
    } else if (Math.hypot(p.x, p.z) > this.radius * 0.7) {
      x = -Math.sign(p.x) * 0.4;
      z = -Math.sign(p.z) * 0.4;
    }
    return { wishX: x, wishZ: z, flail, hop: false };
  }

  result(i = 0) {
    const won = this.wins[i] || 0;
    const form = clamp(40 + 30 * won, 0, 100);
    const winner = this.wins.indexOf(Math.max(...this.wins));
    return {
      form, raw: won, medal: medalOf(form),
      stats: `${won} rounds · seat ${winner + 1} leads`,
      falls: 0,
      won,
      winner,
      roundTimes: this.roundTimes.slice(),
    };
  }

  botInput(i) {
    const move = this.botMove(i);
    return { x: move.wishX, y: -(move.wishZ || 0), flail: move.flail, hop: false, breathe: false };
  }
}
