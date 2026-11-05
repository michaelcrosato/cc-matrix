import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, press, errs } = G, T = 16;
  const ctx = G.play('banner'), b = ctx.builder, M = ctx.monsters;
  // the damage formula
  let mn = 99, mx = 0; for (let i = 0; i < 200; i++) { const d = ctx.combat.formula(10, 4); mn = Math.min(mn, d); mx = Math.max(mx, d); }
  check('damage = (atk - def/2) x 0.9..1.1', mn >= 7 && mx <= 9 && mn < mx, [mn, mx]);
  check('damage is at least 1', ctx.combat.formula(1, 50) === 1);
  // spawning: none inside the border or near the builder; night tables
  DQ.Dev.teleport(ctx, 72, 80); M.spawnT = 0; for (let i = 0; i < 40; i++) { M.spawnT = 0; run(.05); }
  const inTown = M.list.filter(m => !m.dead && !m.fixed && ctx.town.inBorder(Math.floor(m.body.x / T), Math.floor(m.body.y / T)));
  check('no spawns inside the town border', !inTown.length, inTown.length);
  for (const q of M.list) { q.dead = true; q.deadT = 99; } run(.5); DQ.Dev.teleport(ctx, 58, 62); ctx.clock.set(23); for (let i = 0; i < 30; i++) { M.spawnT = 0; run(.05); }
  const fresh = M.list.filter(m => !m.dead && !m.fixed);
  check('spawns stay at least 10 blocks away', fresh.length && fresh.every(m => Math.hypot(m.body.x - b.body.x, m.body.y - b.body.y) >= 9.5 * T), fresh.map(m => Math.round(Math.hypot(m.body.x - b.body.x, m.body.y - b.body.y) / T)).join(','));
  check('the glen at night spawns lintlings and mothlets', fresh.every(m => ['lintling', 'mothlet'].includes(m.id)), fresh.map(m => m.id).join(','));
  check('spawns respect the max monsters slider', fresh.length <= DQ.tuning.get('maxMonsters'));
  for (const m of M.list) { m.dead = true; m.deadT = 99; } run(.1); ctx.clock.set(12);
  // aggro: notice -> chase -> wind-up before damage
  DQ.Dev.teleport(ctx, 60, 60); DQ.dev.god = false; b.iframe = 0;
  const m = M.spawn('lintling', b.body.x + 60, b.body.y, b.body.z + 4); let seq = [], hurtAt = -1, windAt = -1;
  const off = ctx.events.on('builderHurt', () => { if (hurtAt < 0) hurtAt = game.time; });
  for (let i = 0; i < 600 && hurtAt < 0; i++) { run(1 / 60); if (seq[seq.length - 1] !== m.state) seq.push(m.state); if (m.state === 'wind' && windAt < 0) windAt = game.time; b.body.vx = b.body.vy = 0; }
  off();
  check('a monster notices, chases and winds up before it hits', seq.includes('notice') && seq.includes('chase') && windAt > 0 && hurtAt > windAt, seq.join('>'));
  // the monster HP slider is live
  DQ.tuning.set('monsterHp', 2); const m2 = M.spawn('pinhog', b.body.x + 100, b.body.y, b.body.z); check('Monster HP x2 doubles new monsters\' HP', m2.maxHp === 44, m2.maxHp); DQ.tuning.reset('monsterHp');
  // drops on death
  const m3 = M.spawn('lintling', b.body.x + 20, b.body.y, b.body.z); ctx.combat.hitMonster(m3, 999, { by: b }); run(.1);
  check('a defeated lintling drops lint', ctx.drops.list.some(d => d.item === 'lint'));
  check('kills are counted', ctx.combat.kills.lintling >= 1);
  // leash: a chase far from home gives up
  const m4 = M.spawn('lintling', b.body.x + 40, b.body.y, b.body.z); m4.home = [b.body.x - 30 * T, b.body.y, b.body.z]; m4.state = 'chase'; run(.2);
  check('a monster chasing far from home gives up and makes a new home', Math.hypot(m4.home[0] - m4.body.x, m4.home[1] - m4.body.y) < 3 * T, JSON.stringify(m4.home));
  check('no errors', !game.errors.length, errs());
};
