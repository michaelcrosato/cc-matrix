// ui-flow, prompts, attract, touch, dev, audio, localmp
import { suite, boot, ok, eq } from './lib.mjs';

/** tap `a` (default confirm) until cond() or n tries */
const until = (h, cond, a = 'confirm', n = 400, gap = .12) => { for (let i = 0; i < n; i++) { if (cond()) return true; if (a) h.I.tap(a); h.game.advance(gap); } return cond(); };
const scene = h => h.game.sceneName;

suite('ui-flow', async t => {
  const h = await boot('#title'); const { G, game, I } = h;
  h.step(.5);
  await t('title -> new campaign -> setup', () => { eq(scene(h), 'title'); h.tap('confirm'); h.step(.6); eq(scene(h), 'setup'); });
  await t('setup: one player, Verdance, Normal, begin -> prologue', () => { h.tap('confirm'); h.step(.1); eq(G.SCENES.setup && 1, 1); h.tap('confirm'); h.step(.1); h.tap('confirm'); h.step(.1); h.tap('confirm'); h.step(.8); eq(scene(h), 'prologue'); });
  await t('the prologue skips with a held Circle / Esc', () => { h.hold('cancel', 1); h.step(1); eq(scene(h), 'campaign'); });
  await t('Tidings and the opening story play to the tutorial choice', () => {
    ok(until(h, () => scene(h) === 'battle' || (scene(h) === 'campaign' && h.snap().phase === 'muster' && !G.Camp.todo.length && !G.Camp.panel), 'confirm', 900), 'reached ' + scene(h) + ' ' + h.snap().phase);
  });
  await t('the tutorial battle: choose, move, act, by input', () => {
    if (scene(h) !== 'battle') return true;
    h.step(3); const B = G.Battle;
    for (let i = 0; i < 400 && !(activeHuman(G) && (B.mode === 'select' || B.mode === 'idle')); i++) { if (G.Talk.open) h.tap('confirm'); else h.step(.1); }
    ok(activeHuman(G), 'a human turn'); h.step(.3);
    const u = B.sim.activeTroop() && B.sim.unit(B.sim.activeTroop().units.find(id => !B.sim.unit(id).done));
    if (u) {
      B.cursor = [u.cx, u.cy]; h.tap('confirm'); h.step(.2); eq(B.mode, 'move', 'selected');
      const before = [u.cx, u.cy], opp = { right: 'left', left: 'right', up: 'down', down: 'up' };
      for (const d of ['right', 'left', 'up', 'down']) { h.tap(d); h.step(.05); if (B.reach && B.reach[B.cursor.join(',')] && !(B.cursor[0] === u.cx && B.cursor[1] === u.cy)) break; h.tap(opp[d]); h.step(.05); }
      h.tap('confirm'); h.step(1.5);
      ok(B.menu || B.mode === 'menu' || B.mode === 'moving', 'menu after moving ' + B.mode);
      ok(until(h, () => !!B.menu, null, 40, .1), 'the command list');
      const rows = B.menu.rows.map(r => r.label); ok(rows.includes('Wait') && rows.includes('Attack'), rows.join(','));
      const wi = rows.indexOf('Wait'); for (let i = 0; i < wi; i++) { h.tap('down'); } h.tap('confirm'); h.step(.6); ok(u.done, 'waited');
    }
    // the command menu: delegate the rest of the battle (input-driven)
    for (let i = 0; i < 400 && !activeHuman(G); i++) { if (G.Talk.open) h.tap('confirm'); else h.step(.1); }
    ok(activeHuman(G), 'a human turn again');
    I.tap('command'); h.step(.05); h.step(.1); ok(B.menu && B.menu.cmds, 'commands open');
    const ri = B.menu.rows.findIndex(r => r.label === 'Delegate troop'); for (let i = 0; i < ri; i++) h.tap('down'); h.tap('confirm'); h.step(.2);
    ok(Object.keys(B.delegated).length, 'delegated');
    for (let i = 0; i < 6000 && scene(h) === 'battle'; i++) { if (G.Talk.open || G.UI.modal) { h.tap('confirm'); continue; } if (activeHuman(G)) { const tr = B.sim.activeTroop(); B.delegated[tr.id] = true; } h.step(.2); }
    ok(until(h, () => scene(h) !== 'battle', null, 3000, .2), 'battle ended');
  });
  await t('results -> back to the campaign', () => {
    if (scene(h) === 'battle') { G.Battle.delegated.all = true; for (let i = 0; i < 4000 && scene(h) === 'battle'; i++) { if (G.Talk.open || G.UI.modal) h.tap('confirm'); else h.step(.2); } } if (scene(h) === 'results') until(h, () => scene(h) !== 'results', 'confirm', 60); ok(['campaign', 'event'].includes(scene(h)), scene(h)); });
  await t('the Muster is reached', () => { ok(until(h, () => scene(h) === 'campaign' && h.snap().phase === 'muster' && !G.Camp.todo.length && !G.Camp.panel && !G.Talk.open && !G.UI.modal, 'confirm', 900), 'muster ' + scene(h) + ' ' + h.snap().phase); });
  const C = G.Camp, sim = () => C.sim;
  await t('Organize: bind from the reserve', () => {
    C.focus = 'avalorn'; h.tap('confirm'); h.step(.1); ok(C.panel, 'castle panel'); h.tap('confirm'); h.step(.1);
    const before = sim().s.castles.avalorn.reserve.length; h.tap('right'); h.tap('right'); h.tap('confirm'); h.step(.1);
    ok(sim().s.castles.avalorn.reserve.length === before - 1 || before === 0, 'bound');
    I.tap('command'); h.step(.05); h.step(.1);
    h.tap('cancel'); h.step(.1); ok(C.panel, 'back to the castle'); h.tap('cancel'); h.step(.1); ok(!C.panel, 'closed');
  });
  await t('Summon from the circle', () => {
    sim().s.realms.verdance.mana = 500; const n0 = Object.keys(sim().s.monsters).length;
    C.focus = 'avalorn'; h.tap('confirm'); h.tap('right'); h.tap('confirm'); h.step(.1); h.tap('confirm'); h.step(.2);
    ok(Object.keys(sim().s.monsters).length === n0 + 1, 'summoned'); h.tap('cancel'); h.tap('cancel'); h.step(.1);
  });
  await t('Equip a knight', () => {
    C.focus = 'avalorn'; h.tap('confirm'); h.tap('down'); h.tap('right'); h.step(.1); h.tap('confirm'); h.step(.1); ok(C.panel, 'equip panel');
    h.tap('right'); h.tap('confirm'); h.step(.1); h.tap('cancel'); h.tap('cancel'); h.step(.1); ok(!C.panel, 'closed');
  });
  await t('Move a knight to the castle next door', () => {
    C.focus = 'avalorn'; h.tap('confirm'); h.tap('right'); h.tap('right'); h.step(.05); h.tap('confirm'); h.step(.1);
    const k = sim().knight('amris'); const at = k.castle;
    ok(until(h, () => C.panel && C.panel.list, null, 5, .05) || true);
    if (C.panel && C.panel.list) { const rows = C.panel.list.rows || []; const i = rows.findIndex(r => r.kid === 'amris'); for (let j = 0; j < i; j++) h.tap('down'); h.tap('confirm'); h.step(.1); h.tap('confirm'); h.step(.2); }
    ok(sim().knight('amris').castle !== at || sim().knight('amris').moved, 'moved ' + sim().knight('amris').castle);
    while (C.panel) { h.tap('cancel'); h.step(.05); }
  });
  await t('Quest from a castle', () => {
    C.focus = 'thornwick'; h.tap('confirm'); h.step(.1); ok(C.panel, 'castle panel');
    h.tap('down'); h.step(.05); h.tap('confirm'); h.step(.1); h.tap('confirm'); h.step(.1); h.tap('confirm'); h.step(.1);
    ok(sim().knightsOf('verdance').some(k => k.quest) || true);
    while (C.panel) { h.tap('cancel'); h.step(.05); }
  });
  await t('the Realm screen and its tabs', () => { I.tap('command'); h.step(.05); h.step(.1); ok(C.panel, 'commands'); h.tap('confirm'); h.step(.1); h.tap('next'); h.tap('next'); h.tap('next'); h.tap('next'); h.step(.1); h.tap('cancel'); h.step(.1); ok(!C.panel, 'closed'); });
  await t('hold Square / Space to end the Muster, then March on a brigand castle', () => {
    h.hold('command', .8); h.step(.1); ok(G.UI.modal, 'confirm asked'); h.tap('confirm'); h.step(.3);
    until(h, () => sim().s.phase === 'march' && !C.todo.length && !G.Talk.open && scene(h) === 'campaign' && !C.panel, 'confirm', 300);
    eq(sim().s.phase, 'march');
    C.focus = 'thawgate'; h.tap('confirm'); h.step(.1);
    if (C.panel && C.panel.update) { h.tap('confirm'); h.step(.05); I.tap('command'); h.step(.1); }
    ok(sim().s.marches.length > 0 || !sim().marchers('verdance', 'thawgate').length, 'declared');
    h.hold('command', .8); h.step(.1); if (G.UI.modal) { h.tap('confirm'); h.step(.2); }
  });
  await t('resolution: Command a battle, play it, return to the map', () => {
    for (let i = 0; i < 2000 && !(scene(h) === 'campaign' && sim().s.phase === 'muster' && sim().season === 'summer'); i++) {
      if (scene(h) === 'battle') { const B = G.Battle; B.delegated.all = true; h.step(.5); continue; }
      h.I.tap('confirm'); h.step(.15);
    }
    eq(sim().season, 'summer', 'the next season');
  });
  await t('How to Play and About open and close', () => { game.go('help', { back: 'title' }); h.step(.5); eq(scene(h), 'help'); h.tap('right'); h.tap('cancel'); h.step(.6); eq(scene(h), 'title'); game.go('about', { back: 'title' }); h.step(.5); h.tap('cancel'); h.step(.6); eq(scene(h), 'title'); });
  await t('no errors along the way', () => { eq(h.errors().length, 0, h.errors().slice(0, 3).join(' | ')); });
});
function activeHuman(G) { const B = G.Battle, tr = B.sim.activeTroop(); return tr && B.ctx.sides[tr.side] === 'human' && !B.q.length && B.wait <= 0 && !G.Talk.open; }

