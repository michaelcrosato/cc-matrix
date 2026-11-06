/* Serializable, seeded, 120 Hz authority. Rendering never writes this state. */
(function (root) {
  'use strict';
  const A = root.ABJ, F = A.FIELD, dt = A.STEP;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const copy = x => JSON.parse(JSON.stringify(x));
  const NEUTRAL = Object.freeze({ move: 0, fire: false, repair: false });
  const intact = [0x0ff0, 0x3ffc, 0x7ffe, 0xffff, 0xffff, 0xfc3f, 0xf81f, 0xf81f];
  A.INTACT = intact;
  A.segmentBox = function (x0, y0, x1, y1, bx, by, hw, hh) {
    let lo = 0, hi = 1;
    const x = x1 - x0, y = y1 - y0;
    for (const [p, d, min, max] of [[x0, x, bx - hw, bx + hw], [y0, y, by - hh, by + hh]]) {
      if (Math.abs(d) < 1e-9) { if (p < min || p > max) return null; }
      else { let a = (min - p) / d, b = (max - p) / d; if (a > b) [a, b] = [b, a]; lo = Math.max(lo, a); hi = Math.min(hi, b); if (lo > hi) return null; }
    }
    return lo;
  };
  A.enemyPos = (s, e) => [s.formation.x + e.col * 38, s.formation.y + e.row * 22];
  A.bossWindow = s => s.boss && s.boss.cycle % (s.boss.phase === 1 ? 600 : 540) < (s.boss.phase === 1 ? 400 : 330);
  class Sim {
    constructor({ seed = 1979, difficulty = 1, players = [0], demo = false } = {}) {
      this.s = {
        version: 1, tick: 0, rng: seed >>> 0, seed: seed >>> 0, epoch: 0, encounter: -1, location: 0,
        phase: 'intro', phaseTicks: 0, encounterTick: 0, ids: 0, score: 0, reserve: players.length === 1 ? 2 : 4,
        extra: false, assisted: false, demo, won: false, reason: '', tuning: A.defaults(difficulty), difficulty,
        ships: players.map((id, seat) => ({ id, seat, x: players.length === 1 ? 240 : 174 + seat * 132, y: F.shipY, active: true, gone: false, wait: 0, shield: 240, cool: 0, charges: 1, score: 0, repairHeld: false, kills: 0, repairs: 0, caught: 0, deaths: 0, recoil: 0 })),
        bunkers: [80, 186, 294, 400].map((x, i) => ({ id: i, x: x - 24, y: F.bunkerY, rows: intact.slice() })),
        enemies: [], formation: { x: 106, y: 58, dir: 1, beat: 0, clock: 0, initial: 32, reversals: 0 },
        shots: [], pickups: [], attacks: [], saucer: null, nextSaucer: 0, saucers: 0, fireClock: 0, fireCount: 0,
        killCount: 0, boss: null, events: [], eventId: 0, stats: { kills: 0, shots: 0, repairs: 0, drops: 0, catches: 0, armor: 0, saucers: 0, deaths: 0, bossPhases: [], cleared: [] },
        tutorial: { moved: false, fired: false, collected: false, repaired: false }, dev: { invulnerable: false }
      };
      this.startEncounter(0);
    }
    rand() { let a = this.s.rng = (this.s.rng + 0x6d2b79f5) >>> 0; a = Math.imul(a ^ a >>> 15, a | 1); a ^= a + Math.imul(a ^ a >>> 7, a | 61); return ((a ^ a >>> 14) >>> 0) / 4294967296; }
    id() { return ++this.s.ids; }
    emit(type, x = 240, y = 135, extra = {}) { const s = this.s; s.events.push({ id: ++s.eventId, tick: s.tick, type, x, y, ...extra }); if (s.events.length > 80) s.events.shift(); }
    snapshot() { return copy(this.s); }
    startEncounter(n, phase = 1) {
      const s = this.s;
      s.encounter = n; s.epoch++; s.location = Math.min(2, Math.floor(n / 2));
      s.encounterTick = 0; s.phase = 'intro'; s.phaseTicks = n === 0 ? 300 : 240; s.shots = []; s.pickups = []; s.attacks = []; s.saucer = null; s.boss = null;
      s.fireClock = 380; s.fireCount = 0; s.enemies = [];
      for (const p of s.ships) if (p.active) { p.shield = Math.max(p.shield, 240); p.cool = 0; }
      if (n < 6) {
        const w = A.WAVES[n]; s.formation = { x: 106, y: w.y, dir: 1, beat: 0, clock: 0, initial: 0, reversals: 0 };
        w.rows.forEach((r, row) => [...r].forEach((ch, col) => { if (ch !== '.') s.enemies.push({ id: this.id(), col, row, type: ch, hp: ch === 'A' ? 2 : 1, hit: 0, attack: 0 }); }));
        s.formation.initial = s.enemies.length; s.nextSaucer = Math.round(w.saucer * 120);
        this.emit('alert', 240, 144, { text: w.intro });
      } else {
        s.boss = { x: 240, y: 76, phase, left: phase === 1 ? 7 : 0, right: phase === 1 ? 7 : 0, core: s.tuning.bossHealth, maxCore: s.tuning.bossHealth, cycle: 0, hurt: 0, volley: 0 };
        s.stats.bossPhases.push(phase); s.nextSaucer = 1200;
        this.emit('boss-entry', 240, 76, { text: phase === 1 ? 'THE BIG RUDE. BREAK BOTH BLUE EMITTERS.' : 'CORE EXPOSED. WATCH THE LANES.' });
      }
    }
    marchInterval() {
      const s = this.s, ratio = s.enemies.length / Math.max(1, s.formation.initial);
      return s.tuning.march * A.WAVES[Math.min(5, s.encounter)].pace * (.14 + .86 * Math.pow(ratio, .8));
    }
    moveFormation() {
      const s = this.s, f = s.formation;
      if (!s.enemies.length) return;
      f.clock += dt;
      if (f.clock + 1e-9 < this.marchInterval()) return;
      f.clock = 0; f.beat++;
      const xs = s.enemies.map(e => e.col * 38);
      const min = Math.min(...xs), max = Math.max(...xs), next = f.x + f.dir * 5;
      if (next + min - 8 < F.left || next + max + 8 > F.right) {
        f.dir *= -1; f.y += s.tuning.descent; f.reversals++; this.emit('descend', f.x, f.y);
      } else f.x = next;
      this.emit('march', f.x, f.y, { beat: f.beat, remaining: s.enemies.length });
      if (s.enemies.some(e => A.enemyPos(s, e)[1] + 7 >= F.breach)) this.end(false, 'BREACH');
    }
    bunkerHit(b, x, y, friendly, broad) {
      let count = 0;
      const cx = Math.floor((x - b.x) / 3), cy = Math.floor((y - b.y) / 3), radius = broad ? 3.1 : friendly ? 1.3 : 1.9;
      for (let ry = 0; ry < 8; ry++) for (let rx = 0; rx < 16; rx++) {
        const dx = rx - cx, dy = ry - cy;
        if (dx * dx + dy * dy <= radius * radius && (b.rows[ry] & (1 << rx))) { b.rows[ry] &= ~(1 << rx); count++; }
      }
      if (count) this.emit('erosion', x, y, { count, bunker: b.id, friendly });
    }
    repairTarget(p) {
      const s = this.s;
      const candidates = s.bunkers.map(b => ({ b, d: Math.abs(p.x - b.x - 24) })).sort((a, b) => a.d - b.d || a.b.id - b.b.id);
      // Always select the nearest footprint, including one which has been totally destroyed.
      const b = candidates[0].b;
      const cells = [];
      for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) {
        const bit = 1 << col, x = b.x + col * 3 + 1.5;
        if (!(intact[row] & bit) || (b.rows[row] & bit)) continue;
        if (s.ships.some(q => q.active && !q.gone && q.x >= b.x && q.x <= b.x + 48 && Math.abs(q.x - x) < 2.3)) continue;
        cells.push({ row, col, priority: Math.abs(x - clamp(p.x, b.x, b.x + 48)) * .8 + (7 - row) * .5 });
      }
      cells.sort((a, b) => a.priority - b.priority || a.row - b.row || a.col - b.col);
      return { bunker: b.id, cells, usable: p.active && p.charges > 0 && cells.length > 0 };
    }
    repair(p) {
      const s = this.s, target = this.repairTarget(p);
      if (!target.usable) { this.emit('no-repair', p.x, p.y, { player: p.id, text: !p.charges ? 'CATCH GOLD SALVAGE' : 'COVER ALREADY SOUND' }); return false; }
      const b = s.bunkers[target.bunker], cells = target.cells.slice(0, Math.round(s.tuning.repairYield));
      for (const c of cells) b.rows[c.row] |= 1 << c.col;
      p.charges--; p.repairs++; s.stats.repairs++; s.tutorial.repaired = true;
      this.emit('repair', b.x + 24, b.y + 12, { player: p.id, bunker: b.id, count: cells.length, cells: cells.map(c => c.row * 16 + c.col) });
      return true;
    }
    addScore(p, points) {
      const s = this.s; s.score += points; if (p) p.score += points;
      if (!s.extra && s.score >= 1000) { s.extra = true; s.reserve++; this.emit('extra', 240, 130, { text: '1,000! ONE EXTRA DEPLOYMENT.' }); this.restoreSpectators(); }
    }
    restoreSpectators() {
      const s = this.s;
      for (const p of s.ships) if (!p.active && !p.gone && !p.wait && s.reserve > 0) { s.reserve--; p.wait = 120; this.emit('respawn-pending', p.x, p.y, { player: p.id }); }
    }
    killShip(p) {
      const s = this.s;
      if (!p.active || p.shield > 0 || s.dev.invulnerable || s.demo) return false;
      p.active = false; p.deaths++; s.stats.deaths++; this.emit('loss', p.x, p.y, { player: p.id });
      if (s.reserve > 0) { s.reserve--; p.wait = 120; }
      return true;
    }
    drop(x, y, count = 1) {
      const s = this.s;
      for (let i = 0; i < count; i++) { s.pickups.push({ id: this.id(), x: clamp(x + (i - (count - 1) / 2) * 13, 24, 456), y, life: 900 }); s.stats.drops++; }
      this.emit('drop', x, y);
    }
    shoot(p) {
      const s = this.s;
      if (p.cool > 0 || s.shots.filter(b => b.team === 0 && b.owner === p.id).length >= 2) return;
      s.shots.push({ id: this.id(), x: p.x, y: p.y - 9, vx: 0, vy: -s.tuning.shotSpeed, team: 0, owner: p.id, kind: 'missile', life: 360 });
      p.cool = Math.round(s.tuning.recovery * 120); p.recoil = 12; s.stats.shots++; s.tutorial.fired = true; this.emit('shoot', p.x, p.y - 9, { player: p.id });
    }
    attacks() {
      const s = this.s, w = A.WAVES[s.encounter];
      if (--s.fireClock <= 0) {
        const cycle = s.fireCount++;
        const recovery = s.encounter >= 4 && cycle % 5 === 4;
        s.fireClock = Math.round(s.tuning.fireInterval * w.fire * 120 * (recovery ? 2.6 : 1) * (s.ships.some(p => p.gone) ? 1.2 : 1));
        if (!recovery && s.shots.filter(b => b.team === 1).length + s.attacks.length < 7) {
          const exposed = s.enemies.filter(e => !s.enemies.some(q => q.col === e.col && q.row > e.row));
          const alt = exposed.filter(e => e.col % 2 === cycle % 2), pool = alt.length ? alt : exposed;
          const shuffled = pool.slice();
          for (let i = 0; i < Math.min(w.volley, pool.length); i++) {
            const at = Math.floor(this.rand() * shuffled.length), e = shuffled.splice(at, 1)[0]; if (!e) continue;
            const [x, y] = A.enemyPos(s, e); const broad = e.type === 'B';
            s.attacks.push({ id: this.id(), enemy: e.id, x, y: y + 7, ticks: broad ? 100 : 60, total: broad ? 100 : 60, kind: broad ? 'crater' : 'bomb' }); e.attack = broad ? 100 : 60;
            this.emit('warning', x, y, { broad });
          }
        }
      }
      s.attacks = s.attacks.filter(a => {
        const e = s.enemies.find(e => e.id === a.enemy); if (!e) return false;
        [a.x, a.y] = A.enemyPos(s, e); a.y += 7;
        if (--a.ticks > 0) return true;
        s.shots.push({ id: this.id(), x: a.x, y: a.y, vx: 0, vy: s.tuning.bombSpeed * (a.kind === 'crater' ? .8 : 1), team: 1, owner: -1, kind: a.kind, life: 1000 }); this.emit('bomb', a.x, a.y, { broad: a.kind === 'crater' }); return false;
      });
    }
    bossStep() {
      const s = this.s, b = s.boss; b.cycle++; b.hurt = Math.max(0, b.hurt - 1);
      b.x = 240 + Math.sin(s.encounterTick / 400) * (b.phase === 1 ? 86 : 118); b.y = 76 + Math.sin(s.encounterTick / 220) * 5;
      const period = b.phase === 1 ? 600 : 540, clock = b.cycle % period;
      if (clock === 15) this.emit('boss-open', b.x, b.y, { text: b.phase === 1 ? 'EMITTER SHELLS OPEN' : 'CORE OPEN. SEND YOUR REGARDS.' });
      const cadence = Math.round((b.phase === 1 ? 185 : 155) * (s.ships.some(p => p.gone) ? 1.2 : 1));
      if (b.cycle % cadence === 60) {
        const parity = b.volley++ % 2;
        const lanes = b.phase === 1 ? [b.x + (parity ? 48 : -48)] : [55, 129, 203, 277, 351, 425].filter((_, i) => i % 2 === parity);
        for (const x of lanes) s.attacks.push({ id: this.id(), enemy: 0, x, y: b.y + 16, ticks: 110, total: 110, kind: b.phase === 1 ? 'crater' : 'lane' });
        this.emit('boss-warning', b.x, b.y, { phase: b.phase });
      }
      s.attacks = s.attacks.filter(a => {
        if (--a.ticks > 0) return true;
        s.shots.push({ id: this.id(), x: a.x, y: a.y, vx: 0, vy: s.tuning.bombSpeed * .95, team: 1, owner: -1, kind: a.kind, life: 1000 }); this.emit('bomb', a.x, a.y, { broad: true }); return false;
      });
      if (b.cycle % 780 === 220) this.drop(b.x, b.y + 12, 2);
    }
    hitEnemy(e, owner) {
      const s = this.s, p = s.ships.find(p => p.id === owner), [x, y] = A.enemyPos(s, e);
      e.hp--; e.hit = 15;
      if (e.hp > 0) { s.stats.armor++; this.emit('armor', x, y); return; }
      s.enemies = s.enemies.filter(q => q.id !== e.id); s.killCount++; s.stats.kills++; if (p) p.kills++;
      this.addScore(p, (4 - e.row) * 10); this.emit('kill', x, y, { row: e.row, typeId: e.type, points: (4 - e.row) * 10 });
      if (s.killCount % Math.round(s.tuning.salvageEvery) === 0) this.drop(x, y);
    }
    hitBoss(part, owner) {
      const s = this.s, b = s.boss, p = s.ships.find(p => p.id === owner);
      if (!A.bossWindow(s)) { this.emit('deflect', b.x, b.y); return; }
      b.hurt = 16;
      if (b.phase === 1) {
        if (b[part] <= 0) return; b[part]--; this.emit('armor', b.x + (part === 'left' ? -48 : 48), b.y + 6);
        if (b[part] === 0) { this.addScore(p, 200); this.drop(b.x + (part === 'left' ? -48 : 48), b.y + 10, 2); this.emit('emitter-break', b.x + (part === 'left' ? -48 : 48), b.y); }
        if (b.left <= 0 && b.right <= 0) { b.phase = 2; b.cycle = 0; s.shots = s.shots.filter(q => q.team === 0); s.attacks = []; s.stats.bossPhases.push(2); this.emit('core-exposed', b.x, b.y, { text: 'SHELLS GONE. WATCH THE LANES. HIT THE CORE.' }); }
      } else {
        b.core--; this.addScore(p, 20); this.emit('core-hit', b.x, b.y);
        if (b.core <= 0) { this.addScore(p, 1000); this.end(true, 'PLANET DEFENDED'); }
      }
    }
    resolveShots() {
      const s = this.s;
      for (const shot of s.shots.slice().sort((a, b) => a.id - b.id)) {
        if (!s.shots.includes(shot)) continue;
        const x0 = shot.x, y0 = shot.y, x1 = x0 + shot.vx * dt, y1 = y0 + shot.vy * dt;
        let best = null;
        const candidate = (t, order, type, data) => { if (t !== null && (!best || t < best.t - 1e-9 || Math.abs(t - best.t) < 1e-9 && order < best.order)) best = { t, order, type, data }; };
        const rad = shot.kind === 'lane' ? 9 : shot.kind === 'crater' ? 3 : .8;
        for (const b of s.bunkers) {
          if (Math.max(y0, y1) + rad < b.y || Math.min(y0, y1) - rad > b.y + 24 || x0 + rad < b.x || x0 - rad > b.x + 48) continue;
          for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) if (b.rows[r] & (1 << c)) candidate(A.segmentBox(x0, y0, x1, y1, b.x + c * 3 + 1.5, b.y + r * 3 + 1.5, 1.5 + rad, 1.5 + rad), b.id * 128 + r * 16 + c, 'bunker', { bunker: b, row: r, col: c });
        }
        if (shot.team === 0) {
          for (const e of s.enemies) { const [x, y] = A.enemyPos(s, e); candidate(A.segmentBox(x0, y0, x1, y1, x, y, 7.5, 6.5), 1000 + e.id, 'enemy', e); }
          if (s.saucer) candidate(A.segmentBox(x0, y0, x1, y1, s.saucer.x, s.saucer.y, 12, 5), 900, 'saucer', s.saucer);
          if (s.boss) {
            const b = s.boss;
            if (b.phase === 1) { for (const part of ['left', 'right']) if (b[part] > 0) candidate(A.segmentBox(x0, y0, x1, y1, b.x + (part === 'left' ? -48 : 48), b.y + 8, 14, 11), 800, 'boss', part); }
            else candidate(A.segmentBox(x0, y0, x1, y1, b.x, b.y + 8, 17, 13), 800, 'boss', 'core');
            candidate(A.segmentBox(x0, y0, x1, y1, b.x, b.y - 4, 68, 8), 1500, 'hull', null);
          }
        } else {
          for (const p of s.ships) if (p.active && !p.gone) candidate(A.segmentBox(x0, y0, x1, y1, p.x, p.y, 5 + rad, 4 + rad), 2000 + p.seat, 'ship', p);
        }
        shot.x = x1; shot.y = y1; shot.life--;
        if (best) {
          shot.x = x0 + (x1 - x0) * best.t; shot.y = y0 + (y1 - y0) * best.t;
          s.shots = s.shots.filter(q => q.id !== shot.id);
          if (best.type === 'bunker') this.bunkerHit(best.data.bunker, best.data.bunker.x + best.data.col * 3 + 1.5, best.data.bunker.y + best.data.row * 3 + 1.5, shot.team === 0, shot.kind === 'crater' || shot.kind === 'lane');
          else if (best.type === 'enemy') this.hitEnemy(best.data, shot.owner);
          else if (best.type === 'ship') this.killShip(best.data);
          else if (best.type === 'boss') this.hitBoss(best.data, shot.owner);
          else if (best.type === 'hull') this.emit('deflect', shot.x, shot.y);
          else if (best.type === 'saucer') { const bonus = [100, 200, 300][s.saucer.pass % 3]; this.addScore(s.ships.find(p => p.id === shot.owner), bonus); this.emit('saucer-hit', s.saucer.x, s.saucer.y, { points: bonus }); this.drop(s.saucer.x, s.saucer.y, 2); s.stats.saucers++; s.saucer = null; }
        } else if (shot.y < 26 || shot.y > 264 || shot.life <= 0) s.shots = s.shots.filter(q => q.id !== shot.id);
        if (s.phase === 'victory') break;
      }
    }
    pickups() {
      const s = this.s;
      s.pickups = s.pickups.filter(item => {
        item.y += 31 * dt; item.life--;
        const p = s.ships.find(p => p.active && !p.gone && p.charges < 3 && Math.abs(p.x - item.x) < 11 && Math.abs(p.y - item.y) < 8);
        if (p) { p.charges++; p.caught++; s.stats.catches++; s.tutorial.collected = true; this.emit('pickup', item.x, item.y, { player: p.id }); return false; }
        if (item.y > 260 || item.life <= 0) { this.emit('expired', item.x, item.y); return false; }
        return true;
      });
    }
    transition() {
      const s = this.s;
      if (s.phase === 'active' && !s.boss && !s.enemies.length) {
        s.stats.cleared.push(s.encounter + 1); s.phase = 'restoration'; s.phaseTicks = s.encounter % 2 === 1 ? 480 : 300;
        s.shots = []; s.attacks = []; s.saucer = null;
        this.emit('clear', 240, 120, { text: s.encounter === 5 ? 'SIX FORMATIONS. ONE VERY BAD IDEA INBOUND.' : s.encounter % 2 ? 'SECTOR SECURED. MASONRY DRONES INBOUND.' : 'FORMATION CLEARED. PATCH YOUR COVER.' });
      } else if (s.phase === 'restoration') {
        if (s.encounter % 2 === 1 && s.phaseTicks % 7 === 0) {
          for (const b of s.bunkers) for (let r = 0; r < 5; r++) {
            const missing = intact[r] & ~b.rows[r]; if (missing) { b.rows[r] |= missing & -missing; break; }
          }
        }
        if (--s.phaseTicks <= 0) this.startEncounter(s.encounter + 1);
      }
    }
    end(won, reason) {
      const s = this.s; if (s.phase === 'victory' || s.phase === 'defeat') return;
      s.won = won; s.reason = reason; s.phase = won ? 'victory' : 'defeat'; s.phaseTicks = 0; s.shots = []; s.attacks = [];
      this.emit(won ? 'victory' : 'defeat', 240, 100, { text: reason });
    }
    leave(id) { const p = this.s.ships.find(p => p.id === id); if (p) { p.gone = true; p.active = false; p.wait = 0; p.repairHeld = false; } }
    step(commands = {}) {
      const s = this.s;
      if (s.phase === 'victory' || s.phase === 'defeat') { s.phaseTicks++; return; }
      s.tick++; s.encounterTick++;
      for (const e of s.enemies) { e.hit = Math.max(0, e.hit - 1); e.attack = Math.max(0, e.attack - 1); }
      for (const p of s.ships) {
        const c = commands[p.id] || NEUTRAL;
        p.cool = Math.max(0, p.cool - 1); p.recoil = Math.max(0, p.recoil - 1); p.shield = Math.max(0, p.shield - 1);
        if (p.gone) continue;
        if (p.wait > 0 && --p.wait === 0) { p.active = true; p.shield = 240; p.cool = 15; this.emit('respawn', p.x, p.y, { player: p.id }); }
        if (!p.active) { p.repairHeld = !!c.repair; continue; }
        const move = clamp(Number(c.move) || 0, -1, 1), oldX = p.x;
        p.x = clamp(p.x + move * s.tuning.playerSpeed * dt, F.left + 7, F.right - 7);
        if (Math.abs(p.x - oldX) > .1) s.tutorial.moved = true;
        if (c.fire && (s.phase === 'active' || s.phase === 'intro')) this.shoot(p);
        if (c.repair && !p.repairHeld) this.repair(p); p.repairHeld = !!c.repair;
      }
      if (s.phase === 'intro') { if (--s.phaseTicks <= 0) { s.phase = 'active'; s.encounterTick = 0; } }
      else if (s.phase === 'active') {
        if (s.boss) this.bossStep(); else { this.moveFormation(); this.attacks(); }
        if (!s.boss && !s.saucer && s.encounterTick >= s.nextSaucer) {
          const dir = s.saucers % 2 ? -1 : 1; s.saucer = { x: dir > 0 ? 10 : 470, y: 39, dir, pass: s.saucers++ }; s.nextSaucer = s.encounterTick + 3300; this.emit('saucer', s.saucer.x, 39);
        }
      }
      if (s.saucer) { s.saucer.x += s.saucer.dir * 34 * dt; if (s.saucer.x < -20 || s.saucer.x > 500) s.saucer = null; }
      this.resolveShots(); this.pickups(); this.restoreSpectators(); this.transition();
      if (!s.ships.some(p => !p.gone && (p.active || p.wait > 0))) this.end(false, 'DEPLOYMENTS DEPLETED');
    }
  }
  A.Sim = Sim; A.clone = copy; A.NEUTRAL = NEUTRAL;
})(typeof globalThis !== 'undefined' ? globalThis : window);
