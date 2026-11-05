import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, errs } = G;
  // the barn scales with the players
  const sizes = [1, 2, 3].map(n => { const players = []; for (let i = 0; i < n; i++) players.push({ id: i, name: 'P' + i, bot: i > 0 }); const bee = new DQ.Bee(game, { net: new DQ.LoopbackNet(), me: 0, host: 0, players }); return bee.ctx.town.pattern.cells.filter(c => !c.clear && !c.fill).length; });
  check('the Quilt Barn grows with the players (2 high, 3 high, crenellations)', sizes[0] < sizes[1] && sizes[1] < sizes[2], sizes.join(','));
  // a solo round with two bots: countdown, build, raid, scores, the end
  G.store.set('dqb-bee-bots', 2);
  game.go('bee', { solo: true }); run(1); const bee = game.scene.bee;
  check('the solo Bee starts with a countdown', bee.phase === 'countdown');
  run(3); check('then the build phase', bee.phase === 'build');
  for (let i = 0; i < 60; i++) { run(1); for (const m of bee.ctx.monsters.list) if (!m.dead) bee.ctx.combat.hitMonster(m, 999, { by: bee.ctx.builder }); } check('bots place barn blocks and score', bee.ctx.town.pattern.built > 10 && (bee.scores[1] || 0) + (bee.scores[2] || 0) > 0, JSON.stringify(bee.snapshot()));
  let mine = 0; const s0 = bee.scores[0]; for (const c of bee.ctx.town.pattern.cells) { if (c.clear) bee.ctx.world.set(c.x, c.y, c.z, 0); else if (c.block) { if (bee.ctx.world.get(c.x, c.y, c.z) !== c.block) mine++; bee.ctx.world.set(c.x, c.y, c.z, c.block, { by: 0 }); } else if (!bee.ctx.world.objAt(c.x, c.y, c.z)) bee.ctx.objects.add({ id: c.obj, x: c.x, y: c.y, z: c.z, facing: c.facing }, { force: true }); }
  run(1); check('a finished barn starts the raid', bee.phase === 'raid' && bee.ctx.siege.active, bee.phase);
  check('placing barn blocks scores +3 each', bee.scores[0] - s0 >= 3 * mine, [bee.scores[0] - s0, mine]);
  const k0 = DQ.count(bee.ctx.combat.kills); run(5); const ms = bee.ctx.monsters.list.filter(m => !m.dead); check('raid monsters come from the corners', ms.length + DQ.count(bee.ctx.combat.kills) > 0, JSON.stringify([bee.phase, bee.ctx.siege.phase, bee.ctx.siege.spawns.length, ms.length, k0, bee.ended]));
  for (let i = 0; i < 80 && !bee.ended; i++) { for (const m of bee.ctx.monsters.list) if (!m.dead) bee.ctx.combat.hitMonster(m, 999, { by: bee.ctx.builder }); run(1); }
  check('surviving the raid ends the round, won', bee.ended && bee.result && bee.result.won === true, JSON.stringify(bee.snapshot()));
  check('kills score for the player', bee.stats[0].Monsters > 0, JSON.stringify(bee.stats));
  check('standings list every player once', bee.result.standings.flat().sort().join(',') === '0,1,2', JSON.stringify(bee.result.standings));
  check('awards name a Master Quilter', bee.result.awards.some(a => a.title === 'Master Quilter'));
  check('awards name the Knot Cutter: the player with the most kills', bee.result.awards.some(a => a.title === 'Knot Cutter' && a.id === 0), JSON.stringify(bee.result.awards));
  // a lost round: the Banner falls
  game.go('bee', { solo: true }); run(5); const b2 = game.scene.bee; b2.phase = 'raid'; b2._startRaid(); run(1); b2.ctx.town.bannerObj().hp = 0; run(1);
  check('the Banner falling ends the round as a loss', b2.ended && b2.result && b2.result.won === false);
  game.input.tap('confirm'); run(.5); check('confirm returns to the title after a solo round', game.sceneName === 'title');
  check('no errors', !game.errors.length, errs());
};