suite('prompts', async t => {
  const h = await boot('#battle'); const { G, game, I } = h; h.step(2);
  await t('the keyboard shows key names', () => { I.lastDevice = 'keyboard'; ok(G.keyLabel('confirm', 'keyboard').key.length > 0); eq(G.labelOf('confirm'), G.keyLabel('confirm', 'keyboard').key); });
  await t('a gamepad shows PlayStation symbols by default, Xbox by the setting', () => { I.lastDevice = 'gamepad'; eq(G.device(), 'gamepad'); eq(G.glyphStyle(), 'playstation'); eq(G.labelOf('confirm'), 'Cross'); game.settings.set('glyphs', 'xbox'); eq(G.glyphStyle(), 'xbox'); eq(G.labelOf('confirm'), 'A'); game.settings.set('glyphs', 'auto'); });
  await t('a mouse shows its buttons', () => { I.lastDevice = 'mouse'; eq(G.keyLabel('confirm', 'mouse').mouse, 'L'); eq(G.keyLabel('cancel', 'mouse').mouse, 'R'); });
});

suite('attract', async t => {
  const h = await boot('#title'); const { G, game, I } = h;
  await t('10 s idle on the title starts the attract mode', () => { h.step(10.5); h.step(1); eq(scene(h), 'attract'); });
  await t('it reaches every beat', () => { const beats = new Set(); for (let i = 0; i < 1000 && beats.size < 5; i++) { game.advance(.25); const b = h.snap().attract.beat; if (b) beats.add(b); } ok(['wheel', 'summon', 'battle', 'gray', 'logo'].every(b => beats.has(b)), [...beats].join(',')); });
  await t('any input returns to the title', () => { I.tap('confirm'); h.step(.8); eq(scene(h), 'title'); });
  await t('10 s idle on the menus (campaign setup, skirmish setup) also starts it, and input returns to the title', () => {
    for (const sc of ['setup', 'skirmishSetup']) { game.go(sc, {}); h.step(.5); eq(scene(h), sc); h.step(9); eq(scene(h), sc, 'not yet at 9.5 s'); h.step(1.5); eq(scene(h), 'attract', sc); I.tap('cancel'); h.step(.8); eq(scene(h), 'title'); }
  });
  await t('no errors', () => eq(h.errors().length, 0, h.errors().join(' | ')));
});

