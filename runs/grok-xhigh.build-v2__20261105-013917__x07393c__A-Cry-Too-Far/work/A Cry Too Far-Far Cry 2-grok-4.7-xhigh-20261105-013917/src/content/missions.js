/** Story missions. A bot can start any one from its setup and finish it with actions. */
export const MISSIONS = [
  {
    id: 'm0', title: 'THE GOODS LINE', giver: 'bakr', pay: 0, hour: 18.5,
    faction: null,
    setup: { x: -520, z: 108, hour: 18.5, tablets: 0, syrettes: 0, guns: [], buddies: [], stones: 0, feverIn: 0 },
    steps: [
      { do: 'lines', ids: ['bakr:m0.1', 'bakr:m0.2', 'bakr:m0.3', 'bakr:m0.6'], text: 'RIDE WITH BAKR' },
      { do: 'map', text: 'RAISE THE MAP' },
      { do: 'fever-fall', text: 'THE FEVER' },
    ],
    onDone: [{ flag: 'm0' }],
  },
  {
    id: 'm1', title: 'MERCY RUN', giver: 'odile', pay: 5, hour: 8, requires: ['m0'],
    faction: null,
    setup: {
      x: 12, z: 55, hour: 8, tablets: 1, syrettes: 2, stones: 0, feverIn: 0,
      guns: [{ id: 'cane', cond: 100 }, { id: 'm38', cond: 100 }, { id: 'tractor', cond: 45 }],
      buddies: [], flags: ['m0'], truck: true,
    },
    steps: [
      { do: 'tablet', text: 'TAKE A TABLET' },
      { do: 'drive', x: -260, z: 240, r: 28, text: 'DRIVE MEDICINE TO THREE WELLS' },
      { do: 'goto', x: -200, z: 30, r: 20, text: 'THE WEST ROAD IS MANNED' },
      { do: 'jam', text: 'CLEAR THE JAM' },
      { do: 'repair', text: 'REPAIR THE TRUCK' },
      { do: 'syrette', text: 'USE A SYRETTE' },
      { do: 'report', to: 'clinic', text: 'REPORT TO ODILE' },
    ],
    onDone: [{ flag: 'm1' }, { safehouse: 'pump-shed' }, { tablets: 3 }, { pay: 5 }],
  },
  {
    id: 'm2', title: 'A CAGE AT THE POST', giver: 'tibor', pay: 8, hour: 21, requires: ['m1'],
    faction: null,
    setup: {
      x: -18, z: 62, hour: 21, tablets: 3, syrettes: 3, stones: 5,
      guns: [{ id: 'cane', cond: 100 }, { id: 'm38', cond: 100 }, { id: 'tractor', cond: 70 }],
      buddies: [], flags: ['m0', 'm1'], safehouses: ['pump-shed'],
    },
    steps: [
      { do: 'lines', ids: ['tibor:m2.1', 'tibor:shop'], text: 'TIBOR HAS A JOB' },
      { do: 'goto', site: 'ranger-post', r: 24, text: 'REACH THE RANGER POST' },
      { do: 'clear', tag: 'cage-guard', n: 1, text: 'DEAL WITH THE CAGE GUARD' },
      { do: 'use', tag: 'cage', text: 'OPEN THE CAGE' },
    ],
    onDone: [{ flag: 'm2' }, { buddy: 'ines' }, { safehouse: 'ranger-post' }, { pay: 8 }],
  },
  {
    id: 'm3', title: 'FUEL FOR THE PEACE', giver: 'vance', pay: 15, hour: 16, requires: ['m2'],
    faction: 'concord',
    wind: { dir: -2.5, speed: 5 },
    setup: {
      x: -430, z: -180, hour: 16, tablets: 3, syrettes: 3, stones: 13,
      guns: [{ id: 'cane', cond: 100 }, { id: 'flare', cond: 100 }, { id: 'tractor', cond: 80 }],
      buddies: ['ines'], flags: ['m0', 'm1', 'm2'], safehouses: ['pump-shed', 'ranger-post'],
    },
    steps: [
      { do: 'lines', ids: ['vance:m3.1', 'vance:m3.2'], text: 'VANCE HAS AN INVOICE' },
      { do: 'goto', site: 'east-siding', r: 40, text: 'REACH THE SIDING' },
      { do: 'destroy', tag: 'fuel-tank', n: 3, text: 'BURN THE TANKS' },
      { do: 'leave', site: 'east-siding', r: 80, text: 'GET OUT' },
      { do: 'report', to: 'fort-clement', text: 'REPORT TO VANCE' },
    ],
    onDone: [{ flag: 'm3' }, { scar: 'A' }, { pay: 15 }],
  },
  {
    id: 'm4', title: 'SEED MONEY', giver: 'ansa', pay: 20, hour: 11, requires: ['m2'],
    faction: 'harvest',
    setup: {
      x: 400, z: 280, hour: 11, tablets: 3, syrettes: 3, stones: 13,
      guns: [{ id: 'cane', cond: 100 }, { id: 'tube', cond: 100 }, { id: 'tractor', cond: 80 }],
      buddies: ['ines'], flags: ['m0', 'm1', 'm2'], safehouses: ['pump-shed', 'ranger-post'],
    },
    steps: [
      { do: 'lines', ids: ['ansa:m4.1', 'ansa:m4.2'], text: 'ANSA CORRECTS YOU' },
      { do: 'goto', x: 200, z: 470, r: 50, text: 'MEET THE CONVOY ON THE SALT' },
      { do: 'destroy', tag: 'convoy', n: 1, text: 'STOP THE PAYROLL TRUCK' },
      { do: 'collect', tag: 'payroll', text: 'TAKE THE CASE' },
    ],
    onDone: [{ flag: 'm4' }, { buddy: 'dov' }, { tracker: true }, { pay: 20 }],
  },
  {
    id: 'm5', title: 'THE WATER QUESTION', giver: 'vance', pay: 20, hour: 10, requires: ['m3'],
    faction: 'concord',
    setup: {
      x: -430, z: -180, hour: 10, tablets: 2, syrettes: 3, stones: 28,
      guns: [{ id: 'cane', cond: 100 }, { id: 'charge', cond: 100 }, { id: 'tractor', cond: 75 }],
      buddies: ['ines', 'dov'], flags: ['m0', 'm1', 'm2', 'm3'],
      safehouses: ['pump-shed', 'ranger-post'], scars: ['A'],
    },
    steps: [
      { do: 'lines', ids: ['vance:m5.1', 'vance:m5.2'], text: 'THE WATER QUESTION' },
      { do: 'goto', site: 'pump-station', r: 30, text: 'REACH THE PUMP' },
      { do: 'destroy', tag: 'pump', n: 1, text: 'BREAK THE PUMP' },
      { do: 'report', to: 'fort-clement', text: 'REPORT TO VANCE' },
    ],
    onDone: [{ flag: 'm5' }, { moveVillage: true }, { pay: 20 }],
  },
  {
    id: 'm6', title: 'THE LONG FIELD', giver: 'ansa', pay: 25, hour: 22, requires: ['m4'],
    faction: 'harvest',
    setup: {
      x: 400, z: 280, hour: 22, tablets: 2, syrettes: 1, stones: 33,
      guns: [{ id: 'cane', cond: 100 }, { id: 'flare', cond: 100 }, { id: 'm38', cond: 90 }],
      buddies: ['ines', 'dov'], flags: ['m0', 'm1', 'm2', 'm4'],
      safehouses: ['pump-shed', 'ranger-post'], scars: ['A'],
    },
    steps: [
      { do: 'lines', ids: ['ansa:m6.1'], text: 'BURN THE LONG FIELD' },
      { do: 'goto', site: 'long-field', r: 40, text: 'REACH THE LONG FIELD' },
      { do: 'burn', x: -260, z: -300, r: 18, text: 'LIGHT THE CROP' },
      { do: 'buddy-down', text: 'SYRETTE OR FINISH IT' },
    ],
    onDone: [{ flag: 'm6' }, { scar: 'B' }, { pay: 25 }],
  },
  {
    id: 'm7', title: 'THE CUT', giver: 'harrow', pay: 10, hour: 15, requires: ['m5', 'm6'],
    faction: null,
    setup: {
      x: -120, z: 150, hour: 15, tablets: 2, syrettes: 2, stones: 50,
      guns: [{ id: 'cane', cond: 100 }, { id: 'tractor', cond: 60 }, { id: 'flare', cond: 80 }],
      buddies: ['ines'], flags: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'],
      safehouses: ['pump-shed', 'ranger-post'], scars: ['A', 'B'],
    },
    steps: [
      { do: 'goto', site: 'sluice', r: 20, text: 'REACH THE SLUICE HOUSE' },
      { do: 'use', tag: 'ledger-book', text: 'TAKE HIS LEDGER' },
    ],
    onDone: [{ flag: 'm7' }, { scar: 'C' }, { truce: false }, { pay: 10 }],
  },
  {
    id: 'm8', title: 'LAST TRAIN', giver: 'odile', pay: 8, hour: 17, requires: ['m7'],
    faction: null,
    setup: {
      x: 0, z: 70, hour: 17, tablets: 1, syrettes: 2, stones: 60,
      guns: [{ id: 'cane', cond: 100 }, { id: 'tractor', cond: 70 }],
      buddies: ['ines'], flags: ['m7'], scars: ['A', 'B', 'C'], truce: false,
      safehouses: ['pump-shed', 'ranger-post'],
    },
    steps: [
      { do: 'lines', ids: ['odile:m8.1'], text: 'HOLD THE PLATFORM' },
      { do: 'hold', x: 0, z: 70, r: 24, time: 120, text: 'HOLD WHILE THEY BOARD' },
      { do: 'ride', time: 60, text: 'RIDE THE FLATCAR' },
    ],
    onDone: [{ flag: 'm8' }, { column: true }, { pay: 8 }],
  },
  {
    id: 'm9', title: 'THE SURVEYOR', giver: 'harrow', pay: 0, hour: 23, requires: ['m8'],
    faction: null,
    weather: 'storm',
    setup: {
      x: -80, z: -420, hour: 23, tablets: 1, syrettes: 2, stones: 68,
      guns: [{ id: 'cane', cond: 100 }, { id: 'm38', cond: 80 }],
      buddies: ['ines'], flags: ['m8'], scars: ['A', 'B', 'C'], column: true, truce: false,
      safehouses: ['pump-shed', 'ranger-post'],
    },
    steps: [
      { do: 'goto', site: 'observatory', r: 24, text: 'CLIMB TO THE OBSERVATORY' },
      { do: 'lines', ids: ['harrow:m9.1', 'harrow:m9.5', 'harrow:m9.6', 'harrow:m9.8'], text: 'SIT WITH HARROW' },
      { do: 'choice', id: 'shoot', options: ['SHOOT HIM', 'LEAVE HIM'], text: 'YOUR CONTRACT' },
      { do: 'choice', id: 'sheet', options: ['WALK OUT', 'GIVE IT TO THEM'], text: 'WHO GETS THE SHEET' },
    ],
    onDone: [{ flag: 'm9' }],
  },
  {
    id: 'end', title: 'THE PASS', giver: 'harrow', pay: 0, hour: 5.5, requires: ['m9'],
    faction: null,
    setup: {
      x: -420, z: -360, hour: 5.5, tablets: 0, syrettes: 1, stones: 68,
      guns: [{ id: 'cane', cond: 100 }, { id: 'flare', cond: 70 }],
      buddies: ['ines'], flags: ['m9'], scars: ['A', 'B', 'C'], column: true, truce: false,
      safehouses: ['pump-shed', 'ranger-post'], sheet: 'give',
    },
    steps: [
      { do: 'goto', site: 'the-pass', r: 30, text: 'REACH THE PASS' },
      { do: 'burn', x: -576, z: -444, r: 16, text: 'LIGHT THE LAST GRASS' },
    ],
    onDone: [{ flag: 'end' }, { ending: true }],
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}
