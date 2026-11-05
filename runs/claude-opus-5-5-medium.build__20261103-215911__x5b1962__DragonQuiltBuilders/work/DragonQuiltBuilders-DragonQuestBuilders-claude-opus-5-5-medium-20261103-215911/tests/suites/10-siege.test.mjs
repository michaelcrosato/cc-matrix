import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  const ctx = G.play('siege'), S = ctx.siege, b = ctx.builder;
  b.invuln = true;
  S.start({ prep: 3 }); check('the siege starts with a prep countdown', S.active && S.phase === 'prep');
  run(3.2); check('then wave 1', S.phase === 'wave' && S.wave === 1);
  const spawned = []; const sp0 = ctx.monsters.spawn.bind(ctx.monsters); ctx.monsters.spawn = (...a) => { const m = sp0(...a); spawned.push(m); return m; };
  run(11); ctx.monsters.spawn = sp0; const w1 = spawned.filter(m => !m.dead);
  check('wave 1 has 8 lintlings and 3 dyed lintlings', spawned.filter(m => m.id === 'lintling').length === 8 && spawned.filter(m => m.id === 'dyedLintling').length === 3, spawned.map(m => m.id).join(','));
  // monsters head for the Banner and break walls in the way
  for (const n of ctx.npcs.list) n.def = Object.assign({}, n.def, { fight: { kind: 'hide' } }); for (const o of ctx.objects.list) if (o.def.ballista) o.broken = true;
  const ban = ctx.town.bannerObj(), d0 = w1.reduce((a, m) => a + Math.hypot(m.body.x / T - ban.x, m.body.y / T - ban.y), 0) / w1.length; run(6);
  const d1 = w1.filter(m => !m.dead).reduce((a, m) => a + Math.hypot(m.body.x / T - ban.x, m.body.y / T - ban.y), 0) / Math.max(1, w1.filter(m => !m.dead).length);
  check('siege monsters move toward the Banner', d1 < d0 - 2, [d0.toFixed(1), d1.toFixed(1)]);
  for (const m of w1) ctx.combat.hitMonster(m, 999, { by: b }); run(1);
  check('clearing a wave gives a breather', S.phase === 'breather');
  // wave sizes scale with the slider
  DQ.tuning.set('siegeSize', 2); S.nextWave(); check('Siege wave size x2 doubles wave 2', S.spawns.length === 26, S.spawns.length); DQ.tuning.reset('siegeSize');
  for (let i = 0; i < 30; i++) { run(.5); for (const m of ctx.monsters.list) if (m.siege && !m.dead) ctx.combat.hitMonster(m, 999, { by: b }); }
  S.nextWave(); for (let i = 0; i < 30; i++) { run(.5); for (const m of ctx.monsters.list) if (m.siege && !m.dead) ctx.combat.hitMonster(m, 999, { by: b }); }
  run(8); while (ctx.cutscene) { ctx.cutscenes.skip(); run(.1); } while (ctx.talk.open) press('confirm', .1);
  const g = ctx.monsters.list.find(m => m.id === 'gnarlgrim' && !m.dead);
  check('after wave 3 Gnarlgrim comes through the Rift', S.phase === 'boss' && !!g, S.phase);
  // Gnarlgrim: def 25 (about 1 damage), 2 ballista hits in the window -> Tangled, Seam Ripper x4 on the Heart Knot
  b.setEquip('weapon', 'seamRipper'); g.body.facing = Math.atan2(b.body.y - g.body.y, b.body.x - g.body.x); const hp0 = g.hp;
  ctx.combat.builderHits(b, g, 1); check('normal hits barely scratch him', hp0 - g.hp <= 3, hp0 - g.hp);
  ctx.combat.hitMonster(g, 30, { src: 'ballista', manned: true }); ctx.combat.hitMonster(g, 30, { src: 'ballista', manned: true });
  check('two manned ballista hits Tangle him', g.tangled > 0);
  b.body.x = g.body.x + Math.cos(g.body.facing) * 20; b.body.y = g.body.y + Math.sin(g.body.facing) * 20; const hp1 = g.hp; ctx.combat.builderHits(b, g, 1);
  check('the Seam Ripper hits the Heart Knot for x4 while Tangled', hp1 - g.hp >= 4 * 9 * .8, hp1 - g.hp);
  g.tangled = 0; g.hp = g.maxHp * .6; run(.1); check('phase 2 below 66%', g.phase === 2); g.hp = g.maxHp * .3; run(.1); check('phase 3 below 33%', g.phase === 3);
  ctx.combat.hitMonster(g, 9999, { by: b }); run(.5); while (ctx.cutscene) { ctx.cutscenes.skip(); run(.1); } while (ctx.talk.open) press('confirm', .1); run(.5);
  check('his defeat ends the siege and clears the chapter', ctx.flags.boss_gnarlgrim && ctx.flags.chapterClear && ctx.town.level === 5, JSON.stringify([S.phase, ctx.town.level]));
  // failure and retry: the Banner falls
  const G2 = await boot(), c2 = G2.play('siege'); c2.siege.start({ prep: 1 }); G2.run(2); c2.town.bannerObj().hp = 1; c2.combat.hitObject(c2.town.bannerObj(), 5); G2.run(.3);
  check('the Banner falling fails the siege with a retry choice', c2.failed === 'banner' && c2.ui.top && c2.ui.top.items[0].label.startsWith('Try again'));
  c2.ui.top.items[0].act(); G2.run(1); const c3 = G2.game.debug.ctx;
  check('retry reloads the siege checkpoint', c3 !== c2 && c3.siege.active && c3.town.bannerObj().hp === 300, c3.siege.phase);
  // Sir Buttonsworth: summons at 50%
  const G3 = await boot(), c4 = G3.play('lv4'); c4.quests.st('m10').state = 'done'; c4.quests.accept('m11'); DQ.Dev.teleport(c4, 21, 20, 6); G3.run(1); while (c4.cutscene) { c4.cutscenes.skip(); G3.run(.1); } while (c4.talk.open) G3.press('confirm', .1);
  const bg = c4.monsters.list.find(m => m.id === 'buttonGolem'); check('Sir Buttonsworth wakes on the quarry floor', bg && bg.awake);
  const n0 = c4.monsters.list.filter(m => m.id === 'lintling' && !m.dead).length; bg.hp = bg.maxHp * .45; G3.run(.2);
  check('below half HP he summons 3 lintlings', c4.monsters.list.filter(m => m.id === 'lintling' && !m.dead).length === n0 + 3);
  c4.combat.hitMonster(bg, 9999, { by: c4.builder }); G3.run(.5); while (c4.talk.open) G3.press('confirm', .1); G3.run(1); const dn = c4.drops.list.find(d => d.item === 'goldenNeedle'); if (dn) { c4.builder.body.x = dn.x; c4.builder.body.y = dn.y; c4.builder.body.z = dn.z; } G3.run(2);
  check('he drops the Golden Needle and 3 Steel Thread', c4.builder.bag.real('goldenNeedle') === 1 && c4.builder.bag.real('steelThread') >= 3, JSON.stringify(G3.snap().bag));
  check('no errors', !game.errors.length && !G2.game.errors.length && !G3.game.errors.length, errs() + G2.errs() + G3.errs());
};
