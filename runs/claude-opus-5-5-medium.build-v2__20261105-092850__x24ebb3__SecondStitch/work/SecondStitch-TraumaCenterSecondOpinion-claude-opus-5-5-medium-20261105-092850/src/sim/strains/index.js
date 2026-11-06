// The strains: each a small state machine over plain data.
import { spawn, removeEnt, entById } from '../entities.js';
import { dist, curve, pointAt, polyLength, smoothPath, clamp } from '../geom.js';
import { hurt, say, sayKey, enterMassage, runCmds, enterCodeBlue, addScar, addVitals } from '../op.js';
import { nextRandom, rangeOf } from '../../core/rng.js';

const hpOf = (sim, base) => Math.max(1, Math.round(base * sim.cfg.strainHp));
const speedOf = (sim) => sim.cfg.strainSpeed;
const clampField = (x, z) => [clamp(x, -5.6, 5.6), clamp(z, -3.2, 2.2)];
const ownerOf = (sim, e) => sim.ents.filter((o) => o.owner === e.id);

/* ---------- Introit, the Knock ---------- */
const introit = {
  step(sim, e, dt) {
    if (!e.init) {
      e.init = true;
      e.hp = e.hp ?? hpOf(sim, 3); e.hpMax = e.hp; e.mode = 'roam'; e.timer = e.firstKnock ?? 6; e.speed = 1.6;
      const R = e.region ?? [-4.5, 4.5, -3, 1.8];
      const pts = [];
      for (let i = 0; i < 8; i++) pts.push([rangeOf(sim, R[0], R[1]), rangeOf(sim, R[2], R[3])]);
      pts.push(pts[0]);
      e.path = smoothPath(pts, 5); e.len = polyLength(e.path); e.s = 0; e.visibleCore = false;
    }
    if (e.mode === 'roam') {
      e.s = (e.s + e.speed * speedOf(sim) * dt) % e.len;
      const p = pointAt(e.path, e.s); e.x = p[0]; e.z = p[1];
      e.timer -= dt;
      if (e.timer <= 0) {
        e.mode = 'knock'; e.timer = (e.poreTime ?? 3);
        const [x, z] = clampField(e.x, e.z); e.x = x; e.z = z;
        spawn(sim, { k: 'incision', look: 'pore', owner: e.id, sig: 'lanced', table: e.table, line: [[x - 0.4, z - 0.15], [x + 0.4, z + 0.15]], at: [x, z] });
        sim.events.push({ t: 'sfx', id: 'knock', x, z });
        sim.events.push({ t: 'knock', x, z });
        if (!e.knocked) { e.knocked = true; if (!sim.voiceOff && e.talk !== false) say(sim, 'ilya', 'It moved. Nurse Reyes, it *knocked*.'); }
      }
    } else if (e.mode === 'knock') {
      e.timer -= dt;
      if (e.timer <= 0) { // missed: it tears its way down again
        for (const o of ownerOf(sim, e)) if (o.k === 'incision') { for (const s of sim.seats) if (s.stroke === o.id) s.stroke = null; removeEnt(sim, o); }
        spawn(sim, { k: 'laceration', a: [e.x - 0.8, e.z - 0.2], b: [e.x + 0.8, e.z + 0.2], table: e.table });
        spawn(sim, { k: 'pool', at: [e.x + 0.3, e.z + 0.5], r: 0.8, table: e.table });
        e.mode = 'roam'; e.timer = 6;
        sim.events.push({ t: 'sfx', id: 'tetherSnap', x: e.x, z: e.z });
      }
    } else if (e.mode === 'exposed') {
      e.timer -= dt;
      const core = ownerOf(sim, e).find((o) => o.k === 'core');
      const held = core && sim.seats.some((s) => s.grab === core.id);
      if (core) { e.coreX = core.x; e.coreZ = core.z; }
      if (e.timer <= 0 && !held) {
        if (core) removeEnt(sim, core);
        sim.events.push({ t: 'sfx', id: 'tick', x: e.x, z: e.z });
        e.mode = 'roam'; e.timer = 6;
      }
    }
  },
  on(sim, e, sig) {
    if (sig === 'lanced') {
      e.mode = 'exposed'; e.timer = (e.coreTime ?? 3.5);
      const dx = e.x > 0 ? -1 : 1, dz = e.z > 0 ? -0.5 : 0.5;
      const pts = curve([e.x, e.z], [dx, dz], 2.5, 0.25);
      spawn(sim, { k: 'core', look: 'introit', owner: e.id, sig: 'popped', table: e.table, tether: true, autoFree: true, pts, at: [e.x, e.z], big: 0.2 });
      sim.events.push({ t: 'sfx', id: 'squelch', x: e.x, z: e.z });
    } else if (sig === 'popped') {
      e.hp--;
      sim.events.push({ t: 'strainHit', id: e.id, type: 'introit', hp: e.hp, x: e.x, z: e.z });
      sim.events.push({ t: 'sfx', id: 'strainHurt', x: e.x, z: e.z });
      spawn(sim, { k: 'laceration', a: [e.x - 0.9, e.z - 0.3], b: [e.x + 0.3, e.z + 0.3], table: e.table });
      spawn(sim, { k: 'laceration', a: clampField(e.x + 0.6, e.z + 0.9), b: clampField(e.x + 1.8, e.z + 0.6), table: e.table });
      e.speed *= 1.25; e.mode = 'roam'; e.timer = 6;
      if (e.hp <= 0) {
        sim.flags[e.doneFlag ?? 'strainDead'] = true;
        sim.events.push({ t: 'strainDead', type: 'introit', x: e.x, z: e.z });
        removeEnt(sim, e);
      } else if (e.talk !== false) sayKey(sim, 'reyes.strainHit');
    }
  },
};

