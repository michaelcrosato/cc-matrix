/* data/charts.js: step charts, a string a lane (left, down, up, right), 16 steps a bar. '.' alone is an empty lane.
 * order: the bars in turn. A chart's song and its bars give its length. */
(() => {
const G = window.G, E16 = '................';
G.DATA.charts = {
  stepA: { song: 'stepA', bars: 25, parts: {
    I: [E16, E16, E16, E16],
    A: ['x.......x.......', '.', '.', '....x.......x...'],
    B: ['x...x...x.......', '.', '.', '..........x...x.'],
    C: ['x.......x...x...', '.', '.', '....x...........'],
    D: ['x...............', '.', '.', '....x...x...x...'] },
    order: 'I A A B A A C B A D A B C A A B D A C B A A D A B' },
  stepB: { song: 'stepB', bars: 30, parts: {
    I: [E16, E16, E16, E16],
    A: ['x.......x.......', '....x...........', '............x...', '.'],
    B: ['x...........x...', '........x.......', '....x...........', '.'],
    C: ['x...............', '....x...x.......', '............x...', '..............x.'],
    D: ['x.......x.......', '..............x.', '......x.........', '....x.......x...'],
    E: ['x...x...........', '........x.......', '..........x.....', '............x...'] },
    order: 'I A B A C B D A E C D B E A D C E D A B C A E D B C A D E A' },
  // the Class's and a hub round's chart: left and right only
  stepClass: { song: 'stepA', bars: 18, parts: {
    I: [E16, E16, E16, E16],
    A: ['x.......x.......', '.', '.', '....x.......x...'],
    B: ['x...x...x.......', '.', '.', '............x...'] },
    order: 'I A A B A B A A B A B A B A B A B A' }
};
})();
