// The Siege and the Foghorn: the demo's signature. 30 Islanders and 4 Bottlers from 1:00, the Flenser at
// 1:30 (you hear the saw first), ladders every 25 s, and the horn after 3:30 or 34 kills.
import { app } from '../../core/app.js';
import { knockLadder, raiseLadder } from '../../data/levels/quay.js';
import { MapInfo } from '../mapPaint.js';
import { S } from '../../data/dialogue.js';

const Q = new MapInfo('quay');
const X = (c) => Q.x(c); const Z = (r) => Q.z(r);

export class SiegeDirector {
  constructor(area) {
    this.area = area;
    this.t = 0;
    this.active = false;
    this.finished = area.run.flag('foghornDone');
    this.spawnedBase = false;
    this.flenser = false;
    this.nextWave = 0;
    this.ladderT = 60;
    this.nextLadder = 0;
    this.killsAtStart = 0;
    this.horn = false;
  }

  /** The crowd round the bonfire, before the cut: 14 Islanders at work. */
  prepare() {
    const { area } = this;
    const center = [29, 21];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const r = 3.2 + (i % 3) * 1.1;
      const x = X(center[0]) + Math.cos(a) * r; const z = Z(center[1]) + Math.sin(a) * r;
      const e = area.spawnEnemy('gaffer', { x, z, state: 'SCRIPT', yaw: Math.atan2(X(center[0]) - x, Z(center[1]) - z), noLoot: i % 2 === 0 });
      e.actor.play('WorkChop', { at: (i % 5) * 0.2 });
    }
  }

  start() {
    const { area } = this;
    this.active = true;
    this.killsAtStart = area.director.killed;
    area.director.maxActiveOverride = null;
    for (const e of area.enemies) if (e.state === 'SCRIPT' && !e.dead) { e.alerted = true; e.enter('ALERT'); }
    // 16 more walk in from the doors over the first minute.
    area.director.queueSpawn('gaffer', 4, '1', { every: 2.5 });
    area.director.queueSpawn('gaffer', 4, '2', { every: 3 });
    area.director.queueSpawn('gaffer', 4, '3', { every: 3.5 });
    area.director.queueSpawn('gaffer', 4, '5', { every: 4 });
    area.run.setFlag('siegeStarted');
  }

  get kills() { return this.area.director.killed - this.killsAtStart; }

  step(dt) {
    if (!this.active || this.finished) return;
    const { area } = this;
    this.t += dt;
    if (this.t >= 60 && !this.spawnedBase) {
      this.spawnedBase = true;
      area.director.queueSpawn('bottler', 2, '4', { every: 2 });
      area.director.queueSpawn('bottler', 2, '1', { every: 3 });
      area.director.queueSpawn('netwife', 2, '3', { every: 2 });
    }
    if (this.t >= 90 && !this.flenser) {
      this.flenser = true;
      const e = area.director.spawnAtDoor('flenser', '2', {});
      area.siegeFlenser = e;
      area.ctx.audio.play('sawRev', { volume: 0.5 });
    }
    // Raised ladders at 1:00, then every 25 s.
    if (this.t >= this.ladderT) {
      this.ladderT += 25;
      const L = area.outsideLadders[this.nextLadder % area.outsideLadders.length];
      this.nextLadder++;
      raiseLadder(area, L);
    }
    // Horn after 3:30 or 34 kills, whichever first. Never leave the player waiting.
    if ((this.t >= 210 || this.kills >= 34) && !this.horn) this.foghorn();
  }

  foghorn() {
    const { area } = this;
    const { ctx } = area;
    this.horn = true;
    this.active = false;
    area.director.queue.length = 0;
    for (const L of area.outsideLadders) if (L.up) knockLadder(area, L);
    area.setObjective('');
    app.mix.cut();
    area.setMusic(null);
    for (const k of Object.values(area.loops)) k.set({ volume: 0 });
    ctx.audio.play('foghorn');
    ctx.engine.shake.add(0.8);
    area.rumble(1, 1, 1200);
    ctx.particles.burst('gullUp', [X(57), 8, Z(7)], { count: 40 });
    ctx.particles.burst('gullUp', [X(29), 5, Z(18)], { count: 16 });
    // Everyone stops. Tools fall. They turn, and walk, and wade in.
    const alive = area.enemies.filter((e) => !e.dead);
    const P = area.player;
    if (P.grabbedBy) P.releaseGrab();
    P.invuln = 99;
    area.quietBarks = true;
    alive.forEach((e, i) => {
      if (e.type === 'flenser') { e.walkToSea(3.2); return; }
      e.walkToSea(0.6 + ((i * 0.37) % 2.2));
    });
    const onShore = alive.filter((e) => e.type !== 'limpet')[0] ?? null;
    const cx = P.x; const cz = P.z;
    const wide = [[X(44), 9, Z(14)], [X(52), 1, Z(16)], 42];
    const script = [
      { cam: [[cx + 2, 2, cz + 3], [X(57), 12, Z(7)], 38], to: [[cx + 1.6, 2.2, cz + 2.4], [X(57), 12, Z(7)]] },
      { wait: 3.6 },
      { cam: [[X(46), 2.2, Z(30)], [X(53), 0.2, Z(22)], 34], to: [[X(46), 2.4, Z(27)], [X(53), 0.2, Z(19)]] },
      { wait: 4 },
      { cam: wide, to: [[X(46), 10, Z(19)], [X(52), 0.8, Z(26)]] },
      { wait: 4 },
      { cue: () => ctx.audio.play('tannoyOn', { volume: 0.5 }) },
      { say: S.foghornA[0], hold: 1.2 },
      { cam: [[cx + 1, 1.6, cz + 1.4], [cx, 1.5, cz], 30] },
      { cue: () => { for (const e of area.enemies) if (!e.dead && e.state === 'SEA') e.dieQuiet(); } },
      { say: S.foghornB[0] },
      { say: S.foghornB[1], hold: 1.6 },
    ];
    area.startCutscene(script, {
      live: true,
      onEnd: () => {
        for (const e of [...area.enemies]) if (!e.dead && e.state === 'SEA') e.dieQuiet();
        for (const k of Object.values(area.loops)) k.set({ volume: 0.4 });
        area.quietBarks = false;
        P.invuln = 0;
        this.finished = true;
        area.run.setFlag('foghornDone');
        area.openGateAt(0, 8);
      },
    });
  }
}
