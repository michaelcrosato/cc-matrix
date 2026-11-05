import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
// ui suites: the scene flow, input labels per device and glyph family, dev mode, the attract mode, About
export default {
  ui(t) {
    const errors = [], { TC, game, E } = t.load({ boot: true, errors });
    game.advance(.6); t.check('boots to the title', game.sceneName === 'title', game.sceneName);
    game.input.tap('confirm'); game.advance(.6); t.check('title -> menu', game.sceneName === 'menu', game.sceneName);
    game.input.tap('confirm'); game.advance(.6); t.check('the first ARCADE start offers Training', game.sceneName === 'offer', game.sceneName);
    game.input.tap('down'); game.advance(.2); game.input.tap('confirm'); game.advance(.6); t.check('STRAIGHT TO THE MISSION -> difficulty', game.sceneName === 'difficulty', game.sceneName);
    game.go('menu'); game.advance(.6); game.input.tap('confirm'); game.advance(.6); t.check('...offered once: the next ARCADE start goes straight on', game.sceneName === 'difficulty', game.sceneName);
    game.input.tap('confirm'); game.advance(.6); t.check('difficulty -> briefing', game.sceneName === 'briefing', game.sceneName);
    for (let k = 0; k < 6; k++) { game.input.tap('confirm'); game.advance(.4); }
    t.check('briefing -> play', game.sceneName === 'play', game.sceneName);
    t.check('the arcade opens on the intro cutscene', !!(TC.play && TC.play.sim.cut));
    game.input.hold('confirm', true); game.advance(.9); game.input.hold('confirm', false); game.advance(.3);
    t.check('holding skips the cutscene', TC.play && !TC.play.sim.cut);
    game.input.tap('pause'); game.advance(.2); t.check('pause works in play', game.paused === true);
    game.resume(); game.advance(.1); TC.dev.show(); t.check('dev mode opens from the pause menu item', TC.dev.open);
    const tt = TC.play.sim.t; game.advance(.5); t.check('the sim is frozen while dev mode is open', TC.play.sim.t === tt);
    TC.dev.hide(); game.go('results'); game.advance(.5); t.check('results screen', game.sceneName === 'results');
    for (let k = 0; k < 4; k++) { game.input.tap('confirm'); game.advance(4); }
    t.check('results -> next briefing in arcade', game.sceneName === 'briefing', game.sceneName);
    game.go('gameover', { score: 123456, won: false }); game.advance(3); t.check('game over offers the initials', !!TC.arcade.entry);
    for (let k = 0; k < 4; k++) { game.input.tap('confirm'); game.advance(.3); }
    t.check('initials saved to the table', TC.arcade.table('arcade').some(e => e.score === 123456));
    game.go('records'); game.advance(.3); t.check('records', game.sceneName === 'records');
    game.go('about'); game.advance(.3); t.check('about', game.sceneName === 'about');
    for (const pg of TC.ABOUT.pages) for (const [k, v] of pg.rows) t.check('about ' + pg.title + ' ' + k + ' filled', typeof v === 'string' && v.trim().length > 0);
    const S = TC.ABOUT.source; t.check('Source Information complete', Object.values(S).every(v => typeof v === 'string' && v.length));
    // the About screen shows every word of the four sections at 16:9, 4:3 and 21:9, matching exit-interview.json
    const ex = JSON.parse(require_('fs').readFileSync(new URL('../exit-interview.json', t.root), 'utf8')), norm = x => String(x).replace(/\s+/g, ' ').trim();
    for (const [W, H] of [[427, 240], [320, 240], [560, 240]]) {
      const shown = norm(TC.aboutFlow(W, H).flatMap(p => p.lines.map(l => l.text)).join(' '));
      const want = [].concat(Object.values(ex.sourceInformation), ex.testingFeedback, ex.engineFeedback, ex.promptFeedback);
      const missing = want.filter(v => !shown.includes(norm(v)));
      t.check('About at ' + W + 'x' + H + ' shows every answer in full', missing.length === 0, missing.map(m => m.slice(0, 40)).join(' | '));
      t.check('About at ' + W + 'x' + H + ' keeps every line on screen', TC.aboutFlow(W, H).every(p => p.lines.every(l => l.y + 9 <= H - 34)));
    }
    for (const h of ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK']) t.check('About has a ' + h + ' page', TC.ABOUT.pages.some(p => p.title === h));
    const placed = new Set(); for (const sc of Object.values(TC.REG.scene)) for (const ob of sc.objects || []) if (ob[0] === 'intel') placed.add(ob[2].n); t.check('all six intel bottles are placed', [0, 1, 2, 3, 4, 5].every(n => placed.has(n)) && TC.INTEL.length === 6, [...placed].join(','));
    TC.forceTouchOnly = true; t.check('touch-only devices are told a controller or keyboard is required', TC.touchOnly()); TC.forceTouchOnly = undefined;
    t.check('no errors', game.errors.length === 0, game.errors.map(e => e.message || e).slice(0, 2).join(' | '));
  },
  input(t) {
    const { TC, game } = t.load(), I = game.input;
    t.check('PlayStation glyphs by default: fire R2', I.label('fire', 'gamepad') === 'R2', I.label('fire', 'gamepad'));
    t.check('cover L2', I.label('cover', 'gamepad') === 'L2');
    game.settings.set('glyphs', 'xbox'); t.check('Xbox glyphs from Settings: RT', I.label('fire', 'gamepad') === 'RT', I.label('fire', 'gamepad')); game.settings.set('glyphs', 'playstation');
    t.check('keyboard: cover is Space', TC.label(I, 'cover', 'keyboard') === 'Space', TC.label(I, 'cover', 'keyboard'));
    t.check('mouse: cover is Right click', TC.label(I, 'cover', 'mouse') === 'Right click');
    t.check('mouse: next weapon is the wheel', TC.label(I, 'next', 'mouse') === 'Wheel down', TC.label(I, 'next', 'mouse'));
    I.lastDevice = 'gamepad'; t.check('prompts follow the device: pad', TC.promptFamily(I) === 'pad'); I.lastDevice = 'mouse'; t.check('prompts follow the device: keyboard and mouse', TC.promptFamily(I) === 'kbm');
    // the mouse aims exactly under the pointer
    const A = new TC.Aim(I, 0); I.lastDevice = 'mouse'; I.aimSource = 'mouse'; I._fedAt = [300, 60]; A.update(1 / 120, { x: 0, y: 0, w: 400, h: 240 }, [], false);
    t.check('pointer -> aim is exact', Math.abs(A.ax - (300 - 200) / 120) < 1e-9 && Math.abs(A.ay - (120 - 60) / 120) < 1e-9, A.ax + ',' + A.ay);
    // a stick: the response curve and the assist's friction near a target
    I._fedAt = null; I.aimSource = 'pad'; I.lastDevice = 'gamepad'; I.padAim = [.5, 0]; const B = new TC.Aim(I, 0); B.update(.1, { x: 0, y: 0, w: 400, h: 240 }, [], false); const free = B.ax;
    const C = new TC.Aim(I, 0); C.update(.1, { x: 0, y: 0, w: 400, h: 240 }, [[0, 0, .05]], false); t.check('aim assist friction near a target', C.ax < free && C.ax > 0, C.ax + ' vs ' + free);
    t.check('response curve: half tilt is slower than linear', free < .5 * 1.6 * .1, free); I.padAim = null;
    // the wheel is a bindable code: free Wheel down from next weapon and give it to reload
    const r1 = I.rebind('next', 'keys', 'KeyE'), r2 = I.rebind('reload', 'keys', 'WheelDown');
    t.check('the wheel is bindable: Wheel down moves from next weapon to reload', r1 === null && r2 === null && I.map.reload.includes('WheelDown') && !I.map.next.includes('WheelDown') && TC.label(I, 'reload', 'mouse') === 'Wheel down', [r1, r2, TC.label(I, 'reload', 'mouse')].join(','));
    I.resetBindings(); t.check('...and the defaults come back', I.map.next.includes('WheelDown') && !I.map.reload.includes('WheelDown'));
  },
  dev(t) {
    const { TC } = t.load();
    for (const [tab, items] of TC.DEVTABS) for (const it of items) {
      if (it[0] === 's') { const v0 = it[1].split('.').reduce((o, k) => o[k], TC.tune); TC.dev.tab = TC.DEVTABS.findIndex(x => x[0] === tab); TC.dev.adjust(it, 1); const v1 = it[1].split('.').reduce((o, k) => o[k], TC.tune); t.check('slider ' + it[1] + ' changes tune', typeof v0 === 'number' && (v1 !== v0 || v0 === it[4]), v0 + '->' + v1); }
      if (it[0] === 't') { const v0 = it[1].split('.').reduce((o, k) => o[k], TC.tune); TC.dev.adjust(it, 1); t.check('toggle ' + it[1], it[1].split('.').reduce((o, k) => o[k], TC.tune) === !v0); }
    }
    TC.resetTune(); t.check('reset restores every default', JSON.stringify(TC.tune) === JSON.stringify(TC.TUNE));
    // actions
    const sim = new TC.Sim({ mode: 'stage', stage: 1, scene: '1-1', seed: 1 }), P = { sim, bots: {}, huds: [{ say() {} }], aims: [], cams: [], n: 1 };
    for (let i = 0; i < 120; i++) sim.step(1 / 120, []);
    TC.dev.run(['a', 'kill'], P); t.check('dev: kill all', sim.enemies.every(e => !e.alive || e.civ || e.ally));
    TC.dev.run(['a', 'arm'], P); t.check('dev: all weapons', sim.players[0].ammo.gl === 6);
    const l = sim.players[0].lives; TC.dev.run(['a', 'life+'], P); t.check('dev: +1 life', sim.players[0].lives === l + 1);
    TC.dev.run(['a', 'next'], P); t.check('dev: next area', sim.scene.id === '1-2');
    TC.dev.jumpI = 9; TC.dev.run(['j', 'jump'], P); t.check('dev: jump to', sim.scene.id === TC.dev.allScenes()[9][1]);
    TC.dev.spawnI = 2; TC.dev.run(['e', 'spawn'], P); t.check('dev: spawn an enemy', sim.enemies.some(e => e.type === 'redtide'));
    TC.dev.run(['a', 'threat'], P); t.check('dev: a threat on me', sim.threats.some(th => !th.done && th.kind === 'dev'));
    TC.dev.run(['a', 'bot'], P); t.check('dev: bot plays', !!P.bots[0]);
  },
  attract(t) {
    const { TC, game } = t.load({ boot: true });
    game.advance(10.8); t.check('10 s idle on the title -> attract', game.sceneName === 'attract', game.sceneName);
    t.check('the demo cheats: god and infinite ammo', TC.Attract.play.sim.cheats.god && TC.Attract.play.sim.cheats.ammo);
    game.advance(3); t.check('the bot plays the demo', TC.Attract.play.sim.players[0].stats.shots > 0 || TC.Attract.play.sim.phase !== 'action');
    const i0 = TC.Attract.i; game.advance(36); t.check('the playlist moves on', TC.Attract.i > i0 || TC.Attract.state !== 'demo');
    game.input.tap('confirm'); game.advance(.4); t.check('any input -> title', game.sceneName === 'title', game.sceneName);
    game.go('menu'); game.advance(10.8); t.check('10 s idle on the menu -> attract', game.sceneName === 'attract');
    TC.Attract.watch = 9; const i1 = TC.Attract.i; game.advance(1 / 60); t.check('the watchdog moves a stuck demo on', TC.Attract.i > i1 || TC.Attract.state !== 'demo');
  }
};
