// the screen flow: title -> menu -> ARCADE -> difficulty -> briefing -> play -> pause -> dev mode -> quit; results ->
// records; the about pages complete; the touch-only notice
export default async t => {
  const { TC, step, game, E } = t.load(); step(1.5); const I = game.input, scene = () => game.debug.snapshot().scene;
  t.check('boots to the title', scene() === 'title', scene());
  I.tap('confirm'); step(.8); t.check('any button goes to the menu', scene() === 'menu', scene());
  I.tap('confirm'); step(.8); t.check('ARCADE asks for the difficulty', scene() === 'difficulty', scene());
  I.tap('confirm'); step(.8); t.check('then play, with the briefing first', scene() === 'play' && TC.play.state === 'brief', scene() + ' ' + (TC.play && TC.play.state));
  for (let k = 0; k < 8; k++) { I.tap('confirm'); step(.1); I.tap('confirm'); step(.2); }
  t.check('the briefing ends into the stage', TC.play.state === 'run', TC.play.state);
  I.tap('pause'); step(.3); t.check('play pauses', game.paused);
  game.resume(); TC.dev.open(TC.play); step(.2); t.check('dev mode opens from the pause menu item', TC.dev.isOpen);
  const ph = TC.play.s.sim.t; step(1); t.check('the Sim is frozen while the panel is open', TC.play.s.sim.t === ph);
  I.tap('cancel'); step(.2); t.check('the panel closes', !TC.dev.isOpen);
  // results -> records
  const sim = TC.play.s.sim; sim.phase = 'results'; step(.2); t.check('stage clear shows the results', TC.play.state === 'results', TC.play.state);
  // about pages
  const pages = TC.about.pages(); t.check('about has its 6 pages', pages.length === 6 && ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(n => pages.some(p => p.title === n)));
  t.check('every Source Information field is filled', pages[1].rows.every(([k, v]) => v && v.length));
  const ex = TC.about.exit(); t.check('the exit interview has every key', ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'].every(k => k in ex) && Object.keys(ex.sourceInformation).length === 15);
  game.go('records'); step(.6); t.check('records opens', scene() === 'records'); game.go('about'); step(.6); t.check('about opens', scene() === 'about'); game.go('howto'); step(.6); t.check('how to play opens', scene() === 'howto');
  // touch-only: a coarse pointer, no fine pointer, no pad, no key yet
  const ctx = t.load(); ctx.ctx.window = { matchMedia: q => ({ matches: q === '(pointer: coarse)' }) }; ctx.step(1.2);
  t.check('touch-only shows the notice', ctx.TC.touchOnly(ctx.game) === true);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
