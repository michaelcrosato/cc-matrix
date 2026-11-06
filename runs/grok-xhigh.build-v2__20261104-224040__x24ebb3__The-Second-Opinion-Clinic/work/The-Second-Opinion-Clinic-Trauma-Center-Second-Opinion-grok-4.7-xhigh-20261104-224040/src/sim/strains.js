import { makeEntity, linePath } from './geom.js';

function add(sim, spec) {
  const e = makeEntity({ ...spec, id: spec.id || `s${sim.uid++}` });
  sim.entities.push(e);
  return e;
}

export function startStrain(sim, name) {
  const hpMul = sim.config.strainHp;
  const base = {
    introit: { hp: Math.max(1, Math.round(3 * hpMul * (sim.strainHpMul || 1))), phase: 'move', wait: 1.2, x: -1.2, z: 0.2, speed: 1.6, pathT: 0 },
    lacrimosa: { hp: Math.max(1, Math.round(5 * hpMul * (sim.strainHpMul || 1))), eyes: [], phase: 'open', sobs: 0, nextEye: 0 },
    dies: { hp: Math.max(1, Math.round(7 * (sim.strainHpMul || 1))), plate: 0, phase: 'cut' },
    sanctus: { hp: 8, left: 8 },
    reprise: { hp: 1, phase: 'mix', introit: true },
    miserere: { hp: 3, phase: 'cuts', cuts: 0 },
  };
  sim.strain = { name, dead: false, t: 0, ...base[name] };
  sim.flags.strainDead = false;
  if (name === 'lacrimosa') {
    for (let i = 0; i < sim.strain.hp; i++) {
      const eye = add(sim, {
        id: `eye${i}`,
        kind: 'eye',
        x: -2.2 + i * 1.1,
        z: 0.4,
        hp: 3,
        burn: 1.2,
        hidden: true,
        side: i < 2 ? 'L' : 'R',
      });
      eye.open = false;
      sim.strain.eyes.push(eye.id);
    }
    openEye(sim, 0);
  }
  if (name === 'dies') {
    sim.heart = true;
    sim.bpm = sim.config.diesBpm;
    spawnPlate(sim, 0);
  }
  if (name === 'sanctus') {
    sim.lie = true;
    for (let i = 0; i < 8; i++) {
      add(sim, { id: `real${i}`, kind: 'cyst', x: -2.4 + (i % 4) * 1.5, z: -0.8 + Math.floor(i / 4) * 1.4, real: true, hidden: true, side: i % 2 ? 'R' : 'L' });
    }
    for (let i = 0; i < 4; i++) {
      add(sim, { id: `fake${i}`, kind: 'cyst', x: -1.6 + i * 1.1, z: 1.3, real: false, hidden: true, side: i % 2 ? 'L' : 'R' });
    }
  }
  if (name === 'reprise') {
    sim.heart = true;
    sim.bpm = sim.config.diesBpm;
    add(sim, { id: 'rpore', kind: 'pore', x: 1.2, z: 0.2, len: 0.5, dx: 1, dz: 0.1, life: 8, side: 'R' });
    const eye = add(sim, { id: 'reye', kind: 'eye', x: -1.4, z: 0.6, hp: 1, burn: 1.0, side: 'L' });
    eye.open = true;
    spawnPlate(sim, 0, 'R');
    spawnPlate(sim, 1, 'L');
    spawnPlate(sim, 2, '');
  }
  if (name === 'miserere') {
    for (let i = 0; i < 3; i++) {
      add(sim, { id: `mcut${i}`, kind: 'incision', x: -1 + i * 1.2, z: 0.2, len: 0.6, dx: 0.2, dz: 1, side: 'R' });
    }
  }
}

function openEye(sim, index) {
  const s = sim.strain;
  const id = s.eyes[index];
  const eye = sim.entities.find((e) => e.id === id);
  if (!eye || eye.done) return;
  eye.hidden = false;
  eye.open = true;
  eye.openT = 0;
  s.nextEye = index;
}

function spawnPlate(sim, n, side) {
  const x = -2.2 + (n % 7) * 0.7;
  const z = 0.15;
  const e = add(sim, {
    id: `plate${n}`,
    kind: 'plate',
    x,
    z,
    len: 0.45,
    dx: 1,
    dz: 0,
    window: 'diastole',
    phase: 'cut',
    side: side || '',
    order: n,
  });
  e.liftPath = linePath(x, z, 0.1, 1, 0.55);
  return e;
}

export function tickStrains(sim, dt) {
  const s = sim.strain;
  if (!s || s.dead) return;
  s.t += dt;
  const speed = sim.config.strainSpeed;
  if (s.name === 'introit') tickIntroit(sim, s, dt, speed);
  else if (s.name === 'lacrimosa') tickWeep(sim, s, dt, speed);
  else if (s.name === 'sanctus') tickSanctus(sim, s);
  else if (s.name === 'reprise') tickReprise(sim, s, dt, speed);
  else if (s.name === 'miserere') tickMiserere(sim, s, dt);
  else if (s.name === 'dies') tickDies(sim, s);
}

