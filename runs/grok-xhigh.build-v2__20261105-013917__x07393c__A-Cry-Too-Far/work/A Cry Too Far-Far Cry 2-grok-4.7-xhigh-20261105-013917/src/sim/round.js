/** Cash Run. The host owns the cases, the fire and the downs. */

const SPAWNS = [[80, -220], [220, -360], [40, -400], [260, -250]];
const ROUND_CASES = [
  { id: 'r1', x: 120, z: -280, stones: 4 },
  { id: 'r2', x: 180, z: -340, stones: 5 },
  { id: 'r3', x: 90, z: -360, stones: 3 },
  { id: 'r4', x: 200, z: -260, stones: 6 },
  { id: 'r5', x: 150, z: -400, stones: 4 },
  { id: 'r6', x: 250, z: -320, stones: 5 },
];

export class CashRound {
  constructor(world, session) {
    this.world = world;
    this.session = session;
    this.t = 0;
    this.limit = 360;
    this.localDown = false;
    this.finished = false;
    this.truck = { x: 150, z: -160 };
    this.cases = ROUND_CASES.map((c) => ({ ...c, taken: false, carrier: null }));
    const players = session.players || [];
    this.seats = players.map((p, i) => ({
      id: p.id,
      name: String(p.name || 'MERC').toUpperCase().replace(/[^A-Z0-9 .,:;!?'"+=/()[\]%_#&*@<>|\\~^$`-]/g, ''),
      color: p.color,
      hp: 100,
      stones: 0,
      carrying: null,
      down: false,
      bleed: 25,
      revives: 0,
      kills: 0,
      lit: 0,
      downs: 0,
      ai: session.kind === 'hub' ? false : p.id !== session.me,
      x: SPAWNS[i % SPAWNS.length][0],
      z: SPAWNS[i % SPAWNS.length][1],
      yaw: Math.PI,
      reviveT: 0,
      actor: null,
    }));
    this.me = session.server ? null : session.me;
    world.mission = null;
    world.dead = false;
    world.hp = 100;
    world.rescueT = 0;
    world.surgeryT = 0;
    world.burning = 0;
    world.clearBuddies();
    world.guns = [];
    world.giveGun('cane', 100);
    world.giveGun('flare', 100);
    world.giveGun('tractor', 70);
    world.syrettes = 2;
    world.tablets = 0;
    world.feverT = 99999;
    world.feverOn = false;
    world.hour = 16;
    world.windPin = { dir: 0.4, speed: 5 };
    const mine = this.seat(this.me);
    if (mine) world.teleport(mine.x, mine.z);
    for (let i = 0; i < 8; i++) {
      world.spawnSoldier({ x: 130 + (i % 4) * 14, z: -300 - Math.floor(i / 4) * 12, faction: i % 2 ? 'harvest' : 'concord' });
    }
    for (const s of this.seats) {
      if (s.id === this.me) continue;
      const actor = world.spawnSoldier({ id: 'merc-' + s.id, x: s.x, z: s.z, faction: 'merc' });
      actor.kind = 'merc';
      actor.seat = s.id;
      actor.hp = 100;
      s.actor = actor;
    }
  }

  seat(id) {
    return this.seats.find((s) => s.id === id) || null;
  }

  noteDown() {
    const s = this.seat(this.me);
    if (!s || s.down) return;
    this.downSeat(s);
    this.localDown = true;
    this.world.hp = 0;
    this.world.dead = false;
  }

  downSeat(s) {
    if (!s || s.down) return;
    s.down = true;
    s.hp = 0;
    s.downs += 1;
    s.bleed = 25;
    s.reviveT = 0;
    if (s.carrying) this.drop(s);
    if (s.actor) s.actor.hp = 0;
  }

  drop(s) {
    const c = this.cases.find((item) => item.id === s.carrying);
    if (c) {
      c.carrier = null;
      c.x = s.x;
      c.z = s.z;
    }
    s.carrying = null;
    if (s.id === this.me) this.world.carrying = null;
  }

  hurtSeat(id, dmg) {
    const s = this.seat(id);
    if (!s || s.down) return;
    s.hp = Math.max(0, s.hp - dmg);
    if (s.actor) s.actor.hp = s.hp;
    if (s.hp <= 0) {
      this.downSeat(s);
      if (s.id === this.me) {
        this.localDown = true;
        this.world.hp = 0;
      }
    }
  }

  revive(s, by) {
    s.down = false;
    s.hp = 60;
    s.bleed = 25;
    s.reviveT = 0;
    if (s.actor) {
      s.actor.hp = 60;
      s.actor.alive = true;
    }
    if (by) by.revives += 1;
    if (s.id === this.me) {
      this.localDown = false;
      this.world.hp = 60;
      this.world.dead = false;
    }
  }

  respawn(s) {
    const i = this.seats.indexOf(s);
    s.x = SPAWNS[i % SPAWNS.length][0];
    s.z = SPAWNS[i % SPAWNS.length][1];
    this.revive(s, null);
    s.hp = 100;
    if (s.id === this.me) {
      this.world.hp = 100;
      this.world.teleport(s.x, s.z);
    }
  }

  tryUse(world) {
    const s = this.seat(this.me);
    if (!s || s.down) return false;
    const p = world.feet();
    const input = world.ctx.input;
    const held = input.isDown('KeyE') || input.isDown('PadSquare');
    if (s.carrying && Math.hypot(this.truck.x - p.x, this.truck.z - p.z) < 6) {
      const c = this.cases.find((item) => item.id === s.carrying);
      const stones = c ? c.stones : 1;
      s.stones += stones;
      world.stones += stones;
      world.ledger.stonesEarned += stones;
      if (c) {
        c.taken = true;
        c.carrier = null;
      }
      s.carrying = null;
      world.carrying = null;
      return true;
    }
    for (const other of this.seats) {
      if (other.id === s.id || !other.down) continue;
      if (Math.hypot(other.x - p.x, other.z - p.z) < 3 && held) {
        other.reviveT += 1 / 60;
        if (other.reviveT >= 3) this.revive(other, s);
        return true;
      }
    }
    if (!s.carrying) {
      const c = this.cases.find((item) => !item.taken && item.carrier == null && Math.hypot(item.x - p.x, item.z - p.z) < 2.6);
      if (c) {
        c.carrier = s.id;
        s.carrying = c.id;
        world.carrying = c;
        return true;
      }
    }
    return false;
  }

  think(s, dt) {
    if (s.down) {
      s.bleed -= dt;
      if (s.bleed <= 0) this.respawn(s);
      return;
    }
    const downed = this.seats.find((o) => o.down && Math.hypot(o.x - s.x, o.z - s.z) < 18);
    let tx = this.truck.x;
    let tz = this.truck.z;
    if (downed) {
      tx = downed.x;
      tz = downed.z;
      if (Math.hypot(tx - s.x, tz - s.z) < 2.2) {
        downed.reviveT += dt;
        if (downed.reviveT >= 3) this.revive(downed, s);
        return;
      }
    } else if (!s.carrying) {
      let best = null;
      let bd = 1e9;
      for (const c of this.cases) {
        if (c.taken || c.carrier != null) continue;
        const d = Math.hypot(c.x - s.x, c.z - s.z);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (best && bd < 2.4) {
        best.carrier = s.id;
        s.carrying = best.id;
        return;
      }
      if (best) {
        tx = best.x;
        tz = best.z;
      }
    }
    const dx = tx - s.x;
    const dz = tz - s.z;
    const len = Math.hypot(dx, dz) || 1;
    const step = Math.min(len, 3.2 * dt);
    s.x += (dx / len) * step;
    s.z += (dz / len) * step;
    if (s.carrying && Math.hypot(this.truck.x - s.x, this.truck.z - s.z) < 4) {
      const c = this.cases.find((item) => item.id === s.carrying);
      s.stones += c ? c.stones : 1;
      if (c) {
        c.taken = true;
        c.carrier = null;
      }
      s.carrying = null;
    }
  }

  tick(dt) {
    if (this.finished) return;
    this.t += dt;
    const s = this.seat(this.me);
    if (s && !s.down) {
      const p = this.world.feet();
      s.x = p.x;
      s.z = p.z;
      s.hp = this.world.hp;
      s.yaw = this.world.ctx.camera.yaw || 0;
    } else if (s && s.down) {
      s.bleed -= dt;
      if (s.bleed <= 0) this.respawn(s);
    }
    for (const seat of this.seats) {
      if (seat.ai) this.think(seat, dt);
      if (seat.actor) {
        seat.actor.x = seat.x;
        seat.actor.z = seat.z;
        seat.actor.alive = !seat.down;
        seat.actor.hp = seat.hp;
      }
    }
    if (this.session.isHost && this.session.kind !== 'hub' && this.t >= this.limit) this.finish('time');
  }

  applyClient(msg) {
    if (!msg || msg.t !== 'me') return;
    const s = this.seat(msg.id);
    if (!s || s.id === this.me) return;
    s.x = msg.x;
    s.z = msg.z;
    s.yaw = msg.yaw || 0;
    if (msg.carrying && !s.carrying) {
      const c = this.cases.find((item) => item.id === msg.carrying && !item.taken);
      if (c && c.carrier == null) {
        c.carrier = s.id;
        s.carrying = c.id;
      }
    }
  }

  snapshot() {
    const spark = this.world.linkSpark || null;
    this.world.linkSpark = null;
    return {
      t: 's',
      time: Math.round(this.t * 10) / 10,
      seats: this.seats.map((s) => [s.id, Math.round(s.x), Math.round(s.z), Math.round(s.hp), s.stones, s.down ? 1 : 0, s.carrying || 0]),
      cases: this.cases.map((c) => [c.id, c.taken ? 1 : 0, c.carrier == null ? -1 : c.carrier]),
      fire: this.world.fire.litByPlayer,
      spark,
    };
  }

  applySnapshot(msg) {
    if (!msg || msg.t !== 's') return;
    if (typeof msg.time === 'number') this.t = msg.time;
    for (const row of msg.seats || []) {
      const s = this.seat(row[0]);
      if (!s || s.id === this.me) continue;
      s.x = row[1];
      s.z = row[2];
      s.hp = row[3];
      s.stones = row[4];
      s.down = !!row[5];
      s.carrying = row[6] || null;
    }
    for (const row of msg.cases || []) {
      const c = this.cases.find((item) => item.id === row[0]);
      if (!c) continue;
      c.taken = !!row[1];
      c.carrier = row[2] < 0 ? null : row[2];
    }
    if (msg.spark) this.world.fire.ignite(msg.spark.x, msg.spark.z, msg.spark.r || 1);
  }

  finish(reason) {
    if (this.finished || !this.session.isHost) return;
    this.finished = true;
    const buckets = new Map();
    for (const s of this.seats) {
      const list = buckets.get(s.stones) || [];
      list.push(s.id);
      buckets.set(s.stones, list);
    }
    const standings = [...buckets.entries()].sort((a, b) => b[0] - a[0]).map(([, ids]) => ids);
    const scores = {};
    const stats = {};
    for (const s of this.seats) {
      scores[s.id] = s.stones;
      stats[s.id] = { Stones: s.stones, Downs: s.downs, Revives: s.revives, Kills: s.kills };
    }
    const awards = [];
    const byRev = [...this.seats].sort((a, b) => b.revives - a.revives)[0];
    const byStones = [...this.seats].sort((a, b) => b.stones - a.stones)[0];
    const byLit = [...this.seats].sort((a, b) => b.lit - a.lit)[0];
    if (byRev && byRev.revives > 0) awards.push({ id: byRev.id, title: 'Last Friend', detail: 'Most revives' });
    if (byStones) awards.push({ id: byStones.id, title: 'Paid in Full', detail: 'Most stones' });
    if (byLit && byLit.lit > 0) awards.push({ id: byLit.id, title: 'Arsonist', detail: 'Most grass lit' });
    this.session.finish({ standings, scores, stats, awards, reason });
  }
}
