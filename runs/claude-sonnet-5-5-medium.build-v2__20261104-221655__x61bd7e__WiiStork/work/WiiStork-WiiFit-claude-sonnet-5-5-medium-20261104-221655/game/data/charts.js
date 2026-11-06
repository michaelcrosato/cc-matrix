// Step Class charts. One part = one bar = 16 steps per lane (lanes: left, down, up, right). '.' pads a lane. Add parts and extend `order`.
(() => {
const Z = ['.', '.', '.', '.'];
window.G.CHARTS = {
  1: { song: 'stepA', bars: 24, parts: {
      Z, A: ['x.......x.......', '.', '.', '....x.......x...'], B: ['x...x...x.......', '.', '.', '..x...x.....x...'], C: ['x.....x.x.......', '.', '.', '....x.......x.x.'], D: ['x.x.....x.......', '.', '.', '....x...x...x...'] },
    order: 'Z A A B A A B C A B A C D A B C D C B D C D B A' },
  2: { song: 'stepB', bars: 30, parts: {
      Z, A: ['x.......x.......', '..x.......x.....', '....x.......x...', '......x.......x.'], B: ['x...x...x.......', '......x...x.....', '..x.....x...x...', '....x.......x.x.'], C: ['x.x.....x...x...', '....x.......x...', '..x...x.........', 'x.......x.x.....'], D: ['x.....x.x.......', '..x...x.....x...', '....x.....x.....', '......x.x.....x.'] },
    order: 'Z A A B A B C A B C D A B C D A C B D C D B A C D B C D A B' }
};
})();
