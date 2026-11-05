/* Floors: built from room rectangles and single-cell overrides. Wall features are addressed by the open cell and the way you face. */
B.buildFloor = (def) => {
  const W = def.w, H = def.h, g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill('#'));
  for (const r of def.rooms) for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) g[y][x] = '.';
  for (const k in def.set) { const [x, y] = k.split(',').map(Number); g[y][x] = def.set[k]; }
  def.rows = g.map(r => r.join('')); return def;
};
B.FLOORS = {};
B.FLOORS.f1 = B.buildFloor({
  id: 'f1', name: 'The Hasp Drains', flavor: 'Water drips. Somewhere, a bolt slides home.', song: 'drains', w: 20, h: 14, wander: 3,
  look: { ground: 'flagstone', colors: { base: '#3e4a44', dark: '#2a332f', light: '#55615a' }, side: 'brick', color: '#4a5048', fog: '#06080a', near: 24, far: 150, amb: ['#4a5a5a', '#1a201e', 2.6] },
  rooms: [[1, 10, 5, 12], [1, 6, 5, 8], [1, 1, 8, 4], [7, 7, 8, 7], [7, 11, 13, 11], [14, 9, 18, 12], [10, 1, 18, 5], [16, 7, 18, 7]],
  set: { '3,9': '+', '3,7': 'P', '3,5': '=', '6,7': 'I', '6,11': '=', '10,11': 'T', '16,8': 'H', '9,2': 'L', '18,1': '>' },
  start: [3, 12, 0], safe: [[1, 10, 5, 12]],
  gates: { '3,5': 'gP', '6,11': 'gS' }, locks: { '9,2': { key: 'iron', kind: 'simple', name: 'The Drain Door' } },
  secrets: { '6,7': 'I1', '16,8': 'SW1' },
  stairs: { '18,1': { to: 'f2', at: [2, 11, 0] } },
  plates: { '3,7': { id: 'pP', mode: 'hold' } },
  features: [
    { at: [5, 10, 'N'], k: 'lever', id: 'lvS' },
    { at: [1, 11, 'W'], k: 'plaque', text: 'n1' },
    { at: [1, 12, 'W'], k: 'alcove', id: 'alStart', holds: ['rustdag', 'rock'] },
    { at: [14, 10, 'W'], k: 'catch', id: 'cSW1' },
    { at: [18, 7, 'E'], k: 'alcove', id: 'alOffer', accepts: 'rustdag', title: 'a small offering niche' },
    { at: [14, 1, 'N'], k: 'plaque', text: 'n2' },
    { at: [11, 5, 'S'], k: 'button', id: 'bA' }, { at: [15, 5, 'S'], k: 'button', id: 'bB' },
    { at: [18, 3, 'E'], k: 'alcove', id: 'alWard1', holds: ['ward1'] },
    { at: [3, 1, 'N'], k: 'plaque', text: 'n3' },
    { at: [10, 1, 'N'], k: 'torch' }, { at: [2, 12, 'S'], k: 'torch' }, { at: [15, 9, 'N'], k: 'torch' }, { at: [13, 11, 'N'], k: 'torch' }, { at: [5, 6, 'N'], k: 'torch' }
  ],
  wires: [
    { when: 'lever:lvS:on', do: [['gate', 'gS', 'open'], ['msg', 'A sluice grinds open somewhere close.']] },
    { when: 'plate:pP:down', do: [['gate', 'gP', 'open'], ['msg', 'The plate sinks. Chains rattle: a gate rises.']] },
    { when: 'plate:pP:up', do: [['gate', 'gP', 'close'], ['msg', 'The plate rises. The gate comes down with a bang.']] },
    { when: 'catch:cSW1', do: [['secret', '16,8'], ['msg', 'A stone clicks. Part of the wall slides into the floor!']] },
    { when: 'buttons:bA+bB', do: [['give', 'potion', [13, 5]], ['give', 'ironration', [13, 5]], ['msg', 'Both buttons hold. Something drops from a hidden chute.']] },
    { when: 'alcove:alOffer:in', do: [['special', 'd1'], ['msg', 'The niche accepts the dagger. Something small, far away, forgives you.']] }
  ],
  items: [[2, 11, 'ration'], [4, 11, 'rock'], [15, 9, 'note1'], [16, 12, 'ironration'], [8, 7, 'potion'], [7, 7, 'scrorb'], [17, 7, 'loaf'], [18, 7, 'ringdef'], [12, 3, 'darts', 6]],
  mons: [[9, 11, 'rat', 'idle'], [12, 11, 'rat', 'idle'], [16, 11, 'leech', 'idle'], [15, 10, 'ooze', 'asleep'], [4, 2, 'latchkin', 'asleep'], [7, 3, 'latchkin', 'asleep'], [2, 4, 'latchkin', 'idle'], [6, 2, 'snick', 'asleep'],
         [12, 4, 'ratknot', 'idle'], [14, 2, 'rat', 'idle'], [16, 4, 'rat', 'idle']],
  npcs: [{ id: 'tamsin', at: [17, 10], face: 3 }],
  hints: [[75, 'gS', 'There is a lever on the wall beside the door. Face it and use it.'], [150, 'gP', 'Plates weigh things down. A rock would do. There is one lying about.']],
  waypoints: { 'F1 Start': [3, 11, 0], 'F1 Channel': [8, 11, 1], 'F1 Cistern': [15, 11, 1], 'F1 Latchkin Den': [4, 3, 1], 'F1 Stairs Hall': [12, 3, 1] }
});
B.FLOORS.f2 = B.buildFloor({
  id: 'f2', name: 'The Tumbler Halls', flavor: 'Gears tick behind the walls. The guild still keeps time.', song: 'tumbler', w: 20, h: 14, wander: 3,
  look: { ground: 'flagstone', colors: { base: '#5a4a3a', dark: '#3e3228', light: '#7a6450' }, side: 'block', color: '#6a5a48', fog: '#0a0806', near: 40, far: 220, amb: ['#7a6048', '#2a2018', 3.0] },
  rooms: [[1, 10, 4, 12], [6, 9, 12, 12], [6, 5, 10, 7], [14, 11, 18, 11], [18, 5, 18, 10], [13, 2, 18, 4], [8, 2, 11, 3], [1, 6, 4, 8]],
  set: { '5,11': '+', '13,11': '+', '8,8': 'L', '18,11': '^', '18,7': 'O', '18,8': 'O', '12,3': 'M', '2,9': '=', '2,12': '<', '9,2': '>', '12,12': 'o' },
  start: [2, 11, 0], safe: [[1, 10, 4, 12], [1, 6, 4, 8]],
  gates: { '2,9': 'gC' }, locks: { '8,8': { key: 'brass', kind: 'warded', name: 'the Workshop door' } },
  secrets: {}, stairs: { '2,12': { to: 'f1', at: [18, 2, 2] }, '9,2': { to: 'f3', at: [2, 11, 0] } },
  pits: { '18,7': { to: 'f3', at: [3, 11] }, '18,8': { to: 'f3', at: [3, 11] }, '12,12': { to: 'f3', at: [3, 11] } },
  tele: { '18,11': { to: [14, 11, 1], silent: true, id: 'tpLoop' } },
  plates: {},
  features: [
    { at: [9, 9, 'N'], k: 'clock', id: 'clock', need: 4 },
    { at: [3, 10, 'N'], k: 'plaque', text: 'n4' },
    { at: [16, 11, 'S'], k: 'catch', id: 'cSW2', secret: 'SW2' },
    { at: [15, 11, 'N'], k: 'plaque', text: 'n5' },
    { at: [8, 5, 'N'], k: 'torch' }, { at: [6, 6, 'W'], k: 'torch' }, { at: [10, 6, 'E'], k: 'torch' }, { at: [9, 12, 'S'], k: 'torch' }, { at: [1, 11, 'W'], k: 'torch' },
    { at: [10, 2, 'N'], k: 'plaque', text: 'n6' },
    { at: [3, 6, 'N'], k: 'alcove', id: 'alShrine', holds: ['ward2'] },
    { at: [1, 7, 'W'], k: 'shrine', id: 'shrine' }
  ],
  wires: [
    { when: 'clock:whole', do: [['gate', 'gC', 'open'], ['special', 'd2'], ['msg', 'The clock strikes the hour it forgot. Far off, a gate rises.']] },
    { when: 'catch:cSW2', do: [['tele', 'tpLoop', 'off'], ['secret', 'SW2'], ['msg', 'A click. The air in the hall settles, as if a draught had stopped.']] }
  ],
  items: [[3, 12, 'gear1'], [2, 11, 'scrfeather'], [13, 3, 'scrfeather'], [7, 6, 'gear1'], [9, 5, 'wand'], [10, 5, 'warhammer'], [12, 11, 'boltsSpot'], [14, 2, 'potion'], [16, 11, 'ration'], [4, 10, 'bracers'], [8, 3, 'ironration'], [9, 3, 'scrunlatch'], [11, 3, 'helm'], [6, 12, 'bolts', 10]],
  mons: [[8, 10, 'skeleton', 'asleep', { carry: 'gear1' }], [11, 10, 'skeleton', 'asleep'], [7, 6, 'spider', 'idle', { carry: 'gear1' }], [9, 6, 'spider', 'idle'], [16, 3, 'sentinel', 'asleep'], [14, 3, 'rustling', 'idle'], [10, 11, 'rustling', 'idle']],
  npcs: [{ id: 'durgan', at: [10, 7], face: 3 }],
  hints: [[90, 'catchHint', 'The hall repeats. Run your hand along the walls: something is loose.'], [200, 'catchHint2', 'A loose stone lies in the south wall of the endless hall.']],
  waypoints: { 'F2 Landing': [2, 11, 1], 'F2 Clock Hall': [8, 11, 1], 'F2 Endless Hall': [14, 11, 1], 'F2 Workshop': [8, 6, 1], 'F2 Sentinel': [15, 3, 1], 'F2 Weight Hall': [9, 3, 0], 'F2 Shrine': [2, 7, 0] }
});
B.FLOORS.f3 = B.buildFloor({
  id: 'f3', name: 'The Gloam Deeps', flavor: 'The eye-cult\'s halls. Every wall has a lid that is shut.', song: 'gloam', w: 20, h: 14, wander: 4,
  look: { ground: 'plain', colors: { base: '#2a2434', dark: '#1a1622', light: '#3a3248' }, side: 'block', color: '#2e2838', fog: '#040306', near: 20, far: 130, amb: ['#3a3a5a', '#141220', 2.2] },
  rooms: [[1, 10, 5, 12], [7, 9, 12, 12], [13, 11, 18, 11], [15, 10, 15, 10], [17, 10, 17, 10], [18, 5, 18, 10], [13, 2, 18, 4], [6, 3, 11, 5], [8, 1, 8, 2]],
  set: { '6,11': '+', '2,12': '<', '12,3': '=', '8,2': '=', '8,1': '>', '14,11': 'S' },
  start: [2, 11, 0], safe: [[1, 10, 5, 12]],
  gates: { '12,3': 'gB', '8,2': 'gUG' }, locks: {}, secrets: {},
  stairs: { '2,12': { to: 'f2', at: [9, 3, 2] }, '8,1': { to: 'f4', at: [6, 11, 0] } },
  features: [
    { at: [16, 2, 'N'], k: 'candle', id: 'cn1', n: 1 }, { at: [14, 2, 'N'], k: 'candle', id: 'cn2', n: 2 }, { at: [18, 2, 'N'], k: 'candle', id: 'cn3', n: 3 },
    { at: [15, 4, 'S'], k: 'plaque', text: 'n7' },
    { at: [8, 3, 'N'], k: 'undergate', id: 'ug' },
    { at: [3, 10, 'N'], k: 'plaque', text: 'n8' },
    { at: [16, 11, 'S'], k: 'torch' }, { at: [9, 9, 'N'], k: 'torch' }, { at: [6, 4, 'W'], k: 'torch' }, { at: [11, 4, 'E'], k: 'torch' }, { at: [5, 12, 'S'], k: 'torch' },
    { at: [18, 5, 'E'], k: 'torch' }
  ],
  wires: [
    { when: 'seq:cands:ok', do: [['gate', 'gB', 'open'], ['special', 'd3'], ['msg', 'The flames lean together and sing one note. A gate lifts.']] },
    { when: 'seq:cands:fail', do: [['reset', 'cands'], ['msg', 'The flames gutter and go out. Wrong order.'], ['hurt', 3]] },
    { when: 'ug:open', do: [['gate', 'gUG', 'open'], ['msg', 'Three bolts withdraw. The Undergate swings wide.']] }
  ],
  seqs: { cands: ['cn1', 'cn2', 'cn3'] },
  items: [[9, 10, 'bonekey'], [11, 11, 'scrlightning'], [15, 10, 'potion'], [3, 12, 'ration'], [14, 3, 'scalemail'], [17, 3, 'scrraise'], [7, 4, 'ironshield'], [10, 4, 'potion'], [8, 4, 'amulet']],
  mons: [[9, 11, 'hound', 'idle'], [18, 11, 'seer', 'idle'], [15, 11, 'warden', 'idle'], [18, 8, 'hound', 'idle'], [17, 3, 'seer', 'idle'], [7, 4, 'warden', 'asleep'], [9, 4, 'golem', 'asleep']],
  npcs: [{ id: 'veil', at: [4, 11], face: 3 }],
  hints: [[120, 'candleHint', 'The plaque speaks of three flames lit in the order of the eye\'s opening: small, middle, great.']],
  waypoints: { 'F3 Antechamber': [2, 11, 0], 'F3 Ossuary': [9, 10, 1], 'F3 Gauntlet': [14, 11, 1], 'F3 Chapel': [15, 3, 2], 'F3 Barracks': [8, 4, 0], 'F3 Undergate': [8, 3, 0] }
});
B.FLOORS.f4 = B.buildFloor({
  id: 'f4', name: 'The Eye\'s Vault', flavor: 'Seven iron bolts. One eye. It has been waiting since the doors closed.', song: 'vault', w: 13, h: 14, wander: 0, boss: true,
  look: { ground: 'flagstone', colors: { base: '#3a3e46', dark: '#262a32', light: '#4a4e58' }, side: 'block', color: '#30343c', fog: '#020204', near: 30, far: 200, amb: ['#2a3040', '#0c0e14', 2.0] },
  rooms: [[5, 10, 7, 12], [1, 2, 11, 9]],
  set: { '6,12': '<', '3,3': '#', '9,3': '#', '3,7': '#', '9,7': '#', '6,10': '.', '6,1': '>', '6,2': '.' },
  start: [6, 11, 0], safe: [[5, 10, 7, 12]],
  gates: {}, locks: {}, secrets: {}, stairs: { '6,12': { to: 'f3', at: [8, 3, 2] }, '6,1': { to: 'end', at: [0, 0, 0] } },
  features: [
    { at: [1, 5, 'W'], k: 'greatLock', id: 'glW' }, { at: [11, 5, 'E'], k: 'greatLock', id: 'glE' }, { at: [4, 2, 'N'], k: 'greatLock', id: 'glN' },
    { at: [5, 11, 'W'], k: 'torch' }, { at: [1, 3, 'W'], k: 'torch' }, { at: [11, 3, 'E'], k: 'torch' }, { at: [1, 8, 'W'], k: 'torch' }, { at: [11, 8, 'E'], k: 'torch' }
  ],
  wires: [], items: [[6, 11, 'potion'], [5, 11, 'ration']], mons: [], npcs: [],
  boss: { at: [6, 4] },
  hints: [[180, 'lockHint', 'Three Great Locks: west, east and north. Face one and use it to turn it. The cage will not break until all are turned.']],
  waypoints: { 'F4 Antechamber': [6, 11, 0], 'F4 Arena': [6, 8, 0] }
});
B.FLOORS.rr = B.buildFloor({
  id: 'rr', name: 'The Rat Run', flavor: 'Run. The rats know the way and the clock is counting.', song: 'drains', w: 14, h: 12, wander: 0, race: true,
  look: { ground: 'flagstone', colors: { base: '#3e4a44', dark: '#2a332f', light: '#55615a' }, side: 'brick', color: '#4a5048', fog: '#06080a', near: 24, far: 150, amb: ['#4a5a5a', '#1a201e', 2.6] },
  rooms: [[1, 9, 3, 10], [4, 10, 8, 10], [8, 6, 8, 9], [9, 6, 12, 6], [12, 2, 12, 5], [5, 2, 11, 2], [5, 3, 5, 5], [2, 5, 4, 5], [1, 2, 3, 3], [2, 4, 2, 4]],
  set: { '2,2': '>' },
  start: [1, 10, 0], safe: [], gates: {}, locks: {}, secrets: {}, stairs: { '2,2': { to: 'finish', at: [0, 0, 0] } },
  features: [{ at: [8, 9, 'W'], k: 'torch' }, { at: [10, 6, 'N'], k: 'torch' }, { at: [12, 3, 'E'], k: 'torch' }, { at: [7, 2, 'N'], k: 'torch' }, { at: [3, 5, 'S'], k: 'torch' }],
  wires: [], items: [], mons: [[6, 10, 'rat', 'idle'], [8, 7, 'rat', 'idle'], [11, 6, 'rat', 'idle'], [9, 2, 'rat', 'idle'], [5, 4, 'rat', 'idle']],
  cps: [[8, 7], [12, 4], [7, 2], [3, 5]], crowns: [[6, 10], [12, 3], [5, 3]],
  npcs: [], hints: [], waypoints: { 'Rat Run': [1, 10, 0] }
});
B.ORDER = ['f1', 'f2', 'f3', 'f4'];
// the clock's dead gear slot fix: boltsSpot is only a scatter marker
for (const f of Object.values(B.FLOORS)) f.items = (f.items || []).filter(i => B.ITEMS[i[2]]);
