// Tray layouts (ASCII). o = olive spawn, G = glass, # = bumper, . = empty, g = gecko path row.
window.G = window.G || {};
G.TRAYS = [
  { olives: [[-40, -10], [0, 5], [40, -5]], glasses: [[-45, 30], [5, 35], [45, 25]], bumpers: [], gecko: false },
  { olives: [[-50, -15], [-25, 0], [0, -10], [25, 5], [50, -15]], glasses: [[-50, 35], [-25, 30], [0, 38], [25, 30], [50, 35]], bumpers: [[-12, 15], [14, 18]], gecko: false },
  { olives: [[-55, -20], [-35, -5], [-15, -18], [5, -5], [25, -18], [45, -5], [55, 10]], glasses: [[-55, 35], [-35, 30], [-15, 38], [5, 30], [25, 38], [45, 30], [55, 20]], bumpers: [[-25, 15], [0, 18], [28, 14]], gecko: true }
];
G.DAYS = [
  { n: 1, title: 'Orientation', unlocks: ['stork', 'squat', 'step', 'tray'] },
  { n: 2, title: 'Improvement', unlocks: ['sunflow', 'pushup', 'hoop', 'laundry'] },
  { n: 3, title: 'The Plateau', unlocks: ['candle', 'lunge', 'jog', 'slalom'] },
  { n: 4, title: "Tare's Day", unlocks: [] },
  { n: 5, title: 'The Gentle Games', unlocks: [] }
];
G.UNLOCKS = [
  { minutes: 5, label: 'Towel', kind: 'rig' },
  { minutes: 10, label: 'Headband', kind: 'rig' },
  { minutes: 15, label: 'Sunhat', kind: 'rig' },
  { minutes: 20, label: 'Tare wears a tiny bow tie', kind: 'tare' },
  { minutes: 25, label: "Gertrude's Spare Hat", kind: 'rig' },
  { minutes: 30, label: 'Gerald gets a friend (a smaller hippo; no explanation)', kind: 'gerald' }
];
G.POSES = [
  { name: 'Low Lunge', clip: '111_38_part1', a: 2.9, b: 5.0, tgt: 0.25 },
  { name: 'Down Dog', clip: '111_38_part2', a: 2.8, b: 5.2, tgt: 0.25 },
  { name: 'Triangle', clip: '111_39_part3', a: 2.2, b: 5.2, tgt: 1.2 },
  { name: 'Warrior', clip: '111_39_part3', a: 6.6, b: 7.6, tgt: 1.57 },
  { name: 'Stork', clip: '111_39_part1', a: 3.6, b: 7.0, tgt: 1.57 }
];