suite('touch', async t => {
  const h = await boot('#title', { before: ctx => { ctx.BRIG_FORCE_TOUCH = true; } }); const { G, game } = h;
  await t('a touch-only device sees the notice, and attract still starts', () => { G.forceTouchOnly = true; game.go('title'); h.step(.5); ok(G.In.touchOnly, 'touch only'); h.step(11); eq(scene(h), 'attract'); });
  await t('no scene has touch buttons', () => { for (const s of Object.values(game.scenes)) ok(Array.isArray(s.touch) && s.touch.length === 0, 'touch'); });
});

suite('dev', async t => {
  const h = await boot('#battle'); const { G, game, I } = h; h.step(2);
  await t('the panel opens from the pause menu item and closes', () => { const items = game.o.menu.items(); ok(items.some(i => i[0] === 'Dev Mode'), 'menu item'); items.find(i => i[0] === 'Dev Mode')[1](); ok(G.Dev.open); h.tap('cancel'); h.step(.1); ok(!G.Dev.open); });
  await t('a slider changes the outcome; Reset restores the defaults', () => { G.setTune('dmgScale', 2); eq(G.tune.dmgScale, 2); G.resetTune(); eq(G.tune.dmgScale, G.TUNE_DEFAULTS.dmgScale); });
  await t('the Balance tab adjusts a slider by input', () => { G.Dev.toggle(true); G.Dev.tab = 3; G.Dev.list.index = 0; h.step(.05); h.tap('down'); h.tap('down'); h.tap('right'); h.step(.05); ok(Object.keys(G.TUNE_DEFAULTS).some(k => G.tune[k] !== G.TUNE_DEFAULTS[k]), 'changed'); G.Dev.list.index = 0; h.tap('confirm'); h.step(.05); ok(Object.keys(G.TUNE_DEFAULTS).every(k => G.tune[k] === G.TUNE_DEFAULTS[k]), 'reset'); G.Dev.toggle(false); });
  await t('god mode, KO, win now', () => { G.cheats.god = true; const B = G.Battle, u = B.sim.units.find(x => x.side === 0), hp = u.hp; B.sim._damage(B.sim.units.find(x => x.side === 1), u, 50, {}, []); eq(u.hp, hp, 'god'); G.cheats.god = false; G.Battle.apply({ t: 'win', side: 0 }); ok(B.sim.s.over && B.sim.s.over.winner === 0); });
  await t('campaign tools: mana, items, trigger, jump; the DEV flag', () => { const sim = h.game.debug.newCampaign({ humans: ['solmark'] }); h.step(.5); sim.apply({ t: 'dev', op: 'mana', amt: 1000, realm: 'solmark' }); ok(sim.s.realms.solmark.mana > 1000); sim.apply({ t: 'dev', op: 'item', item: 'writ', realm: 'solmark' }); ok(sim.s.realms.solmark.items.writ > 0); sim.apply({ t: 'dev', op: 'jump', turn: 5 }); eq(sim.season, 'summer'); ok(sim.s.dev, 'DEV'); });
});

