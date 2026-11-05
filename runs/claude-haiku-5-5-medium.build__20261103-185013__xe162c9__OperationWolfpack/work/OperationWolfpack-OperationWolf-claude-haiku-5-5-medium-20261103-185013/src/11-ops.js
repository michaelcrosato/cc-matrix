// The six operations: data, then the beat generator that turns each one into timed spawns (the same seed, the same battle).
// rail: the camera's knots [[dist, x], ...]. length: the rail's end. speed: world units a second before railSpeed.
// gen: groups along the rail, each { type, every, n: [min, max], mode, z: [near, far], from, dyn, sandbag }:
//   mode 'pop' (from cover), 'cross' (walks across), 'vehicle' (drives across at z), 'boat' (on the river lane),
//   'air' (flies in), 'civ' (walks, never shot), 'goat', 'crate' (a supply crate; dyn: a dynamite crate some of the time)
// holds: where the rail stops until the wave is clear. hostages: people to bring home (guards stand around each one).
(() => {
'use strict';
const WP = globalThis.WP;

WP.OPS = {
  op1: {
    id: 'op1', n: 1, name: 'RADIO HILL', card: 'DESTROY THE ENEMY RADIO STATION', time: 'dawn', pre: 'briefing',
    sky: ['#1d1a3a', '#5a2f5e', '#d8786a', '#f6c48c'], sun: '#ffd6a0', ground: ['#3d4a2a', '#2a3a1e', '#1a2614'], hill: '#4a2f4a',
    length: 2300, speed: 15,
    rail: [[0, 0], [700, 220], [1400, -160], [2300, 260]],
    gen: [
      { type: 'soldier', every: 120, n: [2, 3], mode: 'pop', z: [150, 240], sandbag: true },
      { type: 'brute', every: 900, n: [1, 1], mode: 'pop', z: [160, 200], sandbag: true, from: 300 },
      { type: 'runner', every: 380, n: [1, 2], mode: 'cross', z: [130, 200] },
      { type: 'jeep', every: 520, n: [1, 1], mode: 'vehicle', z: [190, 190], from: 500 },
      { type: 'knife', every: 700, n: [1, 1], mode: 'pop', z: [55, 90], from: 400 },
      { type: 'sniper', every: 1100, n: [1, 1], mode: 'pop', z: [230, 260], from: 700 },
      { type: 'mortar', every: 1000, n: [1, 1], mode: 'pop', z: [200, 230], sandbag: true, from: 600 },
    ],
    holds: [{ at: 900, max: 22, radio: 'op1.hold' }, { at: 1700, max: 22, radio: 'op1.jeep' }],
    radio: [[0, 'op1.go'], ['end', 'op1.station']],
    quotas: { soldier: 36, vehicle: 3 },
    boss: 'bigEar', heal: 15, perk: 'commsDown', hostages: [], decor: ['mast', 'palm'],
  },
  op2: {
    id: 'op2', n: 2, name: 'MANGROVE RUN', card: 'CLEAR THE RIVER ROAD TO THE CROCODILE', time: 'misty',
    sky: ['#3a4a48', '#6a7a6a', '#9aa890', '#c8d0b0'], sun: '#e8e8c0', ground: ['#2a3a2a', '#1e2e1e', '#14201a'], hill: '#2e3e34',
    length: 2200, speed: 14,
    rail: [[0, 0], [600, -200], [1400, 260], [2200, -80]],
    gen: [
      { type: 'skiff', every: 260, n: [1, 2], mode: 'boat', z: [120, 170] },
      { type: 'soldier', every: 150, n: [1, 2], mode: 'pop', z: [170, 230] },
      { type: 'gunboat', every: 700, n: [1, 1], mode: 'boat', z: [150, 180], from: 350 },
      { type: 'grenadier', every: 500, n: [1, 1], mode: 'pop', z: [150, 200], from: 250 },
      { type: 'knife', every: 600, n: [1, 1], mode: 'pop', z: [55, 90], from: 500 },
    ],
    holds: [{ at: 1100, max: 22, radio: 'op2.river' }],
    radio: [[0, 'op2.go'], ['end', 'op2.croc']],
    quotas: { soldier: 24, boat: 4 },
    boss: 'crocodile', heal: 10, perk: 'riverClear', hostages: [], decor: ['palm', 'palm'],
    cut: 'interrogation',
  },
  op3: {
    id: 'op3', n: 3, name: 'PALM VILLAGE', card: 'FIND THE WORKERS AND CLEAR THE HUTS', time: 'noon',
    sky: ['#2a6aa8', '#5aa6d8', '#9ad6e8', '#e8f4d0'], sun: '#fff4c0', ground: ['#7a9a4a', '#5a7a34', '#3a5a22'], hill: '#3f7a4a',
    length: 2100, speed: 13,
    rail: [[0, 0], [500, -260], [1100, 180], [2100, -60]],
    gen: [
      { type: 'civilian', every: 200, n: [1, 2], mode: 'civ', z: [120, 170], from: 160 },
      { type: 'soldier', every: 150, n: [1, 2], mode: 'pop', z: [140, 200] },
      { type: 'jeep', every: 1100, n: [1, 1], mode: 'vehicle', z: [190, 190], from: 500 },
      { type: 'goat', every: 700, n: [1, 1], mode: 'goat', z: [140, 170], from: 330 },
      { type: 'grenadier', every: 800, n: [1, 1], mode: 'pop', z: [150, 200], from: 600 },
      { type: 'officer', every: 900, n: [1, 1], mode: 'pop', z: [150, 190], from: 500 },
    ],
    holds: [{ at: 1000, max: 25, radio: 'op3.hostage' }],
    radio: [[0, 'op3.go'], ['end', 'op3.warthog']],
    quotas: { soldier: 28, vehicle: 2 },
    boss: 'warthog', heal: 25, perk: 'villageAid', decor: ['hut', 'palm'],
    hostages: [{ at: 350, lx: -60 }, { at: 700, lx: 40 }, { at: 1000, lx: -120 }, { at: 1400, lx: 80 }, { at: 1750, lx: 0 }],
  },
  op4: {
    id: 'op4', n: 4, name: 'POWDER KEG DEPOT', card: 'BLOW THE DEPOT. KEEP THE DYNAMITE OFF THE TRUCKS', time: 'dusk',
    sky: ['#2a1420', '#7a2a2a', '#d86a30', '#f8b060'], sun: '#ffb070', ground: ['#4a3a2a', '#3a2c20', '#24190f'], hill: '#4a2a2a',
    length: 2200, speed: 14,
    rail: [[0, 0], [700, 240], [1500, -200], [2200, 120]],
    gen: [
      { type: 'soldier', every: 130, n: [2, 3], mode: 'pop', z: [150, 230], sandbag: true },
      { type: 'crate', every: 300, n: [1, 1], mode: 'crate', z: [120, 160], dyn: 0.5 },
      { type: 'apc', every: 800, n: [1, 1], mode: 'vehicle', z: [200, 200], from: 400 },
      { type: 'tank', every: 1100, n: [1, 1], mode: 'vehicle', z: [210, 210], from: 600 },
      { type: 'mortar', every: 900, n: [1, 1], mode: 'pop', z: [200, 230], sandbag: true, from: 300 },
      { type: 'grenadier', every: 500, n: [1, 1], mode: 'pop', z: [150, 200], from: 250 },
      { type: 'rpg', every: 700, n: [1, 1], mode: 'pop', z: [160, 200], sandbag: true, from: 450 },
    ],
    holds: [{ at: 1000, max: 24, radio: 'op4.depot' }, { at: 1800, max: 24, radio: 'op4.tanks' }],
    radio: [[0, 'op4.go'], ['end', 'op4.hog']],
    quotas: { soldier: 30, vehicle: 3 },
    boss: 'ironHog', heal: 20, perk: 'ammoDrop', hostages: [], decor: ['hut', 'mast'],
  },
  op5: {
    id: 'op5', n: 5, name: 'THE KENNEL', card: 'BREAK THE WORKERS OUT OF THE KENNEL. IT IS NIGHT', time: 'night', cut: 'kennel',
    night: true,
    sky: ['#05060f', '#0c1028', '#1a2038', '#2a3050'], sun: null, ground: ['#1a2220', '#101a18', '#081010'], hill: '#101828',
    length: 2300, speed: 13,
    rail: [[0, 0], [800, -220], [1500, 240], [2300, -100]],
    gen: [
      { type: 'soldier', every: 140, n: [2, 3], mode: 'pop', z: [150, 230], sandbag: true },
      { type: 'sniper', every: 500, n: [1, 1], mode: 'pop', z: [230, 260] },
      { type: 'knife', every: 400, n: [1, 1], mode: 'pop', z: [55, 90], from: 300 },
      { type: 'brute', every: 1000, n: [1, 1], mode: 'pop', z: [160, 200], sandbag: true, from: 500 },
      { type: 'jeep', every: 900, n: [1, 1], mode: 'vehicle', z: [190, 190], from: 600 },
    ],
    holds: [{ at: 800, max: 24, radio: 'op5.kennel' }, { at: 1600, max: 24, radio: 'op5.breakout' }],
    radio: [[0, 'op5.go'], ['end', 'op5.tusk']],
    quotas: { soldier: 34, vehicle: 1 },
    boss: 'tusk', heal: 25, perk: 'nightVision', decor: ['mast', 'hut'],
    hostages: [{ at: 300, lx: -90 }, { at: 600, lx: 60 }, { at: 900, lx: -40 }, { at: 1250, lx: 110 }, { at: 1650, lx: -100 }],
  },
  op6: {
    id: 'op6', n: 6, name: 'LAST FLIGHT OUT', card: 'THE CARGO PLANE IS ON THE STRIP. GET THEM ABOARD', time: 'sunrise', pre: 'takeoff',
    storm: true,
    sky: ['#2a3a58', '#5a6a88', '#c89a80', '#f0c890'], sun: '#ffe0a0', ground: ['#5a6a48', '#3e4e34', '#26321f'], hill: '#3a4a50',
    length: 2000, speed: 13,
    rail: [[0, 0], [600, 180], [1300, -240], [2000, 60]],
    gen: [
      { type: 'soldier', every: 160, n: [2, 3], mode: 'pop', z: [150, 230], sandbag: true },
      { type: 'runner', every: 400, n: [1, 2], mode: 'cross', z: [130, 200] },
      { type: 'jeep', every: 600, n: [1, 1], mode: 'vehicle', z: [190, 190], from: 300 },
      { type: 'grenadier', every: 500, n: [1, 1], mode: 'pop', z: [150, 200], from: 250 },
      { type: 'heli', every: 700, n: [1, 1], mode: 'air', z: [170, 170], from: 900, only: true },
      { type: 'para', every: 600, n: [2, 3], mode: 'drop', z: [150, 200], from: 500 },
    ],
    holds: [{ at: 1000, max: 24, radio: 'op6.gunship' }],
    radio: [[0, 'op6.go'], ['end', 'op6.hyena']],
    quotas: { soldier: 26, vehicle: 2, air: 1 },
    boss: 'hyenaOne', heal: 30, perk: 'lastFlight', decor: ['mast', 'palm', 'plane'],
    hostages: [{ at: 400, lx: -80 }, { at: 800, lx: 50 }, { at: 1100, lx: -30 }, { at: 1400, lx: 90 }, { at: 1700, lx: -110 }],
  },
};
WP.OP_ORDER = ['op1', 'op2', 'op3', 'op4', 'op5', 'op6'];

// the scenery along the rail: palms, huts, radio masts, at depths behind the fight, so they parallax
WP.decorFor = (op, rand) => {
  const out = [];
  const kinds = op.decor;
  for (let d = 0; d < op.length + 800; d += 150 + rand() * 90) {
    const cam = WP.railX(op.rail, Math.min(d, op.length));
    out.push({ kind: kinds[Math.floor(rand() * kinds.length)], x: cam + (rand() - 0.5) * 900, z: 240 + rand() * 180 });
  }
  return out;
};

// the beat list for an operation: spawns and radio cues, sorted by distance along the rail. Coordinates are absolute
// (the camera's x at that distance plus an offset), so the battle needs no randomness of its own
WP.beatsFor = (op, rand) => {
  const out = [];
  const pick = (a, b) => a + rand() * (b - a);
  const T = WP.T;
  const cam = d => WP.railX(op.rail, d);
  const add = (at, item) => { out.push(Object.assign({ at }, item)); };
  for (const g of op.gen) {
    const from = g.from || 110;
    const count = () => Math.max(1, Math.round(pick(g.n[0], g.n[1]) * (g.mode === 'civ' || g.mode === 'goat' ? 1 : T.density)));
    let flew = false;
    for (let d = from; d < op.length - 300; d += g.every * pick(0.8, 1.2)) {
      if (g.mode === 'pop') {
        const n = count(), sx = cam(d) + pick(-150, 150);
        const sp = [];
        if (g.sandbag) sp.push({ type: 'sandbag', x: sx, z: g.z[0] + 4 });
        for (let i = 0; i < n; i++) sp.push({ type: g.type, x: sx + (i - (n - 1) / 2) * 16, z: pick(g.z[0], g.z[1]), wave: true });
        add(d, { spawn: sp });
      } else if (g.mode === 'cross') {
        const side = rand() < 0.5 ? -1 : 1;
        add(d, { spawn: [{ type: g.type, x: cam(d) - side * 200, z: pick(g.z[0], g.z[1]), vx: side * pick(40, 60), wave: true }] });
      } else if (g.mode === 'vehicle') {
        const side = rand() < 0.5 ? -1 : 1;
        add(d, { spawn: [{ type: g.type, x: cam(d) - side * 220, z: g.z[0], vx: side * 42, wave: true }] });
      } else if (g.mode === 'boat') {
        const n = count(), side = rand() < 0.5 ? -1 : 1, sp = [];
        for (let i = 0; i < n; i++) sp.push({ type: g.type, x: cam(d) + side * (200 + i * 40), z: pick(g.z[0], g.z[1]), vx: -side * pick(30, 44), wave: true });
        add(d, { spawn: sp });
      } else if (g.mode === 'air') {
        if (g.only && flew) continue;
        flew = true;
        add(d, { spawn: [{ type: g.type, x: cam(d) + pick(-60, 60), z: 260, wave: true, fly: true }] });
      } else if (g.mode === 'civ') {
        const side = rand() < 0.5 ? -1 : 1;
        add(d, { spawn: [{ type: g.type, x: cam(d) - side * 120, z: pick(g.z[0], g.z[1]), vx: side * 16 }] });
      } else if (g.mode === 'goat') {
        add(d, { spawn: [{ type: g.type, x: cam(d) - 200, z: pick(g.z[0], g.z[1]), vx: 26 }] });
      } else if (g.mode === 'drop') {
        // paratroopers come down from the cargo plane in a group, behind the fight
        const n = count(), sx = cam(d);
        const sp = [];
        for (let i = 0; i < n; i++) sp.push({ type: g.type, x: sx + pick(-120, 120), z: pick(g.z[0], g.z[1]), wave: true });
        add(d, { spawn: sp });
      } else if (g.mode === 'crate') {
        const type = g.dyn && rand() < g.dyn ? 'dynamite' : g.type;
        add(d, { spawn: [{ type, x: cam(d) + pick(-110, 110), z: pick(g.z[0], g.z[1]) }] });
      }
    }
  }
  // supply crates along the way, and a FURY drop now and then
  for (let d = 260; d < op.length - 300; d += 380) add(d, { spawn: [{ type: 'crate', x: cam(d) + pick(-110, 110), z: pick(120, 150) }] });
  for (let d = 800; d < op.length - 300; d += 900) add(d, { spawn: [{ type: 'pickup', x: cam(d), z: 130, item: 'fury' }] });
  // hostages stand with two guards each (the battle spawns the guards when the beat fires)
  let hid = 0;
  for (const h of op.hostages || []) add(h.at, { hostage: { x: cam(h.at) + h.lx, z: 140, id: ++hid } });
  for (const [at, key] of op.radio) if (typeof at === 'number') add(at, { radio: key });
  for (const h of op.holds) add(h.at, { radio: h.radio, hold: h });
  out.sort((a, b) => a.at - b.at);
  return out;
};
})();
