// 11-roster.js: the content that extends a stage's areas with the rest of the roster (plan 5.3, 5.4 to 5.7): more nests
// and waves for the areas that need them, and the rail ride of the canal area. Merged into each area by 07-world.js.
// It is data only: the behaviours are in 03-enemies.js and 05-sim-enemies.js.
TC.EXTRAS = {
  '1-1': { nests: [{ id: 'm1', dx: 280, y: 60 }], waves: [{ when: 'clear', spawn: [['marine', 'm1', { entry: 'rappel' }]] }] },
  '1-2': {
    nests: [{ id: 'r1', dx: 290, y: -60 }],
    waves: [{ when: 'clear', spawn: [['rocketeer', 'r1', { entry: 'vault' }]] }],
    ride: { dx: 150, speed: 70 },
  },
  '1-3': { waves: [
    { when: 'clear', spawn: [['jetski', null, { route: [[160, 90], [300, 90]] }]] },
    { when: 'clear', spawn: [['rusher', 'n3']] },
  ] },
  '2-1': { waves: [{ when: 'clear', spawn: [['drone', null, { route: [[200, -100], [340, -100]] }]] }] },
  '2-2': { nests: [{ id: 'g1', dx: 320, y: -10 }], waves: [{ when: 'clear', spawn: [['gunner', 'g1', { entry: 'door' }]] }] },
  '2-3': { nests: [{ id: 'c1', dx: 330, y: -70 }], waves: [{ when: 'clear', spawn: [['captor', 'c1']] }] },
  '3-1': { waves: [{ when: 'clear', spawn: [['marine', 'n1', { entry: 'jump' }]] }] },
  '3-2': { waves: [{ when: 'clear', spawn: [['captor', 'n3']] }] },
  '3-3': {
    nests: [{ id: 'g2', dx: 300, y: -60 }],
    waves: [
      { when: 'clear', spawn: [['gunner', 'g2']] },
      { when: 'clear', spawn: [['drone', null, { route: [[220, -110], [360, -110]] }]] },
    ],
  },
};
