// ===== 08_levels: data-driven stage definitions =====
// A stage is plain data: environment, bounds, checkpoints and a timeline of events keyed by rail distance.
// Event types: say, tip, banner, music, scout, swooper, drone, turret, mine, asteroid, ring, crate, walker,
//              carrier, rock, arch, laserGate, help, gunship, crawler. Designers add stages by appending to LEVELS.
const row = (at, t, xs, y, extra = {}) => xs.map((x, i) => ({ at: at + (extra.stagger || 0) * i, t, x, y: typeof y === 'function' ? y(i) : y, ...extra }));
const range = (a, b, step) => { const r = []; for (let v = a; v <= b; v += step) r.push(v); return r; };
const sq = (id) => ({ squad: id });
const say = (at, who, text, dur = 3.6) => ({ at, t: 'say', who, text, dur });
const tip = (at, id) => ({ at, t: 'tip', id });

const TIPS = {
  move: { text: 'Steer with {move}', done: 'move' },
  fire: { text: 'Tap {fire} to fire lasers', done: 'fire' },
  roll: { text: 'Double-tap left/right or press {roll} to Barrel Roll — it reflects enemy shots!', done: 'roll' },
  lock: { text: 'HOLD {fire} to charge and lock onto several targets, release to fire homing shots', done: 'lock' },
  boost: { text: 'Hold {boost} to Boost — watch the heat gauge', done: 'boost' },
  brake: { text: 'Hold {brake} to Brake and line up precise shots', done: 'brake' },
  bomb: { text: 'Press {bomb} to detonate a Nova Bomb — clears shots and damages everything ahead', done: 'bomb' },
};