/* ---------- Lacrimosa, the Weeper ---------- */
const lacrimosa = {
  step(sim, e, dt) {
    if (!e.init) {
      e.init = true; e.openT = 2; e.dropT = 0; e.sobs = 0; e.sobT = -1; e.halfDone = false; e.hpEach = e.hpEach ?? hpOf(sim, 3);
      const spots = e.spots ?? [[-3.6, -2], [3.6, -2], [-2.2, 0.8], [2.2, 0.8], [0, -2.8]];
      for (const [x, z] of spots) spawn(sim, { k: 'eye', look: 'weeper', owner: e.id, sig: 'burned', keep: true, shut: true, eyeHp: e.hpEach, eyeHpMax: e.hpEach, open: 0, at: [x, z], x0: x, z0: z, table: e.table, burnTime: 1.2, size: 0.7 });
      e.eyesTotal = spots.length; e.hpTotal = spots.length * e.hpEach;
    }
    const eyes = ownerOf(sim, e).filter((o) => o.k === 'eye');
    const hpLeft = eyes.reduce((n, o) => n + o.eyeHp, 0);
    const half = hpLeft <= e.hpTotal / 2;
    if (half && !e.halfDone) { e.halfDone = true; sim.events.push({ t: 'sfx', id: 'wail', x: 0, z: -1 }); if (e.talk !== false) sayKey(sim, 'reyes.eyesCrawl'); }
    // crawling
    if (half) for (const o of eyes) {
      o.crawl = (o.crawl ?? nextRandom(sim) * 6) + dt * 0.7;
      const [x, z] = clampField(o.x0 + Math.sin(o.crawl) * 1.4, o.z0 + Math.cos(o.crawl * 0.7) * 0.8);
      o.x = x; o.z = z;
    }
    const lastEye = eyes.length === 1 && !e.noSob;
    if (lastEye && e.sobs < 3) { // the Sob
      for (const o of eyes) o.shut = true;
      if (e.sobT < 0) {
        const mask = ownerOf(sim, e).find((o) => o.k === 'mask');
        if (!mask) {
          e.sobWait = (e.sobWait ?? 1.6) - dt;
          if (e.sobWait <= 0) {
            e.sobWait = 2; e.sobT = 6;
            const z = -2.4 + e.sobs * 1.5, tilt = e.sobs % 2 ? 0.5 : -0.5;
            spawn(sim, { k: 'mask', look: 'sob', owner: e.id, sig: 'sobbed', table: e.table, path: [[-4.5, z - tilt], [4.5, z + tilt]], need: 0.8 });
            sim.events.push({ t: 'sfx', id: 'wail', x: 0, z });
            sim.events.push({ t: 'prompt', text: 'THE SOB! GEL THE LINE!' });
          }
        }
      } else {
        e.sobT -= dt;
        if (e.sobT <= 0) {
          for (const o of ownerOf(sim, e)) if (o.k === 'mask') removeEnt(sim, o);
          e.sobT = -1; e.sobs++;
          hurt(sim, e.table, 25);
          sim.events.push({ t: 'wave' });
          sim.events.push({ t: 'sfx', id: 'wave', x: 0, z: 0 });
        }
      }
      return;
    }
    // opening in turns
    e.openT -= dt;
    const open = eyes.filter((o) => !o.shut);
    if (e.openT <= 0 && open.length < (half ? 2 : 1) + (eyes.length > 3 ? 0 : 0)) {
      const shut = eyes.filter((o) => o.shut);
      if (shut.length) {
        const o = shut[Math.floor(nextRandom(sim) * shut.length)];
        o.shut = false; o.open = 0;
        sim.events.push({ t: 'sfx', id: 'eyeOpen', x: o.x, z: o.z });
        e.openT = 2.5;
      }
    }
    // weeping
    e.dropT -= dt;
    for (const o of open) {
      o.open += dt;
      if (o.open >= 8) { // left open: it heals
        o.shut = true; o.eyeHp = Math.min(o.eyeHpMax, o.eyeHp + 1); e.openT = 1.5;
        sim.events.push({ t: 'sfx', id: 'heal', x: o.x, z: o.z });
      }
    }
    if (e.dropT <= 0 && open.length) {
      e.dropT = 0.95 / (sim.coop ?? 1);
      const o = open[Math.floor(nextRandom(sim) * open.length)];
      sim.drops.push({ x: o.x, z: o.z + 0.2, vx: rangeOf(sim, -0.35, 0.35), vz: 1.5 * speedOf(sim), life: 3.2, table: e.table, home: half });
      sim.events.push({ t: 'sfx', id: 'drip', x: o.x, z: o.z });
    }
  },
  on(sim, e, sig, o, seat) {
    if (sig === 'burned') {
      o.shut = true; o.eyeHp--; e.openT = 1.2;
      sim.events.push({ t: 'strainHit', id: e.id, type: 'lacrimosa', hp: o.eyeHp, x: o.x, z: o.z });
      sim.events.push({ t: 'sfx', id: 'strainHurt', x: o.x, z: o.z });
      if (o.eyeHp <= 0) {
        removeEnt(sim, o);
        addScar(sim, { k: 'burn', x: o.x, z: o.z, table: o.table });
        const left = ownerOf(sim, e).filter((p) => p.k === 'eye').length;
        if (left === 0) {
          if (e.noStalk) { finish(sim, e); return; }
          const [x, z] = [o.x, o.z];
          sim.events.push({ t: 'sfx', id: 'wail', x, z });
          spawn(sim, { k: 'stalk', look: 'stalk', owner: e.id, sig: 'stalkOut', table: e.table, tether: true, autoFree: true, snapCuts: true, pts: curve([x, z], [x > 0 ? -1 : 1, 0.2], 2.4, 0.3), at: [x, z], big: 0.2 });
          if (e.talk !== false) sayKey(sim, 'reyes.stalk');
        }
      }
    } else if (sig === 'stalkOut') finish(sim, e);
    else if (sig === 'sobbed') { e.sobT = -1; e.sobs++; sim.events.push({ t: 'sfx', id: 'heal', x: 0, z: 0 }); }
    void seat;
  },
};
function finish(sim, e) {
  sim.flags[e.doneFlag ?? 'strainDead'] = true;
  sim.events.push({ t: 'strainDead', type: e.type, x: e.x, z: e.z });
  removeEnt(sim, e);
}

