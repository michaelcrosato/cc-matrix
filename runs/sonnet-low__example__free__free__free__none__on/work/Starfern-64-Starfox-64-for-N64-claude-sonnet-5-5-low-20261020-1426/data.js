'use strict';
/* ===== DATA: designer-facing stage scripts. Add stages/events here; the engine does the rest. ===== */
const CAST = {
  HQ: { name: 'Gen. Harlow', col: '#9fd8ff', ch: 'H' },
  EMBER: { name: 'Ember', col: '#c6ff6a', ch: 'E' },
  POGO: { name: 'Pogo', col: '#7fe3ff', ch: 'P' },
  SABLE: { name: 'Sable', col: '#ffb060', ch: 'S' },
  MOSS: { name: 'Moss', col: '#ff9ad2', ch: 'M' },
  FOE: { name: 'Blight Captain', col: '#ff6a6a', ch: 'B' }
};
const WINGMEN = [{ name: 'Pogo', mesh: 'ally1', who: 'POGO' }, { name: 'Sable', mesh: 'ally2', who: 'SABLE' }, { name: 'Moss', mesh: 'ally3', who: 'MOSS' }];

function buildStage(def) {
  const ev = [];
  const A = (z, t, o = {}) => ev.push(Object.assign({ z, t }, o));
  const api = {
    darts: (z, n, pat = 'line', x = 0, y = 2) => A(z, 'darts', { n, pat, x, y }),
    turret: (z, x) => A(z, 'turret', { x }),
    tower: (z, x, h = 30) => A(z, 'tower', { x, h }),
    rock: (z, x, y, s = 3) => A(z, 'rock', { x, y, s }),
    heavy: (z, x, y) => A(z, 'heavy', { x, y }),
    mine: (z, x, y) => A(z, 'mine', { x, y }),
    gate: (z, gx, gy) => A(z, 'gate', { gx, gy }),
    ring: (z, x, y) => A(z, 'ring', { x, y }),
    power: (z, x, y, kind) => A(z, 'power', { x, y, kind }),
    pursuit: (z, ally) => A(z, 'pursuit', { ally }),
    comm: (z, who, text, dur = 4) => A(z, 'comm', { who, text, dur }),
    hint: (z, id, text, need) => A(z, 'hint', { id, text, need }),
    cp: (z, name) => A(z, 'cp', { name }),
    boss: (z) => A(z, 'boss', {}),
    A
  };
  def.script(api);
  ev.sort((a, b) => a.z - b.z);
  def.events = ev;
  return def;
}