function buildOrchard() {
  const ev = [];
  ev.push(say(20, 'granny', 'Furrow Squadron, this is Orchard Command. The Blight Armada is swarming our harvest convoy!', 4.4));
  ev.push(tip(60, 'move'));
  ev.push(say(210, 'hazel', 'Furrow Lead copies. Squadron — plant your flags, let us go!', 3.4));
  ev.push(tip(300, 'fire'));
  ev.push(...row(330, 'drone', [-14, -7, 0, 7, 14], (i) => [6, -2, 4, -3, 7][i], { stagger: 30, hp: 1 }));
  ev.push(say(560, 'buckle', 'Gun pods on the fence line! Barrel Roll to bounce their shots right back!', 4));
  ev.push(tip(640, 'roll'));
  ev.push({ at: 700, t: 'turret', x: -16, y: -6 }, { at: 745, t: 'turret', x: 15, y: 5 }, { at: 790, t: 'turret', x: 0, y: -9 }, { at: 840, t: 'turret', x: -11, y: 7 });
  ev.push(say(980, 'marrow', 'Hold your fire button to paint a whole swarm, then let go!', 3.8));
  ev.push(tip(1030, 'lock'));
  ev.push(...row(1080, 'drone', [-16, -10, -4, 4, 10, 16], (i) => [8, 2, 8, 2, 8, 2][i], { stagger: 8, hp: 1, fire: 0 }));
  ev.push(...row(1190, 'drone', [-12, -6, 0, 6, 12], (i) => [-6, 0, 6, 0, -6][i], { stagger: 8, hp: 1 }));
  ev.push({ at: 1500, t: 'ring', kind: 'silver', x: 0, y: 0 });
  ev.push(say(1560, 'granny', 'Asteroid orchard ahead. Boost through the gaps, or brake and pick your way.', 4));
  ev.push(tip(1640, 'boost'));
  // asteroid field
  let k = 0;
  for (let at = 1720; at < 2500; at += 26) { k++; const x = ((k * 37) % 41) - 20, y = ((k * 53) % 25) - 12; ev.push({ at, t: 'asteroid', x, y, size: 3 + (k % 4) * 1.4, hp: 3, variant: k % 4 }); if (k % 3 === 0) ev.push({ at: at + 6, t: 'asteroid', x: -x * 0.7, y: -y * 0.8, size: 5, solid: true, variant: (k + 1) % 4 }); }
  ev.push(tip(2080, 'brake'));
  ev.push({ at: 2300, t: 'ring', kind: 'silver', x: 6, y: -4 });
  ev.push(say(2560, 'clover', 'Bandits! Twelve o\'clock, a whole squad of moths!', 3.4));
  ev.push(...row(2640, 'scout', [-12, -4, 4, 12], (i) => [4, -4, 4, -4][i], { stagger: 12, ...sq('s1a'), pattern: 'weave', hp: 2 }));
  ev.push({ at: 2900, t: 'crate', kind: 'bomb', x: 6, y: 3 });
  ev.push(tip(2930, 'bomb'));
  ev.push(...row(3010, 'scout', [-18, -9, 0, 9, 18], (i) => [6, -6, 8, -6, 6][i], { stagger: 8, ...sq('s1b'), pattern: 'dive', hp: 2, speed: 44 }));
  ev.push(...row(3040, 'mine', [-14, -5, 5, 14], (i) => [-2, 4, -4, 2][i], { stagger: 14, hp: 1 }));
  ev.push(...row(3180, 'scout', [-16, -8, 0, 8, 16], 0, { stagger: 10, ...sq('s1c'), pattern: 'weave', hp: 2, burst: 2 }));
  ev.push({ at: 3300, t: 'help', who: 'clover', chasers: 2 });
  ev.push({ at: 3620, t: 'ring', kind: 'gold', x: 0, y: 2 });
  ev.push(say(3700, 'granny', 'That is the harvest depot ahead. Blight laser fences — shoot a pylon to drop the beam.', 4.2));
  ev.push({ at: 3850, t: 'laserGate', x: 0, y: 0, width: 34 });
  ev.push({ at: 3900, t: 'turret', x: -20, y: -8 }, { at: 3900, t: 'turret', x: 20, y: 8 });
  ev.push({ at: 4020, t: 'crate', kind: 'laser', x: 0, y: -4 });
  ev.push({ at: 4140, t: 'laserGate', x: 0, y: -4, width: 38 });
  ev.push({ at: 4190, t: 'turret', x: -12, y: 9 }, { at: 4190, t: 'turret', x: 12, y: -9 });
  ev.push(say(4400, 'buckle', 'Carrier at ten o\'clock! It is launching fighters!', 3.4));
  ev.push({ at: 4520, t: 'carrier', x: -19, y: -2, launches: 6 });
  ev.push(...row(4620, 'scout', [8, 14], 3, { stagger: 20, ...sq('s1d'), pattern: 'dive', hp: 2 }));
  ev.push({ at: 4980, t: 'ring', kind: 'silver', x: 0, y: 0 });
  for (let at = 5060, j = 0; at < 5500; at += 30, j++) { const x = ((j * 29) % 36) - 18, y = ((j * 41) % 22) - 11; ev.push({ at, t: 'asteroid', x, y, size: 5.5, solid: true, variant: j % 4 }); ev.push({ at: at + 12, t: 'asteroid', x: -x, y: y * 0.6, size: 3.2, hp: 3, variant: (j + 2) % 4 }); }
  ev.push({ at: 5430, t: 'help', who: 'buckle', chasers: 2 });
  ev.push(say(5620, 'marrow', 'Dive-bombers! Careful — a couple will get behind us!', 3.4));
  ev.push(...row(5700, 'swooper', [-16, -8, 0, 8, 16], 10, { stagger: 6, ...sq('s1e'), hp: 2, pattern: 'dive', speed: 52 }));
  ev.push({ at: 5780, t: 'scout', x: -6, y: 0, tail: true, hp: 2, pattern: 'weave' }, { at: 5800, t: 'scout', x: 6, y: 2, tail: true, hp: 2, pattern: 'weave' });
  ev.push({ at: 6050, t: 'crate', kind: 'bomb', x: -6, y: 3 }, { at: 6080, t: 'ring', kind: 'silver', x: 4, y: -2 });
  ev.push(say(6120, 'granny', 'Huge energy reading dead ahead — it is a Blight gunship! Break its turrets, then the eye!', 4.6));
  ev.push({ at: 6380, t: 'music', name: 'boss' });
  ev.push({ at: 6400, t: 'gunship' });
  ev.sort((a, b) => a.at - b.at);
  return ev;
}