/* ---------- Dies Irae, the Wrath ---------- */
const irae = {
  step(sim, e, dt) {
    if (!e.init) {
      e.init = true;
      if (!sim.heart) sim.heart = { bpm: e.bpm ?? sim.cfg.irae, phase: 0.4, beats: 0 };
      e.rounds = e.rounds ?? [2, 2, 3]; e.round = 0; e.mode = 'plates'; e.flareT = 7; e.fibbed = 0;
      e.ring = [];
      const n = e.rounds.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; e.ring.push([+(e.x + Math.cos(a) * 2).toFixed(2), +(e.z + Math.sin(a) * 1.7).toFixed(2), 1]); }
      e.next = 0; startPlates(sim, e);
    }
    if (e.mode === 'final' && sim.flags.massaged && !e.finalSpawned) {
      e.finalSpawned = true;
      say(sim, 'reyes', 'He has a rhythm. *Now the last cut.* Do not shake.');
      spawn(sim, { k: 'incision', look: 'plateCut', owner: e.id, sig: 'finalCut', table: e.table, smooth: [[e.x - 1.2, e.z - 0.4], [e.x, e.z + 0.5], [e.x + 1.2, e.z - 0.4]] });
    }
    e.flareT -= dt;
    if (e.flareT <= 0 && e.mode !== 'final') { // wrath flares
      e.flareT = 7 / sim.coop;
      const a = nextRandom(sim) * Math.PI * 2;
      const [x, z] = clampField(e.x + Math.cos(a) * 3.2, e.z + Math.sin(a) * 2.4);
      spawn(sim, { k: 'bleeder', at: [x, z], r: 0.6, rMax: 1.1, table: e.table, look: 'flare' });
      sim.events.push({ t: 'sfx', id: 'flare', x, z });
    }
    if (sim.heart.bpm >= 120) { // fibrillation
      sim.heart.bpm = 96; e.fibbed++;
      sim.events.push({ t: 'prompt', text: 'FIBRILLATION! PADDLES!' });
      if (e.talk !== false) sayKey(sim, 'reyes.fib');
      enterCodeBlue(sim, e.table, true);
    }
  },
  on(sim, e, sig, o) {
    if (sig === 'plateCut') {
      spawn(sim, { k: 'plate', look: 'plate', owner: e.id, sig: 'plateOff', onBeat: true, table: e.table, ringIx: o.ringIx, pts: curve([o.x0 ?? o.x, o.z0 ?? o.z], [(o.x0 ?? o.x) - e.x, (o.z0 ?? o.z) - e.z], 1.1, 0), at: [o.x0 ?? o.x, o.z0 ?? o.z], big: 0.2 });
    } else if (sig === 'plateOff') {
      e.ring[o.ringIx][2] = 0;
      sim.heart.bpm += 6;
      sim.events.push({ t: 'bpm', bpm: sim.heart.bpm });
      sim.events.push({ t: 'sfx', id: 'plateCrack', x: o.x, z: o.z });
      if (!ownerOf(sim, e).some((p) => p.k === 'plate' || p.k === 'incision')) {
        spawn(sim, { k: 'eye', look: 'wrath', owner: e.id, sig: 'eyeBurned', onBeat: true, at: [e.x, e.z], table: e.table, burnTime: 0.9, size: 0.8 });
        sim.events.push({ t: 'sfx', id: 'eyeOpen', x: e.x, z: e.z });
        if (e.talk !== false) sayKey(sim, 'reyes.eyeOpen');
      }
    } else if (sig === 'eyeBurned') {
      sim.events.push({ t: 'strainHit', id: e.id, type: 'irae', hp: e.rounds.length - e.round - 1, x: e.x, z: e.z });
      sim.events.push({ t: 'sfx', id: 'strainHurt', x: e.x, z: e.z });
      e.round++;
      if (e.round >= e.rounds.length) {
        if (e.noArrest) { finish(sim, e); return; }
        e.mode = 'final';
        sim.heart.bpm = 60;
        sim.events.push({ t: 'sfx', id: 'flatline', x: 0, z: 0 });
        say(sim, 'reyes', 'He arrested! Both hands, Doctor! *On the beat!*');
        enterMassage(sim, 8);
        sim.flags.iraeArrest = true;
      } else startPlates(sim, e);
    } else if (sig === 'finalCut') finish(sim, e);
    else if (sig === 'dose') { sim.heart.bpm = Math.max(60, sim.heart.bpm - 12); sim.events.push({ t: 'bpm', bpm: sim.heart.bpm }); }
  },
};
function startPlates(sim, e) {
  const n = e.rounds[e.round];
  for (let i = 0; i < n; i++) {
    const ix = e.next++;
    const [x, z] = e.ring[ix];
    const dx = x - e.x, dz = z - e.z, m = Math.hypot(dx, dz) || 1, nx = -dz / m, nz = dx / m;
    spawn(sim, { k: 'incision', look: 'plateCut', owner: e.id, sig: 'plateCut', onBeat: true, ringIx: ix, x0: x, z0: z, table: e.table, line: [[x - nx * 0.5, z - nz * 0.5], [x + nx * 0.5, z + nz * 0.5]], at: [x, z] });
  }
}

