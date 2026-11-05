// covers: src/editor/editor.js, src/track/track.js (place/remove/occupancy/codes), src/scenes/race.js (validation)
import { ctx } from '../../src/ctx.js';
import { Track, compile } from '../../src/track/track.js';
import { TYPES } from '../../src/track/blocks.js';
export default async T => {
  const { game, api } = await T.game(), P = ctx.profile, E2 = api.editor;
  P.reset(); P.p.coppers = 5000; for (const k of ['STUNTS', 'LOOPS', 'SURFACES', 'SCENERY']) P.p.packs[k] = true;
  game.go('editor', { slot: 0, env: 'dustbowl', fresh: true }); api.until(() => game.sceneName === 'editor', 2); ctx.talk.skip();
  const c0 = P.coppers;
  T.eq('place a start', E2.place('ST', 4, 10, 0, 0), null);
  T.eq('place a straight costs 5', (E2.place('S', 5, 10, 0, 0), c0 - P.coppers), 5);
  T.eq('refuse an overlap', E2.place('S', 5, 10, 0, 0), 'overlap');
  T.eq('refuse off the grid', E2.place('S', 40, 10, 0, 0), 'grid');
  T.eq('one start only', E2.place('ST', 9, 9, 0, 0), 'start');
  T.eq('remove refunds', (E2.remove(5, 10), c0 - P.coppers), 0);
  P.p.coppers = 3; T.eq('refuse what you cannot afford', E2.place('CP', 5, 10, 0, 0), 'coppers'); P.p.coppers = 5000;
  // a kicker reserves the air above it
  T.eq('kicker', E2.place('KI', 12, 4, 0, 0), null); T.eq('the air above a kicker is reserved', E2.place('S', 12, 4, 1, 0), 'overlap'); E2.remove(12, 4);
  // undo and redo 50 random operations: back to the same blocks and coppers
  E2.st.undo.length = 0; E2.st.redo.length = 0;
  const tr = E2.st.track, snap = () => JSON.stringify([tr.toJSON().blocks.slice().sort(), P.coppers]); const s0 = snap();
  const R = ctx.E.rng(9), kinds = ['S', 'R1', 'L2', 'U1', 'CP', 'BO', 'DS']; let ops = 0;
  for (let i = 0; i < 80 && ops < 50; i++) { const x = 2 + Math.floor(R() * 20), y = 2 + Math.floor(R() * 20); const r = R() < .7 ? E2.place(kinds[Math.floor(R() * kinds.length)], x, y, 0, Math.floor(R() * 4)) : E2.remove(x, y); if (r === null) ops++; }
  const s1 = snap(); let n = 0; while (E2.undo()) n++; T.eq('undo returns to the start', snap(), s0); while (E2.redo()) {} T.eq('redo returns to the end', snap(), s1);
  // build a 12-block track, drive it to validate (the bot drives), then edit: validation clears
  while (E2.undo()) {} for (const b of tr.blocks.slice()) if (b.type !== 'ST') E2.remove(b.cx, b.cy, b.L); if (!tr.start) E2.place('ST', 4, 10, 0, 0);
  const t2 = compile({ id: 'X', env: 'dustbowl', start: [4, 10], program: 'ST S3 R2 S CP S L2 S2 FN' });
  for (const b of t2.blocks) if (b.type !== 'ST') T.eq('place ' + b.type, E2.place(b.type, b.cx, b.cy, b.L, b.rot), null);
  T.check('route OK', tr.route().ok, tr.route().why); T.eq('12 blocks', tr.blocks.length, 12);
  T.check('test drive starts', E2.test(true)); api.until(() => game.sceneName === 'race', 3);
  T.check('validated by driving', api.driveToFinish(60) && api.until(() => game.sceneName === 'results', 5)); T.check('author time set', E2.st.author > 0, E2.st.author);
  game.advance(.5); api.tap('cancel'); T.check('back to the editor', api.until(() => game.sceneName === 'editor' || game.sceneName === 'menu', 3), game.sceneName);
  if (game.sceneName !== 'editor') { game.go('editor', { resume: true }); api.until(() => game.sceneName === 'editor', 2); }
  T.check('the author time survives the drive', E2.st.author > 0);
  E2.place('S', 20, 20, 0, 0); T.check('an edit clears the validation', !E2.st.author);
  // save, load, share codes, export as content
  E2.st.name = 'TEST TRACK'; E2.save(2); T.check('saved to slot 3', P.p.slots[2] && P.p.slots[2].name === 'TEST TRACK');
  const code = E2.share(), back = Track.fromCode(code); T.eq('share code round trip', back.toJSON().blocks, tr.toJSON().blocks); T.eq('share code keeps the name', back.name, 'TEST TRACK');
  E2.place('S', 21, 20, 0, 0); E2.open(2); T.eq('load a slot', E2.st.track.toJSON().blocks, back.toJSON().blocks);
  const ex = E2.export(); let ok = false; try { const j = (0, eval)('(' + ex.trim().replace(/,$/, '') + ')'); const t3 = new Track({ env: j.env, blocks: j.blocks.map(([type, cx, cy, L, rot]) => ({ type, cx, cy, L, rot })) }); ok = t3.route().ok; } catch (e) { ok = String(e); } T.check('export as content compiles', ok === true, ok);
  T.check('import a code', E2.import(code).blocks.length === back.blocks.length);
  P.reset();
};
