// covers: src/modes/puzzle.js, src/editor/editor.js (puzzle mode)
import { ctx } from '../../src/ctx.js';
import { PUZZLES } from '../../src/data/tracks.js';
import { puzzleTrack } from '../../src/modes/puzzle.js';
import { TYPES } from '../../src/track/blocks.js';
export default async T => {
  const { game, api } = await T.game(), P = ctx.profile, E2 = api.editor; game.go('title', null, { fade: 0 }); game.advance(.1);
  P.reset(); P.p.allUnlocked = true;
  for (const p of PUZZLES) {
    game.go('editor', { puzzle: p.id }); api.until(() => game.sceneName === 'editor' && E2.st.puzzle && E2.st.puzzle.id === p.id, 3); ctx.talk.skip();
    const tr = E2.st.track, st = tr.start;
    T.eq(p.id + ' fixed blocks locked', E2.remove(st.cx, st.cy, st.L), 'fixed');
    const c0 = P.coppers;
    // place the reference solution through the editor (gaps are air, not placed)
    const sol = puzzleTrack(p, true); let bad = null;
    for (const b of sol.blocks) { if (b.fixed || TYPES[b.type].gap) continue; const r = E2.place(b.type, b.cx, b.cy, b.L, b.rot); if (r) bad = b.type + ' ' + r; }
    T.check(p.id + ' solution placed through the editor', !bad, bad);
    T.eq(p.id + ' no coppers spent', P.coppers, c0);
    T.check(p.id + ' route OK', tr.route().ok, tr.route().why);
    const inv = Object.keys(p.inventory)[0]; let n = 0; while (E2.place(inv, 0, 0, 0, 0) === null && n < 20) n++; T.check(p.id + ' outside the zone refused', E2.place(inv, 0, 0, 0, 0) !== null);
    if (p.nobuild) { const [x, y] = p.nobuild[0]; T.check(p.id + ' no-build cells refused', E2.place('S', x, y, 0, 0) !== null); }
    if (p.id === 'PD1' || p.id === 'PS2') {
      T.check(p.id + ' validate starts', E2.test()); api.until(() => game.sceneName === 'race', 3);
      T.check(p.id + ' validated by driving', api.driveToFinish(60) && api.until(() => game.sceneName === 'results', 5));
      T.check(p.id + ' earns at least gold', P.medal(p.id) >= 3, P.medal(p.id));
    }
  }
  // the inventory runs out
  game.go('editor', { puzzle: 'PD1' }); api.until(() => game.sceneName === 'editor' && E2.st.puzzle.id === 'PD1', 3); ctx.talk.skip();
  T.eq('inventory: one R2', E2.place('R2', 11, 12, 0, 0), null); T.eq('inventory: no second R2', E2.place('R2', 3, 14, 0, 0), 'none left');
  P.reset();
};
