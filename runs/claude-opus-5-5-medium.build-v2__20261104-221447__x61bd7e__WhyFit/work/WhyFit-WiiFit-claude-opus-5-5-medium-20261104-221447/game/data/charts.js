// Step Class charts: one string a lane (left, down, up, right), one character a sixteenth of a bar; parts in an order.
G.CHARTS = {
  t1: { parts: { A: ['x.......x.......', '.', '.', '....x.......x...'], B: ['x...x...x.......', '.', '.', '..x...x.....x...'], C: ['x.......x...x...', '.', '.', '....x.......x...'] },
    order: 'A A B A A C B A A A B C A B C A A C B A A A B C A' },
  t2: { parts: { A: ['x.......x.......', '..x.............', '......x.........', '....x.......x...'], B: ['x...x...........', '..x.......x.....', '......x.....x...', '........x.....x.'], C: ['x.......x...x...', '....x...........', '..x.......x.....', '......x.......x.'] },
    order: 'A A B A C B A C B B C A A B C A B C A C B A C B C A B C A B' },
  short: { parts: { A: ['x.......x.......', '.', '.', '....x.......x...'], B: ['x...x...x.......', '.', '.', '..x...x.....x...'] }, order: 'A A B A B A' }
};