function buildGorge() {
  const ev = [];
  ev.push(say(20, 'granny', 'Dustbowl Gorge. Blight walkers are strip-mining the canyon walls. Stay low and keep moving!', 4.6));
  ev.push(tip(120, 'move'));
  ev.push(...row(180, 'turret', [-14, 14], 0, { stagger: 20 }));
  ev.push(...row(300, 'turret', [-8, 8, -20, 20], 0, { stagger: 18 }));
  ev.push({ at: 460, t: 'arch', x: 0, width: 26, height: 22 });
  ev.push({ at: 470, t: 'ring', kind: 'silver', x: 0, y: 10 });
  ev.push(say(620, 'clover', 'Walkers up ahead — they lob missiles! Shoot them down or roll through!', 3.8));
  ev.push({ at: 760, t: 'walker', x: -10 }, { at: 880, t: 'walker', x: 10, double: true });
  ev.push(...row(960, 'drone', [-12, -4, 4, 12], (i) => [14, 8, 14, 8][i], { stagger: 12, hp: 1, fire: 2.2 }));
  ev.push({ at: 1180, t: 'arch', x: -6, width: 22, height: 18 }, { at: 1260, t: 'arch', x: 8, width: 22, height: 18 });
  ev.push(say(1380, 'buckle', 'Laser fences! Duck under or shoot a pylon!', 3.2));
  ev.push({ at: 1500, t: 'laserGate', x: 0, y: 14, width: 44 });
  ev.push({ at: 1700, t: 'laserGate', x: 0, y: 7, width: 44 });
  ev.push({ at: 1760, t: 'crate', kind: 'bomb', x: 0, y: 10 });
  // rock slalom
  for (let at = 1900, j = 0; at < 2500; at += 40, j++) { const x = ((j * 23) % 30) - 15; ev.push({ at, t: 'rock', x, w: 7, h: 24 + (j % 3) * 6, d: 7 }); }
  ev.push({ at: 2200, t: 'ring', kind: 'silver', x: 0, y: 15 });
  ev.push(say(2560, 'marrow', 'Fighters coming in low through the gorge!', 3));
  ev.push(...row(2640, 'scout', [-14, -6, 6, 14], (i) => [8, 14, 14, 8][i], { stagger: 10, ...sq('g2a'), pattern: 'weave', hp: 2, burst: 2 }));
  ev.push(...row(2900, 'swooper', [-18, -9, 0, 9, 18], 24, { stagger: 6, ...sq('g2b'), pattern: 'dive', hp: 2, speed: 50 }));
  ev.push({ at: 3100, t: 'help', who: 'marrow', chasers: 2 });
  ev.push({ at: 3380, t: 'crate', kind: 'laser', x: 0, y: 12 });
  ev.push(...row(3420, 'mine', [-16, -8, 0, 8, 16], (i) => [10, 18, 12, 20, 10][i], { stagger: 14 }));
  ev.push(...row(3560, 'mine', [-12, -4, 4, 12], (i) => [16, 9, 16, 9][i], { stagger: 14 }));
  ev.push({ at: 3900, t: 'ring', kind: 'gold', x: 0, y: 13 });
  ev.push(say(4040, 'granny', 'The Blight mining rigs are heavily armed. Use your Nova Bomb if you get surrounded.', 4));
  ev.push({ at: 4200, t: 'walker', x: -12, double: true }, { at: 4210, t: 'walker', x: 12, double: true });
  ev.push(...row(4300, 'turret', [-22, -14, 14, 22], 0, { stagger: 10 }));
  ev.push({ at: 4420, t: 'laserGate', x: 0, y: 12, width: 46 });
  ev.push({ at: 4700, t: 'arch', x: 0, width: 20, height: 16 }, { at: 4770, t: 'arch', x: -8, width: 20, height: 16 }, { at: 4840, t: 'arch', x: 8, width: 20, height: 16 });
  ev.push({ at: 4770, t: 'ring', kind: 'silver', x: -8, y: 8 });
  ev.push({ at: 5000, t: 'help', who: 'buckle', chasers: 3 });
  ev.push(...row(5300, 'scout', [-16, -8, 0, 8, 16], (i) => [10, 18, 12, 18, 10][i], { stagger: 8, ...sq('g2c'), pattern: 'dive', hp: 2, speed: 46, burst: 2 }));
  ev.push({ at: 5420, t: 'scout', x: -4, y: 14, tail: true, hp: 2 }, { at: 5440, t: 'scout', x: 4, y: 16, tail: true, hp: 2 });
  ev.push({ at: 5700, t: 'crate', kind: 'bomb', x: 4, y: 12 }, { at: 5730, t: 'ring', kind: 'silver', x: -4, y: 10 });
  ev.push(say(5880, 'granny', 'This is it — the Colossus Crawler! Knock out its shield generators, then crack the core!', 4.6));
  ev.push({ at: 6280, t: 'music', name: 'boss' });
  ev.push({ at: 6300, t: 'crawler' });
  ev.sort((a, b) => a.at - b.at);
  return ev;
}