function tickIntroit(sim, s, dt, speed) {
  const loop = [
    [-2.2, -0.4],
    [0, 0.8],
    [2.2, -0.2],
    [0.4, -1.2],
  ];
  if (s.phase === 'move') {
    s.pathT += dt * s.speed * speed * 0.25;
    const i = Math.floor(s.pathT) % loop.length;
    const j = (i + 1) % loop.length;
    const u = s.pathT - Math.floor(s.pathT);
    s.x = loop[i][0] + (loop[j][0] - loop[i][0]) * u;
    s.z = loop[i][1] + (loop[j][1] - loop[i][1]) * u;
    s.wait -= dt;
    if (s.wait <= 0) {
      s.phase = 'pore';
      s.pore = add(sim, { kind: 'pore', x: s.x, z: s.z, len: 0.5, dx: 1, dz: 0.15, life: 3 }).id;
      s.poreT = 3;
    }
    return;
  }
  if (s.phase === 'pore') {
    const pore = sim.entities.find((e) => e.id === s.pore);
    s.poreT -= dt;
    if (pore?.done) {
      s.phase = 'core';
      const core = add(sim, { kind: 'core', x: s.x, z: s.z, pull: 2.5, dx: 0.3, dz: 1, tether: true, life: 3.5 });
      s.core = core.id;
      s.coreT = 3.5;
    } else if (s.poreT <= 0) {
      if (pore) pore.done = true;
      add(sim, { kind: 'wound', x: s.x - 0.3, z: s.z, len: 0.9, dx: 1, dz: 0.2 });
      add(sim, { kind: 'pool', x: s.x, z: s.z - 0.4, r: 0.7, bleed: true });
      nextKnock(sim, s);
    }
    return;
  }
  if (s.phase === 'core') {
    const core = sim.entities.find((e) => e.id === s.core);
    s.coreT -= dt;
    if (core?.done) {
      s.hp -= 1;
      sim.flags.knocked = true;
      // Pair stays far enough apart that a suture zigzag cannot change which wound is nearest.
      add(sim, { kind: 'wound', x: s.x - 1.7, z: s.z - 0.15, len: 0.9, dx: 1, dz: 0 });
      add(sim, { kind: 'wound', x: s.x + 1.35, z: s.z - 0.9, len: 0.8, dx: 0, dz: 1 });
      s.speed *= 1.25;
      if (s.hp <= 0) return die(sim, s);
      nextKnock(sim, s);
    } else if (s.coreT <= 0) {
      if (core && !core.done) {
        core.done = true;
        core.optional = true;
        add(sim, { kind: 'wound', x: core.x, z: core.z, len: 0.9, dx: 1, dz: 0 });
      }
      nextKnock(sim, s);
    }
  }
}

function nextKnock(sim, s) {
  s.phase = 'move';
  s.wait = 6;
}

function die(sim, s) {
  s.dead = true;
  sim.flags.strainDead = true;
  sim.strain = s;
}

function tickWeep(sim, s, dt, speed) {
  const alive = s.eyes.map((id) => sim.entities.find((e) => e.id === id)).filter((e) => e && !e.done);
  for (const eye of alive) {
    if (!eye.open) continue;
    eye.openT += dt;
    if (eye.openT > 8 && eye.heat < 0.2) {
      eye.hp = eye.maxHp;
      eye.openT = 0;
      eye.heat = 0;
    }
    if (s.t % 1.1 < dt) {
      const toward = alive.length <= Math.ceil(s.eyes.length / 2);
      add(sim, {
        kind: 'droplet',
        x: eye.x + (sim.rng.next() - 0.5) * 0.3,
        z: eye.z,
        vx: toward ? 0 : 0,
        vz: -1.5 * speed,
        table: 0,
      });
    }
    if (eye.done) continue;
    if (eye.hp <= 0) {
      eye.done = true;
      eye.open = false;
    }
  }
  const living = alive.filter((e) => !e.done);
  if (living.length === 1 && s.sobs < 3 && !sim.entities.some((e) => e.kind === 'sob' && !e.done)) {
    const eye = living[0];
    if (eye.phase !== 'sob') {
      eye.phase = 'sob';
      eye.open = false;
      add(sim, { kind: 'sob', id: `sob${s.sobs}`, x: 0, z: 0.2, w: 3.2, h: 0.4, life: 6, need: 0.8 });
    }
  }
  if (living.length === 0 && s.sobs >= 3 && !sim.entities.some((e) => e.kind === 'stalk' && !e.done)) {
    add(sim, { kind: 'stalk', x: 0.2, z: 0.4, pull: 2.2, dx: 0.2, dz: 1, tether: true });
    s.stalk = true;
  }
  if (s.stalk && sim.entities.some((e) => e.kind === 'stalk' && e.done)) die(sim, s);
}