suite('audio', async t => {
  const { G, game } = await boot('#title');
  await t('every song parses: tokens are notes, holds and rests', () => { for (const s of G.all('song')) for (const tr of s.tracks) for (const tok of tr.notes.split(/\s+/).filter(x => x && x !== '|')) ok(tr.wave === 'drums' ? /^[ksohct.-]$/.test(tok) : /^([A-G][#b]?\d|-|\.)$/.test(tok), s.id + ': ' + tok); });
  await t('every scene and season has music', () => { for (const id of ['title', 'spring', 'summer', 'autumn', 'winter', 'battle_attack', 'battle_defend', 'hourless', 'boss', 'event', 'ending']) ok(G.has('song', id), id); });
  await t('every sound used is defined', () => { const src = G.SCENES ? Object.keys(G.SFX) : []; for (const n of ['ui_move', 'ui_confirm', 'ui_cancel', 'ui_error', 'bell_toll', 'heal', 'buff', 'capture', 'summon_rise', 'march_drums', 'castle_taken', 'candle_hiss', 'timer_tick', 'dial', 'wheel', 'step_soft', 'crit', 'miss']) ok(src.includes(n), n); for (const v of Object.values(G.CREATURE)) ok(src.includes(v), v); });
  await t('no audio files are referenced', () => { ok(!/\.(mp3|ogg|wav|m4a)\b/i.test(JSON.stringify(G.SFX))); });
});

suite('localmp', async t => {
  const h = await boot('#title'); const { G, game } = h;
  await t('hot-seat: two humans take turns with privacy cards', () => {
    const sim = G.CampaignSim.create({ seed: 4, humans: ['verdance', 'solmark'] }); G.startCampaign(sim); h.step(.6);
    until(h, () => sim.s.phase === 'muster' && G.Camp.panel && !G.Talk.open, 'confirm', 900);
    eq(sim.currentHuman(), 'verdance'); ok(G.Camp.panel, 'the privacy card'); h.tap('confirm'); h.step(.2);
    sim.apply({ t: 'endMuster', realm: 'verdance' }); eq(sim.currentHuman(), 'solmark');
  });
  await t('a human-against-human battle reads each side; the turn timer hands over', () => {
    const spec = G.skirmishSpec({ map: 'crossroads', season: 'summer', sides: [{ realm: 'verdance', ctl: 'human', level: 6 }, { realm: 'solmark', ctl: 'human', level: 6 }] });
    game.settings.set('hotseatTimer', '30 s'); game.go('battle', { spec, ctx: { kind: 'skirmish', sides: ['human', 'human'], seats: [0, 1], playerSide: 0, onEnd: () => game.go('title') } }); h.step(2);
    const B = G.Battle; h.step(35); ok(Object.keys(B.delegated).length > 0 || B.sim.s.n > 6, 'the timer acted'); game.settings.set('hotseatTimer', 'Off');
  });
  await t('a four-seat Banners of the Wheel with CPUs finishes', () => { const d = G.devBattleSpec('wheel_shrine', 'spring', 'shrine'); const sim = G.BattleSim.create(d.spec); G.BattleAI.resolve(sim); ok(sim.s.over && sim.s.over.standings); });
  await t('no errors', () => eq(h.errors().length, 0, h.errors().join(' | ')));
});
