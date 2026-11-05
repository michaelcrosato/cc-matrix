// attract mode, the story's flow through every menu scene, dev mode, the Workshop, input and glyphs, determinism
export default async ({ makeContext, check }) => {
  { // attract: after 10 s idle on the title (not before), three loops through every vignette, any input exits
    const t = makeContext(); t.step(.3);
    t.step(9); check('no attract mode before 10 s idle', t.snap().scene === 'title', t.snap().scene);
    t.step(1.6); check('attract mode starts after 10 s idle', t.snap().scene === 'attract', t.snap().scene);
    const A = t.B.scenes.attract; let guard = 0; while (A.loops < 3 && guard++ < 1200) t.step(.5);
    check('attract runs three loops and visits all seven vignettes', A.loops >= 3 && A.visited.size === 7, 'loops ' + A.loops + ' visited ' + [...A.visited].join(','));
    check('attract mode throws no errors', !t.game.errors.length, t.game.errors.slice(0, 3).map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
    t.tap('jump'); t.step(.6); check('any input returns to the title', t.snap().scene === 'title', t.snap().scene);
  }
  { // the story's flow: title -> character -> crawl -> briefing -> bento -> mission
    const t = makeContext(); t.step(.3); const B = t.B, G = t.game;
    t.tap('start'); t.step(.2); const S = G.scene; const i = S.items.indexOf('New Story'); S.menu.i = i; t.tap('confirm'); t.step(.8);
    check('New Story opens character select', t.snap().scene === 'charSelect', t.snap().scene);
    t.tap('right'); t.step(.1); t.tap('confirm'); t.step(.8);
    check('picking Kaede plays the opening crawl', t.snap().scene === 'crawl' && B.save.data.character === 'kaede', t.snap().scene);
    t.tap('start'); t.step(.8); check('the prologue briefing follows', t.snap().scene === 'story', t.snap().scene);
    for (let k = 0; k < 20 && t.snap().scene === 'story'; k++) { t.tap('confirm'); t.step(.4); t.tap('confirm'); t.step(.4); }
    check('the briefing leads to Pack the Bento', t.snap().scene === 'bento', t.snap().scene);
    const bs = G.scene; t.tap('right'); t.step(.1); t.tap('cancel'); t.step(.1);
    check('cancel empties a compartment', bs.slots.filter(Boolean).length === 7, bs.slots.join(','));
    t.tap('interact'); t.step(.1); check('the suggested loadout comes back', bs.slots.filter(Boolean).length === 8, bs.slots.join(','));
    check('locked tools are not on the shelf', !bs.tools.includes('firepot') && !bs.tools.includes('cloak'), bs.tools.join(','));
    t.tap('start'); t.step(.8); check('the mission starts with the packed bento', t.snap().scene === 'mission' && t.snap().mission === 'training' && t.M().charId === 'kaede', t.snap().scene);
    check('the flow throws no errors', !G.errors.length, G.errors.map(e => e.message).join(' | '));
    B.Flow.afterResults({ M: { missionId: 'm3' } }); t.step(.8); check('after Moon over Kokaku comes the ending', t.snap().scene === 'ending', t.snap().scene);
    for (let k = 0; k < 30 && t.snap().scene === 'ending'; k++) { t.tap('confirm'); t.step(.5); }
    t.hold('confirm'); for (let k = 0; k < 120 && t.snap().scene !== 'title'; k++) t.step(.5); t.hold('confirm', false);
    check('the ending and credits roll back to the title', t.snap().scene === 'title', t.snap().scene);
    G.go('missionSelect', {}, { fade: 0 }); t.step(.2); check('mission select lists the unlocked missions', G.scene.list.length >= 1, '');
    B.showAbout(0); check('About opens', B.ui.screen === 'about', B.ui.screen); B.ui.hide();
    t.step(.2); check('menus throw no errors', !G.errors.length, G.errors.map(e => e.message).join(' | '));
  }
  { // unlocks by rank
    const t = makeContext(); t.step(.2); t.B.save.data = t.B.freshSave(); const M = t.load('m1', { mode: 'story' }); M.result = 'win';
    const out = t.B.applyResults(M, { total: 1500, rank: 'Ekiben' }); check('Ekiben in Rice and Ash unlocks the Sleep Dango', out.newTools.includes('dango') && t.B.toolUnlocked('dango'), out.newTools.join(','));
    const out2 = t.B.applyResults(M, { total: 2800, rank: 'Grand Kaiseki' }); check('Grand Kaiseki unlocks the Straw Cloak', out2.newTools.includes('cloak'), out2.newTools.join(','));
    t.game.saves.save('auto'); const raw = t.game.saves.latest(); check('saves round-trip', !!raw, JSON.stringify(raw).slice(0, 100));
  }
  { // dev mode: toggles, actions, sliders live, resets
    const t = makeContext(); t.step(.2); const M = t.load('m1'); M.talk.close(); const B = t.B, G = t.game;
    B.Dev.open(M, 0); check('Dev Mode opens on the Cheats page', B.ui.screen === 'dev', B.ui.screen);
    M.cheats.god = true; const hp = M.hero.hp; B.damage(null, M.hero, 30); check('god mode stops damage', M.hero.hp === hp, M.hero.hp);
    G.debug.tune('sightRange', 180); check('a slider changes B.T live', B.T('sightRange') === 180, B.T('sightRange'));
    G.settings.difficulty = 'ninja'; G.settings.reset('Dev'); check('reset all restores the defaults', B.T('sightRange') === 112, B.T('sightRange'));
    G.settings.set('difficulty', 'master'); check('difficulty scales perception', Math.abs(B.T('sightRange') - 112 * 1.2) < .01, B.T('sightRange')); G.settings.set('difficulty', 'ninja');
    for (let p = 0; p < 8; p++) B.Dev.open(M, p); check('every Dev page builds', B.ui.screen === 'dev', '');
    G.debug.alert('all'); t.step(.1); check('alert all', M.guards.filter(g => !g.civilian).every(g => g.mind.level > 1), '');
    G.debug.calm(); check('calm all', M.guards.every(g => g.mind.level === 0), '');
    M.forceRank = 'Makunouchi'; M.result = 'win'; check('win with a chosen rank', M.score().rank === 'Makunouchi', M.score().rank);
    check('dev mode throws no errors', !G.errors.length, G.errors.map(e => e.message).join(' | '));
  }
  { // the Workshop: build, validate, save/load, export/import, test play
    const t = makeContext(); t.step(.2); const B = t.B, G = t.game;
    G.go('workshop', { spec: B.WS.blank(32) }, { fade: 0 }); t.step(.2); const W = G.scene;
    check('a blank level loads in the editor', !!W.world && W.spec.size[0] === 32, '');
    const probs = B.WS.validate(W.spec); check('validation catches a missing exit and target', probs.some(p => /exit/.test(p.msg)) && probs.some(p => /target|boss/.test(p.msg)), probs.map(p => p.msg).join('; '));
    const CATS = ['Ground', 'Walls', 'Buildings', 'Props', 'Lights', 'Actors', 'Routes', 'Items', 'Settings'];
    const put = (cat, id, x, y) => { W.cat = CATS.indexOf(cat); for (W.brush = 0; W.cur() && W.cur().id !== id; W.brush++); W.cx = x; W.cy = y; W.apply(W.cur()); };
    put('Actors', 'hero', 3, 28); put('Actors', 'exit', 28, 3); put('Actors', 'target', 16, 16); put('Actors', 'ashigaru', 10, 10);
    W.apply({ id: 'route', kind: 'route' }); W.cx = 20; W.cy = 10; W.apply({ id: 'route', kind: 'route' });
    for (let x = 8; x < 14; x++) { W.cx = x; W.cy = 20; W.apply({ id: 'W', kind: 'cell' }); }
    W.cx = 5; W.cy = 5; W.apply({ id: 'stoneLantern', kind: 'light' });
    check('painted walls are in the rows', W.spec.rows[20].slice(8, 14) === 'WWWWWW', W.spec.rows[20]);
    check('a guard with a route is placed', W.spec.guards.length === 1 && W.spec.guards[0].route.length === 3, JSON.stringify(W.spec.guards));
    check('the level validates', B.WS.validate(W.spec).length === 0, B.WS.validate(W.spec).map(p => p.msg).join('; '));
    t.ctx.My3D2dge.store.set(B.WS.slotKey(1), W.spec); const back = t.ctx.My3D2dge.store.get(B.WS.slotKey(1), null);
    check('save and load round trip', JSON.stringify(back) === JSON.stringify(W.spec), '');
    const json = JSON.stringify(W.spec), imp = JSON.parse(json); check('export and import round trip', JSON.stringify(imp) === json, '');
    W.test(); t.step(.5); const M = t.M(); check('test play starts the level in the mission scene', t.snap().scene === 'mission' && M.mode === 'workshop', t.snap().scene);
    M.cheats.invisible = true; const tg = M.guards.find(g => g.id === 'target'); tg.alive = false; M.kill(tg, 'dev'); t.step(.2); G.debug.teleport(M.exit.x, M.exit.y, 0, 0); t.step(1);
    check('the workshop level can be won', M.result === 'win', JSON.stringify(t.snap().objectives)); t.step(3);
    check('a won test play shows results, then returns to the editor', t.snap().scene === 'results', t.snap().scene);
    G.scene.pick('Back to the Workshop'); t.step(.8); check('back in the Workshop with the level kept', t.snap().scene === 'workshop' && G.scene.spec.guards.length === 1, t.snap().scene);
    check('the workshop throws no errors', !G.errors.length, G.errors.map(e => e.message + (e.stack || '').split('\n')[1]).join(' | '));
  }
  { // input: labels per device and glyph family; the d-pad picks tools in play and doesn't move the hero
    const t = makeContext(); t.step(.2); const B = t.B, G = t.game, I = G.input;
    check('keyboard label for jump is Space', B.label('jump', 'keyboard') === 'Space', B.label('jump', 'keyboard'));
    check('PlayStation glyphs by default', B.label('jump', 'gamepad') === '✕', B.label('jump', 'gamepad'));
    G.settings.set('glyphs', 'xbox'); check('Xbox glyphs after the setting', B.label('jump', 'gamepad') === 'A', B.label('jump', 'gamepad')); G.settings.set('glyphs', 'playstation');
    const M = t.load('m1'); M.talk.close(); const h = t.H(), x0 = h.x; M.bento.sel = 0;
    I.press('Pad15'); t.step(.1); I.release('Pad15'); t.step(.4);
    check('the d-pad does not move the hero in play', Math.abs(h.x - x0) < 1, h.x - x0);
    check('the d-pad cycles tools', M.bento.sel !== 0, M.bento.sel);
    I.press('KeyD'); t.step(.5); I.release('KeyD'); check('keys move the hero', Math.abs(h.x - x0) > 10 || Math.abs(h.y - h.y) > 0, h.x - x0);
  }
  { // determinism: the same scripted input twice gives the same hash
    const run = () => { const t = makeContext(); t.step(.2); const M = t.load('m1'); M.talk.close(); let k = 0; t.intent(() => { k++; const a = Math.floor(k / 240); return { move: [Math.cos(a), Math.sin(a)], jumpPressed: k % 300 === 0, attackPressed: k % 111 === 0, crouchPressed: k % 500 === 0 }; }, 30); return t.game.debug.hash(); };
    const a = run(), b = run(); check('30 s of the same input give the same state twice', a === b, a + ' vs ' + b);
  }
};
