import { load, until, warnings } from '../lib.mjs';
export async function run(check) {
  // every deep link the router takes (each scene by name, chapters, attract segments, grounds) opens without an error.
  // (Headless, the first scene boots before the page reads its hash, so each link goes through the router the title uses.)
  { const probe = load({ seed: 1 }), names = Object.keys(probe.K.scenes), links = [...names, 'match', 'bowl', 'dev', 'chapter:1:pre', 'chapter:3', 'chapter:5', 'attract:7', 'match:dome:thr:bowl', 'match:downs:mag'], bad = [], landed = {};
    for (const h of links) {
      const env = load({ seed: 1 }), before = warnings.length; env.game.advance(.3); env.K.runDeep(h); env.game.advance(3);
      const s = env.D.snapshot().scene, errs = (env.game.errors || []).map(e => String(e && e.message || e)); landed[h] = s;
      if (errs.length || warnings.length > before) bad.push(h + ': ' + [...errs, ...warnings.slice(before)].join(' | ').slice(0, 200));
    }
    check('every deep link (' + links.length + ': ' + names.length + ' scenes by name, plus chapters, attract, grounds) opens without an error or warning', !bad.length, bad);
    check('the deep links really open their scenes (match, nets, about, chapter 3 a match, attract 7 the attract)', landed.match === 'match' && landed.nets === 'nets' && landed.about === 'about' && landed['chapter:3'] === 'match' && landed['attract:7'] === 'attract', landed);
    check('a bare cutscene link plays the prologue', landed.cutscene === 'cutscene', landed.cutscene);
    const hr = load({ seed: 1 }); hr.game.advance(.3); hr.K.runDeep('hubround'); hr.game.advance(1); check('a hub round opened without a session returns to the title', hr.D.snapshot().scene === 'title', hr.D.snapshot().scene); }
  let { game, I, D, K } = load({ seed: 1 }); game.advance(.5);
  check('the game boots to the title', D.snapshot().scene === 'title');
  I.press('KeyJ'); game.advance(1 / 60); I.release('KeyJ'); game.advance(.1);
  check('a key on the title opens the menu', D.snapshot().ui.titleState === 'menu');
  check('keyboard prompts show keycaps after a key press', D.snapshot().ui.device === 'keyboard' && D.snapshot().ui.prompts.find(p => p.a === 'shot').info.label === 'J');
  I.tap('down'); game.advance(.1); check('down moves the focus', K.scenes.title.menu.i === 1, K.scenes.title.menu.i);
  I.press('Pad0'); game.advance(1 / 60); I.release('Pad0'); game.advance(.7);
  check('the pad picks QUICK MATCH (Cross confirms)', D.snapshot().scene === 'setup', D.snapshot().scene);
  check('pad prompts show PlayStation glyphs', D.snapshot().ui.device === 'gamepad' && D.snapshot().ui.prompts.find(p => p.a === 'shot').info.kind === 'ps');
  game.settings.set('glyphs', 'xbox'); game.advance(.05); check('the Xbox setting shows A B X Y', D.snapshot().ui.prompts.find(p => p.a === 'shot').info.kind === 'xbox' && D.snapshot().ui.prompts.find(p => p.a === 'shot').info.label === 'A'); game.settings.set('glyphs', 'playstation');
  I.tap('cancel'); game.advance(.7); check('cancel goes back to the title', D.snapshot().scene === 'title');
  // the mouse: hover moves the focus, a click picks
  I.tap('confirm'); game.advance(.3); const L = K.scenes.title.menu; game.advance(1 / 60);
  if (L.layout) { const y3 = L.layout.y + 3 * L.rowH + 2, x = L.layout.x + L.layout.w / 2; I.feed('move', x, y3); game.advance(1 / 60); check('hovering moves the focus', L.i === 3, L.i); I.feed('down', x, y3); game.advance(1 / 60); I.feed('up', x, y3); game.advance(.7); check('a click picks the item under the pointer (SUPER OVER SHOWDOWN)', D.snapshot().scene === 'showdown', D.snapshot().scene); }
  else check('the menu has a layout for the mouse', false);
  // settings, pause items, about pages
  for (const k of ['difficulty', 'defOvers', 'defWickets', 'kerfuffleRules', 'pitchMarker', 'timing', 'fielding', 'running', 'replays', 'captions', 'voices', 'voiceVolume', 'glyphs']) check('setting ' + k + ' exists', game.settings[k] !== undefined, game.settings[k]);
  const items = game.o.menu.items.map(i => i[0]); check('the pause menu has Restart, Match Info and Dev Mode', ['Restart Match', 'Match Info', 'Dev Mode'].every(n => items.includes(n)), items);
  const about = JSON.stringify(K.ABOUT); for (const f of ['Date', 'Source', 'Plan', 'Genre and Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage']) check('About shows ' + f, about.includes('"' + f + '"'));
  for (const t of ['TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS']) check('About has a ' + t + ' page', about.includes(t));
  { const A = K.scenes.about, lh = game.debug && load().E.font.lineHeight({}) + 2, over = [];
    for (const [w, h] of [[320, 240], [427, 240], [640, 270], [320, 690]]) for (const P of A.layout(w, h)) { const used = P.rows.reduce((t, p) => t + (p.label ? lh : 0) + p.wr.length * lh + 4, 0); if (used > h - 58) over.push(w + 'x' + h + ' ' + P.title + ': ' + used + ' > ' + (h - 58)); }
    check('every About screen fits its page at 320x240, 427x240, 640x270 and 320x690', !over.length, over); }
  check('About pages carry no stand-in answers', !/See the final report|TBD|unknown unknown/.test(about));
  // idle: the attract mode after 10 s, any input back
  game.go('title'); game.advance(.8); game.advance(10.5); check('10 s idle on the title starts the attract mode', D.snapshot().scene === 'attract', D.snapshot().scene);
  game.advance(3); I.tap('left'); game.advance(.8); check('any input leaves the attract mode for the title', D.snapshot().scene === 'title', D.snapshot().scene);
  // touch-only devices
  ({ game, I, D, K } = load({ seed: 2, touch: true })); game.advance(.5);
  check('a touch-only device sees the gate on the title', D.snapshot().ui.touchGate === true);
  check('no touch buttons are made', !game.input.touchButtons || !(game.input._touchBtns && game.input._touchBtns.length));
  game.advance(10.5); check('the attract mode still runs on a touch-only device', D.snapshot().scene === 'attract', D.snapshot().scene);
  I.feed('down', 100, 100, { touch: true }); game.advance(1 / 60); I.feed('up', 100, 100, { touch: true }); game.advance(.8); check('a tap leaves the attract mode', D.snapshot().scene === 'title', D.snapshot().scene);
  I.press('Pad0'); game.advance(1 / 60); I.release('Pad0'); game.advance(.1); check('a pad press clears the touch gate', D.snapshot().ui.touchGate === false);
  check('no errors', !game.errors.length, game.errors.map(e => e.message));
}
