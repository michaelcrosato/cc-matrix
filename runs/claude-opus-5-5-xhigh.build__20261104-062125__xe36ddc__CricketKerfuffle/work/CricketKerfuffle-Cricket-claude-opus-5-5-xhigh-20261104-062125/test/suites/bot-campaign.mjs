import { load } from '../lib.mjs';
/* the whole story by virtual input: New Game, the prologue, five chapters (their Nets lessons, beats and goals), the
 * ending and the credits; the autopilot plays the matches with the AI's own judgment (no cheats) at Village difficulty */
export async function run(check) {
  const { game, I, D, K } = load({ seed: 3 }); game.advance(.5);
  game.settings.set('difficulty', 'Village'); K.Tuning.persist = false;
  K.dev.toggles.autoBat = true; K.dev.toggles.autoBowl = true;
  const seen = { scenes: {}, cut: [], chapters: {}, results: 0, losses: 0 }; let t = 0, held = false, lastScene = null;
  K.bus.on('match:end', d => { const m = d.match; if (m.cfg.mode === 'story') { seen.results++; const won = d.result && d.result.winner === 'ker'; seen.chapters[m.cfg.chapter] = (seen.chapters[m.cfg.chapter] || []).concat(won ? 'W' : 'L'); if (!won) seen.losses++; } });
  I.tap('confirm'); game.advance(.3); I.tap('confirm'); game.advance(.3);   // PRESS, then STORY
  const sub = K.scenes.title.sub; check('the story menu opens with NEW GAME first (no save yet)', sub && sub.visible()[0].label === 'NEW GAME', sub && sub.visible().map(i => i.label));
  I.tap('confirm'); game.advance(.8);
  while (t < 7200) {
    const s = D.snapshot(), sc = s.scene;
    if (sc !== lastScene) { seen.scenes[sc] = (seen.scenes[sc] || 0) + 1; if (sc === 'cutscene') seen.cut.push(K.scenes.cutscene.d.scene); lastScene = sc; }
    if (sc === 'about') break;
    if (sc === 'cutscene') { if (!held) { I.hold('confirm'); held = true; } } else if (held) { I.hold('confirm', false); held = false; }
    if (sc === 'storymap' || sc === 'results') { I.tap('confirm'); }
    if (sc === 'match' && K.Play.extra && K.Play.extra.lesson && !K.Play.extra.lesson.done) { I.tap('shot'); I.tap('confirm'); if (Math.floor(t * 2) % 3 === 0) I.tap('run'); }
    if (sc === 'match' && K.Play.m && (K.Play.m.phase === 'inningsBreak' || K.Play.m.phase === 'pickBowler')) I.tap('confirm');
    if (sc === 'match' && K.Play.talk && K.Play.talk.open) I.tap('confirm');
    game.advance(.5); t += .5;
  }
  if (held) { I.hold('confirm', false); held = false; }
  const st = D.snapshot().story;
  check('the campaign reaches the ending and the credits', D.snapshot().scene === 'about', { scene: D.snapshot().scene, t, chapters: seen.chapters });
  check('every chapter was won (within 10 attempts each)', st && st.done === true && [1, 2, 3, 4, 5].every(n => (seen.chapters[n] || []).includes('W')), seen.chapters);
  check('no chapter needed more than 10 attempts', Object.values(seen.chapters).every(a => a.length <= 10), seen.chapters);
  const order = ['prologue', 'c1pre', 'c1win', 'c2pre', 'c2win', 'c3pre', 'c3win', 'c4pre', 'c4win', 'c5pre', 'c5win'];
  let k = 0; for (const c of seen.cut) if (c === order[k]) k++;
  check('the story scenes played in order (prologue, each chapter\'s pre and win)', k === order.length, seen.cut);
  check('the Nets lessons ran inside the story', (seen.scenes.match || 0) >= 5);
  check('every chapter\'s goals were evaluated (stars saved)', st && [1, 2, 3, 4, 5].every(n => Array.isArray(st.stars[n]) && st.stars[n].length === 3), st && st.stars);
  check('the campaign took a plausible time (under 2 hours of play)', t < 7200, t);
  // Continue works from the title after the save
  game.go('title'); game.advance(.8); I.tap('confirm'); game.advance(.3); I.tap('confirm'); game.advance(.3);
  const sub2 = K.scenes.title.sub; check('after a save the story menu offers CONTINUE', sub2 && sub2.visible()[0].label === 'CONTINUE', sub2 && sub2.visible().map(i => i.label));
  I.tap('confirm'); game.advance(.8); check('Continue opens the story map', D.snapshot().scene === 'storymap', D.snapshot().scene);
  check('no errors in the campaign', !game.errors.length, game.errors.slice(0, 4).map(e => e.message));
}
