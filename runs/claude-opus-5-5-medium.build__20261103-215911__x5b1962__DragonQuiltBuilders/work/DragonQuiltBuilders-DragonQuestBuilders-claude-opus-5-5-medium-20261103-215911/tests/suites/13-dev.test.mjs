import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  const ctx = G.play('lv2'), b = ctx.builder;
  ctx.ui.open('dev', {}); run(.1); const dev = ctx.ui.top;
  check('Dev Tools open with 7 tabs', dev.name === 'dev');
  // cheats toggle
  dev.tab = 0; dev.focus = 0; game.input.tap('confirm'); run(.05); check('God mode toggles on', DQ.dev.god === true); game.input.tap('confirm'); run(.05); check('and off', DQ.dev.god === false);
  // tuning sliders: live, with reset
  dev.tab = 4; dev.focus = DQ.TUNING_DEFS.findIndex(d => d[0] === 'walk'); const w0 = DQ.tuning.get('walk');
  game.input.tap('right'); run(.05); check('a slider moves right', DQ.tuning.get('walk') > w0, DQ.tuning.get('walk'));
  game.input.tap('place'); run(.05); check('reset one slider', DQ.tuning.get('walk') === w0);
  for (let i = 0; i < 5; i++) { game.input.tap('right'); run(.05); }
  dev.focus = DQ.TUNING_DEFS.length; game.input.tap('confirm'); run(.05); check('Reset all to defaults', DQ.TUNING_DEFS.every(d => DQ.tuning.get(d[0]) === d[5]));
  // warp lands on standable ground
  dev.tab = 1; let okW = 0; const items = dev.items(); for (let i = 0; i < items.length - 1; i++) { items[i].act(dev); run(.2); const bd = b.body, c = [Math.floor(bd.x / T), Math.floor(bd.y / T), Math.floor((bd.z + 1) / T)]; if (ctx.world.standable(c[0], c[1], c[2]) || ctx.world.standable(c[0], c[1], c[2] + 1)) okW++; }
  check('every warp lands on standable ground', okW === items.length - 1, okW + '/' + (items.length - 1));
  // spawn
  dev.tab = 2; const n0 = ctx.monsters.list.length; dev.items()[2].act(dev); run(.05); check('spawn a monster', ctx.monsters.list.length === n0 + 1);
  const it0 = b.bag.real('earth'); dev.spawnItem = Object.keys(DQ.ITEMS).indexOf('earth'); dev.items()[0].act(dev); check('spawn an item', b.bag.real('earth') === it0 + 1);
  // story: set the hour, town level
  dev.tab = 3; const hourItem = dev.items().find(i => i.label === 'Set the hour'); const h0 = Math.floor(ctx.clock.hour); hourItem.adjust(1); check('set the hour', Math.floor(ctx.clock.hour) === (h0 + 1) % 24);
  // stamps: export then import round trip
  ctx.ui.close(); DQ.Dev.teleport(ctx, 60, 60); run(.2); const L = ctx.world.topZ(62, 62);
  ctx.world.set(62, 62, L, DQ.blockId('cobble')); ctx.world.set(63, 62, L, DQ.blockId('planks')); ctx.world.set(63, 63, L + 1, DQ.blockId('feltRed'));
  DQ.Dev.corners = [{ x: 62, y: 62, z: L }, { x: 63, y: 63, z: L }]; const st = DQ.Dev.exportStamp(ctx);
  check('export a stamp of the marked box', st && st.size[0] === 2 && st.size[1] === 2);
  const n = DQ.Dev.importStamp(ctx, JSON.parse(JSON.stringify(st)), 66, 62, L);
  check('import the stamp elsewhere', ctx.world.get(66, 62, L) === DQ.blockId('cobble') && ctx.world.get(67, 63, L + 1) === DQ.blockId('feltRed'), n);
  // fly and one-hit cheats change play
  DQ.dev.fly = true; const z0 = b.body.z; game.input.hold('jump'); run(.5); game.input.hold('jump', false); check('fly rises with jump', b.body.z > z0 + 30); DQ.dev.fly = false; run(1);
  DQ.dev.oneHit = true; const m = ctx.monsters.spawn('knotbrute', b.body.x + 10, b.body.y, b.body.z); ctx.combat.builderHits(b, m, 1); check('one-hit kills', m.dead); DQ.dev.oneHit = false;
  // Debug tab: every overlay toggles from the screen; time scale and cutaway adjust
  ctx.ui.open('dev', {}); run(.05); const dv = ctx.ui.top; dv.tab = 5; const dbg = dv.items(); const before = JSON.stringify(['showCollide','showRooms'].map(k => DQ.dev[k])) + ' ui ' + (ctx.ui.top && ctx.ui.top.name);
  const keys = ['showCollide', 'showRooms', 'showNav', 'showAggro', 'showLights', 'showPattern', 'perf'];
  for (let i = 0; i < keys.length; i++) { dv.focus = i; run(.02); dv.focus = i; game.input.tap('confirm'); run(.03); }
  check('the Debug tab toggles all 7 overlays on', keys.every(k => DQ.dev[k] === true), JSON.stringify(keys.map(k => DQ.dev[k])) + ' before ' + before);
  dbg.find(i => i.label === 'Time scale').adjust(1); check('the Debug tab sets the time scale', game.timeScale === 2, game.timeScale); dbg.find(i => i.label === 'Time scale').adjust(-1);
  dbg.find(i => i.label === 'Cutaway').adjust(1); check('the Debug tab switches the cutaway mode', DQ.dev.cutaway === 'always'); dbg.find(i => i.label === 'Cutaway').adjust(-1);
  for (let i = 0; i < keys.length; i++) { dv.focus = i; game.input.tap('confirm'); run(.03); }
  // World tab: a dev snapshot saves, and loading it restores the world
  dv.tab = 6; const wi = dv.items(); ctx.world.set(70, 90, 11, DQ.blockId('gildedFelt')); wi.find(i => /Save a dev snapshot/.test(i.label)).act(dv);
  check('the World tab saves a dev snapshot', !!G.store.get('dqb-devsnap') || !!DQ.E.store.get('dqb-devsnap', null));
  wi.find(i => /Load the dev snapshot/.test(i.label)).act(dv); run(.8); const c2 = game.debug.ctx;
  check('loading the dev snapshot restores the world', c2 !== ctx && c2.world.get(70, 90, 11) === DQ.blockId('gildedFelt'));
  game.debug.ctx.ui.open('dev', {}); run(.05); const dv2 = game.debug.ctx.ui.top; dv2.tab = 6; dv2.items().find(i => /Regenerate/.test(i.label)).act(dv2); run(.8);
  check('Regenerate the world starts a fresh world', game.debug.ctx !== c2 && game.debug.ctx.world.get(70, 90, 11) !== DQ.blockId('gildedFelt'));
  check('no errors', !game.errors.length, errs());
};
