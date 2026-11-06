// Step Class charts (data only). Lanes order: stepL, stepD, stepU, stepR.
window.G = window.G || {};
G.CHARTS = {
  tier1: { bpm: 100, parts: { A: ['x.......x.......', '.', '.', '....x.......x...'], B: ['x...x...x.......', '.', '.', '..x...x.....x...'] }, order: 'A A B A' },
  tier2: { bpm: 120, parts: { A: ['x...x.......x...', '..x.......x.....', '....x...x.......', '......x.......x.'], B: ['x.......x...x...', '....x.......x...', '..x...x.......x.', '......x...x.....'] }, order: 'A B A B' }
};
G.COURSES = {
  slalom1: { gates: [-30, -10, 15, 30, 10, -20, -35, -5, 20, 35, 5, -25, -30, 0, 25, -15, 10, 0], par: 62, worst: 95, gateW: 26 },
  slalom2: { gates: [-40, 20, -35, 30, -10, 40, -25, 15, -40, 35, -5, -30, 25, 40, -20, 0, -35, 20], par: 58, worst: 90, gateW: 18 }
};
