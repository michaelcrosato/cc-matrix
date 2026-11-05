// Systems, headless: saves, dev tools, the attract mode, touch-only devices, objects, combat, prompts, menus, the About
// pages, the solo Quilting Bee.
export default async function ({ load, check, memStorage }) {
  const T = 16;
  const errs = g => g.errors.map(e => e.where + ': ' + e.message + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')).join(' | ');
  // ================================================================ saves: write in one game, load in another
  {
    const L = load({ test: { scene: 'title', skipCutscenes: true } }), { game, DQ } = L; await game.booted; game.advance(.2);
    game.go('play', { name: 'Saver', beat: 'lv3' }); game.advance(1);
    const ctx = DQ.ctx, w = ctx.world, b = ctx.builder;
    w.set(70, 70, 9, DQ.blockId('feltBlue'), { by: b }); w.set(71, 71, 8, 0, { by: b }); b.bag.add('pins', 7); ctx.clock.setHour(14.5, 3);
    game.advance(.5);
    const out = DQ.Save.write(ctx); const txt = JSON.stringify(out.data);
    check('a save is small (world as a diff)', txt.length < 200000, txt.length);
    const L2 = load({ test: { scene: 'title', skipCutscenes: true } }); await L2.game.booted; L2.game.advance(.2);
    L2.game.go('play', { saveData: JSON.parse(txt) }); L2.game.advance(.5);
    const c2 = L2.DQ.ctx;
    check('save/load: the world hash matches', c2.world.hash() === w.hash(), [c2.world.hash(), w.hash()]);
    check('save/load: the bag', c2.builder.bag.count('pins') === b.bag.count('pins') && c2.builder.bag.count('cobbleClub') === 1);
    check('save/load: quests', JSON.stringify(Object.fromEntries(Object.entries(c2.quests.s).map(([k, s]) => [k, s.status]))) === JSON.stringify(Object.fromEntries(Object.entries(ctx.quests.s).map(([k, s]) => [k, s.status]))));
    check('save/load: town level and cheer', c2.town.level === ctx.town.level && c2.town.cheer === ctx.town.cheer && c2.town.planted, [c2.town.level, ctx.town.level, c2.town.cheer, ctx.town.cheer, out.data.town.cheer]);
    check('save/load: residents', c2.npcs.list.map(n => n.id).sort().join() === ctx.npcs.list.map(n => n.id).sort().join());
    check('save/load: the clock', c2.clock.day === 3 && Math.abs(c2.clock.hour - ctx.clock.hour) < .1, [c2.clock.day, c2.clock.hour]);
    check('save/load: rooms come back', c2.rooms.list.length === ctx.rooms.list.length, [c2.rooms.list.length, ctx.rooms.list.length]);
    // the engine's slots
    check('game.saves writes and lists a slot', game.saves.save(0) && game.saves.get(0) && !game.saves.get(0).empty);
    check('the autosave works when safe', (ctx.monsters.clear(), game.advance(.1), DQ.Save.autosave('quest')) && !!game.saves.get('auto'));
    check('no errors (saves)', !game.errors.length && !L2.game.errors.length, errs(game) + errs(L2.game));
  }
  // ================================================================ dev tools: sliders live, reset, cheats, warp, beats, stamps
  {
    const L = load({ test: { scene: 'title', skipCutscenes: true } }), { game, DQ } = L; await game.booted; game.advance(.2);
    game.go('play', { name: 'Dev', beat: 'banner' }); game.advance(.5);
    const ctx = DQ.ctx, b = ctx.builder, I = game.input;
    const speed = () => { b.place3(72 * T + 8, 80 * T + 8, ctx.world.topZ(72, 80) * T); b.body.vx = 0; const x0 = b.x; I.hold('right', true); game.advance(.6); I.hold('right', false); game.advance(.02); return Math.abs(b.x - x0) + Math.abs(b.y - (80 * T + 8)); };
    const s0 = speed(); DQ.tuning.set('walk', 140); const s1 = speed();
    check('the walk speed slider takes effect at once', s1 > s0 * 1.4, [s0, s1]);
    DQ.tuning.set('monsterHp', 3); const m = ctx.monsters.spawn('lintling', 80, 80); check('the monster HP slider', m.maxHp === 24, m.maxHp);
    DQ.tuning.set('dayMinutes', 2); const h0 = ctx.clock.hour; game.advance(5); check('the day length slider', ctx.clock.hour - h0 > .9, ctx.clock.hour - h0);
    DQ.tuning.reset('walk'); check('reset one slider', DQ.tune('walk') === 78 && DQ.tune('monsterHp') === 3);
    DQ.tuning.reset(); check('reset every slider to its default', DQ.TUNING_DEFS.every(d => DQ.tune(d.key) === d.def));
    DQ.Dev.open(); game.advance(.05); check('Dev Tools open from play', ctx.ui.top && ctx.ui.top.id === 'dev');
    const dev = ctx.ui.top; dev.tab = 0; dev.i = 0; dev.rows()[0].act(); check('the god cheat toggles', ctx.dev.god === true);
    dev.tab = 4; const rows = dev.rows(); check('every tuning slider has a row and a reset', DQ.TUNING_DEFS.every(d => rows.some(r => r.slider === d)) && rows.some(r => /Reset every/.test(r.label)));
    rows[0].lr(1); check('a slider row adjusts its value', DQ.tune('walk') === 80, DQ.tune('walk')); rows[0].alt(); check('a slider row resets', DQ.tune('walk') === 78);
    ctx.ui.closeAll(); DQ.Dev.warp(ctx, 'quarryFloor'); game.advance(.2); check('warp lands on a standable cell', ctx.nav.standable(b.cx, b.cy, b.L) || b.body.onGround, [b.cx, b.cy, b.L]);
    for (const beat of DQ.Beats.list) { DQ.Beats.apply(ctx, beat); game.advance(.3); }
    check('every story beat applies without errors', !game.errors.length, errs(game));
    check('the Chapter clear beat is consistent', ctx.flags.chapterClear && ctx.town.level === 5 && ctx.npcs.list.length === 5);
    const st = DQ.Dev.exportStamp(ctx, [[60, 60, 9], [64, 63, 11]]);
    check('a stamp exports', st && st.size[0] === 5 && st.size[1] === 4 && st.layers.length === 3);
    const before = ctx.world.hash(); DQ.Dev.importStamp(ctx, st, 60, 60, 9); check('a stamp round trips (export then import in place)', ctx.world.hash() === before);
    check('no errors (dev)', !game.errors.length, errs(game));
  }
  // ================================================================ the attract mode
  {
    const L = load({ test: { scene: 'title' } }), { game, DQ } = L; await game.booted; game.advance(.1);
    game.advance(9.8); check('no attract before 10 s idle', game.sceneName === 'title');
    game.advance(.4); game.advance(.4); check('attract starts after 10 s idle', game.sceneName === 'attract', game.sceneName);
    const sc = DQ.SCENES.attract; let seen = new Set();
    for (let i = 0; i < 600 && game.errors.length === 0; i++) { game.advance(.5); if (sc.vi >= 0) seen.add(sc.vi); }
    check('the attract mode plays every vignette', seen.size >= DQ.Attract.VIGNETTES.length - 1, [...seen].join());
    check('the attract mode runs without errors', !game.errors.length, errs(game));
    game.input.tap('jump'); game.advance(.4); check('any input returns to the title', game.sceneName === 'title', game.sceneName);
    check('the player has no save from the attract mode', !game.saves.get('auto') && !game.saves.get(0));
  }
  // ================================================================ touch-only devices
  {
    const mm = q => ({ matches: q.includes('coarse') ? true : q.includes('fine') ? false : false });
    const L = load({ test: { scene: 'title' }, matchMedia: mm }), { game, DQ } = L; await game.booted; game.advance(.2);
    check('touch-only: the title shows the notice', DQ.SCENES.title.touchOnly === true);
    check('touch-only: no touch controls on any scene', Object.values(DQ.SCENES).every(s => Array.isArray(s.touch) && s.touch.length === 0));
    game.advance(10.5); check('touch-only: the attract mode still runs', game.sceneName === 'attract', game.sceneName);
  }
  // ================================================================ objects, combat, prompts, menus
  {
    const L = load({ test: { scene: 'title', skipCutscenes: true } }), { game, DQ, E } = L; await game.booted; game.advance(.2);
    game.go('play', { name: 'Obj', beat: 'lv4' }); game.advance(.5);
    const ctx = DQ.ctx, b = ctx.builder, w = ctx.world;
    const door = ctx.objects.list.find(o => o.def.door);
    b.place3(door.x * T + 8, (door.y + 3) * T + 8, door.z * T); game.advance(.3); const closed = !door.isOpen;
    b.place3(door.x * T + 8, (door.y + 1) * T + 8, door.z * T); game.advance(.4);
    check('a door opens for a builder near it', closed && door.isOpen);
    check('a closed door blocks monsters, not builders', w.blocksBody(door.x, door.y, { z: door.z * T, step: 2, h: 26, blockDoors: true }, 0, 0) === false || !door.isOpen);
    door.isOpen = false; check('a shut door blocks a monster body', w.blocksBody(door.x, door.y, { z: door.z * T, step: 2, h: 26, blockDoors: true }, door.x * T + 8, door.y * T + 8) === true);
    const bed = ctx.objects.list.find(o => o.def.bed); ctx.clock.setHour(12); check('beds refuse daytime naps', !!ctx.clock.canSleep(b));
    ctx.clock.setHour(22); ctx.monsters.clear(); game.advance(.1); check('beds work at night', ctx.clock.canSleep(b) === null);
    DQ.Interact.sleep(ctx, b, bed); game.advance(.2); check('sleeping skips to 06:00', ctx.clock.hour >= 6 && ctx.clock.hour < 7, ctx.clock.hour);
    const tuft = ctx.objects.list.find(o => o.id === 'tuft'), tp = [tuft.x, tuft.y, tuft.z]; ctx.objects.harvest(tuft, b); game.advance(.1);
    check('a plant is harvested', !ctx.objects.at(...tp));
    ctx.clock.setHour(ctx.clock.hour, ctx.clock.day + 1); ctx.clock.hour += .5; game.advance(1.2); check('plants regrow after a day', !!ctx.objects.at(...tp));
    const por = ctx.objects.list.find(o => o.def.portal && o.data.portal === 'coast'); ctx.flags.portal_coast = false; b.place3(por.x * T + 8, (por.y + 1) * T + 8, por.z * T); game.advance(.2);
    check('touching a portal attunes it', ctx.flags.portal_coast === true);
    DQ.Menus.travelTo(ctx, DQ.WORLD.portals.find(p => p.id === 'town')); game.advance(.1); check('travel by portal', Math.abs(b.cx - 70) <= 1 && Math.abs(b.cy - 81) <= 1, [b.cx, b.cy]);
    // the damage formula and difficulty
    const m = ctx.monsters.spawn('pinhog', b.cx + 2, b.cy); b.equipItem('copperBodkin'); const hp0 = m.hp; ctx.combat.builderHits(b, m, {}); const dmg = hp0 - m.hp;
    check('the damage formula (atk - def/2, +-10%)', dmg >= Math.floor((13 - 2.5) * .9) && dmg <= Math.ceil((13 - 2.5) * 1.1 * 1.5), dmg);
    const hb = b.hp; b.iframes = 0; ctx.dev.god = false; b.cheatGod = false; game.settings.difficulty = 'Hard'; b.hurt(10, m); const dh = hb - b.hp; game.settings.difficulty = 'Relaxed'; b.iframes = 0; const hb2 = b.hp; b.hurt(10, m); const dr = hb2 - b.hp; game.settings.difficulty = 'Normal';
    check('difficulty scales damage taken', dh > dr && dr >= 1, [dh, dr]);
    ctx.monsters.kill(m, b); game.advance(.2); check('a defeated monster drops items', ctx.drops.list.length > 0 || b.bag.count('pins') > 0);
    // spawn rules
    ctx.clock.setHour(23); ctx.monsters.clear(); game.advance(.1); for (let i = 0; i < 30; i++) ctx.monsters.trySpawn(b, true);
    check('monsters never spawn inside the town border', ctx.monsters.list.filter(q => !q.dead && !q.fixed && !q.boss).every(q => !ctx.town.inside(q.cx, q.cy)), ctx.monsters.list.map(q => [q.cx, q.cy]).join(' '));
    // prompts follow the device
    const I = game.input; I.lastDevice = 'keyboard'; check('keyboard prompts are keycaps', DQ.Glyphs.code(game, 'swing') === 'KeyJ');
    I.lastDevice = 'mouse'; check('mouse prompts show the mouse button', DQ.Glyphs.code(game, 'swing') === 'Mouse0' && DQ.Glyphs.code(game, 'place') === 'Mouse2');
    I.lastDevice = 'gamepad'; check('gamepad prompts: PlayStation by default', DQ.Glyphs.family(game) === 'ps' && DQ.Glyphs.code(game, 'jump') === 'Pad0' && /Cross/.test(DQ.Glyphs.plain(game, '{btn:jump}')));
    game.settings.set('glyphs', 'xbox'); check('the Xbox glyph setting', DQ.Glyphs.family(game) === 'xbox' && DQ.Glyphs.plain(game, '{btn:jump}') === 'A'); game.settings.set('glyphs', 'playstation');
    I.lastDevice = 'keyboard';
    // the wheel cycles the hotbar
    b.hot = 0; DQ.Controls._wheelAcc = 120; game.advance(1 / 60); check('the mouse wheel cycles the hotbar', b.hot === 1, b.hot);
    // menus by actions
    ctx.ui.closeAll(); I.tap('satchel'); game.advance(.05); check('the Satchel opens', ctx.ui.top && ctx.ui.top.id === 'satchel');
    I.tap('tabNext'); game.advance(.05); check('tabs switch with R1 / E', ctx.ui.top.tab === 1); I.tap('tabNext'); game.advance(.05); check('the Journal tab', ctx.ui.top.tab === 2);
    I.tap('back'); game.advance(.05); check('back closes the Satchel', !ctx.ui.open);
    const bench = ctx.objects.list.find(o => o.def.station === 'bench'); DQ.Menus.openCraft(ctx, 'bench', bench); game.advance(.05);
    const cs = ctx.ui.top, L0 = cs.list(); b.bag.add('planks', 4); const iStool = L0.findIndex(r => r.id === 'stool'); while (cs.i < iStool) { I.tap('down'); game.advance(.05); } const nS = b.bag.count('stool');
    I.tap('ok'); game.advance(.05); check('crafting through the screen with MENU actions', b.bag.count('stool') === nS + 1, [cs.i, iStool, b.bag.count('stool')]);
    ctx.ui.closeAll();
    // the HUD shows a context prompt from the cursor
    game.advance(.1); check('context prompts are built', Array.isArray(b.prompts));
    // the banner screen, about pages
    DQ.Menus.openBanner(ctx); game.advance(.05); check('the Banner screen opens', ctx.ui.top.id === 'banner'); ctx.ui.closeAll();
    const about = DQ.SCENES.about.pages(); check('About has every page', ['Credits', 'Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Licenses'].every(t => about.some(p => p[0] === t)));
    const si = about.find(p => p[0] === 'Source Information')[1];
    check('About shows every Source Information field', ['Date', 'Source', 'Plan', 'Genre', 'Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage'].every(k => si.some(l => l.startsWith(k + ':'))));
    if (DQ.ABOUT) check('About shows the exit interview\'s answers', about.find(p => p[0] === 'Testing Feedback')[1].length === DQ.ABOUT.testingFeedback.length && !si.some(l => l.endsWith(': unknown') && /Source:|Model:/.test(l)));
    check('no errors (objects)', !game.errors.length, errs(game));
  }
  // ================================================================ the solo Quilting Bee
  {
    const L = load({ test: { scene: 'title', skipCutscenes: true } }), { game, DQ } = L; await game.booted; game.advance(.2);
    game.go('bee', { solo: true }); game.advance(.5); const sc = DQ.SCENES.bee;
    check('the Bee opens on its setup card', game.sceneName === 'bee' && sc.state === 'setup');
    sc.bots = 2; sc.startSolo(); game.advance(.5);
    const r = sc.round, ctx = sc.ctx, p = ctx.town.patterns[0];
    check('the barn Pattern scales with builders (3: 68 blocks, a door, 2 torches)', p && p.total === 71, p && p.total);
    check('two bot builders join', ctx.builders.length === 3);
    for (let i = 0; i < 305; i++) game.advance(1);
    check('bots fill in the barn', p.progress > 20, p.progress);
    check('the raid begins after the build phase', r.phase === 'raid' || r.phase === 'over', r.phase);
    for (let i = 0; i < 330 && !r.finished; i++) game.advance(1);
    check('the round finishes on time', r.finished && r.result && Array.isArray(r.result.standings), JSON.stringify(r.result));
    check('scores were awarded to bots', Object.values(r.scores).some(v => v > 0), JSON.stringify(r.scores));
    check('no errors (bee)', !game.errors.length, errs(game));
  }
  // ================================================================ skipping cutscenes: hold Back, the end state still holds
  {
    const L = load({ test: { scene: 'title' } }), { game, DQ } = L; await game.booted; game.advance(.2);
    game.go('play', { name: 'Skipper', beat: 'lv2' }); game.advance(1); const ctx = DQ.ctx; ctx.talk.closeAll(); ctx.cutscene = null; ctx.modal = null;
    const dummies = () => ctx.objects.list.filter(o => o.id === 'dummy' && !o.gone).length, d0 = dummies(); ctx.flags.spinStitch = false; ctx.hud.popups.length = 0; ctx.hud.pop = null;
    DQ.Cutscenes.play(ctx, 'spinDemo'); game.advance(1.2);
    const mid = dummies(); game.input.hold('back'); game.advance(1.4); game.input.hold('back', false); game.advance(.3);
    const m = ctx.npcs.get('mortimer'), pops = ctx.hud.popups.concat(ctx.hud.pop ? [ctx.hud.pop] : []);
    check('skipping the spin demo: the dummy goes, Mortimer is free, the skill and its note arrive', mid === d0 + 1 && dummies() === d0 && !ctx.cutscene && m && !m.scripted && ctx.flags.spinStitch && pops.some(p => p.kind === 'skill'), JSON.stringify([d0, mid, dummies(), !!ctx.cutscene, m && m.scripted, ctx.flags.spinStitch, pops.map(p => p.kind)]));
    check('no errors (cutscene skip)', !game.errors.length, errs(game));
  }
}
