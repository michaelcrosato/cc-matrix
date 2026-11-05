// determinism: 30 s of scripted play in Rice and Ash, twice in fresh pages: the same hash
export default async function (t) {
  const run = () => {
    const P = t.makeContext(), g = P.game, B = P.B; g.advance(.3);
    g.debug.load('m1', { mode: 'story', char: 'kaede' }); g.advance(.1); B.Cutscene.clear();
    for (let i = 0; i < 300; i++) { const k = i % 40; B.testIntent = { move: k < 20 ? [-1, 0] : [0, -1], sprint: k % 7 === 0, crouchPressed: k === 10, jumpPressed: k === 30, attackPressed: k === 35 }; g.advance(.1); }
    const h = g.debug.hash(); g.dispose(); return h;
  };
  const a = run(), b = run();
  t.check('the same input gives the same game', a === b && a !== 0, a + ' vs ' + b);
}
