/* data/courses.js: slalom gates (x offsets from the fall line, in order), obstacles, jog road stretches, laundry spans. */
(() => {
const G = window.G;
G.DATA.courses = {
  slalom: [
    { name: 'Mount Posture', gateWidth: 52, spacing: 700, par: 52, worst: 92, fog: null,
      gates: [0, 60, -50, 70, -30, -90, 40, 100, 20, -70, -120, -40, 50, 110, 60, -20, -90, 0],
      obstacles: [[120, 0, 'pine'], [-110, 1, 'snowman'], [10, 2.5, 'snowman'], [-140, 4, 'pine'], [130, 6, 'pine'], [-10, 7.5, 'snowman'], [-60, 10.5, 'pine'], [10, 12.5, 'snowman'], [150, 14, 'pine'], [-150, 15.5, 'pine'], [40, 16.5, 'snowman']] },
    { name: 'Mount Posture, North Face', gateWidth: 40, spacing: 660, par: 54, worst: 96, fog: { color: '#e6f0f4', near: 240, far: 900 },
      gates: [0, 80, -60, 90, -70, -120, 50, 130, 30, -90, -140, -40, 80, 140, 40, -60, -130, 10],
      obstacles: [[150, 0, 'pine'], [-140, 1, 'snowman'], [20, 2.5, 'snowman'], [-20, 3.5, 'pine'], [170, 6, 'pine'], [-30, 7.5, 'snowman'], [-60, 10.5, 'pine'], [30, 12.5, 'snowman'], [175, 13.5, 'pine'], [-170, 15.5, 'pine'], [10, 16.5, 'snowman'], [-40, 5.5, 'snowman']] }
  ],
  jog: {
    stretches: [[30, {}], [50, { curve: 2.5 }], [40, { hill: 800 }], [50, { curve: -3, hill: -800 }], [30, {}], [60, { curve: 3.5 }], [40, { hill: 600 }], [50, { curve: -2.5, hill: -600 }], [50, {}]],
    pigeonsEvery: 900, joggersEvery: 3200, cupsEvery: 1500
  },
  laundry: {
    spans: [
      { len: 460, pegs: [150, 300], gusts: [.25, .7] },
      { len: 520, pegs: [120, 260, 400], gusts: [.2, .55, .85] },
      { len: 580, pegs: [110, 230, 350, 470], gusts: [.15, .45, .7, .9] }
    ],
    par: 56, worst: 220
  }
};
})();