const STAGES = [
  buildStage({
    id: 'canyon', name: 'Frondfall Canyon', sector: 'SECTOR F-1', blurb: 'Skim the overgrown canyon, rescue Comet Wing and topple the Thornwalker.',
    env: 'canyon', ground: -15, length: 6400, bossName: 'THORNWALKER', bossHp: 220, track: 0, par: 40,
    pal: { top: [18, 50, 95], mid: [120, 190, 180], bot: [230, 235, 170], ground: [24, 78, 52], grid: [130, 245, 150], fog: [165, 215, 175], sun: [255, 200, 110] },
    script(s) {
      s.comm(10, 'HQ', 'Comet Wing, the Blight has choked the canyon with spores. Clear a path to the Thornwalker!', 5);
      s.comm(80, 'EMBER', 'Frond Squadron, form up. Stay on my wing!', 3);
      s.hint(60, 'move', 'MOVE your ship with the Left Stick', 'move');
      s.hint(260, 'fire', 'Tap FIRE to shoot lasers', 'fire');
      s.darts(280, 3, 'line', 0, 2);
      s.darts(420, 4, 'v', 0, 4);
      s.hint(520, 'charge', 'HOLD FIRE to lock on, release for homing shots', 'lock');
      s.darts(560, 5, 'sine', -10, 3); s.darts(640, 5, 'sine', 10, 0);
      s.ring(720, 0, 0); s.ring(740, 8, 3);
      s.turret(800, -14); s.turret(830, 16);
      s.darts(900, 6, 'pincer', 0, 3);
      s.hint(980, 'roll', 'Press L1 / R1 to BARREL ROLL — it reflects shots', 'roll');
      s.darts(1000, 5, 'v', 0, 2); s.darts(1060, 6, 'pincer', 0, 5);
      s.cp(1200, 'Canyon Mouth');
      s.tower(1260, -10, 36); s.tower(1260, 14, 36); s.tower(1330, 0, 36); s.tower(1400, -18, 36); s.tower(1400, 18, 36);
      s.hint(1250, 'boost', 'R2 BOOST / L2 BRAKE to dodge scenery', 'boost');
      s.power(1450, 0, 4, 'bomb');
      s.darts(1500, 6, 'sine', 0, 3);
      s.pursuit(1580, 0);
      s.comm(1590, 'POGO', 'Ember! One of them is on my tail — get it off me!', 4);
      s.darts(1720, 6, 'v', 0, 2);
      s.heavy(1850, 0, 4);
      s.hint(1850, 'bomb', 'Press SQUARE to drop a BOMB when swarmed', 'bomb');
      s.darts(1960, 4, 'pincer', 0, 3); s.darts(2000, 8, 'line', 0, 6);
      s.gate(2150, 0, 0); s.gate(2300, -12, 4); s.gate(2450, 12, -4);
      s.ring(2380, -12, 4); s.ring(2530, 12, -4);
      s.cp(2650, 'Spore Gate');
      s.turret(2700, -10); s.turret(2700, 10); s.turret(2780, 0);
      s.darts(2800, 6, 'sine', 0, 3);
      s.power(2900, 8, 6, 'laser');
      s.heavy(3000, -12, 3); s.heavy(3030, 12, 3);
      s.darts(3100, 8, 'v', 0, 3);
      s.pursuit(3250, 1);
      s.comm(3260, 'SABLE', 'They\'re all over me! Shoot it off!', 4);
      s.darts(3400, 6, 'pincer', 0, 4);
      s.mine(3550, -6, 0); s.mine(3550, 6, 0); s.mine(3600, 0, 5); s.mine(3650, -12, 3); s.mine(3650, 12, 3);
      s.cp(3900, 'Rotwood Bend');
      s.heavy(3980, -10, 4); s.heavy(4000, 10, 4); s.heavy(4020, 0, 7);
      s.darts(4150, 8, 'sine', 0, 3); s.darts(4250, 8, 'pincer', 0, 5);
      s.ring(4300, 0, 0);
      s.gate(4400, 14, 6); s.gate(4500, -14, -2); s.gate(4600, 0, 8);
      s.turret(4650, -16); s.turret(4650, 16);
      s.pursuit(4760, 2);
      s.comm(4770, 'MOSS', 'Help! Get this bug off my tail!', 4);
      s.darts(4900, 10, 'v', 0, 2); s.darts(5050, 10, 'line', 0, 7);
      s.power(5100, 0, 2, 'bomb');
      s.heavy(5200, -12, 3); s.heavy(5200, 12, 3); s.heavy(5260, 0, 6);
      s.darts(5400, 10, 'pincer', 0, 3);
      s.ring(5600, 0, 0);
      s.comm(5800, 'HQ', 'The Thornwalker is dead ahead. Hit the glowing core when its armor opens!', 5);
      s.cp(5950, 'Thornwalker Arena');
      s.boss(6050);
    }
  }),
  buildStage({
    id: 'nebula', name: 'Sporecloud Drift', sector: 'SECTOR F-2', blurb: 'Fly through the asteroid-choked nebula and sink the Sporedreadnought.',
    env: 'space', ground: -999, length: 6600, bossName: 'SPOREDREADNOUGHT', bossHp: 300, track: 1, par: 46,
    pal: { top: [8, 4, 30], mid: [60, 20, 90], bot: [150, 60, 150], ground: [0, 0, 0], grid: [0, 0, 0], fog: [30, 10, 55], sun: [255, 120, 220] },
    script(s) {
      s.comm(10, 'HQ', 'Into the Sporecloud. Watch for asteroids and Blight pods!', 4);
      s.rock(150, 0, 4, 3); s.rock(190, -10, -2, 4); s.rock(220, 12, 5, 3);
      s.darts(300, 5, 'sine', 0, 3); s.darts(400, 6, 'v', 0, 2);
      s.ring(480, 0, 0);
      s.rock(520, 0, 0, 4); s.rock(540, -14, 6, 5); s.rock(560, 14, -5, 5); s.rock(620, 6, 4, 3); s.rock(640, -8, -6, 3);
      s.darts(700, 6, 'pincer', 0, 3);
      s.heavy(800, 0, 4);
      s.darts(900, 8, 'sine', 0, 3);
      s.cp(1000, 'Nebula Edge');
      s.pursuit(1100, 1); s.comm(1110, 'SABLE', 'Another one on me! Ember, please!', 4);
      s.rock(1200, -10, 3, 5); s.rock(1230, 10, -3, 5); s.rock(1260, 0, 0, 6); s.rock(1300, -16, -5, 4); s.rock(1300, 16, 6, 4);
      s.darts(1350, 8, 'v', 0, 3);
      s.power(1450, 0, 3, 'bomb');
      s.mine(1500, -6, 2); s.mine(1500, 6, 2); s.mine(1560, 0, -4); s.mine(1600, -12, 4); s.mine(1600, 12, 4);
      s.heavy(1700, -12, 3); s.heavy(1720, 12, 3);
      s.darts(1850, 10, 'pincer', 0, 4);
      s.ring(2000, 0, 0); s.ring(2020, 8, 4);
      s.rock(2050, -6, -4, 6); s.rock(2100, 8, 2, 6); s.rock(2150, 0, 6, 5);
      s.darts(2200, 10, 'sine', 0, 3);
      s.cp(2400, 'Spore Heart');
      s.gate(2450, 10, 3); s.gate(2550, -10, -3); s.gate(2650, 0, 6);
      s.pursuit(2750, 2); s.comm(2760, 'MOSS', 'Ember, it\'s locked on me! Hurry!', 4);
      s.darts(2900, 10, 'v', 0, 3);
      s.power(3000, 0, 4, 'laser');
      s.heavy(3100, -12, 4); s.heavy(3100, 12, 4); s.heavy(3160, 0, 0); s.heavy(3200, 0, 8);
      s.darts(3400, 12, 'pincer', 0, 3);
      s.rock(3500, 0, 0, 7); s.rock(3560, -12, 4, 6); s.rock(3560, 12, -4, 6); s.rock(3620, 0, 6, 5);
      s.cp(3800, 'Pod Garden');
      s.mine(3850, -10, 0); s.mine(3850, 10, 0); s.mine(3900, 0, 4); s.mine(3900, 0, -4);
      s.darts(4000, 10, 'sine', 0, 3); s.darts(4100, 12, 'line', 0, 6);
      s.pursuit(4250, 0); s.comm(4260, 'POGO', 'Chased again! A little help?', 4);
      s.heavy(4400, -14, 3); s.heavy(4400, 14, 3);
      s.ring(4600, 0, 0);
      s.gate(4700, 14, 0); s.gate(4800, -14, 4); s.gate(4900, 0, -6);
      s.darts(5000, 12, 'pincer', 0, 3); s.darts(5200, 12, 'v', 0, 2);
      s.power(5300, 0, 2, 'bomb');
      s.heavy(5400, -12, 3); s.heavy(5400, 12, 3); s.heavy(5460, 0, 6);
      s.darts(5600, 14, 'sine', 0, 3);
      s.comm(5900, 'HQ', 'That\'s the Sporedreadnought! Shoot its core when the hatches open!', 5);
      s.cp(6050, 'Dreadnought Approach');
      s.boss(6200);
    }
  })
];
