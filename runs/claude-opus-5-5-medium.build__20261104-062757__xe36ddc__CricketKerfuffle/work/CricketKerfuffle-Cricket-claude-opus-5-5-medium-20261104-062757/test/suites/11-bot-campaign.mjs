// the story by the autopilot: New Game, the prologue, chapters 1-5 (the CPU playing for you at Village), the ending,
// the credits; the save shows it complete
export default ({ boot, suite, until }) => {
  const s = suite(), { D, game, I } = boot();
  game.settings.set('difficulty', 'Village');
  D.profile().lessons.push('aim');   // the Nets lessons run in their own suite
  D.DEV.toggles.autoBat = true; D.DEV.toggles.autoBowl = true;
  game.go('story', { hasSave: false }); game.advance(.5);
  I.tap('down'); game.advance(.05); I.tap('confirm'); until(game, () => D.snapshot().scene === 'cutscene', 3);
  s.ok('New Game plays the prologue', D.snapshot().scene === 'cutscene');
  until(game, () => { if (D.snapshot().scene === 'cutscene') I.tap('cancel'); return D.snapshot().scene === 'storymap'; }, 6, 1 / 30);
  s.ok('the prologue leads to the story map', D.snapshot().scene === 'storymap');
  const beats = [];
  D.BUS.subs['match:start'] = (D.BUS.subs['match:start'] || []).concat([d => beats.push('start')]);
  for (let ch = 1; ch <= 5; ch++) {
    let won = false;
    for (let tries = 0; tries < 4 && !won; tries++) {
      D.startChapter(ch, { difficulty: 'village' }); until(game, () => { if (D.snapshot().scene === 'cutscene') I.tap('cancel'); return D.snapshot().scene === 'match'; }, 6, 1 / 30);
      const m = D.match(); m.cfg.noReplays = true;
      until(game, () => { if (m.talk) {} if (game.scene.talk && game.scene.talk.open) I.tap('confirm'); if (m.state === 'break') I.tap('confirm'); if (m.state === 'dead') I.tap('confirm'); return D.snapshot().scene === 'results'; }, 900, 1 / 30);
      won = m.won;
      if (!won) { game.go('storymap'); game.advance(.5); }
    }
    s.ok(`chapter ${ch} is won by the autopilot within 4 tries`, won);
    if (!won) { D.profile().story.chapter = Math.max(D.profile().story.chapter, Math.min(5, ch + 1)); continue; }
    // results -> Continue -> the win scene -> the map (or the credits)
    game.advance(.8); const sc = game.scene; const k = sc.menu.items.findIndex(it => it.label === 'Continue'); sc.menu.i = k; I.tap('confirm'); until(game, () => { if (D.snapshot().scene === 'cutscene') I.tap('cancel'); return D.snapshot().scene === (ch === 5 ? 'about' : 'storymap'); }, 6, 1 / 30);
    s.ok(`chapter ${ch}: its win scene leads on`, D.snapshot().scene === (ch === 5 ? 'about' : 'storymap'), D.snapshot().scene);
  }
  const p = D.profile();
  s.ok('the save shows the story complete', p.story.done && p.story.chapter === 5, p.story);
  s.ok('stars were earned', Object.values(p.story.stars).reduce((a, b) => a + b, 0) >= 5, p.story.stars);
  s.ok('every chapter\'s match started', beats.length >= 5, beats.length);
  s.noErrors(game);
};