/* ---------- Miserere ---------- */
const miserere = {
  step(sim, e, dt) {
    if (!e.init) {
      e.init = true; e.hp = hpOf(sim, 3); e.hpMax = e.hp; e.mode = 'drift'; e.timer = 3; e.a = 0;
      sim.mimic = { hits: 0, cool: 0 };
    }
    if (e.mode === 'pull' || e.mode === 'gone') return;
    e.a += dt * 0.5 * speedOf(sim);
    if (e.mode === 'drift') {
      e.x = Math.sin(e.a) * 3.6; e.z = -0.6 + Math.sin(e.a * 1.7) * 1.8;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.mode = 'veiled'; e.timer = 7;
        spawn(sim, { k: 'incision', look: 'veil', owner: e.id, sig: 'unveiled', table: e.table, smooth: [[e.x - 0.8, e.z - 0.3], [e.x, e.z + 0.45], [e.x + 0.8, e.z - 0.3]], expires: 7, onExpire: 'veilShut' });
        sim.events.push({ t: 'sfx', id: 'choir', x: e.x, z: e.z });
      }
    }
  },
  on(sim, e, sig) {
    if (sig === 'unveiled') {
      e.mode = 'bare';
      spawn(sim, { k: 'eye', look: 'halo', owner: e.id, sig: 'burned', at: [e.x, e.z], table: e.table, burnTime: 1.1, size: 0.8, expires: 5, onExpire: 'veilShut' });
    } else if (sig === 'veilShut') {
      e.mode = 'drift'; e.timer = 3;
    } else if (sig === 'burned') {
      e.hp--;
      sim.events.push({ t: 'strainHit', id: e.id, type: 'miserere', hp: e.hp, x: e.x, z: e.z });
      sim.events.push({ t: 'sfx', id: 'choir', x: e.x, z: e.z });
      if (e.hp <= 0) {
        e.mode = 'pull';
        sim.mimic = null;
        sim.events.push({ t: 'prompt', text: 'BOTH HANDS ON THE TETHER!' });
        spawn(sim, { k: 'core', look: 'miserere', owner: e.id, sig: 'pulledOut', table: e.table, tether: true, autoFree: true, shared: true, need2: sim.seats.length > 1, snapCuts: false, pts: curve([e.x, e.z], [e.x > 0 ? -1 : 1, 0.4], 3, 0.3), at: [e.x, e.z], big: 0.35 });
      } else { e.mode = 'drift'; e.timer = 3; }
    } else if (sig === 'pulledOut') {
      sim.flags.miserereOut = true;
      sim.events.push({ t: 'strainDead', type: 'miserere', x: e.x, z: e.z });
      removeEnt(sim, e);
    }
  },
};