export function noteEyeLaser(sim, eye) {
  const s = sim.strain;
  eye.hp -= 1;
  eye.heat = 0;
  eye.openT = 0;
  if (eye.hp > 0) return;
  eye.done = true;
  eye.open = false;
  if (!s || s.name !== 'lacrimosa' || !s.eyes) return;
  const next = s.eyes.findIndex((id) => {
    const e = sim.entities.find((x) => x.id === id);
    return e && !e.done;
  });
  if (next >= 0) openEye(sim, next);
}

export function noteSob(sim) {
  const s = sim.strain;
  if (!s || s.name !== 'lacrimosa') return;
  s.sobs += 1;
  const eye = sim.entities.find((e) => e.kind === 'eye' && !e.done);
  if (eye) {
    eye.phase = 'fight';
    if (s.sobs >= 3) {
      eye.done = true;
    } else {
      eye.hp = 1;
      eye.open = false;
    }
  }
}

function tickDies(sim, s) {
  const plate = sim.entities.find((e) => e.kind === 'plate' && !e.done);
  if (!plate && s.plate >= s.hp) {
    sim.flags.strainDead = true;
    s.dead = true;
    return;
  }
  if (!plate && s.plate < s.hp) spawnPlate(sim, s.plate);
}

export function notePlate(sim) {
  const s = sim.strain;
  if (!s || (s.name !== 'dies' && s.name !== 'reprise')) return;
  s.plate = (s.plate || 0) + 1;
  sim.bpm = Math.min(140, sim.bpm + 6);
  if (sim.bpm >= 120 && !sim.flags.fib) {
    sim.flags.fib = true;
    sim.flags.needFib = true;
  }
  if (s.name === 'dies' && s.plate < s.hp) spawnPlate(sim, s.plate);
  if (s.name === 'reprise' && s.plate >= 3) {
    /* three plates then the mix can end once other pieces are done */
  }
}

function tickSanctus(sim, s) {
  const reals = sim.entities.filter((e) => e.kind === 'cyst' && e.real && !e.done);
  if (reals.length === 0) {
    sim.lie = false;
    if (sim.tables[0].vitals > 41) sim.tables[0].vitals = 41;
    sim.vitals = sim.tables[sim.active].vitals;
    die(sim, s);
  }
}

function tickReprise(sim, s, dt, speed) {
  const pore = sim.entities.find((e) => e.id === 'rpore');
  if (pore && !pore.done) {
    pore.life -= dt;
    if (pore.life <= 0) {
      pore.done = true;
      add(sim, { kind: 'wound', x: pore.x, z: pore.z, len: 0.8, dx: 1, dz: 0, side: 'R' });
    }
  }
  const pending = sim.entities.some((e) => !e.done && !e.optional && (e.kind === 'pore' || e.kind === 'core' || e.kind === 'eye' || e.kind === 'plate' || e.kind === 'wound'));
  if (!pending && s.plate >= 1 && (!pore || pore.done)) {
    const plates = sim.entities.filter((e) => e.kind === 'plate');
    if (plates.length && plates.every((e) => e.done) && sim.entities.filter((e) => e.kind === 'eye' && !e.done).length === 0) die(sim, s);
  }
  void speed;
}

function tickMiserere(sim, s, dt) {
  // Ghost hand: replay scalpel use from 3s ago. A cut on healthy tissue is a mistake.
  sim.ghost = sim.ghost || [];
  for (const seat of sim.seats) {
    if (seat.tool === 'scalpel' && seat.use) sim.ghost.push({ t: sim.t, x: seat.x, z: seat.z, tool: 'scalpel' });
  }
  sim.ghost = sim.ghost.filter((g) => sim.t - g.t < 4);
  for (const g of sim.ghost) {
    if (g.applied) continue;
    if (sim.t - g.t < 3) continue;
    g.applied = true;
    const safe = sim.entities.some((e) => !e.optional && (e.safeUntil > sim.t || (!e.done && Math.hypot(e.x - g.x, e.z - g.z) < 0.7) || (e.done && e.safeUntil > sim.t)));
    const nearTarget = sim.entities.some((e) => (e.kind === 'incision' || e.kind === 'tether') && Math.hypot(e.x - g.x, e.z - g.z) < 0.85);
    sim.flags.copied = true;
    if (!nearTarget && !safe) {
      add(sim, { kind: 'nick', x: g.x, z: g.z, optional: true });
      sim.pendingGhostMistake = true;
    }
  }
  const cuts = sim.entities.filter((e) => e.kind === 'incision');
  if (cuts.length && cuts.every((e) => e.done) && !sim.entities.some((e) => e.kind === 'tether')) {
    add(sim, { kind: 'tether', x: -0.45, z: 0.3, x2: 0.55, z2: 0.3, hands: 2, r: 0.5 });
  }
  // The copy-hand arrives three seconds after the cut. The strain stays until that replay lands.
  if (sim.flags.copied && sim.entities.some((e) => e.kind === 'tether' && e.done)) die(sim, s);
  void dt;
}
