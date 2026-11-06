// Courses: jog road blocks, slalom gates, laundry spans. Edit the numbers; no code change.
window.G.COURSES = {
  jog: { blocks: [[40, {}], [60, { curve: 2 }], [40, { curve: -2, hill: 600 }], [50, { curve: 3 }], [50, { hill: -600 }], [60, { curve: -3 }], [50, {}], [60, { curve: 2.5, hill: 400 }], [60, { curve: -2.5, hill: -400 }], [80, {}], [60, { curve: 3 }], [50, { curve: -3 }], [60, {}]], cupEvery: 9, pigeonEvery: 13, joggerEvery: 31 },
  // slalom: gate centres across the run (x offsets in gate-widths units 0..), spacing in world units; tier 2 is narrower with fog
  slalom: { spacing: 900, gates: [0, 1.6, -1.2, 1.8, -.4, -2, .8, 2.2, -1.5, .3, 1.9, -1.8, 0, 1.2, -2.2, 1.6, -.8, 0], width: [4.2, 3.2], par: [47, 43], worst: [100, 92], snowmen: [3, 8, 12, 15], pines: [5, 10, 14, 16], regs: [['Gertrude', 58], ['Marisol', 41], ['Dennis', 100], ['Lou', 180]] },
  laundry: { spans: [{ len: 14, pins: [5, 10] }, { len: 16, pins: [4, 8, 13] }, { len: 18, pins: [3, 7, 11, 16] }], postEvery: 3, par: 36, worst: 140, gustEvery: 6 }
};