/* ---------- Pile-Up: Consult's waves ---------- */
const pileup = {
  step(sim, e, dt) {
    if (!e.init) { e.init = true; e.wave = 0; e.timer = 2; e.surgeT = 34; e.bossDone = false; }
    e.timer -= dt * sim.coop;
    const busy = sim.ents.filter((o) => o.k !== 'strain').length;
    if (e.timer <= 0 && busy < 14) {
      e.timer = Math.max(7, 15 - e.wave * 0.5);
      e.wave++;
      const r = () => [rangeOf(sim, -5.2, 5.2), rangeOf(sim, -3.2, 2)];
      const n = 2 + Math.min(3, Math.floor(e.wave / 3));
      for (let i = 0; i < n; i++) {
        const kind = Math.floor(nextRandom(sim) * 4), at = r();
        if (kind === 0) spawn(sim, { k: 'pool', at, r: rangeOf(sim, 0.7, 1.2), table: 0 });
        else if (kind === 1) spawn(sim, { k: 'hook', at, dir: [rangeOf(sim, -1, 1), -1], pull: 1.1, arc: 0.35, table: 0 });
        else if (kind === 2) { const b = clampField(at[0] + rangeOf(sim, 1, 1.8), at[1] + rangeOf(sim, -0.5, 0.5)); spawn(sim, { k: 'laceration', a: at, b, table: 0 }); }
        else spawn(sim, { k: 'polyp', at, table: 0 });
      }
      sim.events.push({ t: 'sfx', id: 'alarm', x: 0, z: 0 });
    }
    e.surgeT -= dt;
    if (e.surgeT <= 0) { // a surge
      e.surgeT = 30;
      for (let i = 0; i < 3; i++) spawn(sim, { k: 'bleeder', at: [rangeOf(sim, -5, 5), rangeOf(sim, -3, 2)], r: 0.6, rMax: 1.2, table: 0 });
      sim.events.push({ t: 'prompt', text: 'SURGE! DRAIN IT!' });
    }
    if (!e.bossDone && sim.clock <= (e.bossAt ?? 40)) {
      e.bossDone = true;
      sim.events.push({ t: 'prompt', text: 'SOMETHING KNOCKS...' });
      spawn(sim, { k: 'strain', type: 'introit', hp: 2, at: [0, 0], table: 0, firstKnock: 2, talk: false, doneFlag: 'smallDead' });
    }
  },
};

/* ---------- The false monitor and the reprise are stage data; these fights only need flags. ---------- */
export const STRAINS = { introit, lacrimosa, irae, miserere, pileup };
void entById; void runCmds; void dist; void addVitals;
