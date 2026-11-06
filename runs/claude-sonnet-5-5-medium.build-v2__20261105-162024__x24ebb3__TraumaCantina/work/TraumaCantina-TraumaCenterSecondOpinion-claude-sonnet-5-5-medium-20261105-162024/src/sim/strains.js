// Bosses: each strain is an entity with a small state machine. Sub-entities carry `sk` (strain kind) and `par` (parent id).
import { cfg } from '../core/config.js';
import { dist, pointAt, pathLen, clamp } from './geom.js';
import { ev, spawn, remove, byId, nick, pool, addVitals, rate, rnd, rr, done, startCodeBlue } from './core.js';

const SPLINE_LIVER = [[-4.6, -1.2], [-3, -2.6], [-1, -1.6], [1.2, -2.7], [3.4, -1.4], [4.6, 0.6], [3, 1.9], [0.8, 1.2], [-1.6, 2.2], [-3.8, 1.2], [-4.6, -1.2]];
const lacerate = (sim, x, z, tb, n = 1) => { for (let i = 0; i < n; i++) spawn(sim, { k: 'lac', x: x - 0.6 + i * 0.5, z: z + 0.5 * i, a: 0.3, len: 0.9, n: 3, tied: 0, tb }); };

export const STRAINS = {
  introit: {
    init(sim, e) {
      e.hpMax = e.hp = Math.max(1, Math.ceil((e.hp ?? 3) * cfg.strainHp)); e.path = e.path || SPLINE_LIVER; e.L = pathLen(e.path); e.s = e.s ?? 0; e.st = 'travel'; e.timer = e.timer ?? 6;
      [e.x, e.z] = pointAt(e.path, e.s); e.tb ??= 0; e.t0 = 0;
    },
    mult(e) { return 1 + 0.25 * (e.hpMax - e.hp); },
    step(sim, e, dt) {
      if (e.st === 'travel' || e.st === 'flee') {
        e.s = (e.s + 1.6 * cfg.strainSpeed * this.mult(e) * dt * (e.st === 'flee' ? 2 : 1)) % e.L; [e.x, e.z] = pointAt(e.path, e.s);
        if (e.st === 'flee') { e.timer -= dt; if (e.timer <= 0) { e.st = 'travel'; e.timer = 6 / this.mult(e); } return; }
        e.timer -= dt;
        if (e.timer <= 0) {
          e.st = 'knock'; e.timer = 3; const [nx, nz] = pointAt(e.path, (e.s + 0.4) % e.L);
          spawn(sim, { k: 'cut', id: e.id + 'pore', path: [[e.x - 0.45, e.z], [e.x + 0.45, e.z + 0.2]], L: Math.hypot(0.9, 0.2), s: 0, sk: 'introit', par: e.id, tb: e.tb, tag: 'pore', x: e.x, z: e.z });
          ev(sim, 'knock', { x: e.x, z: e.z, tb: e.tb });
        }
      } else if (e.st === 'knock') {
        e.timer -= dt;
        if (e.timer <= 0) { remove(sim, e.id + 'pore'); this.miss(sim, e); }
      } else if (e.st === 'exposed') {
        const core = byId(sim, e.id + 'core');
        if (!core) { e.st = 'travel'; return; }
        e.timer -= dt;
        if (e.timer <= 0 && !core.held) { remove(sim, core.id); this.miss(sim, e); }
      }
    },
    miss(sim, e) { lacerate(sim, e.x, e.z, e.tb); pool(sim, e.x + 0.3, e.z, 0.9, e.tb); e.st = 'travel'; e.timer = 6 / this.mult(e); ev(sim, 'strainMiss', { x: e.x, z: e.z }); },
    onCut(sim, c, seat) {
      const e = byId(sim, c.par); if (!e || c.tag !== 'pore') return;
      e.st = 'exposed'; e.timer = 3.5;
      spawn(sim, { k: 'hook', id: e.id + 'core', tether: true, ox: e.x, oz: e.z, x: e.x, z: e.z, p: 0, pull: 2.5, sk: 'introit', par: e.id, tb: e.tb, a: 0 });
      ev(sim, 'exposed', { x: e.x, z: e.z, tb: e.tb });
    },
    onSnap(sim, c) { const e = byId(sim, c.par); if (e) { lacerate(sim, c.ox, c.oz, e.tb); addVitals(sim, e.tb, -3); } },
    onPop(sim, c, seat) {
      const e = byId(sim, c.par); remove(sim, c.id); remove(sim, c.par + 'pore'); if (!e) return;
      e.hp--; rate(sim, seat, 'clean', c.ox, c.oz); ev(sim, 'strainHit', { x: e.x, z: e.z, hp: e.hp, tb: e.tb });
      lacerate(sim, e.x, e.z, e.tb, 2);
      if (e.hp <= 0) { ev(sim, 'strainDead', { x: e.x, z: e.z, sk: 'introit', tb: e.tb }); remove(sim, e.id); }
      else { e.st = 'flee'; e.timer = 2; }
    },
  },

  lacrimosa: {
    init(sim, e) {
      const n = e.eyes ?? 5; e.nEyes = n; e.hpEach = Math.max(1, Math.ceil((e.hpEach ?? 3) * cfg.strainHp)); e.tb ??= 0; e.sobs = 0; e.st = 'eyes'; e.openTimer = 2; e.noSob = !!e.noSob;
      const base = [[-4.2, -1.6], [-2.2, 0.4], [0, -2.2], [2.2, 0.2], [4.2, -1.4]];
      for (let i = 0; i < n; i++) { const [x, z] = base[i % 5]; spawn(sim, { k: 'eyeT', id: `${e.id}e${i}`, sk: 'lacrimosa', par: e.id, x: e.x0 ? x + e.x0 : x, z, r: 0.55, hp: e.hpEach, tb: e.tb, hid: 'closed', openT: 0, heat: 0, wt: 1, hx: x, hz: z }); }
      sim.filmOn = true; e.crawl = false;
    },
    eyes(sim, e) { return sim.ents.filter((x) => x.sk === 'lacrimosa' && x.k === 'eyeT' && x.par === e.id); },
    step(sim, e, dt) {
      const eyes = this.eyes(sim, e), tot = eyes.reduce((a, b) => a + b.hp, 0), max = e.nEyes * e.hpEach;
      e.crawl = tot <= max / 2;
      if (e.st === 'eyes') {
        if (eyes.length === 1 && !e.noSob) { e.st = 'sob'; e.sobT = 1.5; }
        e.openTimer -= dt;
        if (e.openTimer <= 0 && eyes.length) {
          e.openTimer = 3.2 / cfg.strainSpeed; const open = eyes.filter((x) => !x.hid);
          if (open.length < (eyes.length > 2 ? 2 : 1)) { const cl = eyes.filter((x) => x.hid); if (cl.length) { const c = cl[Math.floor(rnd(sim) * cl.length)]; c.hid = null; c.openT = 0; c.wt = 0.6; ev(sim, 'eyeOpen', { x: c.x, z: c.z, id: c.id, tb: e.tb }); } }
        }
        if (!eyes.length) { ev(sim, 'strainDead', { x: 0, z: 0, sk: 'lacrimosa', tb: e.tb }); remove(sim, e.id); }
      } else if (e.st === 'sob') {
        e.sobT -= dt;
        const m = byId(sim, e.id + 'sob');
        if (!m && e.sobT <= 0 && e.sobs < 3) {
          const z = [-1.2, 0.4, 1.6][e.sobs];
          spawn(sim, { k: 'mask', id: e.id + 'sob', shape: { line: [[-5, z], [-1.7, z + 0.7], [1.7, z - 0.7], [5, z]] }, need: 0.8, sk: 'lacrimosa', par: e.id, tb: e.tb, t0: sim.t, limit: 6, sobT: 6 });
          ev(sim, 'sob', { tb: e.tb });
        } else if (m) {
          m.sobT -= dt; if (m.sobT <= 0) { remove(sim, m.id); addVitals(sim, e.tb, -25); ev(sim, 'wave', { tb: e.tb }); e.sobs++; e.sobT = 2.5; if (e.sobs >= 3) this.toStalk(sim, e); }
        }
      }
      // eyes: close & heal timers, weep, crawl
      for (const c of eyes) {
        if (c.hid) { c.heat = Math.max(0, c.heat - dt); continue; }
        c.openT += dt; c.wt -= dt;
        if (sim.t - (c.lz ?? -9) > 0.3) c.heat = Math.max(0, c.heat - dt * 0.6);
        if (c.wt <= 0) { c.wt = 1.3 / cfg.strainSpeed; spawn(sim, { k: 'drop', sk: 'lacrimosa', x: c.x + (rnd(sim) - 0.5) * 0.4, z: c.z + 0.3, vx: (rnd(sim) - 0.5) * 0.3, vz: 1.5, tb: e.tb }); ev(sim, 'weep', { x: c.x, z: c.z, tb: e.tb }); }
        if (c.openT > 8) { c.hp = Math.min(e.hpEach, c.hp + 1); c.hid = 'closed'; c.openT = 0; ev(sim, 'eyeHeal', { x: c.x, z: c.z }); }
        if (e.crawl) { c.cph = (c.cph ?? 0) + dt; c.x = c.hx + Math.sin(c.cph * 0.7) * 0.8; c.z = c.hz + Math.cos(c.cph * 0.5) * 0.4; }
      }
      // droplets and film
      for (const d of sim.ents) {
        if (d.k === 'film') { d.ttl -= dt; if (d.ttl <= 0) remove(sim, d.id); }
        else if (d.k === 'drop' && d.sk === 'lacrimosa' && d.tb === e.tb) {
          if (e.crawl) { const s0 = sim.seats.find((s) => s.tb === d.tb); if (s0) d.vx += clamp(s0.x - d.x, -1, 1) * 0.9 * dt; }
          d.x += d.vx * dt; d.z += d.vz * dt;
          if (sim.ents.some((f) => f.k === 'film' && f.tb === d.tb && dist(f.x, f.z, d.x, d.z) < f.r)) { remove(sim, d.id); ev(sim, 'fizz', { x: d.x, z: d.z, tb: d.tb }); continue; }
          if (d.z > 3.3) { remove(sim, d.id); nick(sim, d.x, 3.0, d.tb); addVitals(sim, d.tb, -1); ev(sim, 'splat', { x: d.x, z: 3.0, tb: d.tb }); }
        }
      }
    },
    laser(sim, c, seat, dt) {
      c.lz = sim.t; c.heat += dt / 1.2;
      if (c.heat >= 1) {
        c.heat = 0; c.hp--; c.hid = 'closed'; c.openT = 0; rate(sim, seat, 'clean', c.x, c.z); ev(sim, 'fx', { n: 'burn', x: c.x, z: c.z, tb: c.tb, seat: seat.id });
        if (c.hp <= 0) { ev(sim, 'eyeDead', { x: c.x, z: c.z, tb: c.tb }); remove(sim, c.id); }
      }
    },
    onMask(sim, m) { const e = byId(sim, m.par); if (!e) return; e.sobs++; e.sobT = 2.5; ev(sim, 'sobOk', { tb: e.tb }); if (e.sobs >= 3) this.toStalk(sim, e); },
    toStalk(sim, e) {
      const eyes = this.eyes(sim, e), last = eyes[0]; const x = last?.x ?? 0, z = last?.z ?? -1;
      for (const c of eyes) remove(sim, c.id);
      e.st = 'stalk'; spawn(sim, { k: 'hook', id: e.id + 'stalk', tether: true, ox: x, oz: z, x, z, p: 0, pull: 2.5, sk: 'lacrimosa', par: e.id, tb: e.tb, a: 0 });
    },
    onSnap(sim, c) { addVitals(sim, c.tb, -4); },
    onPop(sim, c, seat) { const e = byId(sim, c.par); remove(sim, c.id); rate(sim, seat, 'clean', c.ox, c.oz); ev(sim, 'strainDead', { x: c.ox, z: c.oz, sk: 'lacrimosa', tb: c.tb }); if (e) remove(sim, e.id); sim.filmOn = false; },
  },

  wrath: {
    init(sim, e) {
      e.tb ??= 0; e.round = 0; e.rounds = e.rounds ?? [2, 2, 3]; e.nPlates = e.rounds.reduce((a, b) => a + b, 0); e.st = 'rounds'; e.noArrest = !!e.noArrest; e.cx = e.cx ?? 0; e.cz = e.cz ?? -0.3; e.fl = 7;
      sim.heart = { bpm: cfg.wrathBpm, phase: 0, sys: false, beats: 0, cycleT: 0, cutReset: null };
      for (let i = 0; i < e.nPlates; i++) {
        const an = (i / e.nPlates) * Math.PI * 2 - Math.PI / 2, x = e.cx + Math.cos(an) * 3.0, z = e.cz + Math.sin(an) * 1.9;
        spawn(sim, { k: 'plate', id: `${e.id}p${i}`, sk: 'wrath', par: e.id, x, z, x0: x, z0: z, an, st: 'whole', lift: 1.0, lp: 0, tb: e.tb, hid: 'round', idx: i });
      }
      this.openRound(sim, e);
    },
    plates(sim, e) { return sim.ents.filter((x) => x.k === 'plate' && x.par === e.id); },
    openRound(sim, e) {
      let from = 0; for (let i = 0; i < e.round; i++) from += e.rounds[i];
      const n = e.rounds[e.round];
      for (const p of this.plates(sim, e)) if (p.idx >= from && p.idx < from + n) { p.hid = 'whole'; this.spawnCut(sim, p); }
      ev(sim, 'round', { n: e.round + 1, tb: e.tb });
    },
    spawnCut(sim, p) {
      const c = Math.cos(p.an + Math.PI / 2), s = Math.sin(p.an + Math.PI / 2);
      spawn(sim, { k: 'cut', id: p.id + 'c', path: [[p.x - c * 0.45, p.z - s * 0.45], [p.x + c * 0.45, p.z + s * 0.45]], L: 0.9, s: 0, sk: 'wrath', par: p.id, tb: p.tb, x: p.x, z: p.z });
    },
    step(sim, e, dt) {
      const h = sim.heart; if (!h) return;
      if (sim.cb?.fib) return;
      const cyc = 60 / h.bpm; h.phase += dt / cyc; const was = h.sys; h.cyc = cyc;
      if (h.phase >= 1) { h.phase -= 1; h.beats++; ev(sim, 'beat', { bpm: h.bpm, tb: e.tb }); }
      h.sys = h.phase < 0.35 && !h.arrest;
      if (h.sys && !was) { // systole begins: cuts reset, lifts drop
        for (const c of sim.ents) if (c.k === 'cut' && c.sk === 'wrath' && !c.fin) c.s = 0;
        for (const s of sim.seats) { const g = s.cut && byId(sim, s.cut); if (g && g.sk === 'wrath') s.cut = null; }
        for (const p of this.plates(sim, e)) { if (p.held) { const s = sim.seats.find((q) => q.id === p.held); if (s) s.grab = null; p.held = null; p.lp = 0; p.x = p.x0; p.z = p.z0; } }
      }
      if (e.st === 'rounds') {
        const pl = this.plates(sim, e), alive = pl.filter((p) => p.st !== 'dead' && p.hid !== 'round');
        if (!alive.length && e.round < e.rounds.length) { e.round++; if (e.round >= e.rounds.length) { if (e.noArrest) return this.finish(sim, e); e.st = 'arrest'; h.arrest = true; sim.mass = { need: 8, n: 0, last: null, t: 0, tb: e.tb }; ev(sim, 'arrest', { tb: e.tb }); } else this.openRound(sim, e); }
        e.fl -= dt; if (e.fl <= 0) { e.fl = 9 / cfg.strainSpeed; const z = [-1.4, 0.6, 1.8][Math.floor(rnd(sim) * 3)]; pool(sim, rr(sim, -3.5, 3.5), z, 0.8, e.tb); ev(sim, 'flare', { tb: e.tb }); }
        if (h.bpm >= 120 && !sim.cb) { const cb = startCodeBlue(sim, true); cb.fib = true; cb.need = 1; ev(sim, 'fib', { tb: e.tb }); }
      } else if (e.st === 'arrest') {
        if (!sim.mass) { e.st = 'final'; h.arrest = true; h.sys = false; spawn(sim, { k: 'cut', id: e.id + 'fin', path: [[-3.5, -0.3], [-1.2, -0.7], [1.2, 0.1], [3.5, -0.3]], L: pathLen([[-3.5, -0.3], [-1.2, -0.7], [1.2, 0.1], [3.5, -0.3]]), s: 0, sk: 'wrath', par: e.id, tb: e.tb, tag: 'final', x: 0, z: -0.3 }); }
      }
    },
    onCut(sim, c, seat) {
      if (c.tag === 'final') { const e = byId(sim, c.par); if (e) this.finish(sim, e); return; }
      const p = byId(sim, c.par); if (p) { p.st = 'cut'; p.hid = null; ev(sim, 'plateCut', { x: p.x, z: p.z, tb: p.tb }); }
    },
    onLift(sim, p, seat) {
      p.st = 'lifted'; p.hid = 'lifted'; p.x = p.x0; p.z = p.z0;
      spawn(sim, { k: 'eyeT', id: p.id + 'eye', sk: 'wrath', par: p.id, x: p.x0, z: p.z0, r: 0.5, tb: p.tb, heat: 0 });
      ev(sim, 'plateLift', { x: p.x, z: p.z, tb: p.tb });
    },
    laser(sim, c, seat, dt) {
      if (sim.heart?.sys) return;
      c.lz = sim.t; c.heat += dt / cfg.laserTime;
      if (c.heat >= 1) {
        const p = byId(sim, c.par); remove(sim, c.id); rate(sim, seat, 'clean', c.x, c.z);
        if (p) { p.st = 'dead'; p.hid = 'dead'; remove(sim, p.id); }
        sim.heart.bpm += 6; ev(sim, 'plateDead', { x: c.x, z: c.z, tb: c.tb, bpm: sim.heart.bpm });
      }
    },
    onDose(sim) { if (sim.heart) { sim.heart.bpm = Math.max(40, sim.heart.bpm - 12); ev(sim, 'bpm', { bpm: sim.heart.bpm }); } },
    finish(sim, e) { ev(sim, 'strainDead', { x: 0, z: 0, sk: 'wrath', tb: e.tb }); for (const p of this.plates(sim, e)) remove(sim, p.id); remove(sim, e.id); if (sim.heart) { sim.heart.arrest = false; sim.heart.sys = false; } },
  },

  miserere: {
    init(sim, e) {
      e.tb ??= 0; e.hp = Math.max(1, Math.ceil(3 * cfg.strainHp)); e.hpMax = e.hp; e.st = 'core'; e.rec = []; e.gt = 0; e.nt = 0; e.x = 0; e.z = -0.4;
      spawn(sim, { k: 'eyeT', id: e.id + 'core', sk: 'miserere', par: e.id, x: 0, z: -0.4, r: 0.8, hp: e.hp, heat: 0, tb: e.tb });
    },
    step(sim, e, dt) {
      // it copies you: replays the first seat's last 3 s and wounds where it "cuts"
      const s = sim.seats[0]; if (!s) return;
      e.rec.push([s.x, s.z, s.use ? 1 : 0]); if (e.rec.length > 180) e.rec.shift();
      const g = e.rec[0]; e.gx = g[0]; e.gz = g[1]; e.guse = e.rec.length >= 170 ? g[2] : 0;
      if (e.guse) { e.nt -= dt; if (e.nt <= 0) { e.nt = 1.1; nick(sim, e.gx, e.gz, e.tb); ev(sim, 'ghostCut', { x: e.gx, z: e.gz, tb: e.tb }); } }
    },
    laser(sim, c, seat, dt) {
      const e = byId(sim, c.par); c.lz = sim.t; c.heat += dt / 1.4;
      if (c.heat >= 1 && e) { c.heat = 0; e.hp--; c.hp = e.hp; rate(sim, seat, 'clean', c.x, c.z); ev(sim, 'strainHit', { x: c.x, z: c.z, hp: e.hp, tb: e.tb }); if (e.hp <= 0) { remove(sim, c.id); e.st = 'tether'; spawn(sim, { k: 'hook2', id: e.id + 't', tether: true, two: true, ox: 0, oz: -0.4, x: 0, z: -0.4, p: 0, pull: 2.8, sk: 'miserere', par: e.id, tb: e.tb, a: 0 }); ev(sim, 'tether2', { tb: e.tb }); } }
    },
    onPop(sim, c) { const e = byId(sim, c.par); remove(sim, c.id); ev(sim, 'strainDead', { x: 0, z: 0, sk: 'miserere', tb: c.tb }); if (e) remove(sim, e.id); },
  },
};

// the cores/hook2 need two-handed grab: handled in op.js (tether2 step)
export function stepStrains(sim, dt) {
  for (const e of [...sim.ents]) { if (e.k === 'strain') STRAINS[e.sk]?.step?.(sim, e, dt); }
}
export function initStrain(sim, e) { STRAINS[e.sk]?.init?.(sim, e); }
