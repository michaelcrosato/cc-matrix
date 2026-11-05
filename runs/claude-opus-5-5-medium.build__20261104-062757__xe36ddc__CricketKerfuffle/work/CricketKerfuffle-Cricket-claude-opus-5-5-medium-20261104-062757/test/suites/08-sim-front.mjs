// 5.15 and 5.14: the front end by keys, pad and mouse; settings; pause items; dev mode; About; the touch gate; prompts
export default ({ boot, suite, until }) => {
  const s = suite();
  let B = boot(), { D, game, I } = B;
  s.ok('the game boots to the title', D.snapshot().scene === 'title', D.snapshot().scene);
  I.press('Enter'); game.advance(1 / 60); I.release('Enter'); game.advance(.2);
  s.ok('Enter opens the main menu', D.snapshot().ui.menuFocus === 0);
  I.press('ArrowDown'); game.advance(1 / 60); I.release('ArrowDown'); game.advance(.1);
  s.ok('down moves the focus', D.snapshot().ui.menuFocus === 1, D.snapshot().ui.menuFocus);
  I.press('Pad0'); game.advance(1 / 60); I.release('Pad0'); until(game, () => D.snapshot().scene === 'setup', 2);
  s.ok('a pad\'s cross picks Quick Match', D.snapshot().scene === 'setup', D.snapshot().scene);
  s.ok('prompts follow the pad: the shot is a PlayStation cross', D.snapshot().ui.prompts.shot === 'ps:cross', D.snapshot().ui.prompts.shot);
  game.settings.set('glyphs', 'xbox'); game.advance(.05);
  s.ok('the Xbox setting shows A for the shot', D.snapshot().ui.prompts.shot === 'xbox:A', D.snapshot().ui.prompts.shot);
  game.settings.set('glyphs', 'playstation');
  I.press('KeyJ'); game.advance(1 / 60); I.release('KeyJ'); game.advance(.05);
  s.ok('after a key the shot prompt is the J keycap', D.snapshot().ui.prompts.shot === 'key:J', D.snapshot().ui.prompts.shot);
  I.press('Mouse0'); game.advance(1 / 60); I.release('Mouse0'); game.advance(.05);
  s.ok('after a click the shot prompt is the left mouse button', D.snapshot().ui.prompts.shot === 'mouse:Mouse0', D.snapshot().ui.prompts.shot);
  I.lastDevice = 'keyboard'; I.rebind('shot', 'keys', 'KeyU'); game.advance(.05);
  s.ok('rebinding the shot to U shows U', D.snapshot().ui.prompts.shot === 'key:U', D.snapshot().ui.prompts.shot);
  I.rebind('shot', 'keys', 'KeyJ');
  // settings and the pause menu's items
  const keys = ['difficulty', 'overs', 'wickets', 'kerfuffle', 'marker', 'timing', 'assistField', 'running', 'replays', 'captions', 'voices', 'voiceVolume', 'glyphs'];
  s.ok('every game setting exists', keys.every(k => game.settings[k] !== undefined), keys.filter(k => game.settings[k] === undefined));
  // dev mode from the pause menu: pause, then the Dev Mode item's callback
  D.startMatch({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', humans: [[game.input], []] }); until(game, () => D.snapshot().scene === 'match', 3); game.advance(.5);
  I.tap('pause'); game.advance(.1); s.ok('Escape pauses the match', game.paused);
  D.devOpen(); game.advance(.1); s.ok('Dev Mode opens over the match (and resumes the engine)', D.DEV.open && !game.paused);
  const rows = D.devRows(); s.ok('the TUNING tab starts with Reset all, then the sliders', /Reset all/.test(rows[0].label) && rows.filter(r => r.slider).length >= 30, rows.length);
  D.DEV.i = rows.findIndex(r => r.slider === 'ballSpeed'); I.tap('right'); game.advance(1 / 60); game.advance(1 / 60);
  s.ok('right on a slider changes its value', Math.abs(D.TUNE.ballSpeed - .63) < 1e-6, D.TUNE.ballSpeed);
  I.tap('special'); game.advance(1 / 30); s.ok('special resets the row', D.TUNE.ballSpeed === .62, D.TUNE.ballSpeed);
  D.setTuning('gravity', 200); D.setTuning('swing', 2); D.DEV.i = 0; I.tap('confirm'); game.advance(1 / 30);
  s.ok('Reset all restores every value', D.snapshot().dev.changed.length === 0, D.snapshot().dev.changed);
  I.tap('run'); game.advance(1 / 30); s.ok('R1 changes tab', D.DEV.tab === 1);
  I.tap('run'); game.advance(1 / 30); const jr = D.devRows(); D.DEV.i = jr.findIndex(r => /Force the next outcome/.test(r.label)); const fr = jr[D.DEV.i]; fr.set('six'); I.tap('confirm'); game.advance(1 / 30); I.tap('cancel'); game.advance(.1);
  s.ok('cancel closes dev mode', !D.DEV.open);
  const m = D.match(), r0 = m.lastRec; until(game, () => m.lastRec !== r0, 30, 1 / 60);
  s.ok('a forced six from dev mode is a six', m.lastRec && m.lastRec.boundary === 6, m.lastRec);
  D.devOpen(); D.DEV.tab = 2; D.DEV.i = 0; D.devRows()[0].set(3); D.DEV.i = 1; I.tap('confirm'); game.advance(.05); until(game, () => D.snapshot().scene === 'cutscene', 3);
  s.ok('dev mode jumps to chapter 3 (its cutscene)', D.snapshot().scene === 'cutscene' && D.profile && true, D.snapshot().scene);
  // About: every Source Information field and the three feedback lists
  const pages = D.ABOUT_PAGES(), text = pages.map(p => p[1].join(' ')).join(' ');
  s.ok('About shows every Source Information field', ['Date:', 'Source:', 'Plan:', 'Genre:', 'Perspective:', 'Tech:', 'Art direction:', 'Animation:', 'Audio:', 'Online:', 'Testing:', 'Research:', 'Environment:', 'Model:', 'Usage:'].every(k => text.includes(k)));
  s.ok('About has the testing, engine and prompt feedback pages', ['TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(t => pages.some(p => p[0] === t && p[1].length >= 4)), pages.map(p => p[0] + ':' + p[1].length));
  s.noErrors(game);
  // the touch-only gate: no fine pointer, a touch screen
  B = boot({ pre: ctx => { ctx.matchMedia = q => ({ matches: false, addEventListener() {}, removeEventListener() {} }); ctx.navigator = { maxTouchPoints: 5, userAgent: 'test' }; } });
  B.D.TOUCH.forced = true; B.game.advance(.3);
  B.I.feed('down', 5, 5, { touch: true }); B.game.advance(1 / 120); B.I.feed('up', 5, 5, { touch: true }); B.game.advance(.2);   // a phone's first tap goes full screen (the engine's)
  s.ok('a touch-only device sees the controller-or-keyboard gate', B.D.snapshot().ui.touchGate === true, B.D.snapshot().ui);
  until(B.game, () => B.D.snapshot().scene === 'attract', 12);
  s.ok('the attract mode still runs on a touch-only device', B.D.snapshot().scene === 'attract');
  B.game.advance(.6);
  B.I.feed('down', 100, 100, { touch: true }); B.game.advance(1 / 120); B.I.feed('up', 100, 100, { touch: true }); until(B.game, () => B.D.snapshot().scene === 'title', 2); B.game.advance(.5);
  s.ok('a tap exits the attract mode', B.D.snapshot().scene === 'title');
  B.I.press('Pad0'); B.game.advance(1 / 60); B.I.release('Pad0'); B.game.advance(.2);
  s.ok('a pad press clears the gate', B.D.snapshot().ui.touchGate === false, B.D.snapshot().ui);
  s.noErrors(B.game);
};
