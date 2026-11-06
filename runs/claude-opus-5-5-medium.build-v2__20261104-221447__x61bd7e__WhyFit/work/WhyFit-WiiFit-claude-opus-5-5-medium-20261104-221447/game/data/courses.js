// Slalom gate courses: x offsets across the piste. Jog road: stretches, and what stands on it.
G.COURSES = {
  slalom1: { gates: [-60, 40, -30, 70, -80, 20, 60, -50, 30, -70, 80, -20, 50, -60, 10, 70, -40, 0], spacing: 720, width: 34, obstacles: 22, par: 58, worst: 92, fog: false },
  slalom2: { gates: [-90, 60, -70, 100, -40, 90, -100, 30, 80, -90, 50, -60, 110, -30, 70, -100, 40, 0], spacing: 720, width: 24, obstacles: 34, par: 60, worst: 92, fog: true },
  short: { gates: [-60, 40, -30, 70, -50, 30, -60, 40, 0], spacing: 720, width: 36, obstacles: 10, par: 29, worst: 46, fog: false }
};
G.JOG = {
  road: [[60, {}], [70, { curve: 2.2 }], [60, { curve: -1.5, hill: 500 }], [70, { hill: -500 }], [80, { curve: -2.6 }], [60, { curve: 1.6, hill: 400 }], [60, { hill: -400, curve: 1 }], [40, {}]],
  cups: 18, pigeons: 34, joggers: 16
};
