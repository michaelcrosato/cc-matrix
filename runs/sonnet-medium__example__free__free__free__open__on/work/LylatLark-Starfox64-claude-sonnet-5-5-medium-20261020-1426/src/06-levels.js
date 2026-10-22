'use strict';
/* ===== Level data: pure, designer-editable scripts =====
   Every level is a list of events keyed by `at` = distance along the rail (units).
   Event types: comm, tut, banner, spawn, form, ring, crate, obs, chase, checkpoint, boss, music.
   Add a level by pushing a new object into LEVELS — no engine code needed. */
const CAST = {
  lark:    { name: 'LARK',    role: 'You',          species: 'lark',  col: '#6fa8ff', pitch: 520, skin: '#d9a766' },
  quill:   { name: 'CMDR QUILL', role: 'Command',   species: 'owl',   col: '#c9c9ff', pitch: 300, skin: '#9a8a6a' },
  bramble: { name: 'BRAMBLE', role: 'Wingmate',     species: 'hare',  col: '#c79bff', pitch: 360, skin: '#d8d0c0' },
  kestrel: { name: 'KESTREL', role: 'Wingmate',     species: 'hawk',  col: '#ff7a6a', pitch: 440, skin: '#b0784a' },
  tink:    { name: 'TINK',    role: 'Wingmate',     species: 'frog',  col: '#6fe39a', pitch: 640, skin: '#58b04a' },
  gloam:   { name: 'MARSHAL GLOAM', role: 'Enemy',  species: 'crow',  col: '#ff4a6a', pitch: 200, skin: '#2a2a35' },
};
const WINGMEN = [
  { id: 'kestrel', style: 'kestrel', off: [-13, 3, -26] },
  { id: 'bramble', style: 'bramble', off: [13, 4, -30] },
  { id: 'tink',    style: 'tink',    off: [0, -3, -38] },
];
/* helpers that expand into events */
const E = {
  comm: (at, who, text, dur) => ({ at, t: 'comm', who, text, dur }),
  tut: (at, id, text) => ({ at, t: 'tut', id, text }),
  banner: (at, text, sub) => ({ at, t: 'banner', text, sub }),
  spawn: (at, kind, x, y, o = {}) => ({ at, t: 'spawn', kind, x, y, o }),
  ring: (at, x, y) => ({ at, t: 'ring', x, y }),
  crate: (at, kind, x, y) => ({ at, t: 'crate', kind, x, y }),
  obs: (at, kind, x, y, o = {}) => ({ at, t: 'obs', kind, x, y, o }),
  chase: (at, who, n = 1) => ({ at, t: 'chase', who, n }),
  cp: (at) => ({ at, t: 'checkpoint' }),
  boss: (at, kind) => ({ at, t: 'boss', kind }),
  form(at, kind, pat, n, x, y, o = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let px = x, py = y, d = 0;
      const k = i - (n - 1) / 2, sp = o.spacing || 7;
      if (pat === 'vee') { px = x + k * sp; py = y + Math.abs(k) * 2.5; d = Math.abs(k) * 14; }
      else if (pat === 'line') { px = x + k * sp; d = i * 3; }
      else if (pat === 'col') { py = y + k * sp * 0.6; d = i * 10; px = x; }
      else if (pat === 'circle') { const a = (i / n) * TAU; px = x + Math.cos(a) * sp * 1.5; py = y + Math.sin(a) * sp; d = i * 4; }
      else if (pat === 'stagger') { px = x + (i % 2 ? 1 : -1) * sp; py = y + i * 1.2; d = i * 22; }
      out.push({ at: at - d * 0.4, t: 'spawn', kind, x: px, y: py, o: Object.assign({ delay: i * (o.delay || 0.12), ph: i * 0.8 }, o.o || {}) });
    }
    return out;
  },
};
const LEVELS = [];
(function buildLevels() {
  /* ---------------- STAGE 1 : SUNREACH CANYON ---------------- */
  const ev = [];
  const add = (...a) => a.flat().forEach((e) => ev.push(e));
  add(
    E.banner(10, 'SUNREACH CANYON', 'Sector Lylat-1 · Gate Defence'),
    E.comm(30, 'quill', 'Lark Squadron, you are cleared hot. Gloam\'s blockade starts at the Sunreach gates.', 4.5),
    E.tut(120, 'move', 'Fly with {move}'),
    E.tut(210, 'fire', 'Tap {fire} to fire your lasers'),
    E.spawn(250, 'dummy', -10, 6), E.spawn(262, 'dummy', 8, 9), E.spawn(274, 'dummy', 0, 2),
    E.tut(360, 'charge', 'HOLD {fire} to lock on, release to fire'),
    E.spawn(410, 'dummy', -14, 9), E.spawn(414, 'dummy', 14, 7), E.spawn(418, 'dummy', 0, 12), E.spawn(422, 'dummy', -8, 1), E.spawn(426, 'dummy', 9, 2),
    E.tut(520, 'roll', 'Tap {rollL} or {rollR} to barrel-roll and deflect shots'),
    E.spawn(560, 'drone', 0, 4, { pat: 'tutorial' }),
    E.tut(660, 'boost', 'Hold {boost} to boost, {brake} to brake'),
    E.comm(720, 'bramble', 'Training wheels off, kid. Here come the real ones!', 3),
    E.form(780, 'drone', 'vee', 5, 0, 5),
    E.ring(850, 0, 3),
    E.form(900, 'drone', 'line', 4, 0, 10),
    E.obs(1000, 'tower', -17, 0, { h: 34 }), E.obs(1000, 'tower', 17, 0, { h: 34 }),
    E.obs(1080, 'arch', 0, 0, {}), E.ring(1090, 0, -4),
    E.spawn(1130, 'turret', -26, 0), E.spawn(1150, 'turret', 0, 0), E.spawn(1170, 'turret', 26, 0),
    E.comm(1190, 'bramble', 'Ground turrets! Charge up and lock them all.', 3),
    E.form(1260, 'fighter', 'vee', 3, 0, 6, { spacing: 10 }),
    E.cp(1300),
    E.chase(1380, 'tink'),
    E.comm(1385, 'tink', 'Help! Someone get this guy off my tail!', 3),
    E.crate(1470, 'bomb', 0, 3), E.ring(1500, -12, 5), E.ring(1520, 0, 5), E.ring(1540, 12, 5),
    E.comm(1580, 'quill', 'Mines in the channel — shoot them early or roll through the blast.', 3.6),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => E.spawn(1620 + i * 14, 'mine', Math.sin(i * 2.1) * 18, 3 + (i % 3) * 4)),
    E.spawn(1800, 'gunship', 0, 6),
    E.comm(1795, 'kestrel', 'Gunship ahead. Armor\'s thick, pop its guns with a charged shot!', 3.8),
    E.form(1930, 'drone', 'circle', 6, 0, 8),
    ...[0, 1, 2, 3, 4, 5].map((i) => E.obs(2000 + i * 50, 'tower', i % 2 ? 12 : -12, 0, { h: 30 })),
    E.ring(2150, 0, 4),
    E.chase(2220, 'kestrel'),
    E.comm(2225, 'kestrel', 'Bogey on my six! Little help here?', 2.8),
    E.form(2330, 'drone', 'stagger', 6, 0, 6, { spacing: 14 }),
    E.comm(2450, 'quill', 'Warden Cruiser dead ahead! Destroy its shield generators to open the core.', 4.5),
    E.spawn(2520, 'cruiser', 0, 8),
    E.crate(2900, 'laser', 0, 4),
    E.form(2950, 'fighter', 'line', 4, 0, 8, { spacing: 12 }),
    E.cp(3000),
    E.form(3050, 'drone', 'vee', 7, 0, 6, { spacing: 8 }),
    E.obs(3150, 'arch', 0, 0, {}), E.ring(3160, 0, -4),
    E.spawn(3220, 'turret', -22, 0), E.spawn(3235, 'turret', 22, 0),
    E.crate(3300, 'repair', 0, 4),
    E.comm(3340, 'bramble', 'Gate fortress straight ahead. That\'s Gloam\'s Titan. Stay sharp!', 4),
    E.cp(3440),
    E.boss(3500, 'bastion')
  );
  LEVELS.push({
    id: 'sunreach', name: 'SUNREACH CANYON', sub: 'Sector 1', env: 'canyon', music: 'canyon', speed: 46, length: 3500, medal: { gold: 70, silver: 45 },
    brief: 'Gloam\'s blockade has sealed the Sunreach gates. Cut through the canyon, silence the Warden Cruiser and bring down the Gantry Titan.',
    objectives: ['Learn the controls in the training run', 'Destroy the Warden Cruiser', 'Defeat the Gantry Titan', 'Keep your wingmates alive'],
    events: ev.sort((a, b) => a.at - b.at),
  });

  /* ---------------- STAGE 2 : VEIL ASTEROIDS ---------------- */
  const e2 = [];
  const add2 = (...a) => a.flat().forEach((e) => e2.push(e));
  const asteroidRow = (at, n, spread, sizes = [5, 9]) => Array.from({ length: n }, (_, i) => E.spawn(at + i * 26, 'asteroid', Math.sin(i * 1.7 + at) * spread, Math.cos(i * 2.3 + at) * spread * 0.4 + 4, { r: rand(sizes[0], sizes[1]), seed: i + at }));
  add2(
    E.banner(10, 'VEIL ASTEROIDS', 'Sector Lylat-2 · Debris Run'),
    E.comm(30, 'quill', 'The Veil is Gloam\'s shipyard. Thread the rocks and take out the Hive Maw.', 4.2),
    ...asteroidRow(160, 7, 22),
    E.form(330, 'drone', 'vee', 5, 0, 6),
    E.ring(420, 0, 4), E.ring(445, 10, 8), E.ring(470, -10, 2),
    E.comm(520, 'tink', 'Raiders in the rocks! Use the asteroids for cover.', 3),
    E.form(560, 'fighter', 'stagger', 4, 0, 6, { spacing: 12 }),
    ...asteroidRow(700, 8, 26, [6, 12]),
    E.chase(820, 'bramble'),
    E.comm(825, 'bramble', 'They\'re on me! Shake \'em, Lark!', 3),
    E.crate(900, 'bomb', 0, 4),
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => E.spawn(1000 + i * 11, 'mine', Math.cos(i * 1.3) * 20, 4 + Math.sin(i) * 7)),
    E.spawn(1220, 'gunship', -12, 6), E.spawn(1260, 'gunship', 12, 8),
    E.comm(1215, 'kestrel', 'Twin gunships. Lock them both and let rip!', 3.4),
    E.cp(1450),
    ...asteroidRow(1500, 6, 24, [8, 14]),
    E.form(1650, 'drone', 'circle', 8, 0, 6),
    E.ring(1760, 0, 4),
    E.chase(1820, 'tink'), E.comm(1825, 'tink', 'Another one! Why always me?!', 2.6),
    E.obs(1950, 'arch', 0, 0, { h: 26, floating: true }), E.ring(1960, 0, 0),
    E.form(2050, 'fighter', 'vee', 5, 0, 7, { spacing: 12 }),
    E.crate(2160, 'repair', 0, 4),
    E.spawn(2250, 'cruiser', 0, 8),
    E.comm(2240, 'quill', 'Another Warden! Same drill: generators first.', 3.2),
    E.crate(2650, 'laser', 0, 3),
    E.cp(2700),
    E.comm(2760, 'bramble', 'That\'s the Maw. Take out its plating, then the core!', 3.8),
    E.cp(2850),
    E.boss(2900, 'hivemaw')
  );
  LEVELS.push({
    id: 'veil', name: 'VEIL ASTEROIDS', sub: 'Sector 2', env: 'space', music: 'space', speed: 50, length: 2900, medal: { gold: 80, silver: 50 },
    brief: 'Gloam\'s drydock hides in the Veil. Weave through the asteroid belt, drop the second Warden and crack open the Hive Maw.',
    objectives: ['Fly through the asteroid belt', 'Destroy the Warden Cruiser', 'Break the Hive Maw\'s plating', 'Destroy the Hive core'],
    events: e2.sort((a, b) => a.at - b.at),
  });
})();