const LEVELS = [
  {
    id: 'orchard', num: 1, name: 'Orchard Belt', sub: 'Defend the harvest convoy', music: 'stage1', boss: 'Blight Gunship',
    scenery: 'space', gravity: 0, ground: null, bounds: { x: 24, yMin: -14, yMax: 14 },
    brief: ['Blight raiders are swarming the Orchard Belt.', 'Clear the asteroid field, protect Furrow wingmates, and crack the Blight Gunship.'],
    env: {
      skyTop: 0x0a0630, skyMid: 0x4a2a86, skyBot: 0x160c38, fog: 0x2a1a60, fogDensity: 0.0016, hemiSky: 0xbfd0ff, hemiGround: 0x4a3470, hemiI: 1.15,
      sun: 0xfff0d8, sunI: 2.4, sunDir: [0.5, 0.9, 0.7], rim: 0x80b0ff, dust: 0xcfd8ff, rock: 0x7a6a82,
      planets: [
        { r: 520, color: 0xf0b050, emissive: 0xf0a040, ring: 0xffe0a0, pos: [-900, 420, -1800], spin: 0.02, moon: true },
        { r: 180, color: 0x60a8e0, emissive: 0x4090d0, pos: [1100, -260, -2200], spin: 0.04 },
        { r: 90, color: 0xe86a90, emissive: 0xd05070, pos: [380, 520, -1500], spin: 0.03 },
      ],
    },
    checkpoints: [0, 2800, 5000, 6200], length: 6400, events: buildOrchard(),
  },
  {
    id: 'gorge', num: 2, name: 'Dustbowl Gorge', sub: 'Strip-miners in the canyon', music: 'stage2', boss: 'Colossus Crawler',
    scenery: 'canyon', gravity: -22, ground: 0, bounds: { x: 26, yMin: 2.5, yMax: 26 },
    brief: ['Blight walkers are strip-mining the canyon walls.', 'Fly low, dodge arches and laser fences, then topple the Colossus Crawler.'],
    env: {
      skyTop: 0x2a62c8, skyMid: 0xff9a60, skyBot: 0xffd8a0, fog: 0xf0b080, fogDensity: 0.0042, hemiSky: 0xcfe0ff, hemiGround: 0xc88850, hemiI: 1.25,
      sun: 0xfff0c8, sunI: 2.6, sunDir: [-0.5, 1, 0.6], rim: 0xffa060, dust: 0xffe0b0, rock: 0xb0643a, floor: 0xc8854a, stars: false,
      planets: [
        { r: 420, color: 0xffd8a0, emissive: 0xffc080, ring: 0xffffff, pos: [800, 700, -2300], spin: 0.01 },
        { r: 140, color: 0xd07060, emissive: 0xb05040, pos: [-1100, 500, -2000], spin: 0.02 },
      ],
    },
    checkpoints: [0, 2400, 4600, 6000], length: 6500, events: buildGorge(),
  },
];
